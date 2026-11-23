// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateXBloom, generatedDraft, validateGenerated, XBloomGeneratorError, type GeneratedXBloom } from '../../apps/mobile/src/xbloomGenerator';
import type { RecipeItem } from '../../apps/mobile/src/data';
import type { XBloomPreferences } from '../../apps/mobile/src/xbloomDraft';

const pour = (volume: number, temperature = 92, flow_rate: number | null = 3, pause_seconds: number | null = 10) =>
  ({ volume, temperature, flow_rate, pause_seconds, pattern_code: 2, vibration_before: null, vibration_after: null });
function recipe(id: string, options: { model?: string; cup?: string; serving?: string; dose?: number; grind?: number; pours?: ReturnType<typeof pour>[]; score?: number } = {}): RecipeItem {
  const pours = options.pours ?? [pour(45, 92, 3, 40), pour(65), pour(65), pour(65)];
  return { id, title: 'Source ' + id, method: 'xbloom', public: true, dose: options.dose ?? 15, sources: [{ url: 'https://share-h5.xbloom.com/?id=' + id }],
    discovery: { servingStyle: options.serving ?? 'hot', coffeeName: 'Guji' },
    sourceBrew: { model: options.model ?? 'Studio', cup_type: options.cup ?? 'Omni', dose: options.dose ?? 15, grind_size: options.grind ?? 57, pours },
    ...(options.score ? { labelMatch: { score: options.score, label: { name: 'Guji Hambela' } } } : {}) } as unknown as RecipeItem;
}
const prefs = (over: Partial<XBloomPreferences> = {}): XBloomPreferences => ({ model: 'Studio', cup: 'Omni', serving: 'hot', amount: '240', unit: 'water', coffee: '', flavor: '', ...over });
const reason = (run: () => unknown) => { try { run(); return 'ok'; } catch (e) { return e instanceof XBloomGeneratorError ? e.reason : 'other'; } };

describe('xBloom recipe generator', () => {
  it('keeps mass balance exact and the ratio consistent for any requested size', () => {
    for (const amount of ['150', '237', '250', '333', '400']) {
      const r = generateXBloom([recipe('a'), recipe('b', { grind: 55 }), recipe('c', { grind: 60 })], prefs({ amount }));
      expect(r.pours.reduce((sum, p) => sum + p.volume, 0)).toBe(r.water);
      expect(r.water).toBe(Number(amount));
      expect(Math.abs(r.ratio - r.water / r.dose)).toBeLessThanOrEqual(0.06);
      expect(r.pours.every(p => p.volume > 0 && Number.isInteger(p.volume))).toBe(true);
    }
  });
  it('scales from a dose and accepts Arabic digits', () => {
    const r = generateXBloom([recipe('a')], prefs({ unit: 'dose', amount: '١٨' }));
    expect(r.dose).toBe(18); expect(r.water).toBe(288); expect(r.ratio).toBe(16);
  });
  it('never mixes machines, drippers or serving styles into the basis', () => {
    const pool = [recipe('orig', { model: 'Original', grind: 24 }), recipe('xpod', { cup: 'xPod', grind: 30 }), recipe('iced', { serving: 'iced', grind: 35 }), recipe('ok', { grind: 58 })];
    const r = generateXBloom(pool, prefs());
    expect(r.sourceIds).toEqual(['ok']); expect(r.grind).toBe(58);
    expect(reason(() => generateXBloom(pool.slice(0, 3), prefs()))).toBe('NO_BASIS');
    expect(generateXBloom(pool, prefs({ model: 'Original', amount: '15', unit: 'dose' })).grind).toBe(24);
  });
  it('uses a weighted median so one unusual recipe cannot drag the grind', () => {
    const r = generateXBloom([recipe('a', { grind: 56, score: 9 }), recipe('b', { grind: 57, score: 8 }), recipe('odd', { grind: 20, score: 1 })], prefs());
    expect(r.grind).toBe(56); expect(r.templateId).toBe('a'); expect(r.provenance.grind).toBe('published');
  });
  it('applies taste as a small labelled preference inside machine limits', () => {
    const base = generateXBloom([recipe('a')], prefs());
    const fruity = generateXBloom([recipe('a')], prefs(), 'fruity');
    const full = generateXBloom([recipe('a')], prefs(), 'full');
    expect(fruity.grind - base.grind).toBe(1); expect(fruity.temperature - base.temperature).toBe(-1);
    expect(fruity.provenance).toMatchObject({ grind: 'preference', temperature: 'preference' });
    expect(full.grind - base.grind).toBe(-2);
    expect(generateXBloom([recipe('edge', { grind: 80 })], prefs(), 'light').grind).toBe(80);
    expect(generateXBloom([recipe('a')], prefs(), 'balanced').provenance.grind).toBe('published');
  });
  it('rejects amounts outside the machine window instead of clamping silently', () => {
    expect(reason(() => generateXBloom([recipe('a')], prefs({ amount: '0' })))).toBe('AMOUNT');
    expect(reason(() => generateXBloom([recipe('a')], prefs({ amount: 'abc' })))).toBe('AMOUNT');
    expect(reason(() => generateXBloom([recipe('a')], prefs({ unit: 'dose', amount: '40' })))).toBe('DOSE_RANGE');
    expect(reason(() => generateXBloom([recipe('a')], prefs({ amount: '600' })))).toBe('DOSE_RANGE');
    expect(reason(() => generateXBloom([recipe('o', { model: 'Original' })], prefs({ model: 'Original', unit: 'dose', amount: '10' })))).toBe('DOSE_RANGE');
  });
  it('estimates time only when every pour has a flow and pause, and skips unusable sources', () => {
    expect(generateXBloom([recipe('a')], prefs()).seconds).toBe(150);
    expect(generateXBloom([recipe('a', { pours: [pour(120, 92, null, 30), pour(120)] })], prefs()).seconds).toBeNull();
    expect(reason(() => generateXBloom([recipe('bad', { pours: [pour(0)] })], prefs()))).toBe('NO_BASIS');
    expect(reason(() => generateXBloom([recipe('bad', { grind: 0 })], prefs()))).toBe('NO_BASIS');
  });
  it('validator rejects inconsistent or physically impossible recipes', () => {
    const good = generateXBloom([recipe('a')], prefs());
    const bad = (change: Partial<GeneratedXBloom>) => reason(() => validateGenerated({ ...good, ...change }));
    expect(bad({})).toBe('ok');
    expect(bad({ water: good.water + 5 })).toBe('INVALID');
    expect(bad({ grind: 81 })).toBe('INVALID'); expect(bad({ grind: 57.5 })).toBe('INVALID');
    expect(bad({ temperature: 120 })).toBe('INVALID'); expect(bad({ dose: -1 })).toBe('INVALID');
    expect(bad({ pours: [{ ...good.pours[0], volume: -10 }, ...good.pours.slice(1)] })).toBe('INVALID');
    expect(bad({ pours: [] })).toBe('INVALID');
  });
  it('builds a private draft that states it is generated and untested', () => {
    const source = recipe('a');
    const draft = generatedDraft(generateXBloom([source], prefs()), source, 'Guji Hambela', false);
    expect(draft.values).toMatchObject({ method: 'xbloom', visibility: 'private', dose: '15', water: '240', grind: '57', coffee_name: 'Guji Hambela' });
    expect(draft.values.description).toContain('Not tested on your machine');
    expect(draft.brew).toMatchObject({ adapted: true, adapted_from_recipe_id: 'a', poured_water_ml: 240 });
    expect(draft.values.steps.split('\n')).toHaveLength(4);
  });
  it('falls back to a general pool with equal weights and the most typical pour structure', () => {
    const pool = [recipe('a', { grind: 40 }), recipe('b', { grind: 56 }), recipe('typical', { grind: 57, pours: [pour(50, 92, 3, 30), pour(95), pour(95)] }), recipe('c', { grind: 58 }), recipe('d', { grind: 70 }),
      recipe('e', { grind: 57 }), recipe('f', { grind: 57 })];
    const r = generateXBloom(pool, prefs(), '', { general: true });
    expect(r.basis).toBe('general'); expect(r.sourceIds).toHaveLength(7); expect(r.grind).toBe(57);
    expect(['typical', 'e', 'f']).toContain(r.templateId);
    expect(generateXBloom(pool, prefs()).basis).toBe('coffee');
    expect(generateXBloom(pool, prefs()).sourceIds).toHaveLength(5);
  });
  it('estimates ice only for iced drinks, from the gap to the hot ratio, by chosen level', () => {
    const iced = [recipe('i', { serving: 'iced', pours: [pour(40, 92, 3, 30), pour(60), pour(65)] })]; // 165 ml on 15 g = 1:11
    const p = prefs({ serving: 'cold_or_iced', unit: 'dose', amount: '15' });
    const regular = generateXBloom(iced, p, '', { ice: 'regular' });
    expect(regular.water).toBe(165); expect(regular.ice).toBe(75);
    expect(generateXBloom(iced, p, '', { ice: 'light' }).ice).toBe(55);
    expect(generateXBloom(iced, p, '', { ice: 'extra' }).ice).toBe(100);
    expect(generateXBloom(iced, p).ice).toBe(75);
    expect(generateXBloom([recipe('a')], prefs()).ice).toBeNull();
    const draft = generatedDraft(regular, iced[0], 'Guji', false);
    expect(draft.values.description).toContain('about 75 g');
  });
});
