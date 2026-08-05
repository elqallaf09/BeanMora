"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Plus, Search } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BeanMoraLogo } from "@/components/layout/logo";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";

export function Header({ isGuest = false }: { isGuest?: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface,#fff)]/80 md:px-6">
      <Link href="/home" className="flex items-center gap-2 md:hidden">
        <BeanMoraLogo className="h-8 w-8" />
      </Link>

      <div className="relative flex-1 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)] ltr:left-3 rtl:right-3"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          className="ltr:pl-9 rtl:pr-9"
        />
      </div>

      {isGuest ? (
        <>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setGuestDialogOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>{t("nav.recipes")}</span>
          </Button>
          <GuestUpgradeDialog
            open={guestDialogOpen}
            onOpenChange={setGuestDialogOpen}
            returnTo={pathname}
          />
        </>
      ) : (
        <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
          <Link href="/recipes/create">
            <Plus className="h-4 w-4" aria-hidden />
            <span>{t("nav.recipes")}</span>
          </Link>
        </Button>
      )}

      <Button asChild variant="ghost" size="icon" aria-label={t("nav.notifications")}>
        <Link href="/notifications">
          <Bell className="h-5 w-5" aria-hidden />
        </Link>
      </Button>

      {isGuest ? (
        <Badge variant="warning" className="shrink-0" aria-label={t("auth.guestBadge")}>
          {t("auth.guestBadge")}
        </Badge>
      ) : null}

      <LanguageSwitcher />
    </header>
  );
}
