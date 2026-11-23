import type { RecipeItem } from './data';
import type { SourceBrew } from './sourceBrew';
import { compatibleXBloom, type XBloomDraft, type XBloomPreferences } from './xbloomDraft';

/** Where a number came from, so the UI never presents an estimate as sourced. */
export type Provenance = 'published' | 'estimate' | 'preference';
export type XBloomTaste = '' | 'fruity' | 'floral' | 'bright' | 'light' | 'balanced' | 'sweet' | 'chocolate' | 'full';
export type GeneratedPour = { volume: number; temperature: number | null; flow_rate: number | null; pause_seconds: number | null; pattern_code: number | null };
export interface GeneratedXBloom {
  model: 'Studio' | 'Original'; cup: 'Omni' | 'xPod'; serving: 'hot' | 'iced';
  dose: number; water: number; ratio: number; grind: number; temperature: number;
  pours: GeneratedPour[]; seconds: number | null;
  templateId: string; sourceIds: string[];
  /** 'general' when no published recipe matched the coffee itself. */
  basis: 'coffee' | 'general';
  /** Suggested ice in the cup for iced drinks, in grams. Always an estimate. */
  ice: number | null;
  provenance: { grind: Provenance; temperature: Provenance; ratio: Provenance; pours: Provenance; seconds: Provenance };
  tasteShift: { grind: number; temperature: number };
}
export type GeneratorFailure = 'NO_BASIS' | 'AMOUNT' | 'DOSE_RANGE' | 'WATER_RANGE' | 'INVALID';
export class XBloomGeneratorError extends Error { constructor(readonly reason: GeneratorFailure) { super(reason); } }

// Machine limits. Grind steps are documented (80 on both grinders); the dose
// and water windows are the ranges present in the published recipes we hold.
export const XBLOOM_LIMITS = {
  Studio: { dose: [5, 25], grind: [1, 80], temperature: [70, 99] },
  Original: { dose: [15, 25], grind: [1, 80], temperature: [85, 99] },
} as const;
const WATER = [50, 500] as const;
export type IceLevel = 'light' | 'regular' | 'extra';
export type GeneratorOptions = { general?: boolean; ice?: IceLevel };
// Hot recipes in the library sit at a median 1:16 on every machine and dripper,
// iced ones near 1:10; the difference is the water the ice is expected to add.
const HOT_RATIO = 16;
const ICE_FACTOR: Record<IceLevel, number> = { light: 0.7, regular: 1, extra: 1.3 };
const GENERAL_POOL = 30;
const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, [low, high]: readonly [number, number]) => Math.min(high, Math.max(low, value));
const digits = (text: string) => Number(text.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace('٫', '.').trim());

type Basis = { id: string; weight: number; dose: number; water: number; grind: number; temperature: number; pours: NonNullable<SourceBrew['pours']> };
function basis(recipe: RecipeItem, rank: number): Basis | null {
  const brew = recipe.sourceBrew, pours = brew.pours;
  const dose = brew.dose ?? recipe.dose;
  const grind = Number(brew.grind_size ?? recipe.grindSetting);
  if (!pours?.length || pours.length > 9 || pours.some(p => !p.volume || p.volume <= 0) || !dose || dose <= 0
    || !Number.isFinite(grind) || grind < 1 || grind > 80) return null;
  const temperature = pours.find(p => p.temperature !== null)?.temperature;
  if (!temperature) return null;
  const score = recipe.labelMatch?.score ?? recipe.coffeeMatch?.score;
  // Rank decay keeps the closest coffee dominant when no similarity score exists.
  const weight = typeof score === 'number' && score > 0 ? score : 1 / (rank + 1);
  return { id: recipe.id, weight, dose, water: pours.reduce((sum, p) => sum + p.volume!, 0), grind, temperature, pours };
}
/** Weighted median: robust to one unusual recipe, never an average of extremes. */
function weightedMedian(items: { value: number; weight: number }[]): number {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const half = sorted.reduce((sum, item) => sum + item.weight, 0) / 2;
  let running = 0;
  for (const item of sorted) { running += item.weight; if (running >= half) return item.value; }
  return sorted[sorted.length - 1].value;
}
// One small step in a conventional direction; always labelled as a preference.
const TASTE: Record<Exclude<XBloomTaste, ''>, { grind: number; temperature: number }> = {
  fruity: { grind: 1, temperature: -1 }, floral: { grind: 1, temperature: -1 }, bright: { grind: 1, temperature: -1 }, light: { grind: 2, temperature: 0 },
  balanced: { grind: 0, temperature: 0 }, sweet: { grind: 0, temperature: 0 },
  chocolate: { grind: -1, temperature: 1 }, full: { grind: -2, temperature: 0 },
};

export function validateGenerated(recipe: GeneratedXBloom): void {
  const limits = XBLOOM_LIMITS[recipe.model];
  const total = round1(recipe.pours.reduce((sum, pour) => sum + pour.volume, 0));
  const within = (value: number, [low, high]: readonly [number, number]) => Number.isFinite(value) && value >= low && value <= high;
  if (!recipe.pours.length || recipe.pours.length > 9 || recipe.pours.some(p => !Number.isFinite(p.volume) || p.volume <= 0
      || (p.temperature !== null && !within(p.temperature, limits.temperature)) || (p.pause_seconds !== null && p.pause_seconds < 0))
    || Math.abs(total - recipe.water) > 0.05 || !within(recipe.dose, limits.dose) || !within(recipe.water, WATER)
    || !Number.isInteger(recipe.grind) || !within(recipe.grind, limits.grind) || !within(recipe.temperature, limits.temperature)
    || !within(recipe.ratio, [5, 22]) || Math.abs(recipe.ratio - recipe.water / recipe.dose) > 0.06
    || (recipe.seconds !== null && (!Number.isFinite(recipe.seconds) || recipe.seconds <= 0))) throw new XBloomGeneratorError('INVALID');
}

/** Blend the closest published recipes for the selected machine, dripper and
 * serving into one recipe. Deterministic: same inputs, same output. */
export function generateXBloom(matches: RecipeItem[], preferences: XBloomPreferences, taste: XBloomTaste = '', options: GeneratorOptions = {}): GeneratedXBloom {
  const limits = XBLOOM_LIMITS[preferences.model];
  const usable = matches.filter(recipe => compatibleXBloom(recipe, preferences))
    .flatMap((recipe, rank) => basis(recipe, rank) ?? []).slice(0, options.general ? GENERAL_POOL : 5)
    // A general pool has no closest coffee, so every recipe counts the same.
    .map(item => options.general ? { ...item, weight: 1 } : item);
  if (!usable.length) throw new XBloomGeneratorError('NO_BASIS');
  const amount = digits(preferences.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new XBloomGeneratorError('AMOUNT');
  const shift = taste ? TASTE[taste] : { grind: 0, temperature: 0 };
  const baseGrind = Math.round(weightedMedian(usable.map(b => ({ value: b.grind, weight: b.weight }))));
  const baseTemperature = weightedMedian(usable.map(b => ({ value: b.temperature, weight: b.weight })));
  const baseRatio = weightedMedian(usable.map(b => ({ value: b.water / b.dose, weight: b.weight })));
  // Pour structure: the closest coffee's, or for a general pool the most typical recipe's.
  const distance = (b: Basis) => Math.abs(b.water / b.dose - baseRatio) / baseRatio + Math.abs(b.grind - baseGrind) / 80;
  const template = options.general ? usable.reduce((best, item) => distance(item) < distance(best) ? item : best)
    : usable.reduce((best, item) => item.weight > best.weight ? item : best);
  const grind = clamp(baseGrind + shift.grind, limits.grind);
  const temperature = clamp(Math.round(baseTemperature + shift.temperature), limits.temperature);

  let dose = preferences.unit === 'dose' ? round1(amount) : round1(amount / baseRatio);
  if (dose < limits.dose[0] || dose > limits.dose[1]) throw new XBloomGeneratorError('DOSE_RANGE');
  const water = preferences.unit === 'water' ? Math.round(amount) : Math.round(dose * baseRatio);
  if (water < WATER[0] || water > WATER[1]) throw new XBloomGeneratorError('WATER_RANGE');
  if (preferences.unit === 'water') dose = round1(water / baseRatio);

  // Keep the best match's pour structure; scale volumes and re-close the sum.
  const scale = water / template.water;
  const delta = temperature - template.temperature;
  const pours: GeneratedPour[] = template.pours.map(p => ({
    volume: Math.max(1, Math.round(p.volume! * scale)),
    temperature: p.temperature === null ? null : clamp(Math.round(p.temperature + delta), limits.temperature),
    flow_rate: p.flow_rate, pause_seconds: p.pause_seconds, pattern_code: p.pattern_code,
  }));
  pours[pours.length - 1].volume = water - pours.slice(0, -1).reduce((sum, p) => sum + p.volume, 0);
  const timed = pours.every(p => p.flow_rate !== null && p.flow_rate > 0 && p.pause_seconds !== null);
  const seconds = timed ? Math.round(pours.reduce((sum, p) => sum + p.volume / p.flow_rate! + p.pause_seconds!, 0)) : null;
  const iced = preferences.serving !== 'hot';
  const ice = iced ? Math.max(0, Math.round(dose * (HOT_RATIO - water / dose) * ICE_FACTOR[options.ice ?? 'regular'] / 5) * 5) : null;
  const moved = (value: number) => value !== 0 ? 'preference' as const : 'published' as const;
  const result: GeneratedXBloom = {
    model: preferences.model, cup: preferences.cup, serving: iced ? 'iced' : 'hot',
    dose, water, ratio: Math.round(water / dose * 10) / 10, grind, temperature, pours, seconds,
    templateId: template.id, sourceIds: usable.map(b => b.id), basis: options.general ? 'general' : 'coffee', ice,
    provenance: { grind: moved(grind - baseGrind), temperature: moved(temperature - Math.round(baseTemperature)), ratio: 'published',
      pours: Math.abs(scale - 1) < 0.001 && delta === 0 ? 'published' : 'estimate', seconds: 'estimate' },
    tasteShift: { grind: grind - baseGrind, temperature: temperature - Math.round(baseTemperature) },
  };
  validateGenerated(result);
  return result;
}

/** Same shape the member recipe form already saves for adapted xBloom drafts. */
export function generatedDraft(recipe: GeneratedXBloom, template: RecipeItem, coffee: string, ar: boolean): XBloomDraft {
  const steps = recipe.pours.map((p, i) => `${i + 1}. ${p.volume} ml` + (p.temperature !== null ? ` · ${p.temperature}°C` : '')
    + (p.flow_rate !== null ? ` · ${p.flow_rate} ml/s` : '') + (p.pause_seconds !== null ? ` · ${ar ? 'توقف' : 'Pause'} ${p.pause_seconds}s` : '')).join('\n');
  const name = coffee.trim() || template.labelMatch?.label.name || template.coffeeMatch?.coffee.name || template.discovery?.coffeeName || template.title;
  return {
    values: { method: 'xbloom', visibility: 'private', name: `${name} · ${recipe.model}`, coffee_name: name, roaster_name: '',
      dose: String(recipe.dose), water: String(recipe.water), temperature: String(recipe.temperature), seconds: recipe.seconds ? String(recipe.seconds) : '',
      grind: String(recipe.grind), steps, source_url: template.sources[0]?.url ?? '',
      description: `${recipe.model} · ${recipe.cup}\n${ar ? `وصفة مولّدة من أقرب ${recipe.sourceIds.length} وصفات منشورة لنفس الجهاز. لم تُختبر على جهازك؛ عدّلها حسب الطعم.` : `Generated from the ${recipe.sourceIds.length} closest published recipes for the same machine. Not tested on your machine; adjust to taste.`}\n${recipe.ice ? (ar ? `الماء هو ماء الاستخلاص. الثلج في الكوب: حوالي ${recipe.ice} g (تقدير).` : `Water is brew water. Ice in the cup: about ${recipe.ice} g (estimate).`) : (ar ? 'الماء هو ماء الاستخلاص ولا يشمل الثلج.' : 'Water is brew water and excludes ice.')}` },
    brew: { ...template.sourceBrew, model: recipe.model, cup_type: recipe.cup, dose: recipe.dose, water_ml: recipe.water, poured_water_ml: recipe.water,
      ratio: recipe.water / recipe.dose, grind_size: recipe.grind,
      pours: recipe.pours.map((p, i) => ({ ...template.sourceBrew.pours![i], ...p })),
      adapted: true, adapted_from_recipe_id: template.id, discovery: { serving_style: recipe.serving } },
  };
}
