"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";

type SaveTable = "recipe_saves" | "bean_saves" | "roaster_saves" | "post_saves";

const ID_COLUMN: Record<SaveTable, string> = {
  recipe_saves: "recipe_id",
  bean_saves: "bean_id",
  roaster_saves: "roaster_id",
  post_saves: "post_id",
};

/**
 * Bookmark/heart toggle used on BeanCard, RoasterCard, and RecipeCard.
 * Works against whichever *_saves table matches the item (see save-button
 * table map above — bean_saves/roaster_saves added in migration 19,
 * recipe_saves already existed). Requires a signed-in session (permanent
 * or guest — both hold a real auth.uid()); a signed-out visitor sees the
 * button but is routed to the guest-upgrade dialog instead of erroring.
 */
export function SaveButton({
  table,
  itemId,
  initialSaved = false,
  isAuthenticated,
  size = "md",
  className,
}: {
  table: SaveTable;
  itemId: string;
  initialSaved?: boolean;
  isAuthenticated: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("common");
  const [saved, setSaved] = useState(initialSaved);
  const [pulse, setPulse] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const idColumn = ID_COLUMN[table];
  const sizeClass = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setDialogOpen(true);
      return;
    }

    const next = !saved;
    setSaved(next);
    if (next) {
      setPulse(true);
      setTimeout(() => setPulse(false), 400);
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaved(!next);
        return;
      }

      if (next) {
        const { error } = await supabase
          .from(table)
          .insert({ [idColumn]: itemId, user_id: user.id });
        if (error) setSaved(!next);
      } else {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(idColumn, itemId)
          .eq("user_id", user.id);
        if (error) setSaved(!next);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={t("save")}
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--color-soft-white)]/90 text-[var(--color-espresso)] shadow-sm backdrop-blur transition-colors hover:bg-[var(--color-soft-white)] disabled:opacity-70",
          sizeClass,
          className,
        )}
      >
        <Bookmark
          className={cn(
            iconSize,
            pulse && "animate-heart-pop",
            saved ? "fill-[var(--color-caramel)] text-[var(--color-caramel)]" : "",
          )}
          aria-hidden
        />
      </button>
      <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
