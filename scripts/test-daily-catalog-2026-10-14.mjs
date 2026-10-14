import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileCatalog } from './prepare-roaster-recipes.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../supabase/research/daily-2026-10-14/${name}`, import.meta.url), 'utf8'));
test('Gulf source units and unknown Moka quantities survive the reviewed import', () => {
  const catalog = compileCatalog({ ...read('input.json'), snapshot: read('public-catalog-snapshot.json') });
  assert.deepEqual(catalog, read('catalog.json'));
  assert.equal(catalog.counts.new_recipes, 3);
  assert.equal(catalog.counts.roaster_actions.create, 2);
  assert.equal(catalog.counts.coffee_actions.skip_no_verified_image, 1);
  assert.equal(catalog.recipes.reduce((sum, r) => sum + r.steps.length, 0), 9);
  for (const r of catalog.recipes) {
    assert.equal(r.water_grams, null);
    assert.equal(r.water_temp_c, null);
    assert.equal(r.serving_style, 'unknown');
    assert.equal(r.cover_image_url, null);
    assert.equal(r.pours.length, 0);
    assert(r.steps.every(s => s.description && s.description_ar));
  }
  const v60 = catalog.recipes.find(r => r.brew_method === 'v60');
  assert.equal(v60.dose_grams, 20);
  assert.equal(v60.source_brew_parameters.manual.water_ml, 300);
  assert.deepEqual(v60.source_brew_parameters.manual.source_pours.map(p => p.cumulative_ml), [40,100,180,240,300]);
  assert.equal(v60.total_time_seconds, 165);
  const espresso = catalog.recipes.find(r => r.brew_method === 'espresso');
  assert.equal(espresso.source_brew_parameters.manual.yield_ml, 33);
  assert.equal(espresso.source_brew_parameters.manual.yield_grams, undefined);
  assert.equal(espresso.total_time_seconds, 28);
  const moka = catalog.recipes.find(r => r.brew_method === 'moka_pot');
  assert.equal(moka.dose_grams, null);
  assert.equal(moka.total_time_seconds, 300);
  assert(moka.is_incomplete_source);
  const sql = readFileSync(new URL('../supabase/research/daily-2026-10-14/import.sql', import.meta.url), 'utf8');
  assert(sql.includes('Existing catalog records changed'));
  assert(sql.includes('Recipe owner/method conflict'));
});
