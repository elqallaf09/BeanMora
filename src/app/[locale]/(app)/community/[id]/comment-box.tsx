"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";

export function CommentBox({ postId, isAuthenticated }: { postId: string; isAuthenticated: boolean }) {
  const t = useTranslations("community");
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setDialogOpen(true);
      return;
    }
    const body = value.trim();
    if (!body) return;
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        post_id: postId,
        body,
        content_language: locale,
      });
      if (!error) {
        setValue("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("writeComment")}
          className="h-10 flex-1 rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-4 text-sm outline-none focus-visible:border-[var(--color-teal)]"
        />
        <Button type="submit" size="icon" variant="accent" disabled={pending} aria-label={t("postComment")}>
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
      <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
