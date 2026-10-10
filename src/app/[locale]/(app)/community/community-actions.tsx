"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Heart, MoreHorizontal, Share2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";
import { cn } from "@/lib/utils";
import { changeMemberFollow } from "@/lib/member-social";

export function PostLikeButton({ postId, initialLiked, initialCount, isAuthenticated }: {
  postId: string; initialLiked: boolean; initialCount: number; isAuthenticated: boolean;
}) {
  const t = useTranslations("community");
  const [liked, setLiked] = useState(initialLiked), [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [dialogOpen, setDialogOpen] = useState(false);
  const lock = useRef(false);
  async function toggle() {
    if (lock.current) return;
    if (!isAuthenticated) { setDialogOpen(true); return; }
    lock.current = true; setBusy(true); setError(false);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!user || user.is_anonymous) { setDialogOpen(true); return; }
      const next = !liked;
      const result = next
        ? await db.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
        : await db.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      if (result.error) throw result.error;
      const confirmed = await db.from("post_likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
      if (confirmed.error || Boolean(confirmed.data) !== next) throw new Error("LIKE_CONFIRMATION");
      setLiked(next); setCount(c => Math.max(0, c + (next ? 1 : -1)));
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <span className="inline-flex flex-col gap-1">
    <button type="button" onClick={() => void toggle()} disabled={busy} aria-busy={busy} aria-pressed={liked} className="inline-flex min-h-11 items-center gap-1 text-xs text-[var(--color-muted-text)] disabled:opacity-60">
      <Heart className={cn("h-4 w-4", liked && "fill-[var(--color-error)] text-[var(--color-error)]")} aria-hidden />
      {count}<span className="sr-only">{t("like")}</span>
    </button>
    {error ? <span role="alert" className="text-xs text-[var(--color-error)]">{t("likeError")}</span> : null}
    <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} returnTo={"/community/" + postId} />
  </span>;
}

export function FollowButton({ targetUserId, initialFollowing, isAuthenticated }: {
  targetUserId: string; initialFollowing: boolean; isAuthenticated: boolean;
}) {
  const t = useTranslations("community"), ar = useLocale() === "ar";
  const [state, setState] = useState<"pending" | "accepted" | null>(initialFollowing ? "accepted" : null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [dialogOpen, setDialogOpen] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    const db = createClient();
    void (async () => {
      const { data, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!data.user || data.user.is_anonymous) return;
      const { data: row, error: readError } = await db.from("follows").select("status").eq("follower_id", data.user.id).eq("following_id", targetUserId).maybeSingle();
      if (readError) throw readError;
      if (active) setState(row?.status === "accepted" || row?.status === "pending" ? row.status : null);
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [targetUserId]);
  async function toggle() {
    if (lock.current) return;
    if (!isAuthenticated) { setDialogOpen(true); return; }
    lock.current = true; setBusy(true); setError(false);
    try {
      const db = createClient();
      const { data, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!data.user || data.user.is_anonymous) { setDialogOpen(true); return; }
      setState(await changeMemberFollow(db, data.user.id, targetUserId, state));
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <span className="inline-flex flex-col gap-1">
    <button type="button" disabled={busy} onClick={() => void toggle()} aria-pressed={state === "accepted"} className="min-h-11 rounded-full px-3 text-xs font-semibold text-[var(--color-teal-dark)]">{state === "pending" ? (ar ? "إلغاء طلب المتابعة" : "Cancel follow request") : state === "accepted" ? t("following") : t("follow")}</button>
    {error ? <span role="alert" className="text-xs text-[var(--color-error)]">{t("followError")}</span> : null}
    <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  </span>;
}

export function PostMoreMenu({ postId }: { postId: string }) {
  const t = useTranslations("community");
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<"shareError" | "reportError" | null>(null);
  const [status, setStatus] = useState<"linkCopied" | "reportSent" | null>(null);
  const lock = useRef(false), reportAttempt = useRef<{ owner: string; id: string } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), share = useRef<HTMLButtonElement>(null), restoreFocus = useRef(false);
  const menuId = useId();
  useEffect(() => { if (open) share.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open && !busy && restoreFocus.current) { trigger.current?.focus(); restoreFocus.current = false; }
  }, [open, busy]);
  function close() { restoreFocus.current = true; setOpen(false); }
  async function handleShare() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setStatus(null);
    try {
      const url = window.location.origin + window.location.pathname.replace(/\/community.*/, "") + "/community/" + postId;
      await navigator.clipboard.writeText(url);
      setStatus("linkCopied"); close();
    } catch { setError("shareError"); }
    finally { lock.current = false; setBusy(false); }
  }
  async function handleReport() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setStatus(null);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!user || user.is_anonymous) { close(); setDialogOpen(true); return; }
      if (!reportAttempt.current || reportAttempt.current.owner !== user.id) reportAttempt.current = { owner: user.id, id: crypto.randomUUID() };
      const id = reportAttempt.current.id;
      const written = await db.from("reports").upsert({ id, reporter_id: user.id, target_type: "post", target_id: postId, reason: "other" }, { onConflict: "id", ignoreDuplicates: true });
      if (written.error) throw written.error;
      const confirmed = await db.from("reports").select("id").eq("id", id).eq("reporter_id", user.id).maybeSingle();
      if (confirmed.error || confirmed.data?.id !== id) throw new Error("REPORT_CONFIRMATION");
      setStatus("reportSent"); close();
    } catch { setError("reportError"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="relative" onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <button ref={trigger} type="button" onClick={() => setOpen(o => !o)} disabled={busy} aria-label={t("postOptions")} aria-expanded={open} aria-controls={menuId} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--color-muted-text)] hover:bg-[var(--color-cream)]">
      <MoreHorizontal className="h-4 w-4" aria-hidden />
    </button>
    {open ? <>
      <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
      <div id={menuId} className="absolute end-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] shadow-lg" aria-busy={busy}>
        <button ref={share} type="button" onClick={() => void handleShare()} disabled={busy} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-dark-text)] hover:bg-[var(--color-cream)] disabled:opacity-60">
          <Share2 className="h-3.5 w-3.5" aria-hidden />{t("share")}
        </button>
        <button type="button" onClick={() => void handleReport()} disabled={busy || status === "reportSent"} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-error)] hover:bg-[var(--color-cream)] disabled:opacity-60">{t("report")}</button>
      </div>
    </> : null}
    {error ? <p role="alert" className="text-xs text-[var(--color-error)]">{t(error)}</p> : null}
    {status ? <p role="status" className="text-xs text-[var(--color-muted-text)]">{t(status)}</p> : null}
    <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} returnTo={"/community/" + postId} />
  </div>;
}
