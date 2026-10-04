import type { RecipeItem } from './data';

export interface ManualBrew {
  dose_min_grams?: number;
  dose_max_grams?: number;
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
  scalable?: boolean;
}
export interface ManualPour { number: number; grams: number; at: number | null; bloom: boolean }
export function manualBrew(value: unknown): ManualBrew | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const row = value as Record<string, unknown>;
  const result: ManualBrew = {};
  for (const key of ['dose_min_grams', 'dose_max_grams', 'time_min_seconds', 'time_max_seconds'] as const) {
    const n = row[key];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= (key.startsWith('dose') ? 200 : 3600)) result[key] = n;
  }
  for (const pair of [['dose_min_grams', 'dose_max_grams'], ['time_min_seconds', 'time_max_seconds']] as const) {
    const [min, max] = pair;
    if (!result[min] || !result[max] || result[min]! > result[max]!) { delete result[min]; delete result[max]; }
  }
  for (const key of ['model', 'model_ar', 'water_note', 'water_note_ar', 'temperature_note', 'temperature_note_ar', 'grind_ar', 'heat', 'heat_ar', 'timer_start', 'timer_start_ar', 'pour_note', 'pour_note_ar', 'time_note', 'time_note_ar'] as const) {
    if (typeof row[key] === 'string') result[key] = row[key].trim().slice(0, 300);
  }
  if (row.scalable === true) result.scalable = true;
  if (row.example_pours === true) result.example_pours = true;
  if (Array.isArray(row.dilution_pour_numbers)) result.dilution_pour_numbers = row.dilution_pour_numbers.filter(n => Number.isInteger(n) && n > 0 && n <= 20).slice(0, 20);
  return Object.keys(result).length ? result : undefined;
}
export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export function doseLabel(recipe: RecipeItem): string {
  const m = recipe.sourceBrew.manual;
  if (m?.dose_min_grams && m.dose_max_grams) return `${m.dose_min_grams}–${m.dose_max_grams} g`;
  return recipe.dose ? `${recipe.dose} g` : '—';
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
