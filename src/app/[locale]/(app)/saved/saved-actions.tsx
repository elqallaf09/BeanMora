"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RemoveSavedButton({
  table,
  idColumn,
  itemId,
}: {
  table: "recipe_saves" | "bean_saves" | "roaster_saves";
  idColumn: string;
  itemId: string;
}) {
  const t = useTranslations("saved");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from(table).delete().eq(idColumn, itemId).eq("user_id", user.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      aria-label={t("remove")}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-soft-white)]/90 text-[var(--color-error)] shadow-sm hover:bg-[var(--color-soft-white)]"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function CreateCollectionButton() {
  const t = useTranslations("saved");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("recipe_collections").insert({ user_id: user.id, name: trimmed });
      setName("");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />
        {t("createCollection")}
      </Button>
    );
  }

  return (
    <form onSubmit={handleCreate} className="flex gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("collectionNamePlaceholder")}
        className="h-9 flex-1"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {t("create")}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
    </form>
  );
}

export function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const t = useTranslations("saved");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.from("recipe_collections").delete().eq("id", collectionId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label={t("removeCollection")}
      className="rounded-full p-1.5 text-[var(--color-muted-text)] hover:bg-[var(--color-cream)] hover:text-[var(--color-error)]"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
