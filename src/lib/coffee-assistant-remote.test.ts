// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { coffeeAssistantAvailable, converseRemotely, shouldUseRemoteAssistant } from '../../apps/mobile/src/coffeeAssistantRemote';
import { converseLocally, type LocalAssistantTurn } from './local-coffee-assistant';

const query = { kind: null, category: null, methods: [], terms: [], amount: null, currency: null, clarification: null };
const local: LocalAssistantTurn = { question: 'Compare coffee options', answer: 'Local answer', mode: 'local', intent: 'help', query, matches: [] };
const options = { url: 'mobilefixture.supabase.co', publicKey: 'public-test', accessToken: 'user-token' };
options.url = 'https://' + options.url;
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

describe('optional remote coffee expert', () => {
  it('requires the metered server contract and enabled service', async () => {
    expect(await coffeeAssistantAvailable({ ...options, fetcher: async () => json({ conversation_enabled: true, authentication_required: true }) })).toBe(false);
    expect(await coffeeAssistantAvailable({ ...options, fetcher: async () => json({ api_contract: 1, conversation_enabled: false, authentication_required: true }) })).toBe(false);
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer user-token' });
      return json({ api_contract: 1, conversation_enabled: true, authentication_required: true });
    });
    expect(await coffeeAssistantAvailable({ ...options, fetcher })).toBe(true);
  });
  it('keeps dynamic lessons, ratios and brew coaching local', async () => {
    const deps = { search: async () => ({ documents: [], rates: [] }) };
    for (const question of ['Calculate 18 g at 1:16', 'My V60 tastes sour', 'What is anaerobic processing?']) {
      const answer = await converseLocally(question, 'en', [], deps);
      expect(shouldUseRemoteAssistant(answer), question).toBe(false);
    }
    const fetcher = vi.fn();
    expect(await converseRemotely({ ...local, intent: 'knowledge', knowledgeTopic: 'live-lesson' }, [], 'en', { ...options, fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { query: { ...query, servingStyle: 'cold' as const } },
    { query: { ...query, minAmount: 100, amount: 300, currency: 'KWD' as const } },
    { query: { ...query, purchaseIntent: true } },
    { query: { ...query, noteTerms: ['coconut'] } },
    { recipeAlternative: true },
    { equipmentAdvice: 'unverified-price' as const },
  ])('preserves newer local search filters unsupported by the legacy server', extra => {
    expect(shouldUseRemoteAssistant({ ...local, ...extra })).toBe(false);
  });
  it.each([
    'شلون أضبط القهوة جم بار؟',
    'جم بار ضغط الإسبريسو؟',
    'How many bar for espresso pressure?',
  ])('explains espresso bar as pressure, not an iced drink: %s', async question => {
    const search = vi.fn(async () => ({ documents: [], rates: [] }));
    const answer = await converseLocally(question, /[a-z]/i.test(question) && !/[\u0600-\u06ff]/.test(question) ? 'en' : 'ar', [], { search });
    expect(answer.intent).toBe('knowledge');
    expect(answer.knowledgeTopic).toBe('espresso-pressure-bar');
    expect(answer.answer).toMatch(/9 bar|9 بار/);
    expect(answer.answer).not.toMatch(/بارد|iced/i);
    expect(search).not.toHaveBeenCalled();
  });
  it('does not confuse a request for cold coffee with the espresso pressure unit', async () => {
    const answer = await converseLocally('أبي قهوة باردة بالثلج', 'ar', [], { search: async () => ({ documents: [], rates: [] }) });
    expect(answer.knowledgeTopic).not.toBe('espresso-pressure-bar');
  });
  it('keeps the local guide available when the provider rejects a request for insufficient quota', async () => {
    const localAnswer = await converseLocally('شلون أضبط القهوة جم بار؟', 'ar', [], { search: async () => ({ documents: [], rates: [] }) });
    await expect(converseRemotely({ ...local, intent: 'help' }, [], 'ar', {
      ...options,
      fetcher: async () => new Response(JSON.stringify({ error: 'insufficient_quota' }), { status: 429 }),
    })).rejects.toThrow('ASSISTANT_UNAVAILABLE');
    expect(localAnswer.answer).toContain('9 بار');
  });
  it('never sends catalog facts, answers or non-UUID result IDs back to the model service', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ question: local.question, locale: 'en', history: [{ question: local.question, resultIds: [] }] });
      expect(String(init?.body)).not.toContain('Local answer');
      return json({ mode: 'ai', answer: 'Published catalog answer', query, matches: [] });
    });
    const result = await converseRemotely(local, [local], 'en', { ...options, fetcher });
    expect(result).toMatchObject({ mode: 'ai', answer: 'Published catalog answer' });
  });
  it('falls back on a disabled/malformed response and rejects network/HTTP errors', async () => {
    expect(await converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({ mode: 'catalog' }) })).toBeNull();
    expect(await converseRemotely(local, [], 'en', { ...options, fetcher: async () => json({ mode: 'ai', answer: 'x', matches: [null], query }) })).toBeNull();
    await expect(converseRemotely(local, [], 'en', { ...options, fetcher: async () => new Response(null, { status: 429 }) })).rejects.toThrow('ASSISTANT_UNAVAILABLE');
  });
  it('does not issue a provider request after cancellation or without a member token', async () => {
    const fetcher = vi.fn();
    expect(await converseRemotely(local, [], 'en', { ...options, accessToken: '', fetcher })).toBeNull();
    const controller = new AbortController(); controller.abort();
    await expect(converseRemotely(local, [], 'en', { ...options, signal: controller.signal, fetcher })).rejects.toThrow('Request cancelled');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
