import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

type Model = XBloomPreferences['model']; type Serving = XBloomPreferences['serving'];
// Eight taste preferences; five also narrow the catalog by flavour family.
const TASTES: [Exclude<XBloomTaste, ''>, string, string, string][] = [
  ['fruity', 'فاكهي', 'Fruity', 'fruity'], ['balanced', 'متوازن', 'Balanced', ''], ['sweet', 'حلو', 'Sweet', 'caramel'], ['chocolate', 'شوكولاتي', 'Chocolatey', 'chocolate'],
  ['floral', 'زهري', 'Floral', 'floral'], ['bright', 'منعش', 'Refreshing', 'citrus'], ['full', 'ثقيل', 'Heavy', ''], ['light', 'خفيف', 'Light', ''],
];
// Tasting notes that published xBloom recipes carry often enough to build on.
const NOTES: [string, string][] = [
  ['strawberry', 'فراولة'], ['raspberry', 'توت أحمر'], ['blueberry', 'توت أزرق'], ['cherry', 'كرز'], ['peach', 'خوخ'], ['apricot', 'مشمش'], ['mango', 'مانجو'],
  ['pineapple', 'أناناس'], ['coconut', 'جوز الهند'], ['lychee', 'ليتشي'], ['guava', 'جوافة'], ['passionfruit', 'باشن فروت'], ['orange', 'برتقال'], ['lemon', 'ليمون'],
  ['jasmine', 'ياسمين'], ['lavender', 'لافندر'], ['hibiscus', 'كركديه'], ['black tea', 'شاي أسود'], ['honey', 'عسل'], ['caramel', 'كراميل'], ['brown sugar', 'سكر بني'],
  ['vanilla', 'فانيلا'], ['dark chocolate', 'شوكولاتة داكنة'], ['milk chocolate', 'شوكولاتة بالحليب'], ['nutty', 'مكسرات'],
];
// Brew-water amounts that published recipes use and that stay inside each machine's dose window.
const WATER_ML: Record<Model, Record<Serving, number[]>> = {
  Studio: { hot: [135, 150, 180, 200, 240, 300], cold_or_iced: [135, 150, 180, 200] },
  Original: { hot: [240, 270, 300, 350], cold_or_iced: [150, 180, 200, 240] },
};
const defaultWater = (serving: Serving) => serving === 'hot' ? 240 : 150;
// Origins with enough published xBloom recipes to narrow a general recipe.
const ORIGINS: [string, string][] = [['Ethiopia', 'إثيوبيا'], ['Colombia', 'كولومبيا'], ['Kenya', 'كينيا'], ['Panama', 'بنما'], ['Costa Rica', 'كوستاريكا'],
  ['Brazil', 'البرازيل'], ['Guatemala', 'غواتيمالا'], ['Honduras', 'هندوراس'], ['Ecuador', 'الإكوادور'], ['Peru', 'بيرو'], ['Indonesia', 'إندونيسيا']];
const MIN_NARROW_POOL = 3;
type Basis = { origin: string; note: string };

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  const ar = useContext(Language) === 'ar';
  return <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 10, backgroundColor: colors.paper }}>
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ color: '#FFF', fontSize: 14, lineHeight: 20, fontWeight: '700' }}>{String(step)}</Txt>
      </View>
      <Txt heading style={{ fontSize: 17, flex: 1 }}>{title}</Txt>
    </View>
    {hint ? <Txt style={[styles.muted, { fontSize: 13, lineHeight: 20 }]}>{hint}</Txt> : null}
    {children}
  </View>;
}

export type XBloomSeed = { coffee: string; serving: Serving; nonce: number };
export function XBloomPlanner({ openRecipe, coffees = [], onDraft, initialOpen = false, seed }: {
  openRecipe: (r: RecipeItem) => void; coffees?: CoffeeItem[]; onDraft?: (draft: XBloomDraft) => void;
  initialOpen?: boolean;
  /** A coffee handed over from a search that found nothing: open, fill it in and generate. */
  seed?: XBloomSeed;
}) {
  const L = useLabels(); const locale = useContext(Language); const ar = locale === 'ar';
  const [p, setP] = useState<XBloomPreferences>({ model: 'Studio', cup: 'Omni', serving: 'hot', amount: '240', unit: 'water', coffee: '', flavor: '' });
  const [taste, setTaste] = useState<XBloomTaste>(''); const [note, setNote] = useState(''); const [otherNote, setOtherNote] = useState('');
  const [custom, setCustom] = useState(false); const [ice, setIce] = useState<IceLevel>('regular');
  const [origin, setOrigin] = useState(''); const [used, setUsed] = useState<Basis>({ origin: '', note: '' });
  const [rows, setRows] = useState<RecipeItem[]>([]); const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState<number | null>(null); const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false); const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const [generated, setGenerated] = useState<{ recipe: GeneratedXBloom; template: RecipeItem; sources: RecipeItem[] } | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const reset = () => { pending.current?.abort(); setBusy(false); setRows([]); setPage(0); setTotal(null); setSearched(false); setError(''); setGenerated(null); };
  function change<K extends keyof XBloomPreferences>(key: K, value: XBloomPreferences[K]) {
    reset();
    setP(v => {
      const next = { ...v, [key]: value };
      // Hot and iced start from the amount most published recipes use; a machine
      // change only resets an amount that machine cannot brew.
      if (!custom && (key === 'serving' ? next.serving !== v.serving : key === 'model' && !WATER_ML[next.model][next.serving].includes(Number(next.amount)))) {
        return { ...next, unit: 'water', amount: String(defaultWater(next.serving)) };
      }
      return next;
    });
  }
  function pickWater(ml: number) { setCustom(false); reset(); setP(v => ({ ...v, unit: 'water', amount: String(ml) })); }
  function pickTaste(next: Exclude<XBloomTaste, ''>) {
    const chosen = taste === next ? '' : next;
    setTaste(chosen); change('flavor', chosen ? TASTES.find(t => t[0] === chosen)![3] : '');
  }
  const wantedNote = (otherNote.trim() || note).slice(0, 60);
  function choose(recipe: RecipeItem) {
    setError('');
    if (!compatibleXBloom(recipe, p)) { setError(L('الوصفة لا تطابق الجهاز أو القمع أو نوع التحضير المحدد.', 'This recipe does not match the selected machine, dripper or serving style.')); return; }
    if (!onDraft) { openRecipe(recipe); return; }
    try { onDraft(buildXBloomDraft(recipe, p, ar)); }
    catch { setError(L('تحتاج وصفة بصبات وجرعة منشورة. اختر حجمًا بين نصف وضعف الأصل، بجرعة 5–30 g وماء 50–500 ml.', 'Published pours and dose are required. Choose half to twice the original size, within 5–30 g coffee and 50–500 ml water.')); }
  }
  function generate(candidates: RecipeItem[], coffee = p.coffee, general = false, prefs = p) {
    setError(''); setGenerated(null);
    try {
      const recipe = generateXBloom(candidates, prefs, taste, { general, ice });
      const template = candidates.find(r => r.id === recipe.templateId);
      if (!template) throw new XBloomGeneratorError('NO_BASIS');
      if (coffee !== p.coffee) setP(v => ({ ...v, coffee }));
      setGenerated({ recipe, template, sources: [template, ...candidates.filter(r => r.id !== template.id && recipe.sourceIds.includes(r.id))].slice(0, 3) });
    } catch (failure) {
      const reason = failure instanceof XBloomGeneratorError ? failure.reason : 'INVALID';
      setError(reason === 'NO_BASIS' ? L('ما في وصفات منشورة لهالجهاز مع هالقمع ونوع التحضير. جرّب قمع ثاني أو غيّر بين حار وبارد.', 'No published recipes for this machine with this dripper and serving. Try the other dripper or switch hot/iced.')
        : reason === 'AMOUNT' ? L('اكتب كمية صحيحة.', 'Enter a valid amount.')
        : reason === 'DOSE_RANGE' ? (prefs.model === 'Studio' ? L('هالكمية تطلع جرعة بن خارج حدود Studio (5 إلى 25 g). كبّر أو صغّر الماي.', 'This amount needs a coffee dose outside Studio limits (5–25 g). Use more or less water.') : L('هالكمية تطلع جرعة بن خارج حدود Original (15 إلى 25 g). على Original أقل ماي تقريبًا 240 ml للحار و150 ml للبارد.', 'This amount needs a coffee dose outside Original limits (15–25 g). On Original the least water is about 240 ml hot and 150 ml iced.'))
        : reason === 'WATER_RANGE' ? L('ماء الاستخلاص لازم يكون بين 50 و500 ml.', 'Brew water must be 50–500 ml.')
        : L('تعذّر تجهيز وصفة صحيحة من هذه النتائج. جرّب إعدادات ثانية.', 'Could not build a valid recipe from these results. Try other settings.'));
    }
  }
  async function load(query: string, flavor: string, nextPage: number, pageSize: number, signal: AbortSignal, narrow: Basis = { origin: '', note: '' }, prefs = p) {
    if (!publicSupabase) throw new Error('CONNECTION');
    const filters = { ...emptyRecipeFilters(), servingStyle: prefs.serving, coffeeOrigin: narrow.origin, flavorNote: narrow.note, flavorFamily: flavor as ReturnType<typeof emptyRecipeFilters>['flavorFamily'] };
    const result = await recipeCatalogPage(publicSupabase, { query, method: 'xbloom', deviceModel: prefs.model, cup: prefs.cup, filters }, nextPage,
      `${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`, signal, pageSize);
    if (result.error) throw result.error;
    const matched = ((result.data ?? []) as unknown as RecipeRow[]).flatMap(row => { const recipe = mapRecipe(row, locale); return recipe && compatibleXBloom(recipe, prefs) ? [recipe] : []; });
    return { matched, count: result.count };
  }
  async function search(nextPage = 0) {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); if (nextPage === 0) { setRows([]); setSearched(false); setTotal(null); }
    try {
      const { matched, count } = await load(p.coffee, p.flavor, nextPage, 12, controller.signal, { origin: '', note: wantedNote });
      if (controller.signal.aborted) return;
      setRows(previous => nextPage === 0 ? matched : [...new Map([...previous, ...matched].map(r => [r.id, r])).values()]);
      setPage(nextPage); setTotal(count); setSearched(true);
    } catch { if (!controller.signal.aborted) setError(L('تعذّر البحث. حاول مرة أخرى.', 'Search failed. Try again.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  // Always end with a recipe: the coffee's own matches first, then the general
  // pool for the same machine, dripper and serving. The tasting note, origin and
  // taste narrow that pool only while a few published recipes remain.
  async function make(prefs = p) {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setGenerated(null); setRows([]); setSearched(false); setTotal(null); setUsed({ origin: '', note: '' });
    const usable = (items: RecipeItem[]) => items.filter(r => !!r.sourceBrew.pours?.length).length;
    try {
      const named = prefs.coffee.trim() ? (await load(prefs.coffee, prefs.flavor, 0, 12, controller.signal, undefined, prefs)).matched : [];
      if (controller.signal.aborted) return;
      if (usable(named)) { generate(named, prefs.coffee, false, prefs); return; }
      const attempts: [string, string, string][] = [];
      for (const n of wantedNote ? [wantedNote, ''] : ['']) for (const o of origin ? [origin, ''] : ['']) for (const f of prefs.flavor ? [prefs.flavor, ''] : ['']) attempts.push([n, o, f]);
      let pool: RecipeItem[] = []; let from: Basis = { origin: '', note: '' };
      for (const [n, o, f] of attempts) {
        pool = (await load('', f, 0, 30, controller.signal, { origin: o, note: n }, prefs)).matched; from = { origin: o, note: n };
        if (controller.signal.aborted) return;
        // A narrowed pool must still hold a few recipes, or one odd recipe decides everything.
        if (usable(pool) >= (n || o || f ? MIN_NARROW_POOL : 1)) break;
      }
      setUsed(from);
      generate(pool, prefs.coffee, true, prefs);
    } catch { if (!controller.signal.aborted) setError(L('تعذّر تحضير الوصفة. تأكد من النت وحاول.', 'Could not prepare the recipe. Check your connection and retry.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const seeded = useRef(0);
  useEffect(() => {
    if (!seed || seed.nonce === seeded.current) return;
    seeded.current = seed.nonce;
    const next: XBloomPreferences = { ...p, coffee: seed.coffee, serving: seed.serving,
      ...(custom || WATER_ML[p.model][seed.serving].includes(Number(p.amount)) ? {} : { unit: 'water' as const, amount: String(defaultWater(seed.serving)) }) };
    setP(next); void make(next);
    // Only a new hand-over should trigger this, not every preference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const chips = { flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 } as const;
  const question = { fontSize: 14, lineHeight: 22, fontWeight: '700' } as const;
  const info = [styles.muted, { fontSize: 13, lineHeight: 20 }];
  const originName = (id: string) => { const found = ORIGINS.find(o => o[0] === id); return found ? L(found[1], found[0]) : ''; };
  const noteName = (id: string) => { const found = NOTES.find(n => n[0] === id); return found ? L(found[1], found[0]) : id; };
  const iced = p.serving !== 'hot';
  return <Disclosure title={onDraft ? L('أنشئ وصفة xBloom لبنّك', 'Create an xBloom recipe for your coffee') : L('اصنع وصفة xBloom لبنّك', 'Make an xBloom recipe for your coffee')}
    subtitle={L('أربع خطوات ونجهز لك وصفة كاملة تفتحها في xBloom', 'Four steps to a full recipe you can open in xBloom')} testID="xbloom-planner" initial={initialOpen} openSignal={seed?.nonce}>
    <Section step={1} title={L('البن', 'Coffee')} hint={L('كل شي هني اختياري. كل ما عطيتنا أكثر، طلعت الوصفة أقرب لبنّك.', 'All optional. The more you give, the closer the recipe is to your coffee.')}>
      <Field label={L('اسم البن أو المحمصة (اختياري)', 'Coffee or roaster (optional)')} value={p.coffee} onChangeText={v => change('coffee', v)} maxLength={160} />
      <ScanCoffeeButton method="xbloom" coffees={coffees} openRecipe={choose} model={p.model} serving={p.serving} cup={p.cup} onMatches={(recipes, name) => generate(recipes, name || p.coffee)} />
      <SelectionMenu label={L('منشأ البن (اختياري)', 'Coffee origin (optional)')} value={origin}
        items={[{ id: '', name: L('ما أدري / غير', 'Not sure / other') }, ...ORIGINS.map(([id, arabic]) => ({ id, name: L(arabic, id) }))]} onChange={v => { setOrigin(v); setGenerated(null); }} />
    </Section>
    <Section step={2} title={L('جهازك', 'Your machine')}>
      <Txt style={question}>{L('الجهاز', 'Machine')}</Txt>
      <View style={chips}>{(['Studio', 'Original'] as const).map(id => <Action key={id} compact title={id} selected={p.model === id} onPress={() => change('model', id)} />)}</View>
      <Txt style={info}>{L('أرقام الطحنة تختلف بين Studio و Original، فكل وصفة تنبني من وصفات نفس جهازك بس.', 'Grind numbers differ between Studio and Original, so a recipe is built only from recipes for your machine.')}</Txt>
      <Txt style={question}>{L('القمع', 'Dripper')}</Txt>
      <View style={chips}>{(['Omni', 'xPod'] as const).map(id => <Action key={id} compact title={id} selected={p.cup === id} onPress={() => change('cup', id)} />)}</View>
      <Txt style={info}>{p.cup === 'Omni' ? L('Omni: القمع اللي تحط فيه بنّك الخاص.', 'Omni: the dripper you fill with your own coffee.') : L('xPod: كبسولات xBloom الجاهزة.', 'xPod: xBloom’s ready-made pods.')}</Txt>
    </Section>
    <Section step={3} title={L('المشروب', 'The drink')}>
      <Txt style={question}>{L('تبيها حارة أو باردة؟', 'Hot or iced?')}</Txt>
      <View style={chips}>
        <Action compact title={L('حار', 'Hot')} selected={!iced} onPress={() => change('serving', 'hot')} />
        <Action compact title={L('بارد ومثلج', 'Cold & iced')} selected={iced} onPress={() => change('serving', 'cold_or_iced')} />
      </View>
      <Txt style={question}>{L('كمية الماي (ماء الاستخلاص)', 'Water (brew water)')}</Txt>
      <View style={chips}>
        {WATER_ML[p.model][p.serving].map(ml => <Action key={ml} compact selected={!custom && p.unit === 'water' && Number(p.amount) === ml} title={`${ml} ml`} onPress={() => pickWater(ml)} />)}
        <Action compact selected={custom} title={L('أحدد بنفسي', 'Custom')} onPress={() => { setCustom(true); reset(); }} />
      </View>
      <Txt style={info}>{iced ? L('أغلب الوصفات الباردة المنشورة 150 ml ماي، والثلج ينحسب فوقها.', 'Most published iced recipes use 150 ml of water; ice is added on top.') : L('أغلب الوصفات الحارة المنشورة 240 ml ماي على 15 g بن.', 'Most published hot recipes use 240 ml of water for 15 g of coffee.')}</Txt>
      {custom ? <>
        <SelectionMenu label={L('تحديد الكمية حسب', 'Set amount by')} value={p.unit} items={[{ id: 'water', name: L('ماء الاستخلاص (ml)', 'Brew water (ml)') }, { id: 'dose', name: L('جرعة البن (g)', 'Coffee dose (g)') }]} onChange={v => { change('unit', v as XBloomPreferences['unit']); setP(prev => ({ ...prev, amount: v === 'water' ? String(defaultWater(prev.serving)) : '15' })); }} />
        <Field label={p.unit === 'water' ? L('ماء الاستخلاص دون الثلج (ml)', 'Brew water excluding ice (ml)') : L('جرعة البن (g)', 'Coffee dose (g)')} keyboardType="decimal-pad" value={p.amount} onChangeText={v => change('amount', v)} />
      </> : null}
      {iced ? <>
        <Txt style={question}>{L('كمية الثلج', 'Ice')}</Txt>
        <View style={chips}>
          {(['light', 'regular', 'extra'] as const).map(id => <Action key={id} compact selected={ice === id} onPress={() => { setIce(id); setGenerated(null); }}
            title={id === 'light' ? L('ثلج قليل', 'Light ice') : id === 'regular' ? L('عادي', 'Regular') : L('ثلج وايد', 'Extra ice')} />)}
        </View>
      </> : null}
    </Section>
    <Section step={4} title={L('المذاق والإيحاءات', 'Taste and notes')} hint={L('اختياري. المذاق يحرك الطحنة والحرارة درجة بسيطة، والإيحاء يختار الوصفات المنشورة اللي فيها نفس النكهة.', 'Optional. Taste nudges grind and temperature slightly; a note picks published recipes that carry that flavour.')}>
      <Txt style={question}>{L('المذاق العام', 'Overall taste')}</Txt>
      <View style={chips}>
        {TASTES.map(([id, arabic, english]) => <Action key={id} compact title={L(arabic, english)} selected={taste === id} onPress={() => pickTaste(id)} />)}
      </View>
      <Txt style={question}>{L('إيحاء محدد', 'A specific note')}</Txt>
      <View style={chips}>
        {NOTES.map(([id, arabic]) => <Action key={id} compact title={L(arabic, id)} selected={!otherNote.trim() && note === id} onPress={() => { setNote(note === id ? '' : id); setOtherNote(''); setGenerated(null); }} />)}
      </View>
      <Field label={L('إيحاء ثاني مو موجود فوق (اختياري)', 'Another note not listed (optional)')} value={otherNote} onChangeText={v => { setOtherNote(v); setGenerated(null); }} maxLength={60} />
    </Section>
    <Action variant="primary" disabled={busy} title={L('حضّر الوصفة', 'Generate my recipe')} onPress={() => void make()} />
    <Action disabled={busy} title={onDraft ? L('أو اختر وصفة منشورة كأساس', 'Or pick a published recipe as the base') : L('عرض الوصفات المنشورة لهالإعدادات', 'Show published recipes for these settings')} onPress={() => void search()} />
    {busy ? <ActivityIndicator color={colors.teal} /> : null}
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {generated ? <GeneratedCard generated={generated.recipe} ar={ar} coffee={p.coffee} rpm={generated.template.sourceBrew.rpm}
      origin={originName(used.origin)} note={used.note ? noteName(used.note) : ''} askedNote={wantedNote ? noteName(wantedNote) : ''} askedOrigin={originName(origin)}
      sources={generated.sources} openSource={openRecipe}
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

function GeneratedCard({ generated: g, ar, action, onAction, coffee, rpm, origin, askedOrigin, note, askedNote, sources, openSource }: { generated: GeneratedXBloom; ar: boolean; action: string; onAction: () => void; coffee: string; rpm?: number | null;
  origin: string; askedOrigin: string; note: string; askedNote: string; sources: RecipeItem[]; openSource: (recipe: RecipeItem) => void }) {
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
  const row = { flexDirection: ar ? 'row-reverse' : 'row' } as const;
  const small = { fontSize: 13, lineHeight: 21 } as const;
  const basis = [note, origin].filter(Boolean).join(L(' · ', ' · '));
  const missed = [askedNote && !note ? askedNote : '', askedOrigin && !origin ? askedOrigin : ''].filter(Boolean).join(L(' و', ' and '));
  return <View testID="xbloom-generated" style={[styles.card, { gap: 12, marginBottom: 0, borderColor: colors.teal, borderWidth: 1.5 }]}>
    <View style={{ gap: 2 }}>
      <Txt heading style={{ fontSize: 19 }}>{coffee.trim() ? L(`وصفة ${coffee.trim().slice(0, 40)}`, `Recipe for ${coffee.trim().slice(0, 40)}`) : L('وصفتك المقترحة', 'Your suggested recipe')}</Txt>
      <Txt style={styles.muted}>{`xBloom ${g.model} · ${g.cup} · ${g.serving === 'hot' ? L('حار', 'Hot') : L('بارد ومثلج', 'Cold & iced')}`}</Txt>
    </View>
    <View style={[row, { flexWrap: 'wrap', gap: 6 }]}>
      {facts.map(([label, value]) => <View key={label} style={{ flexBasis: '30%', flexGrow: 1, borderRadius: 12, padding: 10, backgroundColor: colors.cream }}>
        <Txt style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}>{label}</Txt>
        <Txt style={{ fontSize: 17, lineHeight: 24, fontWeight: '700' }}>{value}</Txt>
      </View>)}
    </View>
    <Txt heading style={{ fontSize: 15 }}>{L('الصبات', 'Pours')}</Txt>
    <View style={{ gap: 8 }}>
      {g.pours.map((pour, i) => <View key={i} style={{ gap: 4 }}>
        <View style={[row, { justifyContent: 'space-between', gap: 8 }]}>
          <Txt style={{ fontSize: 14, lineHeight: 22, fontWeight: '700' }}>{`${i + 1}. ${i === 0 ? L('التزهير', 'Bloom') : L('صبة', 'Pour')} · ${pour.volume} ml`}</Txt>
          <Txt style={[small, { color: colors.muted }]}>{[pour.temperature !== null ? `${pour.temperature}°C` : '', pour.pause_seconds !== null ? `${L('توقف', 'Pause')} ${pour.pause_seconds}s` : ''].filter(Boolean).join(' · ')}</Txt>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.chip, overflow: 'hidden', flexDirection: ar ? 'row-reverse' : 'row' }}>
          <View style={{ width: `${Math.round(pour.volume / g.water * 100)}%`, backgroundColor: colors.teal }} />
        </View>
      </View>)}
    </View>
    {g.ice ? <View style={{ borderRadius: 12, padding: 10, backgroundColor: colors.cream, gap: 2 }}>
      <Txt style={{ fontSize: 14, lineHeight: 22, fontWeight: '700' }}>{L(`الثلج: حوالي ${g.ice} g في الكوب قبل التحضير`, `Ice: about ${g.ice} g in the cup before brewing`)}</Txt>
      <Txt style={[small, { color: colors.muted }]}>{L(`${tag('estimate')}. المجموع في الكوب تقريبًا ${g.water + g.ice} ml بعد ما يذوب الثلج.`, `${tag('estimate')}. About ${g.water + g.ice} ml in the cup once the ice melts.`)}</Txt>
    </View> : g.serving === 'iced' ? <Txt style={styles.muted}>{L('الماء هنا ماء الاستخلاص فقط. أضف الثلج في الكوب.', 'This is brew water only. Add ice to the cup.')}</Txt> : null}
    <Txt heading style={{ fontSize: 15 }}>{L('من وين جت هالأرقام؟', 'Where these numbers come from')}</Txt>
    <View style={{ gap: 4 }}>
      {g.basis === 'general' ? <Txt style={small}>{
        basis ? L(`ما لقينا وصفات لهالبن بالاسم، فبنيناها من وصفات منشورة فيها: ${basis}.`, `No recipes matched this coffee by name, so it is built from published recipes with: ${basis}.`)
        : L('وصفة عامة لنفس الجهاز والقمع ونوع التحضير. اختر إيحاء أو منشأ أو صوّر الكيس لوصفة أقرب.', 'A general recipe for this machine, dripper and serving. Pick a note or origin, or scan the bag, for a closer one.')}</Txt> : null}
      {g.basis === 'general' && missed ? <Txt style={[small, { color: colors.muted }]}>{L(`وصفات «${missed}» المنشورة لهالإعدادات أقل من ثلاث، فما اعتمدنا عليها بروحها.`, `Fewer than three published recipes for “${missed}” with these settings, so they were not used alone.`)}</Txt> : null}
      <Txt style={small}>{`${tag('published')}: `}{g.basis === 'general' ? L(`النسبة والطحنة والحرارة هي الوسيط في ${g.sourceIds.length} وصفة منشورة لنفس الجهاز والقمع.`, `Ratio, grind and temperature are the median of ${g.sourceIds.length} published recipes for the same machine and dripper.`) : L(`النسبة والطحنة والحرارة من أقرب ${g.sourceIds.length} وصفات لنفس الجهاز والقمع.`, `Ratio, grind and temperature come from the ${g.sourceIds.length} closest recipes for the same machine and dripper.`)}</Txt>
      {g.tasteShift.grind || g.tasteShift.temperature ? <Txt style={small}>{`${tag('preference')}: `}{L('عدّلنا الطحنة أو الحرارة درجة بسيطة حسب المذاق اللي اخترته.', 'Grind or temperature moved one small step for the taste you chose.')}</Txt> : null}
      {g.provenance.pours === 'estimate' ? <Txt style={small}>{`${tag('estimate')}: `}{L('كميات الصبات محسوبة بتكبير أو تصغير أقرب وصفة لتطابق الكمية اللي طلبتها.', 'Pour volumes are scaled from the closest recipe to match the amount you asked for.')}</Txt> : null}
    </View>
    {sources.length ? <>
      <Txt heading style={{ fontSize: 15 }}>{L('وصفات منشورة اعتمدنا عليها', 'Published recipes it builds on')}</Txt>
      <View style={{ gap: 6 }}>
        {sources.map(source => <Action key={source.id} compact title={source.title.slice(0, 60)} onPress={() => openSource(source)} />)}
      </View>
    </> : null}
    <Txt heading style={{ fontSize: 15 }}>{L('لو الطعم مو مضبوط', 'If the cup is off')}</Txt>
    <View style={{ gap: 4 }}>
      <Txt style={small}>{L('حامض أو خفيف: صغّر رقم الطحنة درجتين (أنعم) أو ارفع الحرارة درجة.', 'Sour or thin: lower the grind number by two (finer) or raise the temperature a degree.')}</Txt>
      <Txt style={small}>{L('مر أو ثقيل: كبّر رقم الطحنة درجتين (أخشن) أو نزّل الحرارة درجة.', 'Bitter or heavy: raise the grind number by two (coarser) or lower the temperature a degree.')}</Txt>
      <Txt style={[small, { color: colors.muted }]}>{L('قاعدة عامة في الاستخلاص، وغيّر شي واحد في كل مرة.', 'A general extraction rule of thumb; change one thing at a time.')}</Txt>
    </View>
    <Txt style={styles.muted}>{L('نقطة بداية غير مجرّبة على جهازك. عدّلها حسب الطعم.', 'An untested starting point. Adjust to taste.')}</Txt>
    <Action variant="primary" disabled={sharing} title={link ? L('افتحها مرة ثانية في xBloom', 'Open again in xBloom') : L('افتح في xBloom', 'Open in xBloom')} onPress={() => void share()} />
    {sharing ? <ActivityIndicator color={colors.teal} /> : null}
    {link ? <Txt style={styles.muted}>{L('انحفظت الوصفة وفتحنا رابطها. من تطبيق xBloom اضغط حفظ أو تحضير عشان تروح للمكينة.', 'Recipe saved and its link opened. In the xBloom app, save or brew it to send it to your machine.')}</Txt>
      : <Txt style={styles.muted}>{L('نحفظ الوصفة في xBloom ونفتحها لك في تطبيقهم؛ التطبيق هو اللي يرسلها للمكينة. ربط غير رسمي.', 'We save the recipe to xBloom and open it in their app, which sends it to the machine. Unofficial integration.')}</Txt>}
    {shareError ? <Txt accessibilityRole="alert" style={styles.error}>{shareError}</Txt> : null}
    <Action title={action} onPress={onAction} />
  </View>;
}
