// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { AiLabelError, MAX_AI_LABEL_IMAGE, parseAiLabel, readLabelWithAi, withdrawAiLabelConsent } from '../../apps/mobile/src/coffeeLabelRemote';

const options = { url: 'https://mobilefixture.supabase.co', publicKey: 'public-test', accessToken: 'user-token' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const f = (value: string, confidence = 'high') => ({ value, confidence });
const ok = { status: 'ok', api: 1, reading: { fields: { name: f('Guji Hambela'), roaster: f('Oasis'), origin: f('Ethiopia'), region: f(''), variety: f('Heirloom', 'medium'),
  process: f('washed'), roast: f('light', 'low'), roast_date: f('2026-11-10'), altitude: f(''), weight: f('250 g') }, notes: { value: ['jasmine', 'peach'], confidence: 'high' } } };
const image = 'data:image/jpeg;base64,/9j/AAAA';
const reason = (error: unknown) => error instanceof AiLabelError ? error.reason : 'other';

describe('AI coffee label reading client', () => {
  it('maps the reading to label fields and keeps confidence only for filled fields', () => {
    const reading = parseAiLabel(ok);
    expect(reading.label).toEqual({ name: 'Guji Hambela', origin: 'Ethiopia', variety: 'Heirloom', process: 'washed', roast: 'light', notes: 'jasmine, peach' });
    expect(reading.extras).toEqual({ roaster: 'Oasis', region: '', roastDate: '2026-11-10', altitude: '', weight: '250 g' });
    expect(reading.confidence).toMatchObject({ name: 'high', variety: 'medium', roast: 'low' });
    expect(reading.confidence.region).toBeUndefined();
  });
  it('sends the photo only with the explicit consent header and the member token', async () => {
    const fetcher = vi.fn(async () => json(ok)) as unknown as typeof fetch;
    await readLabelWithAi({ ...options, fetcher }, image);
    const [url, init] = (fetcher as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe('https://mobilefixture.supabase.co/functions/v1/coffee-label-reader');
    expect((init.headers as Record<string, string>)['x-label-consent']).toBe('openai-label-v1:allow');
    expect(JSON.parse(String(init.body))).toEqual({ image });
  });
  it('never calls the server without a session or with an oversized photo', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await readLabelWithAi({ ...options, accessToken: '', fetcher }, image).catch(reason)).toBe('signin');
    expect(await readLabelWithAi({ ...options, fetcher }, 'x'.repeat(MAX_AI_LABEL_IMAGE + 1)).catch(reason)).toBe('size');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('explains each failure and rejects an unexpected response', async () => {
    const run = (response: Response | Error) => readLabelWithAi({ ...options, fetcher: (async () => { if (response instanceof Error) throw response; return response; }) as unknown as typeof fetch }, image).catch(reason);
    expect(await run(json({ error: 'AI_PILOT_ONLY' }, 403))).toBe('account');
    expect(await run(json({ error: 'LABEL_AI_DISABLED' }, 503))).toBe('disabled');
    expect(await run(json({ error: 'RATE_LIMITED' }, 429))).toBe('rate');
    expect(await run(json({ error: 'LABEL_UNREADABLE' }, 422))).toBe('unreadable');
    expect(await run(json({ error: 'SIGN_IN_REQUIRED' }, 401))).toBe('signin');
    expect(await run(new TypeError('Network request failed'))).toBe('network');
    expect(await run(json({ status: 'ok', api: 2, reading: ok.reading }))).toBe('unreadable');
    expect(await run(json({ status: 'ok', api: 1 }))).toBe('unreadable');
  });
  it('withdraws consent with a DELETE that carries no photo', async () => {
    const fetcher = vi.fn(async () => json({ status: 'ok' })) as unknown as typeof fetch;
    await withdrawAiLabelConsent({ ...options, fetcher });
    const init = (fetcher as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1];
    expect(init.method).toBe('DELETE'); expect(init.body).toBeUndefined();
  });
});
