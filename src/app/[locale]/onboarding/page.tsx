"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "barista"] as const;
const BREW_METHODS = [
  "v60",
  "espresso",
  "xbloom",
  "aeropress",
  "chemex",
  "french_press",
  "cold_brew",
  "moka_pot",
] as const;
const FLAVORS = ["chocolate", "nutty", "fruity", "citrus", "floral", "caramel", "spice"] as const;
const ROASTS = ["light", "medium", "dark"] as const;

const STEPS = ["experience", "methods", "flavors", "roast"] as const;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<(typeof EXPERIENCE_LEVELS)[number] | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [roast, setRoast] = useState<(typeof ROASTS)[number] | null>(null);
  const [saving, setSaving] = useState(false);

  const isLast = step === STEPS.length - 1;

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ experience_level: experience })
        .eq("id", user.id);

      await supabase.from("user_preferences").upsert({
        user_id: user.id,
        preferred_brew_methods: methods,
        preferred_flavors: flavors,
        preferred_roast_level: roast,
        onboarding_completed: true,
      });
    }
    setSaving(false);
    router.push("/home");
  }

  function next() {
    if (isLast) {
      void finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function skipAll() {
    router.push("/home");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= step ? "bg-[var(--color-teal)]" : "bg-[var(--color-border,#ece1d3)]",
            )}
          />
        ))}
      </div>

      {step === 0 ? (
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--color-espresso)]">{t("chooseExperience")}</h1>
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setExperience(level)}
                className={cn(
                  "rounded-[var(--radius-brand)] border px-4 py-3 text-sm font-medium",
                  experience === level
                    ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]",
                )}
              >
                {t(`experience${level.charAt(0).toUpperCase()}${level.slice(1)}` as never)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--color-espresso)]">{t("chooseBrewMethods")}</h1>
          <div className="grid grid-cols-2 gap-2">
            {BREW_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setMethods((m) => toggle(m, method))}
                className={cn(
                  "rounded-[var(--radius-brand)] border px-4 py-3 text-sm font-medium capitalize",
                  methods.includes(method)
                    ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]",
                )}
              >
                {t(`method${method.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}` as never)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--color-espresso)]">{t("chooseFlavors")}</h1>
          <div className="grid grid-cols-2 gap-2">
            {FLAVORS.map((flavor) => (
              <button
                key={flavor}
                type="button"
                onClick={() => setFlavors((f) => toggle(f, flavor))}
                className={cn(
                  "rounded-[var(--radius-brand)] border px-4 py-3 text-sm font-medium capitalize",
                  flavors.includes(flavor)
                    ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]",
                )}
              >
                {t(`flavor${flavor.charAt(0).toUpperCase()}${flavor.slice(1)}` as never)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--color-espresso)]">{t("chooseRoast")}</h1>
          <div className="grid grid-cols-3 gap-2">
            {ROASTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoast(r)}
                className={cn(
                  "rounded-[var(--radius-brand)] border px-4 py-3 text-sm font-medium capitalize",
                  roast === r
                    ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]",
                )}
              >
                {t(`roast${r.charAt(0).toUpperCase()}${r.slice(1)}` as never)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={skipAll}>
          {tCommon("skip")}
        </Button>
        <div className="flex gap-2">
          {step > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              {tCommon("back")}
            </Button>
          ) : null}
          <Button size="sm" onClick={next} disabled={saving}>
            {isLast ? tCommon("done") : tCommon("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
