"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { primaryNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    // Floating pill nav rather than a full-width bordered bar — the bar
    // reads as browser chrome; the pill reads as part of the product.
    <nav
      aria-label={t("nav.home")}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass-dark mx-auto flex max-w-md items-stretch justify-around rounded-[26px] px-1.5 py-1.5 shadow-warm-xl">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-[20px] py-2 text-[10px] font-bold transition-all duration-300",
                active
                  ? "bg-[var(--color-caramel)] text-[var(--color-espresso)] shadow-warm-md"
                  : "text-white/60 hover:text-white",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
