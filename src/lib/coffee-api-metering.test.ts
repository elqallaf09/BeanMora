// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { openAIModel, type ModelUsage } from '../../supabase/functions/coffee-assistant/model';
import { coffeeAssistantConfig } from '../../supabase/functions/coffee-assistant/config';

const responseBody = (extra: Record<string, unknown> = {}) => ({
  status: 'completed', model: 'model-returned-2026',
  usage: { input_tokens: 120, input_tokens_details: { cached_tokens: 40 }, output_tokens: 30, output_tokens_details: { reasoning_tokens: 5 }, total_tokens: 150 },
  output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }], ...extra,
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-test' } });
const run = (model: ReturnType<typeof openAIModel>) => model.generate('coffee_plan', {}, 'private instructions', { question: 'private question' });

describe('coffee expert metering', () => {
  it('reserves before calling and saves actual returned usage without prompts or credentials', async () => {
    const order: string[] = [], records: ModelUsage[] = [];
    const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => {
      order.push('provider');
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer server-test-key', 'OpenAI-Project': 'proj-beanmora', 'OpenAI-Organization': 'org-test' });
      expect(JSON.parse(String(options?.body))).toMatchObject({ model: 'configured-model', store: false, reasoning: { effort: 'none' }, max_output_tokens: 1200 });
      return response(responseBody());
    });
    const model = openAIModel('server-test-key', 'configured-model', fetcher, {
      projectId: 'proj-beanmora', organizationId: 'org-test', reasoningEffort: 'none',
      onStart: async usage => { order.push('reserve'); records.push({ ...usage }); },
      onUsage: async usage => { order.push('settle'); records.push({ ...usage }); },
    });
    expect(await run(model)).toEqual({ ok: true });
    expect(order).toEqual(['reserve', 'provider', 'settle']);
    expect(records[0]).toMatchObject({ outcome: 'pending', total_tokens: null });
    expect(records[1]).toMatchObject({ requested_model: 'configured-model', model: 'model-returned-2026', input_tokens: 120, cached_input_tokens: 40, output_tokens: 30, reasoning_tokens: 5, total_tokens: 150, provider_request_id: 'req-test', outcome: 'completed' });
    expect(JSON.stringify(records)).not.toMatch(/private question|private instructions|server-test-key/);
  });
  it.each([
    ['incomplete', responseBody({ status: 'incomplete' }), 'MODEL_INCOMPLETE'],
    ['refused', responseBody({ output: [{ type: 'message', content: [{ type: 'refusal' }] }] }), 'MODEL_REFUSAL'],
    ['invalid', responseBody({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }] }), 'Unexpected token'],
  ])('meters billed %s outputs', async (outcome, body) => {
    const onUsage = vi.fn(async (usage: ModelUsage) => { void usage; });
    await expect(run(openAIModel('test', 'model', async () => response(body), { onUsage }))).rejects.toThrow();
    expect(onUsage).toHaveBeenCalledOnce();
    expect(onUsage.mock.calls[0][0]).toMatchObject({ outcome, total_tokens: 150 });
  });
  it('records unreported usage as null and preserves a reported zero', async () => {
    const records: ModelUsage[] = [];
    await run(openAIModel('test', 'model', async () => response(responseBody({ usage: { input_tokens: 0, total_tokens: -2 } })), { onUsage: async usage => { records.push(usage); } }));
    expect(records[0]).toMatchObject({ input_tokens: 0, total_tokens: null, output_tokens: null, cached_input_tokens: null });
  });
  it.each([401, 429, 500])('records rejected provider HTTP %s without inventing token counts', async status => {
    const records: ModelUsage[] = [];
    await expect(run(openAIModel('test', 'model', async () => response({ error: { message: 'private' } }, status), { onUsage: async usage => { records.push(usage); } }))).rejects.toThrow(status === 429 ? 'RATE_LIMITED' : 'MODEL_UNAVAILABLE');
    expect(records[0]).toMatchObject({ outcome: 'http_error', http_status: status, total_tokens: null });
    expect(JSON.stringify(records)).not.toContain('private');
  });
  it('does not spend when reservation fails and does not ignore settlement failure', async () => {
    const fetcher = vi.fn(async () => response(responseBody()));
    await expect(run(openAIModel('test', 'model', fetcher, { onStart: async () => { throw new Error('LEDGER_UNAVAILABLE'); } }))).rejects.toThrow('LEDGER_UNAVAILABLE');
    expect(fetcher).not.toHaveBeenCalled();
    await expect(run(openAIModel('test', 'model', fetcher, { onUsage: async () => { throw new Error('LEDGER_UNAVAILABLE'); } }))).rejects.toThrow('LEDGER_UNAVAILABLE');
  });
});

describe('server-only coffee expert configuration', () => {
  const config = (extra: Record<string, string>) => coffeeAssistantConfig(name => ({ OPENAI_API_KEY: 'global-key', COFFEE_ASSISTANT_ENABLED: 'true', COFFEE_ASSISTANT_MODEL: 'model-test', ...extra })[name]);
  it('requires explicit enable and model; reads dedicated credentials first', () => {
    expect(config({ COFFEE_ASSISTANT_MODEL: '' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_ENABLED: 'false' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_OPENAI_API_KEY: 'scoped-key', COFFEE_ASSISTANT_OPENAI_PROJECT_ID: 'proj-coffee', OPENAI_PROJECT_ID: 'proj-other' })).toMatchObject({ enabled: true, apiKey: 'scoped-key', projectId: 'proj-coffee' });
  });
  it('does not fall back when a dedicated credential or project is invalid', () => {
    expect(config({ COFFEE_ASSISTANT_OPENAI_API_KEY: '' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_OPENAI_API_KEY: 'key\ninjected' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_OPENAI_PROJECT_ID: '', OPENAI_PROJECT_ID: 'proj-other' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_OPENAI_PROJECT_ID: 'proj\ninjected' }).enabled).toBe(false);
  });
  it('validates an optional pilot allowlist and reasoning effort', () => {
    expect(config({ COFFEE_ASSISTANT_PILOT_USER_IDS: 'bad-user' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_REASONING_EFFORT: 'unbounded' }).enabled).toBe(false);
    expect(config({ COFFEE_ASSISTANT_PILOT_USER_IDS: '33333333-3333-4333-8333-333333333333' }).pilotUserIds).toEqual(['33333333-3333-4333-8333-333333333333']);
  });
});
