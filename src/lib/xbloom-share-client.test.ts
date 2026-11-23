// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { shareBody, shareToXBloom, XBloomShareError } from '../../apps/mobile/src/xbloomShare';
import { parseShareRecipe } from '../../supabase/functions/xbloom-share/cloud';
import type { GeneratedXBloom } from '../../apps/mobile/src/xbloomGenerator';

const recipe = { model: 'Studio', cup: 'Omni', serving: 'hot', dose: 15, water: 240, ratio: 16, grind: 57, temperature: 92,
  pours: [{ volume: 45, temperature: 92, flow_rate: null, pause_seconds: 40, pattern_code: 2 }, { volume: 195, temperature: null, flow_rate: 3, pause_seconds: null, pattern_code: null }] } as unknown as GeneratedXBloom;
const options = (response: () => Response) => ({ url: 'https://abc.supabase.co', publicKey: 'public-fixture', accessToken: 'token-fixture', fetcher: vi.fn(async () => response()) as never });
const LINK = 'https://share-h5.xbloom.com/?id=rN3687QQ5UyIyI5Xps9apg%3D%3D';
const reason = async (run: Promise<unknown>) => run.then(() => 'ok', e => e instanceof XBloomShareError ? e.reason : 'other');

it('builds a body the server accepts, filling gaps without inventing pours', () => {
  const parsed = parseShareRecipe(shareBody(recipe, '  Guji Hambela  ', 120).recipe);
  expect(parsed).toMatchObject({ model: 'Studio', dose: 15, grind: 57, rpm: 120, ratio: 16, name: 'Guji Hambela' });
  expect(parsed.pours[1]).toMatchObject({ volume: 195, temperature: 92, flow_rate: 3 });
  expect(shareBody(recipe, 'x', 500).recipe).not.toHaveProperty('rpm');
});
it('returns only an xBloom share link and maps failures', async () => {
  expect(await shareToXBloom(options(() => new Response(JSON.stringify({ status: 'ok', link: LINK }))), recipe, 'Guji')).toBe(LINK);
  expect(await reason(shareToXBloom(options(() => new Response(JSON.stringify({ link: 'https://evil.example/?id=abcdefgh' }))), recipe, 'x'))).toBe('unavailable');
  expect(await reason(shareToXBloom(options(() => new Response('{"error":"SHARE_DISABLED"}', { status: 503 })), recipe, 'x'))).toBe('disabled');
  expect(await reason(shareToXBloom(options(() => new Response('{}', { status: 429 })), recipe, 'x'))).toBe('rate');
  expect(await reason(shareToXBloom(options(() => new Response('{}', { status: 401 })), recipe, 'x'))).toBe('signin');
  expect(await reason(shareToXBloom(options(() => new Response('{}', { status: 502 })), recipe, 'x'))).toBe('unavailable');
  expect(await reason(shareToXBloom({ ...options(() => new Response('{}')), accessToken: '' }, recipe, 'x'))).toBe('signin');
  expect(await reason(shareToXBloom({ ...options(() => new Response('{}')), fetcher: (async () => { throw new TypeError('offline'); }) as never }, recipe, 'x'))).toBe('network');
});
