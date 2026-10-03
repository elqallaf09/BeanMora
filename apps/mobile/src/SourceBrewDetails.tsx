import { useContext } from "react";
import { Share, View } from "react-native";
import type { RecipeItem } from "./data";
import { Action, Language, Txt, styles } from "./ui";
import { sourceTemperature } from "./sourceBrew";
export function SourceBrewDetails({ recipe }: { recipe: RecipeItem }) {
  const ar = useContext(Language) === "ar";
  const source = recipe.sourceBrew;
  if (!source.pours?.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <Txt heading style={styles.subtitle}>
        {ar ? "إعدادات المصدر والصبات" : "Source settings and pours"}
      </Txt>
      <View style={styles.card}>
        {recipe.author ? (
          <Txt>
            {ar ? "ناشر الوصفة: " : "Published by: "}
            {recipe.author}
          </Txt>
        ) : null}
        {source.ratio ? (
          <Txt>
            {ar ? "نسبة البن إلى الماء: " : "Coffee-to-water ratio: "}1:
            {source.ratio}
          </Txt>
        ) : null}
        {source.grind_size != null ? (
          <Txt>
            {ar ? "إعداد الطحنة في المصدر: " : "Source grind setting: "}
            {source.grind_size}
          </Txt>
        ) : null}
        {source.rpm != null ? <Txt>RPM: {source.rpm}</Txt> : null}
        {source.cup_type ? (
          <Txt>
            {ar ? "وعاء التحضير: " : "Brewing vessel: "}
            {source.cup_type}
          </Txt>
        ) : null}
        {source.model ? (
          <Txt>
            {ar ? "الجهاز في المصدر: " : "Source machine: "}
            {source.model}
          </Txt>
        ) : null}
        {source.pour_sum_matches_stated_water === false ? (
          <Txt style={styles.warning}>
            {ar
              ? "ملخص الماء في المصدر يختلف عن مجموع الصبات. راجع الرابط قبل التحضير."
              : "The source water summary differs from the pour sum. Check the link before brewing."}
          </Txt>
        ) : null}
        <Txt style={styles.muted}>
          {ar
            ? "الماء منشور بالملليلتر. راجع موديل الجهاز ونمط حركة الصب في رابط المصدر."
            : "Water is published in milliliters. Check the machine model and pouring pattern in the source link."}
        </Txt>
      </View>
      {source.pours.map((p, i) => (
        <View key={i} style={styles.card}>
          <Txt heading style={styles.subtitle}>
            {ar ? "الصبة " : "Pour "}
            {i + 1}
          </Txt>
          <Txt>
            {ar ? "الماء: " : "Water: "}
            {p.volume ?? "—"} ml · {ar ? "الحرارة: " : "Temperature: "}
            {sourceTemperature(p.temperature, ar)}
          </Txt>
          <Txt>
            {ar ? "تدفق الماء: " : "Flow rate: "}
            {p.flow_rate ?? "—"} ml/s · {ar ? "التوقف: " : "Pause: "}
            {p.pause_seconds ?? "—"} s
          </Txt>
          <Txt style={styles.muted}>
            {ar ? "اهتزاز قبل الصبة: " : "Vibration before: "}
            {p.vibration_before === 1
              ? ar
                ? "مفعّل"
                : "On"
              : p.vibration_before === 2
                ? ar
                  ? "متوقف"
                  : "Off"
                : "—"}{" "}
            · {ar ? "بعد الصبة: " : "After: "}
            {p.vibration_after === 1
              ? ar
                ? "مفعّل"
                : "On"
              : p.vibration_after === 2
                ? ar
                  ? "متوقف"
                  : "Off"
                : "—"}
          </Txt>
        </View>
      ))}
      <Action
        title={ar ? "مشاركة إعدادات التحضير" : "Share brew settings"}
        onPress={() => {
          void Share.share({
            message: JSON.stringify(
              {
                title: recipe.title,
                source: recipe.sources[0]?.url,
                settings: source,
              },
              null,
              2,
            ),
          }).catch(() => {});
        }}
      />
    </View>
  );
}
