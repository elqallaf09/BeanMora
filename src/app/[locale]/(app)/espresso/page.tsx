import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AbstractCoffeeBackground } from "@/components/coffee/fallback-art";
import { SectionIntro } from "@/components/coffee/editorial";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { DialInCard } from "./dial-in-card";
import { AttemptsTimeline } from "./attempts-timeline";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function EspressoHubPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: gear }, { data: attempts }] = await Promise.all([
    user
      ? supabase
          .from("user_equipment")
          .select("id, category, custom_name, is_default, equipment_model:equipment_models(name, brand:equipment_brands(name))")
          .eq("user_id", user.id)
          .in("category", ["espresso_machine", "grinder"])
          .eq("is_default", true)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("brew_logs")
          .select("id, dose_grams, water_grams, actual_time_seconds, grind_setting, notes, tasting_note, created_at")
          .eq("user_id", user.id)
          .eq("brew_method", "espresso")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const gearRows = (gear ?? []) as AnyRow[];
  const machine = gearRows.find((g) => g.category === "espresso_machine");
  const grinder = gearRows.find((g) => g.category === "grinder");

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:py-8">
      <AbstractCoffeeBackground
        seed="espresso-hero"
        className="relative isolate overflow-hidden rounded-3xl px-6 py-10 text-center text-white shadow-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-espresso)]/85 via-[var(--color-espresso)]/40 to-transparent" />
        <div className="relative flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Zap className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("espresso.heroTitle")}</h1>
          <p className="text-sm text-white/80">{t("espresso.heroSubtitle")}</p>
        </div>
      </AbstractCoffeeBackground>

      {/* Selected gear */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3">
          <p className="text-[11px] font-semibold uppercase text-[var(--color-muted-text)]">{t("espresso.selectedMachine")}</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-espresso)]">
            {machine?.equipment_model?.name ?? machine?.custom_name ?? t("espresso.noEquipmentSet")}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3">
          <p className="text-[11px] font-semibold uppercase text-[var(--color-muted-text)]">{t("espresso.selectedGrinder")}</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-espresso)]">
            {grinder?.equipment_model?.name ?? grinder?.custom_name ?? t("espresso.noEquipmentSet")}
          </p>
        </div>
      </section>
      {!machine && !grinder ? (
        <Link href="/gear" className="mt-1 inline-block text-xs font-semibold text-[var(--color-teal)]">
          {t("espresso.manageGear")}
        </Link>
      ) : null}

      {/* Dial-in calculator */}
      <section className="mt-6">
        <DialInCard />
      </section>

      {/* Previous attempts timeline */}
      <section className="mt-8">
        <SectionIntro title={t("espresso.attemptsTitle")} />
        {!attempts || attempts.length === 0 ? (
          <RichEmptyState icon={Zap} title={t("espresso.attemptsEmptyTitle")} description={t("espresso.attemptsEmptyHint")} className="py-8" />
        ) : (
          <AttemptsTimeline attempts={attempts as AnyRow[]} />
        )}
      </section>
    </div>
  );
}
