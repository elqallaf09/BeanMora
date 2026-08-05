import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BeanMoraLogo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <BeanMoraLogo className="h-9 w-9" />
          <span className="text-lg font-semibold text-[var(--color-espresso)]">{t("brand.name")}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <BeanMoraLogo className="h-16 w-16" />
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-espresso)] md:text-4xl">
            {t("brand.name")}
          </h1>
          <p className="mt-2 text-[var(--color-muted-text)]">{t("brand.tagline")}</p>
        </div>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">{t("auth.createAccount")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">{t("auth.loginButton")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
