import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// A Vault token authorizes this one maintenance action. It is not a project API
// key and cannot grant access to accounts, messages or any other operation.
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== 'POST') return reply(405, { error: 'METHOD' });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return reply(401, { error: 'MAINTENANCE_AUTH' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  let result;
  if (/^[a-f0-9]{64}$/.test(token)) {
    const auth = await db.rpc('authorize_direct_cleanup', { p_token: token });
    if (auth.error || auth.data !== true) return reply(401, { error: 'MAINTENANCE_AUTH' });
    result = await db.rpc('purge_expired_direct_messages');
  } else {
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } });
    const identity = await caller.auth.getUser();
    if (identity.error || !identity.data.user || identity.data.user.is_anonymous) return reply(401, { error: 'MEMBER_REQUIRED' });
    let body; try { body = await req.json(); } catch { return reply(400, { error: 'CLEANUP_ACTION' }); }
    if (body.mode !== 'own_expired_audio' || body.owner !== identity.data.user.id) return reply(403, { error: 'OWN_AUDIO_ONLY' });
    result = await db.rpc('expired_direct_audio_for_owner', { p_owner: identity.data.user.id });
  }
  if (result.error) return reply(500, { error: 'EXPIRY_CLEANUP' });
  const paths = (result.data ?? []) as string[];
  if (paths.length) {
    // Use the Storage API; SQL-deleting storage.objects would leave file bytes.
    const removed = await db.storage.from('direct-audio').remove(paths);
    if (removed.error) return reply(500, { error: 'VOICE_CLEANUP_RETRY' });
    const done = await db.rpc('complete_direct_audio_cleanup', { p_paths: paths });
    if (done.error) return reply(500, { error: 'VOICE_CLEANUP_RETRY' });
  }
  return reply(200, { expired_audio_removed: paths.length });
});
