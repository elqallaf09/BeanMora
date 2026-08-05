"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Persists the choice both client-side (cookie via next-intl's router,
 * picked up on next request) and — when signed in — to profiles.language
 * so it follows the user across devices. The profile write is fire-and-forget
 * from wherever this is rendered inside an authenticated shell.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchTo(nextLocale: "ar" | "en") {
    router.replace(
      // @ts-expect-error -- params shape depends on the current route
      { pathname, params },
      { locale: nextLocale },
    );
  }

  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => switchTo(next)}
      aria-label={t("switch")}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span>{t(next)}</span>
    </Button>
  );
}
