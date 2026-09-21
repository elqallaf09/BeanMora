/** Self-reported brew evidence; never infer an outcome from a timer or a save. */
export const METHODS = ['v60', 'espresso', 'xbloom', 'aeropress', 'chemex', 'french_press', 'cold_brew', 'moka_pot'] as const;
export const OUTCOMES = ['excellent', 'good', 'needs_adjustment', 'poor'] as const;
export const STATUSES = ['brewed_as_written', 'brewed_with_modifications'] as const;
export const TASTES = ['acidity', 'bitterness', 'sweetness', 'balance', 'overall_rating'] as const;
export type Method = typeof METHODS[number];
export type Outcome = typeof OUTCOMES[number];
export interface BrewOutcome {
  recipe_id: string | null;
  bean_id: string | null;
  brew_method: Method;
  dose_grams: number;
  water_grams: number;
  actual_time_seconds: number | null;
  outcome: Outcome;
  status: typeof STATUSES[number];
  share_with_community: boolean;
  next_grind_adjustment: 'finer' | 'same' | 'coarser' | null;
  taste_scores: Partial<Record<typeof TASTES[number], number>>;
  brewed: true;
}
export type SaveError = 'invalid' | 'auth' | 'unavailable' | 'retry' | 'conflict';
export type SaveResult = { ok: true; id: string } | { ok: false; error: SaveError };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max && Math.abs(v * 100 - Math.round(v * 100)) < 1e-7;
export function parseOutcome(input: unknown): BrewOutcome | null {
  if (!object(input)) return null;
  const keys = ['recipe_id','bean_id','brew_method','dose_grams','water_grams','actual_time_seconds','outcome','status','share_with_community','next_grind_adjustment','taste_scores','brewed'];
  if (Object.keys(input).length !== keys.length || Object.keys(input).some(k => !keys.includes(k))) return null;
  if ((input.recipe_id !== null && !isUuid(input.recipe_id)) || (input.bean_id !== null && !isUuid(input.bean_id))) return null;
  if (!(METHODS as readonly unknown[]).includes(input.brew_method) || !(OUTCOMES as readonly unknown[]).includes(input.outcome) || !(STATUSES as readonly unknown[]).includes(input.status)) return null;
  if (!finite(input.dose_grams, 9999.99) || !finite(input.water_grams, 99999.99)) return null;
  if (input.actual_time_seconds !== null && (!Number.isInteger(input.actual_time_seconds) || (input.actual_time_seconds as number) <= 0 || (input.actual_time_seconds as number) > 604800)) return null;
  if (input.brewed !== true || typeof input.share_with_community !== 'boolean' || (!input.recipe_id && input.share_with_community)) return null;
  if (![null, 'finer', 'same', 'coarser'].includes(input.next_grind_adjustment as string | null)) return null;
  if (!object(input.taste_scores) || Object.entries(input.taste_scores).some(([key, v]) => !(TASTES as readonly string[]).includes(key) || !Number.isInteger(v) || (v as number) < 1 || (v as number) > 5)) return null;
  return input as unknown as BrewOutcome;
}
export function outcomeError(error: unknown): SaveError {
  if (!object(error)) return 'retry';
  if (error.message === 'BREW_AUTH_REQUIRED' || error.code === '42501') return 'auth';
  if (error.message === 'BREW_INVALID_INPUT') return 'invalid';
  if (error.message === 'BREW_REQUEST_CONFLICT') return 'conflict';
  if (error.code === 'PGRST202' || error.message === 'BREW_RECIPE_UNAVAILABLE') return 'unavailable';
  return 'retry';
}
export interface OutcomeTransport {
  rpc(name: 'record_brew_outcome_v1', args: { p_request_id: string; p_payload: BrewOutcome }): PromiseLike<{ data: unknown; error: unknown }>;
}
export async function saveOutcome(transport: OutcomeTransport, requestId: string, input: unknown): Promise<SaveResult> {
  const payload = parseOutcome(input);
  if (!isUuid(requestId) || !payload) return { ok: false, error: 'invalid' };
  try {
    const { data, error } = await transport.rpc('record_brew_outcome_v1', { p_request_id: requestId, p_payload: payload });
    if (error) return { ok: false, error: outcomeError(error) };
    if (data !== requestId) return { ok: false, error: 'retry' };
    return { ok: true, id: requestId };
  } catch { return { ok: false, error: 'retry' }; }
}
