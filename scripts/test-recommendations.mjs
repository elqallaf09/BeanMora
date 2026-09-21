// Deterministic test fixtures only. Nothing here is written to the application database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/recommendations/engine.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const engine = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const { emptyProfile, ownedMethods, flavorGroups, freshness, validChoice, METHODS, hasPersonalSignals, communityEvidence, recommendCoffees, recommendRecipes } = engine;
const now = Date.parse('2026-09-21T12:00:00Z');
const coffee = (overrides = {}) => ({ id: 'bean-a', kind: 'bean', slug: 'coffee-a', name: 'Test fixture', roaster: null, beanId: 'bean-a', reviewed: true, published: true, methods: ['v60'], flavors: ['cocoa'], roast: 'light', status: null, verifiedAt: '2026-09-20T12:00:00Z', ...overrides });
const recipe = (overrides = {}) => ({ id: 'recipe-a', title: 'Test fixture', public: true, method: 'v60', beanId: 'bean-a', productId: null, flavors: ['cocoa'], difficulty: 'beginner', incomplete: false, equipment: [], dose: 18, water: 300, seconds: 180, evidence: communityEvidence([], []), ...overrides });
const profile = (overrides = {}) => ({ ...emptyProfile(), ...overrides });
const attempt = (overrides = {}) => ({ id: 'a', userId: 'user-a', status: 'brewed_as_written', outcome: 'good', createdAt: '2026-09-20T12:00:00Z', ...overrides });

test('Arabic and English flavor groups match with diacritics and explicit aliases', () => {
  assert.deepEqual(flavorGroups(['شُوكُولاتة', 'بُندق', 'JASMINE']), ['chocolate', 'nutty', 'floral']);
  assert.deepEqual(flavorGroups(['dark chocolate / ليمون']), ['chocolate', 'citrus']);
});
test('unknown or partial words do not become invented flavor matches', () => {
  assert.deepEqual(flavorGroups(['rosewood', 'unidentified note']), []);
});
test('query choices reject arrays and query/filter syntax', () => {
  assert.equal(validChoice(['v60'], METHODS), undefined);
  assert.equal(validChoice('v60,espresso', METHODS), undefined);
  assert.equal(validChoice('espresso', METHODS), 'espresso');
});
test('a grinder alone does not imply espresso or V60 ownership', () => {
  assert.deepEqual(ownedMethods(profile({ gear: [{ category: 'grinder', modelId: 'g' }] })), []);
  assert.equal(hasPersonalSignals(emptyProfile()), false);
});
test('brewing methods are derived from equipment categories, not custom names', () => {
  assert.deepEqual(ownedMethods(profile({ gear: [{ category: 'manual_espresso', modelId: null }, { category: 'espresso_machine', modelId: 'e' }] })), ['espresso']);
});
test('freshness boundaries are exact and future timestamps never look fresh', () => {
  const days = n => new Date(now - n * 86400000).toISOString();
  assert.equal(freshness(days(30), now), 'fresh');
  assert.equal(freshness(days(30.01), now), 'aging');
  assert.equal(freshness(days(90), now), 'aging');
  assert.equal(freshness(days(90.01), now), 'stale');
  for (const value of [null, 'invalid', days(-1)]) assert.equal(freshness(value, now), 'unverified');
});
test('unreviewed or unpublished catalog records are never recommended', () => {
  assert.deepEqual(recommendCoffees([coffee({ reviewed: false }), coffee({ published: false })], emptyProfile(), now), []);
});
test('unavailable, seasonal, archived and unknown product stock are excluded', () => {
  for (const status of ['sold_out', 'seasonal', 'archived', 'unknown', null]) {
    assert.equal(recommendCoffees([coffee({ kind: 'product', status })], emptyProfile(), now).length, 0);
  }
  for (const status of ['available', 'low_stock']) assert.equal(recommendCoffees([coffee({ kind: 'product', status })], emptyProfile(), now).length, 1);
});
test('legacy beans may be explored but never imply purchasable stock', () => {
  assert.ok(recommendCoffees([coffee()], emptyProfile(), now)[0].caveats.includes('stockUnknown'));
});
test('a reviewed available product suppresses only its duplicate legacy bean', () => {
  const rows = recommendCoffees([coffee(), coffee({ id: 'product-a', kind: 'product', status: 'available' })], emptyProfile(), now);
  assert.deepEqual(rows.map(r => r.item.id), ['product-a']);
});
test('a sold-out product cannot hide its discoverable legacy bean', () => {
  assert.deepEqual(recommendCoffees([coffee(), coffee({ id: 'product-a', kind: 'product', status: 'sold_out' })], emptyProfile(), now).map(r => r.item.id), ['bean-a']);
});
test('method filtering happens before result limiting', () => {
  const candidates = Array.from({ length: 60 }, (_, i) => coffee({ id: `wrong-${i}`, methods: ['espresso'] }));
  candidates.push(coffee({ id: 'wanted' }));
  assert.deepEqual(recommendCoffees(candidates, emptyProfile(), now, 'v60', 1).map(r => r.item.id), ['wanted']);
});
test('matched flavor, roast, gear and inventory have inspectable reasons', () => {
  const p = profile({ methods: ['v60'], flavors: ['شوكولاتة'], roast: 'light', beanIds: ['bean-a'], gear: [{ category: 'v60_dripper', modelId: 'v60' }] });
  const r = recommendCoffees([coffee()], p, now)[0];
  for (const reason of ['method', 'flavor', 'roast', 'gearMethod', 'inventory']) assert.ok(r.reasons.includes(reason));
  assert.equal('confidence' in r, false);
});
test('stale records are visibly qualified rather than silently refreshed', () => {
  assert.ok(recommendCoffees([coffee({ verifiedAt: '2025-01-01' })], emptyProfile(), now)[0].caveats.includes('stale'));
});
test('private, unlisted and draft recipes cannot pass a public candidate gate', () => {
  assert.deepEqual(recommendRecipes([recipe({ public: false })], emptyProfile()), []);
});
test('known espresso gear excludes V60 by default', () => {
  const p = profile({ gear: [{ category: 'espresso_machine', modelId: 'e' }] });
  assert.deepEqual(recommendRecipes([recipe()], p), []);
});
test('explicit exploration of another method warns about gear mismatch', () => {
  const p = profile({ gear: [{ category: 'espresso_machine', modelId: 'e' }] });
  const r = recommendRecipes([recipe()], p, 'v60')[0];
  assert.ok(r.caveats.includes('equipmentDifferent'));
  assert.ok(!r.reasons.includes('gearMethod'));
});
test('same equipment category with a different model is not an exact equipment match', () => {
  const p = profile({ gear: [{ category: 'grinder', modelId: 'model-a' }, { category: 'v60_dripper', modelId: null }] });
  const r = recommendRecipes([recipe({ equipment: [{ category: 'grinder', modelId: 'model-b' }] })], p)[0];
  assert.ok(!r.reasons.includes('exactEquipment'));
  assert.ok(r.caveats.includes('equipmentDifferent'));
});
test('exact equipment matching requires every recorded requirement', () => {
  const gear = [{ category: 'grinder', modelId: 'g' }, { category: 'v60_dripper', modelId: 'v' }];
  assert.ok(recommendRecipes([recipe({ equipment: gear })], profile({ gear }))[0].reasons.includes('exactEquipment'));
  assert.ok(!recommendRecipes([recipe({ equipment: gear })], profile({ gear: gear.slice(1) }))[0].reasons.includes('exactEquipment'));
});
test('missing equipment and recipe parameters remain explicit unknowns', () => {
  const r = recommendRecipes([recipe({ dose: null })], emptyProfile())[0];
  assert.ok(r.caveats.includes('incomplete'));
  assert.ok(r.caveats.includes('equipmentUnknown'));
});
test('saved-only records never become brew results or validated reviews', () => {
  const e = communityEvidence([attempt({ status: 'saved_only' })], [{ userId: 'user-a', attemptId: 'a', rating: 5 }]);
  assert.deepEqual(e, { brewers: 0, rated: 0, successful: 0, reviews: 0, average: null });
});
test('many attempts by one person count as one brewer with their latest outcome', () => {
  const e = communityEvidence([attempt(), attempt({ id: 'b', createdAt: '2026-09-21T12:00:00Z', outcome: 'poor' })], []);
  assert.deepEqual(e, { brewers: 1, rated: 1, successful: 0, reviews: 0, average: null });
});
test('borrowed attempts and invalid ratings cannot validate a review', () => {
  const e = communityEvidence([attempt()], [{ userId: 'other', attemptId: 'a', rating: 5 }, { userId: 'user-a', attemptId: 'a', rating: NaN }]);
  assert.equal(e.reviews, 0);
  assert.equal(e.average, null);
});
test('one perfect result does not justify a community recommendation', () => {
  const r = recommendRecipes([recipe({ evidence: communityEvidence([attempt()], []) })], emptyProfile())[0];
  assert.ok(!r.reasons.includes('community'));
});
test('three distinct positive brewers provide a bounded evidence boost', () => {
  const e = communityEvidence([attempt(), attempt({ id: 'b', userId: 'b' }), attempt({ id: 'c', userId: 'c' })], []);
  const r = recommendRecipes([recipe({ evidence: e })], emptyProfile())[0];
  assert.ok(r.reasons.includes('community'));
  assert.ok(r.rank <= 10);
});
test('inventory and own positive outcomes influence recipe ordering', () => {
  const p = profile({ beanIds: ['bean-a'], successfulRecipeIds: ['recipe-a'] });
  const ranked = recommendRecipes([recipe({ id: 'other', beanId: null }), recipe()], p);
  assert.equal(ranked[0].item.id, 'recipe-a');
  assert.ok(ranked[0].reasons.includes('ownSuccess'));
});
test('ties are deterministic, input arrays are not mutated, and caps are enforced', () => {
  const input = [recipe({ id: 'b' }), recipe({ id: 'a' })];
  assert.deepEqual(recommendRecipes(input, emptyProfile()).map(r => r.item.id), ['a', 'b']);
  assert.deepEqual(input.map(r => r.id), ['b', 'a']);
  assert.equal(recommendRecipes(input, emptyProfile(), undefined, 0).length, 0);
});
test('Arabic and English translation keys stay in parity, including every engine reason', () => {
  const en = JSON.parse(readFileSync(new URL('../messages/recommendations/en.json', import.meta.url)));
  const ar = JSON.parse(readFileSync(new URL('../messages/recommendations/ar.json', import.meta.url)));
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([k, v]) => typeof v === 'object' ? keys(v, `${prefix}${k}.`) : `${prefix}${k}`).sort();
  assert.deepEqual(keys(en), keys(ar));
  const reasonUnion = source.match(/export type Reason = ([^;]+);/)[1];
  for (const [, reason] of reasonUnion.matchAll(/"([^"]+)"/g)) assert.equal(typeof en.reasons[reason], 'string');
  const caveatUnion = source.match(/export type Caveat = ([^;]+);/)[1];
  for (const [, caveat] of caveatUnion.matchAll(/"([^"]+)"/g)) assert.equal(typeof ar.caveats[caveat], 'string');
});
test('personalization is request-scoped, read-only, and not wired to privileged keys', () => {
  const loader = readFileSync(new URL('../src/lib/recommendations/load.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/app/[locale]/(app)/recommendations/page.tsx', import.meta.url), 'utf8');
  assert.ok(loader.includes('import "server-only"'));
  assert.ok(!loader.includes('SUPABASE_SERVICE_ROLE'));
  assert.ok(!/\.(insert|update|delete|upsert)\(/.test(loader));
  assert.ok(page.includes('export const dynamic = "force-dynamic"'));
  assert.ok(!loader.includes('unstable_cache'));
  for (const table of ['user_preferences', 'user_equipment', 'user_bean_inventory']) {
    assert.match(loader, new RegExp(`from\\("${table}"\\)[^\\n]+eq\\("user_id", user.id\\)`));
  }
});

test('two positive brewers plus one poor result do not claim three positive brewers', () => {
  const evidence = communityEvidence([attempt(), attempt({id:'b',userId:'b'}), attempt({id:'c',userId:'c',outcome:'poor'})], []);
  assert.ok(!recommendRecipes([recipe({evidence})], emptyProfile())[0].reasons.includes('community'));
});
test('non-finite or negative brewing quantities are flagged as incomplete', () => {
  for (const dose of [-1, Infinity, NaN, 0]) assert.ok(recommendRecipes([recipe({dose})], emptyProfile())[0].caveats.includes('incomplete'));
});
