import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileCatalog, generateSQL } from './prepare-roaster-recipes.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../supabase/research/daily-2026-10-11/${name}`, import.meta.url), 'utf8'));
const input = () => ({ ...read('input.json'), snapshot: read('public-catalog-snapshot.json') });

test('dated manufacturer guides keep ranges, original units, author and pours without inventing a roaster or coffee', () => {
  const catalog = compileCatalog(input());
  assert.equal(catalog.import_id, 'reviewed-catalog-2026-10-11');
  assert.deepEqual(catalog.roasters.map(r => r.name), ['A R K Roasters', 'Altitude Roasters']);
  assert.equal(catalog.recipes.length, 3);
  assert.equal(catalog.coffees.length, 0);
  for (const recipe of catalog.recipes) {
    assert.equal(recipe.roaster_key, null);
    assert.equal(recipe.coffee_key, null);
    assert.equal(recipe.recipe_type, 'official_manufacturer');
    assert.equal(recipe.source_brew_parameters.discovery.roaster_name, undefined);
    assert.equal(recipe.total_time_seconds, null, 'A finish window must not become a midpoint');
    assert(recipe.source_brew_parameters.manual.time_min_seconds > 0);
    assert(recipe.source_brew_parameters.manual.time_max_seconds > recipe.source_brew_parameters.manual.time_min_seconds);
    assert.equal(recipe.source_brew_parameters.manual.water_ml, recipe.water_grams);
    assert.equal(recipe.pours.reduce((sum, p) => sum + p.water_grams, 0), recipe.water_grams);
    assert.equal(recipe.pour_sum_validated, true);
    assert.equal(recipe.source_brew_parameters.global_roasters_import.verified_at, '2026-10-11');
    assert(recipe.steps.every(step => step.description && step.description_ar));
  }
  const sql = generateSQL(catalog);
  assert.equal(sql, readFileSync(new URL('../supabase/research/daily-2026-10-11/import.sql', import.meta.url), 'utf8'));
  assert(sql.includes('Recipe owner/method conflict'));
});
test('a missing roaster is allowed only for manufacturer guides without an asserted coffee association', () => {
  for (const change of [{ recipe_type: 'official_roaster' }, { roaster_name: 'Invented roaster' }, { coffee_name: 'Invented lot' }]) {
    const bad = input();
    Object.assign(bad.batches[0].data.recipes[0], change);
    assert.throws(() => compileCatalog(bad), /unknown roaster/);
  }
  const badDate = input();
  badDate.verifiedAt = '2026-10-12';
  assert.throws(() => compileCatalog(badDate), /dated review identity/);
});
