import { useContext, useEffect, useState } from "react";
import { View } from "./native";
import { supabase, publicSupabase } from "./client";
import { loadEquipment, type EquipmentItem } from "./catalog";
import type { CoffeeItem, RecipeItem } from "./data";
import {
  parseGrinderContext,
  type GrinderContext,
} from "./core/grinder-context";
import { Action, Language, Txt, styles } from "./ui";
import { Disclosure } from "./Disclosure";
import { SourceLink } from "./SourceLink";
import { methodLabel, modelLabel } from "./localizedContent";
type SettingRow = {
  id: string;
  grinder_context: unknown;
  grind_setting: string | null;
  dose_grams: number | null;
  water_grams: number | null;
  actual_time_seconds: number | null;
  created_at: string;
  outcome_submission: unknown;
  brew_method: string;
};
const roastLabel = (value: string | null, ar: boolean) =>
  value
    ? ({
        light: ["فاتح", "Light"],
        medium_light: ["متوسط فاتح", "Medium light"],
        medium: ["متوسط", "Medium"],
        medium_dark: ["متوسط داكن", "Medium dark"],
        dark: ["داكن", "Dark"],
      }[value]?.[ar ? 0 : 1] ?? value)
    : ar
      ? "الحمصة غير مسجلة"
      : "Roast not recorded";
export function GrinderSettings({
  coffee,
  recipes,
  userId,
}: {
  coffee: CoffeeItem;
  recipes: RecipeItem[];
  userId: string | null;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [rows, setRows] = useState<SettingRow[]>([]),
    [gear, setGear] = useState<EquipmentItem[]>([]),
    [failed, setFailed] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setRows([]);
    setFailed(false);
    if (publicSupabase)
      void loadEquipment(publicSupabase, locale)
        .then((r) => {
          if (active) setGear(r);
        })
        .catch(() => {});
    if (userId && supabase) {
      let q = supabase
        .from("brew_logs")
        .select(
          "id,grinder_context,grind_setting,dose_grams,water_grams,actual_time_seconds,created_at,outcome_submission,brew_method",
        )
        .eq("user_id", userId);
      q =
        coffee.kind === "product"
          ? q.eq("grinder_context->>roasted_product_id", coffee.id)
          : q.eq("bean_id", coffee.beanId ?? coffee.id);
      void Promise.resolve(
        q.order("created_at", { ascending: false }).limit(50),
      )
        .then(({ data, error }) => {
          if (active) {
            if (error) setFailed(true);
            else setRows((data ?? []) as SettingRow[]);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    }
    return () => {
      active = false;
    };
  }, [userId, coffee.id, coffee.kind, coffee.beanId, locale, revision]);
  const sourced = recipes
    .filter(
      (r) =>
        r.grindSetting &&
        r.sources.length &&
        [
          "official_manufacturer",
          "official_roaster",
          "verified_barista",
        ].includes(r.recipeType),
    )
    .slice(0, 8);
  const name = (id: string | null) => gear.find((g) => g.id === id)?.name;
  return (
    <Disclosure
      title={ar ? "درجات الطحن لهذا البن" : "Grind settings for this coffee"}
      subtitle={ar ? "حسب الطاحونة والحمصة" : "By grinder and roast"}
      testID="coffee-grinder-settings"
    >
      <Txt style={styles.muted}>
        {ar
          ? "الدرجة تخص موديل الطاحونة ومعايرة الصفر والحمصة والجرعة. نفس الرقم على طاحونتين يعطي نتائج مختلفة."
          : "A setting belongs to its grinder, zero calibration, roast and dose. The same number on two grinders can produce different results."}
      </Txt>
      <Txt heading>{ar ? "تجاربي المحفوظة" : "My saved trials"}</Txt>
      {rows.map((row) => {
        const context = parseGrinderContext(row.grinder_context);
        const outcome = (row.outcome_submission as { outcome?: string } | null)
          ?.outcome;
        return (
          <View key={row.id} style={[styles.card, { gap: 5 }]}>
            <Txt heading>
              {name(context?.grinder_model_id ?? null) ??
                (ar ? "طاحونة غير مسجلة" : "Grinder not recorded")}{" "}
              · {context?.grind_setting ?? row.grind_setting ?? "—"}
            </Txt>
            <Txt>
              {coffee.roaster} · {roastLabel(context?.roast_level ?? null, ar)}
            </Txt>
            <Txt style={styles.muted}>
              {[
                methodLabel(row.brew_method, locale),
                name(context?.brewer_model_id ?? null),
                context?.roast_date,
                context?.calibration,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Txt>
            <Txt>
              {[
                row.dose_grams
                  ? row.dose_grams + (ar ? " غ بن" : " g coffee")
                  : null,
                row.water_grams
                  ? row.water_grams + (ar ? " غ ماء" : " g water")
                  : null,
                row.actual_time_seconds
                  ? row.actual_time_seconds + (ar ? " ث" : " s")
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Txt>
            {outcome ? (
              <Txt style={styles.muted}>
                {(ar ? "تقييمك: " : "Your result: ") +
                  ({
                    excellent: ["ممتاز", "Excellent"],
                    good: ["جيد", "Good"],
                    needs_adjustment: ["يحتاج تعديل", "Needs adjustment"],
                    poor: ["غير موفق", "Poor"],
                  }[outcome]?.[ar ? 0 : 1] ?? outcome)}
              </Txt>
            ) : null}
          </View>
        );
      })}
      {!rows.length ? (
        <Txt style={styles.muted}>
          {ar
            ? "بعد التحضير، سجّل موديل الطاحونة ودرجتها والحمصة؛ تظهر المقارنة هنا."
            : "After brewing, record your grinder, setting and roast to compare trials here."}
        </Txt>
      ) : null}
      {failed ? (
        <Action
          title={ar ? "إعادة تحميل درجاتي" : "Reload my settings"}
          onPress={() => setRevision((n) => n + 1)}
        />
      ) : null}
      {sourced.length ? (
        <>
          <Txt heading>
            {ar ? "إعدادات الوصفات المنشورة" : "Published recipe settings"}
          </Txt>
          {sourced.map((r) => {
            const model =
              r.method === "xbloom"
                ? (r.xBloom?.deviceModel ?? r.sourceBrew.model)
                : name(
                    r.equipment.find((e) => e.category === "grinder")
                      ?.modelId ?? null,
                  );
            return (
              <View key={r.id} style={[styles.card, { gap: 6 }]}>
                <Txt heading>
                  {model
                    ? r.method === "xbloom"
                      ? "xBloom " + modelLabel(model, locale)
                      : model
                    : ar
                      ? "الموديل غير مذكور بالمصدر"
                      : "Model unspecified by source"}{" "}
                  · {r.grindSetting}
                </Txt>
                <Txt>{r.title}</Txt>
                <Txt style={styles.muted}>
                  {ar
                    ? "إعداد منشور لهذه الوصفة؛ يحتاج ضبطًا لنفس الحمصة والجرعة والمعايرة."
                    : "Published for this recipe; dial in for the same roast, dose and calibration."}
                </Txt>
                <SourceLink
                  compact
                  url={r.sources[0].url}
                  title={ar ? "مصدر الإعداد" : "Setting source"}
                />
              </View>
            );
          })}
        </>
      ) : null}
    </Disclosure>
  );
}
