import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const source = readFileSync(new URL('../src/manualBrew.ts', import.meta.url), 'utf8');
const dir = mkdtempSync(tmpdir() + '/beanmora-brew-');
writeFileSync(dir + '/manual.mjs', ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const { emptyClock, updateClock, elapsedMs, manualBrew, scaleChemex, scaledPours, waterLabel, temperatureLabel, manualRecipeFacts, roastAgeLabel } = await import(pathToFileURL(dir + '/manual.mjs').href);
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

const globalRecipes = JSON.parse(readFileSync(new URL('../../../supabase/research/global-roasters/catalog.json', import.meta.url), 'utf8')).recipes;
const importedRecipe = slug => {
  const row = globalRecipes.find(recipe => recipe.slug === slug);
  assert(row, `Missing canonical recipe ${slug}`);
  return {
    method: row.brew_method, dose: row.dose_grams, water: row.water_grams, waterUnit: 'g',
    temperature: row.water_temp_c ?? null, temperatureMin: row.water_temp_c_min ?? null, temperatureMax: row.water_temp_c_max ?? null,
    sourceBrew: { manual: manualBrew(row.source_brew_parameters.manual) },
  };
};
test('all six Toby cards retain every roast-age window and qualify peak output', () => {
  const cards = globalRecipes.filter(row => row.source_brew_parameters.manual?.yield_by_roast_age);
  assert.equal(cards.length, 6);
  for (const row of cards) {
    const recipe = importedRecipe(row.slug); const m = recipe.sourceBrew.manual;
    assert.deepEqual(m.yield_by_roast_age, row.source_brew_parameters.manual.yield_by_roast_age);
    const peak = m.yield_by_roast_age.find(age => age.is_peak);
    assert.equal(m.yield_grams, peak.yield_grams);
    assert.equal(m.peak_age_min_days, peak.roast_age_min_days);
    assert.equal(m.peak_age_max_days, peak.roast_age_max_days);
    assert.match(waterLabel(recipe), /peak.*after roast/);
    assert(waterLabel(recipe).includes(`${peak.roast_age_min_days}–${peak.roast_age_max_days}`));
    assert.match(waterLabel(recipe, true), /الذروة.*بعد التحميص/);
    const last = m.yield_by_roast_age.at(-1);
    assert.equal(last.roast_age_max_days, null);
    assert.equal(roastAgeLabel(last.roast_age_min_days, null), `Day ${last.roast_age_min_days} onward`);
  }
});
test('Kurasu ice stays a separate 65–70 g range from 150 g brewing water', () => {
  const recipe = importedRecipe('kurasu-august-2026-comparison-flash-brew');
  assert.equal(waterLabel(recipe), '150 g');
  assert.equal(manualRecipeFacts(recipe).find(fact => fact.key === 'ice').value, '65–70 g');
  assert.equal(recipe.sourceBrew.manual.ice_grams, undefined);
});
test('ONA milk retains per-shot scope and never becomes espresso output or water', () => {
  const aspen = importedRecipe('ona-aspen-espresso');
  const facts = manualRecipeFacts(aspen);
  assert.equal(facts.find(fact => fact.key === 'milk-single-shot').value, '120 g');
  assert.match(facts.find(fact => fact.key === 'milk-single-shot').label, /single espresso shot/);
  assert.equal(facts.find(fact => fact.key === 'yield-scope').value, 'two espresso shots combined');
  assert.equal(waterLabel(aspen), '35–40 g');
  assert.equal(aspen.water, null);
  const raspberry = manualRecipeFacts(importedRecipe('ona-raspberry-candy-espresso'));
  assert.equal(raspberry.find(fact => fact.key === 'milk').note, 'Source does not identify whether this 120 g is per shot.');
  assert.equal(manualRecipeFacts(importedRecipe('ona-maple-espresso')).find(fact => fact.key === 'milk').value, '115–120 g');
  assert.equal(manualRecipeFacts(importedRecipe('ona-gargari-gutity-g1-red-ethiopia-natural-espresso')).find(fact => fact.key === 'milk-single-shot').value, '115 g');
  const localized = { ...aspen, sourceBrew: { manual: manualBrew({ yield_scope: 'two espresso shots combined', yield_scope_ar: 'مجموع شوتين', milk_grams: 120, milk_weight_scope: 'Scope unspecified', milk_weight_scope_ar: 'النطاق غير محدد', notes: 'Original note', notes_ar: 'ملاحظة المصدر' }) } };
  assert.equal(manualRecipeFacts(localized, true).find(fact => fact.key === 'yield-scope').value, 'مجموع شوتين');
  assert.equal(manualRecipeFacts(localized, true).find(fact => fact.key === 'milk').note, 'النطاق غير محدد');
  assert.equal(manualRecipeFacts(localized, true).find(fact => fact.key === 'notes').value, 'ملاحظة المصدر');
});
test('volumetric output is not grams and invalid supplemental ranges are absent', () => {
  const recipe = { method: 'espresso', water: 250, waterUnit: 'g', sourceBrew: { manual: manualBrew({ yield_ml: 28 }) } };
  assert.equal(waterLabel(recipe), '28 ml');
  assert.equal(waterLabel({ ...recipe, sourceBrew: { manual: manualBrew({ yield_min_ml: 22, yield_max_ml: 28 }) } }), '22–28 ml');
  assert.equal(waterLabel({ ...recipe, sourceBrew: { manual: manualBrew({ yield_ml: Infinity }) } }), '—');
  for (const value of [{ ice_min_grams: 70, ice_max_grams: 65 }, { milk_min_grams: 115 }, { milk_grams_per_single_shot: -120 }, { temperature_min_c: 94, temperature_max_c: NaN }, { peak_age_min_days: 15, peak_age_max_days: 11 }]) assert.equal(manualBrew(value), undefined);
  const m = manualBrew({ yield_by_roast_age: [
    { roast_age_min_days: 16, yield_grams: 38, is_peak: false },
    { roast_age_min_days: 16, roast_age_max_days: 12, yield_grams: 38, is_peak: false },
    { roast_age_min_days: 16, roast_age_max_days: null, yield_grams: 38, is_peak: false },
  ] });
  assert.deepEqual(m.yield_by_roast_age, [{ roast_age_min_days: 16, roast_age_max_days: null, yield_grams: 38, is_peak: false }]);
});
test('phase temperatures remain 62°C bloom and 90°C main pours; published ranges have a fallback', () => {
  const recipe = importedRecipe('friedhats-lex-wenneker-cool-bloom-origami');
  assert.equal(temperatureLabel(recipe), '62°C bloom · 90°C main pours');
  assert.equal(temperatureLabel(recipe, true), '62°C للتزهير · 90°C للصبات التالية');
  const facts = manualRecipeFacts(recipe);
  assert.equal(facts.find(fact => fact.key === 'bloom-temperature').value, '62°C');
  assert.equal(facts.find(fact => fact.key === 'main-temperature').value, '90°C');
  const range = { ...recipe, sourceBrew: { manual: manualBrew({ temperature_min_c: 94, temperature_max_c: 94.5 }) } };
  assert.equal(temperatureLabel(range), '94–94.5°C');
  assert.equal(temperatureLabel({ ...range, temperatureMin: 92, temperatureMax: 93 }), '92–93°C');
  assert.equal(temperatureLabel({ ...range, sourceBrew: { manual: undefined } }), '—');
});
