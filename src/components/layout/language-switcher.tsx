"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Keep the current entity, query and fragment; next-intl persists the locale cookie. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(nextLocale: "ar" | "en") {
    // Preserve the exact entity path, filters and anchor during a locale switch.
    router.replace(pathname + window.location.search + window.location.hash, {
      locale: nextLocale,
      scroll: false,
    });
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
