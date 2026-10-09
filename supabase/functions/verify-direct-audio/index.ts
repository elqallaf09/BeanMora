import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { voiceDuration } from './duration.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  if (req.method !== 'POST') return reply(405, { error: 'METHOD' });
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return reply(401, { error: 'MEMBER_REQUIRED' });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: userError } = await caller.auth.getUser();
  const user = identity.user;
  if (userError || !user || user.is_anonymous) return reply(401, { error: 'MEMBER_REQUIRED' });
  try {
    const { path } = await req.json();
    if (typeof path !== 'string' || !new RegExp(`^${user.id}/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(m4a|webm)$`, 'i').test(path)) return reply(400, { error: 'VOICE_PATH' });
    const conversationId = path.split('/')[1];
    const { data: conversation, error } = await caller.from('direct_conversations').select('user_a,user_b').eq('id', conversationId).single();
    if (error || !conversation) return reply(403, { error: 'CONVERSATION_PRIVATE' });
    const recipient = conversation.user_a === user.id ? conversation.user_b : conversation.user_a;
    const permission = await caller.rpc('can_direct_message', { p_recipient: recipient });
    if (permission.error || permission.data !== true) return reply(403, { error: 'MESSAGES_CLOSED' });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const object = await admin.rpc('direct_audio_object_identity', { p_owner: user.id, p_path: path });
    if (object.error || typeof object.data !== 'string') return reply(400, { error: 'VOICE_FILE' });
    const download = await caller.storage.from('direct-audio').download(path);
    if (download.error || !download.data) return reply(400, { error: 'VOICE_FILE' });
    if (download.data.size > 8388608) return reply(400, { error: 'VOICE_SIZE' });
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const seconds = voiceDuration(bytes);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
    // Both identity observations must refer to the exact object downloaded.
    const recorded = await admin.rpc('record_direct_voice_check', { p_owner: user.id, p_path: path, p_seconds: seconds, p_sha256: hash, p_expected_object_id: object.data });
    if (recorded.error) return reply(500, { error: 'VOICE_CHECK_SAVE' });
    return reply(200, { duration_seconds: recorded.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'VOICE_FORMAT';
    return reply(400, { error: message === 'VOICE_LIMIT' ? 'VOICE_LIMIT' : 'VOICE_FORMAT' });
  }
});
