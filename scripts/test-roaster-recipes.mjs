// Offline tests only. PGlite runs an isolated in-memory PostgreSQL 18.3 instance;
// production is PostgreSQL 17. No credentials, network or production connection.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { DEFAULT_DIRECTORY, METHODS, compileCatalog, generateSQL, loadCatalog, normalizeManual, splitCatalog } from './prepare-roaster-recipes.mjs';

const read = path => JSON.parse(readFileSync(resolve(DEFAULT_DIRECTORY, path), 'utf8'));
const catalog = loadCatalog();
const original = read('public-catalog-snapshot.json');
const curator = '00000000-0000-4000-8000-000000000001';
const otherUser = '00000000-0000-4000-8000-000000000002';

function rawInput() {
  const config = read('index.json');
  return {
    batches: config.regions.map(region => ({ region: region.name, data: read(region.catalog) })),
    photoChecks: config.regions.flatMap(region => { const p = read(region.photos); return Array.isArray(p) ? p : p.images; }),
    snapshot: read(config.snapshot), corrections: read(config.corrections).corrections, verifiedAt: config.verified_at,
  };
}

test('reviewed catalog preserves published ranges, units, unknowns and shared recipes', () => {
  assert.equal(catalog.recipes.length, 87);
  assert.equal(catalog.counts.new_recipes, 86);
  assert.equal(catalog.counts.updated_recipes, 1);
  assert.equal(catalog.roasters.length, 23);
  assert.equal(catalog.coffees.filter(c => c.action === 'create').length, 77);
  assert.equal(catalog.coffees.filter(c => c.action === 'skip_no_verified_image').length, 7);
  const espresso = catalog.recipes.filter(r => r.brew_method === 'espresso');
  assert.equal(espresso.length, 49);
  assert(espresso.every(r => !r.water_grams && !r.water_ml && r.is_incomplete_source));
  const counter = catalog.recipes.find(r => r.slug === 'counter-culture-big-trouble-espresso');
  assert.equal(counter.source_brew_parameters.manual.yield_grams, 36);
  assert.equal(counter.source_brew_parameters.manual.yield_derived_from_ratio, true);
  const square = catalog.recipes.find(r => r.slug === 'square-mile-red-brick-current');
  assert.equal(square.source_brew_parameters.manual.yield_derived_from_ratio, true);
  assert.equal(square.bean_action, 'skip_no_verified_image');
  const verve = catalog.recipes.find(r => r.slug === 'verve-buena-espresso');
  assert.equal(verve.dose_grams, null);
  assert.deepEqual([verve.source_brew_parameters.manual.dose_min_grams, verve.source_brew_parameters.manual.dose_max_grams], [18.7, 19]);
  assert.deepEqual([verve.source_brew_parameters.manual.yield_min_grams, verve.source_brew_parameters.manual.yield_max_grams], [33, 36]);
  assert.equal(verve.source_brew_parameters.manual.yield_grams, undefined);
  const archers = catalog.recipes.find(r => r.slug === 'archers-milk-espresso-150-180ml');
  assert.deepEqual([archers.source_brew_parameters.manual.yield_min_ml, archers.source_brew_parameters.manual.yield_max_ml], [22, 28]);
  assert.equal(archers.source_brew_parameters.manual.yield_grams, undefined);
  const may = catalog.recipes.find(r => r.slug === 'kurasu-may-2026-comparison-v60');
  assert(may.pours.every(p => p.start_at_seconds === null));
  assert(may.source_brew_parameters.global_roasters_import.source_pours.every(p => p.is_bloom === null));
  assert(may.source_brew_parameters.manual.also_applies_to_coffees.includes('Ethiopia Jigesa'));
  assert.deepEqual(may.source_brew_parameters.discovery.applicable_coffee_names, ['Brazil Inacio Urban', 'Ethiopia Jigesa']);
  assert.equal(may.source_brew_parameters.discovery.applicable_coffee_names_ar.length, 2);
  const iced = catalog.recipes.find(r => r.slug === 'kurasu-august-2026-comparison-flash-brew');
  assert.equal(iced.water_grams, 150);
  assert.deepEqual([iced.source_brew_parameters.manual.ice_min_grams, iced.source_brew_parameters.manual.ice_max_grams], [65, 70]);
  assert.equal(iced.total_time_seconds, null);
  const concentrate = catalog.recipes.find(r => r.slug === 'olympia-big-truck-chilled-concentrate');
  assert.equal(concentrate.serving_style, 'cold');
  assert.equal(concentrate.brew_method, 'pour_over');
  assert.equal(concentrate.total_time_seconds, null);
  const sensory = catalog.coffees.filter(c => c.sensory_profile);
  assert.equal(sensory.length, 2);
  assert(sensory.every(c => c.sensory_profile.scale_max === 5 && c.sensory_profile.body === undefined));
});

test('validation rejects invented scalar conversions, wrong domains, conflicting aliases and pour totals', () => {
  assert.throws(() => normalizeManual({ slug: 'bad-alias', source_brew_parameters: { manual: { espresso_yield_grams: 36, yield_grams: 42 } } }), /conflicting/);
  assert.throws(() => normalizeManual({ slug: 'bad-range', source_brew_parameters: { manual: { dose_min_grams: 20, dose_max_grams: 18 } } }), /reversed/);
  assert.throws(() => normalizeManual({ slug: 'half-range', source_brew_parameters: { manual: { time_min_seconds: 25 } } }), /both endpoints/);
  assert.throws(() => normalizeManual({ slug: 'guessed-yield', source_brew_parameters: { manual: { yield_grams: 36, yield_derived_from_ratio: true } } }), /calculation or published ratio/);
  let input = rawInput();
  input.batches[0].data.recipes.find(r => r.brew_method === 'espresso').water_grams = 45;
  assert.throws(() => compileCatalog(input), /espresso output/);
  input = rawInput(); input.batches[0].data.recipes[0].pours[0].water_grams += 1;
  assert.throws(() => compileCatalog(input), /pour sum/);
  input = rawInput(); input.batches[0].data.roasters[0].source_url = 'http://example.test/';
  assert.throws(() => compileCatalog(input), /HTTPS/);
  // A synthetic mL-only source retains millilitres without silently manufacturing grams.
  input = rawInput(); const r = input.batches[0].data.recipes[0]; r.water_grams = null; r.water_ml = 400; r.pours = []; r.pour_sum_validated = false;
  const ml = compileCatalog(input).recipes[0];
  assert.equal(ml.water_grams, null); assert.equal(ml.source_brew_parameters.manual.water_ml, 400);
});

test('identity and photo gates require exact evidence rather than nearby crop names', () => {
  const input = rawInput();
  const sample = input.batches[0].data.coffees[0];
  input.photoChecks = input.photoChecks.filter(p => p.url !== sample.image_url);
  const result = compileCatalog(input);
  const entry = result.coffees.find(c => c.name === sample.name && c.roaster === sample.roaster);
  assert.equal(entry.action, 'skip_no_verified_image');
  assert(result.recipes.some(r => r.coffee_key === entry.key));
  const nomad = result.roasters.find(r => r.name === 'NOMAD Coffee');
  assert.equal(nomad.action, 'reuse_exact');
  const existingBean = input.snapshot.beans.find(bean => bean.roaster_id === nomad.existing_id);
  if (existingBean) assert(!result.coffees.some(c => c.existing_id === existingBean.id));
  assert(result.coffees.filter(c => c.photo.image_kind === 'product_artwork').every(c => c.roaster === 'April Coffee Roasters'));
  const cropInput = rawInput();
  const roaster = cropInput.batches[0].data.roasters[0], coffee = cropInput.batches[0].data.coffees[0];
  const roasterId = '00000000-0000-4000-8000-000000000010', beanId = '00000000-0000-4000-8000-000000000011';
  cropInput.snapshot.roasters.push({ id: roasterId,slug:'onyx-coffee-lab',name_en:roaster.name,website_url:roaster.website,source_url:roaster.source_url });
  const oldCrop = { id:beanId,slug:'synthetic-older-crop',roaster_id:roasterId,name_en:`${coffee.name} 2025`,source_url:coffee.source_url,is_published:true,requires_review:false };
  cropInput.snapshot.beans.push(oldCrop);
  assert.equal(compileCatalog(cropInput).coffees[0].existing_id, null, 'Same product URL with a different full crop name must not match');
  oldCrop.name_en = coffee.name; oldCrop.source_url = `${coffee.source_url}-older-crop`;
  assert.equal(compileCatalog(cropInput).coffees[0].existing_id, null, 'Same name with a different source product must not match');
  oldCrop.source_url = coffee.source_url;
  assert.equal(compileCatalog(cropInput).coffees[0].existing_id, beanId, 'Only the complete exact identity is reusable');
});

test('transport parts respect the UTF-8 byte limit and omit unused mutation sections', () => {
  const parts = splitCatalog(catalog, { maxBytes: 20000 });
  assert(parts.every(part => Buffer.byteLength(generateSQL(part.catalog)) <= 20000));
  assert.deepEqual(parts.flatMap(part => part.catalog.recipes.map(r => r.slug)), catalog.recipes.map(r => r.slug));
  assert.deepEqual(parts.filter(part => part.catalog.sql_phase === 'beans').flatMap(part => part.catalog.coffees.map(c => c.key)), catalog.coffees.map(c => c.key));
  for (const part of parts) {
    const sql = generateSQL(part.catalog), phase = part.catalog.sql_phase;
    assert(!/\bdelete\s+from\b/i.test(sql), 'Generated imports must never remove application rows');
    if (phase !== 'recipes') assert(!sql.includes('insert into public.recipes('));
    if (phase !== 'beans') assert(!sql.includes('insert into public.beans('));
    if (phase !== 'roasters') assert(!sql.includes('insert into public.roasters('));
    if (phase !== 'corrections') assert(!sql.includes('Espresso correction identity conflict'));
    if (phase === 'recipes') {
      assert(sql.includes('Required reviewed roaster is missing'));
      if (part.catalog.coffees.some(c => c.action !== 'skip_no_verified_image')) assert(sql.includes('Required reviewed coffee is missing'));
      assert(sql.includes("v_old.visibility is distinct from 'public'"));
    }
  }
  assert.throws(() => splitCatalog(catalog, { maxBytes: 1000 }), /No oversized part was emitted/);
});

const schema = `
create table profiles(id uuid primary key, username text unique not null);
create table brew_methods(code text primary key);
create table roasters(id uuid primary key default gen_random_uuid(),slug text unique not null check(slug ~ '^[a-z0-9-]+$'),name_ar text not null,name_en text not null,country text,website_url text,source_type text,source_url text,source_name text,last_verified_at timestamptz,data_confidence text,requires_review boolean not null default true,logo_usage_status text,owner_user_id uuid references profiles(id),logo_url text);
create table beans(id uuid primary key default gen_random_uuid(),slug text unique not null check(slug ~ '^[a-z0-9-]+$'),roaster_id uuid references roasters(id),created_by uuid references profiles(id),name_ar text not null,name_en text not null,origin_country text,varietal text,process text check(process in ('washed','natural','honey','anaerobic','wet_hulled','other')),roast_level text check(roast_level in ('light','medium_light','medium','medium_dark','dark')),description_ar text,description_en text,suitable_for_v60 boolean not null,suitable_for_espresso boolean not null,suitable_for_xbloom boolean not null,is_published boolean not null,source_type text,source_url text,source_name text,last_verified_at timestamptz,data_confidence text,requires_review boolean not null default true,image_url text,image_source_url text,image_usage_status text,image_kind text not null default 'unclassified' check(image_kind in ('packaging','product_artwork','origin_photo','unclassified')),sensory_profile jsonb not null default '{}'::jsonb check(jsonb_typeof(sensory_profile)='object' and octet_length(sensory_profile::text)<=8000),check(image_usage_status<>'source_linked' or (source_url is not null and image_url like 'https://%')));
create table bean_flavor_notes(id uuid primary key default gen_random_uuid(),bean_id uuid not null references beans(id),flavor text not null,unique(bean_id,flavor));
create table recipes(id uuid primary key default gen_random_uuid(),slug text unique,user_id uuid not null references profiles(id),bean_id uuid references beans(id),title text not null,title_ar text,brew_method text references brew_methods(code),recipe_type text,visibility text not null,dose_grams numeric(6,2) check(dose_grams>0),water_grams numeric(7,2) check(water_grams>0),ratio numeric(6,2) generated always as (case when dose_grams>0 then round(water_grams/dose_grams,2) else null end) stored,water_temp_c numeric(4,1) check(water_temp_c between 0 and 100),water_temp_c_min numeric(4,1),water_temp_c_max numeric(4,1),total_time_seconds int check(total_time_seconds>0),grinder_setting text,notes text,notes_ar text,content_language text,flavor_notes text[] not null default '{}',source_author_name text,source_roaster_name text,source_coffee_name text,source_origin_country text,source_process text,source_varietal text,source_tasting_notes text,source_brew_parameters jsonb not null default '{}'::jsonb check(jsonb_typeof(source_brew_parameters)='object' and octet_length(source_brew_parameters::text)<=50000),difficulty text,serving_style text not null default 'unknown' check(serving_style in ('hot','iced','cold','unknown')),pour_sum_validated boolean,is_incomplete_source boolean,video_url text,cover_image_url text,forked_from_recipe_id uuid references recipes(id),check((water_temp_c_min is null and water_temp_c_max is null) or (water_temp_c_min is not null and water_temp_c_max is not null and water_temp_c_min>=0 and water_temp_c_max<=100 and water_temp_c_min<=water_temp_c_max)));
create table recipe_steps(id uuid primary key default gen_random_uuid(),recipe_id uuid not null references recipes(id) on delete cascade,step_number int not null check(step_number>0),title text not null,title_ar text,description text,description_ar text,step_kind text check(step_kind in ('bloom','pour','rinse','stir','swirl','steep','press','drawdown','serve','other')),duration_seconds int check(duration_seconds>=0),unique(recipe_id,step_number));
create table recipe_pours(id uuid primary key default gen_random_uuid(),recipe_id uuid not null references recipes(id) on delete cascade,pour_number int not null check(pour_number>0),water_grams numeric(7,2) not null check(water_grams>0),start_at_seconds int check(start_at_seconds>=0),is_bloom boolean not null,temperature_c numeric(4,1) check(temperature_c between 0 and 100),flow_rate_ml_per_s numeric check(flow_rate_ml_per_s>0),duration_seconds int check(duration_seconds>=0),pause_after_seconds int check(pause_after_seconds>=0),unique(recipe_id,pour_number));
create table recipe_sources(id uuid primary key default gen_random_uuid(),recipe_id uuid not null references recipes(id),source_url text,source_name text,source_type text,data_confidence text,last_verified_at timestamptz);
create table test_outcomes(id uuid primary key default gen_random_uuid(),recipe_id uuid not null references recipes(id),user_id uuid not null references profiles(id),notes text);
`;

test('generated SQL runs twice, preserves links and media, and rolls back ownership/identity conflicts', async t => {
  const candidates = [process.env.BEANMORA_PGLITE_MODULE, resolve(DEFAULT_DIRECTORY, '../../../../../discovery-sql-harness/node_modules/@electric-sql/pglite/dist/index.js'), '/workspace/scratch/a118d5f62443/discovery-sql-harness/node_modules/@electric-sql/pglite/dist/index.js'].filter(Boolean);
  let PGlite;
  try { ({ PGlite } = await import('@electric-sql/pglite')); }
  catch { const module = candidates.find(existsSync); assert(module, 'Set BEANMORA_PGLITE_MODULE to an installed @electric-sql/pglite entry point for the required SQL test'); ({ PGlite } = await import(pathToFileURL(module).href)); }
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(schema);
  await db.query('insert into profiles(id,username) values($1,$2),($3,$4)', [curator, 'beanmora_official', otherUser, 'synthetic_other_user']);
  for (const code of METHODS) await db.query('insert into brew_methods(code) values($1)', [code]);
  for (const r of original.roasters) await db.query('insert into roasters(id,slug,name_ar,name_en,country,website_url,source_url,owner_user_id,logo_url) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [r.id,r.slug,r.name_ar,r.name_en,r.country,r.website_url,r.source_url,otherUser,'https://images.example.test/preserved-roaster.png']);
  for (const b of original.beans) await db.query('insert into beans(id,slug,roaster_id,created_by,name_ar,name_en,source_url,image_url,image_source_url,image_usage_status,image_kind,sensory_profile,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,is_published) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,false,false,false,true)', [b.id,b.slug,b.roaster_id,otherUser,b.name_ar,b.name_en,b.source_url,b.image_url,b.image_source_url,b.image_usage_status,'product_artwork',JSON.stringify({source_url:b.source_url,scale_max:5,body:4})]);
  for (const c of catalog.corrections) {
    await db.query('insert into recipes(id,slug,user_id,title,brew_method,visibility,dose_grams,water_grams,total_time_seconds,source_brew_parameters) values($1,$2,$3,$2,$4,$5,$6,$7,$8,$9::jsonb)', [c.expected_id,c.slug,curator,'espresso','public',c.expected_dose_grams,c.expected_water_grams,c.expected_total_time_seconds,JSON.stringify({unrelated:{preserve:true}})]);
    await db.query('insert into recipe_sources(recipe_id,source_url,source_type) values($1,$2,$3)', [c.expected_id,c.source_url,'official_website']);
    await db.query('insert into recipe_steps(recipe_id,step_number,title) values($1,1,$2)', [c.expected_id,'Existing step must survive']);
    await db.query('insert into test_outcomes(recipe_id,user_id,notes) values($1,$2,$3)', [c.expected_id,otherUser,'Existing recorded outcome']);
  }
  const beforePhotos = (await db.query('select id,image_url,image_source_url,image_usage_status,image_kind,sensory_profile,created_by from beans order by id')).rows;
  const beforeRoasters = (await db.query('select * from roasters order by id')).rows;
  const beforeCorrectionSteps = (await db.query('select * from recipe_steps order by id')).rows;
  const sql = generateSQL(catalog);
  const conflictingSlug = catalog.recipes[0].slug;
  await db.query('insert into recipes(slug,user_id,title,brew_method,visibility) values($1,$2,$3,$4,$5)', [conflictingSlug,otherUser,'Another user owns this slug',catalog.recipes[0].brew_method,'private']);
  await assert.rejects(db.exec(sql), /owner\/method conflict/);
  await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int n from beans')).rows[0].n, original.beans.length, 'Earlier bean inserts must be rolled back on an ownership conflict');
  assert.equal((await db.query('select count(*)::int n from roasters')).rows[0].n, original.roasters.length);
  await db.query('delete from recipes where slug=$1', [conflictingSlug]);
  const legacy = catalog.recipes.find(r => r.existing_recipe_id);
  await db.query('insert into recipes(id,slug,user_id,title,brew_method,visibility,dose_grams,water_grams,total_time_seconds,difficulty,source_brew_parameters) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)', [legacy.existing_recipe_id,legacy.slug,curator,'Existing named Monarch guide',legacy.brew_method,'public',25,400,210,'intermediate',JSON.stringify({manual:{model:'Kalita Wave, Monarch blend'},legacy_extension:{preserve:true}})]);
  await db.query('insert into recipe_sources(recipe_id,source_url,source_type) values($1,$2,$3)', [legacy.existing_recipe_id,legacy.approved_previous_source_urls[0],'official_website']);
  for (let number = 1; number <= 6; number++) await db.query('insert into recipe_steps(recipe_id,step_number,title) values($1,$2,$3)', [legacy.existing_recipe_id,number,`Existing reviewed step ${number}`]);
  const legacySteps = (await db.query('select id,step_number from recipe_steps where recipe_id=$1 order by step_number', [legacy.existing_recipe_id])).rows;
  for (const pour of legacy.pours) await db.query('insert into recipe_pours(recipe_id,pour_number,water_grams,start_at_seconds,is_bloom) values($1,$2,$3,$4,$5)', [legacy.existing_recipe_id,pour.pour_number,pour.water_grams,pour.start_at_seconds,pour.is_bloom]);
  const legacyPours = (await db.query('select id,pour_number from recipe_pours where recipe_id=$1 order by pour_number', [legacy.existing_recipe_id])).rows;
  await db.query('insert into test_outcomes(recipe_id,user_id,notes) values($1,$2,$3)', [legacy.existing_recipe_id,otherUser,'Outcome saved against the previous official source']);
  // Exercise the actual recovery path: small ordered parts perform the initial import.
  const smallParts = splitCatalog(catalog, { maxBytes: 20000 });
  for (const part of smallParts) await db.exec(generateSQL(part.catalog));
  const ids = (await db.query('select id,slug from recipes order by slug')).rows;
  const stepIDs = (await db.query('select id,recipe_id,step_number from recipe_steps order by recipe_id,step_number')).rows;
  const pourIDs = (await db.query('select id,recipe_id,pour_number from recipe_pours order by recipe_id,pour_number')).rows;
  const sources = (await db.query('select id,recipe_id,source_url from recipe_sources order by id')).rows;
  assert.equal((await db.query('select count(*)::int n from beans')).rows[0].n, original.beans.length + 77);
  assert.equal((await db.query('select count(*)::int n from roasters')).rows[0].n, original.roasters.length + 20);
  assert.equal(ids.length, 90);
  assert.equal(ids.find(r => r.slug === legacy.slug).id, legacy.existing_recipe_id);
  assert.deepEqual((await db.query('select id,step_number from recipe_steps where recipe_id=$1 and step_number<=6 order by step_number', [legacy.existing_recipe_id])).rows, legacySteps);
  assert.deepEqual((await db.query('select id,pour_number from recipe_pours where recipe_id=$1 order by pour_number', [legacy.existing_recipe_id])).rows, legacyPours);
  const imported = (await db.query('select * from recipes where slug=$1', [conflictingSlug])).rows[0];
  assert.equal(imported.cover_image_url, catalog.recipes[0].cover_image_url);
  assert.equal(imported.source_brew_parameters.global_roasters_import.photo_url, imported.cover_image_url);
  assert.equal(imported.source_brew_parameters.global_roasters_import.photo_kind, 'packaging');
  await db.query('insert into test_outcomes(recipe_id,user_id,notes) values($1,$2,$3)', [imported.id,otherUser,'Post-import outcome']);
  await db.query('update recipes set cover_image_url=$1,source_brew_parameters=source_brew_parameters || $2::jsonb where id=$3', ['https://images.example.test/user-cover.jpg',JSON.stringify({user_extension:{keep:true}}),imported.id]);
  await db.exec(sql);
  assert.deepEqual((await db.query('select id,slug from recipes order by slug')).rows, ids);
  assert.deepEqual((await db.query('select id,recipe_id,step_number from recipe_steps order by recipe_id,step_number')).rows, stepIDs);
  assert.deepEqual((await db.query('select id,recipe_id,pour_number from recipe_pours order by recipe_id,pour_number')).rows, pourIDs);
  assert.deepEqual((await db.query('select id,recipe_id,source_url from recipe_sources order by id')).rows, sources);
  const originalIDs = original.beans.map(b => b.id);
  assert.deepEqual((await db.query('select id,image_url,image_source_url,image_usage_status,image_kind,sensory_profile,created_by from beans where id=any($1::uuid[]) order by id', [originalIDs])).rows, beforePhotos);
  assert.deepEqual((await db.query('select * from roasters where id=any($1::uuid[]) order by id', [original.roasters.map(r => r.id)])).rows, beforeRoasters);
  assert.deepEqual((await db.query('select * from recipe_steps where recipe_id=any($1::uuid[]) order by id', [catalog.corrections.map(c => c.expected_id)])).rows, beforeCorrectionSteps);
  assert.equal((await db.query('select count(*)::int n from test_outcomes')).rows[0].n, 5);
  assert.equal((await db.query('select count(*)::int n from recipes where brew_method=$1 and water_grams is not null', ['espresso'])).rows[0].n, 0);
  for (const correction of catalog.corrections) {
    const row = (await db.query('select water_grams,total_time_seconds,ratio,source_brew_parameters from recipes where id=$1', [correction.expected_id])).rows[0];
    assert.equal(row.water_grams, null); assert.equal(row.total_time_seconds, correction.total_time_seconds); assert.equal(row.ratio, null);
    assert.deepEqual(row.source_brew_parameters.unrelated, { preserve: true });
    for (const [key,value] of Object.entries(correction.manual)) assert.deepEqual(row.source_brew_parameters.manual[key], value);
  }
  const missingPhotoRecipe = (await db.query('select bean_id,source_coffee_name,source_brew_parameters from recipes where slug=$1', ['square-mile-red-brick-current'])).rows[0];
  assert.equal(missingPhotoRecipe.bean_id, null); assert.equal(missingPhotoRecipe.source_coffee_name, 'Red Brick');
  assert.equal(missingPhotoRecipe.source_brew_parameters.discovery.coffee_name, 'Red Brick');
  assert.equal((await db.query('select cover_image_url from recipes where slug=$1', ['square-mile-red-brick-current'])).rows[0].cover_image_url, null);
  const protectedRecipe = (await db.query('select source_brew_parameters,cover_image_url from recipes where id=$1', [imported.id])).rows[0];
  assert.equal(protectedRecipe.cover_image_url, 'https://images.example.test/user-cover.jpg');
  assert.deepEqual(protectedRecipe.source_brew_parameters.user_extension, {keep:true});
  assert.deepEqual(protectedRecipe.source_brew_parameters.legacy_extension, {preserve:true});
  assert.equal(protectedRecipe.source_brew_parameters.discovery.roaster_id, (await db.query('select roaster_id from beans where id=$1', [imported.bean_id])).rows[0].roaster_id);
  assert.equal((await db.query("select count(*)::int n from recipes where slug not in ('crema-coffee-espresso','equator-espresso','flair-58-starter-espresso','onyx-monarch-kalita-wave') and difficulty is not null")).rows[0].n, 0);
  for (const part of smallParts) await db.exec(generateSQL(part.catalog));
  assert.deepEqual((await db.query('select id,slug from recipes order by slug')).rows, ids, 'Sequential small transactions must resolve the same existing IDs');
  await db.exec(sql);
  assert.deepEqual((await db.query('select id,slug from recipes order by slug')).rows, ids, 'Full transaction still replays after byte-bounded parts');
  assert(!/\bdelete\s+from\b/i.test(sql));
  const extraStep = (await db.query('insert into recipe_steps(recipe_id,step_number,title) values($1,$2,$3) returning id', [imported.id,legacy.steps.length + 1,'Synthetic historical extra step'])).rows[0].id;
  await assert.rejects(db.exec(sql), /extra steps requiring explicit review/); await db.exec('rollback');
  assert.equal((await db.query('select title from recipe_steps where id=$1', [extraStep])).rows[0].title, 'Synthetic historical extra step');
  // Only test-fixture cleanup in this isolated database, never emitted in import SQL.
  await db.query('delete from recipe_steps where id=$1', [extraStep]);
  const extraPour = (await db.query('insert into recipe_pours(recipe_id,pour_number,water_grams,start_at_seconds,is_bloom) values($1,$2,1,0,false) returning id', [imported.id,legacy.pours.length + 1])).rows[0].id;
  await assert.rejects(db.exec(sql), /extra pours requiring explicit review/); await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int n from recipe_pours where id=$1', [extraPour])).rows[0].n, 1);
  await db.query('delete from recipe_pours where id=$1', [extraPour]);
  await db.query('update recipes set water_grams=43 where id=$1', [catalog.corrections[0].expected_id]);
  await assert.rejects(db.exec(sql), /correction old values changed/); await db.exec('rollback');
  await db.query('update recipes set water_grams=null where id=$1', [catalog.corrections[0].expected_id]);
  await db.query('update recipes set bean_id=$1 where id=$2', [original.beans[0].id,imported.id]);
  await assert.rejects(db.exec(sql), /different bean link/); await db.exec('rollback');
  await db.query('update recipes set bean_id=$1 where id=$2', [imported.bean_id,imported.id]);
  await db.query("update recipes set visibility='private' where id=$1", [imported.id]);
  await assert.rejects(db.exec(sql), /no longer public/); await db.exec('rollback');
  assert.equal((await db.query('select visibility from recipes where id=$1', [imported.id])).rows[0].visibility, 'private');
  await db.query("update recipes set visibility='public' where id=$1", [imported.id]);
  await db.query("update recipes set visibility='private' where id=$1", [catalog.corrections[0].expected_id]);
  await assert.rejects(db.exec(sql), /correction identity conflict/); await db.exec('rollback');
  await db.query("update recipes set visibility='public' where id=$1", [catalog.corrections[0].expected_id]);
  await db.query('delete from brew_methods where code=$1', ['switch']); // unused method does not affect a valid batch
  const altered = structuredClone(catalog); altered.recipes[0].brew_method = 'switch';
  await assert.rejects(db.exec(generateSQL(altered)), /Required brew methods are missing/); await db.exec('rollback');
  t.diagnostic('All 87 recipes (86 new + one existing Monarch ID) and 77 new beans tested twice in in-memory PostgreSQL 18.3; production target is PostgreSQL 17. Existing 137 beans, 37 roasters, correction/Monarch step IDs and five outcome relationships retained. Private curator recipes and corrections are rejected.');
});
