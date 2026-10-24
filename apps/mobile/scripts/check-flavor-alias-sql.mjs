// In-memory PostgreSQL regression; never connects to a production database.
// PGLITE_MODULE_PATH=/path/to/@electric-sql/pglite/dist/index.js node apps/mobile/scripts/check-flavor-alias-sql.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '../../..');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href);
const db = await PGlite.create();
const migration = name => readFileSync(resolve(root, 'supabase/migrations', name), 'utf8');
try {
  await db.exec(`create role anon nologin nobypassrls; create role authenticated nologin nobypassrls;
    create role service_role nologin bypassrls; create schema private; grant usage on schema private to anon,authenticated;
    create table public.recipe_search_documents(id int); alter table public.recipe_search_documents enable row level security;
    create function private.refresh_recipe_search_documents(uuid[]) returns void language plpgsql as $$begin return; end$$;
    revoke all on function private.refresh_recipe_search_documents(uuid[]) from public;`);
  const initial = migration('20261004115600_public_recipe_discovery.sql');
  await db.exec(initial.slice(0, initial.indexOf('create or replace function public.search_public_recipes')));
  // Use the real multilingual source-index helper and the already-deployed
  // flavor extension. Only the maintenance table/function above are stubs.
  const multilingual = migration('20261014170344_multilingual_recipe_search.sql');
  const index = multilingual.slice(0, multilingual.indexOf('-- Rebuild public derived search documents'))
    .replace('return result; end $function$;', 'return result||public.recipe_discovery_flavor_aliases(original); end $function$;');
  assert.notEqual(index.indexOf('recipe_discovery_flavor_aliases(original)'), -1);
  await db.exec(index);
  const old = migration('20261015123941_reviewed_flavor_search_aliases.sql');
  await db.exec(old.slice(0, old.indexOf('do $patch$')));
  await db.exec(migration('20261015124852_canonical_flavor_queries.sql'));
  const latest = readdirSync(resolve(root,'supabase/migrations')).filter(f => f.endsWith('_refresh_reviewed_flavor_aliases.sql')).sort().at(-1);
  await db.exec('begin;\n' + migration(latest) + '\ncommit;');
  await db.exec(readFileSync(resolve(root,'supabase/tests/reviewed_flavor_search.sql'),'utf8'));
  await db.exec('set role anon');
  for (const alias of ['Banana','موز','banane','バナナ','plátano','香蕉']) {
    const { rows } = await db.query(`select public.recipe_discovery_matches(public.recipe_discovery_search_text('Banana honey'),$1) as matched,
      public.recipe_discovery_matches(public.recipe_discovery_search_text($1),'banana') as reverse,
      public.recipe_discovery_matches(public.recipe_discovery_search_text('Banana'),$1||' unknown_brand_fixture') as widened`, [alias]);
    assert.deepEqual(rows[0], { matched:true, reverse:true, widened:false }, alias);
  }
  console.log('PASS: forward flavor migration, full dictionary parity, multilingual banana queries and guest privilege guards.');
} catch (error) {
  console.error(error.message, error.where || ''); process.exitCode = 1;
} finally { await db.close(); }
