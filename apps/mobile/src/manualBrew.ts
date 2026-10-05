import type { RecipeItem } from './data';

export interface RoastAgeYield {
  roast_age_min_days: number;
  /** null means the source explicitly leaves the final age window open-ended. */
  roast_age_max_days: number | null;
  yield_grams: number;
  is_peak: boolean;
}
export interface ManualBrew {
  applies_to_coffee_names?: string[];
  dose_min_grams?: number;
  dose_max_grams?: number;
  yield_grams?: number;
  yield_min_grams?: number;
  yield_max_grams?: number;
  yield_ml?: number;
  yield_min_ml?: number;
  yield_max_ml?: number;
  yield_by_roast_age?: RoastAgeYield[];
  peak_age_min_days?: number;
  peak_age_max_days?: number;
  best_roast_age_min_days?: number;
  best_roast_age_max_days?: number;
  scalar_yield_basis?: string;
  scalar_yield_basis_ar?: string;
  yield_scope?: string;
  yield_scope_ar?: string;
  water_min_grams?: number;
  water_max_grams?: number;
  water_min_ml?: number;
  water_max_ml?: number;
  ice_grams?: number;
  ice_min_grams?: number;
  ice_max_grams?: number;
  milk_grams?: number;
  milk_min_grams?: number;
  milk_max_grams?: number;
  milk_grams_per_single_shot?: number;
  milk_weight_scope?: string;
  milk_weight_scope_ar?: string;
  bloom_temperature_c?: number;
  main_temperature_c?: number;
  temperature_min_c?: number;
  temperature_max_c?: number;
  bypass_water_grams?: number;
  pressure_bar?: number;
  equipment?: string;
  basket?: string;
  filter?: string;
  source_ratio_text?: string;
  yield_derived_from_ratio?: boolean;
  parameter_only_source?: boolean;
  time_min_seconds?: number;
  time_max_seconds?: number;
  time_note?: string;
  time_note_ar?: string;
  example_pours?: boolean;
  dilution_pour_numbers?: number[];
  model?: string;
  model_ar?: string;
  water_note?: string;
  water_note_ar?: string;
  temperature_note?: string;
  temperature_note_ar?: string;
  grind_ar?: string;
  heat?: string;
  heat_ar?: string;
  timer_start?: string;
  timer_start_ar?: string;
  pour_note?: string;
  pour_note_ar?: string;
  notes?: string;
  notes_ar?: string;
  scalable?: boolean;
}
export interface ManualPour { number: number; grams: number; at: number | null; bloom: boolean }
const isAge = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3650;
const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 20000;
export function manualBrew(value: unknown): ManualBrew | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const row = value as Record<string, unknown>;
  const result: ManualBrew = {};
  if (Array.isArray(row.applies_to_coffee_names)) result.applies_to_coffee_names = row.applies_to_coffee_names.filter((v): v is string => typeof v === 'string' && !!v.trim()).map(v => v.trim().slice(0, 160)).slice(0, 20);
  for (const key of ['dose_min_grams', 'dose_max_grams', 'time_min_seconds', 'time_max_seconds', 'yield_grams', 'yield_min_grams', 'yield_max_grams', 'yield_ml', 'yield_min_ml', 'yield_max_ml', 'water_min_grams', 'water_max_grams', 'water_min_ml', 'water_max_ml', 'ice_grams', 'ice_min_grams', 'ice_max_grams', 'milk_grams', 'milk_min_grams', 'milk_max_grams', 'milk_grams_per_single_shot', 'bypass_water_grams', 'pressure_bar'] as const) {
    const n = row[key];
    const limit = key.startsWith('dose') ? 1000 : key.startsWith('time') ? 172800 : key === 'pressure_bar' ? 20 : 20000;
    if (typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= limit) result[key] = n;
  }
  for (const key of ['peak_age_min_days', 'peak_age_max_days', 'best_roast_age_min_days', 'best_roast_age_max_days'] as const) {
    if (isAge(row[key])) result[key] = row[key];
  }
  for (const key of ['bloom_temperature_c', 'main_temperature_c', 'temperature_min_c', 'temperature_max_c'] as const) {
    const n = row[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 150) result[key] = n;
  }
  for (const pair of [['dose_min_grams', 'dose_max_grams'], ['time_min_seconds', 'time_max_seconds'], ['yield_min_grams', 'yield_max_grams'], ['yield_min_ml', 'yield_max_ml'], ['water_min_grams', 'water_max_grams'], ['water_min_ml', 'water_max_ml'], ['ice_min_grams', 'ice_max_grams'], ['milk_min_grams', 'milk_max_grams'], ['peak_age_min_days', 'peak_age_max_days'], ['best_roast_age_min_days', 'best_roast_age_max_days'], ['temperature_min_c', 'temperature_max_c']] as const) {
    const [min, max] = pair;
    if (result[min] === undefined || result[max] === undefined || result[min]! > result[max]!) { delete result[min]; delete result[max]; }
  }
  if (Array.isArray(row.yield_by_roast_age)) {
    const schedule: RoastAgeYield[] = [];
    for (const item of row.yield_by_roast_age.slice(0, 20)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const age = item as Record<string, unknown>;
      if (!isAge(age.roast_age_min_days) || !isAmount(age.yield_grams) || typeof age.is_peak !== 'boolean') continue;
      const max = age.roast_age_max_days;
      // A missing upper bound is not evidence of an open-ended source range.
      if (max !== null && (!isAge(max) || max < age.roast_age_min_days)) continue;
      schedule.push({ roast_age_min_days: age.roast_age_min_days, roast_age_max_days: max, yield_grams: age.yield_grams, is_peak: age.is_peak });
    }
    if (schedule.length) result.yield_by_roast_age = schedule;
  }
  for (const key of ['model', 'model_ar', 'water_note', 'water_note_ar', 'temperature_note', 'temperature_note_ar', 'grind_ar', 'heat', 'heat_ar', 'timer_start', 'timer_start_ar', 'pour_note', 'pour_note_ar', 'time_note', 'time_note_ar', 'equipment', 'basket', 'filter', 'source_ratio_text', 'yield_scope', 'yield_scope_ar', 'milk_weight_scope', 'milk_weight_scope_ar', 'scalar_yield_basis', 'scalar_yield_basis_ar', 'notes', 'notes_ar'] as const) {
    const text = row[key];
    if (typeof text === 'string' && text.trim()) result[key] = text.trim().slice(0, key.startsWith('notes') ? 1200 : 300);
  }
  if (row.scalable === true) result.scalable = true;
  if (row.example_pours === true) result.example_pours = true;
  if (row.yield_derived_from_ratio === true) result.yield_derived_from_ratio = true;
  if (row.parameter_only_source === true) result.parameter_only_source = true;
  if (Array.isArray(row.dilution_pour_numbers)) result.dilution_pour_numbers = row.dilution_pour_numbers.filter(n => Number.isInteger(n) && n > 0 && n <= 20).slice(0, 20);
  return Object.keys(result).length ? result : undefined;
}
export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
// Keep Latin-unit quantities together inside Arabic titles, without changing stored content.
export const recipeTitle = (title: string, ar: boolean) => ar ? title.replace(/(\d+(?:[.:–]\d+)*\s*(?:g|ml)\b(?:\s*\/\s*\d+(?:[.:–]\d+)*\s*(?:g|ml)\b)?)/g, '\u2066$1\u2069') : title;
export function doseLabel(recipe: RecipeItem): string {
  const m = recipe.sourceBrew.manual;
  if (m?.dose_min_grams && m.dose_max_grams) return `${m.dose_min_grams}–${m.dose_max_grams} g`;
  return recipe.dose ? `${recipe.dose} g` : '—';
}
export function roastAgeLabel(min: number, max: number | null, ar = false): string {
  if (max === null) return ar ? `من اليوم ${min} فصاعداً` : `Day ${min} onward`;
  return ar ? `اليوم ${min}–${max}` : `Days ${min}–${max}`;
}
/** Espresso output is a separate measurement from filter brewing water. */
export function waterLabel(recipe: RecipeItem, ar = false): string {
  const m = recipe.sourceBrew.manual;
  if (recipe.method === 'espresso') {
    const calculated = m?.yield_derived_from_ratio ? ar ? ' (محسوب)' : ' (calculated)' : '';
    const peak = m?.peak_age_min_days !== undefined && m.peak_age_max_days !== undefined
      ? ar ? ` · الذروة (${roastAgeLabel(m.peak_age_min_days, m.peak_age_max_days, true)} بعد التحميص)` : ` · peak (${roastAgeLabel(m.peak_age_min_days, m.peak_age_max_days)} after roast)`
      : m?.yield_by_roast_age?.length ? ar ? ' · يتغير حسب عمر التحميص' : ' · varies with roast age' : '';
    if (m?.yield_min_grams && m.yield_max_grams) return `${m.yield_min_grams}–${m.yield_max_grams} g${calculated}${peak}`;
    if (m?.yield_grams) return `${m.yield_grams} g${calculated}${peak}`;
    if (m?.yield_min_ml && m.yield_max_ml) return `${m.yield_min_ml}–${m.yield_max_ml} ml${calculated}${peak}`;
    if (m?.yield_ml) return `${m.yield_ml} ml${calculated}${peak}`;
    return '—';
  }
  if (m?.water_min_grams && m.water_max_grams) return `${m.water_min_grams}–${m.water_max_grams} g`;
  if (m?.water_min_ml && m.water_max_ml) return `${m.water_min_ml}–${m.water_max_ml} ml`;
  return recipe.water ? `${recipe.water} ${recipe.waterUnit}` : (ar ? m?.water_note_ar || m?.water_note : m?.water_note) || '—';
}
export function temperatureLabel(recipe: RecipeItem, ar = false): string {
  const m = recipe.sourceBrew.manual;
  if (m?.bloom_temperature_c !== undefined || m?.main_temperature_c !== undefined) return [
    m.bloom_temperature_c !== undefined ? `${m.bloom_temperature_c}°C ${ar ? 'للتزهير' : 'bloom'}` : null,
    m.main_temperature_c !== undefined ? `${m.main_temperature_c}°C ${ar ? 'للصبات التالية' : 'main pours'}` : null,
  ].filter(Boolean).join(' · ');
  if (recipe.temperatureMin != null && recipe.temperatureMax != null) return `${recipe.temperatureMin}–${recipe.temperatureMax}°C`;
  if (m?.temperature_min_c !== undefined && m.temperature_max_c !== undefined) return `${m.temperature_min_c}–${m.temperature_max_c}°C`;
  const temperature = recipe.temperature ?? recipe.xBloom?.temp;
  if (temperature !== null && temperature !== undefined) return `${temperature}°C`;
  const pourTemperatures = recipe.sourceBrew.pours?.flatMap(p => p.temperature != null && p.temperature > 0 ? [p.temperature] : []) ?? [];
  if (pourTemperatures.length) {
    const min = Math.min(...pourTemperatures), max = Math.max(...pourTemperatures);
    return `${min === max ? min : `${min}–${max}`}°C${ar ? ' حسب الصبات' : ' across pours'}`;
  }
  return (ar ? m?.temperature_note_ar || m?.temperature_note : m?.temperature_note) || '—';
}
export interface ManualRecipeFact { key: string; label: string; value: string; note?: string }
/** Supplemental amounts retain their published units and scope; they are never added to brew water. */
export function manualRecipeFacts(recipe: RecipeItem, ar = false): ManualRecipeFact[] {
  const m = recipe.sourceBrew.manual;
  const facts: ManualRecipeFact[] = [];
  const add = (key: string, label: string, value: string | undefined, note?: string) => {
    if (value) facts.push({ key, label, value, ...(note ? { note } : {}) });
  };
  if (recipe.method !== 'espresso' && recipe.dose && recipe.waterUnit === 'g' && recipe.water) add('ratio', ar ? 'نسبة البن إلى ماء التحضير' : 'Coffee to brew water', `1:${Math.round(recipe.water / recipe.dose * 100) / 100}`);
  if (!m) return facts;
  add('source-ratio', ar ? 'نسبة المصدر' : 'Source ratio', m.source_ratio_text);
  add('model', ar ? 'الأداة أو الموديل' : 'Brewer or model', (ar ? m.model_ar || m.model : m.model) || m.equipment);
  add('basket', ar ? 'السلة' : 'Basket', m.basket);
  add('filter', ar ? 'الفلتر' : 'Filter', m.filter);
  if (m.pressure_bar) add('pressure', ar ? 'الضغط' : 'Pressure', `${m.pressure_bar} bar`);
  const ice = m.ice_min_grams && m.ice_max_grams ? `${m.ice_min_grams}–${m.ice_max_grams} g` : m.ice_grams ? `${m.ice_grams} g` : undefined;
  add('ice', ar ? 'الثلج' : 'Ice', ice);
  if (m.bypass_water_grams) add('bypass', ar ? 'ماء التخفيف' : 'Dilution water', `${m.bypass_water_grams} g`);
  const milk = m.milk_min_grams && m.milk_max_grams ? `${m.milk_min_grams}–${m.milk_max_grams} g` : m.milk_grams ? `${m.milk_grams} g` : undefined;
  const milkScope = ar ? m.milk_weight_scope_ar || m.milk_weight_scope : m.milk_weight_scope;
  add('milk', ar ? 'الحليب' : 'Milk', milk, milkScope);
  if (!milk && milkScope) add('milk-scope', ar ? 'توضيح كمية الحليب' : 'Milk amount scope', milkScope);
  if (m.milk_grams_per_single_shot) add('milk-single-shot', ar ? 'الحليب لكل شوت إسبريسو منفرد' : 'Milk per single espresso shot', `${m.milk_grams_per_single_shot} g`, ar ? 'كمية الحليب مستقلة عن ناتج الإسبريسو المنشور.' : 'Milk is separate from the published espresso output.');
  add('yield-scope', ar ? 'ما يشمله ناتج الإسبريسو' : 'Espresso output scope', ar ? m.yield_scope_ar || m.yield_scope : m.yield_scope);
  if (m.bloom_temperature_c !== undefined) add('bloom-temperature', ar ? 'حرارة ماء التزهير' : 'Bloom water temperature', `${m.bloom_temperature_c}°C`);
  if (m.main_temperature_c !== undefined) add('main-temperature', ar ? 'حرارة ماء الصبات التالية' : 'Main-pour water temperature', `${m.main_temperature_c}°C`);
  if (m.best_roast_age_min_days !== undefined && m.best_roast_age_max_days !== undefined) add('best-roast-age', ar ? 'عمر البن الموصى به بعد التحميص' : 'Recommended age after roasting', roastAgeLabel(m.best_roast_age_min_days, m.best_roast_age_max_days, ar));
  add('heat', ar ? 'النار' : 'Heat', ar ? m.heat_ar || m.heat : m.heat);
  add('notes', ar ? 'ملاحظات المصدر' : 'Source notes', ar ? m.notes_ar || m.notes : m.notes);
  return facts;
}
export function timeLabel(recipe: RecipeItem, ar = false): string {
  const m = recipe.sourceBrew.manual;
  if (m?.time_min_seconds && m.time_max_seconds) return `${formatTime(m.time_min_seconds)}–${formatTime(m.time_max_seconds)}`;
  if (m?.time_note) return (ar ? m.time_note_ar || m.time_note : m.time_note);
  return recipe.seconds ? formatTime(recipe.seconds) : '—';
}
export function scaledPours(pours: ManualPour[], factor = 1) {
  let total = 0; let previous = 0;
  return pours.map(p => {
    total += p.grams * factor;
    const cumulative = Math.round(total * 10) / 10;
    const grams = Math.round((cumulative - previous) * 10) / 10;
    previous = cumulative;
    return { ...p, grams, cumulative };
  });
}
// A calculator is an adaptation, not an exact source recipe or a vessel capacity guarantee.
export function scaleChemex(recipe: RecipeItem, input: number | null): number | null {
  if (recipe.method !== 'chemex' || !recipe.sourceBrew.manual?.scalable || !recipe.dose || !recipe.water || recipe.waterUnit !== 'g') return null;
  if (input === null || !Number.isFinite(input) || input < 10 || input > recipe.dose) return null;
  return input / recipe.dose;
}
export type BrewClock = { mode: 'idle' | 'running' | 'paused' | 'finished'; accumulatedMs: number; startedAt: number | null };
export const emptyClock = (): BrewClock => ({ mode: 'idle', accumulatedMs: 0, startedAt: null });
export const elapsedMs = (clock: BrewClock, now: number) => clock.accumulatedMs + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt));
export function updateClock(clock: BrewClock, action: 'start' | 'pause' | 'finish' | 'reset', now: number): BrewClock {
  if (action === 'reset') return emptyClock();
  if (action === 'start' && (clock.mode === 'idle' || clock.mode === 'paused')) return { ...clock, mode: 'running', startedAt: now };
  if (action === 'pause' && clock.mode === 'running') return { mode: 'paused', accumulatedMs: elapsedMs(clock, now), startedAt: null };
  if (action === 'finish' && (clock.mode === 'running' || clock.mode === 'paused')) return { mode: 'finished', accumulatedMs: elapsedMs(clock, now), startedAt: null };
  return clock;
}
