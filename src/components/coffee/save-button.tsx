"use client";
import { useRef, useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";
type SaveTable = "recipe_saves" | "bean_saves" | "roaster_saves" | "post_saves";
const ID_COLUMN: Record<SaveTable, string> = { recipe_saves: "recipe_id", bean_saves: "bean_id", roaster_saves: "roaster_id", post_saves: "post_id" };

// Session-owned guests may save personal items. Signed-out visitors upgrade first.
export function SaveButton({ table, itemId, initialSaved = false, isAuthenticated, size = "md", className }: {
  table: SaveTable; itemId: string; initialSaved?: boolean; isAuthenticated: boolean; size?: "sm" | "md" | "lg"; className?: string;
}) {
  const t = useTranslations("common"), [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState(false), [dialogOpen, setDialogOpen] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false), idColumn = ID_COLUMN[table];
  const sizeClass = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (lock.current) return;
    if (!isAuthenticated) { setDialogOpen(true); return; }
    lock.current = true; setBusy(true); setError(false);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!user) { setDialogOpen(true); return; }
      const next = !saved;
      if (next) {
        const values = {
          recipe_saves: { recipe_id: itemId, user_id: user.id }, bean_saves: { bean_id: itemId, user_id: user.id },
          roaster_saves: { roaster_id: itemId, user_id: user.id }, post_saves: { post_id: itemId, user_id: user.id },
        }[table];
        const result = await db.from(table).upsert(values, { onConflict: "user_id," + idColumn, ignoreDuplicates: true });
        if (result.error) throw result.error;
      } else {
        const result = await db.from(table).delete().eq(idColumn, itemId).eq("user_id", user.id);
        if (result.error) throw result.error;
      }
      const confirmed = await db.from(table).select("id").eq(idColumn, itemId).eq("user_id", user.id).maybeSingle();
      if (confirmed.error || Boolean(confirmed.data) !== next) throw new Error("SAVE_CONFIRMATION");
      setSaved(next);
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <button type="button" onClick={e => void toggle(e)} disabled={busy} aria-busy={busy} aria-pressed={saved} aria-label={t("save")}
      className={cn("flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-soft-white)]/90 text-[var(--color-espresso)] shadow-sm backdrop-blur transition-colors hover:bg-[var(--color-soft-white)] disabled:opacity-70", sizeClass, className)}>
      <Bookmark className={cn(iconSize, saved && "fill-[var(--color-caramel)] text-[var(--color-caramel)]")} aria-hidden />
    </button>
    {error ? <span role="alert" className="text-xs text-[var(--color-error)]">{t("saveError")}</span> : null}
    <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  </>;
}
