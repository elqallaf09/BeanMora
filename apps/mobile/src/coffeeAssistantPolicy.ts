import { CoffeeAssistantError, shouldUseRemoteAssistant, type AssistantFailure, type CoffeeAssistantTurn } from './coffeeAssistantRemote';
import type { LocalAssistantTurn } from './core/local-coffee-assistant';
import { withDeadline } from './requestDeadline';

export interface AssistantPreference { optedOut: boolean; creditPaused: boolean; retryAt: number }
export interface PreferenceStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const defaultAssistantPreference = (): AssistantPreference => ({ optedOut: false, creditPaused: false, retryAt: 0 });
const memory = new Map<string, AssistantPreference>();
const writes = new Map<string, Promise<void>>();
export const assistantPreferenceKey = (scope: string, userId: string) => `beanmora:coffee-assistant:v2:${scope}:${userId}`;

/** No token or conversation content is persisted with this per-account choice. */
export async function readAssistantPreference(storage: PreferenceStorage, key: string): Promise<AssistantPreference> {
  const current = memory.get(key);
  if (current) return { ...current };
  let preference = defaultAssistantPreference();
  try {
    const raw = await withDeadline(() => storage.getItem(key), { timeoutMs: 1500 });
    const saved = raw && raw.length < 1000 ? JSON.parse(raw) : null;
    if (saved?.version === 1 && typeof saved.optedOut === 'boolean' && typeof saved.creditPaused === 'boolean') {
      preference = { optedOut: saved.optedOut, creditPaused: saved.creditPaused, retryAt: typeof saved.retryAt === 'number' && Number.isFinite(saved.retryAt) && saved.retryAt > 0 ? saved.retryAt : 0 };
    }
  } catch {
    // A failed read must not silently undo a previously saved opt-out. The
    // user can explicitly enable AI while storage recovers.
    preference = { ...preference, optedOut: true };
  }
  // A manual toggle can arrive while a slow storage read is pending.
  const latest = memory.get(key) ?? preference;
  memory.set(key, latest);
  return { ...latest };
}

export async function saveAssistantPreference(storage: PreferenceStorage, key: string, preference: AssistantPreference): Promise<void> {
  memory.set(key, { ...preference });
  const write = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(() =>
    storage.setItem(key, JSON.stringify({ version: 1, ...preference }))).catch(() => {});
  writes.set(key, write);
  void write.finally(() => { if (writes.get(key) === write) writes.delete(key); });
  // Keep the underlying writes ordered even when a native write outlives our
  // UI deadline, so an older toggle cannot overwrite the most recent choice.
  await withDeadline(() => write, { timeoutMs: 1500 }).catch(() => {});
}

export function canUseAssistant(preference: AssistantPreference, now = Date.now()): boolean {
  return !preference.optedOut && !preference.creditPaused && now >= preference.retryAt;
}
function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) { const error = new Error('Request cancelled'); error.name = 'AbortError'; throw error; }
}

/** One remote answer before any catalog request. The offline draft classifies
 * quantities/filters only; paid failures have no automatic paid retry. */
export async function resolveCoffeeAnswer(options: {
  draft: LocalAssistantTurn;
  available: boolean;
  preference: AssistantPreference;
  remote: () => Promise<CoffeeAssistantTurn | null>;
  local: () => Promise<LocalAssistantTurn>;
  signal?: AbortSignal;
  now?: () => number;
  onFallback?: (reason: AssistantFailure, preference: AssistantPreference) => void;
}): Promise<CoffeeAssistantTurn> {
  checkCancelled(options.signal);
  const now = options.now ?? Date.now;
  if (options.available && canUseAssistant(options.preference, now()) && shouldUseRemoteAssistant(options.draft)) {
    try {
      const remote = await options.remote();
      checkCancelled(options.signal);
      if (remote) return remote;
      throw new CoffeeAssistantError('unavailable');
    } catch (error) {
      checkCancelled(options.signal);
      if (error instanceof Error && error.name === 'AbortError') throw error;
      const failure = error instanceof CoffeeAssistantError ? error : new CoffeeAssistantError('unavailable', 30000);
      const preference = { ...options.preference };
      if (failure.reason === 'credits') preference.creditPaused = true;
      else preference.retryAt = now() + (failure.reason === 'rate' ? failure.retryAfterMs : 30000);
      options.onFallback?.(failure.reason, preference);
    }
  }
  checkCancelled(options.signal);
  const local = await options.local();
  checkCancelled(options.signal);
  return local;
}
