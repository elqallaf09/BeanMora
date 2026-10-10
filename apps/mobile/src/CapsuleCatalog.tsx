import { contentLocale } from "./localeText";
import { useContext, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "./native";
import { capsuleProducts, capsuleSystems } from "./core/capsules";
import { matchesDeepSearch } from "./core/deepSearch";
import { SelectionMenu } from "./SelectionMenu";
import { Disclosure } from "./Disclosure";
import { CatalogPhoto } from "./CatalogPhoto";
import { SourceLink } from "./SourceLink";
import { Action, Field, Language, Txt, colors, styles } from "./ui";

export function CapsuleCatalog() {
  const locale = useContext(Language),
    ar = locale === "ar",
    language = contentLocale(locale);
  const { width } = useWindowDimensions();
  const [system, setSystem] = useState("all"),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12);
  const selected = capsuleSystems.find((c) => c.id === system);
  const columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 960) - 32 - (columns - 1) * 10) / columns;
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
      testID="capsule-catalog"
      keyboardShouldPersistTaps="handled"
      style={{ width: "100%", maxWidth: 960, alignSelf: "center" }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }}
    >
      <View style={{ gap: 10, marginBottom: 4 }}>
        <Txt heading style={styles.subtitle}>
          {ar ? "الكبسولات" : "Capsules"}
        </Txt>
        <SelectionMenu
          label={ar ? "نظام الماكينة" : "Machine system"}
          value={system}
          items={[
            { id: "all", name: ar ? "كل الأنظمة" : "All systems" },
            ...capsuleSystems.map((c) => ({
              id: c.id,
              name: c.name[language],
            })),
          ]}
          onChange={(value) => {
            setSystem(value);
            setLimit(12);
          }}
        />
        <Field
          label={ar ? "بحث الكبسولات" : "Search capsules"}
          placeholder={ar ? "اسم الكبسولة أو النظام" : "Capsule or system name"}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setLimit(12);
          }}
        />
        <Disclosure
          title={ar ? "توافق الأنظمة" : "System compatibility"}
          testID="capsule-compatibility"
        >
          {(selected ? [selected] : capsuleSystems).map((c) => (
            <View key={c.id} style={{ gap: 6 }}>
              <Txt heading>{c.name[language]}</Txt>
              <Txt>{c.description[language]}</Txt>
              <SourceLink
                compact
                url={c.source}
                title={ar ? "مصدر التوافق" : "Compatibility source"}
              />
            </View>
          ))}
        </Disclosure>
        <Txt style={styles.muted}>
          {rows.length} {ar ? "صنف" : "products"}
        </Txt>
      </View>
      <View
        style={{
          flexDirection: ar ? "row-reverse" : "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {rows.slice(0, limit).map((p) => (
          <View
            key={p.id}
            testID="capsule-product-card"
            style={[
              styles.card,
              {
                width: cardWidth,
                minWidth: 0,
                padding: 10,
                borderRadius: 16,
                gap: 6,
                marginBottom: 0,
              },
            ]}
          >
            {p.image ? (
              <CatalogPhoto
                uri={p.image}
                alt={p.name[language]}
                height={84}
                icon="bean"
              />
            ) : null}
            <Txt
              heading
              numberOfLines={2}
              style={{ fontSize: 14, lineHeight: 20, fontWeight: "700" }}
            >
              {p.name[language]}
            </Txt>
            <Txt
              numberOfLines={1}
              style={{ fontSize: 11, lineHeight: 16, color: colors.teal }}
            >
              {capsuleSystems.find((c) => c.id === p.system)?.name[language]}
            </Txt>
            {p.detail ? (
              <Txt
                numberOfLines={2}
                style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}
              >
                {p.detail[language]}
              </Txt>
            ) : null}
            <View style={{ flex: 1 }} />
            <SourceLink
              compact
              url={p.source}
              title={ar ? "التفاصيل والطلب" : "Details & shop"}
            />
          </View>
        ))}
      </View>
      {!rows.length ? (
        <Txt style={styles.muted}>
          {ar
            ? "لا توجد نتائج؛ جرّب اسم الكبسولة أو النظام."
            : "No results; try the capsule or system name."}
        </Txt>
      ) : null}
      <View style={{ gap: 10, marginTop: 4 }}>
        {rows.length > limit ? (
          <Action
            compact
            title={ar ? "عرض أصناف أكثر" : "Show more products"}
            onPress={() => setLimit((n) => n + 12)}
          />
        ) : null}
        {selected ? (
          <SourceLink
            compact
            url={selected.shop}
            title={ar ? "الأنواع وموقع الطلب" : "Capsules and order site"}
          />
        ) : null}
        <Txt style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}>
          {ar
            ? "تحقق من التوافق والتوصيل والسعر لدى المتجر."
            : "Check compatibility, delivery and price with the store."}
        </Txt>
      </View>
    </ScrollView>
  );
}
