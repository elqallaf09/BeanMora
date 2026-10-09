import { useContext, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { View } from './native';
import { catalogScope, supabase } from './client';
import { Action, Field, Language, Txt, styles } from './ui';
import { SelectionMenu } from './SelectionMenu';
import { chooseSocialMedia, MediaChoices, SocialMediaView } from './SocialMedia';
import { saveCommunityPost, uploadSocialMedia, type SocialMedia } from './core/community-social';
import { contentMediaPath } from './core/content-media';

export type EditablePost = { id: string; body: string | null; primary_media_path?: string | null; content_type?: 'topic' | 'image' | 'video'; media?: { url: string; media_type: 'image' | 'video' }[]; brew_log_id: string | null; recipe_id: string | null; roast_profile_id: string | null };
export function PostComposer({ owner, brews, post, saved, close }: { owner: string; brews: { id: string; label: string }[]; post?: EditablePost | null; saved: () => void; close: () => void }) {
  const locale = useContext(Language), ar = locale === 'ar';
  const [body, setBody] = useState(post?.body ?? ''), [media, setMedia] = useState<SocialMedia | null>(null), [brewId, setBrewId] = useState<string | null>(null);
  const [path, setPath] = useState(post?.primary_media_path ?? null), [type, setType] = useState<'image' | 'video' | null>(post?.content_type === 'image' || post?.content_type === 'video' ? post.content_type : null);
  const [mediaChanged, setMediaChanged] = useState(false);
  const legacyMedia = !mediaChanged && !path ? post?.media ?? [] : [];
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const id = useRef(post?.id ?? randomUUID()), sending = useRef(false);
  async function choose(kind: 'image' | 'video') {
    setBusy(true); setError('');
    try { const selected = await chooseSocialMedia(kind); if (selected) { setMedia(selected); setType(kind); setPath(null); setMediaChanged(true); } }
    catch { setError(ar ? 'اختر صورة حتى 5 MB أو فيديو MP4 / WebM حتى 15 MB.' : 'Choose a photo up to 5 MB or MP4 / WebM video up to 15 MB.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!supabase || sending.current) return; sending.current = true; setBusy(true); setError('');
    try {
      const nextPath = media ? await uploadSocialMedia(supabase, owner, 'post-media', media) : path;
      await saveCommunityPost(supabase, owner, { id: id.current, body, language: locale, path: nextPath, type, brewId: post?.brew_log_id ?? brewId, replaceMedia: !post || mediaChanged });
      if (post && mediaChanged) {
        const oldPaths = [...new Set([post.primary_media_path, ...(post.media ?? []).map(m => { const target = contentMediaPath(m.url, catalogScope); return target?.bucket === 'post-media' ? target.path : null; })].filter((p): p is string => Boolean(p && p.startsWith(owner + '/') && p !== nextPath)))];
        if (oldPaths.length) await supabase.storage.from('post-media').remove(oldPaths);
      }
      saved();
    } catch { setError(ar ? 'تعذّر حفظ المنشور. مسودتك محفوظة هنا للمحاولة مرة ثانية.' : 'Could not save post. Your draft is kept here for retry.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <View testID="community-composer" style={[styles.card, { padding: 16, gap: 12 }]}>
    <Txt heading style={styles.subtitle}>{post ? (ar ? 'تعديل المنشور' : 'Edit post') : (ar ? 'منشور جديد' : 'New post')}</Txt>
    <Field label={ar ? 'اكتب تجربتك' : 'Write your experience'} value={body} onChangeText={setBody} multiline maxLength={3000} editable={!busy} />
    <MediaChoices choose={kind => void choose(kind)} disabled={busy} />
    {media || path || legacyMedia.length ? <>
      {media || path ? <SocialMediaView source={media?.uri ?? 'storage://post-media/' + path} type={type ?? 'image'} label={ar ? 'وسائط المنشور' : 'Post media'} /> : legacyMedia.map(m => <SocialMediaView key={m.url} source={m.url} type={m.media_type} label={ar ? 'وسائط المنشور' : 'Post media'} />)}
      <Action compact title={ar ? 'إزالة الوسائط' : 'Remove media'} disabled={busy} onPress={() => { setMedia(null); setPath(null); setType(null); setMediaChanged(true); }} />
    </> : <Txt style={styles.muted}>{ar ? 'موضوع، صورة أو فيديو عن القهوة.' : 'A topic, photo or video about coffee.'}</Txt>}
    {!post && brews.length ? <SelectionMenu label={ar ? 'إرفاق تحضير (اختياري)' : 'Attach brew (optional)'} value={brewId ?? 'none'} items={[{ id: 'none', name: ar ? 'بدون تحضير' : 'No brew attached' }, ...brews.map(b => ({ id: b.id, name: b.label }))]} onChange={value => setBrewId(value === 'none' ? null : value)} /> : null}
    <Action selected title={busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : post ? (ar ? 'حفظ تعديل المنشور' : 'Save post changes') : (ar ? 'انشر التجربة' : 'Publish')} disabled={busy || (!body.trim() && !media && !path && !legacyMedia.length && !brewId && !post?.recipe_id && !post?.roast_profile_id && !post?.brew_log_id)} onPress={() => void save()} />
    <Action compact title={ar ? 'إغلاق المحرر' : 'Close composer'} disabled={busy} onPress={close} />
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
  </View>;
}
