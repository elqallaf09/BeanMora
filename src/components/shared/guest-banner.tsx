"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Persistent reminder shown to guest (anonymous) sessions that their data
 * is tied to this device/browser only. Supabase anonymous sessions are
 * regular auth sessions, not a special "offline mode" — if the guest signs
 * out, clears site data, or opens the app on another device, this session
 * (and everything scoped to it: draft recipes, brew logs, saved gear) is
 * gone. This banner is the app's only warning of that, so it stays visible
 * rather than being a one-time toast.
 */
export function GuestBanner() {
  const t = useTranslations("auth");
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-start gap-2 border-b border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-start sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-espresso)]">{t("guestBannerTitle")}</p>
        <p className="text-xs text-[var(--color-muted-text)]">{t("guestBannerHint")}</p>
      </div>
      <Button asChild size="sm" variant="accent" className="shrink-0">
        <Link href={`/signup?next=${encodeURIComponent(pathname)}`}>{t("guestBannerCta")}</Link>
      </Button>
    </div>
  );
}
