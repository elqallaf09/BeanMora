"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { archiveOwnedItem } from "@/lib/owned-inventory";
import { requireMember } from "@/lib/member-contributions";
import { Button } from "@/components/ui/button";
export function RemoveOwnedButton({
  id,
  table,
}: {
  id: string;
  table: "user_bean_inventory" | "user_equipment";
}) {
  const ar = useLocale() === "ar",
    router = useRouter();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  async function remove() {
    setBusy(true);
    setError(false);
    try {
      const db = createClient();
      const owner = await requireMember(db);
      await archiveOwnedItem(db, table, id, owner, true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {ar ? "تعذّر الحذف. حاول مرة أخرى." : "Could not remove. Try again."}
        </p>
      ) : null}
      {confirm ? (
        <>
          <p className="text-sm">
            {ar
              ? "إزالة من مخزونك؟ سجل التحضير يبقى محفوظًا."
              : "Remove from your inventory? Brew history will be preserved."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} size="sm" onClick={() => void remove()}>
              {ar ? "تأكيد الحذف" : "Confirm removal"}
            </Button>
            <Button
              disabled={busy}
              size="sm"
              variant="ghost"
              onClick={() => setConfirm(false)}
            >
              {ar ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          {table === "user_equipment"
            ? ar
              ? "حذف من معداتي"
              : "Remove from my equipment"
            : ar
              ? "حذف من أكياسي"
              : "Remove from my bags"}
        </Button>
      )}
    </div>
  );
}
