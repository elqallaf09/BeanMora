"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Bookmark, Settings, Wrench } from "lucide-react";
import { primaryNavItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { BeanMoraLogo } from "@/components/layout/logo";

const secondaryNavItems = [
  { href: "/saved", labelKey: "nav.saved", icon: Bookmark },
  { href: "/gear", labelKey: "nav.gear", icon: Wrench },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const renderLink = (item: (typeof primaryNavItems)[number]) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius-brand)] px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
            : "text-[var(--color-dark-text)] hover:bg-[var(--color-cream)]",
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden />
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-e border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4 md:flex">
      <Link href="/home" className="flex items-center gap-2 px-2 py-2">
        <BeanMoraLogo className="h-8 w-8" />
        <span className="text-lg font-semibold text-[var(--color-espresso)]">BeanMora</span>
      </Link>
      <nav className="flex flex-col gap-1">{primaryNavItems.map(renderLink)}</nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-[var(--color-border,#ece1d3)] pt-4">
        {secondaryNavItems.map(renderLink)}
      </div>
    </aside>
  );
}
