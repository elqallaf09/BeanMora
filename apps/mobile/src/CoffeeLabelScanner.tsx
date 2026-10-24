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
import { publicSupabase } from './client';
import { recipeQuickFacts } from './recipeQuickFacts';
import { RecipeServingBadge } from './RecipeServingBadge';
import { CoffeeLabelCropper } from './CoffeeLabelCropper';

export function ScanCoffeeButton({ openRecipe, coffees = [], method }: {
  openRecipe: (recipe: RecipeItem) => void; coffees?: CoffeeItem[]; method?: Method;
}) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [visible, setVisible] = useState(false);
  return <>
    <Action title={ar ? 'صوّر البن واختر الوصفة' : i18nUi('صوّر البن واختر الوصفة', 'Scan coffee for a recipe')} onPress={() => setVisible(true)} />
    {visible ? <CoffeeLabelScanner coffees={coffees} method={method} close={() => setVisible(false)}
      openRecipe={recipe => { setVisible(false); openRecipe(recipe); }} /> : null}
  </>;
}
function CoffeeLabelScanner({ coffees, method: initialMethod, close, openRecipe }: {
  coffees: CoffeeItem[]; method?: Method; close: () => void; openRecipe: (recipe: RecipeItem) => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language); const ar = locale === 'ar'; const { width } = useWindowDimensions();
  const [label, setLabel] = useState(emptyCoffeeLabel);
  const [photo, setPhoto] = useState<{ uri: string; image: string; width: number; height: number } | null>(null);
  const [cropping, setCropping] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [serving, setServing] = useState<LabelServing>('');
  const [job, setJob] = useState<CoffeeOcrJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [pickBusy, setPickBusy] = useState(false);
  const [candidates, setCandidates] = useState<CoffeeItem[]>([]);
  const [coffee, setCoffee] = useState<CoffeeItem | null>(null);
  const [method, setMethod] = useState<Method>(initialMethod ?? 'xbloom');
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const mounted = useRef(true); const generation = useRef(0); const reading = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null); const picking = useRef(false);
  useEffect(() => () => { mounted.current = false; reading.current = null; controller.current?.abort(); }, []);
  const invalidate = () => { generation.current += 1; controller.current?.abort(); setMatching(false); setRecipes([]); setMatchError(false); setSearched(false); };
  const change = (key: keyof CoffeeLabel, value: string) => { invalidate(); setCoffee(null); setLabel(previous => ({ ...previous, [key]: value })); };
  const receive = (event: CoffeeOcrEvent, id: string | null = reading.current) => {
    if (!mounted.current || !reading.current || reading.current !== id) return;
    if (event.type === 'progress') { setProgress(event.progress); return; }
    reading.current = null; setJob(null);
    if (event.type === 'error') { setOcrError(ar ? 'تعذّرت قراءة الصورة. أعد التصوير أو اكتب بيانات الكيس.' : i18nUi('تعذّرت قراءة الصورة. أعد التصوير أو اكتب بيانات الكيس.', 'Could not read the photo. Try again or enter the label details.')); return; }
    const parsed = readCoffeeLabel(event.text, event.titles);
    // Product names have no finite vocabulary to validate against. Do not turn
    // a weak reading of a logo/title into an asserted product identity.
    if (event.confidence !== undefined && event.confidence < 70 && !event.titles?.includes(parsed.name)) parsed.name = '';
    setLabel(parsed); setRawText(event.rawText ?? event.text); setNeedsReview(true);
    setCandidates(coffeeLabelCandidates(event.text, coffees));
    if (!hasCoffeeLabelFacts(parsed) || (event.confidence !== undefined && event.confidence < 55 && (!parsed.name || !parsed.notes))) setOcrError(ar ? 'القراءة غير مكتملة. حدّد الملصق أو صوّره من قريب، وراجع الحقول قبل البحث.' : i18nUi('القراءة غير مكتملة. حدّد الملصق أو صوّره من قريب، وراجع الحقول قبل البحث.', 'The reading is incomplete. Crop the label or take a closer photo, then check the fields before searching.'));
  };
  useEffect(() => {
    if (!job) return;
    const timeout = setTimeout(() => receive({ type: 'error' }, job.id), 120000);
    return () => clearTimeout(timeout);
  }, [job]);
  const pick = async (camera: boolean) => {
    if (picking.current || job) return;
    picking.current = true; setPickBusy(true); setOcrError('');
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('CAMERA_PERMISSION');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 1, exif: false,
        cameraType: ImagePicker.CameraType.back };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!mounted.current || result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64 || asset.base64.length > 14 * 1024 * 1024) throw new Error('IMAGE_SIZE');
      // iOS may report the original HEIC MIME after returning JPEG pixels.
      const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBOR') ? 'image/png' : asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('IMAGE_FORMAT');
      invalidate(); setCoffee(null); setCandidates([]); setLabel(emptyCoffeeLabel()); setProgress(0);
      setRawText(''); setShowText(false); setCropping(true); setNeedsReview(true);
      setPhoto({ uri: asset.uri, image: `data:${mime};base64,${asset.base64}`, width: asset.width || 1, height: asset.height || 1 });
    } catch (error) {
      if (mounted.current) setOcrError(error instanceof Error && error.message === 'CAMERA_PERMISSION'
        ? ar ? 'اسمح بالكاميرا أو اختر صورة من المعرض.' : i18nUi('اسمح بالكاميرا أو اختر صورة من المعرض.', 'Allow camera access or choose a photo.')
        : ar ? 'اختر صورة واضحة بصيغة JPEG أو PNG أو WebP بحجم أقل من 10 ميغابايت.' : i18nUi('اختر صورة واضحة بصيغة JPEG أو PNG أو WebP بحجم أقل من 10 ميغابايت.', 'Choose a clear JPEG, PNG or WebP photo under 10 MB.'));
    } finally { picking.current = false; if (mounted.current) setPickBusy(false); }
  };
  const readCrop = (crop: CoffeeOcrCrop) => {
    if (!photo || job) return;
    invalidate(); setCoffee(null); setCandidates([]); setLabel(emptyCoffeeLabel()); setRawText(''); setOcrError('');
    setCropping(false); setNeedsReview(true); setProgress(0);
    const id = String(++generation.current); reading.current = id;
    const full = crop.left === 0 && crop.top === 0 && crop.width === 1 && crop.height === 1;
    setJob({ id, image: photo.image, ...(full ? {} : { crop }) });
  };
  const find = async () => {
    if (matching || job || needsReview || cropping || (!coffee && !hasCoffeeLabelFacts(label))) return;
    invalidate(); const request = generation.current; const abort = new AbortController(); controller.current = abort;
    setMatching(true); setSearched(true);
    try {
      if (!publicSupabase) throw new Error('CONNECTION');
      const result = await loadCoffeeLabelMatches(publicSupabase, label, method, 'all', contentLocale(locale), abort.signal, coffee, serving);
      if (mounted.current && generation.current === request) setRecipes(result);
    } catch { if (mounted.current && generation.current === request) setMatchError(true); }
    finally { if (mounted.current && generation.current === request) setMatching(false); }
  };
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
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'مجاني. تُقرأ الصورة على جهازك ولا تُرفع. يحتاج قارئ النص اتصالًا عند تحميله.' : i18nUi('مجاني. تُقرأ الصورة على جهازك ولا تُرفع. يحتاج قارئ النص اتصالًا عند تحميله.', 'Free. Your photo is read on your device and is never uploaded. Loading the text reader needs a connection.')}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            <Action compact title={ar ? 'تصوير الكيس' : i18nUi('تصوير الكيس', 'Take a label photo')} disabled={pickBusy || !!job} onPress={() => void pick(true)} />
            <Action compact title={ar ? 'اختيار صورة' : i18nUi('اختيار صورة', 'Choose a photo')} disabled={pickBusy || !!job} onPress={() => void pick(false)} />
          </View>
          {photo && !cropping ? <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
            <Image testID="coffee-label-photo" source={{ uri: photo.uri }} resizeMode="contain" accessibilityLabel={ar ? 'صورة كيسك' : i18nUi('صورة كيسك', 'Your coffee label')} style={{ width: 110, height: 150, borderRadius: 10 }} />
            <View style={{ flex: 1, gap: 6 }}><Txt style={{ fontSize: 12, lineHeight: 18 }}>{ar ? 'قرّب الكتابة وحدّد الملصق لقراءة أوضح.' : i18nUi('قرّب الكتابة وحدّد الملصق لقراءة أوضح.', 'Fill the photo with text, or crop the label for a clearer reading.')}</Txt>
              <Action compact title={ar ? 'تحديد الملصق وإعادة القراءة' : i18nUi('تحديد الملصق وإعادة القراءة', 'Crop label and reread')} disabled={!!job} onPress={() => { invalidate(); setCropping(true); }} /></View>
          </View> : null}
          {photo && cropping ? <CoffeeLabelCropper photo={photo} apply={readCrop} cancel={() => setCropping(false)} /> : null}
          {job ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><ActivityIndicator color={colors.teal} /><Txt>{ar ? 'جارٍ قراءة الملصق… ' : i18nUi('جارٍ قراءة الملصق… ', 'Reading the label… ')}{Math.round(progress * 100)}%</Txt>
            <Action compact title={ar ? 'إلغاء القراءة' : i18nUi('إلغاء القراءة', 'Cancel reading')} onPress={() => { reading.current = null; setJob(null); }} /></View> : null}
          {ocrError ? <Txt accessibilityRole="alert" style={styles.error}>{ocrError}</Txt> : null}
          {candidates.length ? <View style={[styles.card, { padding: 12, gap: 8 }]}><Txt heading>{ar ? 'بن محتمل في مكتبتنا — اختره إذا هو كيسك' : i18nUi('بن محتمل في مكتبتنا — اختره إذا هو كيسك', 'Possible catalog coffee — select it if it is your bag')}</Txt>
            {candidates.map(candidate => <Action key={candidate.kind + candidate.id} title={candidate.name} selected={coffee === candidate} onPress={() => {
              invalidate(); setCoffee(candidate); setNeedsReview(false); setOcrError(''); setLabel({ name: candidate.name, origin: candidate.origin || '', variety: candidate.variety || '', process: candidate.process || '', roast: candidate.roast || '', notes: candidate.flavors.join(', ') });
            }} />)}</View> : null}
          <Txt heading style={{ fontSize: 17 }}>{ar ? 'راجع بيانات الكيس' : i18nUi('راجع بيانات الكيس', 'Review the label details')}</Txt>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'اترك أي معلومة غير مذكورة فارغة. المنشأ يعني بلد زراعة البن.' : i18nUi('اترك أي معلومة غير مذكورة فارغة. المنشأ يعني بلد زراعة البن.', 'Leave unstated details blank. Origin means the coffee growing country.')}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
            {([
              ['name', ar ? 'اسم البن' : i18nUi('اسم البن', 'Coffee name')], ['origin', ar ? 'منشأ البن' : i18nUi('منشأ البن', 'Coffee origin')], ['variety', ar ? 'السلالة' : i18nUi('السلالة', 'Variety')],
              ['process', ar ? 'المعالجة' : i18nUi('المعالجة', 'Processing')], ['roast', ar ? 'التحميص' : i18nUi('التحميص', 'Roast level')],
            ] as const).map(([key, title]) => <View key={key} style={{ flexBasis: key === 'name' ? '100%' : '46%', flexGrow: 1 }}>
              <Field style={{ minHeight: 42, paddingVertical: 7, fontSize: 14 }} label={title} value={label[key]} editable={!job} maxLength={160} onChangeText={value => change(key, value)} /></View>)}
          </View>
          <Field style={{ minHeight: 50, paddingVertical: 8, fontSize: 14 }} label={ar ? 'الإيحاءات والطعم المكتوب على الكيس' : i18nUi('الإيحاءات والطعم المكتوب على الكيس', 'Tasting notes on the bag')} value={label.notes} editable={!job} maxLength={1000} multiline onChangeText={value => change('notes', value)} />
          {rawText ? <View style={{ gap: 6 }}>
            <Action compact title={showText ? ar ? 'إخفاء النص المقروء' : i18nUi('إخفاء النص المقروء', 'Hide scanned text') : ar ? 'عرض النص المقروء' : i18nUi('عرض النص المقروء', 'Show scanned text')} onPress={() => setShowText(v => !v)} />
            {showText ? <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{rawText}</Txt> : null}
          </View> : null}
          {needsReview && !job ? <Action compact title={ar ? 'راجعت بيانات الكيس' : i18nUi('راجعت بيانات الكيس', 'I reviewed the label details')} disabled={!hasCoffeeLabelFacts(label)} onPress={() => { setNeedsReview(false); setOcrError(''); }} /> : null}
          <MethodPicker value={method} onChange={value => { invalidate(); setMethod(value ?? 'xbloom'); }} />
          <View testID="coffee-label-serving-filters" style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            {([['', ar ? 'الكل' : i18nUi('الكل', 'All')], ['hot', ar ? 'حار' : i18nUi('حار', 'Hot')], ['cold_or_iced', ar ? 'بارد' : i18nUi('بارد', 'Cold')]] as const).map(([value, title]) =>
              <Action key={value} compact title={title} selected={serving === value} onPress={() => { invalidate(); setServing(value); }} />)}
          </View>
          <Action title={ar ? 'اعثر على أقرب وصفة' : i18nUi('اعثر على أقرب وصفة', 'Find the closest recipe')} variant="primary" disabled={matching || !!job || needsReview || cropping || (!coffee && !hasCoffeeLabelFacts(label))} onPress={() => void find()} />
          {matching ? <ActivityIndicator color={colors.teal} /> : null}
          {matchError ? <View style={{ gap: 8 }}><Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر البحث عن الوصفات. بياناتك موجودة؛ حاول مرة ثانية.' : i18nUi('تعذّر البحث عن الوصفات. بياناتك موجودة؛ حاول مرة ثانية.', 'Recipe search failed. Your details are kept; try again.')}</Txt><Action title={ar ? 'إعادة المحاولة' : i18nUi('إعادة المحاولة', 'Retry')} onPress={() => void find()} /></View> : null}
          {searched && !matching && !matchError && !recipes.length ? <View testID="coffee-label-no-match"><Txt>{ar ? 'ما لقينا وصفة منشورة قريبة لهالبيانات وطريقة التحضير والتقديم. راجع البيانات أو جرّب نوع تقديم آخر.' : i18nUi('ما لقينا وصفة منشورة قريبة لهالبيانات وطريقة التحضير والتقديم. راجع البيانات أو جرّب نوع تقديم آخر.', 'No close published recipe for these details, method and serving. Review the details or try another serving style.')}</Txt></View> : null}
          {recipes.length ? <View style={{ gap: 5 }}>
            <Txt heading style={{ fontSize: 16 }}>{ar ? `الوصفات الأقرب (${recipes.length})` : i18nUi(`الوصفات الأقرب (${recipes.length})`, `Closest recipes (${recipes.length})`)}</Txt>
            <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'الترتيب حسب البيانات المشتركة. وصفات البن المشابه نقطة بداية؛ عدّلها حسب طعم كوبك.' : i18nUi('الترتيب حسب البيانات المشتركة. وصفات البن المشابه نقطة بداية؛ عدّلها حسب طعم كوبك.', 'Ranked by shared details. Similar-coffee recipes are a starting point; adjust to your taste.')}</Txt>
          </View> : null}
          {recipes.map((recipe, i) => <View key={recipe.id} testID="coffee-label-recipe" style={[styles.card, { padding: 10, marginBottom: 0, gap: 7 }]}>
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
