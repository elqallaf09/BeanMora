"use client";

import { useState } from "react";
import { Heart, MoreHorizontal, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";
import { cn } from "@/lib/utils";

export function PostLikeButton({
  postId,
  initialLiked,
  initialCount,
  isAuthenticated,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("community");
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function toggle() {
    if (!isAuthenticated) {
      setDialogOpen(true);
      return;
    }
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) {
      setPulse(true);
      setTimeout(() => setPulse(false), 400);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (next) {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  }

  return (
    <>
      <button type="button" onClick={toggle} aria-pressed={liked} className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-text)]">
        <Heart
          className={cn("h-4 w-4", pulse && "animate-heart-pop", liked ? "fill-[var(--color-error)] text-[var(--color-error)]" : "")}
          aria-hidden
        />
        {count}
        <span className="sr-only">{t("like")}</span>
      </button>
      <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export function FollowButton({
  targetUserId,
  initialFollowing,
  isAuthenticated,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("community");
  const [following, setFollowing] = useState(initialFollowing);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function toggle() {
    if (!isAuthenticated) {
      setDialogOpen(true);
      return;
    }
    const next = !following;
    setFollowing(next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (next) {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
    } else {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
          following
            ? "bg-[var(--color-cream)] text-[var(--color-muted-text)]"
            : "bg-[var(--color-teal)]/10 text-[var(--color-teal-dark)]",
        )}
      >
        {following ? t("following") : t("follow")}
      </button>
      <GuestUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export function PostMoreMenu({ postId }: { postId: string }) {
  const t = useTranslations("community");
  const [open, setOpen] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname.replace(/\/community.*/, "")}/community/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard unavailable — link copy silently no-ops.
    }
    setOpen(false);
  }

  async function handleReport() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "post",
        target_id: postId,
        reason: "other",
      });
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="more"
        className="rounded-full p-1 text-[var(--color-muted-text)] hover:bg-[var(--color-cream)]"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 top-7 z-20 w-40 overflow-hidden rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] shadow-lg">
            <button
              type="button"
              onClick={handleShare}
              className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-dark-text)] hover:bg-[var(--color-cream)]"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {t("share")}
            </button>
            <button
              type="button"
              onClick={handleReport}
              className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-error)] hover:bg-[var(--color-cream)]"
            >
              {t("report")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
