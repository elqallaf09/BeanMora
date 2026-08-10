import { getTranslations } from "next-intl/server";
import { Globe, Shield, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isGuestUser } from "@/lib/guest";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  AppearanceToggle,
  ReducedMotionToggle,
  SignOutButton,
  DataExportButton,
  DeleteAccountDialog,
} from "./settings-controls";

export const dynamic = "force-dynamic";

function SettingsRow({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-cream)] text-[var(--color-copper)]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--color-espresso)]">{title}</p>
          {hint ? <p className="text-xs text-[var(--color-muted-text)]">{hint}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = isGuestUser(user);
  const providers = Array.from(new Set((user?.identities ?? []).map((i) => i.provider)));

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-6"><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("settings.title")}</h1></header>

      {isGuest ? (
        <p className="mb-4 rounded-xl bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
          {t("settings.guestNote")}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <SettingsRow icon={Globe} title={t("settings.language")}>
          <LanguageSwitcher />
        </SettingsRow>

        <SettingsRow icon={Sparkles} title={t("settings.appearance")}>
          <div className="w-40">
            <AppearanceToggle />
          </div>
        </SettingsRow>

        <SettingsRow icon={Sparkles} title={t("settings.reducedMotion")} hint={t("settings.reducedMotionHint")}>
          <ReducedMotionToggle />
        </SettingsRow>

        {!isGuest ? (
          <SettingsRow
            icon={Shield}
            title={t("settings.connectedProviders")}
            hint={providers.length ? providers.join(", ") : "—"}
          >
            <span />
          </SettingsRow>
        ) : null}

        {!isGuest ? (
          <SettingsRow icon={Shield} title={t("settings.dataExport")} hint={t("settings.dataExportHint")}>
            <DataExportButton />
          </SettingsRow>
        ) : null}

        <SettingsRow icon={Shield} title={t("settings.accountSecurity")}>
          <SignOutButton />
        </SettingsRow>

        {!isGuest ? (
          <SettingsRow icon={Shield} title={t("settings.deleteAccount")} hint={t("settings.deleteAccountHint")}>
            <DeleteAccountDialog />
          </SettingsRow>
        ) : null}
      </div>
    </div>
  );
}
