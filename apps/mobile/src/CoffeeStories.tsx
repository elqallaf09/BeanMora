import { useContext, useEffect, useState } from 'react';
import { ScrollView, Pressable, View } from './native';
import { supabase } from './client';
import { Action, Field, Language, Txt, colors, styles } from './ui';
import { MemberAvatar } from './MemberAvatar';
import { SelectionMenu } from './SelectionMenu';
import { chooseSocialMedia, MediaChoices, SocialMediaView } from './SocialMedia';
import { submitCoffeeStory, type CoffeeStory, type SocialMedia, type SocialSanction } from './core/community-social';
import type { MemberIdentity } from './core/member-social';

export const storyCategories = [['coffee', 'القهوة', 'Coffee'], ['brewing', 'التحضير', 'Brewing'], ['equipment', 'المعدات', 'Equipment'], ['coffee_corner', 'ركن القهوة', 'Coffee corner']] as const;
export function CoffeeStories({ owner, login }: { owner: string | null; login: () => void }) {
  const ar = useContext(Language) === 'ar';
  const [rows, setRows] = useState<CoffeeStory[]>([]), [profiles, setProfiles] = useState<Record<string, MemberIdentity>>({});
  const [sanction, setSanction] = useState<SocialSanction | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<CoffeeStory | null>(null);
  const [draft, setDraft] = useState<SocialMedia | null>(null), [caption, setCaption] = useState(''), [category, setCategory] = useState<CoffeeStory['category']>('coffee'), [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0), [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!supabase) return; let active = true; const db = supabase;
    void (async () => {
      const [feed, mine, status] = await Promise.all([
        db.from('coffee_stories').select('*').eq('status', 'approved').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60),
        owner ? db.from('coffee_stories').select('*').eq('user_id', owner).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
        owner ? db.from('social_sanctions').select('strikes,banned_at,reason').eq('user_id', owner).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (feed.error || mine.error) throw feed.error ?? mine.error;
      const items = [...new Map([...(mine.data ?? []), ...(feed.data ?? [])].map(s => [s.id, s as CoffeeStory])).values()];
      const ids = [...new Set(items.map(s => s.user_id))];
      const people = ids.length ? await db.from('profiles').select('id,name,username,avatar_url,is_private').in('id', ids) : { data: [] };
      if (active) { setRows(items); setProfiles(Object.fromEntries((people.data ?? []).map(p => [p.id, p as MemberIdentity]))); setSanction(status.data); }
    })().catch(() => { if (active) setError(ar ? 'تعذّر تحميل القصص. حاول التحديث.' : 'Could not load stories. Try refreshing.'); });
    return () => { active = false; };
  }, [owner, revision, ar]);
  async function choose(type: 'image' | 'video', camera = false) {
    setError(''); setBusy(true);
    try { const media = await chooseSocialMedia(type, camera); if (media) { setDraft(media); setRights(false); } }
    catch { setError(ar ? 'اختر صورة حتى 5 MB أو فيديو MP4 / WebM حتى 15 MB، واسمح بالكاميرا عند التصوير.' : 'Choose a photo up to 5 MB or MP4 / WebM video up to 15 MB, and allow the camera when capturing.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!owner || !supabase || !draft || !rights || busy) return;
    setBusy(true); setError('');
    try { await submitCoffeeStory(supabase, owner, draft, category, caption); setDraft(null); setCaption(''); setRights(false); setOpen(false); setNotice(ar ? 'قصتك بانتظار المراجعة. تظهر 24 ساعة بعد الموافقة.' : 'Your story is awaiting review. It appears for 24 hours after approval.'); setRevision(n => n + 1); }
    catch { setError(ar ? 'تعذّر حفظ القصة. مسودتك موجودة للمحاولة مرة ثانية.' : 'Could not save story. Your draft is kept for retry.'); }
    finally { setBusy(false); }
  }
  return <View testID="coffee-stories" style={{ gap: 10 }}>
    {sanction?.strikes ? <Txt accessibilityRole="alert" style={styles.error}>{sanction.banned_at ? (ar ? 'تم إيقاف المشاركة والرسائل بسبب تكرار نشر محتوى خارج موضوع القهوة.' : 'Community participation and messages are suspended after repeated off-topic stories.') : (ar ? 'تحذير: قصصك يجب أن تخص القهوة أو التحضير أو المعدات. تكرار المخالفة يوقف المشاركة والرسائل.' : 'Warning: stories must show coffee, brewing or equipment. Another confirmed violation suspends participation and messages.')}</Txt> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, alignItems: 'center', paddingVertical: 4 }}>
      <Action compact title={ar ? 'قصتي +' : 'My story +'} disabled={Boolean(sanction?.banned_at)} onPress={() => { if (!owner) login(); else { setOpen(!open); setSelected(null); } }} />
      {rows.filter(s => s.user_id === owner || (s.status === 'approved' && s.expires_at && Date.parse(s.expires_at) > Date.now())).map(story => <Pressable key={story.id} accessibilityRole="button" accessibilityLabel={(ar ? 'قصة ' : 'Story by ') + (profiles[story.user_id]?.name ?? '')} onPress={() => { setSelected(story); setOpen(false); setConfirmDelete(false); setError(''); }} style={{ alignItems: 'center', gap: 3, minWidth: 60, borderWidth: 2, borderColor: story.status === 'approved' ? colors.teal : colors.line, borderRadius: 14, padding: 6 }}>
        <MemberAvatar name={profiles[story.user_id]?.name ?? ''} url={profiles[story.user_id]?.avatar_url} size={42} />
        <Txt numberOfLines={1} style={{ maxWidth: 92, fontSize: 11 }}>{profiles[story.user_id]?.name ?? (ar ? 'عضو' : 'Member')}</Txt>
        {story.user_id === owner && story.status !== 'approved' ? <Txt style={{ fontSize: 10, color: colors.muted }}>{story.status === 'pending' ? (ar ? 'قيد المراجعة' : 'Pending') : (ar ? 'مرفوضة' : 'Rejected')}</Txt> : null}
      </Pressable>)}
    </ScrollView>
    {notice ? <View accessibilityLiveRegion="polite"><Txt style={styles.success}>{notice}</Txt></View> : null}
    {error ? <View><Txt accessibilityRole="alert" style={styles.error}>{error}</Txt><Action compact title={ar ? 'تحديث القصص' : 'Refresh stories'} onPress={() => { setError(''); setRevision(n => n + 1); }} /></View> : null}
    {open ? <View style={[styles.card, { padding: 14, gap: 12 }]}>
      <Txt heading style={styles.subtitle}>{ar ? 'قصتك مع القهوة' : 'Your coffee story'}</Txt>
      <Txt style={styles.muted}>{ar ? 'للقهوة والتحضير والمعدات فقط. تُراجع القصة قبل ظهورها. أول مخالفة تحذير، وتكرارها حظر من المشاركة والرسائل.' : 'Coffee, brewing and equipment only. Stories are reviewed before publishing. A confirmed violation gives a warning; repetition suspends participation and messages.'}</Txt>
      <SelectionMenu label={ar ? 'موضوع القصة' : 'Story topic'} value={category} items={storyCategories.map(c => ({ id: c[0], name: c[ar ? 1 : 2] }))} onChange={v => setCategory(v as CoffeeStory['category'])} />
      <MediaChoices camera choose={(type, camera) => void choose(type, camera)} disabled={busy} />
      {draft ? <SocialMediaView source={draft.uri} type={draft.type} label={ar ? 'معاينة القصة' : 'Story preview'} /> : null}
      <Field label={ar ? 'وصف القصة' : 'Story caption'} value={caption} onChangeText={setCaption} maxLength={1000} editable={!busy} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rights }} disabled={busy} onPress={() => setRights(!rights)} style={[styles.row, { minHeight: 48, flexDirection: ar ? 'row-reverse' : 'row' }]}><Txt>{rights ? '☑' : '☐'}</Txt><Txt style={{ flex: 1 }}>{ar ? 'المحتوى يخص القهوة وأملك حق نشره' : 'This is coffee content and I have permission to share it'}</Txt></Pressable>
      <Action selected title={ar ? 'إرسال القصة للمراجعة' : 'Submit story for review'} disabled={busy || !draft || !rights} onPress={() => void publish()} />
      <Action compact title={ar ? 'إغلاق القصة' : 'Close story composer'} disabled={busy} onPress={() => setOpen(false)} />
    </View> : null}
    {selected ? <View style={[styles.card, { padding: 14, gap: 12 }]}>
      <SocialMediaView source={'storage://coffee-stories/' + selected.media_path} type={selected.media_type} label={selected.caption || (ar ? 'قصة قهوة' : 'Coffee story')} />
      {selected.caption ? <Txt>{selected.caption}</Txt> : null}
      {selected.review_reason ? <Txt style={styles.error}>{selected.review_reason}</Txt> : null}
      {selected.user_id === owner ? <>
        <Action compact title={ar ? 'حذف القصة' : 'Delete story'} onPress={() => setConfirmDelete(true)} />
        {confirmDelete ? <><Txt>{ar ? 'تأكيد حذف هذه القصة؟' : 'Delete this story?'}</Txt><Action title={ar ? 'تأكيد حذف القصة' : 'Confirm delete story'} disabled={busy} onPress={() => { if (!supabase || !owner) return; setBusy(true); void Promise.resolve(supabase.from('coffee_stories').delete().eq('id', selected.id).eq('user_id', owner).select('id').single()).then(async result => { if (result.error || result.data?.id !== selected.id) throw result.error; await supabase?.storage.from('coffee-stories').remove([selected.media_path]); setSelected(null); setRevision(n => n + 1); }).catch(() => setError(ar ? 'تعذّر حذف القصة.' : 'Could not delete story.')).finally(() => setBusy(false)); }} /><Action compact title={ar ? 'إلغاء الحذف' : 'Cancel deletion'} onPress={() => setConfirmDelete(false)} /></> : null}
      </> : owner ? <Action compact title={ar ? 'بلاغ: خارج موضوع القهوة' : 'Report off-topic story'} disabled={busy} onPress={() => { if (!supabase) return; setBusy(true); void Promise.resolve(supabase.from('reports').insert({ reporter_id: owner, target_type: 'story', target_id: selected.id, reason: 'off_topic' })).then(result => { if (result.error) throw result.error; setNotice(ar ? 'تم إرسال البلاغ للمراجعة.' : 'Report submitted for review.'); setSelected(null); }).catch(() => setError(ar ? 'تعذّر إرسال البلاغ.' : 'Could not submit report.')).finally(() => setBusy(false)); }} /> : null}
      <Action compact title={ar ? 'إغلاق القصة' : 'Close story'} onPress={() => setSelected(null)} />
    </View> : null}
  </View>;
}

export function StoryModeration({ owner }: { owner: string }) {
  const ar = useContext(Language) === 'ar';
  const [rows, setRows] = useState<CoffeeStory[]>([]), [open, setOpen] = useState(false), [authorized, setAuthorized] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reason, setReason] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => { if (!supabase) return; let active = true; void supabase.rpc('can_review_coffee_stories').then(result => { if (active) setAuthorized(result.data === true); }); return () => { active = false; }; }, [owner]);
  useEffect(() => { if (!supabase || !authorized || !open) return; let active = true; void supabase.from('coffee_stories').select('*').eq('status', 'pending').order('created_at').limit(50).then(result => { if (active) { if (result.error) setError(ar ? 'تعذّر تحميل المراجعات.' : 'Could not load review queue.'); else setRows((result.data ?? []) as CoffeeStory[]); } }); return () => { active = false; }; }, [authorized, open, revision, ar]);
  async function review(id: string, approve: boolean) {
    if (!supabase || busy) return; setBusy(true); setError('');
    try { const result = await supabase.rpc('review_coffee_story', { p_id: id, p_approve: approve, p_reason: reason.trim() }); if (result.error) throw result.error; setReason(''); setRevision(n => n + 1); }
    catch { setError(ar ? 'تعذّر تأكيد المراجعة. أعد المحاولة.' : 'Could not confirm review. Try again.'); } finally { setBusy(false); }
  }
  if (!authorized) return null;
  return <View style={{ gap: 10 }}><Action title={ar ? 'مراجعة قصص القهوة' : 'Review coffee stories'} onPress={() => setOpen(!open)} />{open ? <>
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
    <Txt style={styles.muted}>{ar ? 'راجع الوسائط نفسها قبل القرار. رفض محتوى خارج موضوع القهوة يسجّل مخالفة: تحذير أولًا ثم إيقاف عند التكرار.' : 'Inspect the media before deciding. Off-topic rejection records a strike: warning first, then suspension after repetition.'}</Txt>
    {rows.map(story => <View key={story.id} style={[styles.card, { padding: 12, gap: 10 }]}><SocialMediaView source={'storage://coffee-stories/' + story.media_path} type={story.media_type} label={story.caption || 'Coffee story review'} /><Txt>{story.caption}</Txt><Field label={ar ? 'سبب المخالفة المؤكدة' : 'Reason for confirmed violation'} value={reason} onChangeText={setReason} maxLength={1000} /><Action title={ar ? 'اعتماد القصة' : 'Approve story'} disabled={busy} onPress={() => void review(story.id, true)} /><Action title={ar ? 'رفض: خارج موضوع القهوة' : 'Reject: off-topic'} disabled={busy || reason.trim().length < 3} onPress={() => void review(story.id, false)} /></View>)}
    {!rows.length ? <Txt style={styles.muted}>{ar ? 'ما في قصص تنتظر المراجعة.' : 'No stories awaiting review.'}</Txt> : null}
  </> : null}</View>;
}
