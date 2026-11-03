import { useContext, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from './native';
import { Action, Field, Language, Txt, colors, styles, useLabels } from './ui';
import { SelectionMenu } from './SelectionMenu';
import { Disclosure } from './Disclosure';
import { ScanCoffeeButton } from './CoffeeLabelScanner';
import { publicSupabase } from './client';
import { mapRecipe, RECIPE_FIELDS, type CoffeeItem, type RecipeItem, type RecipeRow } from './data';
import { emptyRecipeFilters, recipeCatalogPage, RECIPE_DISCOVERY_FIELDS } from './recipeDiscovery';
import { buildXBloomDraft, compatibleXBloom, type XBloomDraft, type XBloomPreferences } from './xbloomDraft';

export function XBloomPlanner({ openRecipe, coffees = [], onDraft }: {
  openRecipe: (r: RecipeItem) => void; coffees?: CoffeeItem[]; onDraft?: (draft: XBloomDraft) => void;
}) {
  const L = useLabels(); const locale = useContext(Language); const ar = locale === 'ar';
  const [p, setP] = useState<XBloomPreferences>({ model: 'Studio', cup: 'Omni', serving: 'hot', amount: '250', unit: 'water', coffee: '', flavor: '' });
  const [rows, setRows] = useState<RecipeItem[]>([]); const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState<number | null>(null); const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false); const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  function change<K extends keyof XBloomPreferences>(key: K, value: XBloomPreferences[K]) {
    pending.current?.abort(); setBusy(false); setRows([]); setPage(0); setTotal(null); setSearched(false); setError(''); setP(v => ({ ...v, [key]: value }));
  }
  function choose(recipe: RecipeItem) {
    setError('');
    if (!compatibleXBloom(recipe, p)) { setError(L('الوصفة لا تطابق الجهاز أو القمع أو نوع التحضير المحدد.', 'This recipe does not match the selected machine, dripper or serving style.')); return; }
    if (!onDraft) { openRecipe(recipe); return; }
    try { onDraft(buildXBloomDraft(recipe, p, ar)); }
    catch { setError(L('تحتاج وصفة بصبات وجرعة منشورة. اختر حجمًا بين نصف وضعف الأصل، بجرعة 5–30 g وماء 50–500 ml.', 'Published pours and dose are required. Choose half to twice the original size, within 5–30 g coffee and 50–500 ml water.')); }
  }
  async function search(nextPage = 0) {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); if (nextPage === 0) { setRows([]); setSearched(false); setTotal(null); }
    try {
      if (!publicSupabase) throw new Error('CONNECTION');
      const filters = { ...emptyRecipeFilters(), servingStyle: p.serving, flavorFamily: p.flavor as ReturnType<typeof emptyRecipeFilters>['flavorFamily'] };
      const result = await recipeCatalogPage(publicSupabase, { query: p.coffee, method: 'xbloom', deviceModel: p.model, cup: p.cup, filters }, nextPage,
        `${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`, controller.signal, 12);
      if (result.error) throw result.error;
      if (controller.signal.aborted) return;
      const matched = ((result.data ?? []) as unknown as RecipeRow[]).flatMap(row => { const recipe = mapRecipe(row, locale); return recipe && compatibleXBloom(recipe, p) ? [recipe] : []; });
      setRows(previous => nextPage === 0 ? matched : [...new Map([...previous, ...matched].map(r => [r.id, r])).values()]);
      setPage(nextPage); setTotal(result.count);
      setSearched(true);
    } catch { if (!controller.signal.aborted) setError(L('تعذّر البحث. حاول مرة أخرى.', 'Search failed. Try again.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <Disclosure title={onDraft ? L('أنشئ وصفة xBloom لبنّك', 'Create an xBloom recipe for your coffee') : L('اعثر على وصفة xBloom لبنّك', 'Find an xBloom recipe for your coffee')}
    subtitle={L('اسم البن أو صورته، الجهاز، القمع والمذاق', 'Coffee name or photo, machine, dripper and taste')} testID="xbloom-planner">
    <Field label={L('اسم البن أو المحمصة أو نص الكيس', 'Coffee, roaster or bag text')} value={p.coffee} onChangeText={v => change('coffee', v)} maxLength={160} />
    <SelectionMenu label={L('جهاز xBloom', 'xBloom machine')} value={p.model} items={['Studio', 'Original'].map(id => ({ id, name: id }))} onChange={v => change('model', v as XBloomPreferences['model'])} />
    <SelectionMenu label={L('القمع', 'Dripper')} value={p.cup} items={['Omni', 'xPod'].map(id => ({ id, name: id }))} onChange={v => change('cup', v as XBloomPreferences['cup'])} />
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8 }}>
      <Action compact title={L('حار', 'Hot')} selected={p.serving === 'hot'} onPress={() => change('serving', 'hot')} />
      <Action compact title={L('بارد ومثلج', 'Cold & iced')} selected={p.serving === 'cold_or_iced'} onPress={() => change('serving', 'cold_or_iced')} />
    </View>
    <SelectionMenu label={L('المذاق المفضل', 'Preferred taste')} value={p.flavor} items={[
      { id: '', name: L('كل المذاقات', 'All tastes') }, { id: 'fruity', name: L('فاكهي', 'Fruity') },
      { id: 'chocolate', name: L('شوكولاتة', 'Chocolate') }, { id: 'caramel', name: L('كراميل', 'Caramel') },
      { id: 'floral', name: L('زهري', 'Floral') }, { id: 'citrus', name: L('حمضي', 'Citrus') }, { id: 'nutty', name: L('مكسرات', 'Nutty') },
    ]} onChange={v => change('flavor', v)} />
    {onDraft ? <>
      <SelectionMenu label={L('تحديد الكمية حسب', 'Set amount by')} value={p.unit} items={[{ id: 'water', name: L('ماء الاستخلاص (ml)', 'Brew water (ml)') }, { id: 'dose', name: L('جرعة البن (g)', 'Coffee dose (g)') }]} onChange={v => { change('unit', v as XBloomPreferences['unit']); setP(prev => ({ ...prev, amount: v === 'water' ? '250' : '15' })); }} />
      <Field label={p.unit === 'water' ? L('ماء الاستخلاص دون الثلج (ml)', 'Brew water excluding ice (ml)') : L('جرعة البن (g)', 'Coffee dose (g)')} keyboardType="decimal-pad" value={p.amount} onChangeText={v => change('amount', v)} />
      <Txt style={styles.muted}>{L('اختر وصفة أساس؛ نضبط الماء والبن والصبات مع إبقاء الطحنة والحرارة من المصدر. راجع المسودة قبل حفظها.', 'Choose a base recipe. Water, coffee and pours are scaled while source grind and temperatures are retained. Review before saving.')}</Txt>
    </> : null}
    <ScanCoffeeButton method="xbloom" coffees={coffees} openRecipe={choose} model={p.model} serving={p.serving} cup={p.cup} />
    <Action variant="primary" disabled={busy} title={L('ابحث عن وصفات متوافقة', 'Find compatible recipes')} onPress={() => void search()} />
    {busy ? <ActivityIndicator color={colors.teal} /> : null}
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {searched && !rows.length ? <Txt>{L('لا توجد وصفات متاحة لهذا البحث حاليًا. بعض وصفات الناشرين معلّقة مؤقتًا أثناء مراجعة إذن استخدامها.', 'No recipes are currently available for this search. Some publisher recipes are temporarily unavailable while their permissions are reviewed.')}</Txt> : null}
    {total !== null ? <Txt style={styles.muted}>{L('نتائج متوافقة: ', 'Compatible matches: ') + total.toLocaleString('en-US')}</Txt> : null}
    {rows.map(r => <View key={r.id} style={[styles.card, { gap: 8, marginBottom: 0 }]}>
      <Txt heading>{r.title}</Txt><Txt style={styles.muted}>{r.author || ''} · {p.model} · {p.cup}</Txt>
      <Action title={onDraft ? L('استخدم هذه الوصفة كأساس', 'Use as my base recipe') : L('تفاصيل الوصفة', 'Recipe details')} onPress={() => choose(r)} />
    </View>)}
    {total !== null && (page + 1) * 12 < total ? <Action disabled={busy} title={L('عرض وصفات أكثر', 'Show more recipes')} onPress={() => void search(page + 1)} /> : null}
  </Disclosure>;
}
