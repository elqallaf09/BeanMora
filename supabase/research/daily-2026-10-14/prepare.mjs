// Reuse the reviewed importer; add an existing-row fingerprint guard.
import { readFileSync, writeFileSync } from 'node:fs';
import { compileCatalog, generateSQL } from '../../../scripts/prepare-roaster-recipes.mjs';
const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const catalog = compileCatalog({ ...read('input.json'), snapshot: read('public-catalog-snapshot.json') });
const quoted = items => items.map(value => "'" + value.replaceAll("'", "''") + "'").join(',');
const recipeSlugs = quoted(catalog.recipes.map(row => row.slug));
const roasterSlugs = quoted(catalog.roasters.filter(row => row.action === 'create').map(row => row.slug));
const unchangedRecipe = `r.slug is null or r.slug not in (${recipeSlugs})`;
const hashes = [
  ['recipes', `select r.id,to_jsonb(r) as row from public.recipes r where ${unchangedRecipe}`],
  ['roasters', `select r.id,to_jsonb(r) as row from public.roasters r where r.slug is null or r.slug not in (${roasterSlugs})`],
  ['beans', 'select r.id,to_jsonb(r) as row from public.beans r'],
  ...['recipe_steps', 'recipe_pours', 'recipe_sources'].map(table => [table, `select s.id,to_jsonb(s) as row from public.${table} s join public.recipes r on r.id=s.recipe_id where ${unchangedRecipe}`]),
].map(([name, query]) => `'${name}',(select md5(coalesce(string_agg(md5(row::text),'' order by id),'')) from (${query}) untouched)`).join(',');
const fingerprint = `select jsonb_build_object(${hashes})::text`;
let sql = generateSQL(catalog)
  .replace('declare\n', 'declare\n  v_baseline text; v_after text;\n')
  .replace('  select p.id into strict v_curator', `  v_baseline := (${fingerprint});\n  select p.id into strict v_curator`)
  .replace('end\n$apply_global$;', `  v_after := (${fingerprint});\n  if v_baseline is distinct from v_after then raise exception 'Existing catalog records changed'; end if;\nend\n$apply_global$;`);
const counts = `select (select count(*) from public.recipes where slug in (${recipeSlugs})) as batch_recipes,(select count(*) from public.roasters where slug in (${roasterSlugs})) as new_roasters,(select count(*) from public.recipe_steps s join public.recipes r on r.id=s.recipe_id where r.slug in (${recipeSlugs})) as steps,(select count(*) from public.recipe_pours p join public.recipes r on r.id=p.recipe_id where r.slug in (${recipeSlugs})) as pours;`;
sql = sql.replace('commit;\n', counts + '\ncommit;\n');
writeFileSync(new URL('catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('import.sql', import.meta.url), sql);
writeFileSync(new URL('verify-rollback.sql', import.meta.url), sql.replace('commit;\n', 'rollback;\n'));
console.log(JSON.stringify(catalog.counts));
