#!/usr/bin/env node
/**
 * Run the actual discovery migrations against an in-memory PostgreSQL instance.
 * Only synthetic fixtures are used. No network, credentials, or production DB.
 *
 * PGlite is deliberately external to the app's dependencies:
 *   npm install --prefix /tmp/beanmora-sql --ignore-scripts --no-audit --no-fund --save-exact @electric-sql/pglite@0.5.8
 *   PGLITE_MODULE_PATH=/tmp/beanmora-sql/node_modules/@electric-sql/pglite/dist/index.js node apps/mobile/scripts/check-recipe-discovery-sql.mjs
 *
 * This checks PostgreSQL query/RLS behavior, not PostgREST HTTP headers or embeds.
 * The fixture schema includes only columns and SELECT policies used by discovery.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationPath = resolve(root, 'supabase/migrations/20261004115600_public_recipe_discovery.sql');
const sharedMigrationPath = resolve(root, 'supabase/migrations/20261004124405_shared_recipe_coffee_discovery.sql');
const modulePath = process.env.PGLITE_MODULE_PATH;
const { PGlite } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : '@electric-sql/pglite');
const db = await PGlite.create();
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const owner = uuid(1);
const admin = uuid(2);
const args = ['p_query', 'p_method', 'p_source', 'p_model', 'p_flavor_note', 'p_flavor_family', 'p_creator_name', 'p_creator_country', 'p_recipe_country', 'p_recipe_name', 'p_serving_style', 'p_coffee_type', 'p_coffee_name', 'p_coffee_origin', 'p_roaster_name', 'p_source_name'];
const call = `public.search_public_recipes(${args.map((_, i) => `$${i + 1}::text`).join(',')})`;
const values = (filters) => args.map((name) => filters[name] ?? null);
const ids = async (filters = {}, limit = 1000, offset = 0) => (await db.query(`select id from ${call} order by updated_at desc,id limit $17::int offset $18::int`, [...values(filters), limit, offset])).rows.map((row) => row.id);
const count = async (filters = {}) => (await db.query(`select count(*)::int as total from ${call}`, values(filters))).rows[0].total;
const expectIds = async (filters, expected) => assert.deepEqual(await ids(filters), expected.map(uuid).sort(), JSON.stringify(filters));
const scopedIds = async (bean = null, product = null, limit = 1000, offset = 0) => (await db.query('select id from public.recipes_for_coffee($1::uuid,$2::uuid) order by updated_at desc,id limit $3::int offset $4::int', [bean, product, limit, offset])).rows.map(row => row.id);
const scopedCount = async (bean = null, product = null) => (await db.query('select count(*)::int as total from public.recipes_for_coffee($1::uuid,$2::uuid)', [bean, product])).rows[0].total;
async function context(role, user = null) {
  assert.ok(['anon', 'authenticated'].includes(role));
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(user ? { sub: user } : {})]);
  await db.exec(`set role ${role}`);
}
async function insert(table, rows) {
  for (const row of rows) {
    const keys = Object.keys(row);
    await db.query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})`, keys.map((key) => row[key]));
  }
}
const recipe = (id, title, extra = {}) => ({ id: uuid(id), user_id: owner, title, brew_method: 'chemex', visibility: 'public', recipe_type: 'community', ...extra });

try {
  await db.exec(`
    create role anon nologin nobypassrls;
    create role authenticated nologin nobypassrls;
    create role service_role nologin bypassrls;
    create role fixture_outsider nologin nobypassrls;
    create schema auth;
    create schema private;
  `);
  // Auth uses a typed synthetic subject; role assignments are server-owned.
  await db.exec(`
    create or replace function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
    $$;
    create table private.fixture_roles(user_id uuid, role text);
    insert into private.fixture_roles values ('${admin}', 'admin');
    create function private.has_role(target_role text) returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from private.fixture_roles where user_id=auth.uid() and role=target_role)
    $$;
    grant usage on schema auth,private to anon,authenticated;
    grant execute on function auth.uid(),private.has_role(text) to anon,authenticated;
    create table public.profiles(id uuid primary key, name text, username text, country text);
    create table public.roasters(id uuid primary key, name_ar text, name_en text, country text, requires_review boolean not null default false);
    create table public.beans(id uuid primary key, roaster_id uuid references public.roasters, created_by uuid,
      name_ar text, name_en text, origin_country text, varietal text, is_published boolean not null default true, requires_review boolean not null default false);
    create table public.coffee_lots(id uuid primary key, origin_country text, varietal text, requires_review boolean not null default false);
    create table public.roasted_products(id uuid primary key, roaster_id uuid references public.roasters,
      coffee_lot_id uuid references public.coffee_lots, legacy_bean_id uuid references public.beans, created_by uuid,
      name_ar text, name_en text, origin_type text, flavor_notes_on_bag text[] default '{}', requires_review boolean not null default false, status text default 'available');
    create table public.recipes(id uuid primary key, user_id uuid, title text, title_ar text, brew_method text,
      visibility text, recipe_type text, bean_id uuid references public.beans, roasted_product_id uuid references public.roasted_products,
      flavor_notes text[] not null default '{}', serving_style text not null default 'unknown', source_author_name text,
      source_coffee_name text, source_varietal text, source_origin_country text, source_roaster_name text, source_tasting_notes text,
      source_brew_parameters jsonb not null default '{}', updated_at timestamptz not null default '2026-01-01T00:00:00Z');
    create table public.recipe_sources(id uuid primary key default gen_random_uuid(), recipe_id uuid references public.recipes, source_name text, source_url text);
    create table public.bean_flavor_notes(bean_id uuid references public.beans, flavor text);
    alter table public.recipes enable row level security;
    alter table public.beans enable row level security;
    alter table public.roasted_products enable row level security;
    alter table public.coffee_lots enable row level security;
    alter table public.roasters enable row level security;
    alter table public.recipe_sources enable row level security;
    alter table public.bean_flavor_notes enable row level security;
    alter table public.profiles enable row level security;
    create policy read_recipes on public.recipes for select using (
      visibility in ('public','unlisted') or user_id=auth.uid() or private.has_role('admin'));
    create policy read_beans on public.beans for select using (
      (is_published and not requires_review) or created_by=auth.uid() or private.has_role('admin') or private.has_role('moderator'));
    create policy read_products on public.roasted_products for select using (
      not requires_review or created_by=auth.uid() or private.has_role('admin') or private.has_role('moderator'));
    create policy read_roasters on public.roasters for select using (
      not requires_review or private.has_role('admin') or private.has_role('moderator'));
    create policy read_lots on public.coffee_lots for select using (true);
    create policy read_sources on public.recipe_sources for select using (exists(
      select 1 from public.recipes r where r.id=recipe_id and (r.visibility in ('public','unlisted') or r.user_id=auth.uid() or private.has_role('admin'))));
    create policy read_flavors on public.bean_flavor_notes for select using (true);
    create policy read_profiles on public.profiles for select using (true);
    grant select on all tables in schema public to anon,authenticated;
  `);
  const migration = await readFile(migrationPath, 'utf8');
  const sharedMigration = await readFile(sharedMigrationPath, 'utf8');
  assert.ok(migration.trim(), 'Discovery migration must not be empty');
  await test('the shared-coffee followup requires the existing discovery RPC before changing functions', async () => {
    await assert.rejects(db.exec(sharedMigration), /Expected the public recipe discovery RPC/);
    assert.equal((await db.query("select to_regprocedure('public.recipes_for_coffee(uuid,uuid)') as procedure")).rows[0].procedure, null);
  });
  await db.exec(migration);
  await db.exec(sharedMigration);

  await insert('profiles', [{ id: owner, name: 'Curator Profile', username: 'curator', country: 'Canada' }]);
  await insert('roasters', [
    { id: uuid(101), name_en: 'Reviewed Roaster', country: 'Qatar' },
    { id: uuid(102), name_en: 'blocked-roaster-token', requires_review: true },
  ]);
  await insert('beans', [
    { id: uuid(201), roaster_id: uuid(101), name_en: 'Reviewed Bean', origin_country: 'Ethiopia', varietal: 'Gesha' },
    { id: uuid(202), name_en: 'blocked-unpublished-token', is_published: false, created_by: owner },
    { id: uuid(203), name_en: 'blocked-bean-token', requires_review: true, created_by: owner },
    { id: uuid(204), name_en: 'Reviewed Bean Pending Roaster', roaster_id: uuid(102) },
  ]);
  await insert('coffee_lots', [
    { id: uuid(301), origin_country: 'Colombia', varietal: 'Bourbon' },
    { id: uuid(302), origin_country: 'blocked-lot-token', requires_review: true },
  ]);
  await insert('roasted_products', [
    { id: uuid(401), roaster_id: uuid(101), coffee_lot_id: uuid(301), legacy_bean_id: uuid(201), name_en: 'Reviewed Product', origin_type: 'single_origin', status: 'sold_out' },
    { id: uuid(402), name_en: 'blocked-product-token', requires_review: true, created_by: owner },
    { id: uuid(403), name_en: 'Reviewed Product Pending Lot', coffee_lot_id: uuid(302), roaster_id: uuid(102) },
  ]);
  await insert('recipes', [
    recipe(1001, 'visibility-marker public'),
    recipe(1002, 'visibility-marker private-needle', { visibility: 'private' }),
    recipe(1003, 'visibility-marker unlisted-needle', { visibility: 'unlisted' }),
    recipe(1004, 'visibility-marker draft-needle', { visibility: 'draft' }),
    recipe(1010, 'metadata-marker', { recipe_type: 'official_roaster', bean_id: uuid(201), roasted_product_id: uuid(401), source_author_name: 'Rafi Author', flavor_notes: ['شُوكُولَاتَة', 'jasmine'], source_brew_parameters: { discovery: { creator_country: 'Kuwait', recipe_country: 'Japan', coffee_type: 'Arabica' } } }),
    recipe(1011, 'import-marker', { recipe_type: 'official_manufacturer', source_author_name: 'Independent Author', source_origin_country: 'Ethiopia' }),
    recipe(1020, 'model-marker studio', { brew_method: 'xbloom', source_brew_parameters: { model: 'studio' } }),
    recipe(1021, 'model-marker original', { brew_method: 'xbloom', source_brew_parameters: { model: 'original' } }),
    recipe(1030, 'serving-marker hot', { serving_style: 'hot' }),
    recipe(1031, 'serving-marker iced', { serving_style: 'iced' }),
    recipe(1032, 'serving-marker cold', { serving_style: 'cold' }),
    recipe(1033, 'serving-marker unknown'),
    recipe(1034, 'serving-marker sourced', { source_brew_parameters: { discovery: { serving_style: 'iced' } } }),
    recipe(1040, 'literal-marker', { title_ar: 'قَهْوَةُ الْكُوَيْتِ' }),
    recipe(1050, 'catalog-safety unpublished', { bean_id: uuid(202) }),
    recipe(1051, 'catalog-safety pendingbean', { bean_id: uuid(203) }),
    recipe(1052, 'catalog-safety pendingproduct', { roasted_product_id: uuid(402) }),
    recipe(1053, 'catalog-safety pendinglot', { roasted_product_id: uuid(403) }),
    recipe(1054, 'catalog-safety pendingroaster', { bean_id: uuid(204) }),
    recipe(1060, 'malformed-marker', { source_brew_parameters: { discovery: {
      creator_country: ['fabricated-country'], recipe_country: 999, coffee_name: { value: 'fabricated-coffee' },
      flavor_notes: ['lemon', 123], source_urls: ['https://example.invalid/shape', false],
    } } }),
  ]);
  await insert('recipe_sources', [
    { recipe_id: uuid(1040), source_name: "100%_Lab\\A, O'Brien (R&D)", source_url: 'https://example.invalid/source-one' },
    { recipe_id: uuid(1040), source_name: "100%_Lab\\A, O'Brien (R&D)", source_url: 'https://example.invalid/source-two' },
  ]);
  await db.query(`insert into public.recipes(id,user_id,title,brew_method,visibility,recipe_type)
    select id,user_id,title,brew_method,visibility,recipe_type from jsonb_to_recordset($1::jsonb)
    as x(id uuid,user_id uuid,title text,brew_method text,visibility text,recipe_type text)`,
  [JSON.stringify(Array.from({ length: 235 }, (_, i) => recipe(2000 + i, `pagination-marker ${i}`)))]);

  await test('RPC contract: STABLE, SECURITY INVOKER, SETOF recipes, 16 optional bound text inputs and restricted execution', async () => {
    const { rows } = await db.query(`select p.provolatile,p.prosecdef,p.proretset,p.pronargs,p.pronargdefaults,p.prorettype='public.recipes'::regtype as returns_recipes,
      has_function_privilege('anon',p.oid,'execute') as anon_execute,
      has_function_privilege('authenticated',p.oid,'execute') as user_execute,
      has_function_privilege('fixture_outsider',p.oid,'execute') as outsider_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='search_public_recipes'`);
    assert.deepEqual(rows, [{ provolatile: 's', prosecdef: false, proretset: true, pronargs: 16, pronargdefaults: 16, returns_recipes: true, anon_execute: true, user_execute: true, outsider_execute: false }]);
  });
  await test('public visibility and reviewed metadata remain invariant for anon, owner, and admin', async () => {
    for (const [role, user] of [['anon', null], ['authenticated', owner], ['authenticated', admin]]) {
      await context(role, user);
      await expectIds({ p_query: 'visibility-marker' }, [1001]);
      assert.equal(await count({ p_query: 'visibility-marker' }), 1);
      for (const token of ['private-needle', 'unlisted-needle', 'draft-needle', 'blocked-unpublished-token', 'blocked-bean-token', 'blocked-product-token', 'blocked-lot-token', 'blocked-roaster-token']) await expectIds({ p_query: token }, []);
      assert.equal(await count({ p_query: 'catalog-safety' }), 5, 'A public recipe stays visible when linked metadata is withheld');
      await expectIds({ p_recipe_name: 'metadata-marker', p_coffee_name: 'Reviewed Product' }, [1010]);
    }
    assert.equal((await db.query('select count(*)::int as n from public.beans where requires_review')).rows[0].n, 1, 'Admin can read pending metadata directly, so explicit RPC gates are exercised');
  });
  await context('anon');
  await test('source-only recipes support literal punctuation and Arabic normalization without duplicate rows', async () => {
    for (const text of ['100%', '%', '\\A', "O'Brien", '(R&D)', 'قهوة الكويت']) await expectIds({ p_query: text }, [1040]);
    await expectIds({ p_query: '_' }, [1010, 1040]); // single_origin is another real literal underscore.
    await expectIds({ p_source_name: '_' }, [1040]);
    await expectIds({ p_source_name: "100%_Lab\\A, O'Brien (R&D)" }, [1040]);
    assert.equal(await count({ p_source_name: '100%' }), 1);
    for (const text of [',visibility.eq.private', "' OR true --", 'missing-literal']) await expectIds({ p_query: text }, []);
  });
  await test('creator country, recipe country, and coffee origins are independent and unknowns stay unknown', async () => {
    await expectIds({ p_creator_country: 'Kuwait', p_recipe_country: 'Japan', p_coffee_origin: 'Colombia' }, [1010]);
    await expectIds({ p_creator_country: 'Ethiopia' }, []);
    await expectIds({ p_recipe_country: 'Qatar' }, []);
    await expectIds({ p_coffee_origin: 'Kuwait' }, []);
    await expectIds({ p_creator_country: 'Canada' }, []);
    await expectIds({ p_recipe_name: 'import-marker', p_creator_country: 'Ethiopia' }, []);
    await expectIds({ p_recipe_name: 'import-marker', p_creator_name: 'Curator' }, []);
    await expectIds({ p_query: 'visibility-marker public', p_creator_name: 'Curator' }, [1001]);
  });
  await test('hot, iced, and cold remain distinct; explicit sourced style can fill unknown', async () => {
    await expectIds({ p_query: 'serving-marker', p_serving_style: 'hot' }, [1030]);
    await expectIds({ p_query: 'serving-marker', p_serving_style: 'iced' }, [1031, 1034]);
    await expectIds({ p_query: 'serving-marker', p_serving_style: 'cold' }, [1032]);
    assert.equal(await count({ p_query: 'serving-marker' }), 5);
  });
  await test('malformed metadata cannot become a name or country fact; valid list strings remain searchable', async () => {
    await expectIds({ p_creator_country: 'fabricated-country' }, []);
    await expectIds({ p_recipe_country: '999' }, []);
    await expectIds({ p_coffee_name: 'fabricated-coffee' }, []);
    await expectIds({ p_query: 'fabricated-country' }, []);
    await expectIds({ p_recipe_name: 'malformed-marker', p_flavor_note: 'lemon', p_flavor_family: 'citrus' }, [1060]);
    await expectIds({ p_flavor_note: '123' }, []);
  });
  await test('combined method, official source, recipe/creator/coffee/roaster and flavor filters intersect', async () => {
    await expectIds({ p_method: 'chemex', p_source: 'official', p_recipe_name: 'metadata', p_creator_name: 'Rafi', p_coffee_type: 'Arabica', p_coffee_name: 'Reviewed Bean', p_coffee_origin: 'Ethiopia', p_roaster_name: 'Reviewed Roaster', p_flavor_family: 'floral', p_flavor_note: 'jasmine' }, [1010]);
    await expectIds({ p_query: 'Rafi Colombia', p_flavor_family: 'chocolate' }, [1010]);
    await expectIds({ p_recipe_name: 'metadata-marker', p_source: 'community' }, []);
    await expectIds({ p_source: 'invalid' }, []);
    await expectIds({ p_query: 'metadata-marker', p_flavor_family: 'citrus' }, []);
  });
  await test('xBloom model selection applies only in xBloom method context', async () => {
    await expectIds({ p_method: 'xbloom', p_model: 'studio' }, [1020]);
    await expectIds({ p_method: 'xbloom', p_model: 'original' }, [1021]);
    await expectIds({ p_query: 'model-marker', p_model: 'studio' }, [1020, 1021]);
    await expectIds({ p_recipe_name: 'metadata-marker', p_method: 'chemex', p_model: 'studio' }, [1010]);
  });
  await test('full-library count and tied-timestamp pagination reach beyond the former 200-row ceiling', async () => {
    const filter = { p_query: 'pagination-marker' };
    assert.equal(await count(filter), 235);
    const pages = [];
    for (let offset = 0; offset < 235; offset += 30) pages.push(...await ids(filter, 30, offset));
    assert.equal(pages.length, 235);
    assert.equal(new Set(pages).size, 235);
    assert.deepEqual(pages, Array.from({ length: 235 }, (_, i) => uuid(2000 + i)));
    assert.deepEqual(await ids(filter, 30, 235), []);
    assert.equal(await count(filter), 235, 'Pagination must not reduce the total');
  });
  await test('SECURITY INVOKER honors an additional restrictive caller policy', async () => {
    await expectIds({ p_query: 'literal-marker' }, [1040]);
    await db.exec(`reset role; create policy fixture_canary on public.recipes as restrictive for select to anon using(id <> '${uuid(1040)}');`);
    await context('anon');
    await expectIds({ p_query: 'literal-marker' }, []);
    await context('authenticated', owner);
    await expectIds({ p_query: 'literal-marker' }, [1040]);
  });

  await db.exec('reset role');
  await insert('roasters', [
    { id: uuid(601), name_en: 'Scoped Alpha', name_ar: 'محمصة ألفا' },
    { id: uuid(602), name_en: 'Scoped Beta', name_ar: 'محمصة بيتا' },
  ]);
  await insert('beans', [
    { id: uuid(701), name_en: 'Shared Coffee', name_ar: 'بن مشترك', roaster_id: uuid(601) },
    { id: uuid(702), name_en: 'Shared Coffee', name_ar: 'بن مشترك', roaster_id: uuid(602) },
    { id: uuid(703), name_en: 'Shared Coffee', roaster_id: uuid(601), is_published: false, created_by: owner },
    { id: uuid(704), name_en: 'Shared Coffee', roaster_id: uuid(601), requires_review: true, created_by: owner },
    { id: uuid(705), name_en: 'Shared Coffee', roaster_id: uuid(102) },
    { id: uuid(706), name_en: 'Shared Coffee Reserve', roaster_id: uuid(601) },
    { id: uuid(707), name_en: 'Secondary Coffee', roaster_id: uuid(601) },
    { id: uuid(709), name_en: 'Paging Coffee', roaster_id: uuid(601) },
  ]);
  await insert('roasted_products', [
    { id: uuid(801), name_en: 'Shared Product', roaster_id: uuid(601), legacy_bean_id: uuid(701), status: 'sold_out' },
    { id: uuid(802), name_en: 'Shared Coffee', roaster_id: uuid(601), requires_review: true, created_by: owner },
    { id: uuid(803), name_en: 'Shared Coffee', roaster_id: uuid(602) },
  ]);
  const shared = (names = ['Shared Coffee'], extra = {}) => ({ discovery: {
    applicable_coffee_names: names, roaster_id: uuid(601), roaster_name: 'Scoped Alpha', ...extra,
  } });
  await insert('recipes', [
    recipe(9101, 'scope direct bean', { bean_id: uuid(701) }),
    recipe(9102, 'scope direct product', { roasted_product_id: uuid(801) }),
    recipe(9104, 'scope shared named recipe', { bean_id: uuid(707), recipe_type: 'official_roaster', serving_style: 'hot', source_brew_parameters: shared(['Shared Coffee', 'Secondary Coffee', 'Coffee "Quoted" 100%_A,(B)'], { applicable_coffee_names_ar: ['بن مشترك', 'إثيوبيا جيجيسا'] }) }),
    recipe(9105, 'scope source-only ID', { source_brew_parameters: shared() }),
    recipe(9106, 'scope wrong ID overrides name', { source_brew_parameters: shared(undefined, { roaster_id: uuid(602) }) }),
    recipe(9107, 'scope general guide', { source_brew_parameters: shared([]) }),
    recipe(9108, 'scope scalar names', { source_brew_parameters: shared('Shared Coffee') }),
    recipe(9109, 'scope nonstring names', { source_brew_parameters: shared([123, false, null, { name: 'Shared Coffee' }]) }),
    recipe(9110, 'scope exact reserve name', { source_brew_parameters: shared(['Shared Coffee Reserve']) }),
    recipe(9111, 'scope exact source roaster', { source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'], roaster_name: ' scoped   alpha ' } } }),
    recipe(9112, 'scope legacy source roaster', { source_roaster_name: 'Scoped Alpha', source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'] } } }),
    recipe(9113, 'scope different source roaster', { source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'], roaster_name: 'Scoped Beta' } } }),
    recipe(9114, 'scope object identity', { source_brew_parameters: shared(undefined, { roaster_id: { id: uuid(601) } }) }),
    recipe(9115, 'scope invalid identity', { source_brew_parameters: shared(undefined, { roaster_id: 'not-a-uuid' }) }),
    recipe(9116, 'scope null identity', { source_brew_parameters: shared(undefined, { roaster_id: null }) }),
    recipe(9117, 'scope Arabic names', { source_brew_parameters: shared([], { applicable_coffee_names_ar: ['بُنّ مُشْتَرَك'] }) }),
    recipe(9118, 'scope mixed names', { source_brew_parameters: shared([null, false, { name: 'Unverified object' }, 'Shared Coffee']) }),
    recipe(9119, 'scope private shared', { visibility: 'private', source_brew_parameters: shared() }),
    recipe(9120, 'scope unlisted shared', { visibility: 'unlisted', source_brew_parameters: shared() }),
    recipe(9121, 'scope existing bean identity', { bean_id: uuid(702), source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'], roaster_name: 'Scoped Alpha' } } }),
    recipe(9122, 'scope existing product identity', { roasted_product_id: uuid(803), source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'], roaster_name: 'Scoped Alpha' } } }),
    recipe(9123, 'scope approved linked identity', { bean_id: uuid(707), source_brew_parameters: { discovery: { applicable_coffee_names: ['Shared Coffee'] } } }),
    recipe(9124, 'scope raw manual names', { source_brew_parameters: { manual: { also_applies_to_coffees: ['Unpromoted Raw Coffee'], applies_to_coffee_names: ['Shared Coffee'] } } }),
    recipe(9125, 'scope malformed Arabic names', { source_brew_parameters: shared([], { applicable_coffee_names_ar: { name: 'بن مشترك' } }) }),
    recipe(9130, 'scope explicit unpublished bean', { bean_id: uuid(703) }),
    recipe(9131, 'scope explicit pending product', { roasted_product_id: uuid(802) }),
  ]);
  await context('anon');
  await test('shared coffee arrays extend free text and coffee-name filters while every existing filter still intersects', async () => {
    const named = { p_recipe_name: 'scope shared named recipe' };
    for (const coffee of ['Shared Coffee', 'Secondary Coffee', 'إثيوبيا جيجيسا', 'Coffee "Quoted" 100%_A,(B)']) {
      await expectIds({ ...named, p_coffee_name: coffee }, [9104]);
      await expectIds({ ...named, p_query: coffee }, [9104]);
    }
    await expectIds({ ...named, p_coffee_name: 'Shared Coffee', p_method: 'chemex', p_source: 'official', p_roaster_name: 'Scoped Alpha', p_serving_style: 'hot' }, [9104]);
    for (const extra of [{ p_method: 'v60' }, { p_source: 'community' }, { p_roaster_name: 'Scoped Beta' }, { p_serving_style: 'iced' }]) {
      await expectIds({ ...named, p_coffee_name: 'Shared Coffee', ...extra }, []);
    }
    await expectIds({ p_recipe_name: 'scope scalar names', p_coffee_name: 'Shared Coffee' }, []);
    await expectIds({ p_recipe_name: 'scope nonstring names', p_coffee_name: 'Shared Coffee' }, []);
    await expectIds({ p_recipe_name: 'scope nonstring names', p_query: '123' }, []);
    await expectIds({ p_recipe_name: 'scope raw manual names', p_coffee_name: 'Unpromoted Raw Coffee' }, []);
    await expectIds({ p_recipe_name: 'scope mixed names', p_coffee_name: 'Shared Coffee' }, [9118]);
  });
  await test('scoped RPC is STABLE invoker SETOF recipes with two bound optional UUIDs and explicit grants', async () => {
    const { rows } = await db.query(`select p.provolatile,p.prosecdef,p.proretset,p.pronargs,p.pronargdefaults,
      p.prorettype='public.recipes'::regtype as returns_recipes, oidvectortypes(p.proargtypes) as argument_types,
      has_function_privilege('anon',p.oid,'execute') as anon_execute,
      has_function_privilege('authenticated',p.oid,'execute') as user_execute,
      has_function_privilege('fixture_outsider',p.oid,'execute') as outsider_execute
      from pg_proc p where p.oid='public.recipes_for_coffee(uuid,uuid)'::regprocedure`);
    assert.deepEqual(rows, [{ provolatile: 's', prosecdef: false, proretset: true, pronargs: 2, pronargdefaults: 2, returns_recipes: true, argument_types: 'uuid, uuid', anon_execute: true, user_execute: true, outsider_execute: false }]);
  });
  const alphaRecipes = [9101, 9104, 9105, 9111, 9112, 9117, 9118, 9123].map(uuid);
  await test('scoped coffee matching is exact, roaster-specific, bilingual and does not create generic associations', async () => {
    assert.deepEqual(await scopedIds(uuid(701)), alphaRecipes);
    assert.deepEqual(await scopedIds(uuid(702)), [9106, 9113, 9121, 9122].map(uuid));
    assert.deepEqual(await scopedIds(uuid(706)), [uuid(9110)], 'A reserve lot must not match a shorter coffee name');
    assert.deepEqual(await scopedIds(uuid(707)), [uuid(9104), uuid(9123)], 'A recipe matching its FK and explicit names appears once');
    assert.equal(await scopedCount(uuid(701)), alphaRecipes.length);
    assert.deepEqual(await scopedIds(), []);
    assert.deepEqual(await scopedIds(uuid(999999)), []);
  });
  await test('product scope resolves its canonical legacy bean and ignores an unrelated supplied bean ID', async () => {
    const productRecipes = [...alphaRecipes, uuid(9102)].sort();
    assert.deepEqual(await scopedIds(null, uuid(801)), productRecipes);
    assert.deepEqual(await scopedIds(uuid(702), uuid(801)), productRecipes);
    assert.deepEqual(await scopedIds(null, uuid(803)), [9106, 9113, 9121, 9122].map(uuid));
    assert.deepEqual(await scopedIds(uuid(701), uuid(999999)), [], 'An unknown product cannot widen to the supplied bean');
  });
  await test('shared-name matches require reviewed target coffee and roaster, including for owners and admins', async () => {
    for (const [role, user] of [['anon', null], ['authenticated', owner], ['authenticated', admin]]) {
      await context(role, user);
      assert.deepEqual(await scopedIds(uuid(701)), alphaRecipes, 'Private and unlisted shared recipes remain absent');
      assert.deepEqual(await scopedIds(uuid(703)), [uuid(9130)], 'Only the pre-existing explicit public FK remains on an unpublished bean');
      assert.deepEqual(await scopedIds(uuid(704)), []);
      assert.deepEqual(await scopedIds(uuid(705)), [], 'A pending roaster cannot authorize shared matches');
      assert.deepEqual(await scopedIds(null, uuid(802)), [uuid(9131)], 'Only the explicit public product FK remains for a pending product');
    }
  });
  await db.exec('reset role');
  await insert('recipes', Array.from({ length: 65 }, (_, i) => recipe(9200 + i, `scope page ${i}`, { source_brew_parameters: shared(['Paging Coffee']) })));
  await context('anon');
  await test('shared scoped recipes keep exact totals and stable pagination beyond the first page', async () => {
    const pages = [];
    for (let offset = 0; offset < 65; offset += 30) pages.push(...await scopedIds(uuid(709), null, 30, offset));
    assert.deepEqual(pages, Array.from({ length: 65 }, (_, i) => uuid(9200 + i)));
    assert.equal(new Set(pages).size, 65);
    assert.equal(await scopedCount(uuid(709)), 65);
    assert.deepEqual(await scopedIds(uuid(709), null, 30, 65), []);
  });
  await test('scoped RPC retains restrictive caller RLS for both shared recipes and the selected coffee', async () => {
    await db.exec(`reset role;
      create policy fixture_scope_recipe on public.recipes as restrictive for select to anon using(id <> '${uuid(9111)}');
      create policy fixture_scope_coffee on public.beans as restrictive for select to anon using(id <> '${uuid(701)}');`);
    await context('anon');
    assert.deepEqual(await scopedIds(uuid(701)), [uuid(9101)], 'RLS-hidden coffee identity cannot authorize shared metadata matches');
    await db.exec('reset role; drop policy fixture_scope_coffee on public.beans;');
    await context('anon');
    assert.deepEqual(await scopedIds(uuid(701)), alphaRecipes.filter(id => id !== uuid(9111)));
    await context('authenticated', owner);
    assert.deepEqual(await scopedIds(uuid(701)), alphaRecipes);
  });
} finally {
  await db.close();
}
