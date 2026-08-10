import { cn } from "@/lib/utils";

export interface BrewStepTiming {
  key: string;
  label: string;
  atSeconds: number;
  targetWaterGrams?: number;
  isBloom?: boolean;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Large circular countdown/count-up display used by the guided V60 brew
 * screen. Purely presentational — the page that mounts this owns the
 * ticking `elapsedSeconds` state (setInterval) and passes it down, so this
 * component re-renders on every tick without owning a timer itself.
 */
export function BrewProgress({
  elapsedSeconds,
  totalSeconds,
  isBloom,
  currentLabel,
  nextLabel,
  currentTargetGrams,
  totalWaterGrams,
  isPaused,
  className,
}: {
  elapsedSeconds: number;
  totalSeconds: number;
  isBloom?: boolean;
  currentLabel: string;
  nextLabel?: string;
  currentTargetGrams?: number;
  totalWaterGrams?: number;
  isPaused?: boolean;
  className?: string;
}) {
  const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-cream)" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="var(--color-teal)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.3s linear" }}
          />
        </svg>

        {isBloom ? (
          <span
            className="animate-bloom absolute h-24 w-24 rounded-full bg-[var(--color-caramel)]/25"
            aria-hidden
          />
        ) : null}

        <div className="relative flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-4xl font-bold tabular-nums text-[var(--color-espresso)]">
            {formatClock(elapsedSeconds)}
          </span>
          <span className="text-sm font-semibold text-[var(--color-teal-dark)]">{currentLabel}</span>
          {isPaused ? (
            <span className="text-xs font-medium text-[var(--color-warning)]">⏸</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-6 text-center">
        {typeof currentTargetGrams === "number" ? (
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-espresso)]">
              {currentTargetGrams}
              <span className="text-sm font-medium text-[var(--color-muted-text)]"> g</span>
            </p>
            <p className="text-[11px] text-[var(--color-muted-text)]">{currentLabel}</p>
          </div>
        ) : null}
        {typeof totalWaterGrams === "number" ? (
          <div className="border-s border-[var(--color-border,#ece1d3)] ps-6">
            <p className="text-2xl font-extrabold text-[var(--color-espresso)]">
              {totalWaterGrams}
              <span className="text-sm font-medium text-[var(--color-muted-text)]"> g</span>
            </p>
            <p className="text-[11px] text-[var(--color-muted-text)]">total</p>
          </div>
        ) : null}
      </div>

      {nextLabel ? (
        <p className="text-xs text-[var(--color-muted-text)]">
          <span className="font-medium text-[var(--color-dark-text)]">↓</span> {nextLabel}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Horizontal pour-by-pour timeline shown under the timer — each step lights
 * up as elapsedSeconds passes its start time.
 */
export function PourTimeline({
  steps,
  elapsedSeconds,
  className,
}: {
  steps: BrewStepTiming[];
  elapsedSeconds: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {steps.map((step, i) => {
        const isDone = elapsedSeconds >= (steps[i + 1]?.atSeconds ?? Infinity);
        const isActive = elapsedSeconds >= step.atSeconds && !isDone;
        return (
          <li
            key={step.key}
            className={cn(
              "flex min-w-[92px] shrink-0 flex-col gap-1 rounded-xl border px-3 py-2 text-center transition-colors",
              isActive
                ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10"
                : isDone
                  ? "border-[var(--color-border,#ece1d3)] bg-[var(--color-cream)] opacity-70"
                  : "border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]",
            )}
          >
            <span className="text-[11px] font-semibold text-[var(--color-muted-text)] tabular-nums">
              {formatClock(step.atSeconds)}
            </span>
            <span className="line-clamp-2 text-xs font-bold text-[var(--color-espresso)]">
              {step.label}
            </span>
            {typeof step.targetWaterGrams === "number" ? (
              <span className="text-[11px] text-[var(--color-muted-text)]">
                {step.targetWaterGrams}g
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export { formatClock };
