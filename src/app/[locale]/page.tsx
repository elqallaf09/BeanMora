import { getTranslations } from "next-intl/server";
import { Compass, Coffee, ScrollText, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BeanMoraLogo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LandingGuestButton } from "./landing-guest-button";

export default async function LandingPage() {
  const t = await getTranslations();

  const features = [
    { icon: Compass, title: t("landing.featureDiscoverTitle"), hint: t("landing.featureDiscoverHint") },
    { icon: ScrollText, title: t("landing.featureRecipesTitle"), hint: t("landing.featureRecipesHint") },
    { icon: Coffee, title: t("landing.featureBrewTitle"), hint: t("landing.featureBrewHint") },
    { icon: Users, title: t("landing.featureCommunityTitle"), hint: t("landing.featureCommunityHint") },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--color-cream)]">
      {/* ambient background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-caramel)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -start-24 top-1/3 h-72 w-72 rounded-full bg-[var(--color-teal)]/15 blur-3xl"
      />

      <header className="relative flex items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <BeanMoraLogo className="h-9 w-9" />
          <span className="text-lg font-bold text-[var(--color-espresso)]">{t("brand.name")}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 pb-16 pt-6 text-center md:pt-12">
        <div className="relative flex flex-col items-center gap-4 animate-fade-up">
          {/* animated logo with rising steam */}
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-[var(--color-ink-fixed)] shadow-xl shadow-[var(--color-ink-fixed)]/25" />
            <BeanMoraLogo className="relative h-14 w-14" />
            <span className="animate-steam absolute -top-2 start-1/2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-white/50" aria-hidden />
            <span className="animate-steam-delay absolute -top-2 start-1/2 h-6 w-1.5 translate-x-2 rounded-full bg-white/30" aria-hidden />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-[var(--color-espresso)] sm:text-4xl md:text-5xl">
              {t("landing.headline")}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-muted-text)] sm:text-base">
              {t("landing.subheadline")}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2.5 pt-2 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">{t("auth.createAccount")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">{t("auth.loginButton")}</Link>
            </Button>
          </div>
          <LandingGuestButton label={t("landing.guestCta")} loadingLabel={t("auth.guestLoadingLabel")} />
        </div>

        {/* feature preview */}
        <section aria-label={t("landing.scrollHint")} className="w-full animate-fade-up">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map(({ icon: Icon, title, hint }) => (
              <div
                key={title}
                className="card-lift flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]/80 p-4 text-center backdrop-blur"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-caramel)]/15 text-[var(--color-copper)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm font-bold text-[var(--color-espresso)]">{title}</p>
                <p className="text-[11px] leading-snug text-[var(--color-muted-text)]">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* mock layered brew card, standing in for photography */}
        <section className="relative mt-2 w-full max-w-md animate-fade-up">
          <div className="relative rounded-3xl bg-gradient-to-br from-[var(--color-roast-brown)] via-[var(--color-espresso)] to-[var(--color-espresso)] p-6 text-start text-white shadow-2xl shadow-[var(--color-espresso)]/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {t("nav.recipes")} · V60
            </p>
            <p className="mt-1 text-lg font-bold">{t("brand.tagline")}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-white/80">
              <span>18g</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>300g</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>2:45</span>
            </div>
          </div>
          <div
            aria-hidden
            className="absolute -bottom-4 start-6 h-10 w-[85%] rounded-3xl bg-[var(--color-caramel)]/25 blur-md"
          />
        </section>

        <p className="max-w-md text-[11px] leading-relaxed text-[var(--color-muted-text)]">
          {t("landing.xbloomTrustNote")}
        </p>
      </main>
    </div>
  );
}
