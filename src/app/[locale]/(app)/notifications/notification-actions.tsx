"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton({ userId, hasUnread }: { userId: string; hasUnread: boolean }) {
  const t = useTranslations("notificationsPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!hasUnread) return null;

  function handleClick() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <CheckCheck className="h-4 w-4" aria-hidden />
      {t("markAllRead")}
    </Button>
  );
}

/** Marks a single notification read the moment its link is clicked (fire-and-forget). */
export function NotificationRowLink({
  notificationId,
  isRead,
  href,
  className,
  children,
}: {
  notificationId: string;
  isRead: boolean;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    if (!isRead) {
      const supabase = createClient();
      // Fire-and-forget: don't block navigation on the update round-trip.
      void supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
