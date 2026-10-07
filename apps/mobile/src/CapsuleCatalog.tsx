import { useContext, useState } from "react";
import { ScrollView, View } from "react-native";
import { capsuleSystems } from "./core/capsules";
import { SourceLink } from "./SourceLink";
import { Action, Field, Language, Txt, styles } from "./ui";
export function CapsuleCatalog() {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [system, setSystem] = useState("all"),
    [query, setQuery] = useState("");
  const rows = capsuleSystems.filter(
    (c) =>
      (system === "all" || c.id === system) &&
      [c.name.ar, c.name.en, c.examples.ar, c.examples.en]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 36 }}
    >
      <Txt heading style={styles.title}>
        {ar ? "الكبسولات" : "Capsules"}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? "اختر نظام ماكينتك، ثم تصفح الأنواع ومواقع الطلب."
          : "Choose your machine system, then explore capsules and order sites."}
      </Txt>
      <Field
        label={ar ? "بحث الكبسولات" : "Search capsules"}
        placeholder={
          ar ? "اسم النظام أو نوع الكبسولة" : "System or capsule name"
        }
        value={query}
        onChangeText={setQuery}
      />
      <View
        style={{
          flexDirection: ar ? "row-reverse" : "row",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <Action
          compact
          selected={system === "all"}
          title={ar ? "الكل" : "All"}
          onPress={() => setSystem("all")}
        />
        {capsuleSystems.map((c) => (
          <Action
            key={c.id}
            compact
            selected={system === c.id}
            title={c.name[locale]}
            onPress={() => setSystem(c.id)}
          />
        ))}
      </View>
      {rows.map((c) => (
        <View key={c.id} style={[styles.card, { padding: 16, gap: 10 }]}>
          <Txt heading style={styles.subtitle}>
            {c.name[locale]}
          </Txt>
          <Txt>{c.description[locale]}</Txt>
          <Txt>{(ar ? "أمثلة: " : "Examples: ") + c.examples[locale]}</Txt>
          <Txt style={styles.muted}>{c.region[locale]}</Txt>
          <SourceLink
            url={c.shop}
            title={ar ? "الأنواع وموقع الطلب" : "Capsules and order site"}
          />
          <SourceLink
            url={c.source}
            title={ar ? "مصدر معلومات التوافق" : "Compatibility source"}
          />
        </View>
      ))}
      {!rows.length ? (
        <Txt>
          {ar
            ? "لا توجد نتائج؛ جرّب اسم النظام."
            : "No results; try the system name."}
        </Txt>
      ) : null}
      <Txt style={styles.muted}>
        {ar
          ? "تمت مراجعة المصادر في ٧ أكتوبر ٢٠٢٦. السعر والمخزون والتوصيل بحسب المتجر عند الطلب."
          : "Sources reviewed 7 October 2026. Price, stock and delivery depend on the store at ordering."}
      </Txt>
    </ScrollView>
  );
}
