import type { XBloomModel } from './xbloomMatching';
import { useLabels } from './ui';
import { useContext, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, View, useWindowDimensions } from './native';
import { Action, Field, Language, Txt, colors, styles } from './ui';
import type { CoffeeItem, RecipeItem } from './data';
import type { Method } from './core/engine';
import { contentLocale } from './localeText';
import { MethodPicker } from './CoffeeScreens';
import { CoffeeLabelReader } from './CoffeeLabelReader';
import type { CoffeeOcrCrop, CoffeeOcrEvent, CoffeeOcrJob } from './coffeeOcr';
import { readCoffeeLabel, coffeeLabelCandidates, emptyCoffeeLabel, hasCoffeeLabelFacts, type CoffeeLabel } from './coffeeLabel';
import { loadCoffeeLabelMatches, type LabelServing } from './coffeeLabelMatches';
import { CoffeeLabelMatchNotice } from './CoffeeLabelMatchNotice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicSupabase, supabase, catalogScope } from './client';
import { AiLabelError, emptyLabelExtras, readLabelWithAi, withdrawAiLabelConsent, MAX_AI_LABEL_IMAGE, type AiLabelReading, type LabelExtras } from './coffeeLabelRemote';
import { recipeQuickFacts } from './recipeQuickFacts';
import { RecipeServingBadge } from './RecipeServingBadge';
import { CoffeeLabelCropper } from './CoffeeLabelCropper';
import { RecipeVisual } from './RecipeVisual';

export function ScanCoffeeButton({ openRecipe, coffees = [], method, model = 'all', serving = '', cup, onMatches }: {
  openRecipe: (recipe: RecipeItem) => void; coffees?: CoffeeItem[]; method?: Method; model?: XBloomModel; serving?: LabelServing; cup?: 'Omni' | 'xPod';
  /** Hand every close match to a recipe generator instead of opening one. */
  onMatches?: (recipes: RecipeItem[], coffeeName: string) => void;
}) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [visible, setVisible] = useState(false);
  return <>
    <Action title={ar ? 'صوّر البن واختر الوصفة' : i18nUi('صوّر البن واختر الوصفة', 'Scan coffee for a recipe')} onPress={() => setVisible(true)} />
    {visible ? <CoffeeLabelScanner coffees={coffees} method={method} model={model} initialServing={serving} cup={cup} close={() => setVisible(false)}
      openRecipe={recipe => { setVisible(false); openRecipe(recipe); }}
      onMatches={onMatches ? (recipes, name) => { setVisible(false); onMatches(recipes, name); } : undefined} /> : null}
  </>;
}
function CoffeeLabelScanner({ coffees, method: initialMethod, model, initialServing, cup, close, openRecipe, onMatches }: {
  coffees: CoffeeItem[]; method?: Method; model: XBloomModel; initialServing: LabelServing; cup?: 'Omni' | 'xPod'; close: () => void; openRecipe: (recipe: RecipeItem) => void;
  onMatches?: (recipes: RecipeItem[], coffeeName: string) => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language); const ar = locale === 'ar'; const { width } = useWindowDimensions();
  const [label, setLabel] = useState(emptyCoffeeLabel);
  const [photo, setPhoto] = useState<{ uri: string; image: string; width: number; height: number } | null>(null);
  const [cropping, setCropping] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [serving, setServing] = useState<LabelServing>(initialServing);
  const [job, setJob] = useState<CoffeeOcrJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [pickBusy, setPickBusy] = useState(false);
  // AI reading uploads the photo, so it is off until the member turns it on.
  const [aiMode, setAiMode] = useState(false);
  const [member, setMember] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [extras, setExtras] = useState<LabelExtras>(emptyLabelExtras);
  const [confidence, setConfidence] = useState<AiLabelReading['confidence']>({});
  const aiRequest = useRef<AbortController | null>(null);
  const [candidates, setCandidates] = useState<CoffeeItem[]>([]);
  const [coffee, setCoffee] = useState<CoffeeItem | null>(null);
  const [method, setMethod] = useState<Method>(initialMethod ?? 'xbloom');
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const mounted = useRef(true); const generation = useRef(0); const reading = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null); const picking = useRef(false);
  useEffect(() => () => { mounted.current = false; reading.current = null; controller.current?.abort(); aiRequest.current?.abort(); }, []);
  const aiKey = (id: string) => `beanmora-label-ai:${catalogScope}:${id}`;
  useEffect(() => {
    void (async () => {
      try {
        const user = (await supabase?.auth.getSession())?.data.session?.user;
        if (!mounted.current || !user || user.is_anonymous) return;
        setMember(user.id);
        if (await AsyncStorage.getItem(aiKey(user.id)) === '1' && mounted.current) setAiMode(true);
      } catch { /* On-device reading stays available. */ }
    })();
  }, []);
  const aiOptions = async () => {
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session || session.user.is_anonymous) throw new AiLabelError('signin');
    return { url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', accessToken: session.access_token };
  };
  const chooseMode = (ai: boolean) => {
    if (job || aiBusy || ai === aiMode) return;
    setOcrError('');
    if (ai && !member) { setOcrError(ar ? 'سجّل دخولك لاستخدام القراءة الذكية. القراءة على الجهاز متاحة بدون حساب.' : i18nUi('سجّل دخولك لاستخدام القراءة الذكية. القراءة على الجهاز متاحة بدون حساب.', 'Sign in to use smart reading. On-device reading works without an account.')); return; }
    setAiMode(ai);
    if (member) void AsyncStorage.setItem(aiKey(member), ai ? '1' : '0').catch(() => {});
    // Turning it off also withdraws the recorded permission on the server.
    if (!ai) void aiOptions().then(withdrawAiLabelConsent).catch(() => {});
  };
  const aiMessage = (error: unknown) => {
    const reason = error instanceof AiLabelError ? error.reason : 'unknown';
    const text: Record<string, [string, string]> = {
      signin: ['انتهت جلسة الدخول. سجّل دخولك ثم حاول.', 'Your session has ended. Sign in, then try again.'],
      account: ['القراءة الذكية غير متاحة لحسابك حاليًا. اقرأ الكيس على الجهاز.', 'Smart reading is not available for your account yet. Read the bag on your device.'],
      disabled: ['القراءة الذكية متوقفة حاليًا. اقرأ الكيس على الجهاز.', 'Smart reading is currently off. Read the bag on your device.'],
      rate: ['وصلت حد القراءات الآن. حاول بعد قليل أو اقرأ على الجهاز.', 'You reached the reading limit for now. Try later or read on your device.'],
      unreadable: ['ما قدرنا نقرأ الكيس من هالصورة. صوّره من قريب أو اقرأه على الجهاز.', 'We could not read the bag from this photo. Take a closer photo or read it on your device.'],
      size: ['الصورة كبيرة. صوّر الكيس مباشرة من الكاميرا أو اختر صورة أصغر.', 'The photo is too large. Take it with the camera or choose a smaller photo.'],
      network: ['تعذّر الاتصال. تأكد من الإنترنت وحاول مجددًا.', 'Could not connect. Check your internet connection and try again.'],
      unknown: ['تعذّرت القراءة الذكية. حاول مجددًا أو اقرأ على الجهاز.', 'Smart reading failed. Try again or read on your device.'],
    };
    return ar ? text[reason][0] : i18nUi(text[reason][0], text[reason][1]);
  };
  const readAi = async (image: string) => {
    aiRequest.current?.abort(); const request = new AbortController(); aiRequest.current = request;
    setAiBusy(true); setOcrError('');
    try {
      const result = await readLabelWithAi({ ...(await aiOptions()), signal: request.signal }, image);
      if (!mounted.current || request.signal.aborted) return;
      setLabel(result.label); setExtras(result.extras); setConfidence(result.confidence); setNeedsReview(true);
      setCandidates(coffeeLabelCandidates([result.label.name, result.extras.roaster].join('\n'), coffees));
      if (!hasCoffeeLabelFacts(result.label)) setOcrError(ar ? 'ما لقينا بيانات مكتوبة على الكيس في هالصورة. صوّر الملصق من قريب أو اكتب البيانات.' : i18nUi('ما لقينا بيانات مكتوبة على الكيس في هالصورة. صوّر الملصق من قريب أو اكتب البيانات.', 'No printed coffee details were found in this photo. Take a closer label photo or type the details.'));
    } catch (error) {
      if (!mounted.current || request.signal.aborted) return;
      // Keep the photo: the member can still read it on the device.
      setOcrError(aiMessage(error)); setCropping(true);
    } finally { if (aiRequest.current === request) { aiRequest.current = null; if (mounted.current) setAiBusy(false); } }
  };
  const invalidate = () => { generation.current += 1; controller.current?.abort(); setMatching(false); setRecipes([]); setMatchError(false); setSearched(false); };
  const change = (key: keyof CoffeeLabel, value: string) => { invalidate(); setCoffee(null); setConfidence(previous => ({ ...previous, [key]: undefined })); setLabel(previous => ({ ...previous, [key]: value })); };
  const receive = (event: CoffeeOcrEvent, id: string | null = reading.current) => {
    if (!mounted.current || !reading.current || reading.current !== id) return;
    if (event.type === 'progress') { setProgress(event.progress); return; }
    reading.current = null; setJob(null);
    if (event.type === 'error') { setOcrError(ar ? 'تعذّرت قراءة الصورة. أعد التصوير أو اكتب بيانات الكيس.' : i18nUi('تعذّرت قراءة الصورة. أعد التصوير أو اكتب بيانات الكيس.', 'Could not read the photo. Try again or enter the label details.')); return; }
    const parsed = readCoffeeLabel(event.text, event.titles);
    // Product names have no finite vocabulary to validate against. Do not turn
    // a weak reading of a logo/title into an asserted product identity.
    if (event.nameText !== undefined) parsed.name = readCoffeeLabel(event.nameText, event.titles).name;
    else if (event.confidence !== undefined && event.confidence < 70 && !event.titles?.includes(parsed.name)) parsed.name = '';
    setLabel(parsed); setRawText(event.rawText ?? event.text); setNeedsReview(true);
    setCandidates(coffeeLabelCandidates([event.text, parsed.name].join('\n'), coffees));
    if (!hasCoffeeLabelFacts(parsed) || (event.confidence !== undefined && event.confidence < 55 && (!parsed.name || !parsed.notes))) setOcrError(ar ? 'القراءة غير مكتملة. حدّد الملصق أو صوّره من قريب، وراجع الحقول قبل البحث.' : i18nUi('القراءة غير مكتملة. حدّد الملصق أو صوّره من قريب، وراجع الحقول قبل البحث.', 'The reading is incomplete. Crop the label or take a closer photo, then check the fields before searching.'));
  };
  useEffect(() => {
    if (!job) return;
    const timeout = setTimeout(() => receive({ type: 'error' }, job.id), 120000);
    return () => clearTimeout(timeout);
  }, [job]);
  const pick = async (camera: boolean) => {
    if (picking.current || job || aiBusy) return;
    picking.current = true; setPickBusy(true); setOcrError('');
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('CAMERA_PERMISSION');
      }
      // A smaller upload for AI reading; full quality helps the on-device reader.
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: aiMode ? 0.5 : 1, exif: false,
        cameraType: ImagePicker.CameraType.back };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!mounted.current || result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64 || asset.base64.length > 14 * 1024 * 1024) throw new Error('IMAGE_SIZE');
      // iOS may report the original HEIC MIME after returning JPEG pixels.
      const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBOR') ? 'image/png' : asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('IMAGE_FORMAT');
      invalidate(); setCoffee(null); setCandidates([]); setLabel(emptyCoffeeLabel()); setProgress(0);
      setRawText(''); setShowText(false); setNeedsReview(true); setExtras(emptyLabelExtras()); setConfidence({});
      const image = `data:${mime};base64,${asset.base64}`;
      setPhoto({ uri: asset.uri, image, width: asset.width || 1, height: asset.height || 1 });
      if (aiMode && image.length <= MAX_AI_LABEL_IMAGE) { setCropping(false); void readAi(image); }
      else { setCropping(true); if (aiMode) setOcrError(aiMessage(new AiLabelError('size'))); }
    } catch (error) {
      if (mounted.current) setOcrError(error instanceof Error && error.message === 'CAMERA_PERMISSION'
        ? ar ? 'اسمح بالكاميرا أو اختر صورة من المعرض.' : i18nUi('اسمح بالكاميرا أو اختر صورة من المعرض.', 'Allow camera access or choose a photo.')
        : ar ? 'اختر صورة واضحة بصيغة JPEG أو PNG أو WebP بحجم أقل من 10 ميغابايت.' : i18nUi('اختر صورة واضحة بصيغة JPEG أو PNG أو WebP بحجم أقل من 10 ميغابايت.', 'Choose a clear JPEG, PNG or WebP photo under 10 MB.'));
    } finally { picking.current = false; if (mounted.current) setPickBusy(false); }
  };
  const readCrop = (crop: CoffeeOcrCrop) => {
    if (!photo || job || aiBusy) return;
    invalidate(); setCoffee(null); setCandidates([]); setLabel(emptyCoffeeLabel()); setRawText(''); setOcrError(''); setExtras(emptyLabelExtras()); setConfidence({});
    setCropping(false); setNeedsReview(true); setProgress(0);
    const id = String(++generation.current); reading.current = id;
    const full = crop.left === 0 && crop.top === 0 && crop.width === 1 && crop.height === 1;
    setJob({ id, image: photo.image, ...(full ? {} : { crop }) });
  };
  const find = async () => {
    if (matching || job || aiBusy || needsReview || cropping || (!coffee && !hasCoffeeLabelFacts(label))) return;
    invalidate(); const request = generation.current; const abort = new AbortController(); controller.current = abort;
    setMatching(true); setSearched(true);
    try {
      if (!publicSupabase) throw new Error('CONNECTION');
      const result = await loadCoffeeLabelMatches(publicSupabase, label, method, model, contentLocale(locale), abort.signal, coffee, serving);
      if (mounted.current && generation.current === request) setRecipes(cup ? result.filter(r => r.sourceBrew.cup_type?.toLowerCase() === cup.toLowerCase()) : result);
    } catch { if (mounted.current && generation.current === request) setMatchError(true); }
    finally { if (mounted.current && generation.current === request) setMatching(false); }
  };
  // Fields the model was unsure about ask for a second look.
  const check = (key: keyof AiLabelReading['confidence']) => confidence[key] && confidence[key] !== 'high'
    ? ar ? ' · تأكد منه' : i18nUi(' · تأكد منه', ' · please check') : '';
  return <Modal transparent visible animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#201A1570', justifyContent: width >= 700 ? 'center' : 'flex-end', alignItems: 'center', padding: width >= 700 ? 20 : 0 }}>
      <View testID="coffee-label-scanner" accessibilityViewIsModal style={{ width: '100%', maxWidth: 820, maxHeight: '94%', backgroundColor: colors.cream, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ padding: 14, gap: 10, flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt heading style={{ fontSize: 18, lineHeight: 26, flex: 1 }}>{ar ? 'من كيس البن إلى الوصفة' : i18nUi('من كيس البن إلى الوصفة', 'From coffee bag to recipe')}</Txt>
          <Action compact title={ar ? 'إغلاق' : i18nUi('إغلاق', 'Close')} onPress={close} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 12, gap: 10 }}>
          <Txt style={{ fontSize: 14, lineHeight: 22 }}>{ar ? 'صوّر الملصق بوضوح، وراجع البيانات ثم اختر أقرب وصفة لبنك.' : i18nUi('صوّر الملصق بوضوح، وراجع البيانات ثم اختر أقرب وصفة لبنك.', 'Take a clear label photo, review the details, then find the closest recipe for your coffee.')}</Txt>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'افرد الملصق، وقرّب الكتابة داخل الصورة، وتجنّب انعكاس الإضاءة.' : i18nUi('افرد الملصق، وقرّب الكتابة داخل الصورة، وتجنّب انعكاس الإضاءة.', 'Keep the label flat, fill the frame with text, and avoid glare.')}</Txt>
          <View testID="coffee-label-mode" style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            <Action compact title={ar ? 'قراءة ذكية' : i18nUi('قراءة ذكية', 'Smart reading')} selected={aiMode} disabled={!!job || aiBusy} onPress={() => chooseMode(true)} />
            <Action compact title={ar ? 'على الجهاز' : i18nUi('على الجهاز', 'On device')} selected={!aiMode} disabled={!!job || aiBusy} onPress={() => chooseMode(false)} />
          </View>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{aiMode
            ? ar ? 'القراءة الذكية ترسل صورة الكيس إلى OpenAI لقراءتها، ولا نحفظ الصورة. لا تصوّر معلومات شخصية. تقدر توقفها باختيار «على الجهاز».' : i18nUi('القراءة الذكية ترسل صورة الكيس إلى OpenAI لقراءتها، ولا نحفظ الصورة. لا تصوّر معلومات شخصية. تقدر توقفها باختيار «على الجهاز».', 'Smart reading sends your bag photo to OpenAI to read it; we do not keep the photo. Do not photograph personal information. Choose “On device” to stop.')
            : ar ? 'مجاني. تُقرأ الصورة على جهازك ولا تُرفع. يحتاج قارئ النص اتصالًا عند تحميله.' : i18nUi('مجاني. تُقرأ الصورة على جهازك ولا تُرفع. يحتاج قارئ النص اتصالًا عند تحميله.', 'Free. Your photo is read on your device and is never uploaded. Loading the text reader needs a connection.')}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            <Action compact title={ar ? 'تصوير الكيس' : i18nUi('تصوير الكيس', 'Take a label photo')} disabled={pickBusy || !!job || aiBusy} onPress={() => void pick(true)} />
            <Action compact title={ar ? 'اختيار صورة' : i18nUi('اختيار صورة', 'Choose a photo')} disabled={pickBusy || !!job || aiBusy} onPress={() => void pick(false)} />
          </View>
          {photo && !cropping ? <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
            <Image testID="coffee-label-photo" source={{ uri: photo.uri }} resizeMode="contain" accessibilityLabel={ar ? 'صورة كيسك' : i18nUi('صورة كيسك', 'Your coffee label')} style={{ width: 110, height: 150, borderRadius: 10 }} />
            <View style={{ flex: 1, gap: 6 }}><Txt style={{ fontSize: 12, lineHeight: 18 }}>{ar ? 'قرّب الكتابة وحدّد الملصق لقراءة أوضح.' : i18nUi('قرّب الكتابة وحدّد الملصق لقراءة أوضح.', 'Fill the photo with text, or crop the label for a clearer reading.')}</Txt>
              <Action compact title={ar ? 'تحديد الملصق وإعادة القراءة' : i18nUi('تحديد الملصق وإعادة القراءة', 'Crop label and reread')} disabled={!!job || aiBusy} onPress={() => { invalidate(); setCropping(true); }} /></View>
          </View> : null}
          {photo && cropping ? <CoffeeLabelCropper photo={photo} apply={readCrop} cancel={() => setCropping(false)} /> : null}
          {job ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><ActivityIndicator color={colors.teal} /><Txt>{ar ? 'جارٍ قراءة الملصق… ' : i18nUi('جارٍ قراءة الملصق… ', 'Reading the label… ')}{Math.round(progress * 100)}%</Txt>
            <Action compact title={ar ? 'إلغاء القراءة' : i18nUi('إلغاء القراءة', 'Cancel reading')} onPress={() => { reading.current = null; setJob(null); }} /></View> : null}
          {aiBusy ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><ActivityIndicator color={colors.teal} /><Txt>{ar ? 'جارٍ قراءة الكيس…' : i18nUi('جارٍ قراءة الكيس…', 'Reading the bag…')}</Txt>
            <Action compact title={ar ? 'إلغاء القراءة' : i18nUi('إلغاء القراءة', 'Cancel reading')} onPress={() => { aiRequest.current?.abort(); aiRequest.current = null; setAiBusy(false); setCropping(true); }} /></View> : null}
          {ocrError ? <Txt accessibilityRole="alert" style={styles.error}>{ocrError}</Txt> : null}
          {candidates.length ? <View style={[styles.card, { padding: 12, gap: 8 }]}><Txt heading>{ar ? 'بن محتمل في مكتبتنا — اختره إذا هو كيسك' : i18nUi('بن محتمل في مكتبتنا — اختره إذا هو كيسك', 'Possible catalog coffee — select it if it is your bag')}</Txt>
            {candidates.map(candidate => <Action key={candidate.kind + candidate.id} title={candidate.name} selected={coffee === candidate} onPress={() => {
              invalidate(); setCoffee(candidate); setNeedsReview(false); setOcrError(''); setConfidence({}); setLabel({ name: candidate.name, origin: candidate.origin || '', variety: candidate.variety || '', process: candidate.process || '', roast: candidate.roast || '', notes: candidate.flavors.join(', ') });
            }} />)}</View> : null}
          <Txt heading style={{ fontSize: 17 }}>{ar ? 'راجع بيانات الكيس' : i18nUi('راجع بيانات الكيس', 'Review the label details')}</Txt>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'اترك أي معلومة غير مذكورة فارغة. المنشأ يعني بلد زراعة البن.' : i18nUi('اترك أي معلومة غير مذكورة فارغة. المنشأ يعني بلد زراعة البن.', 'Leave unstated details blank. Origin means the coffee growing country.')}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
            {([
              ['name', ar ? 'اسم البن' : i18nUi('اسم البن', 'Coffee name')], ['origin', ar ? 'منشأ البن' : i18nUi('منشأ البن', 'Coffee origin')], ['variety', ar ? 'السلالة' : i18nUi('السلالة', 'Variety')],
              ['process', ar ? 'المعالجة' : i18nUi('المعالجة', 'Processing')], ['roast', ar ? 'التحميص' : i18nUi('التحميص', 'Roast level')],
            ] as const).map(([key, title]) => <View key={key} style={{ flexBasis: key === 'name' ? '100%' : '46%', flexGrow: 1 }}>
              <Field style={{ minHeight: 42, paddingVertical: 7, fontSize: 14 }} label={title + check(key)} value={label[key]} editable={!job && !aiBusy} maxLength={160} onChangeText={value => change(key, value)} /></View>)}
            {extras.roaster ? <View style={{ flexBasis: '100%', flexGrow: 1 }}><Field style={{ minHeight: 42, paddingVertical: 7, fontSize: 14 }} label={(ar ? 'المحمصة' : i18nUi('المحمصة', 'Roaster')) + check('roaster')} value={extras.roaster} editable={!aiBusy} maxLength={160} onChangeText={value => { setConfidence(previous => ({ ...previous, roaster: undefined })); setExtras(previous => ({ ...previous, roaster: value })); }} /></View> : null}
          </View>
          {[extras.region, extras.roastDate, extras.altitude, extras.weight].some(Boolean) ? <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{[
            extras.region && (ar ? 'المنطقة: ' : i18nUi('المنطقة: ', 'Region: ')) + extras.region,
            extras.roastDate && (ar ? 'تاريخ التحميص: ' : i18nUi('تاريخ التحميص: ', 'Roast date: ')) + extras.roastDate,
            extras.altitude && (ar ? 'الارتفاع: ' : i18nUi('الارتفاع: ', 'Altitude: ')) + extras.altitude,
            extras.weight && (ar ? 'الوزن: ' : i18nUi('الوزن: ', 'Weight: ')) + extras.weight,
          ].filter(Boolean).join(' · ')}</Txt> : null}
          <Field style={{ minHeight: 50, paddingVertical: 8, fontSize: 14 }} label={(ar ? 'الإيحاءات والطعم المكتوب على الكيس' : i18nUi('الإيحاءات والطعم المكتوب على الكيس', 'Tasting notes on the bag')) + check('notes')} value={label.notes} editable={!job && !aiBusy} maxLength={1000} multiline onChangeText={value => change('notes', value)} />
          {rawText ? <View style={{ gap: 6 }}>
            <Action compact title={showText ? ar ? 'إخفاء النص المقروء' : i18nUi('إخفاء النص المقروء', 'Hide scanned text') : ar ? 'عرض النص المقروء' : i18nUi('عرض النص المقروء', 'Show scanned text')} onPress={() => setShowText(v => !v)} />
            {showText ? <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{rawText}</Txt> : null}
          </View> : null}
          {needsReview && !job && !aiBusy ? <Action compact title={ar ? 'راجعت بيانات الكيس' : i18nUi('راجعت بيانات الكيس', 'I reviewed the label details')} disabled={!hasCoffeeLabelFacts(label)} onPress={() => { setNeedsReview(false); setOcrError(''); }} /> : null}
          {model !== 'all' ? <Txt style={styles.muted}>{`xBloom ${model} · ${cup ?? ''}`}</Txt> : <MethodPicker value={method} onChange={value => { invalidate(); setMethod(value ?? 'xbloom'); }} />}
          {model === 'all' ? <View testID="coffee-label-serving-filters" style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            {([['', ar ? 'الكل' : i18nUi('الكل', 'All')], ['hot', ar ? 'حار' : i18nUi('حار', 'Hot')], ['cold_or_iced', ar ? 'بارد' : i18nUi('بارد', 'Cold')]] as const).map(([value, title]) =>
              <Action key={value} compact title={title} selected={serving === value} onPress={() => { invalidate(); setServing(value); }} />)}
          </View> : <Txt style={styles.muted}>{initialServing === 'hot' ? i18nUi('حار', 'Hot') : i18nUi('بارد ومثلج', 'Cold & iced')}</Txt>}
          <Action title={ar ? 'اعثر على أقرب وصفة' : i18nUi('اعثر على أقرب وصفة', 'Find the closest recipe')} variant="primary" disabled={matching || !!job || aiBusy || needsReview || cropping || (!coffee && !hasCoffeeLabelFacts(label))} onPress={() => void find()} />
          {matching ? <ActivityIndicator color={colors.teal} /> : null}
          {matchError ? <View style={{ gap: 8 }}><Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر البحث عن الوصفات. بياناتك موجودة؛ حاول مرة ثانية.' : i18nUi('تعذّر البحث عن الوصفات. بياناتك موجودة؛ حاول مرة ثانية.', 'Recipe search failed. Your details are kept; try again.')}</Txt><Action title={ar ? 'إعادة المحاولة' : i18nUi('إعادة المحاولة', 'Retry')} onPress={() => void find()} /></View> : null}
          {searched && !matching && !matchError && !recipes.length ? <View testID="coffee-label-no-match"><Txt>{ar ? 'ما لقينا وصفة منشورة قريبة لهالبيانات وطريقة التحضير والتقديم. راجع البيانات أو جرّب نوع تقديم آخر.' : i18nUi('ما لقينا وصفة منشورة قريبة لهالبيانات وطريقة التحضير والتقديم. راجع البيانات أو جرّب نوع تقديم آخر.', 'No close published recipe for these details, method and serving. Review the details or try another serving style.')}</Txt></View> : null}
          {recipes.length && onMatches ? <Action variant="primary" title={ar ? 'حضّر وصفة من هذه النتائج' : i18nUi('حضّر وصفة من هذه النتائج', 'Generate a recipe from these results')} onPress={() => onMatches(recipes, coffee?.name || label.name)} /> : null}
          {recipes.length ? <View style={{ gap: 5 }}>
            <Txt heading style={{ fontSize: 16 }}>{ar ? `الوصفات الأقرب (${recipes.length})` : i18nUi(`الوصفات الأقرب (${recipes.length})`, `Closest recipes (${recipes.length})`)}</Txt>
            <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'الترتيب حسب البيانات المشتركة. وصفات البن المشابه نقطة بداية؛ عدّلها حسب طعم كوبك.' : i18nUi('الترتيب حسب البيانات المشتركة. وصفات البن المشابه نقطة بداية؛ عدّلها حسب طعم كوبك.', 'Ranked by shared details. Similar-coffee recipes are a starting point; adjust to your taste.')}</Txt>
          </View> : null}
          {recipes.map((recipe, i) => <View key={recipe.id} testID="coffee-label-recipe" style={[styles.card, { padding: 10, marginBottom: 0, gap: 7 }]}>
            <View style={{ height: 130, borderRadius: 10, overflow: 'hidden' }}><RecipeVisual recipe={recipe} /></View>
            <View style={{ flexDirection: ar ? 'row-reverse' : 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Txt style={{ fontSize: 12, color: colors.muted }}>{recipe.labelMatch?.match_kind === 'exact' ? ar ? 'لنفس البن' : i18nUi('لنفس البن', 'Same coffee') : i === 0 ? ar ? 'أقرب بن مشابه' : i18nUi('أقرب بن مشابه', 'Closest similar coffee') : ar ? 'بن مشابه' : i18nUi('بن مشابه', 'Similar coffee')}</Txt>
              <RecipeServingBadge recipe={recipe} />
            </View>
            <Txt heading style={{ fontSize: 16, lineHeight: 23 }}>{recipe.title}</Txt>
            <CoffeeLabelMatchNotice recipe={recipe} compact />
            <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
              {recipeQuickFacts(recipe, ar).map(f => <View key={f.key} style={{ flexBasis: '46%', flexGrow: 1, borderRadius: 8, padding: 7, backgroundColor: colors.cream }}>
                <Txt style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}>{f.label}</Txt>
                <Txt style={{ fontSize: 14, lineHeight: 21, fontWeight: '700' }}>{f.value}</Txt>
              </View>)}
            </View>
            <Action compact title={ar ? 'فتح الوصفة ومصدرها' : i18nUi('فتح الوصفة ومصدرها', 'Open recipe & source')} onPress={() => openRecipe(recipe)} />
          </View>)}
        </ScrollView>
        {job ? <CoffeeLabelReader key={job.id} job={job} event={event => receive(event, job.id)} /> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
