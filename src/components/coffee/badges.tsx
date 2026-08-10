import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small, server-safe presentational primitives shared across bean, recipe,
 * and roaster cards. These never call useTranslations themselves — callers
 * pass already-localized labels, which keeps every one of these usable
 * directly from a Server Component (no "use client" needed) and keeps
 * translation lookups co-located with the page that already has `t`.
 */

export function RatingDisplay({
  rating,
  count,
  size = "md",
  className,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-[var(--color-espresso)]",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Star
        className={cn(
          "fill-[var(--color-caramel)] text-[var(--color-caramel)]",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
        )}
        aria-hidden
      />
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      {typeof count === "number" ? (
        <span className="font-normal text-[var(--color-muted-text)]">({count})</span>
      ) : null}
    </span>
  );
}

export function FlavorChips({
  flavors,
  max = 4,
  size = "md",
  className,
}: {
  flavors: string[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!flavors.length) return null;
  const shown = flavors.slice(0, max);
  const rest = flavors.length - shown.length;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((flavor) => (
        <li
          key={flavor}
          className={cn(
            "rounded-full bg-[var(--color-caramel)]/12 font-medium text-[var(--color-copper)]",
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          {flavor}
        </li>
      ))}
      {rest > 0 ? (
        <li
          className={cn(
            "rounded-full bg-[var(--color-cream)] font-medium text-[var(--color-muted-text-fixed)]",
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          +{rest}
        </li>
      ) : null}
    </ul>
  );
}

const ROAST_STEPS = ["light", "medium_light", "medium", "medium_dark", "dark"] as const;
type RoastLevel = (typeof ROAST_STEPS)[number];

export function RoastBadge({
  level,
  label,
  className,
}: {
  level: RoastLevel | string | null | undefined;
  label: string;
  className?: string;
}) {
  const stepIndex = ROAST_STEPS.indexOf(level as RoastLevel);
  const filled = stepIndex >= 0 ? stepIndex + 1 : 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-soft-white)] px-2.5 py-1 text-xs font-medium text-[var(--color-dark-text-fixed)]",
        className,
      )}
    >
      <span className="flex items-center gap-[2px]" aria-hidden>
        {ROAST_STEPS.map((step, i) => (
          <span
            key={step}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i < filled ? "bg-[var(--color-roast-brown)]" : "bg-[var(--color-border,#ece1d3)]",
            )}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

export function ProcessBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--color-teal)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-teal-dark)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CompatibilityBadge({
  label,
  active = true,
  className,
}: {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        active
          ? "bg-[var(--color-ink-fixed)] text-[var(--color-soft-white)]"
          : "bg-[var(--color-cream)] text-[var(--color-muted-text-fixed)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function OriginTag({
  country,
  region,
  className,
}: {
  country?: string | null;
  region?: string | null;
  className?: string;
}) {
  if (!country) return null;
  return (
    <span className={cn("text-xs text-[var(--color-muted-text)]", className)}>
      {region ? `${region}, ${country}` : country}
    </span>
  );
}
