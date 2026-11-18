// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CoffeeAssistantError, coffeeAssistantAvailable, converseRemotely, shouldUseRemoteAssistant } from '../../apps/mobile/src/coffeeAssistantRemote';
import { assistantPreferenceKey, canUseAssistant, defaultAssistantPreference, readAssistantPreference, resolveCoffeeAnswer, saveAssistantPreference } from '../../apps/mobile/src/coffeeAssistantPolicy';
import { converseLocally, type LocalAssistantTurn } from './local-coffee-assistant';

const query = { kind: null, category: null, methods: [], terms: [], amount: null, currency: null, clarification: null };
const local: LocalAssistantTurn = { question: 'Compare coffee options', answer: 'Local answer', mode: 'local', intent: 'help', query, matches: [] };
const options = { url: 'https://mobilefixture.supabase.co', publicKey: 'public-test', accessToken: 'user-token' };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const ai = { ...local, mode: 'ai' as const, answer: 'Grounded AI answer' };
const offline = { search: async () => ({ documents: [], rates: [] }) };

function storage() {
  const values = new Map<string, string>();
  return { getItem: vi.fn(async (key: string) => values.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }) };
}

describe('grounded remote coffee expert', () => {
  it('requires authenticated availability and the version 2 brewing contract', async () => {
    for (const version of [undefined, 1]) expect(await coffeeAssistantAvailable({ ...options, fetcher: async () => json({ api_contract: version, conversation_enabled: true, authentication_required: true }) })).toBe(false);
    expect(await coffeeAssistantAvailable({ ...options, fetcher: async () => json({ api_contract: 2, conversation_enabled: false, authentication_required: true }) })).toBe(false);
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer user-token' });
      return json({ api_contract: 2, conversation_enabled: true, authentication_required: true });
    });
    expect(await coffeeAssistantAvailable({ ...options, fetcher })).toBe(true);
    fetcher.mockClear();
    expect(await coffeeAssistantAvailable({ ...options, accessToken: '', fetcher })).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('routes knowledge and brew advice remotely while preserving exact calculations and measurements', async () => {
    for (const question of ['My V60 tastes sour', 'What is anaerobic processing?', 'شلون أضبط القهوة جم بار؟']) {
      const answer = await converseLocally(question, 'en', [], offline);
      expect(shouldUseRemoteAssistant(answer), question).toBe(true);
    }
    const calculation = await converseLocally('Calculate 18 g at 1:16', 'en', [], offline);
    expect(shouldUseRemoteAssistant(calculation)).toBe(false);
    const measured = await converseLocally('My espresso is sour, dose 18 g, yield 36 g, 30 seconds', 'en', [], offline);
    expect(measured.coach?.dose).toBe(18);
    expect(shouldUseRemoteAssistant(measured)).toBe(false);
    const fetcher = vi.fn();
    expect(await converseRemotely(calculation, [], 'en', { ...options, fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { query: { ...query, servingStyle: 'cold' as const } },
    { query: { ...query, minAmount: 100, amount: 300, currency: 'KWD' as const } },
    { query: { ...query, purchaseIntent: true } },
    { query: { ...query, noteTerms: ['coconut'] } },
    { recipeAlternative: true },
    { equipmentAdvice: 'unverified-price' as const },
  ])('preserves advanced catalog filters', extra => {
    expect(shouldUseRemoteAssistant({ ...local, ...extra })).toBe(false);
  });
  it('sends original language questions and UUID references without client facts or answers', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ question: 'Comment régler mon espresso ?', locale: 'fr', history: [{ question: local.question, resultIds: [] }] });
      expect(String(init?.body)).not.toContain('Local answer');
      return json({ mode: 'ai', answer: 'Réponse vérifiée', query, matches: [] });
    });
    expect(await converseRemotely(local, [local], 'fr', { ...options, question: 'Comment régler mon espresso ?', fetcher })).toMatchObject({ mode: 'ai', answer: 'Réponse vérifiée' });
  });
  it('uses only response provenance, never inherited local lesson sources', async () => {
    const result = await converseRemotely({ ...local, intent: 'knowledge', knowledgeTopic: 'espresso-pressure-bar', sources: [{ title: 'Local-only source', url: 'https://example.com/local' }], suggestions: ['Local suggestion'] }, [], 'en', {
      ...options, fetcher: async () => json({ mode: 'ai', answer: 'Grounded explanation', query, matches: [], sources: [{ title: 'Reviewed server source', url: 'https://example.com/server' }, { title: 'Bad', url: 'javascript:alert(1)' }] }),
    });
    expect(result?.sources).toEqual([{ title: 'Reviewed server source', url: 'https://example.com/server' }]);
    expect(result?.suggestions).toBeUndefined();
  });
  it.each(['CREDIT_BALANCE_EXHAUSTED', 'credit_balance_exhausted', 'insufficient_quota', 'USAGE_LIMIT_REACHED'])('distinguishes a balance or allowance failure: %s', async error => {
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({ error }, 429) })).rejects.toMatchObject({ reason: 'credits' });
  });
  it('does not interpret generic 429, network errors, or 503 as exhausted credit', async () => {
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({ error: 'RATE_LIMITED' }, 429, { 'Retry-After': '90' }) })).rejects.toMatchObject({ reason: 'rate', retryAfterMs: 90000 });
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({}, 429) })).rejects.toMatchObject({ reason: 'rate' });
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({}, 503) })).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({}, 401) })).rejects.toMatchObject({ reason: 'signin' });
  });
  it.each([
    { mode: 'catalog' },
    { mode: 'ai', answer: 'x', matches: [null], query },
    { mode: 'ai', answer: 'x', matches: [], query: { ...query, methods: 'espresso' } },
    { mode: 'ai', answer: 'x', matches: [], query: { ...query, amount: '999' } },
  ])('rejects a malformed response for safe fallback', async body => {
    expect(await converseRemotely(local, [], 'en', { ...options, fetcher: async () => json(body) })).toBeNull();
  });
  it('does not issue a request after cancellation or without a member token', async () => {
    const fetcher = vi.fn();
    expect(await converseRemotely(local, [], 'en', { ...options, accessToken: '', fetcher })).toBeNull();
    const controller = new AbortController(); controller.abort();
    await expect(converseRemotely(local, [], 'en', { ...options, signal: controller.signal, fetcher })).rejects.toThrow('Request cancelled');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('AI to local orchestration', () => {
  it('returns the AI answer without waiting for any catalog fallback', async () => {
    const fallback = vi.fn(async () => { throw new Error('Catalog offline'); });
    const remote = vi.fn(async () => ai);
    expect(await resolveCoffeeAnswer({ draft: local, available: true, preference: defaultAssistantPreference(), remote, local: fallback })).toEqual(ai);
    expect(remote).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });
  it('exhausted credits return local advice and stop later paid calls across remounts and account changes', async () => {
    const saved = storage();
    const ownerKey = assistantPreferenceKey(options.url, 'owner-one');
    const draft = await converseLocally('شلون أضبط القهوة جم بار؟', 'ar', [], offline);
    const remote = vi.fn(async () => { throw new CoffeeAssistantError('credits'); });
    let preference = defaultAssistantPreference();
    const answer = await resolveCoffeeAnswer({ draft, available: true, preference, remote, local: async () => draft, onFallback: (_reason, next) => { preference = next; } });
    expect(answer.mode).toBe('local'); expect(answer.answer).toContain('9 بار');
    await saveAssistantPreference(saved, ownerKey, preference);
    const remounted = await readAssistantPreference(saved, ownerKey);
    await resolveCoffeeAnswer({ draft, available: true, preference: remounted, remote, local: async () => draft });
    expect(remote).toHaveBeenCalledTimes(1);
    expect(canUseAssistant(remounted, Date.now() + 31 * 86400000)).toBe(false);
    const other = await readAssistantPreference(saved, assistantPreferenceKey(options.url, 'other-owner'));
    expect(canUseAssistant(other)).toBe(true);
    await saveAssistantPreference(saved, ownerKey, defaultAssistantPreference());
    expect(canUseAssistant(await readAssistantPreference(saved, ownerKey))).toBe(true);
    expect(saved.setItem.mock.calls[0][1]).not.toContain(options.accessToken);
  });
  it('temporary network failures fall back and resume only on a later question after cooldown', async () => {
    let clock = 1000, preference = defaultAssistantPreference();
    const remote = vi.fn().mockRejectedValueOnce(new Error('Network offline')).mockResolvedValue(ai);
    const answer = () => resolveCoffeeAnswer({ draft: local, available: true, preference, remote, local: async () => local, now: () => clock, onFallback: (_reason, next) => { preference = next; } });
    expect((await answer()).mode).toBe('local');
    expect(preference.creditPaused).toBe(false);
    expect((await answer()).mode).toBe('local');
    expect(remote).toHaveBeenCalledTimes(1);
    clock += 30001;
    expect((await answer()).mode).toBe('ai');
    expect(remote).toHaveBeenCalledTimes(2);
  });
  it('honors rate Retry-After without any immediate model retry', async () => {
    let clock = 1000, preference = defaultAssistantPreference();
    const remote = vi.fn(async () => { throw new CoffeeAssistantError('rate', 90000); });
    const answer = () => resolveCoffeeAnswer({ draft: local, available: true, preference, remote, local: async () => local, now: () => clock, onFallback: (_reason, next) => { preference = next; } });
    await answer(); clock += 60000; await answer();
    expect(preference.creditPaused).toBe(false); expect(remote).toHaveBeenCalledTimes(1);
  });
  it('persistent opt-out prevents model calls and is isolated per account and project', async () => {
    const saved = storage(), key = assistantPreferenceKey('project-a', 'manual-off');
    await saveAssistantPreference(saved, key, { ...defaultAssistantPreference(), optedOut: true });
    const remote = vi.fn();
    const preference = await readAssistantPreference(saved, key);
    expect(await resolveCoffeeAnswer({ draft: local, available: true, preference, remote, local: async () => local })).toEqual(local);
    expect(remote).not.toHaveBeenCalled();
    expect(canUseAssistant(await readAssistantPreference(saved, assistantPreferenceKey('project-b', 'manual-off')))).toBe(true);
  });
  it('a failed preference read cannot silently re-enable a saved opt-out', async () => {
    const broken = { getItem: async () => { throw new Error('Storage unavailable'); }, setItem: async () => {} };
    const preference = await readAssistantPreference(broken, 'failed-preference-read');
    expect(preference.optedOut).toBe(true);
    expect(canUseAssistant(preference)).toBe(false);
  });
  it('a delayed preference read cannot overwrite a newer manual choice', async () => {
    let finish!: (value: string) => void;
    const saved = { getItem: () => new Promise<string>(resolve => { finish = resolve; }), setItem: async () => {} };
    const read = readAssistantPreference(saved, 'late-preference-read');
    await Promise.resolve();
    await saveAssistantPreference(saved, 'late-preference-read', { ...defaultAssistantPreference(), optedOut: true });
    finish(JSON.stringify({ version: 1, ...defaultAssistantPreference() }));
    expect((await read).optedOut).toBe(true);
  });
  it('ignores a late remote result after cancellation or an account-switch abort', async () => {
    let complete!: (value: typeof ai) => void;
    const pending = new Promise<typeof ai>(resolve => { complete = resolve; });
    const controller = new AbortController(), fallback = vi.fn(async () => local), onFallback = vi.fn();
    const request = resolveCoffeeAnswer({ draft: local, available: true, preference: defaultAssistantPreference(), remote: () => pending, local: fallback, signal: controller.signal, onFallback });
    controller.abort(); complete(ai);
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(fallback).not.toHaveBeenCalled(); expect(onFallback).not.toHaveBeenCalled();
  });
  it('keeps exact arithmetic offline even with AI enabled', async () => {
    const draft = await converseLocally('Calculate 18 g at 1:16', 'en', [], offline), remote = vi.fn();
    const result = await resolveCoffeeAnswer({ draft, available: true, preference: defaultAssistantPreference(), remote, local: async () => draft });
    expect(result.answer).toContain('288'); expect(remote).not.toHaveBeenCalled();
  });
});
