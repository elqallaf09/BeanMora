import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileCatalog } from './prepare-roaster-recipes.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../supabase/research/daily-2026-10-12/${name}`, import.meta.url), 'utf8'));
test('reviewed Switch and French press recipes preserve missing temperatures, units and roaster identities', () => {
  const catalog = compileCatalog({ ...read('input.json'), snapshot: read('public-catalog-snapshot.json') });
  assert.deepEqual(catalog, read('catalog.json'));
  assert.equal(catalog.counts.roaster_actions.create, 2);
  assert.equal(catalog.counts.roaster_actions.reuse_exact, 1);
  const press = catalog.recipes.find(row => row.brew_method === 'french_press');
  assert.equal(press.water_temp_c, null);
  assert.equal(press.water_temp_c_min, 96.1);
  assert.equal(press.water_temp_c_max, 98.9);
  assert.equal(press.total_time_seconds, 240);
  assert.equal(press.steps.find(row => row.step_kind === 'press').duration_seconds, 20);
  const sw = catalog.recipes.find(row => row.brew_method === 'switch');
  assert.equal(sw.source_author_name, 'Cary Wong');
  assert.equal(sw.roaster_name, 'Partners Coffee');
  assert.equal(sw.water_temp_c, null);
  assert.equal(sw.water_temp_c_min, null);
  assert.equal(sw.water_temp_c_max, null);
  assert.equal(sw.is_incomplete_source, true);
  assert.deepEqual(sw.pours.map(row => row.water_grams), [30,110,100]);
  assert.deepEqual(sw.pours.map(row => row.start_at_seconds), [0,40,75]);
  for (const recipe of catalog.recipes) {
    assert.equal(recipe.serving_style, 'hot');
    assert.equal(recipe.coffee_key, null);
    assert.equal(recipe.pours.reduce((sum,row) => sum + row.water_grams, 0), recipe.water_grams);
    assert(recipe.steps.every(row => row.description && row.description_ar));
  }
  const sql = readFileSync(new URL('../supabase/research/daily-2026-10-12/import.sql', import.meta.url), 'utf8');
  assert(sql.includes('Existing catalog records changed'));
  assert(sql.includes('Recipe owner/method conflict'));
});
