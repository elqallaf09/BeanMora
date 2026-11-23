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
  // Save, then read the link back from the account's own list if the save reply lacks it.
  const save = async (session: Session, recipe: ShareRecipe, cloudName: string): Promise<{ link: string | null; expired: boolean; keys: string[] }> => {
    const added = await post('tuRecipeAdd.tuhtml', encryptForm({ ...authForm(session.memberId, session.token), ...cloudRecipe(recipe, cloudName, now()) }));
    if (added.result !== 'success') return { link: null, expired: true, keys: Object.keys(added) };
    let link = findShareLink(added); let keys = Object.keys(added);
    if (!link) {
      const list = await post('tuMyTeaRecipeCreated.tuhtml', encryptForm({ ...authForm(session.memberId, session.token), pageNumber: 1, countPerPage: 100 }));
      const mine = Array.isArray(list.list) ? list.list.find((item: Record<string, unknown>) => item?.theName === cloudName) : null;
      link = findShareLink(mine); keys = [...keys, '|', ...Object.keys((mine as object) ?? {})];
    }
    return { link, expired: false, keys };
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

    const admin = createClient(url, service), hash = await recipeHash(recipe);
    const { data: existing, error: lookupError } = await admin.from('xbloom_shared_recipes').select('share_id').eq('recipe_hash', hash).maybeSingle();
    if (lookupError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    if (existing?.share_id) return reply({ status: 'ok', api: SHARE_API, link: shareLink(existing.share_id), reused: true });

    const since = new Date(now() - 86400000).toISOString();
    const { count, error: countError } = await admin.from('xbloom_shared_recipes').select('recipe_hash', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
    if (countError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    if ((count ?? 0) >= DAILY_LIMIT) return reply({ error: 'RATE_LIMITED' }, 429);

    // A claim abandoned by a crashed request must not block the recipe forever.
    await admin.from('xbloom_shared_recipes').delete().eq('recipe_hash', hash).is('share_id', null).lt('created_at', new Date(now() - 120000).toISOString());
    // Claim the hash first so two taps or a retry can never save the recipe twice.
    const { error: claimError } = await admin.from('xbloom_shared_recipes').insert({ recipe_hash: hash, user_id: user.id, model: recipe.model });
    if (claimError) return reply({ error: claimError.code === '23505' ? 'SHARE_IN_PROGRESS' : 'SERVICE_UNAVAILABLE' }, claimError.code === '23505' ? 409 : 503);
    const release = () => admin.from('xbloom_shared_recipes').delete().eq('recipe_hash', hash).is('share_id', null);
    try {
      const cloudName = `BM ${hash.slice(0, 8)} ${recipe.name}`.trim().slice(0, 50);
      let result = await save(cached ?? await login(email, password), recipe, cloudName);
      if (result.expired) result = await save(await login(email, password), recipe, cloudName);
      const id = shareId(result.link);
      if (!id) {
        // Field names only, never values: shows where xBloom put the link if its app changed.
        console.error(JSON.stringify({ event: 'xbloom_share_link_missing', expired: result.expired, keys: result.keys.slice(0, 80) }));
        await release();
        return reply({ error: 'SHARE_UNAVAILABLE' }, 502);
      }
      const detail = await post('RecipeDetail.html', JSON.stringify(publicForm(id)), true);
      if (!matchesShared(detail, recipe)) { await release(); return reply({ error: 'SHARE_UNVERIFIED' }, 502); }
      const { error: storeError } = await admin.from('xbloom_shared_recipes').update({ share_id: id }).eq('recipe_hash', hash);
      if (storeError) console.error(JSON.stringify({ event: 'xbloom_share_store_failed' }));
      return reply({ status: 'ok', api: SHARE_API, link: shareLink(id), reused: false });
    } catch (failure) {
      console.error(JSON.stringify({ event: 'xbloom_share_failed', reason: failure instanceof Error ? failure.message.slice(0, 40) : 'unknown' }));
      await release();
      return reply({ error: 'SHARE_UNAVAILABLE' }, 502);
    }
  };
}
