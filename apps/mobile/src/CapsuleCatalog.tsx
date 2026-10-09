import { useContext, useState } from "react";
import { ScrollView, View } from "./native";
import { capsuleProducts, capsuleSystems } from "./core/capsules";
import { matchesDeepSearch } from "./core/deepSearch";
import { SelectionMenu } from "./SelectionMenu";
import { Disclosure } from "./Disclosure";
import { CatalogPhoto } from "./CatalogPhoto";
import { SourceLink } from "./SourceLink";
import { Action, Field, Language, Txt, styles } from "./ui";
export function CapsuleCatalog() {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [system, setSystem] = useState("all"),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12);
  const selected = capsuleSystems.find((c) => c.id === system);
  const rows = capsuleProducts.filter(
    (p) =>
      (system === "all" || p.system === system) &&
      matchesDeepSearch(
        [
          p.name.ar,
          p.name.en,
          capsuleSystems.find((c) => c.id === p.system)?.name.ar,
          capsuleSystems.find((c) => c.id === p.system)?.name.en,
          p.detail?.ar,
          p.detail?.en,
        ]
          .filter(Boolean)
          .join(" "),
        query,
      ),
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 36 }}
      testID="capsule-catalog"
    >
      <Txt heading style={styles.title}>
        {ar ? "الكبسولات" : "Capsules"}
      </Txt>
      <SelectionMenu
        label={ar ? "نظام الماكينة" : "Machine system"}
        value={system}
        items={[
          { id: "all", name: ar ? "كل الأنظمة" : "All systems" },
          ...capsuleSystems.map((c) => ({ id: c.id, name: c.name[locale] })),
        ]}
        onChange={(v) => {
          setSystem(v);
          setLimit(12);
        }}
      />
      <Field
        label={ar ? "بحث الكبسولات" : "Search capsules"}
        placeholder={
          ar
            ? "اسم الكبسولة بالعربي أو الإنجليزي"
            : "Capsule name in Arabic or English"
        }
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setLimit(12);
        }}
      />
      {selected ? (
        <View style={[styles.card, { gap: 8 }]}>
          <Txt heading style={styles.subtitle}>
            {selected.name[locale]}
          </Txt>
          <Txt>{selected.description[locale]}</Txt>
          <SourceLink
            url={selected.source}
            title={ar ? "مصدر معلومات التوافق" : "Compatibility source"}
          />
        </View>
      ) : (
        <Disclosure title={ar ? "توافق الأنظمة" : "System compatibility"}>
          {capsuleSystems.map((c) => (
            <View key={c.id} style={{ gap: 6 }}>
              <Txt heading>{c.name[locale]}</Txt>
              <Txt>{c.description[locale]}</Txt>
              <SourceLink
                compact
                url={c.source}
                title={ar ? "مصدر التوافق" : "Compatibility source"}
              />
            </View>
          ))}
        </Disclosure>
      )}
      <Txt style={styles.muted}>
        {rows.length} {ar ? "صنف" : "products"}
      </Txt>
      {rows.slice(0, limit).map((p) => (
        <View key={p.id} style={[styles.card, { gap: 8 }]}>
          {p.image ? (
            <CatalogPhoto
              uri={p.image}
              alt={p.name[locale]}
              height={140}
              icon="bean"
            />
          ) : null}
          <Txt heading>{p.name[locale]}</Txt>
          {ar ? <Txt style={styles.muted}>{p.name.en}</Txt> : null}
          <Txt style={styles.muted}>
            {capsuleSystems.find((c) => c.id === p.system)?.name[locale]}
          </Txt>
          {p.detail ? <Txt>{p.detail[locale]}</Txt> : null}
          <SourceLink
            url={p.source}
            title={ar ? "تفاصيل لدى المصنع" : "Manufacturer details"}
          />
        </View>
      ))}
      {rows.length > limit ? (
        <Action
          title={ar ? "عرض أصناف أكثر" : "Show more products"}
          onPress={() => setLimit((n) => n + 12)}
        />
      ) : null}
      {!rows.length ? (
        <Txt>
          {selected
            ? ar
              ? "تصفح مجموعة هذا النظام لدى المصنع."
              : "Browse this system’s collection at the manufacturer."
            : ar
              ? "لا توجد نتائج؛ جرّب اسم الكبسولة أو النظام."
              : "No results; try the capsule or system name."}
        </Txt>
      ) : null}
      {selected ? (
        <SourceLink
          url={selected.shop}
          title={ar ? "الأنواع وموقع الطلب" : "Capsules and order site"}
        />
      ) : null}
      <Txt style={styles.muted}>
        {ar
          ? "المصادر مراجعة في ٩ أكتوبر ٢٠٢٦. تحقق من التوافق والتوصيل والسعر لدى المتجر."
          : "Sources reviewed 9 October 2026. Check compatibility, delivery and price with the store."}
      </Txt>
    </ScrollView>
  );
}
