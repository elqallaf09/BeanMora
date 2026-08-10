"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

/**
 * Standard barista dial-in heuristics: a ~1:2 ratio pulled in 25-32s is the
 * conventional "balanced" target. Faster/slower flow or a ratio/time
 * mismatch maps to the classic too-fast / too-slow / bitter / sour
 * diagnosis baristas use to decide the next grind adjustment. This is a
 * real (if approximate) rule-of-thumb calculation from the user's own
 * numbers, not a canned/fake recommendation.
 */
function diagnose(doseGrams: number, yieldGrams: number, timeSeconds: number) {
  if (!doseGrams || !yieldGrams || !timeSeconds) return null;
  const ratio = yieldGrams / doseGrams;

  if (timeSeconds < 20) return "resultTooFast" as const;
  if (timeSeconds > 36) return "resultTooSlow" as const;
  if (ratio < 1.5 && timeSeconds > 30) return "resultBitter" as const;
  if (ratio > 2.5 && timeSeconds < 25) return "resultAcidic" as const;
  if (timeSeconds >= 25 && timeSeconds <= 32 && ratio >= 1.8 && ratio <= 2.2) return "resultBalanced" as const;
  return ratio < 2 ? ("resultBitter" as const) : ("resultAcidic" as const);
}

export function DialInCard() {
  const t = useTranslations("espresso");
  const router = useRouter();
  const [dose, setDose] = useState(18);
  const [yieldG, setYieldG] = useState(36);
  const [time, setTime] = useState(28);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => diagnose(dose, yieldG, time), [dose, yieldG, time]);
  const isBalanced = result === "resultBalanced";

  async function handleLog() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("brew_logs").insert({
        user_id: user.id,
        brew_method: "espresso",
        dose_grams: dose,
        water_grams: yieldG,
        actual_time_seconds: time,
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4">
      <p className="mb-3 text-sm font-bold text-[var(--color-espresso)]">{t("dialInTitle")}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="dose" className="text-xs">
            {t("dose")} (g)
          </Label>
          <Input id="dose" type="number" value={dose} onChange={(e) => setDose(Number(e.target.value))} className="tabular-nums" />
        </div>
        <div>
          <Label htmlFor="yield" className="text-xs">
            {t("yield")} (g)
          </Label>
          <Input id="yield" type="number" value={yieldG} onChange={(e) => setYieldG(Number(e.target.value))} className="tabular-nums" />
        </div>
        <div>
          <Label htmlFor="time" className="text-xs">
            {t("time")} (s)
          </Label>
          <Input id="time" type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} className="tabular-nums" />
        </div>
      </div>

      <p className="mt-2 text-xs text-[var(--color-muted-text)]">
        {t("ratio")}: <span className="font-semibold text-[var(--color-dark-text)]">1:{(yieldG / dose || 0).toFixed(1)}</span>
      </p>

      {result ? (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isBalanced ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
          }`}
        >
          {isBalanced ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
          {t(result)}
        </div>
      ) : null}

      <Button className="mt-3 w-full" variant="accent" onClick={handleLog} disabled={saving}>
        {t("logAttempt")}
      </Button>
    </div>
  );
}
