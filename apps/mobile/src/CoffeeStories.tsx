import { useLabels } from './ui';
import { useContext, useEffect, useState } from 'react';
import { ScrollView, Pressable, View } from './native';
import { supabase } from './client';
import { Action, Field, Icon, Language, Txt, colors, styles } from './ui';
import { StoryComposer, type StickerSource } from './StoryComposer';
import { parseStoryOverlays, type StorySticker } from './storyOverlays';
import { ConfirmDialog } from './ConfirmDialog';
import { StoryViewer } from './StoryViewer';
import { MemberAvatar } from './MemberAvatar';
import { SocialMediaView } from './SocialMedia';
import type { CoffeeStory, SocialSanction } from './core/community-social';
import type { MemberIdentity } from './core/member-social';

export function CoffeeStories({ owner, login, stickers = [], openSticker }: {
  owner: string | null; login: () => void;
  /** Recipes, coffees and roasteries a member can place on a story. */
  stickers?: StickerSource[];
  openSticker?: (sticker: StorySticker) => void;
}) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [rows, setRows] = useState<CoffeeStory[]>([]), [profiles, setProfiles] = useState<Record<string, MemberIdentity>>({});
  const [sanction, setSanction] = useState<SocialSanction | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<CoffeeStory | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0), [confirmDelete, setConfirmDelete] = useState<CoffeeStory | null>(null), [reporting, setReporting] = useState<CoffeeStory | null>(null);
  useEffect(() => {
    if (!supabase) return; let active = true; const db = supabase;
    void (async () => {
      const [feed, mine, status] = await Promise.all([
        db.from('coffee_stories').select('*').eq('status', 'approved').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60),
        owner ? db.from('coffee_stories').select('*').eq('user_id', owner).eq('status', 'approved').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
        owner ? db.from('social_sanctions').select('strikes,banned_at,reason').eq('user_id', owner).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (feed.error || mine.error) throw feed.error ?? mine.error;
      const items = [...new Map([...(mine.data ?? []), ...(feed.data ?? [])].map(s => [s.id, s as CoffeeStory])).values()];
      const ids = [...new Set(items.map(s => s.user_id))];
      const people = ids.length ? await db.from('profiles').select('id,name,username,avatar_url,is_private').in('id', ids) : { data: [] };
      if (active) { setRows(items); setProfiles(Object.fromEntries((people.data ?? []).map(p => [p.id, p as MemberIdentity]))); setSanction(status.data); }
    })().catch(() => { if (active) setError(ar ? 'تعذّر تحميل القصص. حاول التحديث.' : i18nUi('تعذّر تحميل القصص. حاول التحديث.', 'Could not load stories. Try refreshing.')); });
    return () => { active = false; };
  }, [owner, revision, ar, i18nUi]);
  const visibleStories = rows.filter(s => s.status === 'approved' && s.expires_at && Date.parse(s.expires_at) > Date.now()).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const authors = [...new Set(visibleStories.map(s => s.user_id))];
  async function deleteStory() {
    if (!supabase || !owner || !confirmDelete || busy) return;
    setBusy(true); setError('');
    try {
      const result = await supabase.from('coffee_stories').delete().eq('id', confirmDelete.id).eq('user_id', owner).select('id').single();
      if (result.error || result.data?.id !== confirmDelete.id) throw result.error;
      await supabase.storage.from('coffee-stories').remove([confirmDelete.media_path]);
      setSelected(null); setConfirmDelete(null); setRevision(n => n + 1);
    } catch { setError(ar ? 'تعذّر حذف القصة.' : i18nUi('تعذّر حذف القصة.', 'Could not delete story.')); }
    finally { setBusy(false); }
  }
  async function reportStory() {
    if (!supabase || !owner || !reporting || busy) return;
    setBusy(true); setError('');
    try {
      const result = await supabase.from('reports').insert({ reporter_id: owner, target_type: 'story', target_id: reporting.id, reason: 'off_topic' });
      if (result.error) throw result.error;
      setNotice(ar ? 'تم إرسال البلاغ. تُرسل التحذيرات عند تأكيد المخالفة.' : i18nUi('تم إرسال البلاغ. تُرسل التحذيرات عند تأكيد المخالفة.', 'Report sent. Warnings follow confirmed violations.')); setReporting(null); setSelected(null);
    } catch { setError(ar ? 'تعذّر إرسال البلاغ.' : i18nUi('تعذّر إرسال البلاغ.', 'Could not send report.')); }
    finally { setBusy(false); }
  }
  const deleteDialog = <ConfirmDialog inline={Boolean(selected)} visible={Boolean(confirmDelete)} title={ar ? 'حذف القصة' : i18nUi('حذف القصة', 'Delete story')} message={ar ? 'تأكيد حذف هذه القصة؟' : i18nUi('تأكيد حذف هذه القصة؟', 'Delete this story?')} confirmLabel={ar ? 'تأكيد حذف القصة' : i18nUi('تأكيد حذف القصة', 'Confirm delete story')} busy={busy} error={error} onCancel={() => setConfirmDelete(null)} onConfirm={() => void deleteStory()} />;
  const reportDialog = <ConfirmDialog inline={Boolean(selected)} visible={Boolean(reporting)} title={ar ? 'بلاغ عن القصة' : i18nUi('بلاغ عن القصة', 'Report story')} message={ar ? 'إرسال بلاغ أن القصة خارج موضوع القهوة؟' : i18nUi('إرسال بلاغ أن القصة خارج موضوع القهوة؟', 'Report this story as unrelated to coffee?')} confirmLabel={ar ? 'إرسال البلاغ' : i18nUi('إرسال البلاغ', 'Send report')} busy={busy} error={error} onCancel={() => setReporting(null)} onConfirm={() => void reportStory()} />;
  return <View testID="coffee-stories" style={{ gap: 10 }}>
    {sanction?.strikes ? <Txt accessibilityRole="alert" style={styles.error}>{sanction.banned_at ? (ar ? 'تم إيقاف المشاركة والرسائل بسبب تكرار نشر محتوى خارج موضوع القهوة.' : i18nUi('تم إيقاف المشاركة والرسائل بسبب تكرار نشر محتوى خارج موضوع القهوة.', 'Community participation and messages are suspended after repeated off-topic stories.')) : (ar ? 'تحذير: قصصك يجب أن تخص القهوة أو التحضير أو المعدات. تكرار المخالفة يوقف المشاركة والرسائل.' : i18nUi('تحذير: قصصك يجب أن تخص القهوة أو التحضير أو المعدات. تكرار المخالفة يوقف المشاركة والرسائل.', 'Warning: stories must show coffee, brewing or equipment. Another confirmed violation suspends participation and messages.'))}</Txt> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, alignItems: 'center', paddingVertical: 4, flexDirection: ar ? 'row-reverse' : 'row', flexGrow: 1 }}>
      <Pressable testID="add-coffee-story" accessibilityRole="button" accessibilityLabel={ar ? 'إضافة قصتي' : i18nUi('إضافة قصتي', 'Add my story')} accessibilityState={{disabled:Boolean(sanction?.banned_at)}} disabled={Boolean(sanction?.banned_at)} onPress={() => { if (!owner) login(); else { setOpen(v => !v); setSelected(null); } }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.copper, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip, opacity: sanction?.banned_at ? 0.4 : 1 }}>
        <Icon name="story" size={34} color={colors.teal}/><View style={{position:'absolute',bottom:-2,right:-2,width:22,height:22,borderRadius:11,backgroundColor:colors.teal,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:colors.paper}}><Icon name="plus" size={14} color="#FFFFFF"/></View>
      </Pressable>
      {authors.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={(ar ? 'قصة ' : i18nUi('قصة ', 'Story by ')) + (profiles[id]?.name ?? '')} onPress={() => { setSelected(visibleStories.find(s => s.user_id === id)!); setOpen(false); setError(''); }} style={{ alignItems: 'center', gap: 3, minWidth: 60 }}>
        <View style={{borderWidth:2,borderColor:colors.teal,borderRadius:30,padding:3}}><MemberAvatar name={profiles[id]?.name ?? ''} url={profiles[id]?.avatar_url} size={46} /></View>
        <Txt numberOfLines={1} style={{ maxWidth: 84, fontSize: 11 }}>{profiles[id]?.name ?? (ar ? 'عضو' : i18nUi('عضو', 'Member'))}</Txt>
      </Pressable>)}
    </ScrollView>
    {notice ? <View accessibilityLiveRegion="polite"><Txt style={styles.success}>{notice}</Txt></View> : null}
    {error ? <View><Txt accessibilityRole="alert" style={styles.error}>{error}</Txt><Action compact title={ar ? 'تحديث القصص' : i18nUi('تحديث القصص', 'Refresh stories')} onPress={() => { setError(''); setRevision(n => n + 1); }} /></View> : null}
    {open && owner ? <StoryComposer owner={owner} stickers={stickers} close={() => setOpen(false)}
      published={count => { if (count) { setOpen(false); setNotice(count > 1 ? i18nUi(`تم نشر ${count} قصص. تظهر لمدة 24 ساعة.`, `${count} stories published for 24 hours.`) : ar ? 'تم نشر قصتك. تظهر لمدة 24 ساعة.' : i18nUi('تم نشر قصتك. تظهر لمدة 24 ساعة.', 'Your story is published for 24 hours.')); } setRevision(n => n + 1); }} /> : null}
    {selected ? <StoryViewer key={selected.id} stories={visibleStories} initialId={selected.id} profiles={profiles} owner={owner} close={() => setSelected(null)} remove={setConfirmDelete} report={setReporting} busy={busy} openSticker={openSticker} suspended={Boolean(confirmDelete || reporting)} overlay={<>{deleteDialog}{reportDialog}</>} /> : <>{deleteDialog}{reportDialog}</>}
  </View>;
}

export function StoryModeration({ owner }: { owner: string }) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [rows, setRows] = useState<CoffeeStory[]>([]), [open, setOpen] = useState(false), [authorized, setAuthorized] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reason, setReason] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => { if (!supabase) return; let active = true; void supabase.rpc('can_review_coffee_stories').then(result => { if (active) setAuthorized(result.data === true); }); return () => { active = false; }; }, [owner]);
  useEffect(() => {
    if (!supabase || !authorized || !open) return;
    let active = true; const db = supabase;
    void (async () => {
      const reports = await db.from('reports').select('target_id').eq('target_type', 'story').eq('status', 'open').order('created_at').limit(100);
      if (reports.error) throw reports.error;
      const ids = [...new Set((reports.data ?? []).map(r => r.target_id))];
      const [unreviewed, reported] = await Promise.all([
        db.from('coffee_stories').select('*').in('status', ['approved', 'pending']).is('reviewed_at', null).order('created_at').limit(50),
        ids.length ? db.from('coffee_stories').select('*').in('id', ids).eq('status', 'approved') : Promise.resolve({ data: [], error: null }),
      ]);
      if (unreviewed.error || reported.error) throw unreviewed.error ?? reported.error;
      if (active) setRows([...new Map([...(reported.data ?? []), ...(unreviewed.data ?? [])].map(row => [row.id, row as CoffeeStory])).values()]);
    })().catch(() => { if (active) setError(ar ? 'تعذّر تحميل قائمة المراجعة.' : i18nUi('تعذّر تحميل قائمة المراجعة.', 'Could not load review queue.')); });
    return () => { active = false; };
  }, [authorized, open, revision, ar, i18nUi]);
  async function review(id: string, approve: boolean) {
    if (!supabase || busy) return; setBusy(true); setError('');
    try { const result = await supabase.rpc('review_coffee_story', { p_id: id, p_approve: approve, p_reason: reason.trim() }); if (result.error) throw result.error; setReason(''); setRevision(n => n + 1); }
    catch { setError(ar ? 'تعذّر تأكيد المراجعة. أعد المحاولة.' : i18nUi('تعذّر تأكيد المراجعة. أعد المحاولة.', 'Could not confirm review. Try again.')); } finally { setBusy(false); }
  }
  if (!authorized) return null;
  return <View style={{ gap: 10 }}><Action title={ar ? 'مراجعة قصص القهوة' : i18nUi('مراجعة قصص القهوة', 'Review coffee stories')} onPress={() => setOpen(!open)} />{open ? <>
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
    <Txt style={styles.muted}>{ar ? 'راجع الوسائط نفسها قبل القرار. رفض محتوى خارج موضوع القهوة يسجّل مخالفة: تحذير أولًا ثم إيقاف عند التكرار.' : i18nUi('راجع الوسائط نفسها قبل القرار. رفض محتوى خارج موضوع القهوة يسجّل مخالفة: تحذير أولًا ثم إيقاف عند التكرار.', 'Inspect the media before deciding. Off-topic rejection records a strike: warning first, then suspension after repetition.')}</Txt>
    {rows.map(story => <View key={story.id} style={[styles.card, { padding: 12, gap: 10 }]}><SocialMediaView source={'storage://coffee-stories/' + story.media_path} type={story.media_type} label={story.caption || 'Coffee story review'} /><Txt>{story.caption}</Txt>{/* Text and stickers are part of what members see, so the reviewer reads them too. */}{parseStoryOverlays(story.overlays)?.items.map((item, i) => <Txt key={i} style={styles.muted}>{(item.kind === 'text' ? i18nUi('نص على القصة: ', 'Text on story: ') + item.text : i18nUi('ملصق: ', 'Sticker: ') + item.label)}</Txt>)}<Field label={ar ? 'سبب المخالفة المؤكدة' : i18nUi('سبب المخالفة المؤكدة', 'Reason for confirmed violation')} value={reason} onChangeText={setReason} maxLength={1000} /><Action title={ar ? 'اعتماد القصة' : i18nUi('اعتماد القصة', 'Approve story')} disabled={busy} onPress={() => void review(story.id, true)} /><Action title={ar ? 'رفض: خارج موضوع القهوة' : i18nUi('رفض: خارج موضوع القهوة', 'Reject: off-topic')} disabled={busy || reason.trim().length < 3} onPress={() => void review(story.id, false)} /></View>)}
    {!rows.length ? <Txt style={styles.muted}>{ar ? 'تمت مراجعة جميع القصص.' : i18nUi('تمت مراجعة جميع القصص.', 'All stories have been reviewed.')}</Txt> : null}
  </> : null}</View>;
}
