import { useLabels } from './ui';
import { contentLocale } from './localeText';
import { useContext, useEffect, useState } from "react";
import { View } from "./native";
import { loadEquipment, type EquipmentItem } from "./catalog";
import { publicSupabase } from "./client";
import { SelectionMenu } from "./SelectionMenu";
import { SourceLink } from "./SourceLink";
import { Field, Language, Txt, styles } from "./ui";
import {
  grinderStart,
  roastLevels,
  type GrinderContext,
} from "./core/grinder-context";
export function GrinderPicker({
  value,
  change,
  method,
  disabled = false,
}: {
  value: GrinderContext;
  change: (value: GrinderContext) => void;
  method: string;
  disabled?: boolean;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language),
    ar = locale === "ar";
  const [gear, setGear] = useState<EquipmentItem[]>([]),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    if (publicSupabase)
      void loadEquipment(publicSupabase, locale)
        .then((rows) => {
          if (active) setGear(rows);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [locale]);
  const update = (key: keyof GrinderContext, v: string) =>
    change({ ...value, [key]: v || null });
  const chosen = gear.find((g) => g.id === value.grinder_model_id);
  const brewer = gear.find((g) => g.id === value.brewer_model_id);
  const start = chosen
    ? grinderStart(
        chosen.originalName ?? chosen.name,
        method,
        brewer?.originalName ?? "",
      )
    : null;
  const roastNames = ar
    ? ["فاتح", "متوسط فاتح", "متوسط", "متوسط داكن", "داكن"]
    : [i18nUi("فاتح", "Light"), i18nUi("متوسط فاتح", "Medium light"), i18nUi("متوسط", "Medium"), i18nUi("متوسط داكن", "Medium dark"), i18nUi("داكن", "Dark")];
  const none = { id: "", name: ar ? "غير محدد" : i18nUi("غير محدد", "Not specified") };
  return (
    <View testID="grinder-setup" style={{ gap: 12 }}>
      <SelectionMenu
        label={ar ? "موديل الطاحونة" : i18nUi("موديل الطاحونة", "Grinder model")}
        value={value.grinder_model_id ?? ""}
        items={[
          none,
          ...gear
            .filter((g) => ["grinder", "xbloom"].includes(g.category))
            .map((g) => ({ id: g.id, name: g.name })),
        ]}
        onChange={(v) => update("grinder_model_id", v)}
        disabled={disabled}
      />
      <SelectionMenu
        label={ar ? "جهاز التحضير" : i18nUi("جهاز التحضير", "Brewing device")}
        value={value.brewer_model_id ?? ""}
        items={[
          none,
          ...gear
            .filter(
              (g) =>
                ![
                  "grinder",
                  "scale",
                  "filter",
                  "distribution_tool",
                  "portafilter_basket",
                ].includes(g.category),
            )
            .map((g) => ({ id: g.id, name: g.name })),
        ]}
        onChange={(v) => update("brewer_model_id", v)}
        disabled={disabled}
      />
      <SelectionMenu
        label={ar ? "درجة تحميص البن" : i18nUi("درجة تحميص البن", "Coffee roast level")}
        value={value.roast_level ?? ""}
        items={[
          none,
          ...roastLevels.map((id, i) => ({ id, name: roastNames[i] })),
        ]}
        onChange={(v) => update("roast_level", v)}
        disabled={disabled}
      />
      <Field
        label={
          ar
            ? "تاريخ التحميص YYYY-MM-DD (اختياري)"
            : i18nUi("تاريخ التحميص YYYY-MM-DD (اختياري)", "Roast date YYYY-MM-DD (optional)")
        }
        value={value.roast_date ?? ""}
        onChangeText={(v) => update("roast_date", v)}
        editable={!disabled}
        maxLength={10}
      />
      <Field
        label={
          ar
            ? "معايرة الصفر ونوع الشفرات (اختياري)"
            : i18nUi("معايرة الصفر ونوع الشفرات (اختياري)", "Zero calibration and burrs (optional)")
        }
        value={value.calibration ?? ""}
        onChangeText={(v) => update("calibration", v)}
        editable={!disabled}
        maxLength={100}
      />
      {start ? (
        <View style={[styles.card, { gap: 6 }]}>
          <Txt heading>
            {ar ? "بداية المصنع: " : i18nUi("بداية المصنع: ", "Manufacturer start: ")}
            {start.setting}
          </Txt>
          <Txt style={styles.muted}>{start.note[contentLocale(locale)]}</Txt>
          <SourceLink
            compact
            title={ar ? "مصدر درجات الطحن" : i18nUi("مصدر درجات الطحن", "Grind setting source")}
            url={start.source}
          />
        </View>
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? "كل درجة تُحفظ مع موديلها والبن والحمصة. لا نحول أرقام طاحونة إلى أخرى."
            : i18nUi("كل درجة تُحفظ مع موديلها والبن والحمصة. لا نحول أرقام طاحونة إلى أخرى.", "Each setting stays linked to its grinder, coffee and roast. Settings are not converted between grinders.")}
        </Txt>
      )}
      {failed ? (
        <Txt style={styles.warning}>
          {ar
            ? "تعذّر تحميل الموديلات. يمكن حفظ التجربة بدون اختيار جهاز."
            : i18nUi("تعذّر تحميل الموديلات. يمكن حفظ التجربة بدون اختيار جهاز.", "Models could not load. You can save your brew without choosing a device.")}
        </Txt>
      ) : null}
    </View>
  );
}
