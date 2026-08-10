"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, RotateCcw, SkipForward, Vibrate, Volume2, VolumeX } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BrewProgress, PourTimeline, type BrewStepTiming } from "@/components/coffee/brew-progress";

export interface GuidedRecipe {
  recipeId?: string;
  beanId?: string | null;
  title: string;
  doseGrams: number;
  waterGrams: number;
  steps: BrewStepTiming[];
}

type Phase = "brewing" | "feedback" | "saved";

function playBeep() {
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available (blocked autoplay policy, unsupported browser) —
    // silently skip rather than breaking the brew flow over a sound cue.
  }
}

export function GuidedBrewClient({ recipe }: { recipe: GuidedRecipe }) {
  const t = useTranslations("v60");
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>("brewing");
  const [soundOn, setSoundOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({
    acidity: 3,
    bitterness: 3,
    sweetness: 3,
    balance: 3,
    overall: 4,
  });
  const [grindAdjust, setGrindAdjust] = useState<"finer" | "same" | "coarser">("same");

  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastStepIndexRef = useRef(-1);
  const estimatedTotal = recipe.steps.at(-1)?.atSeconds ?? 165;

  useEffect(() => {
    if (phase !== "brewing" || paused) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Screen wake lock — best-effort, silently no-ops where unsupported.
  useEffect(() => {
    if (phase !== "brewing") return;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((lock) => {
      if (cancelled) {
        lock.release().catch(() => {});
      } else {
        wakeLockRef.current = lock;
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [phase]);

  // Step-transition sound/haptic cues.
  useEffect(() => {
    const currentIndex = recipe.steps.findLastIndex((s) => elapsed >= s.atSeconds);
    if (currentIndex !== lastStepIndexRef.current && currentIndex >= 0) {
      lastStepIndexRef.current = currentIndex;
      if (soundOn) playBeep();
      if (hapticOn && "vibrate" in navigator) navigator.vibrate(150);
    }
  }, [elapsed, recipe.steps, soundOn, hapticOn]);

  const currentStepIndex = Math.max(
    0,
    recipe.steps.findLastIndex((s) => elapsed >= s.atSeconds),
  );
  const currentStep = recipe.steps[currentStepIndex];
  const nextStep = recipe.steps[currentStepIndex + 1];
  const isBloom = Boolean(currentStep?.isBloom);

  function handleSkip() {
    if (nextStep) setElapsed(nextStep.atSeconds);
    else setPhase("feedback");
  }

  function handleRestart() {
    setElapsed(0);
    setPaused(false);
    lastStepIndexRef.current = -1;
  }

  async function handleSaveAttempt() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: brewLog, error } = await supabase
        .from("brew_logs")
        .insert({
          user_id: user.id,
          recipe_id: recipe.recipeId ?? null,
          bean_id: recipe.beanId ?? null,
          brew_method: "v60",
          actual_time_seconds: elapsed,
          dose_grams: recipe.doseGrams,
          water_grams: recipe.waterGrams,
        })
        .select("id")
        .single();

      if (!error && brewLog) {
        await supabase.from("brew_log_taste_scores").insert({
          brew_log_id: brewLog.id,
          acidity: feedback.acidity,
          bitterness: feedback.bitterness,
          sweetness: feedback.sweetness,
          balance: feedback.balance,
          overall_rating: feedback.overall,
        });
      }
      setPhase("saved");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsRecipe() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newRecipe } = await supabase
        .from("recipes")
        .insert({
          user_id: user.id,
          bean_id: recipe.beanId ?? null,
          title: recipe.title,
          brew_method: "v60",
          dose_grams: recipe.doseGrams,
          water_grams: recipe.waterGrams,
          total_time_seconds: elapsed,
          visibility: "private",
        })
        .select("id")
        .single();

      if (newRecipe) router.push(`/recipes/${newRecipe.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "saved") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="animate-crema flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-teal)]/15 text-2xl">
          ✓
        </span>
        <h1 className="text-xl font-extrabold text-[var(--color-espresso)]">{t("attemptSaved")}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/v60">{t("backToHub")}</Link>
          </Button>
          <Button onClick={handleSaveAsRecipe} disabled={saving} variant="accent">
            {t("saveAsRecipe")}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "feedback") {
    const sliders: Array<{ key: keyof typeof feedback; label: string }> = [
      { key: "acidity", label: t("feedbackAcidity") },
      { key: "bitterness", label: t("feedbackBitterness") },
      { key: "sweetness", label: t("feedbackSweetness") },
      { key: "balance", label: t("feedbackBalance") },
      { key: "overall", label: t("feedbackOverall") },
    ];
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10">
        <div className="text-center">
          <span className="animate-crema mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-caramel)]/20 text-xl">
            ☕
          </span>
          <h1 className="text-xl font-extrabold text-[var(--color-espresso)]">{t("completeTitle")}</h1>
          <p className="text-sm text-[var(--color-muted-text)]">
            {t("completeTime")}: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4">
          <p className="mb-3 text-sm font-bold text-[var(--color-espresso)]">{t("feedbackTitle")}</p>
          <div className="flex flex-col gap-3">
            {sliders.map(({ key, label }) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted-text)]">
                  <span>{label}</span>
                  <span className="font-semibold text-[var(--color-dark-text)]">{feedback[key]}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={feedback[key]}
                  onChange={(e) => setFeedback((f) => ({ ...f, [key]: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-teal)]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4">
          <p className="mb-2 text-sm font-bold text-[var(--color-espresso)]">{t("gradeAdjustLabel")}</p>
          <div className="flex gap-2">
            {(["finer", "same", "coarser"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrindAdjust(g)}
                aria-pressed={grindAdjust === g}
                className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
                  grindAdjust === g
                    ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal-dark)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]"
                }`}
              >
                {t(`grade${g[0].toUpperCase()}${g.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSaveAttempt} disabled={saving} size="lg" variant="accent">
          {t("saveAttempt")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-text)]">
          {t("step")} {currentStepIndex + 1} {t("of")} {recipe.steps.length}
        </p>
        <h1 className="text-lg font-extrabold text-[var(--color-espresso)]">{currentStep?.label}</h1>
      </div>

      <BrewProgress
        elapsedSeconds={elapsed}
        totalSeconds={estimatedTotal}
        isBloom={isBloom}
        currentLabel={currentStep?.label ?? ""}
        nextLabel={nextStep?.label}
        currentTargetGrams={currentStep?.targetWaterGrams}
        totalWaterGrams={recipe.waterGrams}
        isPaused={paused}
      />

      <PourTimeline steps={recipe.steps} elapsedSeconds={elapsed} className="w-full" />

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" onClick={handleRestart} aria-label={t("controlsRestart")}>
          <RotateCcw className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          size="lg"
          variant="accent"
          className="h-14 w-14 rounded-full p-0"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("controlsResume") : t("controlsPause")}
        >
          {paused ? <Play className="h-6 w-6" aria-hidden /> : <Pause className="h-6 w-6" aria-hidden />}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={handleSkip} aria-label={t("controlsSkip")}>
          <SkipForward className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--color-muted-text)]">
        <button type="button" onClick={() => setSoundOn((s) => !s)} className="flex items-center gap-1.5">
          {soundOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          {t("controlsSound")}
        </button>
        <button
          type="button"
          onClick={() => setHapticOn((h) => !h)}
          className={`flex items-center gap-1.5 ${hapticOn ? "text-[var(--color-teal-dark)]" : ""}`}
        >
          <Vibrate className="h-4 w-4" aria-hidden />
          {t("controlsHaptic")}
        </button>
      </div>

      <button type="button" onClick={() => setPhase("feedback")} className="text-xs text-[var(--color-muted-text)] underline">
        {t("controlsSkip")} → {t("feedbackTitle")}
      </button>

      <p className="text-center text-[11px] text-[var(--color-muted-text)]">{t("keepAwakeOn")}</p>
    </div>
  );
}
