// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { createCoffeeLabelHandler } from '../../supabase/functions/coffee-label-reader/handler';
import { parseLabelReading } from '../../supabase/functions/coffee-label-reader/label';

const env: Record<string, string> = {
  SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-fixture', SUPABASE_SERVICE_ROLE_KEY: 'server-fixture',
  COFFEE_ASSISTANT_ENABLED: 'true', COFFEE_ASSISTANT_OPENAI_API_KEY: 'not-a-real-key', COFFEE_ASSISTANT_MODEL: 'model-fixture',
};
const image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const field = (value: string, confidence = 'high') => ({ value, confidence });
const reading = { name: field('Guji Hambela'), roaster: field('Oasis Roasters'), origin: field('Ethiopia'), region: field(''), variety: field('Heirloom', 'medium'),
  process: field('washed'), roast: field('light'), roast_date: field('2026-11-10'), altitude: field(''), weight: field('250 g'),
  notes: { value: ['jasmine', 'peach', 'peach'], confidence: 'high' } };
const providerOk = (body: unknown = reading) => new Response(JSON.stringify({ status: 'completed', model: 'model-fixture',
  usage: { input_tokens: 900, output_tokens: 120, total_tokens: 1020 },
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(body) }] }] }), { status: 200 });

function fixture(options: { quota?: boolean; ledger?: boolean; provider?: () => Promise<Response>; extraEnv?: Record<string, string> } = {}) {
  const consents: Record<string, string> = {}; const ledger: Record<string, unknown>[] = [];
  const provider = vi.fn(options.provider ?? (async () => providerOk()));
  const create = () => ({
    auth: { getUser: async (token: string) => ({ data: { user: token === 'bad' ? null : { id: token, is_anonymous: token === 'guest' } } }) },
    rpc: async () => ({ data: options.quota ?? true }),
    from(table: string) {
      let row: Record<string, unknown> | undefined; let mode = '';
      const chain = {
        upsert(value: Record<string, unknown>) { row = value; mode = 'upsert'; return chain; },
        insert(value: Record<string, unknown>) { row = value; mode = 'insert'; return chain; },
        update(value: Record<string, unknown>) { row = value; mode = 'update'; return chain; },
        eq() { return chain; }, select() { return chain; }, abortSignal() { return chain; },
        async single() { ledger.push({ ...row, mode }); return { error: null }; },
        then(resolve: (result: unknown) => unknown) {
          if (table === 'coffee_assistant_consents' && row) consents[String(row.user_id) + ':' + String(row.policy)] = String(row.choice);
          if (table === 'coffee_assistant_api_usage') {
            if (options.ledger === false) return Promise.resolve(resolve({ error: { code: '23514' } }));
            ledger.push({ ...row, mode });
          }
          return Promise.resolve(resolve({ error: null }));
        },
      };
      return chain;
    },
  });
  const handle = createCoffeeLabelHandler(create as unknown as Parameters<typeof createCoffeeLabelHandler>[0], key => ({ ...env, ...options.extraEnv })[key], provider as unknown as typeof fetch);
  const post = (token = 'one', consent: string | null = 'openai-label-v1:allow', body: unknown = { image }) => handle(new Request('https://edge.test', {
    method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...(consent ? { 'x-label-consent': consent } : {}) } }));
  return { handle, post, provider, consents, ledger };
}

it('never forwards a photo without sign-in, explicit consent and a valid image', async () => {
  const f = fixture();
  expect((await f.post('guest')).status).toBe(401);
  expect((await f.post('bad')).status).toBe(401);
  expect((await f.post('one', null)).status).toBe(403);
  expect((await f.post('one', 'openai-v1:allow')).status).toBe(403);
  expect((await f.post('one', undefined, { image: 'https://example.test/bag.jpg' })).status).toBe(400);
  expect((await f.post('one', undefined, { image: 'data:image/svg+xml;base64,AAAA' })).status).toBe(400);
  expect(f.provider).not.toHaveBeenCalled(); expect(f.consents).toEqual({});
});
it('records consent, meters the request, sends the image once and returns sanitized fields', async () => {
  const f = fixture();
  const response = await f.post();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.reading.fields.name).toEqual({ value: 'Guji Hambela', confidence: 'high' });
  expect(body.reading.fields.region).toEqual({ value: '', confidence: 'low' });
  expect(body.reading.notes.value).toEqual(['jasmine', 'peach']);
  expect(f.consents['one:openai-label-v1']).toBe('allow');
  expect(f.provider).toHaveBeenCalledTimes(1);
  const sent = JSON.parse(String((f.provider.mock.calls[0] as unknown as [string, RequestInit])[1].body));
  expect(sent.store).toBe(false); expect(sent.input[0].content[1]).toMatchObject({ type: 'input_image', image_url: image });
  expect(f.ledger[0]).toMatchObject({ feature: 'coffee_label', operation: 'coffee_label_read', outcome: 'pending' });
  expect(f.ledger.at(-1)).toMatchObject({ outcome: 'completed', total_tokens: 1020 });
  expect(JSON.stringify(f.ledger)).not.toContain('/9j/');
});
it('fails closed before any provider charge when quota, metering or configuration is unavailable', async () => {
  const limited = fixture({ quota: false }); expect((await limited.post()).status).toBe(429); expect(limited.provider).not.toHaveBeenCalled();
  const unmetered = fixture({ ledger: false }); expect((await unmetered.post()).status).toBe(503); expect(unmetered.provider).not.toHaveBeenCalled();
  const disabled = fixture({ extraEnv: { COFFEE_ASSISTANT_ENABLED: 'false' } }); expect((await disabled.post()).status).toBe(503); expect(disabled.provider).not.toHaveBeenCalled();
  const pilot = fixture({ extraEnv: { COFFEE_ASSISTANT_PILOT_USER_IDS: '11111111-1111-4111-8111-111111111111' } });
  expect((await pilot.post()).status).toBe(403); expect(pilot.provider).not.toHaveBeenCalled();
});
it('rejects malformed model output and maps provider failures without leaking details', async () => {
  const bad = fixture({ provider: async () => providerOk({ name: 'Guji' }) });
  const response = await bad.post(); expect(response.status).toBe(422); expect(await response.json()).toEqual({ error: 'LABEL_UNREADABLE' });
  expect(bad.ledger.at(-1)).toMatchObject({ outcome: 'invalid' });
  const busy = fixture({ provider: async () => new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'secret detail' } }), { status: 429 }) });
  const limited = await busy.post(); expect(limited.status).toBe(429); expect(JSON.stringify(await limited.json())).not.toContain('secret');
});
it('withdraws consent on DELETE and strips control characters from fields', async () => {
  const f = fixture();
  const response = await f.handle(new Request('https://edge.test', { method: 'DELETE', headers: { authorization: 'Bearer one' } }));
  expect(response.status).toBe(200); expect(f.consents['one:openai-label-v1']).toBe('guide');
  const parsed = parseLabelReading({ ...reading, name: field('  Guji‮\n Hambela  '), notes: { value: [], confidence: 'high' } });
  expect(parsed.fields.name.value).toBe('Guji Hambela'); expect(parsed.notes.confidence).toBe('low');
});
