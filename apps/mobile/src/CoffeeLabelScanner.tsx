import { useContext, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, View, useWindowDimensions } from './native';
import { Action, Field, Language, Txt, colors, styles } from './ui';
import type { CoffeeItem, RecipeItem } from './data';
import type { Method } from './core/engine';
import { contentLocale } from './localeText';
import { MethodPicker } from './CoffeeScreens';
import { CoffeeLabelReader } from './CoffeeLabelReader';
import type { CoffeeOcrEvent, CoffeeOcrJob } from './coffeeOcr';
import { readCoffeeLabel, coffeeLabelCandidates, emptyCoffeeLabel, hasCoffeeLabelFacts, type CoffeeLabel } from './coffeeLabel';
import { loadCoffeeLabelMatches } from './coffeeLabelMatches';
import { CoffeeLabelMatchNotice } from './CoffeeLabelMatchNotice';
import type { XBloomModel } from './xbloomMatching';
import { publicSupabase } from './client';
import { recipeQuickFacts } from './recipeQuickFacts';

export function ScanCoffeeButton({ openRecipe, coffees = [], method }: {
  openRecipe: (recipe: RecipeItem) => void; coffees?: CoffeeItem[]; method?: Method;
}) {
  const ar = useContext(Language) === 'ar';
  const [visible, setVisible] = useState(false);
  return <>
    <Action title={ar ? 'صوّر البن واختر الوصفة' : 'Scan coffee for a recipe'} onPress={() => setVisible(true)} />
    {visible ? <CoffeeLabelScanner coffees={coffees} method={method} close={() => setVisible(false)}
      openRecipe={recipe => { setVisible(false); openRecipe(recipe); }} /> : null}
  </>;
}
function CoffeeLabelScanner({ coffees, method: initialMethod, close, openRecipe }: {
  coffees: CoffeeItem[]; method?: Method; close: () => void; openRecipe: (recipe: RecipeItem) => void;
}) {
  const locale = useContext(Language); const ar = locale === 'ar'; const { width } = useWindowDimensions();
  const [label, setLabel] = useState(emptyCoffeeLabel);
  const [photo, setPhoto] = useState<string | null>(null);
  const [job, setJob] = useState<CoffeeOcrJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [pickBusy, setPickBusy] = useState(false);
  const [candidates, setCandidates] = useState<CoffeeItem[]>([]);
  const [coffee, setCoffee] = useState<CoffeeItem | null>(null);
  const [method, setMethod] = useState<Method>(initialMethod ?? 'xbloom');
  const [model, setModel] = useState<XBloomModel>('all');
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const mounted = useRef(true); const generation = useRef(0); const reading = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null); const picking = useRef(false);
  useEffect(() => () => { mounted.current = false; reading.current = null; controller.current?.abort(); }, []);
  const invalidate = () => { generation.current += 1; controller.current?.abort(); setMatching(false); setRecipes([]); setMatchError(false); setSearched(false); };
  const change = (key: keyof CoffeeLabel, value: string) => { invalidate(); setCoffee(null); setLabel(previous => ({ ...previous, [key]: value })); };
  const receive = (event: CoffeeOcrEvent) => {
    if (!mounted.current || !reading.current) return;
    if (event.type === 'progress') { setProgress(event.progress); return; }
    reading.current = null; setJob(null);
    if (event.type === 'error') { setOcrError(ar ? 'تعذّرت قراءة الصورة. أعد التصوير أو اكتب بيانات الكيس.' : 'Could not read the photo. Try again or enter the label details.'); return; }
    setLabel(readCoffeeLabel(event.text));
    setCandidates(coffeeLabelCandidates(event.text, coffees));
    if (!event.text.trim()) setOcrError(ar ? 'ما ظهر نص واضح. صوّر الملصق من قريب أو اكتب البيانات.' : 'No clear text found. Take a closer label photo or enter the details.');
  };
  useEffect(() => {
    if (!job) return;
    const timeout = setTimeout(() => receive({ type: 'error' }), 120000);
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
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.85, exif: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!mounted.current || result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64 || asset.base64.length > 14 * 1024 * 1024) throw new Error('IMAGE_SIZE');
      const mime = asset.base64.startsWith('iVBOR') ? 'image/png' : asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('IMAGE_FORMAT');
      invalidate(); setCoffee(null); setCandidates([]); setLabel(emptyCoffeeLabel()); setPhoto(asset.uri); setProgress(0);
      const id = String(++generation.current); reading.current = id;
      setJob({ id, image: `data:${mime};base64,${asset.base64}` });
    } catch (error) {
      if (mounted.current) setOcrError(error instanceof Error && error.message === 'CAMERA_PERMISSION'
        ? ar ? 'اسمح بالكاميرا أو اختر صورة من المعرض.' : 'Allow camera access or choose a photo.'
        : ar ? 'اختر صورة واضحة بصيغة JPEG أو PNG أو WebP بحجم أقل من 10 ميغابايت.' : 'Choose a clear JPEG, PNG or WebP photo under 10 MB.');
    } finally { picking.current = false; if (mounted.current) setPickBusy(false); }
  };
  const find = async () => {
    if (matching || job || (!coffee && !hasCoffeeLabelFacts(label))) return;
    invalidate(); const request = generation.current; const abort = new AbortController(); controller.current = abort;
    setMatching(true); setSearched(true);
    try {
      if (!publicSupabase) throw new Error('CONNECTION');
      const result = await loadCoffeeLabelMatches(publicSupabase, label, method, model, contentLocale(locale), abort.signal, coffee);
      if (mounted.current && generation.current === request) setRecipes(result);
    } catch { if (mounted.current && generation.current === request) setMatchError(true); }
    finally { if (mounted.current && generation.current === request) setMatching(false); }
  };
  return <Modal transparent visible animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#201A1570', justifyContent: width >= 700 ? 'center' : 'flex-end', alignItems: 'center', padding: width >= 700 ? 20 : 0 }}>
      <View testID="coffee-label-scanner" accessibilityViewIsModal style={{ width: '100%', maxWidth: 820, maxHeight: '94%', backgroundColor: colors.cream, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ padding: 14, gap: 10, flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt heading style={{ fontSize: 20, lineHeight: 28, flex: 1 }}>{ar ? 'من كيس البن إلى الوصفة' : 'From coffee bag to recipe'}</Txt>
          <Action compact title={ar ? 'إغلاق' : 'Close'} onPress={close} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
          <Txt style={{ fontSize: 14, lineHeight: 22 }}>{ar ? 'صوّر الملصق بوضوح، وراجع البيانات ثم اختر أقرب وصفة لبنك.' : 'Take a clear label photo, review the details, then find the closest recipe for your coffee.'}</Txt>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'مجاني. تُقرأ الصورة على جهازك ولا تُرفع. يحتاج قارئ النص اتصالًا عند تحميله.' : 'Free. Your photo is read on your device and is never uploaded. Loading the text reader needs a connection.'}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
            <Action title={ar ? 'تصوير الكيس' : 'Take a label photo'} disabled={pickBusy || !!job} onPress={() => void pick(true)} />
            <Action title={ar ? 'اختيار صورة' : 'Choose a photo'} disabled={pickBusy || !!job} onPress={() => void pick(false)} />
          </View>
          {photo ? <Image testID="coffee-label-photo" source={{ uri: photo }} resizeMode="contain" accessibilityLabel={ar ? 'صورة كيسك' : 'Your coffee label'} style={{ width: '100%', height: 150, borderRadius: 12 }} /> : null}
          {job ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><ActivityIndicator color={colors.teal} /><Txt>{ar ? 'جارٍ قراءة الملصق… ' : 'Reading the label… '}{Math.round(progress * 100)}%</Txt>
            <Action compact title={ar ? 'إلغاء القراءة' : 'Cancel reading'} onPress={() => { reading.current = null; setJob(null); }} /></View> : null}
          {ocrError ? <Txt accessibilityRole="alert" style={styles.error}>{ocrError}</Txt> : null}
          {candidates.length ? <View style={[styles.card, { padding: 12, gap: 8 }]}><Txt heading>{ar ? 'بن محتمل في مكتبتنا — اختره إذا هو كيسك' : 'Possible catalog coffee — select it if it is your bag'}</Txt>
            {candidates.map(candidate => <Action key={candidate.kind + candidate.id} title={candidate.name} selected={coffee === candidate} onPress={() => {
              invalidate(); setCoffee(candidate); setLabel({ name: candidate.name, origin: candidate.origin || '', variety: candidate.variety || '', process: candidate.process || '', roast: candidate.roast || '', notes: candidate.flavors.join(', ') });
            }} />)}</View> : null}
          <Txt heading style={{ fontSize: 17 }}>{ar ? 'راجع بيانات الكيس' : 'Review the label details'}</Txt>
          <Txt style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{ar ? 'اترك أي معلومة غير مذكورة فارغة. المنشأ يعني بلد زراعة البن.' : 'Leave unstated details blank. Origin means the coffee growing country.'}</Txt>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
            {([
              ['name', ar ? 'اسم البن' : 'Coffee name'], ['origin', ar ? 'منشأ البن' : 'Coffee origin'], ['variety', ar ? 'السلالة' : 'Variety'],
              ['process', ar ? 'المعالجة' : 'Processing'], ['roast', ar ? 'التحميص' : 'Roast level'],
            ] as const).map(([key, title]) => <View key={key} style={{ flexBasis: width >= 600 ? '47%' : '100%', flexGrow: 1 }}>
              <Field label={title} value={label[key]} editable={!job} maxLength={160} onChangeText={value => change(key, value)} /></View>)}
          </View>
          <Field label={ar ? 'الإيحاءات والطعم المكتوب على الكيس' : 'Tasting notes on the bag'} value={label.notes} editable={!job} maxLength={1000} multiline onChangeText={value => change('notes', value)} />
          <MethodPicker value={method} onChange={value => { invalidate(); setMethod(value ?? 'xbloom'); }} />
          {method === 'xbloom' ? <View style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'Studio', 'Original'] as const).map(value => <Action key={value} compact title={value === 'all' ? ar ? 'كل أجهزة xBloom' : 'All xBloom models' : value} selected={model === value} onPress={() => { invalidate(); setModel(value); }} />)}
          </View> : null}
          <Action title={ar ? 'اعثر على أقرب وصفة' : 'Find the closest recipe'} variant="primary" disabled={matching || !!job || (!coffee && !hasCoffeeLabelFacts(label))} onPress={() => void find()} />
          {matching ? <ActivityIndicator color={colors.teal} /> : null}
          {matchError ? <View style={{ gap: 8 }}><Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر البحث عن الوصفات. بياناتك موجودة؛ حاول مرة ثانية.' : 'Recipe search failed. Your details are kept; try again.'}</Txt><Action title={ar ? 'إعادة المحاولة' : 'Retry'} onPress={() => void find()} /></View> : null}
          {searched && !matching && !matchError && !recipes.length ? <View testID="coffee-label-no-match"><Txt>{ar ? 'ما لقينا وصفة منشورة قريبة بهالبيانات والطريقة. راجع الإيحاءات أو جرّب طريقة ثانية.' : 'No close published recipe for these details and method. Check the notes or try another method.'}</Txt></View> : null}
          {recipes.map((recipe, i) => <View key={recipe.id} testID="coffee-label-recipe" style={[styles.card, { padding: 12, marginBottom: 0, gap: 9 }]}>
            <Txt heading style={{ fontSize: 17, lineHeight: 24 }}>{i === 0 ? ar ? 'الأقرب لبياناتك' : 'Closest to your details' : ar ? 'خيار قريب آخر' : 'Another close option'}</Txt>
            <Txt heading>{recipe.title}</Txt><CoffeeLabelMatchNotice recipe={recipe} />
            <Txt style={{ fontSize: 13, lineHeight: 20 }}>{recipeQuickFacts(recipe,ar).map(f => `${f.label}: ${f.value}`).join(' · ')}</Txt>
            <Action title={ar ? 'فتح الوصفة ومصدرها' : 'Open recipe & source'} onPress={() => openRecipe(recipe)} />
          </View>)}
        </ScrollView>
        {job ? <CoffeeLabelReader key={job.id} job={job} event={receive} /> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
