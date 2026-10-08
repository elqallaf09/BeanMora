import { useContext, useEffect, useMemo, useState } from "react";
import { AppState, Pressable, View, useWindowDimensions } from "./native";
import { publicSupabase } from "./client";
import {
  categoryLabel,
  equipmentKind,
  loadEquipment,
  type EquipmentItem,
} from "./catalog";
import { CatalogPhoto } from "./CatalogPhoto";
import { useReducedMotion } from "./Motion";
import { Action, Language, Txt, colors } from "./ui";

export function EquipmentRecommendations({
  open,
  browse,
}: {
  open: (item: EquipmentItem) => void;
  browse: () => void;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<EquipmentItem[]>([]);
  const [offset, setOffset] = useState(() => Math.floor(Date.now() / 18000));
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background",
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let active = true;
    if (publicSupabase)
      void loadEquipment(publicSupabase, locale)
        .then((items) => {
          if (active) setRows(items);
        })
        .catch(() => {
          if (active) setRows([]);
        });
    return () => {
      active = false;
    };
  }, [locale]);
  const pool = useMemo(() => {
    const groups = new Map<string, EquipmentItem[]>();
    for (const item of rows.filter((item) => item.imageUrl)) {
      const kind = equipmentKind(item);
      groups.set(kind, [...(groups.get(kind) ?? []), item]);
    }
    // Interleave categories to keep each set varied; only real catalog photos.
    const result: EquipmentItem[] = [];
    for (let i = 0; [...groups.values()].some((group) => group[i]); i++)
      for (const group of groups.values()) if (group[i]) result.push(group[i]);
    return result;
  }, [rows]);
  useEffect(() => {
    if (paused || focused || reduced || !foreground || pool.length <= 3) return;
    const timer = setInterval(() => setOffset((n) => n + 3), 18000);
    return () => clearInterval(timer);
  }, [paused, focused, reduced, foreground, pool.length]);
  const selected = pool.length
    ? Array.from(
        { length: Math.min(3, pool.length) },
        (_, i) => pool[(offset + i) % pool.length],
      )
    : [];
  return (
    <View testID="home-tools" style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: width >= 600 ? (ar ? "row-reverse" : "row") : "column",
          gap: 12,
        }}
      >
        {selected.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => open(item)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: 14,
              borderRadius: 20,
              backgroundColor: colors.chip,
              gap: 10,
              flexDirection:
                width >= 600 ? "column" : ar ? "row-reverse" : "row",
              alignItems: width >= 600 ? "stretch" : "center",
            }}
          >
            <View style={width >= 600 ? { width: "100%" } : { width: 90 }}>
              <CatalogPhoto
                uri={item.imageUrl}
                height={width >= 600 ? 130 : 86}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Txt numberOfLines={1} style={{ fontWeight: "700" }}>
                {item.name}
              </Txt>
              <Txt
                numberOfLines={1}
                style={{ color: colors.muted, fontSize: 12 }}
              >
                {[item.brand, categoryLabel(equipmentKind(item), locale)]
                  .filter(Boolean)
                  .join(" · ")}
              </Txt>
            </View>
          </Pressable>
        ))}
      </View>
      {pool.length > 3 ? (
        <View
          style={{
            flexDirection: ar ? "row-reverse" : "row",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <Action
            compact
            title={ar ? "أدوات أخرى" : "Other tools"}
            onPress={() => setOffset((n) => n + 3)}
          />
          {!reduced ? (
            <Action
              compact
              title={
                paused
                  ? ar
                    ? "تشغيل التبديل"
                    : "Resume rotation"
                  : ar
                    ? "إيقاف التبديل"
                    : "Pause rotation"
              }
              onPress={() => setPaused((value) => !value)}
            />
          ) : null}
        </View>
      ) : !pool.length ? (
        <Action
          title={ar ? "استكشف أدوات القهوة" : "Explore coffee equipment"}
          onPress={browse}
        />
      ) : null}
    </View>
  );
}
