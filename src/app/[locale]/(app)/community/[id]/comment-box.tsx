"use client";

import { useRef, useState } from "react";
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
  const [error, setError] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<{ owner: string; body: string; id: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!isAuthenticated) {
      setDialogOpen(true);
      return;
    }
    const body = value.trim();
    if (!body) return;
    lock.current = true; setPending(true); setError(false);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user || user.is_anonymous) { setDialogOpen(true); return; }
      if (!attempt.current || attempt.current.owner !== user.id || attempt.current.body !== body) attempt.current = { owner: user.id, body, id: crypto.randomUUID() };
      const id = attempt.current.id;
      const written = await supabase.from("comments").upsert({
        id, user_id: user.id, post_id: postId, body, content_language: locale,
      }, { onConflict: "id", ignoreDuplicates: true });
      if (written.error) throw written.error;
      const confirmed = await supabase.from("comments").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (confirmed.error || confirmed.data?.id !== id) throw new Error("COMMENT_CONFIRMATION");
      setValue(""); attempt.current = null; router.refresh();
    } catch { setError(true); }
    finally {
      lock.current = false; setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          disabled={pending}
          aria-label={t("writeComment")}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("writeComment")}
          className="h-10 flex-1 rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-4 text-sm outline-none focus-visible:border-[var(--color-teal)]"
        />
        <Button type="submit" size="icon" variant="accent" disabled={pending || !value.trim()} aria-label={t("postComment")}>
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
      {error ? <p role="alert" className="text-xs text-[var(--color-error)]">{t("commentError")}</p> : null}
      <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
