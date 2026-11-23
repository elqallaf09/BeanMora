// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { createCoffeeAssistantHandler } from '../../supabase/functions/coffee-assistant/handler';
const values: Record<string, string> = {
  SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-fixture', SUPABASE_SERVICE_ROLE_KEY: 'server-fixture',
  COFFEE_ASSISTANT_ENABLED: 'true', COFFEE_ASSISTANT_OPENAI_API_KEY: 'not-a-real-key', COFFEE_ASSISTANT_MODEL: 'model-fixture',
};
type Row = { user_id: string; policy: string; generation: string; choice: 'allow' | 'guide' };
function fixture() {
  const rows = new Map<string, Row>();
  const provider = vi.fn(async () => new Response('{}', { status: 503 }));
  const quota = vi.fn(async () => ({ data: true }));
  let revokeBeforeProvider = false;
  let consentReadsFail = false;
  const create = () => ({
    auth: { getUser: async (token: string) => ({ data: { user: { id: token, is_anonymous: token === 'guest' } } }) },
    from(table: string) {
      const filters: Record<string, string> = {};
      let data: Row | undefined, mode = 'read';
      const chain = {
        select() { return chain; }, eq(key: string, value: string) { filters[key] = value; return chain; },
        abortSignal() { return chain; }, single() { return chain; }, limit() { return chain; },
        insert(row: Row) { data = row; mode = 'insert'; return chain; },
        update(row: Row) { data = row; mode = 'update'; return chain; },
        upsert(row: Row) { data = row; mode = 'upsert'; return chain; },
        async maybeSingle() {
          if (consentReadsFail) return { error: { code: 'unavailable' } };
          const current = rows.get(filters.user_id);
          if (mode === 'update') {
            if (current?.generation !== filters.generation || !data) return { data: null };
            rows.set(data.user_id, data); return { data };
          }
          return { data: current ?? null };
        },
        then(resolve: (result: unknown) => unknown) {
          if (table === 'coffee_assistant_api_usage') {
            if (mode === 'insert' && revokeBeforeProvider) {
              const current = rows.get('one');
              if (current) rows.set('one', { ...current, choice: 'guide', generation: 'revoked' });
            }
            return Promise.resolve(resolve({ error: null }));
          }
          if (data) {
            if (mode === 'insert' && rows.has(data.user_id)) return Promise.resolve(resolve({ error: { code: '23505' } }));
            rows.set(data.user_id, data);
          }
          return Promise.resolve(resolve({ error: null }));
        },
      };
      return chain;
    },
    rpc: quota,
  });
  const handle = createCoffeeAssistantHandler(create as unknown as Parameters<typeof createCoffeeAssistantHandler>[0], key => values[key], provider);
  const req = (method: string, token = 'one', choice?: string, expected?: string, body?: string) => new Request('https://edge.test', {
    method, ...(body ? { body } : {}), headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json',
      ...(choice ? { 'x-coffee-consent': choice } : {}), ...(expected ? { 'x-coffee-consent-expected': expected } : {}) },
  });
  const decide = (choice: string, expected?: string, token = 'one') => handle(req('PUT', token, 'openai-v1:' + choice, expected));
  return { provider, quota, req, decide, handle, rows, revoke: () => { revokeBeforeProvider = true; }, fail: () => { consentReadsFail = true; } };
}
const question = JSON.stringify({ question: 'Is my espresso pressure correct?', locale: 'en', history: [] });
it('never reads an old, unset, alternate-account or withdrawn question or enters metering/provider', async () => {
  const f = fixture();
  for (const req of [f.req('POST', 'one', undefined, undefined, question), f.req('POST', 'one', 'invented', undefined, question)]) {
    expect((await f.handle(req)).status).toBe(403); expect(req.bodyUsed).toBe(false);
  }
  const { consent_generation } = await (await f.decide('allow', 'unset')).json();
  const old = f.req('POST', 'one', undefined, undefined, question);
  expect((await f.handle(old)).status).toBe(403); expect(old.bodyUsed).toBe(false);
  expect((await f.handle(f.req('POST', 'other', consent_generation, undefined, question))).status).toBe(403);
  expect((await f.decide('guide')).status).toBe(200);
  expect((await f.decide('allow', consent_generation)).status).toBe(409);
  expect((await f.decide('allow', 'unset')).status).toBe(409);
  expect((await f.handle(f.req('POST', 'one', consent_generation, undefined, question))).status).toBe(403);
  expect(f.quota).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled();
});
it('fails closed on receipt read failure and rejects a body on a choice write', async () => {
  const f = fixture();
  expect((await f.handle(f.req('PUT', 'one', 'openai-v1:allow', 'unset', question))).status).toBe(400);
  expect((await f.decide('allow', 'unset', 'guest')).status).toBe(401);
  const { consent_generation } = await (await f.decide('allow', 'unset')).json();
  f.fail();
  const req = f.req('POST', 'one', consent_generation, undefined, question);
  expect((await f.handle(req)).status).toBe(503); expect(req.bodyUsed).toBe(false);
  expect(f.quota).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled();
});
it('accepts a choice write whose body is an empty stream (native iOS PUT) but not one with content', async () => {
  const f = fixture();
  const put = (body: string, extra: Record<string, string> = {}) => f.handle(new Request('https://edge.test', {
    method: 'PUT', body, headers: { authorization: 'Bearer one', 'x-coffee-consent': 'openai-v1:allow', 'x-coffee-consent-expected': 'unset', ...extra },
  }));
  expect((await put(' ')).status).toBe(400);
  expect((await put('', { 'content-length': '5' })).status).toBe(400);
  const saved = await put('');
  expect(saved.status).toBe(200);
  expect((await saved.json()).consent_choice).toBe('allow');
});
it('tests the actual handler/provider seam: only an allowed generation dispatches and a late revoke prevents dispatch', async () => {
  const active = fixture();
  const { consent_generation } = await (await active.decide('allow', 'unset')).json();
  await active.handle(active.req('POST', 'one', consent_generation, undefined, question));
  expect(active.provider).toHaveBeenCalledTimes(1);
  const late = fixture();
  const granted = await (await late.decide('allow', 'unset')).json();
  late.revoke();
  expect((await late.handle(late.req('POST', 'one', granted.consent_generation, undefined, question))).status).toBe(403);
  expect(late.provider).not.toHaveBeenCalled();
});
