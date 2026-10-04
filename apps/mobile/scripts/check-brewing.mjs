import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const source = readFileSync(new URL('../src/manualBrew.ts', import.meta.url), 'utf8');
const dir = mkdtempSync(tmpdir() + '/beanmora-brew-');
writeFileSync(dir + '/manual.mjs', ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const { emptyClock, updateClock, elapsedMs, manualBrew, scaleChemex, scaledPours } = await import(pathToFileURL(dir + '/manual.mjs').href);
test('stopwatch catches up after suspension, freezes on pause, and excludes paused time', () => {
  let c = updateClock(emptyClock(), 'start', 1000);
  assert.equal(elapsedMs(c, 121000), 120000);
  c = updateClock(c, 'pause', 121000);
  assert.equal(elapsedMs(c, 501000), 120000);
  c = updateClock(c, 'start', 501000);
  c = updateClock(c, 'finish', 521000);
  assert.equal(elapsedMs(c, 900000), 140000);
});
test('finishing or double-starting cannot manufacture time; reset removes previous measurements', () => {
  let c = emptyClock(); assert.deepEqual(updateClock(c, 'finish', 99), c);
  c = updateClock(c, 'start', 1000); c = updateClock(c, 'start', 100000);
  assert.equal(elapsedMs(c, 11000), 10000);
  c = updateClock(c, 'finish', 11000);
  assert.deepEqual(updateClock(c, 'start', 100000), c);
  assert.deepEqual(updateClock(c, 'reset', 100000), emptyClock());
});
test('invalid or reversed source ranges stay absent rather than becoming exact values', () => {
  assert.deepEqual(manualBrew({ dose_min_grams: 22, dose_max_grams: 20, time_min_seconds: 120 }), undefined);
  assert.equal(manualBrew({ dose_min_grams: 20, dose_max_grams: 22 }).dose_max_grams, 22);
  assert.equal(manualBrew({ dose_min_grams: Infinity, dose_max_grams: 1000 }), undefined);
});
test('batch math preserves sum and ratio and cannot scale moka or milliliters as grams', () => {
  const r = { method: 'chemex', dose: 45, water: 720, waterUnit: 'g', sourceBrew: { manual: { scalable: true } } };
  assert.equal(scaleChemex(r, 20), 20 / 45);
  for (const input of [null, 0, 9, 46, NaN]) assert.equal(scaleChemex(r, input), null);
  assert.equal(scaleChemex({ ...r, method: 'moka_pot' }, 20), null);
  assert.equal(scaleChemex({ ...r, waterUnit: 'ml' }, 20), null);
  const p = scaledPours([90,210,210,210].map((grams, i) => ({ number: i+1, at: i*30, grams, bloom: i===0 })), 20/45);
  assert.equal(p.at(-1).cumulative, 320);
  assert.equal(Math.round(p.reduce((n, item) => n + item.grams, 0) * 10) / 10, 320);
});
test('reviewed catalog has bilingual instructions, consistent gram pours and model-scoped moka', () => {
  const { recipes } = JSON.parse(readFileSync(new URL('../../../supabase/research/manual-brewing/recipes.json', import.meta.url), 'utf8'));
  for (const r of recipes) {
    assert(r.steps.every(s => s.description && s.description_ar));
    assert(r.source_url.startsWith('https://'));
    if (r.pours.length && r.pour_sum_validated !== false) assert.equal(r.pours.reduce((n, p) => n+p.water_grams, 0), r.water_grams);
    if (r.brew_method === 'moka_pot') { assert(r.source_brew_parameters.manual.model); assert(!r.source_brew_parameters.manual.scalable); }
  }
  const pact = recipes.find(r => r.slug === 'pact-moka-240ml');
  assert.equal(pact.water_grams, null); assert.equal(pact.source_brew_parameters.water_ml, 240); assert.equal(pact.total_time_seconds, null);
  const blue = recipes.find(r => r.slug === 'blue-bottle-moka-6cup');
  assert.equal(blue.dose_grams, null); assert.equal(blue.source_brew_parameters.manual.dose_min_grams, 20);
  const collective = recipes.find(r => r.slug === 'coffee-collective-french-press-guide');
  assert.equal(collective.water_grams, null); assert.equal(collective.source_brew_parameters.water_ml, 1000);
  assert.equal(collective.total_time_seconds, null); assert.match(collective.source_brew_parameters.manual.time_note, /4:00.*0:30/);
  const tay = recipes.find(r => r.slug === 'wac-2023-tay-wipvasutt');
  assert.equal(tay.pour_sum_validated, false); assert.equal(tay.pours.reduce((n,p)=>n+p.water_grams,0),105);
  assert.match(tay.steps.at(-1).description, /110 g.*154 g/);
});
