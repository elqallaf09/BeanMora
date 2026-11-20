import { CoffeeAssistantError, shouldUseRemoteAssistant, type AssistantFailure, type CoffeeAssistantTurn } from './coffeeAssistantRemote';
import type { LocalAssistantTurn } from './core/local-coffee-assistant';
import { withDeadline } from './requestDeadline';

export interface AssistantPreference { optedOut: boolean; creditPaused: boolean; retryAt: number }
export interface PreferenceStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const CREDIT_RETRY_MS = 5 * 60 * 1000;
export const defaultAssistantPreference = (): AssistantPreference => ({ optedOut: false, creditPaused: false, retryAt: 0 });
const memory = new Map<string, AssistantPreference>();
const writes = new Map<string, Promise<void>>();
export const assistantPreferenceKey = (scope: string, userId: string) => `beanmora:coffee-assistant:v2:${scope}:${userId}`;

/** No token or conversation content is persisted with this per-account choice. */
export async function readAssistantPreference(storage: PreferenceStorage, key: string): Promise<AssistantPreference> {
  const current = memory.get(key);
  if (current) return { ...current };
  let preference = defaultAssistantPreference();
  let readFailed = false;
  try {
    const raw = await withDeadline(() => storage.getItem(key), { timeoutMs: 1500 });
    const saved = raw && raw.length < 1000 ? JSON.parse(raw) : null;
    if (saved?.version === 1 && typeof saved.optedOut === 'boolean' && typeof saved.creditPaused === 'boolean') {
      preference = { optedOut: saved.optedOut, creditPaused: saved.creditPaused, retryAt: typeof saved.retryAt === 'number' && Number.isFinite(saved.retryAt) && saved.retryAt > 0 ? saved.retryAt : 0 };
    }
  } catch {
    // Fail closed for this question without caching a transient storage error.
    // A later question can read the preserved privacy choice again.
    readFailed = true;
    preference = { ...preference, optedOut: true };
  }
  // A manual toggle can arrive while a slow storage read is pending.
  const latest = memory.get(key) ?? preference;
  if (!readFailed || memory.has(key)) memory.set(key, latest);
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

/** Request outcomes must not overwrite a privacy choice changed in Settings. */
export async function saveAssistantAvailability(storage: PreferenceStorage, key: string, preference: AssistantPreference): Promise<void> {
  const latest = memory.get(key);
  await saveAssistantPreference(storage, key, { ...preference, optedOut: latest?.optedOut ?? preference.optedOut });
}

export function canUseAssistant(preference: AssistantPreference, now = Date.now()): boolean {
  // Older versions saved an indefinite credit pause without a deadline. It is
  // eligible for one new, user-triggered attempt; new failures use a cooldown.
  return !preference.optedOut && now >= preference.retryAt;
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
  onRecovered?: (preference: AssistantPreference) => void;
}): Promise<CoffeeAssistantTurn> {
  checkCancelled(options.signal);
  const now = options.now ?? Date.now;
  if (options.available && canUseAssistant(options.preference, now()) && shouldUseRemoteAssistant(options.draft)) {
    try {
      const remote = await options.remote();
      checkCancelled(options.signal);
      options.onRecovered?.({ ...options.preference, creditPaused: false, retryAt: 0 });
      if (remote) return remote;
      // A valid catalog-only response asks for the local guide without a
      // connection error, penalty, or a second model call.
    } catch (error) {
      checkCancelled(options.signal);
      if (error instanceof Error && error.name === 'AbortError') throw error;
      const failure = error instanceof CoffeeAssistantError ? error : new CoffeeAssistantError('unavailable', 30000);
      const preference = { ...options.preference };
      preference.creditPaused = failure.reason === 'credits';
      preference.retryAt = now() + (failure.reason === 'credits' ? CREDIT_RETRY_MS : failure.reason === 'rate' ? failure.retryAfterMs : 30000);
      options.onFallback?.(failure.reason, preference);
    }
  }
  checkCancelled(options.signal);
  const local = await options.local();
  checkCancelled(options.signal);
  return local;
}
