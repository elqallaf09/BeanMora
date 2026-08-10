"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  id: string;
  label: string;
  detail?: string | null;
  /** Seconds from brew start at which this step begins. */
  atSeconds: number;
  /** Cumulative water target in grams at the end of this step, if known. */
  targetWaterGrams?: number | null;
  isBloom?: boolean;
}

/**
 * Sticky, animated brew timeline.
 *
 * This is the interactive centrepiece of a brew page: a running clock, a
 * pour-progress ring that fills as water goes in, and a vertical timeline
 * whose active step is highlighted and auto-scrolled into view. It is
 * deliberately presentational-plus-timer only — it never writes to Supabase.
 * Logging a finished brew stays in the dedicated guided-brew flow, so this
 * can be dropped onto any recipe or hub page without side effects.
 */
export function BrewTimeline({
  steps,
  totalSeconds,
  totalWaterGrams,
  className,
}: {
  steps: TimelineStep[];
  totalSeconds?: number | null;
  totalWaterGrams?: number | null;
  className?: string;
}) {
  const t = useTranslations();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const baseRef = useRef(0);
  const activeRef = useRef<HTMLLIElement | null>(null);

  const ordered = useMemo(() => [...steps].sort((a, b) => a.atSeconds - b.atSeconds), [steps]);
  const duration = totalSeconds ?? (ordered.length ? ordered[ordered.length - 1].atSeconds + 30 : 0);

  const activeIndex = useMemo(() => {
    let idx = -1;
    ordered.forEach((s, i) => {
      if (elapsed >= s.atSeconds) idx = i;
    });
    return idx;
  }, [ordered, elapsed]);

  const pouredGrams = useMemo(() => {
    if (activeIndex < 0) return 0;
    const step = ordered[activeIndex];
    return step.targetWaterGrams ?? 0;
  }, [ordered, activeIndex]);

  /* Timer loop — wall-clock based so it stays accurate if the tab throttles
     rAF or setInterval drifts. */
  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      const started = startedAtRef.current;
      if (started == null) return;
      setElapsed(baseRef.current + Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  /* Auto-stop at the end of the recipe. */
  useEffect(() => {
    if (duration > 0 && elapsed >= duration && running) {
      setRunning(false);
      baseRef.current = duration;
      setElapsed(duration);
    }
  }, [elapsed, duration, running]);

  /* Keep the active step in view as the brew advances. */
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const toggle = useCallback(() => {
    setRunning((r) => {
      if (r) baseRef.current = elapsed;
      return !r;
    });
  }, [elapsed]);

  const reset = useCallback(() => {
    setRunning(false);
    baseRef.current = 0;
    setElapsed(0);
  }, []);

  const skip = useCallback(() => {
    const next = ordered[activeIndex + 1];
    if (!next) return;
    baseRef.current = next.atSeconds;
    setElapsed(next.atSeconds);
    startedAtRef.current = Date.now();
  }, [ordered, activeIndex]);

  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Progress ring geometry.
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start", className)}>
      {/* ---------- Sticky clock ---------- */}
      <div className="surface-panel lg:sticky lg:top-24 flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-6">
        <div className="relative h-[136px] w-[136px]">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface-sunken)" strokeWidth="9" />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--color-caramel)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (pct / 100) * C}
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-extrabold leading-none tabular-nums text-[var(--color-espresso)]">
              {mm}:{ss}
            </span>
            {totalWaterGrams ? (
              <span className="mt-1 text-[11px] font-bold tabular-nums text-[var(--color-copper)]">
                {pouredGrams}/{totalWaterGrams}g
              </span>
            ) : null}
          </div>
          {running ? (
            <span
              aria-hidden
              className="animate-steam absolute -top-3 left-1/2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-[var(--color-caramel)]/40 blur-[2px]"
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={running ? t("v60.controlsPause") : t("v60.controlsResume")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-ink-fixed)] text-[var(--color-cream)] shadow-warm-lg transition-transform hover:scale-105 active:scale-95"
          >
            {running ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={activeIndex + 1 >= ordered.length}
            aria-label={t("v60.controlsSkip")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-raised)] text-[var(--color-espresso)] transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-40"
          >
            <SkipForward className="icon-flip-rtl h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label={t("v60.controlsRestart")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-raised)] text-[var(--color-espresso)] transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ---------- Timeline ---------- */}
      <ol className="relative flex flex-col gap-2.5 ps-7">
        <span aria-hidden className="absolute bottom-3 start-[11px] top-3 w-[2px] rounded bg-[var(--border)]" />
        <span
          aria-hidden
          className="absolute start-[11px] top-3 w-[2px] rounded bg-[var(--color-caramel)] transition-[height] duration-500"
          style={{ height: `${pct}%` }}
        />

        {ordered.map((step, i) => {
          const done = activeIndex > i;
          const active = activeIndex === i;
          return (
            <li key={step.id} ref={active ? activeRef : undefined} className="relative">
              <span
                aria-hidden
                className={cn(
                  "absolute -start-7 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300",
                  active
                    ? "scale-110 border-[var(--color-caramel)] bg-[var(--color-caramel)] text-[var(--color-espresso)]"
                    : done
                      ? "border-[var(--color-caramel)] bg-[var(--color-caramel)]/25 text-[var(--color-copper)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--color-muted-text)]",
                )}
              >
                {i + 1}
              </span>

              <div
                className={cn(
                  "rounded-[var(--radius-tile)] border px-4 py-3 transition-all duration-300",
                  active
                    ? "border-[var(--color-caramel)]/50 bg-[var(--color-caramel)]/10 shadow-warm-md"
                    : "border-[var(--border-soft)] bg-[var(--surface-raised)]",
                  done && !active && "opacity-60",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-espresso)]">
                    {step.label}
                    {step.isBloom ? (
                      <span className="rounded-full bg-[var(--color-teal)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-teal-dark)]">
                        {t("recipe.bloomPour")}
                      </span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-copper)]">
                    {Math.floor(step.atSeconds / 60)}:{String(step.atSeconds % 60).padStart(2, "0")}
                  </span>
                </div>
                {step.detail ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-text)]">{step.detail}</p>
                ) : null}
                {step.targetWaterGrams ? (
                  <p className="mt-1.5 text-[11px] font-bold tabular-nums text-[var(--color-teal-dark)]">
                    → {step.targetWaterGrams}g
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
