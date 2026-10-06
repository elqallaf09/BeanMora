import { modelLabel, catalogName } from './localizedContent';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { supabase } from './client';
import {
  mapRecipe,
  RECIPE_FIELDS,
  type RecipeItem,
  type RecipeRow,
} from './data';
import { MethodPicker, coffeeStyles } from './CoffeeScreens';
import { RecipeVisual } from './RecipeVisual';
import { MethodGuide } from './MethodGuide';
import { recipeTitle } from './manualBrew';
import { recipeQuickFacts } from './recipeQuickFacts';
import { Action, Field, Icon, Language, Txt, colors, styles } from './ui';
import { FlavorIcon, FlavorNotes } from './SensoryProfile';
import {
  emptyRecipeFilters,
  readRecipeDiscovery,
  recipeFilterCount,
  recipePageQuery,
  RECIPE_DISCOVERY_FIELDS,
  RECIPE_PAGE_SIZE,
  type RecipeDiscovery,
  type RecipeDiscoveryFilters,
  type RecipeDiscoveryRow,
  type RecipeSourceFilter,
} from './recipeDiscovery';
import { methods } from './copy';
import { FLAVORS, type Method } from './core/engine';
type DiscoveredRecipe = RecipeItem & { discovery: RecipeDiscovery };
function FilterChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[catalogStyles.chip, selected && catalogStyles.chipSelected]}
    >
      <Txt
        style={{
          fontSize: 12,
          lineHeight: 19,
          fontWeight: '700',
          color: selected ? '#FFF' : colors.brown,
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
const flavorLabels = {
  chocolate: ['شوكولاتة', 'Chocolate'],
  nutty: ['مكسرات', 'Nutty'],
  fruity: ['فواكه', 'Fruity'],
  citrus: ['حمضيات', 'Citrus'],
  floral: ['زهور', 'Floral'],
  caramel: ['كراميل', 'Caramel'],
  spice: ['توابل', 'Spice'],
} as const;
export function RecipeCatalog({
  open,
  method: initialMethod,
  header,
  locked = false,
}: {
  open: (r: RecipeItem) => void;
  method?: Method;
  header?: ReactNode;
  locked?: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const isXBloomHub = locked && initialMethod === 'xbloom';
  const pageSize = isXBloomHub ? 12 : RECIPE_PAGE_SIZE;
  const { width } = useWindowDimensions();
  const [method, setMethod] = useState<Method | undefined>(initialMethod);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<DiscoveredRecipe[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState<RecipeSourceFilter>('all');
  const [model, setModel] = useState('all');
  const [filters, setFilters] = useState(emptyRecipeFilters);
  const [draftFilters, setDraftFilters] = useState(emptyRecipeFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const requestGeneration = useRef(0);
  const filterCount = recipeFilterCount(filters);
  const hasSearch = Boolean(
    search.trim() ||
    filterCount ||
    source !== 'all' ||
    (!locked && method) ||
    (method === 'xbloom' && model !== 'all'),
  );
  const invalidate = () => {
    requestGeneration.current += 1;
    setPage(0);
    setMore(false);
    setRevision((value) => value + 1);
  };
  const resetSearch = () => {
    invalidate();
    setSearch('');
    setDebounced('');
    setFilters(emptyRecipeFilters());
    setDraftFilters(emptyRecipeFilters());
    setSource('all');
    setModel('all');
    if (!locked) setMethod(undefined);
  };
  useEffect(() => {
    if (search === debounced) return;
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 320);
    return () => clearTimeout(t);
  }, [search, debounced]);
  useEffect(() => {
    let active = true;
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    const current = () => active && generation === requestGeneration.current;
    const cancel = () => {
      active = false;
      controller.abort();
    };
    setBusy(true);
    setError(false);
    if (page === 0) {
      setRows([]);
      setTotal(null);
      setMore(false);
    }
    // Editing invalidates an old request immediately; only settled search text
    // starts another request. The optional filter panel applies one draft at once.
    if (search !== debounced) return cancel;
    if (!supabase) {
      setError(true);
      setBusy(false);
      return cancel;
    }
    const query = recipePageQuery(
      supabase,
      { query: debounced, method, source, model, filters },
      page,
      `${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`,
      controller.signal,
      pageSize,
    );
    void (async () => {
      try {
        const result = await query;
        if (!current()) return;
        if (result.error) {
          setError(true);
          return;
        }
        const mapped = (
          (result.data ?? []) as unknown as (RecipeRow & RecipeDiscoveryRow)[]
        ).flatMap((r) => {
          const item = mapRecipe(r, locale);
          return item
            ? [{ ...item, discovery: readRecipeDiscovery(r, locale) }]
            : [];
        });
        setRows((previous) =>
          page === 0
            ? mapped
            : [
                ...new Map(
                  [...previous, ...mapped].map((r) => [r.id, r]),
                ).values(),
              ],
        );
        setTotal(result.count);
        setMore(
          result.count != null
            ? (page + 1) * pageSize < result.count
            : (result.data?.length ?? 0) === pageSize,
        );
      } catch {
        if (current()) setError(true);
      } finally {
        if (current()) setBusy(false);
      }
    })();
    return cancel;
  }, [
    locale,
    method,
    search,
    debounced,
    source,
    model,
    filters,
    page,
    revision,
    pageSize,
  ]);
  const columns = width >= 850 ? (isXBloomHub ? 3 : 4) : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 1120) - 36 - (columns - 1) * 12) / columns;
  return (
    <>
      <FlatList
        testID={initialMethod === 'xbloom' ? 'xbloom-scroll' : 'recipe-catalog'}
        key={columns}
        numColumns={columns}
        data={rows}
        initialNumToRender={pageSize}
        keyExtractor={(r) => r.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={[coffeeStyles.page, { gap: 12 }]}
        keyboardShouldPersistTaps="handled"
        refreshing={busy && page === 0}
        onRefresh={() => {
          setPage(0);
          setRevision((v) => v + 1);
        }}
        ListHeaderComponent={
          <View style={{ gap: isXBloomHub ? 12 : 16, marginBottom: 8 }}>
            {header}
            <View
              style={{
                flexDirection: ar ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Txt heading style={[styles.title, { flex: 1 }]}>
                {initialMethod === 'xbloom'
                  ? ar
                    ? 'وصفات xBloom'
                    : 'xBloom recipes'
                  : ar
                    ? 'مكتبة الوصفات'
                    : 'Recipe library'}
              </Txt>
              {total !== null ? (
                <View style={catalogStyles.count}>
                  <Txt
                    style={{
                      color: colors.teal,
                      fontSize: 14,
                      lineHeight: 22,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {total.toLocaleString('en-US')}
                  </Txt>
                  <Txt style={{ fontSize: 10, color: colors.muted }}>
                    {ar ? 'وصفة' : 'recipes'}
                  </Txt>
                </View>
              ) : null}
            </View>
            <Txt style={styles.muted}>
              {ar
                ? isXBloomHub
                  ? 'طحنة، حرارة وصبات — كل إعدادات كوبك في مكان واحد.'
                  : 'ابحث في المكتبة كاملة، وافتح كل وصفة لتفاصيلها ومصدرها.'
                : isXBloomHub
                  ? 'Grind, temperature and pours, all ready to explore.'
                  : 'Search the full library and open a recipe for its details and sources.'}
            </Txt>
            {!locked ? (
              <MethodPicker
                value={method}
                onChange={(v) => {
                  invalidate();
                  setMethod(v);
                }}
              />
            ) : null}
            <MethodGuide key={method ?? 'all'} method={method} />
            <View testID="quick-serving-filters" style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
              {([['', ar ? 'الكل' : 'All'], ['hot', ar ? 'حار' : 'Hot'], ['iced', ar ? 'مثلّج' : 'Iced'], ['cold', ar ? 'بارد' : 'Cold']] as const).map(([id, label]) => (
                <Pressable key={id} accessibilityRole="button" accessibilityLabel={ar ? `تقديم: ${label}` : `Serving: ${label}`}
                  accessibilityState={{ selected: filters.servingStyle === id }}
                  onPress={() => { invalidate(); setFilters(value => ({ ...value, servingStyle: id })); }}
                  style={[catalogStyles.chip, filters.servingStyle === id && catalogStyles.chipSelected]}>
                  <Txt style={{ fontSize: 13, fontWeight: '700', color: filters.servingStyle === id ? '#FFF' : colors.brown }}>{label}</Txt>
                </Pressable>
              ))}
            </View>
            {filters.servingStyle ? <Txt style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>
              {ar ? 'النتائج تطابق نوع التقديم المحدد. الوصفات غير المصنّفة تظهر في «الكل».' : 'Results match the selected serving style. Unclassified recipes appear in All.'}
            </Txt> : null}
            <View
              style={{
                flexDirection: ar ? 'row-reverse' : 'row',
                gap: 10,
                alignItems: 'flex-end',
              }}
            >
              <View style={{ flex: 1 }}>
                <Field
                  label={ar ? 'ابحث عن وصفة' : 'Find a recipe'}
                  value={search}
                  maxLength={160}
                  onChangeText={(value) => {
                    invalidate();
                    setSearch(value);
                  }}
                  placeholder={
                    ar
                      ? 'وصفة، نكهة، صانع، بلد أو محمصة…'
                      : 'Recipe, flavor, creator, country or roaster…'
                  }
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  ar
                    ? `تصفية الوصفات${filterCount ? `، ${filterCount} مفعلة` : ''}`
                    : `Filter recipes${filterCount ? `, ${filterCount} active` : ''}`
                }
                onPress={() => {
                  setDraftFilters({ ...filters });
                  setFiltersOpen(true);
                }}
                style={[
                  styles.button,
                  {
                    flexDirection: ar ? 'row-reverse' : 'row',
                    gap: 8,
                    paddingVertical: 8,
                    borderColor: filterCount ? colors.brown : colors.line,
                  },
                ]}
              >
                <Icon name="gear" size={18} />
                <Txt style={{ fontWeight: '700', fontSize: 14 }}>
                  {ar ? 'تصفية' : 'Filters'}
                </Txt>
                {filterCount > 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.brown,
                      borderRadius: 20,
                      minWidth: 23,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Txt
                      style={{
                        color: '#FFF',
                        textAlign: 'center',
                        fontSize: 12,
                      }}
                    >
                      {filterCount}
                    </Txt>
                  </View>
                ) : null}
              </Pressable>
            </View>
            {hasSearch || filterCount > 0 ? (
              <View
                style={{
                  flexDirection: ar ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                {hasSearch ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      ar ? 'مسح البحث والتصفية' : 'Clear search and filters'
                    }
                    onPress={resetSearch}
                    style={{
                      minHeight: 44,
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Txt
                      style={{
                        color: colors.brown,
                        fontSize: 13,
                        textDecorationLine: 'underline',
                      }}
                    >
                      {ar ? 'مسح الكل' : 'Clear all'}
                    </Txt>
                  </Pressable>
                ) : null}
                {filterCount > 0 ? (
                  <Txt style={[styles.muted, { flex: 1, minWidth: 100 }]}>
                    {ar
                      ? 'تُطبق الشروط معًا على المكتبة كاملة.'
                      : 'Filters combine across the full library.'}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            <View
              style={{
                flexDirection:
                  width >= 600 ? (ar ? 'row-reverse' : 'row') : 'column',
                gap: 12,
              }}
            >
              <View
                style={[catalogStyles.filterGroup, width >= 600 && { flex: 1 }]}
              >
                <Txt style={catalogStyles.filterLabel}>
                  {ar ? 'المصدر' : 'Source'}
                </Txt>
                <View
                  style={{
                    flexDirection: ar ? 'row-reverse' : 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {[
                    ['all', ar ? 'كل المصادر' : 'All sources'],
                    ['official', ar ? 'رسمي' : 'Official'],
                    ['community', ar ? 'مجتمعي' : 'Community'],
                  ].map(([id, title]) => (
                    <FilterChip
                      key={id}
                      title={title}
                      selected={source === id}
                      onPress={() => {
                        invalidate();
                        setSource(id as RecipeSourceFilter);
                      }}
                    />
                  ))}
                </View>
              </View>
              {initialMethod === 'xbloom' || method === 'xbloom' ? (
                <View
                  style={[
                    catalogStyles.filterGroup,
                    width >= 600 && { flex: 1 },
                  ]}
                >
                  <Txt style={catalogStyles.filterLabel}>
                    {ar ? 'موديل الجهاز' : 'Your machine'}
                  </Txt>
                  <View
                    style={{
                      flexDirection: ar ? 'row-reverse' : 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {['all', 'Studio', 'Original'].map((id) => (
                      <FilterChip
                        key={id}
                        title={
                          id === 'all'
                            ? ar
                              ? 'كل الموديلات'
                              : 'All models'
                            : modelLabel(id, locale)
                        }
                        selected={model === id}
                        onPress={() => {
                          invalidate();
                          setModel(id);
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
            {error && rows.length === 0 ? (
              <View style={styles.card}>
                <Txt style={styles.error}>
                  {ar ? 'تعذّر تحميل الوصفات.' : 'Could not load recipes.'}
                </Txt>
                <Action
                  title={ar ? 'حاول مرة ثانية' : 'Try again'}
                  onPress={() => setRevision((v) => v + 1)}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <ActivityIndicator color={colors.brown} />
          ) : !error ? (
            <View style={[styles.card, { padding: 22, gap: 12 }]}>
              <Txt heading style={{ fontWeight: '700' }}>
                {ar ? 'لا توجد نتائج مطابقة.' : 'No matching recipes.'}
              </Txt>
              <Txt style={styles.muted}>
                {ar
                  ? 'جرّب كلمة أخرى أو قلّل شروط البحث. المعلومات غير المذكورة في المصدر لا تدخل ضمن النتائج المصفّاة.'
                  : 'Try another term or fewer filters. Recipes without the requested source information do not match that filter.'}
              </Txt>
              {hasSearch ? (
                <Action
                  title={ar ? 'مسح البحث والتصفية' : 'Clear search and filters'}
                  onPress={resetSearch}
                />
              ) : null}
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 8, gap: 12 }}>
            {error && rows.length > 0 ? (
              <View style={styles.card}>
                <Txt style={styles.error}>
                  {ar ? 'تعذّر تحميل الوصفات.' : 'Could not load recipes.'}
                </Txt>
                <Action
                  title={ar ? 'حاول مرة ثانية' : 'Try again'}
                  onPress={() => setRevision((v) => v + 1)}
                />
              </View>
            ) : null}
            {more ? (
              <Action
                title={
                  ar
                    ? busy
                      ? 'جارٍ التحميل…'
                      : 'المزيد من الوصفات'
                    : busy
                      ? 'Loading…'
                      : 'More recipes'
                }
                onPress={() => setPage((p) => p + 1)}
                disabled={busy || error}
                selected
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => open(item)}
            style={[
              styles.card,
              {
                width: cardWidth,
                borderRadius: 20,
                padding: 0,
                overflow: 'hidden',
                marginBottom: 0,
              },
            ]}
          >
            <View
              style={{
                height: isXBloomHub ? Math.min(200, cardWidth * 0.75) : 145,
              }}
            >
              <RecipeVisual recipe={item} />
              {item.discovery.servingStyle ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: ar ? 10 : undefined,
                    right: ar ? undefined : 10,
                    backgroundColor: colors.paper,
                    borderRadius: 99,
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                  }}
                >
                  <Txt style={{ fontSize: 11 }}>
                    {item.discovery.servingStyle === 'hot'
                      ? ar
                        ? 'ساخن'
                        : 'Hot'
                      : item.discovery.servingStyle === 'iced'
                        ? ar
                          ? 'مثلّج'
                          : 'Iced'
                        : ar
                          ? 'بارد'
                          : 'Cold'}
                  </Txt>
                </View>
              ) : null}
            </View>
            <View style={{ padding: width < 400 ? 10 : 15, gap: 10, flex: 1 }}>
              <View
                style={[
                  catalogStyles.cardTop,
                  ar && { flexDirection: 'row-reverse' },
                ]}
              >
                <Txt
                  style={{
                    fontSize: 11,
                    lineHeight: 17,
                    color: colors.teal,
                    fontWeight: '700',
                  }}
                >
                  {item.method === 'xbloom'
                    ? item.sourceBrew.model ||
                      item.xBloom?.deviceModel ||
                      'xBloom'
                    : methods[locale][item.method]}
                </Txt>
                <Txt
                  style={{ fontSize: 10, lineHeight: 17, color: colors.muted }}
                >
                  {[
                    'official_manufacturer',
                    'official_roaster',
                    'verified_barista',
                  ].includes(item.recipeType)
                    ? ar
                      ? 'رسمي'
                      : 'Official'
                    : ar
                      ? 'مجتمعي'
                      : 'Community'}
                </Txt>
              </View>
              <Txt
                numberOfLines={3}
                style={{
                  fontSize: width < 400 ? 14 : 17,
                  fontWeight: '700',
                  lineHeight: width < 400 ? 21 : 26,
                  minHeight: width < 400 ? 42 : 52,
                }}
              >
                {recipeTitle(item.title, ar)}
              </Txt>
              <View testID="recipe-card-facts" style={catalogStyles.facts}>
                {recipeQuickFacts(item, ar).map((fact) => (
                  <View key={fact.key} style={catalogStyles.fact}>
                    <View
                      style={[
                        catalogStyles.factLabel,
                        ar && { flexDirection: 'row-reverse' },
                      ]}
                    >
                      <Icon name={fact.icon} size={12} color={colors.muted} />
                      <Txt
                        style={{
                          fontSize: 10,
                          lineHeight: 16,
                          color: colors.muted,
                        }}
                      >
                        {fact.label}
                      </Txt>
                    </View>
                    <Txt
                      numberOfLines={2}
                      style={{
                        fontSize: width < 400 ? 12 : 14,
                        lineHeight: 21,
                        fontWeight: '700',
                        writingDirection: /^\d/.test(fact.value)
                          ? 'ltr'
                          : undefined,
                      }}
                    >
                      {fact.value}
                    </Txt>
                  </View>
                ))}
              </View>
              <Txt
                numberOfLines={1}
                style={[styles.muted, { fontSize: 11, lineHeight: 18 }]}
              >
                {item.discovery.creatorName ||
                  item.author ||
                  catalogName(item.sources[0]?.name, locale) ||
                  ''}
              </Txt>
              <FlavorNotes notes={item.discovery.flavorNotes} compact max={2} />
              <View
                style={[
                  catalogStyles.cardFooter,
                  ar && { flexDirection: 'row-reverse' },
                ]}
              >
                <Txt
                  style={{
                    fontSize: 11,
                    lineHeight: 18,
                    fontWeight: '700',
                    color: colors.teal,
                  }}
                >
                  {ar ? 'تفاصيل التحضير' : 'View brew settings'}
                </Txt>
                <Icon name="arrow" size={15} color={colors.teal} />
              </View>
            </View>
          </Pressable>
        )}
      />
      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: '#201A1570',
            alignItems: 'center',
            justifyContent: width >= 700 ? 'center' : 'flex-end',
            paddingTop: 30,
            paddingHorizontal: width >= 700 ? 24 : 0,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ar ? 'إغلاق التصفية' : 'Close filters'}
            onPress={() => setFiltersOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            testID="recipe-discovery-filters"
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '92%',
              backgroundColor: colors.paper,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderBottomLeftRadius: width >= 700 ? 26 : 0,
              borderBottomRightRadius: width >= 700 ? 26 : 0,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: ar ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Txt heading style={styles.subtitle}>
                  {ar ? 'ابحث على ذوقك' : 'Find your kind of coffee'}
                </Txt>
                <Action
                  title={ar ? 'إغلاق' : 'Close'}
                  onPress={() => setFiltersOpen(false)}
                />
              </View>
              <Txt style={styles.muted}>
                {ar
                  ? 'اختر ما يهمك. يمكنك الجمع بين أكثر من شرط.'
                  : 'Choose what matters to you. Combine any of these filters.'}
              </Txt>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, gap: 22 }}
            >
              <View style={{ gap: 10 }}>
                <Txt heading style={{ fontSize: 17, fontWeight: '700' }}>
                  {ar ? 'النكهة والتقديم' : 'Taste & serving'}
                </Txt>
                <View
                  style={{
                    flexDirection: ar ? 'row-reverse' : 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {FLAVORS.map((family) => (
                    <Pressable
                      key={family}
                      accessibilityRole="button"
                      accessibilityLabel={flavorLabels[family][ar ? 0 : 1]}
                      accessibilityState={{
                        selected: draftFilters.flavorFamily === family,
                      }}
                      onPress={() =>
                        setDraftFilters((value) => ({
                          ...value,
                          flavorFamily:
                            value.flavorFamily === family ? '' : family,
                        }))
                      }
                      style={{
                        flexDirection: ar ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor:
                          draftFilters.flavorFamily === family
                            ? colors.brown
                            : colors.line,
                        borderRadius: 16,
                        backgroundColor:
                          draftFilters.flavorFamily === family
                            ? colors.chip
                            : colors.paper,
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        minHeight: 44,
                      }}
                    >
                      <FlavorIcon note={family} size={22} />
                      <Txt
                        style={{
                          fontSize: 13,
                          fontWeight:
                            draftFilters.flavorFamily === family
                              ? '700'
                              : '400',
                        }}
                      >
                        {flavorLabels[family][ar ? 0 : 1]}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
                <Field
                  label={ar ? 'إيحاء محدد' : 'Specific tasting note'}
                  placeholder={
                    ar
                      ? 'مثل: ياسمين، خوخ، شوكولاتة'
                      : 'For example: jasmine, peach, chocolate'
                  }
                  value={draftFilters.flavorNote}
                  maxLength={160}
                  onChangeText={(flavorNote) =>
                    setDraftFilters((value) => ({ ...value, flavorNote }))
                  }
                />
                <View
                  style={{
                    flexDirection: ar ? 'row-reverse' : 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {(
                    [
                      ['', ar ? 'كل الأنواع' : 'Any serving'],
                      ['hot', ar ? 'ساخن' : 'Hot'],
                      ['iced', ar ? 'مثلّج' : 'Iced'],
                      ['cold', ar ? 'بارد' : 'Cold'],
                    ] as const
                  ).map(([id, title]) => (
                    <Action
                      key={id}
                      title={title}
                      selected={draftFilters.servingStyle === id}
                      onPress={() =>
                        setDraftFilters((value) => ({
                          ...value,
                          servingStyle: id,
                        }))
                      }
                    />
                  ))}
                </View>
              </View>
              {[
                {
                  title: ar ? 'الوصفة وصانعها' : 'Recipe & creator',
                  fields: [
                    ['recipeName', ar ? 'اسم الوصفة' : 'Recipe name'],
                    ['creatorName', ar ? 'اسم صانع الوصفة' : 'Recipe creator'],
                    [
                      'creatorCountry',
                      ar
                        ? 'بلد عمل صانع الوصفة'
                        : 'Creator’s operating country',
                    ],
                    [
                      'recipeCountry',
                      ar
                        ? 'المنشأ الجغرافي للوصفة'
                        : 'Recipe’s geographic origin',
                    ],
                    [
                      'sourceName',
                      ar ? 'الموقع أو المصدر' : 'Website or source',
                    ],
                  ],
                },
                {
                  title: ar ? 'البن والمحمصة' : 'Coffee & roaster',
                  fields: [
                    ['coffeeName', ar ? 'اسم البن' : 'Coffee name'],
                    [
                      'coffeeType',
                      ar ? 'نوع البن أو سلالته' : 'Coffee type or variety',
                    ],
                    [
                      'coffeeOrigin',
                      ar ? 'بلد زراعة البن' : 'Coffee growing origin',
                    ],
                    [
                      'roasterName',
                      ar ? 'الشركة أو المحمصة' : 'Company or roaster',
                    ],
                  ],
                },
              ].map((section) => (
                <View key={section.title} style={{ gap: 12 }}>
                  <Txt heading style={{ fontSize: 17, fontWeight: '700' }}>
                    {section.title}
                  </Txt>
                  <View
                    style={{
                      flexDirection: ar ? 'row-reverse' : 'row',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    {section.fields.map(([id, label]) => (
                      <View
                        key={id}
                        style={{ width: width >= 700 ? '48%' : '100%' }}
                      >
                        <Field
                          label={label}
                          value={
                            draftFilters[id as keyof RecipeDiscoveryFilters]
                          }
                          maxLength={160}
                          onChangeText={(value) =>
                            setDraftFilters((previous) => ({
                              ...previous,
                              [id]: value,
                            }))
                          }
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <Txt style={styles.muted}>
                {ar
                  ? 'بلد الصانع ومصدر الوصفة وبلد زراعة البن معلومات مستقلة؛ تُعرض فقط عندما يذكرها المصدر.'
                  : 'Creator country, recipe provenance and coffee growing origin are separate facts, used only when stated by a source.'}
              </Txt>
            </ScrollView>
            <View
              style={{
                padding: 20,
                paddingBottom: Platform.OS === 'ios' ? 32 : 20,
                borderTopWidth: 1,
                borderTopColor: colors.line,
                flexDirection: ar ? 'row-reverse' : 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Action
                title={ar ? 'تطبيق التصفية' : 'Apply filters'}
                selected
                onPress={() => {
                  Keyboard.dismiss();
                  invalidate();
                  setFilters({ ...draftFilters });
                  setFiltersOpen(false);
                }}
              />
              <Action
                title={ar ? 'إعادة ضبط' : 'Reset filters'}
                onPress={() => setDraftFilters(emptyRecipeFilters())}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
const catalogStyles = StyleSheet.create({
  count: {
    backgroundColor: '#E9F1ED',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    gap: 1,
  },
  filterGroup: { gap: 7 },
  filterLabel: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    fontWeight: '700',
  },
  chip: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  chipSelected: { backgroundColor: colors.teal, borderColor: colors.teal },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 9,
    rowGap: 7,
    columnGap: 5,
  },
  fact: { width: '47%', gap: 2 },
  factLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
});
