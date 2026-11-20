// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CoffeeAssistantError, coffeeAssistantAvailable, coffeeAssistantReadiness, converseRemotely, shouldUseRemoteAssistant } from '../../apps/mobile/src/coffeeAssistantRemote';
import { CREDIT_RETRY_MS, assistantPreferenceKey, canUseAssistant, defaultAssistantPreference, readAssistantPreference, resolveCoffeeAnswer, saveAssistantAvailability, saveAssistantPreference } from '../../apps/mobile/src/coffeeAssistantPolicy';
import { converseLocally, type LocalAssistantTurn } from './local-coffee-assistant';

const query = { kind: null, category: null, methods: [], terms: [], amount: null, currency: null, clarification: null };
const local: LocalAssistantTurn = { question: 'Compare coffee options', answer: 'Local answer', mode: 'local', intent: 'help', query, matches: [] };
const options = { url: 'https://mobilefixture.supabase.co', publicKey: 'public-test', accessToken: 'user-token' };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const ai = { ...local, mode: 'ai' as const, answer: 'Grounded AI answer' };
const offline = { search: async () => ({ documents: [], rates: [] }) };
const reference = (id: string): LocalAssistantTurn['matches'][number] => ({
  document: { id, kind: 'coffee', slug: null, title_ar: '', title_en: 'Client catalog title', summary_ar: '', summary_en: '', search_text: '', source_url: 'https://example.com/client-source', category: null, methods: [], facts: { notes: ['Client catalog fact'] }, offers: [], verified_at: null },
  matchedTerms: [], allTerms: true, price: null,
});

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
    { query: { ...query, kind: 'recipe' as const, noteTerms: ['coconut'] } },
    { recipeAlternative: true },
  ])('preserves advanced catalog filters', extra => {
    expect(shouldUseRemoteAssistant({ ...local, ...extra })).toBe(false);
  });
  it('routes strawberry bean recommendations and ordinary machine budgets to the model', async () => {
    for (const question of ['شنو البن الي طعمه او ايحاءه على فراولة', 'أبي ماكينة إسبريسو تحت 480 دولار', 'Coffee with strawberry notes']) {
      const draft = await converseLocally(question, 'ar', [], offline);
      expect(shouldUseRemoteAssistant(draft), question).toBe(true);
    }
  });
  it.each([
    'البن مالي محموص بتاريخ ١/١٠/٢٠٢٦ برازيلي ، جم درجه الطحن اللي تنصح فيه ؟',
    'My Brazilian coffee was roasted on 1/10/2026. What grind setting do you recommend?',
    'برازيلي محمص بتاريخ 2026-10-01، شنو درجة الطحن المناسبة؟',
  ])('routes a roast-date grinding question to AI with its original context: %s', async question => {
    const draft = await converseLocally(question, 'ar', [], offline);
    expect(draft.intent).not.toBe('calculate');
    expect(draft.calculation).toBeUndefined();
    expect(shouldUseRemoteAssistant(draft)).toBe(true);
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).question).toBe(question);
      return json({ mode: 'ai', answer: 'The grinder and brewing method determine the starting point. Which grinder are you using?', query, matches: [] });
    });
    expect(await converseRemotely(draft, [], 'ar', { ...options, question, fetcher })).toMatchObject({ mode: 'ai' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('distinguishes disabled readiness from a network or authentication failure', async () => {
    expect(await coffeeAssistantReadiness({ ...options, fetcher: async () => json({ api_contract: 2, conversation_enabled: false, authentication_required: true }) })).toBe('disabled');
    await expect(coffeeAssistantReadiness({ ...options, fetcher: async () => json({}, 503) })).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(coffeeAssistantReadiness({ ...options, fetcher: async () => json({}, 401) })).rejects.toMatchObject({ reason: 'signin' });
  });
  it.each(['guidance_not_found', 'clarification_required', 'catalog_no_matches'])('recognizes a deliberate catalog response: %s', async notice => {
    expect(await converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({ mode: 'catalog', notice }) })).toBeNull();
  });
  it('sends original language conversation text and UUID references without client facts, sources or account metadata', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const previous = { ...local, followUp: 'Which grinder do you use?', matches: [reference(id), reference('private-local-item')], sources: [{ title: 'Client lesson source', url: 'https://example.com/lesson' }], ownerId: 'private-account-id' };
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ question: 'Comment régler mon espresso ?', locale: 'fr', history: [{ question: local.question, answer: local.answer, followUp: previous.followUp, resultIds: [id] }] });
      return json({ mode: 'ai', answer: 'Réponse vérifiée', query, matches: [] });
    });
    expect(await converseRemotely(local, [previous], 'fr', { ...options, question: 'Comment régler mon espresso ?', fetcher })).toMatchObject({ mode: 'ai', answer: 'Réponse vérifiée' });
  });
  it('carries the expert’s own question into the reported Arabic follow-up instead of losing the conversation', async () => {
    const question = 'البن اللي عندي من محمصة جبلة محموص بتاريخ ١/١٠/٢٠٢٦ شنو احسن درجه طحن؟';
    const followUpQuestion = 'شنو يعني شنو طريقة التحضير و موديل الطحنة!';
    const answer = 'درجة الطحن تعتمد على طريقة التحضير والمطحنة؛ تاريخ التحميص وحده ما يحدد رقم الطحن.';
    const followUp = 'شنو طريقة التحضير وموديل المطحنة؟';
    const explanation = 'طريقة التحضير يعني شلون تسوي قهوتك، مثل V60 أو إسبريسو. موديل المطحنة يعني اسم الجهاز اللي تطحن فيه البن.';
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.question === question) {
        expect(body.history).toEqual([]);
        return json({ mode: 'ai', answer, followUp, query, matches: [] });
      }
      expect(body).toEqual({ question: followUpQuestion, locale: 'ar', history: [{ question, answer, followUp, resultIds: [] }] });
      return json({ mode: 'ai', answer: explanation, query, matches: [] });
    });
    const firstDraft = await converseLocally(question, 'ar', [], offline);
    const first = await converseRemotely(firstDraft, [], 'ar', { ...options, question, fetcher });
    expect(first).not.toBeNull();
    const draft = await converseLocally(followUpQuestion, 'ar', [{ ...first!, mode: 'local' }], offline);
    expect(shouldUseRemoteAssistant(draft)).toBe(true);
    expect(await converseRemotely(draft, [first!], 'ar', { ...options, question: followUpQuestion, fetcher })).toMatchObject({ mode: 'ai', answer: explanation });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('keeps only six recent bounded turns within the request byte budget even with JSON-escaped text', async () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      ...local, question: `turn-${index}:` + '\u0001'.repeat(1100), answer: '\u0001'.repeat(2100), followUp: '\u0001'.repeat(300),
      matches: Array.from({ length: 8 }, (_, match) => reference(`11111111-1111-4111-8111-${String(match).padStart(12, '0')}`)),
    }));
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const raw = String(init?.body), body = JSON.parse(raw);
      expect(body.question).toHaveLength(1000);
      expect(body.history).toHaveLength(6);
      expect(body.history.map((turn: { question: string }) => turn.question.slice(0, 7))).toEqual(['turn-2:', 'turn-3:', 'turn-4:', 'turn-5:', 'turn-6:', 'turn-7:']);
      for (const turn of body.history) {
        expect(turn.question).toHaveLength(1000);
        expect(turn.answer).toHaveLength(2000);
        expect(turn.followUp).toHaveLength(220);
        expect(turn.resultIds).toHaveLength(6);
        expect(Object.keys(turn).sort()).toEqual(['answer', 'followUp', 'question', 'resultIds']);
      }
      expect(Buffer.byteLength(raw, 'utf8')).toBeGreaterThan(100000);
      expect(Buffer.byteLength(raw, 'utf8')).toBeLessThanOrEqual(131072);
      return json({ mode: 'ai', answer: 'Grounded answer', query, matches: [] });
    });
    await converseRemotely(local, history, 'ar', { ...options, question: '\u0001'.repeat(1100), fetcher });
    expect(history).toHaveLength(8);
    expect(history[7].answer).toHaveLength(2100);
  });
  it('does not split an emoji when bounding conversation fields', async () => {
    const previous = { ...local, question: 'q'.repeat(999) + '🫘', answer: 'a'.repeat(1999) + '🫘', followUp: 'f'.repeat(219) + '🫘' };
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.question).toBe('q'.repeat(999));
      expect(body.history).toEqual([{ question: 'q'.repeat(999), answer: 'a'.repeat(1999), followUp: 'f'.repeat(219), resultIds: [] }]);
      return json({ mode: 'ai', answer: 'Grounded answer', query, matches: [] });
    });
    await converseRemotely(local, [previous], 'en', { ...options, question: previous.question, fetcher });
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
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => json(body) })).rejects.toMatchObject({ reason: 'unavailable' });
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
  it('exhausted credit cooldown persists and recovers on a later question without a manual activation', async () => {
    const saved = storage(), ownerKey = assistantPreferenceKey(options.url, 'owner-one');
    const draft = await converseLocally('شلون أضبط القهوة جم بار؟', 'ar', [], offline);
    const remote = vi.fn().mockRejectedValueOnce(new CoffeeAssistantError('credits')).mockResolvedValue(ai);
    let clock = 1000, preference = defaultAssistantPreference();
    const answer = () => resolveCoffeeAnswer({ draft, available: true, preference, remote, local: async () => draft, now: () => clock, onFallback: (_reason, next) => { preference = next; }, onRecovered: next => { preference = next; } });
    expect((await answer()).answer).toContain('9 بار');
    await saveAssistantPreference(saved, ownerKey, preference);
    preference = await readAssistantPreference(saved, ownerKey);
    await answer();
    expect(remote).toHaveBeenCalledTimes(1);
    expect(canUseAssistant(preference, clock + CREDIT_RETRY_MS - 1)).toBe(false);
    const other = await readAssistantPreference(saved, assistantPreferenceKey(options.url, 'other-owner'));
    expect(canUseAssistant(other)).toBe(true);
    clock += CREDIT_RETRY_MS;
    expect((await answer()).mode).toBe('ai');
    expect(preference).toEqual(defaultAssistantPreference());
    expect(remote).toHaveBeenCalledTimes(2);
    expect(saved.setItem.mock.calls[0][1]).not.toContain(options.accessToken);
  });
  it('migrates old indefinite credit pauses without changing explicit privacy choices', async () => {
    const saved = storage(), key = 'legacy-credit-pause';
    await saved.setItem(key, JSON.stringify({ version: 1, optedOut: false, creditPaused: true, retryAt: 0 }));
    const preference = await readAssistantPreference(saved, key), remote = vi.fn(async () => ai);
    expect((await resolveCoffeeAnswer({ draft: local, available: true, preference, remote, local: async () => local })).mode).toBe('ai');
    expect(remote).toHaveBeenCalledTimes(1);
    expect(canUseAssistant({ ...preference, optedOut: true })).toBe(false);
  });
  it('uses the guide for a valid catalog response without reporting a connectivity failure or pausing AI', async () => {
    const remote = vi.fn(async () => null), onFallback = vi.fn(), onRecovered = vi.fn();
    expect(await resolveCoffeeAnswer({ draft: local, available: true, preference: defaultAssistantPreference(), remote, local: async () => local, onFallback, onRecovered })).toEqual(local);
    expect(remote).toHaveBeenCalledTimes(1);
    expect(onFallback).not.toHaveBeenCalled();
    expect(onRecovered).toHaveBeenCalledWith(defaultAssistantPreference());
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
  it('retries a transient failed preference read on the next question', async () => {
    const saved = { getItem: vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(JSON.stringify({ version: 1, ...defaultAssistantPreference() })), setItem: async () => {} };
    expect((await readAssistantPreference(saved, 'transient-preference-read')).optedOut).toBe(true);
    expect((await readAssistantPreference(saved, 'transient-preference-read')).optedOut).toBe(false);
    expect(saved.getItem).toHaveBeenCalledTimes(2);
  });
  it('a request completing after a Settings opt-out cannot overwrite that privacy choice', async () => {
    const saved = storage(), key = 'settings-opt-out-during-request';
    await saveAssistantPreference(saved, key, { ...defaultAssistantPreference(), optedOut: true });
    await saveAssistantAvailability(saved, key, defaultAssistantPreference());
    expect((await readAssistantPreference(saved, key)).optedOut).toBe(true);
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
