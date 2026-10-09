import { useContext, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { AppState, ScrollView, View } from './native';
import { supabase } from './client';
import { Action, Field, Language, Txt, colors, styles } from './ui';
import { MemberAvatar } from './MemberAvatar';
import { memberDirectory, type MemberIdentity } from './core/member-social';
import { startDirect, sendDirect, type DirectConversation, type DirectMessage } from './core/community-social';
import { RecordVoice, VoicePlayback, type VoiceDraft } from './VoiceMessage';

export function DirectMessages({ owner, recipient, sharedPost, login, openPost, openMember }: {
  owner: string | null; recipient?: MemberIdentity | null; sharedPost?: string | null;
  login: () => void; openPost: (id: string) => void; openMember: (username: string) => void;
}) {
  const ar = useContext(Language) === 'ar';
  const [threads, setThreads] = useState<DirectConversation[]>([]), [profiles, setProfiles] = useState<Record<string, MemberIdentity>>({});
  const [selected, setSelected] = useState<{ id: string; person: MemberIdentity } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]), [offset, setOffset] = useState(0), [more, setMore] = useState(false);
  const [query, setQuery] = useState(''), [people, setPeople] = useState<MemberIdentity[]>([]), [compose, setCompose] = useState(Boolean(sharedPost));
  const [body, setBody] = useState(''), [voice, setVoice] = useState<VoiceDraft | null>(null), [postToShare, setPostToShare] = useState(sharedPost ?? null);
  const [busy, setBusy] = useState(false), [allowed, setAllowed] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [recording, setRecording] = useState(false), [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const alive = useRef(true), sending = useRef(false), messageAttempt = useRef<string | null>(null), opened = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const fail = () => { if (alive.current) setError(ar ? 'تعذّر إكمال العملية. قد تكون الرسائل مغلقة أو للمتابعين فقط. احتفظنا بمسودتك للمحاولة.' : 'Could not complete the action. Messages may be closed or restricted to followers. Your draft is kept for retry.'); };
  async function start(person: MemberIdentity) {
    if (!owner || !supabase || busy) return;
    setBusy(true); setError('');
    try {
      const id = await startDirect(supabase, owner, person.id);
      if (alive.current) { setSelected({ id, person }); setOffset(0); setMessages([]); setCompose(false); setAllowed(true); }
    } catch { fail(); } finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { if (recipient && owner && !opened.current) { opened.current = true; void start(recipient); } }, [recipient, owner]);
  useEffect(() => {
    if (!owner || !supabase || selected) return;
    let active = true;
    const db = supabase;
    async function load() {
      const { data, error: e } = await db.from('direct_conversations').select('id,user_a,user_b,created_at').order('created_at', { ascending: false }).limit(100);
      if (e) { if (active) fail(); return; }
      const rows = (data ?? []) as DirectConversation[], ids = [...new Set(rows.map(t => t.user_a === owner ? t.user_b : t.user_a))];
      const members = ids.length ? await db.from('profiles').select('id,name,username,avatar_url,is_private').in('id', ids) : { data: [], error: null };
      if (active) { setThreads(rows); setProfiles(Object.fromEntries((members.data ?? []).map(p => [p.id, p as MemberIdentity]))); }
    }
    void load(); return () => { active = false; };
  }, [owner, selected, revision]);
  useEffect(() => {
    if (!owner || !supabase || !compose) return;
    let active = true;
    const timer = setTimeout(() => { void memberDirectory(supabase!, query).then(rows => { if (active) setPeople(rows.filter(p => p.id !== owner)); }).catch(fail); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, compose, owner]);
  useEffect(() => {
    if (!selected || !owner || !supabase) return;
    const db = supabase; let active = true, loading = false;
    const load = async () => {
      if (loading || AppState.currentState !== 'active') return;
      loading = true;
      try {
        const [result, permission] = await Promise.all([
          db.from('direct_messages').select('id,conversation_id,sender_id,kind,body,post_id,audio_path,duration_seconds,created_at,expires_at').eq('conversation_id', selected.id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, offset + 49),
          db.rpc('can_direct_message', { p_recipient: selected.person.id }),
        ]);
        if (result.error) throw result.error;
        if (active) { setMessages(((result.data ?? []) as DirectMessage[]).reverse()); setMore((result.data?.length ?? 0) === offset + 50); setAllowed(permission.data === true); }
      } catch { if (active) fail(); } finally { loading = false; }
    };
    void load(); const timer = setInterval(() => void load(), 5000);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void load(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [selected, owner, offset, revision]);
  async function send() {
    if (!owner || !supabase || !selected || sending.current || recording || !allowed) return;
    sending.current = true; setBusy(true); setError('');
    const id = messageAttempt.current ?? randomUUID(); messageAttempt.current = id;
    try {
      let path: string | null = null, seconds: number | null = null;
      if (voice) {
        const bytes = new Uint8Array(await (await fetch(voice.uri)).arrayBuffer());
        if (!bytes.length || bytes.length > 8 * 1024 * 1024 || voice.seconds > 60) throw new Error('VOICE_LIMIT');
        const mp4 = String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
        const mime = mp4 ? 'audio/mp4' : 'audio/webm', extension = mp4 ? 'm4a' : 'webm';
        path = `${owner}/${selected.id}/${id}.${extension}`;
        const { error: upload } = await supabase.storage.from('direct-audio').upload(path, bytes.slice().buffer, { contentType: mime, upsert: false });
        if (upload && !('statusCode' in upload && String(upload.statusCode) === '409')) throw upload;
        const verified = await supabase.functions.invoke('verify-direct-audio', { body: { path } });
        if (verified.error || !verified.data?.duration_seconds) throw verified.error ?? new Error('VOICE_VERIFY');
        seconds = verified.data.duration_seconds;
      }
      await sendDirect(supabase, owner, { id, conversation_id: selected.id, kind: voice ? 'audio' : postToShare ? 'post' : 'text', body: voice ? null : body.trim() || null, post_id: postToShare, audio_path: path, duration_seconds: seconds });
      if (alive.current) { setBody(''); setVoice(null); setPostToShare(null); messageAttempt.current = null; setRevision(n => n + 1); }
    } catch { fail(); } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  if (!owner) return <View style={{ padding: 18, gap: 12 }}><Txt>{ar ? 'سجّل دخولك لفتح الرسائل الخاصة.' : 'Sign in to open private messages.'}</Txt><Action title={ar ? 'تسجيل الدخول' : 'Sign in'} onPress={login} /></View>;
  return <ScrollView testID="direct-messages" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    <View style={[styles.row, { justifyContent: 'space-between', flexDirection: ar ? 'row-reverse' : 'row' }]}>
      <Txt heading style={styles.subtitle}>{ar ? 'الرسائل' : 'Messages'}</Txt>
      <Action compact title={selected ? (ar ? 'رجوع للرسائل' : 'Back to messages') : (ar ? 'رسالة جديدة' : 'New message')} disabled={busy} onPress={() => { setSelected(null); setCompose(!selected ? !compose : false); setBody(''); setVoice(null); messageAttempt.current = null; setError(''); }} />
    </View>
    <Txt style={styles.muted}>{ar ? 'كل رسالة تختفي بعد ٢٤ ساعة من إرسالها، بما فيها الصوت والمنشورات المشاركة.' : 'Every message disappears 24 hours after sending, including voice and shared posts.'}</Txt>
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {compose && !selected ? <View style={{ gap: 10 }}>
      <Field label={ar ? 'ابحث عن شخص' : 'Find a member'} value={query} onChangeText={setQuery} />
      {postToShare ? <Txt style={styles.muted}>{ar ? 'اختر الشخص لمشاركة المنشور معه.' : 'Choose someone to share this post with.'}</Txt> : null}
      {people.map(person => <Member key={person.id} person={person} press={() => void start(person)} />)}
      {!people.length ? <Txt style={styles.muted}>{ar ? 'ما لقينا حسابات.' : 'No accounts found.'}</Txt> : null}
    </View> : null}
    {!selected && !compose ? <View style={{ gap: 10 }}>{threads.map(thread => { const person = profiles[thread.user_a === owner ? thread.user_b : thread.user_a]; return person ? <Member key={thread.id} person={person} press={() => { setSelected({ id: thread.id, person }); setMessages([]); setOffset(0); setError(''); }} /> : null; })}{!threads.length ? <Txt style={styles.muted}>{ar ? 'ما عندك محادثات بعد.' : 'No conversations yet.'}</Txt> : null}<Action compact title={ar ? 'تحديث الرسائل' : 'Refresh messages'} onPress={() => setRevision(n => n + 1)} /></View> : null}
    {selected ? <>
      <Member person={selected.person} press={() => openMember(selected.person.username)} />
      {more ? <Action compact title={ar ? 'رسائل أقدم' : 'Older messages'} onPress={() => setOffset(n => n + 50)} /> : null}
      {messages.filter(message => Date.parse(message.expires_at) > clock).map(message => <View key={message.id} testID={'direct-message-' + message.id} style={{ alignSelf: message.sender_id === owner ? (ar ? 'flex-start' : 'flex-end') : (ar ? 'flex-end' : 'flex-start'), maxWidth: '90%', padding: 14, gap: 8, borderRadius: 16, backgroundColor: message.sender_id === owner ? '#E6EFEA' : colors.paper, borderWidth: 1, borderColor: colors.line }}>
        {message.body ? <Txt>{message.body}</Txt> : null}
        {message.kind === 'post' ? (message.post_id ? <Action compact title={ar ? 'فتح المنشور' : 'Open shared post'} onPress={() => openPost(message.post_id!)} /> : <Txt style={styles.muted}>{ar ? 'تم حذف المنشور.' : 'Post was deleted.'}</Txt>) : null}
        {message.kind === 'audio' && message.audio_path ? <VoicePlayback source={'storage://direct-audio/' + message.audio_path} seconds={message.duration_seconds ?? 0} expiresAt={message.expires_at} /> : null}
        <Txt style={{ fontSize: 11, color: colors.muted }}>{new Date(message.created_at).toLocaleTimeString(ar ? 'ar-KW-u-nu-latn' : 'en', { hour: '2-digit', minute: '2-digit' })}</Txt>
      </View>)}
      {allowed ? <View style={[styles.card, { padding: 14, gap: 10 }]}>
        {postToShare ? <View style={styles.row}><Txt>{ar ? 'منشور للمشاركة' : 'Post to share'}</Txt><Action compact title={ar ? 'إلغاء مشاركة المنشور' : 'Remove shared post'} onPress={() => { setPostToShare(null); messageAttempt.current = null; }} /></View> : null}
        {voice ? <><VoicePlayback source={voice.uri} seconds={voice.seconds} /><Action compact title={ar ? 'حذف التسجيل' : 'Discard recording'} disabled={busy} onPress={() => { setVoice(null); messageAttempt.current = null; }} /></> : <>
          <Field label={ar ? 'رسالتك' : 'Your message'} value={body} onChangeText={text => { setBody(text); messageAttempt.current = null; }} maxLength={3000} multiline editable={!busy && !recording} />
          {!postToShare ? <RecordVoice key={selected.id} disabled={busy} onRecordingChange={setRecording} saved={draft => { setVoice(draft); setBody(''); messageAttempt.current = null; }} /> : null}
        </>}
        <Action title={busy ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : (ar ? 'إرسال الرسالة' : 'Send message')} selected disabled={busy || recording || (!body.trim() && !voice && !postToShare)} onPress={() => void send()} />
      </View> : <Txt style={styles.muted}>{ar ? 'الرسائل لهذا الحساب مغلقة أو متاحة لمتابعيه فقط.' : 'Messages are closed or available only to this account’s followers.'}</Txt>}
      <Action compact title={ar ? 'حظر هذا الحساب' : 'Block this member'} disabled={busy} onPress={() => { if (!supabase) return; void supabase.from('blocks').upsert({ blocker_id: owner, blocked_id: selected.person.id }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }).then(result => { if (result.error) fail(); else { setAllowed(false); setRevision(n => n + 1); } }); }} />
    </> : null}
  </ScrollView>;
}
function Member({ person, press }: { person: MemberIdentity; press: () => void }) {
  return <View style={[styles.row, { paddingVertical: 6 }]}><MemberAvatar name={person.name} url={person.avatar_url} /><View style={{ flex: 1, minWidth: 0 }}><Action compact title={person.name + ' @' + person.username} onPress={press} /></View></View>;
}
