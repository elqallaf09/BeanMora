import { useContext, useEffect, useState } from "react";
import { ScrollView, View } from "./native";
import { supabase } from "./client";
import {
  mapRecipe,
  RECIPE_FIELDS,
  type RecipeItem,
  type RecipeRow,
} from "./data";
import { Action, Language, Txt, styles } from "./ui";
export function MemberRecipes({
  userId,
  login,
  open,
  create,
}: {
  userId: string | null;
  login: () => void;
  open: (r: RecipeItem) => void;
  create: () => void;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [rows, setRows] = useState<RecipeItem[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!supabase || !userId) return;
    setBusy(true);
    setError(false);
    void (async () => {
      try {
        const { data, error } = await supabase!
          .from("recipes")
          .select(RECIPE_FIELDS)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (active)
          setRows(
            ((data ?? []) as unknown as RecipeRow[])
              .map((r) => mapRecipe(r, locale))
              .filter((r): r is RecipeItem => r !== null),
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
  }, [userId, locale, revision]);
  if (!userId)
    return (
      <View style={{ padding: 24, gap: 12 }}>
        <Txt>
          {ar
            ? "سجّل الدخول لعرض الوصفات التي أضفتها."
            : "Sign in to see recipes you added."}
        </Txt>
        <Action
          selected
          title={ar ? "تسجيل الدخول" : "Sign in"}
          onPress={login}
        />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
      <Txt heading style={styles.title}>
        {ar ? "وصفاتي المضافة" : "My submitted recipes"}
      </Txt>
      <Action
        title={ar ? "إضافة وصفة" : "Add recipe"}
        variant="primary"
        onPress={create}
      />
      {busy ? <Txt>{ar ? "جارٍ التحميل…" : "Loading…"}</Txt> : null}
      {error ? (
        <Action
          title={ar ? "تعذّر التحميل — أعد المحاولة" : "Could not load — retry"}
          onPress={() => setRevision((n) => n + 1)}
        />
      ) : null}
      {rows.map((r) => (
        <View key={r.id} style={[styles.card, { padding: 16, gap: 8 }]}>
          <Txt style={styles.muted}>
            {r.public
              ? ar
                ? "منشورة للمجتمع"
                : "Public community recipe"
              : ar
                ? "خاصة"
                : "Private"}
          </Txt>
          <Action title={r.title} onPress={() => open(r)} />
        </View>
      ))}
      {!busy && !error && !rows.length ? (
        <Txt>{ar ? "لم تضف وصفة بعد." : "No submitted recipes yet."}</Txt>
      ) : null}
    </ScrollView>
  );
}
