import { useContext, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Linking } from './native';
import { Action, Field, Language, Txt, colors, styles, useLabels } from './ui';
import { SelectionMenu } from './SelectionMenu';
import { Disclosure } from './Disclosure';
import { ScanCoffeeButton } from './CoffeeLabelScanner';
import { publicSupabase, supabase, catalogScope } from './client';
import { shareToXBloom, XBloomShareError } from './xbloomShare';
import { mapRecipe, RECIPE_FIELDS, type CoffeeItem, type RecipeItem, type RecipeRow } from './data';
import { emptyRecipeFilters, recipeCatalogPage, RECIPE_DISCOVERY_FIELDS } from './recipeDiscovery';
import { buildXBloomDraft, compatibleXBloom, type XBloomDraft, type XBloomPreferences } from './xbloomDraft';
import { generateXBloom, generatedDraft, XBloomGeneratorError, type GeneratedXBloom, type IceLevel, type Provenance, type XBloomTaste } from './xbloomGenerator';

// The catalog's flavor families double as the taste preference.
const TASTE: Record<string, XBloomTaste> = { fruity: 'fruity', floral: 'floral', citrus: 'bright', chocolate: 'chocolate', caramel: 'sweet', nutty: 'full' };

type CupSize = 'small' | 'medium' | 'large' | 'custom';
// Cup sizes as coffee doses inside each machine's window; water follows the published ratio.
const SIZE_DOSE: Record<XBloomPreferences['model'], Record<Exclude<CupSize, 'custom'>, number>> = {
  Studio: { small: 12, medium: 15, large: 20 }, Original: { small: 15, medium: 18, large: 22 },
};

export function XBloomPlanner({ openRecipe, coffees = [], onDraft }: {
  openRecipe: (r: RecipeItem) => void; coffees?: CoffeeItem[]; onDraft?: (draft: XBloomDraft) => void;
}) {
  const L = useLabels(); const locale = useContext(Language); const ar = locale === 'ar';
  const [p, setP] = useState<XBloomPreferences>({ model: 'Studio', cup: 'Omni', serving: 'hot', amount: '15', unit: 'dose', coffee: '', flavor: '' });
  const [size, setSize] = useState<CupSize>('medium'); const [ice, setIce] = useState<IceLevel>('regular');
  const [rows, setRows] = useState<RecipeItem[]>([]); const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState<number | null>(null); const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false); const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const [generated, setGenerated] = useState<{ recipe: GeneratedXBloom; template: RecipeItem } | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  function change<K extends keyof XBloomPreferences>(key: K, value: XBloomPreferences[K]) {
    pending.current?.abort(); setBusy(false); setRows([]); setPage(0); setTotal(null); setSearched(false); setError(''); setGenerated(null);
    setP(v => {
      const next = { ...v, [key]: value };
      // A preset size is a dose that depends on the machine.
      return key === 'model' && size !== 'custom' ? { ...next, unit: 'dose', amount: String(SIZE_DOSE[next.model][size]) } : next;
    });
  }
  function pickSize(next: CupSize) {
    setSize(next); setGenerated(null); setError('');
    if (next !== 'custom') setP(v => ({ ...v, unit: 'dose', amount: String(SIZE_DOSE[v.model][next]) }));
  }
  function choose(recipe: RecipeItem) {
    setError('');
    if (!compatibleXBloom(recipe, p)) { setError(L('الوصفة لا تطابق الجهاز أو القمع أو نوع التحضير المحدد.', 'This recipe does not match the selected machine, dripper or serving style.')); return; }
    if (!onDraft) { openRecipe(recipe); return; }
    try { onDraft(buildXBloomDraft(recipe, p, ar)); }
    catch { setError(L('تحتاج وصفة بصبات وجرعة منشورة. اختر حجمًا بين نصف وضعف الأصل، بجرعة 5–30 g وماء 50–500 ml.', 'Published pours and dose are required. Choose half to twice the original size, within 5–30 g coffee and 50–500 ml water.')); }
  }
  function generate(candidates: RecipeItem[], coffee = p.coffee, general = false) {
    setError(''); setGenerated(null);
    try {
      const recipe = generateXBloom(candidates, p, TASTE[p.flavor] ?? '', { general, ice });
      const template = candidates.find(r => r.id === recipe.templateId);
      if (!template) throw new XBloomGeneratorError('NO_BASIS');
      if (coffee !== p.coffee) setP(v => ({ ...v, coffee }));
      setGenerated({ recipe, template });
    } catch (failure) {
      const reason = failure instanceof XBloomGeneratorError ? failure.reason : 'INVALID';
      setError(reason === 'NO_BASIS' ? L('ما في وصفات منشورة لهالجهاز مع هالقمع ونوع التحضير. جرّب قمع ثاني أو غيّر بين حار وبارد.', 'No published recipes for this machine with this dripper and serving. Try the other dripper or switch hot/iced.')
        : reason === 'AMOUNT' ? L('اكتب كمية صحيحة.', 'Enter a valid amount.')
        : reason === 'DOSE_RANGE' ? (p.model === 'Studio' ? L('الكمية خارج حدود Studio: جرعة البن بين 5 و25 g. صغّر أو كبّر الكمية.', 'Outside Studio limits: coffee dose must be 5–25 g. Adjust the amount.') : L('الكمية خارج حدود Original: جرعة البن بين 15 و25 g. صغّر أو كبّر الكمية.', 'Outside Original limits: coffee dose must be 15–25 g. Adjust the amount.'))
        : reason === 'WATER_RANGE' ? L('ماء الاستخلاص لازم يكون بين 50 و500 ml.', 'Brew water must be 50–500 ml.')
        : L('تعذّر تجهيز وصفة صحيحة من هذه النتائج. جرّب إعدادات ثانية.', 'Could not build a valid recipe from these results. Try other settings.'));
    }
  }
  async function load(query: string, flavor: string, nextPage: number, pageSize: number, signal: AbortSignal) {
    if (!publicSupabase) throw new Error('CONNECTION');
    const filters = { ...emptyRecipeFilters(), servingStyle: p.serving, flavorFamily: flavor as ReturnType<typeof emptyRecipeFilters>['flavorFamily'] };
    const result = await recipeCatalogPage(publicSupabase, { query, method: 'xbloom', deviceModel: p.model, cup: p.cup, filters }, nextPage,
      `${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`, signal, pageSize);
    if (result.error) throw result.error;
    const matched = ((result.data ?? []) as unknown as RecipeRow[]).flatMap(row => { const recipe = mapRecipe(row, locale); return recipe && compatibleXBloom(recipe, p) ? [recipe] : []; });
    return { matched, count: result.count };
  }
  async function search(nextPage = 0) {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); if (nextPage === 0) { setRows([]); setSearched(false); setTotal(null); }
    try {
      const { matched, count } = await load(p.coffee, p.flavor, nextPage, 12, controller.signal);
      if (controller.signal.aborted) return;
      setRows(previous => nextPage === 0 ? matched : [...new Map([...previous, ...matched].map(r => [r.id, r])).values()]);
      setPage(nextPage); setTotal(count); setSearched(true);
    } catch { if (!controller.signal.aborted) setError(L('تعذّر البحث. حاول مرة أخرى.', 'Search failed. Try again.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  // Always end with a recipe: the coffee's own matches first, then the general
  // pool for the same machine, dripper and serving (with, then without, the taste).
  async function make() {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setGenerated(null); setRows([]); setSearched(false); setTotal(null);
    const usable = (items: RecipeItem[]) => items.some(r => !!r.sourceBrew.pours?.length);
    try {
      const named = p.coffee.trim() ? (await load(p.coffee, p.flavor, 0, 12, controller.signal)).matched : [];
      if (controller.signal.aborted) return;
      if (usable(named)) { generate(named); return; }
      let pool = (await load('', p.flavor, 0, 24, controller.signal)).matched;
      if (!usable(pool) && p.flavor) pool = (await load('', '', 0, 24, controller.signal)).matched;
      if (controller.signal.aborted) return;
      generate(pool, p.coffee, true);
    } catch { if (!controller.signal.aborted) setError(L('تعذّر تحضير الوصفة. تأكد من النت وحاول.', 'Could not prepare the recipe. Check your connection and retry.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <Disclosure title={onDraft ? L('أنشئ وصفة xBloom لبنّك', 'Create an xBloom recipe for your coffee') : L('اصنع وصفة xBloom لبنّك', 'Make an xBloom recipe for your coffee')}
    subtitle={L('جاوب على كم سؤال ونجهز لك وصفة كاملة تفتحها في xBloom', 'Answer a few questions and get a full recipe to open in xBloom')} testID="xbloom-planner">
    <Field label={L('اسم البن أو المحمصة (اختياري)', 'Coffee or roaster (optional)')} value={p.coffee} onChangeText={v => change('coffee', v)} maxLength={160} />
    <SelectionMenu label={L('جهاز xBloom', 'xBloom machine')} value={p.model} items={['Studio', 'Original'].map(id => ({ id, name: id }))} onChange={v => change('model', v as XBloomPreferences['model'])} />
    <SelectionMenu label={L('القمع', 'Dripper')} value={p.cup} items={['Omni', 'xPod'].map(id => ({ id, name: id }))} onChange={v => change('cup', v as XBloomPreferences['cup'])} />
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8 }}>
      <Action compact title={L('حار', 'Hot')} selected={p.serving === 'hot'} onPress={() => change('serving', 'hot')} />
      <Action compact title={L('بارد ومثلج', 'Cold & iced')} selected={p.serving === 'cold_or_iced'} onPress={() => change('serving', 'cold_or_iced')} />
    </View>
    <Txt style={{ fontSize: 14, lineHeight: 22, fontWeight: '700' }}>{L('حجم الكوب', 'Cup size')}</Txt>
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['small', 'medium', 'large'] as const).map(id => <Action key={id} compact selected={size === id} onPress={() => pickSize(id)}
        title={`${id === 'small' ? L('صغير', 'Small') : id === 'medium' ? L('وسط', 'Medium') : L('كبير', 'Large')} · ${SIZE_DOSE[p.model][id]} g`} />)}
      <Action compact selected={size === 'custom'} title={L('أحدد بنفسي', 'Custom')} onPress={() => pickSize('custom')} />
    </View>
    {p.serving !== 'hot' ? <>
      <Txt style={{ fontSize: 14, lineHeight: 22, fontWeight: '700' }}>{L('كمية الثلج', 'Ice')}</Txt>
      <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['light', 'regular', 'extra'] as const).map(id => <Action key={id} compact selected={ice === id} onPress={() => { setIce(id); setGenerated(null); }}
          title={id === 'light' ? L('ثلج قليل', 'Light ice') : id === 'regular' ? L('عادي', 'Regular') : L('ثلج وايد', 'Extra ice')} />)}
      </View>
    </> : null}
    <SelectionMenu label={L('الإيحاء اللي تبيه (اختياري)', 'Flavour you want (optional)')} value={p.flavor} items={[
      { id: '', name: L('بدون تفضيل', 'No preference') }, { id: 'fruity', name: L('فاكهي', 'Fruity') },
      { id: 'chocolate', name: L('شوكولاتة', 'Chocolate') }, { id: 'caramel', name: L('كراميل', 'Caramel') },
      { id: 'floral', name: L('زهري', 'Floral') }, { id: 'citrus', name: L('حمضي', 'Citrus') }, { id: 'nutty', name: L('مكسرات', 'Nutty') },
    ]} onChange={v => change('flavor', v)} />
    {size === 'custom' ? <>
      <SelectionMenu label={L('تحديد الكمية حسب', 'Set amount by')} value={p.unit} items={[{ id: 'water', name: L('ماء الاستخلاص (ml)', 'Brew water (ml)') }, { id: 'dose', name: L('جرعة البن (g)', 'Coffee dose (g)') }]} onChange={v => { change('unit', v as XBloomPreferences['unit']); setP(prev => ({ ...prev, amount: v === 'water' ? '250' : '15' })); }} />
      <Field label={p.unit === 'water' ? L('ماء الاستخلاص دون الثلج (ml)', 'Brew water excluding ice (ml)') : L('جرعة البن (g)', 'Coffee dose (g)')} keyboardType="decimal-pad" value={p.amount} onChangeText={v => change('amount', v)} />
    </> : null}
    <ScanCoffeeButton method="xbloom" coffees={coffees} openRecipe={choose} model={p.model} serving={p.serving} cup={p.cup} onMatches={(recipes, name) => generate(recipes, name || p.coffee)} />
    <Action variant="primary" disabled={busy} title={L('حضّر الوصفة', 'Generate my recipe')} onPress={() => void make()} />
    {onDraft ? <Action disabled={busy} title={L('أو اختر وصفة منشورة كأساس', 'Or pick a published recipe as the base')} onPress={() => void search()} /> : null}
    {busy ? <ActivityIndicator color={colors.teal} /> : null}
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {generated ? <GeneratedCard generated={generated.recipe} ar={ar} coffee={p.coffee} rpm={generated.template.sourceBrew.rpm}
      action={onDraft ? L('استخدمها كمسودة', 'Use as my draft') : L('افتح الوصفة الأساس ومصدرها', 'Open the base recipe & source')}
      onAction={() => onDraft ? onDraft(generatedDraft(generated.recipe, generated.template, p.coffee, ar)) : openRecipe(generated.template)} /> : null}
    {searched && !rows.length ? <Txt>{L('لا توجد وصفات مطابقة. جرّب اسم البن فقط أو غيّر المذاق. طحنة Studio لا تُخلط مع Original.', 'No matching recipes. Try the coffee name alone or another taste. Studio and Original grind settings are kept separate.')}</Txt> : null}
    {total !== null ? <Txt style={styles.muted}>{L('نتائج متوافقة: ', 'Compatible matches: ') + total.toLocaleString('en-US')}</Txt> : null}
    {rows.map(r => <View key={r.id} style={[styles.card, { gap: 8, marginBottom: 0 }]}>
      <Txt heading>{r.title}</Txt><Txt style={styles.muted}>{r.author || ''} · {p.model} · {p.cup}</Txt>
      <Action title={onDraft ? L('استخدم هذه الوصفة كأساس', 'Use as my base recipe') : L('تفاصيل الوصفة', 'Recipe details')} onPress={() => choose(r)} />
    </View>)}
    {total !== null && (page + 1) * 12 < total ? <Action disabled={busy} title={L('عرض وصفات أكثر', 'Show more recipes')} onPress={() => void search(page + 1)} /> : null}
  </Disclosure>;
}

function GeneratedCard({ generated: g, ar, action, onAction, coffee, rpm }: { generated: GeneratedXBloom; ar: boolean; action: string; onAction: () => void; coffee: string; rpm?: number | null }) {
  const L = useLabels();
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState('');
  const [shareError, setShareError] = useState('');
  useEffect(() => { setLink(''); setShareError(''); }, [g]);
  const open = (url: string) => Linking.openURL(url).catch(() => setShareError(L('تعذّر فتح الرابط. تأكد إن تطبيق xBloom مثبّت.', 'Could not open the link. Check that the xBloom app is installed.')));
  async function share() {
    if (link) { void open(link); return; }
    setSharing(true); setShareError('');
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session || session.user.is_anonymous) throw new XBloomShareError('signin');
      const url = await shareToXBloom({ url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', accessToken: session.access_token }, g, coffee || `${g.model} ${g.dose}g`, rpm);
      setLink(url); void open(url);
    } catch (failure) {
      const reason = failure instanceof XBloomShareError ? failure.reason : 'unavailable';
      setShareError(reason === 'signin' ? L('سجّل دخولك أول عشان نحفظ الوصفة لك في xBloom.', 'Sign in first so we can save the recipe to xBloom.')
        : reason === 'rate' ? L('وصلت الحد اليومي للحفظ في xBloom. أدخلها يدويًا أو جرّب باجر.', 'Daily xBloom save limit reached. Enter it manually or try tomorrow.')
        : reason === 'busy' ? L('الوصفة قاعدة تنحفظ. انتظر شوي وحاول.', 'This recipe is being saved. Wait a moment and retry.')
        : reason === 'network' ? L('ما قدرنا نتصل. تأكد من النت وحاول.', 'Could not connect. Check your connection and retry.')
        : L('الحفظ في xBloom مو متاح الحين. أدخل الوصفة يدويًا من الأرقام فوق.', 'Saving to xBloom is unavailable right now. Enter the recipe manually from the numbers above.'));
    } finally { setSharing(false); }
  }
  const tag = (kind: Provenance) => kind === 'published' ? L('من وصفات منشورة', 'From published recipes') : kind === 'preference' ? L('من ذوقك', 'From your taste') : L('تقدير', 'Estimate');
  const facts: [string, string][] = [
    [L('الجرعة', 'Dose'), `${g.dose} g`], [L('ماء الاستخلاص', 'Brew water'), `${g.water} ml`], [L('النسبة', 'Ratio'), `1:${g.ratio}`],
    [L('الطحنة', 'Grind') + ` (${g.model})`, String(g.grind)], [L('الحرارة', 'Temperature'), `${g.temperature}°C`],
    ...(g.seconds ? [[L('الوقت التقريبي', 'Approx. time'), `${Math.floor(g.seconds / 60)}:${String(g.seconds % 60).padStart(2, '0')}`] as [string, string]] : []),
  ];
  return <View testID="xbloom-generated" style={[styles.card, { gap: 10, marginBottom: 0 }]}>
    <Txt heading>{L('وصفتك المقترحة', 'Your suggested recipe')}</Txt>
    <Txt style={styles.muted}>{`xBloom ${g.model} · ${g.cup} · ${g.serving === 'hot' ? L('حار', 'Hot') : L('بارد ومثلج', 'Cold & iced')}`}</Txt>
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
      {facts.map(([label, value]) => <View key={label} style={{ flexBasis: '30%', flexGrow: 1, borderRadius: 8, padding: 8, backgroundColor: colors.cream }}>
        <Txt style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}>{label}</Txt>
        <Txt style={{ fontSize: 15, lineHeight: 22, fontWeight: '700' }}>{value}</Txt>
      </View>)}
    </View>
    <Txt heading style={{ fontSize: 15 }}>{L('الصبات', 'Pours')}</Txt>
    {g.pours.map((pour, i) => <Txt key={i} style={{ fontSize: 14, lineHeight: 22 }}>{`${i + 1}. ${pour.volume} ml`
      + (pour.temperature !== null ? ` · ${pour.temperature}°C` : '') + (pour.pause_seconds !== null ? ` · ${L('توقف', 'Pause')} ${pour.pause_seconds}s` : '')}</Txt>)}
    {g.ice ? <Txt style={{ fontSize: 14, lineHeight: 22 }}>{L(`حط في الكوب حوالي ${g.ice} g ثلج قبل التحضير (${tag('estimate')}). الماء فوق ماء الاستخلاص فقط.`, `Put about ${g.ice} g of ice in the cup before brewing (${tag('estimate')}). The water above is brew water only.`)}</Txt>
      : g.serving === 'iced' ? <Txt style={styles.muted}>{L('الماء هنا ماء الاستخلاص فقط. أضف الثلج في الكوب.', 'This is brew water only. Add ice to the cup.')}</Txt> : null}
    {g.basis === 'general' ? <Txt style={{ fontSize: 13, lineHeight: 21, color: colors.muted }}>{L(coffee.trim() ? 'ما لقينا وصفات منشورة لهالبن بالاسم، فهذي وصفة عامة لنفس الجهاز والقمع ونوع التحضير.' : 'وصفة عامة لنفس الجهاز والقمع ونوع التحضير. اكتب اسم البن أو صوّر الكيس لوصفة أقرب.',
      coffee.trim() ? 'No published recipes matched this coffee by name, so this is a general recipe for the same machine, dripper and serving.' : 'A general recipe for this machine, dripper and serving. Enter the coffee or scan the bag for a closer one.')}</Txt> : null}
    <Txt heading style={{ fontSize: 15 }}>{L('ليش هالإعدادات؟', 'Why these settings?')}</Txt>
    <Txt style={{ fontSize: 13, lineHeight: 21 }}>{`${tag('published')}: `}{g.basis === 'general' ? L(`النسبة والطحنة والحرارة هي الوسيط في ${g.sourceIds.length} وصفة منشورة لنفس الجهاز والقمع.`, `Ratio, grind and temperature are the median of ${g.sourceIds.length} published recipes for the same machine and dripper.`) : L(`النسبة والطحنة والحرارة من أقرب ${g.sourceIds.length} وصفات لنفس الجهاز والقمع.`, `Ratio, grind and temperature come from the ${g.sourceIds.length} closest recipes for the same machine and dripper.`)}</Txt>
    {g.tasteShift.grind || g.tasteShift.temperature ? <Txt style={{ fontSize: 13, lineHeight: 21 }}>{`${tag('preference')}: `}{L('عدّلنا الطحنة أو الحرارة درجة بسيطة حسب المذاق اللي اخترته.', 'Grind or temperature moved one small step for the taste you chose.')}</Txt> : null}
    {g.provenance.pours === 'estimate' ? <Txt style={{ fontSize: 13, lineHeight: 21 }}>{`${tag('estimate')}: `}{L('كميات الصبات محسوبة بتكبير أو تصغير أقرب وصفة لتطابق الكمية اللي طلبتها.', 'Pour volumes are scaled from the closest recipe to match the amount you asked for.')}</Txt> : null}
    <Txt style={styles.muted}>{L('نقطة بداية غير مجرّبة على جهازك. عدّلها حسب الطعم.', 'An untested starting point. Adjust to taste.')}</Txt>
    <Action variant="primary" disabled={sharing} title={link ? L('افتحها مرة ثانية في xBloom', 'Open again in xBloom') : L('افتح في xBloom', 'Open in xBloom')} onPress={() => void share()} />
    {sharing ? <ActivityIndicator color={colors.teal} /> : null}
    {link ? <Txt style={styles.muted}>{L('انحفظت الوصفة وفتحنا رابطها. من تطبيق xBloom اضغط حفظ أو تحضير عشان تروح للمكينة.', 'Recipe saved and its link opened. In the xBloom app, save or brew it to send it to your machine.')}</Txt>
      : <Txt style={styles.muted}>{L('نحفظ الوصفة في xBloom ونفتحها لك في تطبيقهم؛ التطبيق هو اللي يرسلها للمكينة. ربط غير رسمي.', 'We save the recipe to xBloom and open it in their app, which sends it to the machine. Unofficial integration.')}</Txt>}
    {shareError ? <Txt accessibilityRole="alert" style={styles.error}>{shareError}</Txt> : null}
    <Action title={action} onPress={onAction} />
  </View>;
}
