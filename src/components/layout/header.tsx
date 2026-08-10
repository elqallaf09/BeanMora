"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Plus, Search } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BeanMoraLogo } from "@/components/layout/logo";
import { GuestUpgradeDialog } from "@/components/shared/guest-upgrade-dialog";

export function Header({ isGuest = false }: { isGuest?: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  }

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--background)]/80 px-4 backdrop-blur-xl md:px-6">
      <Link href="/home" className="flex items-center gap-2 md:hidden">
        <BeanMoraLogo className="h-8 w-8" />
      </Link>

      <form onSubmit={submitSearch} className="relative flex-1 max-w-xl" role="search">
        <Search
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)] ltr:left-3 rtl:right-3"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          className="ltr:pl-9 rtl:pr-9"
        />
      </form>

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
