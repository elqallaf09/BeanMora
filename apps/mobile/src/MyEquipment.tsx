import { useContext, useEffect, useState } from "react";
import { ScrollView, View } from "./native";
import { supabase } from "./client";
import { loadEquipment, type EquipmentItem } from "./catalog";
import { archiveOwnedItem } from "./core/owned-inventory";
import { requireMember } from "./core/member-contributions";
import { Action, Language, Txt, styles } from "./ui";
import { CatalogPhoto } from "./CatalogPhoto";
import { ConfirmDialog } from "./ConfirmDialog";
type Row = {
  id: string;
  equipment_model_id: string | null;
  custom_name: string | null;
};
export function MyEquipment({
  userId,
  login,
  browse,
  initialItem,
}: {
  userId: string | null;
  login: () => void;
  browse: () => void;
  initialItem?: EquipmentItem | null;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [rows, setRows] = useState<Row[]>([]),
    [catalog, setCatalog] = useState<EquipmentItem[]>([]),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null),
    [removed, setRemoved] = useState<string | null>(null),
    [added, setAdded] = useState(false);
  useEffect(() => {
    let active = true;
    if (!userId || !supabase) return;
    setBusy(true);
    setError(false);
    void Promise.all([
      supabase
        .from("user_equipment")
        .select("id,equipment_model_id,custom_name")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      loadEquipment(supabase, locale),
    ])
      .then(([result, items]) => {
        if (result.error) throw result.error;
        if (active) {
          setRows(result.data ?? []);
          setCatalog(items);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [userId, locale, revision]);
  async function archive(id: string, remove: boolean) {
    if (!supabase || !userId || busy) return;
    setBusy(true);
    setError(false);
    try {
      await archiveOwnedItem(supabase, "user_equipment", id, userId, remove);
      setRemoved(remove ? id : null);
      setConfirm(null);
      setRevision((n) => n + 1);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    if (!supabase || !userId || !initialItem || busy) return;
    setBusy(true);
    setError(false);
    try {
      await requireMember(supabase, userId);
      const { error } = await supabase.from("user_equipment").insert({
        user_id: userId,
        equipment_model_id: initialItem.id,
        category: initialItem.category,
        is_default: false,
      });
      if (error) throw error;
      setAdded(true);
      setRevision((n) => n + 1);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!userId)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Txt>
          {ar
            ? "سجّل الدخول لإدارة معداتك."
            : "Sign in to manage your equipment."}
        </Txt>
        <Action
          selected
          title={ar ? "تسجيل الدخول" : "Sign in"}
          onPress={login}
        />
      </View>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, gap: 14 }}
    >
      <Txt heading style={styles.title}>
        {ar ? "معداتـي" : "My equipment"}
      </Txt>
      {initialItem &&
      !added &&
      !rows.some((r) => r.equipment_model_id === initialItem.id) ? (
        <Action
          variant="primary"
          title={(ar ? "إضافة: " : "Add: ") + initialItem.name}
          disabled={busy}
          onPress={() => void add()}
        />
      ) : null}
      <Action
        title={ar ? "إضافة معدة من الكتالوج" : "Add equipment from catalog"}
        variant="primary"
        onPress={browse}
      />
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {ar
            ? "تعذّر إتمام العملية. حاول مرة أخرى."
            : "Could not complete the action. Try again."}
        </Txt>
      ) : null}
      {removed ? (
        <View style={styles.card}>
          <Txt>
            {ar ? "تمت الإزالة من معداتك." : "Removed from your equipment."}
          </Txt>
          <Action
            title={ar ? "تراجع عن الحذف" : "Undo removal"}
            disabled={busy}
            onPress={() => void archive(removed, false)}
          />
        </View>
      ) : null}
      {!busy && !rows.length ? (
        <Txt>{ar ? "لم تضف معدات بعد." : "No equipment added yet."}</Txt>
      ) : null}
      {rows.map((row) => (
        <View key={row.id} style={[styles.card, { padding: 16, gap: 8 }]}>
          <View
            style={{ width: 110, alignSelf: ar ? "flex-end" : "flex-start" }}
          >
            <CatalogPhoto
              uri={
                catalog.find((c) => c.id === row.equipment_model_id)
                  ?.imageUrl ?? null
              }
              height={96}
              alt={
                catalog.find((c) => c.id === row.equipment_model_id)?.name ??
                row.custom_name ??
                undefined
              }
            />
          </View>
          <Txt heading>
            {catalog.find((c) => c.id === row.equipment_model_id)?.name ??
              row.custom_name ??
              (ar ? "معدة" : "Equipment")}
          </Txt>
          <Action title={ar ? "حذف من معداتي" : "Remove from my equipment"} disabled={busy} onPress={() => { setError(false); setConfirm(row.id); }} />
        </View>
      ))}
      <ConfirmDialog visible={Boolean(confirm)} title={ar ? 'حذف المعدة' : 'Remove equipment'} message={ar ? 'إزالة هذه المعدة من معداتك؟ سجل التحضير يبقى محفوظًا.' : 'Remove this equipment? Brew history will be preserved.'} confirmLabel={ar ? 'تأكيد الحذف' : 'Confirm removal'} busy={busy} error={error ? (ar ? 'تعذّر حذف المعدة. حاول مرة أخرى.' : 'Could not remove equipment. Try again.') : undefined} onCancel={() => setConfirm(null)} onConfirm={() => { if (confirm) void archive(confirm, true); }} />
    </ScrollView>
  );
}
