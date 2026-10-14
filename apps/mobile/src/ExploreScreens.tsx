import { useLabels } from './ui';
import { DetailColumns, detailStyles } from './DetailLayout';
import { EquipmentGallery } from './EquipmentGallery';
import { matchesDeepSearch } from './core/deepSearch';
import { coffeeSearchDocument } from './searchIndex';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from './native';
import { supabase, publicSupabase } from './client';
import {
  countryLabel,
  categoryLabel,
  equipmentKind,
  loadEquipment,
  loadRoasters,
  validateReview,
  reviewedFacts,
  reviewedSupportingSources,
  XBLOOM_RESOURCES,
  type EquipmentItem,
  type EquipmentReview,
  type RoasterItem,
} from './catalog';
import { searchText } from './guards';
import {
  mapRecipe,
  RECIPE_FIELDS,
  type CoffeeItem,
  type RecipeItem,
  type RecipeRow,
} from './data';
import {
  CoffeeCard,
  CoffeePhoto,
  SectionTitle,
  coffeeStyles,
} from './CoffeeScreens';
import { methods } from './copy';
import { RecipeCatalog } from './RecipeCatalog';
import { CatalogPhoto } from './CatalogPhoto';
import { MethodGuide } from './MethodGuide';
import { ConfirmDialog } from './ConfirmDialog';
import { SourceLink } from './SourceLink';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from './native';
import { SelectionMenu } from './SelectionMenu';
import { EquipmentCompare } from './EquipmentCompare';
import { Disclosure } from './Disclosure';
import { categoryGuide } from './equipmentGuides';
import { EquipmentUsage } from './EquipmentUsage';
import { isMethod } from './core/engine';
import {
  Action,
  Field,
  Icon,
  Language,
  Txt,
  colors,
  styles,
  type IconName,
} from './ui';

export { SourceLink };
function Chips({
  items,
  value,
  set,
}: {
  items: { id: string; name: string }[];
  value: string;
  set: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 2 }}>
      {items.map((item) => (
        <Action
          compact
          key={item.id}
          title={item.name}
          onPress={() => set(item.id)}
          selected={value === item.id}
        />
      ))}
    </View>
  );
}
function Empty({
  error,
  busy,
  retry,
}: {
  error: boolean;
  busy: boolean;
  retry: () => void;
}) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  return (
    <View style={styles.card}>
      {busy ? <ActivityIndicator color={colors.brown} /> : null}
      <Txt style={error ? styles.error : styles.muted}>
        {busy
          ? ar
            ? 'جارٍ التحميل…'
            : i18nUi('جارٍ التحميل…', 'Loading…')
          : error
            ? ar
              ? 'تعذّر تحميل البيانات.'
              : i18nUi('تعذّر تحميل البيانات.', 'Could not load data.')
            : ar
              ? 'لا توجد نتائج مطابقة حالياً.'
              : i18nUi('لا توجد نتائج مطابقة حالياً.', 'No matching results yet.')}
      </Txt>
      {error ? (
        <Action title={ar ? 'حاول مرة ثانية' : i18nUi('حاول مرة ثانية', 'Try again')} onPress={retry} />
      ) : null}
    </View>
  );
}
function ToolSymbol({
  item,
  size = 36,
}: {
  item: EquipmentItem;
  size?: number;
}) {
  const kind = equipmentKind(item);
  const icon: IconName =
    kind === 'moka_pot'
      ? 'moka_pot'
      : kind === 'xbloom'
        ? 'xbloom'
        : kind === 'aeropress'
          ? 'aeropress'
          : kind === 'chemex'
            ? 'chemex'
            : kind === 'v60_dripper'
              ? 'v60'
              : kind === 'espresso_machine'
                ? 'espresso'
                : 'gear';
  return (
    <View style={[s.symbol, { width: size + 40, height: size + 40 }]}>
      <Icon name={icon} size={size} />
    </View>
  );
}
export function EquipmentDirectory({
  category,
  open,
  add,
}: {
  category: string;
  open: (item: EquipmentItem) => void;
  add: (item: EquipmentItem) => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<EquipmentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState(category);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [pulling, setPulling] = useState(false);
  const list = useRef<FlatList<EquipmentItem>>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [comparison, setComparison] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const selected = rows.filter((row) => selection.includes(row.id));
  function toggle(id: string) {
    setSelection((values) =>
      values.includes(id)
        ? values.filter((value) => value !== id)
        : values.length < 3
          ? [...values, id]
          : values,
    );
  }
  useEffect(() => {
    if (!comparison) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setComparison(false);
      return true;
    });
    return () => sub.remove();
  }, [comparison]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (!publicSupabase) {
      setBusy(false);
      setError(true);
    } else
      void loadEquipment(publicSupabase, locale, revision > 0)
        .then((v) => {
          if (active) setRows(v);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) {
            setBusy(false);
            setPulling(false);
          }
        });
    return () => {
      active = false;
    };
  }, [revision, locale]);
  const kinds = ['all', ...new Set(rows.map(equipmentKind))];
  const brands = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) => row.brand)
            .filter((value): value is string => !!value),
        ),
      ].sort(),
    [rows],
  );
  const visible = rows.filter(
    (row) =>
      (filter === 'all' || equipmentKind(row) === filter) &&
      (brand === 'all' || row.brand === brand) &&
      searchText(
        [
          row.name,
          row.originalName ?? '',
          row.brand ?? '',
          categoryLabel(equipmentKind(row), locale),
        ].join(' '),
      ).includes(searchText(search)),
  );
  const cols = width >= 1000 ? 3 : width >= 700 ? 2 : 1;
  const cardWidth = (Math.min(width, 1120) - 36 - (cols - 1) * 12) / cols;
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={list}
        key={cols}
        testID="equipment-scroll"
        data={visible}
        keyExtractor={(item) => item.id}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={[coffeeStyles.page, { gap: 12 }]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={false}
        refreshing={busy && pulling}
        onRefresh={() => {
          setPulling(true);
          setRevision((r) => r + 1);
        }}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 4 }}>
            <Txt style={s.eyebrow}>
              {ar ? 'بين مورا · الأجهزة والأدوات' : i18nUi('بين مورا · الأجهزة والأدوات', 'BEANMORA · GEAR')}
            </Txt>
            <Txt heading style={styles.title}>
              {ar ? 'المكاين والأدوات' : i18nUi('المكاين والأدوات', 'Machines & tools')}
            </Txt>
            <Txt style={styles.muted}>
              {ar
                ? 'اختر جهازين أو ثلاثة للمقارنة، وتعرّف على المواصفات وتجارب الأعضاء.'
                : i18nUi('اختر جهازين أو ثلاثة للمقارنة، وتعرّف على المواصفات وتجارب الأعضاء.', 'Compare two or three tools, explore specifications and read member experiences.')}
            </Txt>
            <Field
              label={ar ? 'ابحث عن أداة' : i18nUi('ابحث عن أداة', 'Find equipment')}
              value={search}
              onChangeText={setSearch}
              placeholder={
                ar ? 'موكا بوت، ميزان، طاحونة…' : i18nUi('موكا بوت، ميزان، طاحونة…', 'Moka, scale, grinder…')
              }
            />
            <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
              <SelectionMenu style={{ flexGrow: 1, flexBasis: 180 }} label={ar ? 'نوع الأداة' : i18nUi('نوع الأداة', 'Equipment type')} items={kinds.map(id => ({ id, name: categoryLabel(id, locale) }))} value={filter} onChange={value => { setFilter(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} />
              {brands.length > 1 ? <SelectionMenu style={{ flexGrow: 1, flexBasis: 180 }} label={ar ? 'الشركة' : i18nUi('الشركة', 'Brand')} items={[{ id: 'all', name: ar ? 'كل الشركات' : i18nUi('كل الشركات', 'All brands') }, ...brands.map(id => ({ id, name: id }))]} value={brand} onChange={value => { setBrand(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} /> : null}
            </View>
            <View
              style={{
                flexDirection: ar ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Txt style={{ fontSize: 12, color: colors.muted }}>
                {ar
                  ? `${visible.length} من ${rows.length} موديلًا`
                  : i18nUi(`${visible.length} من ${rows.length} موديلًا`, `${visible.length} of ${rows.length} models`)}
              </Txt>
              {busy ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : null}
              {search || filter !== 'all' || brand !== 'all' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    ar ? 'مسح فلاتر الأدوات' : i18nUi('مسح فلاتر الأدوات', 'Clear equipment filters')
                  }
                  onPress={() => {
                    setSearch('');
                    setFilter('all');
                    setBrand('all');
                  }}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Txt
                    style={{
                      color: colors.teal,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {ar ? 'مسح الفلاتر' : i18nUi('مسح الفلاتر', 'Clear filters')}
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            testID={'equipment-card-' + item.id}
            style={[
              styles.card,
              { width: cardWidth, padding: 12, marginBottom: 0, gap: 8 },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => open(item)}
              style={{ gap: 8 }}
            >
              <View
                style={[
                  s.cardTop,
                  { flexDirection: ar ? 'row-reverse' : 'row', gap: 10 },
                ]}
              >
                <View style={{ width: 82 }}>
                  <CatalogPhoto
                    uri={item.imageUrl}
                    height={82}
                    icon={
                      equipmentKind(item) === 'moka_pot'
                        ? 'moka_pot'
                        : equipmentKind(item) === 'xbloom'
                          ? 'xbloom'
                          : 'gear'
                    }
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Txt
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      lineHeight: 18,
                      color: colors.muted,
                    }}
                  >
                    {categoryLabel(equipmentKind(item), locale)}
                  </Txt>
                  <Txt
                    numberOfLines={2}
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      lineHeight: 24,
                    }}
                  >
                    {item.name}
                  </Txt>
                </View>
                <Icon name="arrow" size={18} />
              </View>
              <Txt
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  lineHeight: 20,
                  color: colors.muted,
                }}
              >
                {reviewedFacts(item, locale)
                  .slice(0, 2)
                  .map((fact) => `${fact.label}: ${fact.value}`)
                  .join(' · ') ||
                  item.description ||
                  (ar
                    ? 'التفاصيل وتجارب الأعضاء'
                    : i18nUi('التفاصيل وتجارب الأعضاء', 'Details and member experiences'))}
              </Txt>
            </Pressable>
            <Action title={ar ? 'إضافة إلى معداتي' : i18nUi('إضافة إلى معداتي', 'Add to my equipment')} onPress={() => add(item)} selected />
            <Action
              title={
                selection.includes(item.id)
                  ? ar
                    ? 'إزالة من المقارنة'
                    : i18nUi('إزالة من المقارنة', 'Remove from comparison')
                  : ar
                    ? 'أضف للمقارنة'
                    : i18nUi('أضف للمقارنة', 'Add to comparison')
              }
              selected={selection.includes(item.id)}
              disabled={
                !selection.includes(item.id) && selection.length >= 3
              }
              onPress={() => toggle(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <Empty
            busy={busy}
            error={error}
            retry={() => setRevision((r) => r + 1)}
          />
        }
        ListFooterComponent={
          error && visible.length ? (
            <Empty
              busy={false}
              error
              retry={() => setRevision((r) => r + 1)}
            />
          ) : null
        }
      />
      {selected.length ? (
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.paper,
            gap: 7,
          }}
        >
          <Txt style={{ fontSize: 12 }}>
            {selected.map((item) => item.name).join(' · ')}
          </Txt>
          <View
            style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8 }}
          >
            <Action
              title={
                ar
                  ? `قارن (${selected.length}/3)`
                  : i18nUi(`قارن (${selected.length}/3)`, `Compare (${selected.length}/3)`)
              }
              selected
              disabled={selected.length < 2}
              onPress={() => setComparison(true)}
            />
            <Action
              title={ar ? 'مسح الاختيار' : i18nUi('مسح الاختيار', 'Clear selection')}
              onPress={() => setConfirmClear(true)}
            />
          </View>
          {selected.length === 1 ? (
            <Txt style={styles.muted}>
              {ar
                ? 'أضف جهازًا آخر لفتح المقارنة.'
                : i18nUi('أضف جهازًا آخر لفتح المقارنة.', 'Add one more tool to open the comparison.')}
            </Txt>
          ) : null}
        </View>
      ) : null}
      <ConfirmDialog visible={confirmClear} title={ar ? 'مسح المعدات المختارة' : i18nUi('مسح المعدات المختارة', 'Clear selected equipment')} message={ar ? 'مسح المعدات التي اخترتها للمقارنة؟' : i18nUi('مسح المعدات التي اخترتها للمقارنة؟', 'Clear the equipment selected for comparison?')} onCancel={() => setConfirmClear(false)} onConfirm={() => { setSelection([]); setConfirmClear(false); }} />
      <Modal
        visible={comparison}
        animationType="slide"
        onRequestClose={() => setComparison(false)}
        presentationStyle="fullScreen"
      >
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
            <View
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Action
                title={ar ? 'إغلاق المقارنة' : i18nUi('إغلاق المقارنة', 'Close comparison')}
                onPress={() => setComparison(false)}
              />
            </View>
            <EquipmentCompare
              items={selected}
              remove={(id) => {
                setSelection((values) =>
                  values.filter((value) => value !== id),
                );
                if (selected.length <= 2) setComparison(false);
              }}
              open={(item) => {
                setComparison(false);
                open(item);
              }}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
interface Guide {
  intro: string;
  pros: string[];
  cons: string[];
  care: string;
}
function guide(item: EquipmentItem, ar: boolean): Guide {
  const kind = equipmentKind(item);
  const general = categoryGuide(item, ar);
  if (general) return general;
  if (kind === 'moka_pot')
    return ar
      ? {
          intro:
            'موكا بوت لتحضير قهوة ممتلئة على الموقد. تناسب من يحب التحضير اليدوي وكوباً مركزاً.',
          pros: [
            'تعمل على مواقد الغاز والكهرباء دون آلة قهوة كهربائية.',
            'تنظيف يومي بسيط بالماء وفق دليل Bialetti.',
          ],
          cons: [
            'Moka Express تحتاج صفيحة Bialetti المخصصة للعمل على الحث الحراري.',
            'لا تُغسل في غسالة الصحون، وتحتاج متابعة حرارة الموقد.',
          ],
          care: 'املأ الماء حتى مستوى صمام الأمان دون تجاوزه. استخدم طحن الموكا دون كبس البن، وحضّر على حرارة منخفضة. اترك الأداة تبرد قبل تنظيفها بالماء.',
        }
      : {
          intro:
            'A stovetop brewer for a full-bodied, concentrated cup and a hands-on routine.',
          pros: [
            'Works on gas and electric hobs without an electric coffee machine.',
            'Simple daily water rinse following Bialetti instructions.',
          ],
          cons: [
            'Moka Express needs the Bialetti induction plate on induction hobs.',
            'Not dishwasher safe; hob heat needs attention.',
          ],
          care: 'Keep water at the safety-valve level. Use moka-ground coffee without tamping and low hob heat. Let the brewer cool before rinsing with water.',
        };
  if (kind === 'xbloom')
    return ar
      ? {
          intro:
            'تحضير قهوة مقطّرة آلياً، مع إدارة الوصفات في تطبيق xBloom الرسمي.',
          pros: [
            'إعادة استخدام إعدادات الوصفة لكل كوب.',
            'استخدام حبوبك الخاصة مع القطّارة المناسبة للجهاز.',
          ],
          cons: [
            'تحقق من موديل الجهاز قبل استخدام رابط وصفة.',
            'تعتمد الميزات المتقدمة على الجهاز وتطبيق الشركة.',
          ],
          care: 'اتبع تعليمات التنظيف والصيانة الخاصة بموديلك. اقرأ المصدر لمعرفة الملحقات المطلوبة.',
        }
      : {
          intro:
            'Automated pour-over, with recipes managed in the official xBloom app.',
          pros: [
            'Repeat recipe settings for your next cup.',
            'Brew your own beans with the dripper appropriate to your model.',
          ],
          cons: [
            'Check the machine model before using a recipe link.',
            'Advanced functions depend on the machine and manufacturer app.',
          ],
          care: 'Follow your model’s cleaning instructions and check the manufacturer source for required accessories.',
        };
  const groups: Record<string, [Guide, Guide]> = {
    grinder: [
      {
        intro:
          'الطاحونة أساس ضبط الاستخلاص. اختيارها يعتمد على طريقة تحضيرك ونطاق الطحن.',
        pros: ['تعديل الطحن لمواءمة وصفاتك.', 'طحن البن عند التحضير.'],
        cons: [
          'لا تنتقل أرقام الطحن مباشرة بين موديلات مختلفة.',
          'تحقق من ملاءمة الموديل للإسبريسو أو الترشيح قبل الاختيار.',
        ],
        care: 'راجع تعليمات الموديل لتنظيف الشفرات وتجنب استخدام الماء إذا لم يسمح به المصنع.',
      },
      {
        intro:
          'Choose a grinder around your brew method and the model’s grind range.',
        pros: ['Adjust grind for your recipe.', 'Grind beans when you brew.'],
        cons: [
          'Grind numbers do not transfer between models.',
          'Check espresso or filter suitability for the exact model.',
        ],
        care: 'Follow the model’s burr-cleaning instructions; do not use water unless the manufacturer permits it.',
      },
    ],
    scale: [
      {
        intro: 'الميزان يساعدك على تكرار جرعة البن وكمية الماء بدقة.',
        pros: [
          'قياس البن والماء بدلاً من التقدير.',
          'متابعة النسبة بين الماء والبن.',
        ],
        cons: [
          'دقة القياس ومقاومة الماء تختلف حسب الموديل.',
          'تحقق من مساحة الميزان وملاءمته لوعاء التحضير.',
        ],
        care: 'لا تعتبر الميزان مقاوماً للماء إلا إذا صرّح المصنع بذلك.',
      },
      {
        intro: 'A scale helps repeat your coffee dose and water amount.',
        pros: [
          'Measure coffee and water instead of estimating.',
          'Track the water-to-coffee ratio.',
        ],
        cons: [
          'Resolution and water resistance vary by model.',
          'Check size and fit for your brewing vessel.',
        ],
        care: 'Do not assume water resistance unless specified by the manufacturer.',
      },
    ],
  };
  if (groups[kind]) return groups[kind][ar ? 0 : 1];
  return ar
    ? {
        intro:
          'دليل عام لاختيار الأداة؛ مواصفات هذا الموديل موضحة في المصدر أدناه.',
        pros: [
          'اختيار إعدادات تتناسب مع أسلوب التحضير.',
          'إعادة التجربة وتعديل متغير واحد كل مرة.',
        ],
        cons: [
          'تختلف متطلبات الملحقات والتنظيف حسب الموديل.',
          'تحتاج تجربة للطحن والنسبة للوصول إلى مذاقك المفضل.',
        ],
        care: 'اتبع تعليمات المصنع، وراجع الفلاتر والملحقات المناسبة لهذا الموديل.',
      }
    : {
        intro:
          'A general selection guide; exact model specifications are available in the source below.',
        pros: [
          'Choose settings for your brewing style.',
          'Repeat a brew and change one variable at a time.',
        ],
        cons: [
          'Accessories and cleaning needs vary by model.',
          'Dialing in grind and ratio takes experimentation.',
        ],
        care: 'Follow the manufacturer instructions and check the filters and accessories for this model.',
      };
}
export function EquipmentDetail({
  item,
  recipes,
  userId,
  login,
  openRecipe,
  myEquipment,
}: {
  item: EquipmentItem;
  recipes: RecipeItem[];
  userId: string | null;
  login: () => void;
  openRecipe: (r: RecipeItem) => void;
  myEquipment: () => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const sourceGuide = guide(item, ar);
  const g = ar ? sourceGuide : {...sourceGuide,intro:i18nUi('',sourceGuide.intro),pros:sourceGuide.pros.map(text=>i18nUi('',text)),cons:sourceGuide.cons.map(text=>i18nUi('',text)),care:i18nUi('',sourceGuide.care)};
  const localRelated = recipes.filter(
    (r) =>
      r.equipment.some((e) => e.modelId === item.id) ||
      item.methods.includes(r.method),
  );
  const [catalogRelated, setCatalogRelated] = useState<RecipeItem[]>([]);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const validMethods = item.methods.filter(isMethod);
  const methodKey = validMethods.join('|');
  useEffect(() => {
    let active = true;
    const client = publicSupabase;
    if (!client || !validMethods.length) {
      setCatalogRelated([]);
      return;
    }
    setCatalogBusy(true);
    const run = async () => {
      try {
        const { data, error } = await client
          .from('recipes')
          .select(RECIPE_FIELDS)
          .eq('visibility', 'public')
          .in('brew_method', validMethods)
          .order('updated_at', { ascending: false })
          .limit(8);
        if (!active) return;
        if (error) {
          setCatalogRelated([]);
          return;
        }
        setCatalogRelated(
          ((data ?? []) as unknown as RecipeRow[]).flatMap((row) => {
            const mapped = mapRecipe(row, locale);
            return mapped ? [mapped] : [];
          }),
        );
      } catch {
        if (active) setCatalogRelated([]);
      } finally {
        if (active) setCatalogBusy(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [item.id, methodKey, locale]);
  const related = [
    ...new Map(
      [...localRelated, ...catalogRelated].map((recipe) => [recipe.id, recipe]),
    ).values(),
  ];
  return (
    <ScrollView testID="equipment-detail-scroll" keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.page}>
      <View testID="equipment-detail-hero" style={[detailStyles.hero, { flexDirection: ar ? 'row-reverse' : 'row' }]}>
        <View style={detailStyles.photo}><EquipmentGallery compact item={item} /></View>
        <View testID="equipment-detail-summary" style={detailStyles.copy}>
          <Txt style={s.eyebrow}>{categoryLabel(equipmentKind(item), locale)}</Txt>
          <Txt heading style={detailStyles.title}>{item.name}</Txt>
          <Action selected title={ar ? 'إضافة إلى معداتي' : i18nUi('إضافة إلى معداتي', 'Add to my equipment')} onPress={myEquipment} />
        </View>
      </View>
      <EquipmentUsage item={item} />
      <Txt style={detailStyles.text}>{g.intro}</Txt>
      <Txt style={s.editorial}>{ar
        ? 'دليل BeanMora · المميزات والسلبيات تقييم تحريري، وآراء المشتركين أدناه.'
        : i18nUi('دليل BeanMora · المميزات والسلبيات تقييم تحريري، وآراء المشتركين أدناه.', 'BeanMora guide · Strengths and tradeoffs are editorial; member opinions appear below.')}</Txt>
      <DetailColumns minWidth={360} testID="equipment-pros-cons">
        {[{ title: ar ? 'المميزات' : i18nUi('المميزات', 'Strengths'), entries: g.pros, color: '#EAF0E7' },
          { title: ar ? 'السلبيات وما يجب مراعاته' : i18nUi('السلبيات وما يجب مراعاته', 'Tradeoffs'), entries: g.cons, color: '#F4EAE0' }].map(block =>
          <View key={block.title} style={[styles.card, detailStyles.card, { backgroundColor: block.color, flex: 1 }]}>
            <Txt heading style={detailStyles.heading}>{block.title}</Txt>
            {block.entries.map(text => <Txt key={text} style={detailStyles.text}>• {text}</Txt>)}
          </View>)}
      </DetailColumns>
      <DetailColumns testID="equipment-model-information">
        {item.description || reviewedFacts(item, locale).length ? <View style={[styles.card, detailStyles.card]}>
          <Txt heading style={detailStyles.heading}>{ar ? 'تفاصيل الموديل' : i18nUi('تفاصيل الموديل', 'Model details')}</Txt>
          {item.description ? <Txt style={detailStyles.text}>{item.description}</Txt> : null}
          {reviewedFacts(item, locale).map(fact => <View key={fact.key} style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8, borderTopWidth: 1, borderColor: colors.line, paddingTop: 6 }}>
            <Txt style={[styles.label, { flex: 1 }]}>{fact.label}</Txt>
            <Txt style={{ flex: 2, minWidth: 0, fontSize: 13, lineHeight: 20 }}>{fact.value}</Txt>
          </View>)}
        </View> : null}
        <View style={[styles.card, detailStyles.card]}>
          <Txt heading style={detailStyles.heading}>{ar ? 'الاستخدام والعناية' : i18nUi('الاستخدام والعناية', 'Use and care')}</Txt>
          <Txt style={detailStyles.text}>{g.care}</Txt>
          {item.sourceUrl ? <SourceLink compact title={ar ? 'مواصفات الأداة من المصدر' : i18nUi('مواصفات الأداة من المصدر', 'Manufacturer specifications')} url={item.sourceUrl} /> : null}
          {item.verifiedAt ? <Txt style={s.editorial}>{ar ? 'آخر تحقق من المصدر: ' : i18nUi('آخر تحقق من المصدر: ', 'Source checked: ')}{new Date(item.verifiedAt).toLocaleDateString(locale + '-u-nu-latn')}</Txt> : null}
          {reviewedSupportingSources(item).length ? <Disclosure title={ar ? 'مراجع المواصفات الإضافية' : i18nUi('مراجع المواصفات الإضافية', 'Supporting manufacturer sources')}>
            {reviewedSupportingSources(item).map((url, index) => <SourceLink key={url} compact title={(ar ? 'مرجع الشركة ' : i18nUi('مرجع الشركة ', 'Manufacturer reference ')) + (index + 1)} url={url} />)}
          </Disclosure> : null}
        </View>
      </DetailColumns>
      <DetailColumns testID="equipment-brew-guides">
        {item.methods.filter(isMethod).map(method => <Disclosure key={method} title={(ar ? 'دليل التحضير: ' : i18nUi('دليل التحضير: ', 'Brew guide: ')) + methods[locale][method]}>
          <MethodGuide method={method} />
        </Disclosure>)}
      </DetailColumns>
      <SectionTitle title={ar ? 'وصفات مناسبة لطريقة الأداة' : i18nUi('وصفات مناسبة لطريقة الأداة', 'Recipes for this brew method')} />
      {catalogBusy && !related.length ? <ActivityIndicator color={colors.teal} /> : related.length ?
        <DetailColumns testID="equipment-related-recipes">{related.slice(0, 8).map(r =>
          <Action compact key={r.id} title={r.title} onPress={() => openRecipe(r)} />)}</DetailColumns>
        : <Txt style={styles.muted}>{ar ? 'لا توجد وصفة مسجلة لهذه الأداة بعد.' : i18nUi('لا توجد وصفة مسجلة لهذه الأداة بعد.', 'No recipe is listed for this tool yet.')}</Txt>}
      <EquipmentReviews key={item.id + (userId ?? 'guest')} modelId={item.id} userId={userId} login={login} />
    </ScrollView>
  );
}

function EquipmentReviews({
  modelId,
  userId,
  login,
}: {
  modelId: string;
  userId: string | null;
  login: () => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [own, setOwn] = useState<EquipmentReview | null>(null);
  const [summary, setSummary] = useState<{
    review_count: number;
    average_rating: number | null;
  } | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [limit, setLimit] = useState(30);
  const [revision, setRevision] = useState(0);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [experience, setExperience] =
    useState<EquipmentReview['experience']>('used');
  const [editing, setEditing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(true);
  const inFlight = useRef(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setBusy(true);
    setFailed(false);
    if (!supabase) return;
    const fields =
      'id,user_id,rating,review_text,pros,cons,experience,status,created_at';
    void Promise.all([
      supabase
        .from('equipment_reviews')
        .select(fields)
        .eq('equipment_model_id', modelId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .order('id')
        .limit(limit),
      supabase.rpc('equipment_review_summary', { p_equipment_id: modelId }),
      userId
        ? supabase
            .from('equipment_reviews')
            .select(fields)
            .eq('equipment_model_id', modelId)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
      .then(([r, s, o]) => {
        if (!current) return;
        // Aggregate ratings are optional; a failed count must not hide readable opinions.
        setFailed(Boolean(r.error || o.error));
        if (!r.error) setReviews(r.data ?? []);
        setSummary(s.error ? null : s.data?.[0] ?? null);
        if (!o.error) setOwn(o.data);
        if (!o.error && o.data) {
          setRating(o.data.rating);
          setText(o.data.review_text);
          setPros(o.data.pros);
          setCons(o.data.cons);
          setExperience(o.data.experience);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [modelId, userId, revision, limit]);
  async function auth() {
    if (!supabase || !userId) throw new Error('member required');
    const { data, error } = await supabase.auth.getUser();
    if (
      error ||
      data.user?.id !== userId ||
      data.user.is_anonymous ||
      !active.current
    )
      throw new Error('identity changed');
    return supabase;
  }
  async function write(remove = false) {
    if (inFlight.current || busy) return;
    if (!remove && !validateReview(rating, text, pros, cons)) {
      setMessage(
        ar
          ? 'اختر تقييماً واكتب رأياً من 3 إلى 2000 حرف.'
          : i18nUi('اختر تقييماً واكتب رأياً من 3 إلى 2000 حرف.', 'Choose a rating and write 3–2000 characters.'),
      );
      return;
    }
    inFlight.current = true;
    setWriting(true);
    setMessage('');
    try {
      const db = await auth();
      const payload = {
        rating,
        review_text: text.trim(),
        pros: pros.trim(),
        cons: cons.trim(),
        experience,
      };
      let r =
        remove && own
          ? await db
              .from('equipment_reviews')
              .delete()
              .eq('id', own.id)
              .eq('user_id', userId!)
              .select('id')
              .single()
          : own
            ? await db
                .from('equipment_reviews')
                .update(payload)
                .eq('id', own.id)
                .eq('user_id', userId!)
                .select('id')
                .single()
            : await db
                .from('equipment_reviews')
                .insert({
                  ...payload,
                  equipment_model_id: modelId,
                  user_id: userId,
                })
                .select('id')
                .single();
      // A timed-out insert may already have committed. Retry only this member's model.
      if (!remove && !own && r.error?.code === '23505') {
        r = await db.from('equipment_reviews').update(payload)
          .eq('equipment_model_id', modelId).eq('user_id', userId!)
          .select('id').single();
      }
      if (r.error || !r.data?.id)
        throw r.error || new Error('no confirmed write');
      if (active.current) {
        if (remove) {
          setOwn(null);
          setRating(0);
          setText('');
          setPros('');
          setCons('');
        } else {
          setOwn({ ...payload, id: r.data.id, user_id: userId!, status: 'published',
            created_at: own?.created_at ?? new Date().toISOString() });
        }
        setEditing(false);
        setMessage(
          i18nUi(remove
              ? 'تم حذف رأيك.'
              : 'تم حفظ رأيك.', remove
              ? 'Your review was deleted.'
              : 'Your review was saved.'),
        );
        setRevision((v) => v + 1);
      }
    } catch {
      if (active.current)
        setMessage(
          ar
            ? 'تعذّر تأكيد الحفظ. حاول مرة ثانية.'
            : i18nUi('تعذّر تأكيد الحفظ. حاول مرة ثانية.', 'Save was not confirmed. Try again.'),
        );
    } finally {
      inFlight.current = false;
      if (active.current) setWriting(false);
    }
  }
  async function report() {
    if (inFlight.current || reportText.trim().length < 3 || !reportId) return;
    inFlight.current = true;
    setWriting(true);
    try {
      const db = await auth();
      const r = await db.from('reports').insert({
        reporter_id: userId,
        target_type: 'equipment_review',
        target_id: reportId,
        reason: 'other',
        details: reportText.trim().slice(0, 1000),
      });
      if (r.error) throw r.error;
      if (active.current) {
        setReportId(null);
        setReportText('');
        setMessage(
          ar
            ? 'وصل البلاغ لفريق المراجعة.'
            : i18nUi('وصل البلاغ لفريق المراجعة.', 'Your report was sent for review.'),
        );
      }
    } catch {
      if (active.current)
        setMessage(ar ? 'تعذّر إرسال البلاغ.' : i18nUi('تعذّر إرسال البلاغ.', 'Could not send the report.'));
    } finally {
      inFlight.current = false;
      if (active.current) setWriting(false);
    }
  }
  const experiences = {
    owner: ar ? 'أملك الأداة' : i18nUi('أملك الأداة', 'I own it'),
    used: ar ? 'جرّبت الأداة' : i18nUi('جرّبت الأداة', 'I have used it'),
    interested: ar ? 'مهتم بالأداة' : i18nUi('مهتم بالأداة', 'Interested in it'),
  };
  function draft(review: EquipmentReview) {
    setRating(review.rating);
    setText(review.review_text);
    setPros(review.pros);
    setCons(review.cons);
    setExperience(review.experience);
  }
  function edit(review: EquipmentReview) {
    if (writing || busy) return;
    setOwn(review);
    draft(review);
    setMessage('');
    setEditing(true);
  }
  const editor = <View testID="equipment-review-editor" style={[styles.card, detailStyles.card]}>
    <Txt heading style={detailStyles.heading}>{own ? ar ? 'عدّل رأيك' : i18nUi('عدّل رأيك', 'Edit your review') : ar ? 'شارك تجربتك' : i18nUi('شارك تجربتك', 'Share your experience')}</Txt>
    {message ? <View accessibilityLiveRegion="polite"><Txt style={styles.muted}>{message}</Txt></View> : null}
    <Txt style={s.editorial}>{ar
      ? 'رأي واحد لكل أداة. نوع التجربة تصريح منك ويمكنك تعديل رأيك.'
      : i18nUi('رأي واحد لكل أداة. نوع التجربة تصريح منك ويمكنك تعديل رأيك.', 'One editable opinion per model. Experience is self-reported.')}</Txt>
    {own?.status === 'hidden' ? <Txt style={styles.warning}>{ar ? 'رأيك مخفي بعد المراجعة. يمكنك حذفه.' : i18nUi('رأيك مخفي بعد المراجعة. يمكنك حذفه.', 'Your review is hidden after moderation. You can delete it.')}</Txt> : <>
      <View style={s.stars}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button"
        accessibilityLabel={(ar ? 'تقييم ' : i18nUi('تقييم ', 'Rate ')) + n + '/5'} accessibilityState={{ selected: rating === n }}
        onPress={() => setRating(n)} style={s.star}>
        <Icon name="star" filled={rating >= n} size={26} color="#B88836" />
      </Pressable>)}</View>
      <Chips items={Object.entries(experiences).map(([id, name]) => ({ id, name }))} value={experience} set={v => setExperience(v as EquipmentReview['experience'])} />
      <Field label={ar ? 'رأيك وتجربتك' : i18nUi('رأيك وتجربتك', 'Your review')} value={text} onChangeText={setText} multiline maxLength={2000} style={{ minHeight: 76 }} />
      <Txt style={s.editorial}>{ar ? 'من 3 إلى 2000 حرف' : i18nUi('من 3 إلى 2000 حرف', '3–2000 characters')}</Txt>
      <DetailColumns>
        <Field label={ar ? 'المميزات من تجربتك (اختياري)' : i18nUi('المميزات من تجربتك (اختياري)', 'Your strengths (optional)')} value={pros} onChangeText={setPros} maxLength={500} />
        <Field label={ar ? 'السلبيات من تجربتك (اختياري)' : i18nUi('السلبيات من تجربتك (اختياري)', 'Your tradeoffs (optional)')} value={cons} onChangeText={setCons} maxLength={500} />
      </DetailColumns>
      <Action title={writing ? ar ? 'جارٍ الحفظ…' : i18nUi('جارٍ الحفظ…', 'Saving…') : ar ? 'حفظ رأيي' : i18nUi('حفظ رأيي', 'Save my review')}
        onPress={() => void write()} disabled={writing || busy} selected />
    </>}
    {own ? <DetailColumns minWidth={360}>
      <Action title={ar ? 'إلغاء التعديل' : i18nUi('إلغاء التعديل', 'Cancel editing')} onPress={() => { draft(own); setEditing(false); setMessage(''); }} disabled={writing} />
      <Action title={ar ? 'حذف رأيي' : i18nUi('حذف رأيي', 'Delete my review')} onPress={() => void write(true)} disabled={writing || busy} />
    </DetailColumns> : null}
  </View>;
  const visibleReviews = own ? [own, ...reviews.filter(review => review.user_id !== userId)] : reviews;
  const reviewContent = (r: EquipmentReview) => <>
    <View style={s.cardTop}>
      <Txt style={{ flex: 1, fontWeight: '700' }}>{r.user_id === userId ? ar ? 'رأيك' : i18nUi('رأيك', 'Your review') : ar ? 'عضو BeanMora' : i18nUi('عضو BeanMora', 'BeanMora member')}</Txt>
      <Icon name="star" size={16} filled color="#B88836" /><Txt>{r.rating}/5</Txt>
    </View>
    <Txt style={s.editorial}>{experiences[r.experience]} · {new Date(r.created_at).toLocaleDateString(locale + '-u-nu-latn')}</Txt>
    <Txt style={detailStyles.text}>{r.review_text}</Txt>
    {r.pros ? <Txt style={detailStyles.text}>{ar ? 'المميزات: ' : i18nUi('المميزات: ', 'Strengths: ')}{r.pros}</Txt> : null}
    {r.cons ? <Txt style={detailStyles.text}>{ar ? 'السلبيات: ' : i18nUi('السلبيات: ', 'Tradeoffs: ')}{r.cons}</Txt> : null}
  </>;
  return (
    <View style={{ gap: 14 }}>
      <SectionTitle title={ar ? 'آراء المشتركين' : i18nUi('آراء المشتركين', 'Member reviews')} />
      {summary && !failed ? (
        <View style={s.reviewSummary}>
          <Icon name="star" filled color="#B88836" />
          <Txt style={{ fontSize: 20, fontWeight: '700' }}>
            {summary.average_rating ?? '—'}
          </Txt>
          <Txt style={styles.muted}>
            {summary.review_count} {ar ? 'رأي' : i18nUi('رأي', 'reviews')}
          </Txt>
        </View>
      ) : null}
      {message && own && !editing ? <View accessibilityLiveRegion="polite"><Txt style={styles.muted}>{message}</Txt></View> : null}
      {failed || busy ? <Empty busy={busy} error={failed} retry={() => setRevision(r => r + 1)} /> : !visibleReviews.length ?
        <Txt style={styles.muted}>{ar ? 'لا توجد آراء منشورة بعد. شارك أول تجربة.' : i18nUi('لا توجد آراء منشورة بعد. شارك أول تجربة.', 'No published opinions yet. Share the first experience.')}</Txt> :
        visibleReviews.map(r => <View key={r.id} testID={r.user_id === userId ? 'equipment-own-review' : undefined} style={[styles.card, detailStyles.card]}>
          {r.user_id === userId ? <>
            <Pressable accessibilityRole="button" accessibilityLabel={ar ? 'تعديل رأيك' : i18nUi('تعديل رأيك', 'Edit your review')}
              accessibilityState={{ expanded: editing }} disabled={writing || busy} onPress={() => edit(r)} style={{ gap: 8 }}>
              {reviewContent(r)}
              <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <Icon name="edit" color={colors.teal} size={17} />
                <Txt style={{ color: colors.teal, fontSize: 13 }}>{ar ? 'اضغط على رأيك لتعديله' : i18nUi('اضغط على رأيك لتعديله', 'Tap your review to edit')}</Txt>
              </View>
            </Pressable>
            {editing ? editor : null}
          </> : <>
            {reviewContent(r)}
            <Action compact title={ar ? 'الإبلاغ عن هذا الرأي' : i18nUi('الإبلاغ عن هذا الرأي', 'Report this review')} onPress={() => userId ? setReportId(r.id) : login()} />
          </>}
        </View>)}
      {!busy && !failed && summary && reviews.length < summary.review_count ? (
        <Action
          title={ar ? 'المزيد من الآراء' : i18nUi('المزيد من الآراء', 'More reviews')}
          onPress={() => setLimit((v) => v + 30)}
        />
      ) : null}
      {reportId ? (
        <View style={styles.card}>
          <Field
            label={ar ? 'سبب البلاغ' : i18nUi('سبب البلاغ', 'Report reason')}
            value={reportText}
            onChangeText={setReportText}
            maxLength={1000}
            multiline
          />
          <Action
            title={ar ? 'إرسال البلاغ' : i18nUi('إرسال البلاغ', 'Send report')}
            onPress={() => void report()}
            disabled={writing || reportText.trim().length < 3}
          />
          <Action
            title={ar ? 'إلغاء' : i18nUi('إلغاء', 'Cancel')}
            onPress={() => setReportId(null)}
          />
        </View>
      ) : null}
      {userId ? !own ? editor : null : (
        <Action title={ar ? 'سجّل دخولك لكتابة رأيك' : i18nUi('سجّل دخولك لكتابة رأيك', 'Sign in to write a review')} onPress={login} selected />
      )}
    </View>
  );
}
export function RoasterDirectory({
  open,
  coffees = [],
  initialSearch = '',
}: {
  open: (r: RoasterItem) => void;
  coffees?: CoffeeItem[];
  initialSearch?: string;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const [rows, setRows] = useState<RoasterItem[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [country, setCountry] = useState('all');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (publicSupabase)
      void loadRoasters(publicSupabase, locale)
        .then((r) => {
          if (active) setRows(r);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    return () => {
      active = false;
    };
  }, [locale, revision]);
  const visible = rows.filter(
    (r) =>
      (country === 'all' || country === r.country) &&
      matchesDeepSearch(
        [
          r.searchDocument,
          r.name,
          r.description,
          countryLabel(r.country, locale),
          ...coffees
            .filter((c) => c.roasterId === r.id)
            .map(coffeeSearchDocument),
        ].join(' '),
        search,
      ),
  );
  return (
    <ScrollView
      testID="roasters-scroll"
      contentContainerStyle={coffeeStyles.page}
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={() => setRevision((v) => v + 1)}
        />
      }
    >
      <Txt style={s.eyebrow}>
        {ar ? 'بين مورا · المحامص' : i18nUi('بين مورا · المحامص', 'BEANMORA · ROASTERIES')}
      </Txt>
      <Txt heading style={styles.title}>
        {ar ? 'المحامص' : i18nUi('المحامص', 'Roasteries')}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? 'اكتشف المحامص وحبوبها ومصادر معلوماتها في مكان واحد.'
          : i18nUi('اكتشف المحامص وحبوبها ومصادر معلوماتها في مكان واحد.', 'Explore roasters, their coffees and the sources behind each listing.')}
      </Txt>
      <Field
        label={ar ? 'ابحث عن محمصة' : i18nUi('ابحث عن محمصة', 'Find a roaster')}
        value={search}
        onChangeText={setSearch}
        placeholder={ar ? 'اسم المحمصة أو البلد…' : i18nUi('اسم المحمصة أو البلد…', 'Roaster name or country…')}
      />
      <SelectionMenu label={ar ? 'الدولة' : i18nUi('الدولة', 'Country')} items={['all', ...new Set(rows.map(r => r.country).filter(Boolean))].map(id => ({ id, name: id === 'all' ? ar ? 'كل الدول' : i18nUi('كل الدول', 'All countries') : countryLabel(id, locale) }))} value={country} onChange={setCountry} />
      {visible.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={r.name}
          onPress={() => open(r)}
          style={styles.card}
        >
          <View style={s.cardTop}>
            <View style={{ width: 74, height: 74 }}>
              <CoffeePhoto
                uri={coffees.find((c) => c.roasterId === r.id)?.imageUrl}
                seed={r.id}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={s.cardName}>{r.name}</Txt>
              <Txt style={styles.muted}>{countryLabel(r.country, locale)}</Txt>
            </View>
            <Icon name="arrow" size={18} />
          </View>
          <Txt numberOfLines={2} style={styles.muted}>
            {r.description}
          </Txt>
          <Txt style={s.linkText}>
            {ar ? 'عن المحمصة · الحبوب · الوصفات' : i18nUi('عن المحمصة · الحبوب · الوصفات', 'About · Coffees · Recipes')}
          </Txt>
        </Pressable>
      ))}
      {!visible.length || error ? (
        <Empty
          busy={busy}
          error={error}
          retry={() => setRevision((v) => v + 1)}
        />
      ) : null}
    </ScrollView>
  );
}
export function RoasterDetail({
  item,
  coffees,
  recipes,
  openCoffee,
  openRecipe,
  saveCoffee,
  saved,
  loading,
}: {
  item: RoasterItem;
  coffees: CoffeeItem[];
  recipes: RecipeItem[];
  openCoffee: (c: CoffeeItem) => void;
  openRecipe: (r: RecipeItem) => void;
  saveCoffee: (c: CoffeeItem) => void;
  saved: string[];
  loading: boolean;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const items = coffees.filter((c) => c.roasterId === item.id);
  const related = recipes.filter((r) =>
    items.some((c) => r.beanId === (c.beanId ?? c.id) || r.productId === c.id),
  );
  const cols = width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 780) - 36 - (cols - 1) * 12) / cols;
  return (
    <ScrollView contentContainerStyle={[coffeeStyles.page, { maxWidth: 780 }]}>
      <View style={s.roasterHero}>
        <Icon name="bean" size={42} color="#FFF" />
        <Txt heading style={[styles.title, { color: '#FFF' }]}>
          {item.name}
        </Txt>
        <Txt style={{ color: '#EEE4D5' }}>
          {countryLabel(item.country, locale)}
        </Txt>
      </View>
      {item.description ? <Txt>{item.description}</Txt> : null}
      <View style={styles.detailMetaRow}>
        {item.verified ? (
          <Txt style={styles.metaPill}>
            {ar ? 'محمصة موثّقة' : i18nUi('محمصة موثّقة', 'Verified roaster')}
          </Txt>
        ) : null}
        {item.physicalStore === true ? (
          <Txt style={styles.metaPill}>
            {ar ? 'لديها متجر فعلي' : i18nUi('لديها متجر فعلي', 'Physical store')}
          </Txt>
        ) : null}
        {item.shipsToGcc === true ? (
          <Txt style={styles.metaPill}>
            {ar ? 'تشحن لدول الخليج' : i18nUi('تشحن لدول الخليج', 'Ships to GCC')}
          </Txt>
        ) : null}
      </View>
      {item.websiteUrl ? (
        <SourceLink
          title={ar ? 'موقع المحمصة' : i18nUi('موقع المحمصة', 'Roaster website')}
          url={item.websiteUrl}
        />
      ) : null}
      {item.instagramUrl ? (
        <SourceLink title="Instagram" url={item.instagramUrl} />
      ) : null}
      {item.locations
        .filter((l) => l.address)
        .map((l, i) => (
          <View key={i} style={styles.card}>
            <Txt heading>{l.label || (ar ? 'الموقع' : i18nUi('الموقع', 'Location'))}</Txt>
            <Txt>{l.address}</Txt>
            {Number.isFinite(l.latitude) &&
            Number.isFinite(l.longitude) &&
            l.latitude !== null &&
            l.longitude !== null ? (
              <SourceLink
                title={ar ? 'فتح الخريطة' : i18nUi('فتح الخريطة', 'Open map')}
                url={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`}
              />
            ) : null}
          </View>
        ))}
      <SectionTitle title={ar ? 'حبوب المحمصة' : i18nUi('حبوب المحمصة', 'Roaster coffees')} />
      {loading ? (
        <ActivityIndicator color={colors.brown} />
      ) : items.length ? (
        <View style={s.grid}>
          {items.map((c) => (
            <CoffeeCard
              key={c.kind + c.id}
              item={c}
              width={cardWidth}
              open={() => openCoffee(c)}
              save={() => saveCoffee(c)}
              saved={saved.includes(c.beanId ?? c.id)}
            />
          ))}
        </View>
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? 'لم تُضف حبوب منشورة لهذه المحمصة بعد.'
            : i18nUi('لم تُضف حبوب منشورة لهذه المحمصة بعد.', 'No published coffees are listed for this roaster yet.')}
        </Txt>
      )}
      <SectionTitle
        title={ar ? 'وصفات مرتبطة بحبوبها' : i18nUi('وصفات مرتبطة بحبوبها', 'Linked coffee recipes')}
      />
      {related.length ? (
        related.map((r) => (
          <Action key={r.id} title={r.title} onPress={() => openRecipe(r)} />
        ))
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? 'لا توجد وصفات مرتبطة مسجلة حالياً.'
            : i18nUi('لا توجد وصفات مرتبطة مسجلة حالياً.', 'No linked recipes are listed yet.')}
        </Txt>
      )}
      {item.sourceUrl ? (
        <SourceLink
          title={ar ? 'مصدر معلومات المحمصة' : i18nUi('مصدر معلومات المحمصة', 'Roaster data source')}
          url={item.sourceUrl}
        />
      ) : null}
      {item.verifiedAt ? (
        <Txt style={s.editorial}>
          {ar ? 'آخر تحقق: ' : i18nUi('آخر تحقق: ', 'Last checked: ')}
          {new Date(item.verifiedAt).toLocaleDateString(locale + '-u-nu-latn')}
        </Txt>
      ) : null}
    </ScrollView>
  );
}
export function XBLOOMHub({
  openRecipe,
  tools,
}: {
  recipes: RecipeItem[];
  openRecipe: (r: RecipeItem) => void;
  tools: () => void;
  loading: boolean;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [resourcesOpen, setResourcesOpen] = useState(false);
  return (
    <RecipeCatalog
      method="xbloom"
      locked
      open={openRecipe}
      header={
        <View style={{ gap: 12 }}>
          <View
            testID="xbloom-hero"
            style={[
              s.xbloomHero,
              { flexDirection: ar ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[s.xbloomHeroCopy, { padding: width < 600 ? 16 : 26 }]}
            >
              <View style={s.xbloomBrand}>
                <Icon name="xbloom" size={18} color="#DAB797" />
                <Txt style={s.xbloomBrandText}>xBloom</Txt>
              </View>
              <Txt
                heading
                style={[
                  s.xbloomTitle,
                  {
                    fontSize: width < 600 ? 25 : 36,
                    lineHeight: width < 600 ? 34 : 46,
                  },
                ]}
              >
                {ar ? 'كوبك، على ذوقك.' : i18nUi('كوبك، على ذوقك.', 'Make it your cup.')}
              </Txt>
              <Txt style={s.xbloomSubtitle}>
                {ar
                  ? 'وصفات لموديلك، من الطحنة إلى آخر صبة.'
                  : i18nUi('وصفات لموديلك، من الطحنة إلى آخر صبة.', 'Recipes for your machine, from grind to final pour.')}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ar ? 'أدوات xBloom' : i18nUi('أدوات xBloom', 'xBloom tools')}
                onPress={tools}
                style={s.xbloomToolsButton}
              >
                <Icon name="gear" size={17} color="#FFF" />
                <Txt style={s.xbloomToolsText}>
                  {width < 600
                    ? ar
                      ? 'الأدوات'
                      : i18nUi('الأدوات', 'Tools')
                    : ar
                      ? 'أدوات xBloom'
                      : i18nUi('أدوات xBloom', 'xBloom tools')}
                </Txt>
                <Icon name="arrow" size={16} color="#FFF" />
              </Pressable>
            </View>
            <View
              style={[
                s.xbloomHeroPhoto,
                { width: width < 600 ? '34%' : '40%' },
              ]}
            >
              <Image
                testID="xbloom-hero-photo"
                source={require('../assets/brewing/filter-coffee.png')}
                resizeMode="cover"
                accessibilityLabel={
                  ar
                    ? 'صورة تحضير توضيحية من BeanMora'
                    : i18nUi('صورة تحضير توضيحية من BeanMora', 'Brewing illustration by BeanMora')
                }
                style={[
                  StyleSheet.absoluteFill,
                  { width: '100%', height: '100%' },
                ]}
              />
              <View style={s.xbloomPhotoCaption}>
                <Txt style={{ color: '#FFF', fontSize: 11, lineHeight: 17 }}>
                  {ar ? 'صورة توضيحية' : i18nUi('صورة توضيحية', 'Brewing illustration')}
                </Txt>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              ar
                ? 'دليل الجهاز وروابط xBloom'
                : i18nUi('دليل الجهاز وروابط xBloom', 'Machine guides and xBloom links')
            }
            accessibilityState={{ expanded: resourcesOpen }}
            onPress={() => setResourcesOpen((v) => !v)}
            style={s.xbloomResourcesToggle}
          >
            <Icon name="globe" size={18} color={colors.teal} />
            <Txt
              style={{
                flex: 1,
                color: colors.teal,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {ar
                ? 'دليل الجهاز وروابط xBloom'
                : i18nUi('دليل الجهاز وروابط xBloom', 'Machine guides and xBloom links')}
            </Txt>
            <Icon
              name={resourcesOpen ? 'back' : 'arrow'}
              size={16}
              color={colors.teal}
            />
          </Pressable>
          {resourcesOpen ? (
            <View style={s.xbloomLinks}>
              {XBLOOM_RESOURCES.map((r) => (
                <View key={r.url} style={s.xbloomLinkChip}>
                  <SourceLink title={i18nUi(r.ar, r.en)} url={r.url} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      }
    />
  );
}
export function recipeMethodName(method: string, locale: 'ar' | 'en') {
  return isMethod(method) ? methods[locale][method] : method;
}
const s = StyleSheet.create({
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
  },
  cardName: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  symbol: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#E9DFD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: '#EEE8DD',
  },
  linkText: { color: colors.brown, fontSize: 12, fontWeight: '700' },
  editorial: { fontSize: 12, lineHeight: 21, color: colors.muted },
  toolHero: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ECE3D6',
  },
  roasterHero: {
    backgroundColor: colors.brown,
    padding: 26,
    borderRadius: 22,
    gap: 10,
  },
  xbloomHero: {
    backgroundColor: colors.brown,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 200,
  },
  xbloomHeroCopy: { flex: 1, minWidth: 0, gap: 9, justifyContent: 'center' },
  xbloomBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  xbloomBrandText: {
    color: '#DAB797',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  // An in-flow image with height:100% inside an auto-height Yoga row can
  // contribute its intrinsic dimensions on Android. The image is absolute;
  // the copy and this compact frame determine the hero's height instead.
  xbloomHeroPhoto: {
    width: '40%',
    minHeight: 200,
    flexShrink: 0,
    backgroundColor: '#A48768',
  },
  xbloomPhotoCaption: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 7,
    backgroundColor: '#21170D88',
  },
  xbloomTitle: { color: '#FFF', fontWeight: '800' },
  xbloomSubtitle: { color: '#EEDFD1', fontSize: 14, lineHeight: 22 },
  xbloomToolsButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  xbloomToolsText: {
    color: '#FFF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  xbloomResourcesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: '#ECF3EF',
    borderRadius: 14,
  },
  xbloomLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  xbloomLinkChip: {
    minHeight: 44,
    flexBasis: '46%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFE6D8',
    padding: 16,
    borderRadius: 16,
  },
  stars: { flexDirection: 'row', gap: 4 },
  star: {
    minWidth: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
