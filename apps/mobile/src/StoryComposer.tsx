import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, View,
} from './native';
import { Action, Field, Icon, Language, Txt, colors, styles, useLabels, type IconName } from './ui';
import { supabase } from './client';
import { StoryTopics } from './StoryTopics';
import { chooseSocialMedia, MediaIcon } from './SocialMedia';
import { StoryGallery, storyGalleryAvailable } from './StoryGallery';
import { StoryOverlayLayer } from './StoryOverlayLayer';
import {
  MAX_STORY_ITEMS, MAX_STORY_TEXT, STORY_BACKGROUNDS, STORY_COLORS, solidPng, storyOverlaysPayload,
  type StoryItem, type StoryOverlays, type StorySticker, type StoryText,
} from './storyOverlays';
import { socialMediaType, submitCoffeeStory, type CoffeeStory, type SocialMedia } from './core/community-social';
import { normalizeSearch } from './core/deepSearch';

export type StickerSource = { ref: StorySticker['ref']; id: string; label: string; note?: string };
type Draft = { key: string; media: SocialMedia; overlays: StoryOverlays; textOnly: boolean; silent: boolean };
const MAX_BATCH = 6;
const emptyOverlays = (): StoryOverlays => ({ v: 1, items: [] });

function Tile({ icon, title, disabled, onPress }: { icon: ReactNode; title: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ width: 88, minHeight: 84, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF2B', backgroundColor: pressed ? '#FFFFFF24' : '#FFFFFF14',
        alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, opacity: disabled ? 0.45 : 1 })}>
      {icon}
      <Txt numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{title}</Txt>
    </Pressable>
  );
}
function Tool({ icon, label, title, active = false, disabled = false, onPress }: { icon?: IconName; label: string; title?: string; active?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress}
      style={{ minWidth: 44, minHeight: 44, paddingHorizontal: title ? 12 : 0, borderRadius: 22, backgroundColor: active ? '#167B7F' : '#000000A6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: disabled ? 0.4 : 1 }}>
      {icon ? <Icon name={icon} size={20} color="#FFFFFF" /> : null}
      {title ? <Txt style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{title}</Txt> : null}
    </Pressable>
  );
}
function Swatches({ values, value, label, onChange }: { values: readonly string[]; value: string; label: string; onChange: (colour: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {values.map((colour) => (
        <Pressable key={colour} accessibilityRole="radio" accessibilityLabel={label + ' ' + colour} accessibilityState={{ checked: value === colour }} aria-checked={value === colour}
          onPress={() => onChange(colour)} hitSlop={6}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colour, borderWidth: value === colour ? 3 : 1, borderColor: value === colour ? colors.teal : colors.line }} />
      ))}
    </View>
  );
}
function StagePreview({ draft }: { draft: Draft }) {
  if (draft.textOnly) return <View style={[StyleSheet.absoluteFill, { backgroundColor: draft.overlays.bg ?? STORY_BACKGROUNDS[0] }]} />;
  return draft.media.type === 'video'
    ? <StageVideo key={draft.media.uri} uri={draft.media.uri} silent={draft.silent} />
    : <Image source={{ uri: draft.media.uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />;
}
function StageVideo({ uri, silent }: { uri: string; silent: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = silent; p.play(); });
  useEffect(() => { try { player.muted = silent; } catch { /* released with the view */ } }, [player, silent]);
  return <VideoView player={player} nativeControls={false} contentFit="contain" style={StyleSheet.absoluteFill} />;
}

/** Full-screen story composer: choose or capture, then add text and coffee
 * stickers, and publish one story or several in a row. */
export function StoryComposer({ owner, stickers, close, published }: {
  owner: string; stickers: StickerSource[]; close: () => void; published: (count: number) => void;
}) {
  const L = useLabels();
  const ar = useContext(Language) === 'ar';
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [at, setAt] = useState(0);
  const [step, setStep] = useState<'pick' | 'edit'>('pick');
  const [multiple, setMultiple] = useState(false);
  const [chosen, setChosen] = useState<{ key: string; load: () => Promise<SocialMedia> }[]>([]);
  const [working, setWorking] = useState<'' | 'media' | 'publish'>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<CoffeeStory['category']>('coffee');
  const [caption, setCaption] = useState('');
  const [selected, setSelected] = useState(-1);
  const [panel, setPanel] = useState<'details' | 'text' | 'sticker'>('details');
  const [query, setQuery] = useState('');
  const [stickerKind, setStickerKind] = useState<StorySticker['ref']>('recipe');
  const [leaving, setLeaving] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const busy = working !== '';
  const draft = drafts[at];
  const item = draft && selected >= 0 ? draft.overlays.items[selected] : undefined;
  const mediaError = L('اختر صورة حتى 5 MB أو فيديو MP4 / WebM حتى 15 MB، واسمح بالكاميرا عند التصوير.', 'Choose a photo up to 5 MB or MP4 / WebM video up to 15 MB, and allow the camera when capturing.');

  const start = (media: SocialMedia[], textOnly = false) => {
    setDrafts(media.map((m) => ({ key: m.id, media: m, textOnly, silent: false,
      overlays: textOnly ? { v: 1, bg: STORY_BACKGROUNDS[0], items: [{ kind: 'text', text: '', x: 0.5, y: 0.45, size: 'l', color: '#FFFFFF', plate: false }] } : emptyOverlays() })));
    setAt(0); setSelected(textOnly ? 0 : -1); setPanel(textOnly ? 'text' : 'details'); setStep('edit'); setError('');
  };
  async function load(run: () => Promise<SocialMedia | null | SocialMedia[]>) {
    if (busy) return;
    setError(''); setWorking('media');
    try {
      const result = await run();
      const media = Array.isArray(result) ? result : result ? [result] : [];
      if (alive.current && media.length) start(media);
    } catch { if (alive.current) setError(mediaError); }
    finally { if (alive.current) setWorking(''); }
  }
  const pick = (key: string, loader: () => Promise<SocialMedia>) => {
    if (!multiple) return void load(loader);
    setError('');
    setChosen((list) => list.some((c) => c.key === key) ? list.filter((c) => c.key !== key)
      : list.length >= MAX_BATCH ? list : [...list, { key, load: loader }]);
  };
  const textStory = () => {
    const bytes = solidPng(STORY_BACKGROUNDS[0]);
    start([{ id: randomUUID(), uri: '', bytes, type: 'image', ...socialMediaType(bytes, 'image') }], true);
  };

  const update = (change: (overlays: StoryOverlays) => StoryOverlays) =>
    setDrafts((list) => list.map((d, i) => (i === at ? { ...d, overlays: change(d.overlays) } : d)));
  const patchItem = (index: number, patch: Partial<StoryText> | Partial<StorySticker>) =>
    update((o) => ({ ...o, items: o.items.map((it, i) => (i === index ? ({ ...it, ...patch } as StoryItem) : it)) }));
  const removeItem = (index: number) => { update((o) => ({ ...o, items: o.items.filter((_, i) => i !== index) })); setSelected(-1); setPanel('details'); };
  const addText = () => {
    if (!draft || draft.overlays.items.length >= MAX_STORY_ITEMS) return;
    update((o) => ({ ...o, items: [...o.items, { kind: 'text', text: '', x: 0.5, y: 0.4, size: 'm', color: '#FFFFFF', plate: true }] }));
    setSelected(draft.overlays.items.length); setPanel('text');
  };
  const addSticker = (source: StickerSource) => {
    if (!draft || draft.overlays.items.length >= MAX_STORY_ITEMS) return;
    update((o) => ({ ...o, items: [...o.items, { kind: 'sticker', ref: source.ref, id: source.id, label: source.label.slice(0, 80), x: 0.5, y: 0.72 }] }));
    setSelected(draft.overlays.items.length); setPanel('details'); setQuery('');
  };
  const setBackground = (bg: string) => {
    const bytes = solidPng(bg);
    setDrafts((list) => list.map((d, i) => (i === at ? { ...d, overlays: { ...d.overlays, bg }, media: { ...d.media, bytes } } : d)));
  };
  // Empty text boxes are not published, and a text-only story needs its text.
  const cleaned = (d: Draft) => storyOverlaysPayload({ ...d.overlays, items: d.overlays.items.filter((it) => it.kind !== 'text' || it.text.trim()) });
  const ready = drafts.length > 0 && drafts.every((d) => !d.textOnly || cleaned(d)?.items.some((it) => it.kind === 'text'));

  async function publish() {
    if (!supabase || busy || !ready) return;
    setWorking('publish'); setError('');
    let done = 0;
    try {
      for (const d of drafts) {
        setProgress(done + 1);
        await submitCoffeeStory(supabase, owner, d.media, category, done === 0 ? caption : '', d.silent, cleaned(d) as Record<string, unknown> | null);
        done += 1;
      }
      published(done);
    } catch {
      if (!alive.current) return;
      // Stories already sent stay published; only the rest remain to retry.
      setDrafts((list) => list.slice(done)); setAt(0); setSelected(-1);
      setError(done
        ? L(`نُشرت ${done} وتعذّر نشر الباقي. حاول مرة ثانية.`, `${done} published; the rest could not be sent. Try again.`)
        : L('تعذّر حفظ القصة. مسودتك موجودة للمحاولة مرة ثانية.', 'Could not save story. Your draft is kept for retry.'));
      if (done) published(0);
    } finally { if (alive.current) { setWorking(''); setProgress(0); } }
  }
  const leave = () => { if (busy) return; if (drafts.length || chosen.length) setLeaving(true); else close(); };
  const backToPick = () => { if (busy) return; setDrafts([]); setChosen([]); setStep('pick'); setSelected(-1); setPanel('details'); setError(''); };

  const matches = useMemo(() => {
    const q = normalizeSearch(query);
    return stickers.filter((s) => s.ref === stickerKind && (!q || normalizeSearch(s.label + ' ' + (s.note ?? '')).includes(q))).slice(0, 30);
  }, [stickers, stickerKind, query]);

  const header = (
    <View style={{ gap: 14 }}>
      {/* With the photo grid below, the actions scroll sideways like other story
          apps. Without it (browsers) they are the whole screen, so they wrap. */}
      {storyGalleryAvailable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, flexDirection: ar ? 'row-reverse' : 'row' }}>
        <Tile icon={<Txt style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Aa</Txt>} title={L('نص', 'Text')} disabled={busy} onPress={textStory} />
        <Tile icon={<MediaIcon type="image" camera={false} color="#FFFFFF" />} title={L('صورة', 'Photo')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('image'))} />
        <Tile icon={<MediaIcon type="video" camera={false} color="#FFFFFF" />} title={L('فيديو', 'Video')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('video'))} />
        <Tile icon={<MediaIcon type="image" camera color="#FFFFFF" />} title={L('تصوير الآن', 'Take photo')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('image', true))} />
        <Tile icon={<MediaIcon type="video" camera color="#FFFFFF" />} title={L('تصوير فيديو', 'Record video')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('video', true))} />
        </ScrollView>
      ) : (
        <View testID="story-actions" style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 }}>
        <Tile icon={<Txt style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Aa</Txt>} title={L('نص', 'Text')} disabled={busy} onPress={textStory} />
        <Tile icon={<MediaIcon type="image" camera={false} color="#FFFFFF" />} title={L('صورة', 'Photo')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('image'))} />
        <Tile icon={<MediaIcon type="video" camera={false} color="#FFFFFF" />} title={L('فيديو', 'Video')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('video'))} />
        <Tile icon={<MediaIcon type="image" camera color="#FFFFFF" />} title={L('تصوير الآن', 'Take photo')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('image', true))} />
        <Tile icon={<MediaIcon type="video" camera color="#FFFFFF" />} title={L('تصوير فيديو', 'Record video')} disabled={busy} onPress={() => void load(() => chooseSocialMedia('video', true))} />
        </View>
      )}
      {storyGalleryAvailable ? (
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Txt heading style={{ color: '#FFFFFF', fontSize: 18 }}>{L('الأخيرة', 'Recents')}</Txt>
          <Pressable accessibilityRole="switch" accessibilityLabel={L('اختيار متعدد', 'Select multiple')} accessibilityState={{ checked: multiple, disabled: busy }} aria-checked={multiple} disabled={busy}
            onPress={() => { setMultiple((v) => !v); setChosen([]); }}
            style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: multiple ? '#167B7F' : '#FFFFFF1F', justifyContent: 'center' }}>
            <Txt style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{L('اختيار متعدد', 'Select multiple')}</Txt>
          </Pressable>
        </View>
      ) : (
        <Txt style={{ color: '#FFFFFFB3', paddingHorizontal: 16 }}>{L('اختر صورة أو فيديو، أو اكتب قصة نصية.', 'Choose a photo or video, or write a text story.')}</Txt>
      )}
      {working === 'media' ? <View accessibilityLiveRegion="polite" style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}><ActivityIndicator size="small" color="#FFFFFF" /><Txt style={{ color: '#FFFFFF' }}>{L('جارٍ تجهيز الوسائط…', 'Preparing your media…')}</Txt></View> : null}
      {error && step === 'pick' ? <Txt accessibilityRole="alert" style={{ color: '#FFB4A9', paddingHorizontal: 16 }}>{error}</Txt> : null}
    </View>
  );

  let body: ReactNode;
  if (step === 'pick') {
    body = (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', padding: 12, gap: 8 }}>
          <Tool icon="close" label={L('إغلاق القصة', 'Close story composer')} disabled={busy} onPress={leave} />
          <Txt heading style={{ flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 19 }}>{L('إضافة للقصة', 'Add to story')}</Txt>
          <View style={{ width: 44 }} />
        </View>
        {storyGalleryAvailable
          ? <StoryGallery header={header} multiple={multiple} chosen={chosen.map((c) => c.key)} busy={busy}
              onCamera={() => void load(() => chooseSocialMedia('image', true))} onPick={pick} />
          : <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>{header}</ScrollView>}
        {multiple && chosen.length ? (
          <View style={{ padding: 12 }}>
            <Action variant="primary" disabled={busy} title={L(`التالي (${chosen.length})`, `Next (${chosen.length})`)}
              onPress={() => void load(async () => { const out: SocialMedia[] = []; for (const c of chosen) out.push(await c.load()); return out; })} />
          </View>
        ) : null}
      </View>
    );
  } else if (draft) {
    const text = item?.kind === 'text' ? item : undefined;
    body = (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View testID="story-stage" style={{ flex: 1, minHeight: 200, backgroundColor: '#000000', overflow: 'hidden' }}>
          <StagePreview draft={draft} />
          <StoryOverlayLayer overlays={draft.overlays} editable selected={selected}
            onSelect={(index) => { setSelected(index); setPanel(draft.overlays.items[index]?.kind === 'text' ? 'text' : 'details'); }}
            onMove={(index, x, y) => patchItem(index, { x: Math.min(0.97, Math.max(0.03, x)), y: Math.min(0.97, Math.max(0.03, y)) })} />
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Tool icon="back" label={L('رجوع لاختيار الوسائط', 'Back to choosing media')} disabled={busy} onPress={backToPick} />
            <View style={{ flex: 1 }} />
            {drafts.length > 1 ? <View style={{ paddingHorizontal: 10, minHeight: 32, borderRadius: 16, backgroundColor: '#000000A6', justifyContent: 'center' }}><Txt style={{ color: '#FFFFFF', fontSize: 13 }}>{`${at + 1} / ${drafts.length}`}</Txt></View> : null}
            {draft.media.type === 'video' ? <Tool icon={draft.silent ? 'mute' : 'sound'} active={draft.silent} disabled={busy}
              label={draft.silent ? L('الفيديو بدون صوت', 'Video without sound') : L('الفيديو بالصوت', 'Video with sound')}
              onPress={() => setDrafts((list) => list.map((d, i) => (i === at ? { ...d, silent: !d.silent } : d)))} /> : null}
            <Tool title="Aa" label={L('إضافة نص', 'Add text')} disabled={busy || draft.overlays.items.length >= MAX_STORY_ITEMS} onPress={addText} />
            <Tool icon="bean" label={L('إضافة ملصق قهوة', 'Add a coffee sticker')} active={panel === 'sticker'} disabled={busy || draft.overlays.items.length >= MAX_STORY_ITEMS}
              onPress={() => { setSelected(-1); setPanel(panel === 'sticker' ? 'details' : 'sticker'); }} />
          </View>
          {drafts.length > 1 ? (
            <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: ar ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <Tool icon="back" label={L('القصة السابقة', 'Previous story')} disabled={busy || at === 0} onPress={() => { setAt(at - 1); setSelected(-1); setPanel('details'); }} />
              <Tool icon="arrow" label={L('القصة التالية', 'Next story')} disabled={busy || at === drafts.length - 1} onPress={() => { setAt(at + 1); setSelected(-1); setPanel('details'); }} />
            </View>
          ) : null}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '48%', backgroundColor: colors.paper }} contentContainerStyle={{ padding: 14, gap: 12 }}>
          {panel === 'text' && text ? (
            <View testID="story-text-panel" style={{ gap: 12 }}>
              <TextInput accessibilityLabel={L('نص القصة', 'Story text')} value={text.text} multiline autoFocus maxLength={MAX_STORY_TEXT} editable={!busy}
                onChangeText={(value) => patchItem(selected, { text: value })} placeholder={L('اكتب هنا…', 'Type here…')} placeholderTextColor={colors.muted}
                style={[styles.input, { minHeight: 64, textAlign: ar ? 'right' : 'left', textAlignVertical: 'top' }]} />
              <Swatches values={STORY_COLORS} value={text.color} label={L('لون النص', 'Text colour')} onChange={(color) => patchItem(selected, { color })} />
              <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['s', 'm', 'l'] as const).map((size) => <Action key={size} compact selected={text.size === size} title={size === 's' ? L('صغير', 'Small') : size === 'm' ? L('وسط', 'Medium') : L('كبير', 'Large')} onPress={() => patchItem(selected, { size })} />)}
                <Action compact selected={text.plate} title={L('خلفية للنص', 'Text background')} onPress={() => patchItem(selected, { plate: !text.plate })} />
              </View>
              {draft.textOnly ? <View style={{ gap: 8 }}><Txt style={styles.label}>{L('لون الخلفية', 'Background colour')}</Txt>
                <Swatches values={STORY_BACKGROUNDS} value={draft.overlays.bg ?? STORY_BACKGROUNDS[0]} label={L('لون الخلفية', 'Background colour')} onChange={setBackground} /></View> : null}
              <View style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Action variant="primary" title={L('تم', 'Done')} onPress={() => { if (!text.text.trim() && !draft.textOnly) removeItem(selected); else { setPanel('details'); setSelected(-1); } }} /></View>
                {!draft.textOnly || draft.overlays.items.length > 1 ? <Action title={L('حذف النص', 'Delete text')} onPress={() => removeItem(selected)} /> : null}
              </View>
            </View>
          ) : panel === 'sticker' ? (
            <View testID="story-sticker-panel" style={{ gap: 10 }}>
              <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                {([['recipe', L('وصفة', 'Recipe')], ['coffee', L('بن', 'Coffee')], ['roaster', L('محمصة', 'Roastery')]] as const).map(([ref, title]) =>
                  <Action key={ref} compact selected={stickerKind === ref} title={title} onPress={() => setStickerKind(ref)} />)}
              </View>
              <Field label={L('ابحث عن الملصق', 'Find a sticker')} value={query} onChangeText={setQuery} maxLength={80} />
              {matches.map((source) => (
                <Pressable key={source.ref + source.id} accessibilityRole="button" accessibilityLabel={source.label} onPress={() => addSticker(source)}
                  style={{ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream }}>
                  <Txt numberOfLines={1} style={{ fontWeight: '700' }}>{source.label}</Txt>
                  {source.note ? <Txt numberOfLines={1} style={[styles.muted, { fontSize: 12 }]}>{source.note}</Txt> : null}
                </Pressable>
              ))}
              {!matches.length ? <Txt style={styles.muted}>{L('لا توجد نتائج مطابقة.', 'No matching results.')}</Txt> : null}
              <Action compact title={L('إغلاق الملصقات', 'Close stickers')} onPress={() => setPanel('details')} />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {item?.kind === 'sticker' ? <Action compact title={L('حذف الملصق المحدد', 'Delete the selected sticker')} onPress={() => removeItem(selected)} /> : null}
              <Txt style={[styles.muted, { fontSize: 12 }]}>{L('اسحب النص أو الملصق لتحريكه. اضغط على النص لتعديله.', 'Drag text or a sticker to move it. Tap text to edit it.')}</Txt>
              <StoryTopics value={category} onChange={setCategory} disabled={busy} />
              <Field label={L('وصف القصة', 'Story caption')} value={caption} onChangeText={setCaption} maxLength={1000} editable={!busy} />
              <Txt style={[styles.muted, { fontSize: 13 }]}>{L('بنشر القصة، تؤكد حقك في مشاركة محتواها.', 'By publishing, you confirm you have permission to share this content.')}</Txt>
              {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
              {working === 'publish' ? <View accessibilityLiveRegion="polite" style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator size="small" color={colors.teal} />
                <Txt style={styles.muted}>{drafts.length > 1 ? L(`جارٍ نشر ${progress} من ${drafts.length}…`, `Publishing ${progress} of ${drafts.length}…`) : L('جارٍ رفع القصة، لا تغلق الصفحة…', 'Uploading your story, keep this page open…')}</Txt></View> : null}
              {!ready ? <Txt style={[styles.muted, { fontSize: 13 }]}>{L('اكتب نص القصة لتفعيل زر النشر.', 'Write the story text to enable publishing.')}</Txt> : null}
              <Action variant="primary" disabled={busy || !ready}
                title={working === 'publish' ? L('جارٍ النشر…', 'Publishing…') : drafts.length > 1 ? L(`نشر ${drafts.length} قصص`, `Publish ${drafts.length} stories`) : L('نشر القصة', 'Publish story')}
                onPress={() => void publish()} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={leave} statusBarTranslucent>
      <SafeAreaProvider>
        <SafeAreaView testID="story-composer" accessibilityViewIsModal style={{ flex: 1, backgroundColor: '#0E0B09' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }}>{body}</View>
          {leaving ? (
            <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: '#000000B3', alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
              <View testID="story-discard" style={[styles.card, { width: '100%', maxWidth: 420, padding: 18, gap: 12 }]}>
                <Txt heading style={styles.subtitle}>{L('مسح مسودة القصة', 'Discard story draft')}</Txt>
                <Txt>{L('مسح القصة التي لم تنشرها؟', 'Discard this unpublished story?')}</Txt>
                <Action variant="primary" title={L('مسح والخروج', 'Discard and close')} onPress={close} />
                <Action title={L('متابعة التعديل', 'Keep editing')} onPress={() => setLeaving(false)} />
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
