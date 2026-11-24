import type { createClient as supabaseCreateClient } from 'npm:@supabase/supabase-js@2.57.4';
import { MAX_SHARE_BODY_BYTES, SHARE_API, XBLOOM_API, SHARE_HOST, authForm, cloudRecipe, encryptForm, findShareLink, loginForm, matchesShared, parseShareRecipe, publicForm, recipeHash, shareId, shareLink, type ShareRecipe } from './cloud.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const DAILY_LIMIT = 20;
type Session = { memberId: number; token: string };
let cached: Session | null = null;
/** Test hook: forget the cached xBloom session. */
export const resetShareSession = () => { cached = null; };

export function createXBloomShareHandler(createClient: typeof supabaseCreateClient, env: (name: string) => string | undefined, fetcher: typeof fetch, now: () => number = Date.now) {
  const post = async (endpoint: string, body: string, referer = false): Promise<Record<string, unknown>> => {
    const response = await fetcher(XBLOOM_API + endpoint, {
      method: 'POST', body, signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json, text/plain, */*', ...(referer ? { Referer: SHARE_HOST } : {}) },
    });
    if (!response.ok) throw new Error('XBLOOM_HTTP');
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('XBLOOM_SHAPE');
    return data as Record<string, unknown>;
  };
  const login = async (email: string, password: string): Promise<Session> => {
    const data = await post('tMemberLogin.thtml', encryptForm(loginForm(email, password)));
    const memberId = Number((data.member as { tableId?: unknown })?.tableId), token = typeof data.token === 'string' ? data.token : '';
    if (data.result !== 'success' || !Number.isSafeInteger(memberId) || memberId <= 0 || !token) throw new Error('XBLOOM_LOGIN');
    return (cached = { memberId, token });
  };
  // The account's own recipe lists carry each recipe's share link. Ask the list
  // the way the app does (per machine), then unfiltered, and match by id or name.
  const locate = async (session: Session, recipe: ShareRecipe, cloudName: string, tableId: number | null): Promise<{ link: string | null; found: boolean; expired: boolean; keys: string[] }> => {
    const keys: string[] = [];
    for (const adaptedModel of [recipe.model === 'Original' ? 1 : 2, 0, recipe.model === 'Original' ? 2 : 1]) {
      const list = await post('tuMyTeaRecipeCreated.tuhtml', encryptForm({ ...authForm(session.memberId, session.token), pageNumber: 1, countPerPage: 100, ...(adaptedModel ? { adaptedModel } : {}) }));
      if (list.result !== 'success') return { link: null, found: false, expired: true, keys: Object.keys(list) };
      const items = Array.isArray(list.list) ? list.list as Record<string, unknown>[] : [];
      const mine = items.find(item => (tableId !== null && Number(item?.tableId) === tableId) || item?.theName === cloudName);
      keys.push(`list${adaptedModel}:${items.length}`, ...(mine ? Object.keys(mine) : Object.keys(items[0] ?? {}).map(key => '~' + key)));
      if (mine) return { link: findShareLink(mine), found: true, expired: false, keys };
    }
    return { link: null, found: false, expired: false, keys };
  };
  // Reuse a recipe an earlier, interrupted attempt already saved; otherwise save it.
  const save = async (session: Session, recipe: ShareRecipe, cloudName: string): Promise<{ link: string | null; expired: boolean; keys: string[] }> => {
    const before = await locate(session, recipe, cloudName, null);
    if (before.expired || before.link) return before;
    let tableId: number | null = null; let keys = before.keys;
    if (!before.found) {
      const added = await post('tuRecipeAdd.tuhtml', encryptForm({ ...authForm(session.memberId, session.token), ...cloudRecipe(recipe, cloudName, now()) }));
      if (added.result !== 'success') return { link: null, expired: false, keys: Object.keys(added) };
      const link = findShareLink(added);
      if (link) return { link, expired: false, keys: [] };
      tableId = Number.isSafeInteger(Number(added.tableId)) ? Number(added.tableId) : null;
      const after = await locate(session, recipe, cloudName, tableId);
      if (after.link) return after;
      keys = ['add', ...Object.keys(added), '|', ...after.keys];
    }
    return { link: null, expired: false, keys };
  };

  return async function handler(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const url = env('SUPABASE_URL'), anon = env('SUPABASE_ANON_KEY'), service = env('SUPABASE_SERVICE_ROLE_KEY');
    const email = env('XBLOOM_SHARE_EMAIL'), password = env('XBLOOM_SHARE_PASSWORD');
    if (!url || !anon || !service) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!bearer) return reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    const { data: { user } } = await createClient(url, anon).auth.getUser(bearer);
    if (!user || user.is_anonymous) return reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    if (env('XBLOOM_SHARE_ENABLED') !== 'true' || !email || !password) return reply({ error: 'SHARE_DISABLED' }, 503);

    let recipe: ShareRecipe;
    try {
      const text = await request.text();
      if (text.length > MAX_SHARE_BODY_BYTES) throw new Error('INVALID_INPUT');
      recipe = parseShareRecipe(JSON.parse(text)?.recipe);
    } catch { return reply({ error: 'INVALID_INPUT' }, 400); }

    const admin = createClient(url, service), hash = await recipeHash(recipe, user.id);
    const cloudName = `BM ${hash.slice(0, 8)} ${recipe.name}`.trim().slice(0, 50);
    const { data: existing, error: lookupError } = await admin.from('xbloom_shared_recipes').select('share_id').eq('recipe_hash', hash).eq('user_id', user.id).maybeSingle();
    if (lookupError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    if (existing?.share_id) {
      try {
        const detail = await post('RecipeDetail.html', JSON.stringify(publicForm(existing.share_id)), true);
        if (!matchesShared(detail, recipe, cloudName)) return reply({ error: 'SHARE_UNVERIFIED' }, 502);
        return reply({ status: 'ok', api: SHARE_API, link: shareLink(existing.share_id), reused: true });
      } catch { return reply({ error: 'SHARE_UNAVAILABLE' }, 502); }
    }

    const since = new Date(now() - 86400000).toISOString();
    const { count, error: countError } = await admin.from('xbloom_shared_recipes').select('recipe_hash', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
    if (countError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    if ((count ?? 0) >= DAILY_LIMIT) return reply({ error: 'RATE_LIMITED' }, 429);

    // Never steal a pending claim: an ambiguous external write may still complete.
    // Claim the hash first so two taps or a retry can never save the recipe twice.
    const { error: claimError } = await admin.from('xbloom_shared_recipes').insert({ recipe_hash: hash, user_id: user.id, model: recipe.model });
    if (claimError) return reply({ error: claimError.code === '23505' ? 'SHARE_IN_PROGRESS' : 'SERVICE_UNAVAILABLE' }, claimError.code === '23505' ? 409 : 503);
    // Preserve ambiguous claims for operator reconciliation; never blindly retry an external write.
    try {
      let result = await save(cached ?? await login(email, password), recipe, cloudName);
      if (result.expired) result = await save(await login(email, password), recipe, cloudName);
      const id = shareId(result.link);
      if (!id) {
        // Field names only, never values: shows where xBloom put the link if its app changed.
        console.error(JSON.stringify({ event: 'xbloom_share_link_missing', expired: result.expired, keys: result.keys.slice(0, 80) }));
        return reply({ error: 'SHARE_UNAVAILABLE' }, 502);
      }
      const detail = await post('RecipeDetail.html', JSON.stringify(publicForm(id)), true);
      if (!matchesShared(detail, recipe, cloudName)) { return reply({ error: 'SHARE_UNVERIFIED' }, 502); }
      const { data: stored, error: storeError } = await admin.from('xbloom_shared_recipes').update({ share_id: id }).eq('recipe_hash', hash).eq('user_id', user.id).select('share_id').maybeSingle();
      if (storeError || stored?.share_id !== id) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
      return reply({ status: 'ok', api: SHARE_API, link: shareLink(id), reused: false });
    } catch (failure) {
      console.error(JSON.stringify({ event: 'xbloom_share_failed', reason: failure instanceof Error ? failure.message.slice(0, 40) : 'unknown' }));
      return reply({ error: 'SHARE_UNAVAILABLE' }, 502);
    }
  };
}
