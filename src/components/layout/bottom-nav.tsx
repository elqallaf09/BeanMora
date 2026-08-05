"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { primaryNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.home")}
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface,#fff)]/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {primaryNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active
                ? "text-[var(--color-teal)]"
                : "text-[var(--color-muted-text)] hover:text-[var(--color-dark-text)]",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
