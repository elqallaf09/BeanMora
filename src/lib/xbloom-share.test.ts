// @vitest-environment node
import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudRecipe, encryptForm, findShareLink, matchesShared, parseShareRecipe, recipeHash, rsaEncrypt, rsaKey, shareId } from '../../supabase/functions/xbloom-share/cloud';
import { createXBloomShareHandler, resetShareSession } from '../../supabase/functions/xbloom-share/handler';

const recipe = { model: 'Studio', cup: 'Omni', dose: 15, grind: 57, rpm: 100, name: 'Guji', pours: [
  { volume: 45, temperature: 92, flow_rate: 3, pause_seconds: 40, pattern_code: 2 }, { volume: 195, temperature: 91, flow_rate: 3.5, pause_seconds: 5, pattern_code: 3 }] };
const LINK = 'https://share-h5.xbloom.com/?id=rN3687QQ5UyIyI5Xps9apg%3D%3D';

describe('xBloom cloud encoding', () => {
  it('reads the client public key and produces PKCS#1 v1.5 blocks a private key can open', () => {
    expect(rsaKey().size).toBe(128); expect(rsaKey().e).toBe(65537n);
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
    const key = rsaKey(publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
    const message = new TextEncoder().encode(JSON.stringify({ text: 'قهوة '.repeat(40) }));
    const cipher = rsaEncrypt(message, key);
    expect(cipher.length % 128).toBe(0); expect(cipher.length).toBe(Math.ceil(message.length / 117) * 128);
    const plain: number[] = [];
    for (let at = 0; at < cipher.length; at += 128) {
      const block = privateDecrypt({ key: privateKey, padding: constants.RSA_NO_PADDING }, Buffer.from(cipher.subarray(at, at + 128)));
      expect(block[0]).toBe(0); expect(block[1]).toBe(2);
      const end = block.indexOf(0, 2);
      expect(end).toBeGreaterThanOrEqual(10);
      plain.push(...block.subarray(end + 1));
    }
    expect(Buffer.from(plain).equals(Buffer.from(message))).toBe(true);
    expect(encryptForm({ a: 1 })).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
  it('accepts only plausible recipes and derives the ratio from the pours', () => {
    const parsed = parseShareRecipe(recipe);
    expect(parsed.ratio).toBe(16);
    const bad = (change: object) => { try { parseShareRecipe({ ...recipe, ...change }); return 'ok'; } catch { return 'bad'; } };
    expect(bad({ dose: 40 })).toBe('bad'); expect(bad({ grind: 81 })).toBe('bad'); expect(bad({ grind: 57.5 })).toBe('bad');
    expect(bad({ model: 'Original', dose: 10 })).toBe('bad'); expect(bad({ pours: [] })).toBe('bad'); expect(bad({ cup: 'V60' })).toBe('bad');
    expect(bad({ pours: [{ ...recipe.pours[0], temperature: 120 }] })).toBe('bad');
    expect(bad({ pours: [{ ...recipe.pours[0], volume: 20 }] })).toBe('bad');
    expect(parseShareRecipe({ ...recipe, name: '<b>x</b>\n' + 'y'.repeat(80) }).name.length).toBeLessThanOrEqual(40);
  });
  it('maps to the cloud schema: ratio in grandWater, 1/2 booleans, model and cup codes', () => {
    const body = cloudRecipe(parseShareRecipe(recipe), 'BM test', 1);
    expect(body).toMatchObject({ theName: 'BM test', dose: 15, grandWater: 16, grinderSize: 57, cupType: 2, adaptedModel: 2, isSetGrinderSize: 1, isEnableBypassWater: 2 });
    const pours = JSON.parse(body.pourDataJSONStr as string);
    expect(pours).toHaveLength(2); expect(pours[0]).toMatchObject({ theName: 'Bloom', volume: 45, pattern: 2, pausing: 40, isEnableVibrationAfter: 2 });
    expect(cloudRecipe(parseShareRecipe({ ...recipe, model: 'Original', cup: 'xPod' }), 'x', 1)).toMatchObject({ cupType: 1, adaptedModel: 1 });
  });
  it('hashes the recipe, not its name, and only trusts share-h5 links', async () => {
    const a = await recipeHash(parseShareRecipe(recipe)), b = await recipeHash(parseShareRecipe({ ...recipe, name: 'Other' }));
    expect(a).toBe(b); expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await recipeHash(parseShareRecipe({ ...recipe, grind: 58 }))).not.toBe(a);
    expect(shareId(LINK)).toBe('rN3687QQ5UyIyI5Xps9apg==');
    expect(shareId('https://evil.example/?id=rN3687QQ5UyIyI5Xps9apg%3D%3D')).toBeNull();
    expect(shareId('https://share-h5.xbloom.com.evil.example/?id=abcdefgh')).toBeNull();
    expect(findShareLink({ recipeVo: { shareRecipeLink: LINK } })).toBe(LINK);
    expect(findShareLink({ info: LINK })).toBeNull();
    expect(matchesShared({ result: 'success', recipeVo: { dose: 15, grinderSize: 57, pourList: [{ volume: 45 }, { volume: 195 }] } }, parseShareRecipe(recipe))).toBe(true);
    expect(matchesShared({ result: 'success', recipeVo: { dose: 15, grinderSize: 57, pourList: [{ volume: 45 }, { volume: 190 }] } }, parseShareRecipe(recipe))).toBe(false);
  });
});

const env: Record<string, string> = { SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-fixture', SUPABASE_SERVICE_ROLE_KEY: 'server-fixture',
  XBLOOM_SHARE_ENABLED: 'true', XBLOOM_SHARE_EMAIL: 'fixture@example.test', XBLOOM_SHARE_PASSWORD: 'fixture-only' };
function fixture(options: { cloud?: (endpoint: string) => unknown; extraEnv?: Record<string, string>; used?: number } = {}) {
  const rows = new Map<string, Record<string, unknown>>();
  const detail = { result: 'success', recipeVo: { dose: 15, grinderSize: 57, pourList: [{ volume: 45 }, { volume: 195 }] } };
  const cloud = vi.fn(async (input: RequestInfo | URL) => {
    const endpoint = String(input).split('/').pop()!;
    const custom = options.cloud?.(endpoint);
    const body = custom !== undefined ? custom
      : endpoint === 'tMemberLogin.thtml' ? { result: 'success', token: 'session-fixture', member: { tableId: 7 } }
      : endpoint === 'tuRecipeAdd.tuhtml' ? { result: 'success', recipeVo: { tableId: 99, shareRecipeLink: LINK } }
      : endpoint === 'RecipeDetail.html' ? detail : { result: 'success', list: [] };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  const create = () => ({
    auth: { getUser: async (token: string) => ({ data: { user: token === 'bad' ? null : { id: token, is_anonymous: token === 'guest' } } }) },
    from() {
      let mode = 'select', value: Record<string, unknown> = {}, hash = '', head = false;
      const chain: Record<string, unknown> = {
        select(_c: string, o?: { head?: boolean }) { if (mode === 'select') head = !!o?.head; return chain; },
        insert(v: Record<string, unknown>) { mode = 'insert'; value = v; return chain; },
        update(v: Record<string, unknown>) { mode = 'update'; value = v; return chain; },
        delete() { mode = 'delete'; return chain; },
        eq(column: string, v: string) { if (column === 'recipe_hash') hash = v; return chain; },
        is() { return chain; }, lt() { mode = 'stale'; return chain; }, gte() { return chain; },
        async maybeSingle() { return { data: rows.get(hash) ?? null, error: null }; },
        then(resolve: (r: unknown) => unknown) {
          if (mode === 'select' && head) return Promise.resolve(resolve({ count: options.used ?? 0, error: null }));
          if (mode === 'insert') { if (rows.has(String(value.recipe_hash))) return Promise.resolve(resolve({ error: { code: '23505' } })); rows.set(String(value.recipe_hash), { ...value }); }
          if (mode === 'update') rows.set(hash, { ...rows.get(hash), ...value });
          if (mode === 'delete' && !rows.get(hash)?.share_id) rows.delete(hash);
          return Promise.resolve(resolve({ error: null }));
        },
      };
      return chain;
    },
  });
  const all = { ...env, ...options.extraEnv };
  const handler = createXBloomShareHandler(create as never, name => all[name], cloud as never, () => 1_800_000_000_000);
  const call = (token = 'user-1', body: unknown = { recipe }) => handler(new Request('https://example.test/functions/v1/xbloom-share', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
  return { call, cloud, rows };
}

describe('xbloom-share handler', () => {
  beforeEach(() => resetShareSession());
  it('saves once, verifies the public page, and reuses the link afterwards', async () => {
    const { call, cloud, rows } = fixture();
    const first = await call(); expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ status: 'ok', api: 1, link: LINK, reused: false });
    expect(cloud.mock.calls.map(c => String(c[0]).split('/').pop())).toEqual(['tMemberLogin.thtml', 'tuMyTeaRecipeCreated.tuhtml', 'tuMyTeaRecipeCreated.tuhtml', 'tuMyTeaRecipeCreated.tuhtml', 'tuRecipeAdd.tuhtml', 'RecipeDetail.html']);
    const sent = String((cloud.mock.calls[0][1] as RequestInit).body);
    expect(sent).not.toContain('fixture-only'); expect(sent).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const again = await call('user-2'); expect(await again.json()).toMatchObject({ link: LINK, reused: true });
    expect(cloud).toHaveBeenCalledTimes(6); expect(rows.size).toBe(1);
  });
  it('requires a signed-in account, valid input and an enabled service', async () => {
    expect((await fixture().call('')).status).toBe(401); expect((await fixture().call('guest')).status).toBe(401); expect((await fixture().call('bad')).status).toBe(401);
    expect((await fixture().call('user-1', { recipe: { ...recipe, grind: 99 } })).status).toBe(400);
    const off = fixture({ extraEnv: { XBLOOM_SHARE_ENABLED: 'false' } }); expect(await (await off.call()).json()).toEqual({ error: 'SHARE_DISABLED' }); expect(off.cloud).not.toHaveBeenCalled();
    const limited = fixture({ used: 20 }); expect((await limited.call()).status).toBe(429); expect(limited.cloud).not.toHaveBeenCalled();
  });
  it('reads the link from the account list by table id when the save reply has none', async () => {
    let listed = 0;
    const { call, cloud } = fixture({ cloud: endpoint => endpoint === 'tuRecipeAdd.tuhtml' ? { result: 'success', tableId: 99 }
      : endpoint === 'tuMyTeaRecipeCreated.tuhtml' ? { result: 'success', list: listed++ < 3 ? [] : [{ tableId: 5, theName: 'someone else', shareRecipeLink: 'https://share-h5.xbloom.com/?id=AAAAAAAAAAAA' }, { tableId: 99, theName: 'renamed by server', shareRecipeLink: LINK }] } : undefined });
    expect(await (await call()).json()).toMatchObject({ link: LINK, reused: false });
    expect(cloud.mock.calls.filter(c => String(c[0]).endsWith('tuRecipeAdd.tuhtml'))).toHaveLength(1);
  });
  it('reuses a recipe an interrupted attempt already saved instead of saving it twice', async () => {
    const name = `BM ${(await recipeHash(parseShareRecipe(recipe))).slice(0, 8)} Guji`;
    const { call, cloud } = fixture({ cloud: endpoint => endpoint === 'tuMyTeaRecipeCreated.tuhtml' ? { result: 'success', list: [{ tableId: 42, theName: name, shareRecipeLink: LINK }] } : undefined });
    expect((await call()).status).toBe(200);
    expect(cloud.mock.calls.some(c => String(c[0]).endsWith('tuRecipeAdd.tuhtml'))).toBe(false);
  });
  it('signs in again once when the cached xBloom session has expired', async () => {
    let lists = 0;
    const { call, cloud } = fixture({ cloud: endpoint => endpoint === 'tuMyTeaRecipeCreated.tuhtml' && lists++ === 0 ? { result: 'fail', code: 10001 } : undefined });
    expect((await call()).status).toBe(200);
    expect(cloud.mock.calls.filter(c => String(c[0]).endsWith('tMemberLogin.thtml'))).toHaveLength(2);
  });
  it('fails closed and releases the claim when no verifiable link comes back', async () => {
    const none = fixture({ cloud: endpoint => endpoint === 'tuRecipeAdd.tuhtml' ? { result: 'success' } : undefined });
    expect(await (await none.call()).json()).toEqual({ error: 'SHARE_UNAVAILABLE' }); expect(none.rows.size).toBe(0);
    resetShareSession();
    const wrong = fixture({ cloud: endpoint => endpoint === 'RecipeDetail.html' ? { result: 'success', recipeVo: { dose: 18, grinderSize: 57, pourList: [] } } : undefined });
    expect(await (await wrong.call()).json()).toEqual({ error: 'SHARE_UNVERIFIED' }); expect(wrong.rows.size).toBe(0);
    resetShareSession();
    const denied = fixture({ cloud: endpoint => endpoint === 'tMemberLogin.thtml' ? { result: 'fail', info: 'password' } : undefined });
    expect((await denied.call()).status).toBe(502); expect(denied.cloud).toHaveBeenCalledTimes(1);
  });
});
