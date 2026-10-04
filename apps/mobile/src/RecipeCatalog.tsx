import { useContext, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "./client";
import {
  mapRecipe,
  RECIPE_FIELDS,
  type RecipeItem,
  type RecipeRow,
} from "./data";
import { MethodPicker, coffeeStyles } from "./CoffeeScreens";
import { RecipeVisual } from './RecipeVisual';
import { MethodGuide } from './MethodGuide';
import { doseLabel, timeLabel } from './manualBrew';
import { Action, Field, Language, Txt, colors, styles } from "./ui";
import { methods } from "./copy";
import type { Method } from "./core/engine";
const PAGE = 30;
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
  const ar = locale === "ar";
  const { width } = useWindowDimensions();
  const [method, setMethod] = useState<Method | undefined>(initialMethod);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<RecipeItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState("all");
  const [model, setModel] = useState("all");
  useEffect(() => {
    if (search === debounced) return;
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 280);
    return () => clearTimeout(t);
  }, [search, debounced]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (page === 0) {
      setRows([]);
      setTotal(null);
    }
    if (!supabase) return;
    let query = supabase
      .from("recipes")
      .select(RECIPE_FIELDS, { count: "exact" })
      .eq("visibility", "public");
    if (method) query = query.eq("brew_method", method);
    // Strip PostgREST expression delimiters; user text never becomes filter syntax.
    const q = debounced
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .slice(0, 100);
    if (q)
      query = query.or(
        `title.ilike.%${q}%,title_ar.ilike.%${q}%,source_author_name.ilike.%${q}%,source_coffee_name.ilike.%${q}%`,
      );
    if (source === "official")
      query = query.in("recipe_type", [
        "official_manufacturer",
        "official_roaster",
        "verified_barista",
      ]);
    if (source === "community") query = query.eq("recipe_type", "community");
    if (method === "xbloom" && model !== "all")
      query = query.eq("source_brew_parameters->>model", model);
    void (async () => {
      try {
        const result = await query
          .order("updated_at", { ascending: false })
          .order("id")
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (!active) return;
        if (result.error) {
          setError(true);
          return;
        }
        const mapped = ((result.data ?? []) as RecipeRow[]).flatMap((r) => {
          const item = mapRecipe(r, locale);
          return item ? [item] : [];
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
            ? (page + 1) * PAGE < result.count
            : mapped.length === PAGE,
        );
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [locale, method, debounced, source, model, page, revision]);
  const columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 1120) - 36 - (columns - 1) * 12) / columns;
  return (
    <FlatList
      testID={initialMethod === "xbloom" ? "xbloom-scroll" : "recipe-catalog"}
      key={columns}
      numColumns={columns}
      data={rows}
      keyExtractor={(r) => r.id}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={[coffeeStyles.page, { gap: 12 }]}
      refreshing={busy && page === 0}
      onRefresh={() => {
        setPage(0);
        setRevision((v) => v + 1);
      }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 8 }}>
          {header}
          <Txt heading style={styles.title}>
            {initialMethod === "xbloom"
              ? ar
                ? "وصفات xBloom"
                : "xBloom recipes"
              : ar
                ? "مكتبة الوصفات"
                : "Recipe library"}
          </Txt>
          <Txt style={styles.muted}>
            {ar
              ? "ابحث في المكتبة كاملة، وافتح كل وصفة لتفاصيلها ومصدرها."
              : "Search the full library and open a recipe for its details and sources."}
            {total !== null ? ` · ${total}` : ""}
          </Txt>
          {!locked ? (
            <MethodPicker
              value={method}
              onChange={(v) => {
                setMethod(v);
                setPage(0);
              }}
            />
          ) : null}
          <MethodGuide key={method ?? 'all'} method={method}/>
          <Field
            label={ar ? "ابحث عن وصفة" : "Find a recipe"}
            value={search}
            onChangeText={setSearch}
            placeholder={
              ar
                ? "اسم الوصفة، البن، أو الناشر…"
                : "Recipe, coffee or publisher…"
            }
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["all", ar ? "كل المصادر" : "All sources"],
              ["official", ar ? "رسمي" : "Official"],
              ["community", ar ? "مجتمعي" : "Community"],
            ].map(([id, title]) => (
              <Action
                key={id}
                title={title}
                selected={source === id}
                onPress={() => {
                  setSource(id);
                  setPage(0);
                }}
              />
            ))}
          </View>
          {initialMethod === "xbloom" || method === "xbloom" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["all", "Studio", "Original"].map((id) => (
                <Action
                  key={id}
                  title={
                    id === "all" ? (ar ? "كل الموديلات" : "All models") : id
                  }
                  selected={model === id}
                  onPress={() => {
                    setModel(id);
                    setPage(0);
                  }}
                />
              ))}
            </View>
          ) : null}
          {error && rows.length === 0 ? (
            <View style={styles.card}>
              <Txt style={styles.error}>
                {ar ? "تعذّر تحميل الوصفات." : "Could not load recipes."}
              </Txt>
              <Action
                title={ar ? "حاول مرة ثانية" : "Try again"}
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
          <Txt style={styles.muted}>
            {ar ? "لا توجد نتائج مطابقة." : "No matching recipes."}
          </Txt>
        ) : null
      }
      ListFooterComponent={
        <View style={{ marginTop: 8, gap: 12 }}>
          {error && rows.length > 0 ? (
            <View style={styles.card}>
              <Txt style={styles.error}>
                {ar ? "تعذّر تحميل الوصفات." : "Could not load recipes."}
              </Txt>
              <Action
                title={ar ? "حاول مرة ثانية" : "Try again"}
                onPress={() => setRevision((v) => v + 1)}
              />
            </View>
          ) : null}
          {more ? (
            <Action
              title={
                ar
                  ? busy
                    ? "جارٍ التحميل…"
                    : "المزيد من الوصفات"
                  : busy
                    ? "Loading…"
                    : "More recipes"
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
              padding: 0,
              overflow: "hidden",
              marginBottom: 0,
            },
          ]}
        >
          <View style={{ height: 145 }}>
            <RecipeVisual recipe={item}/>
          </View>
          <View style={{ padding: 12, gap: 5 }}>
            <Txt style={[styles.muted, { fontSize: 11 }]}>
              {methods[locale][item.method]}
            </Txt>
            <Txt
              numberOfLines={3}
              style={{ fontSize: 15, fontWeight: "700", lineHeight: 23 }}
            >
              {item.title}
            </Txt>
            <Txt style={{ fontSize: 12 }}>
              {doseLabel(item)} · {item.water ? `${item.water} ${item.waterUnit}` : ar && item.method === 'moka_pot' ? 'أدنى صمام الأمان' : item.method === 'moka_pot' ? 'Below safety valve' : '—'}
            </Txt>
            <Txt style={styles.muted}>{timeLabel(item, ar) !== '—' ? timeLabel(item, ar) : ar && item.method === 'moka_pot' ? 'حسب التدفق' : item.method === 'moka_pot' ? 'Follow flow' : '—'}</Txt>
            <Txt numberOfLines={1} style={[styles.muted, { fontSize: 11 }]}>
              {item.author || item.sources[0]?.name || ""}
            </Txt>
          </View>
        </Pressable>
      )}
    />
  );
}
