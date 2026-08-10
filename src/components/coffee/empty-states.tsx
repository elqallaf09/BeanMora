import type { ReactNode } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Rich" empty/skeleton/error surfaces for the product-rebuild. These
 * intentionally differ from the plain dashed-border EmptyState in
 * shared/state-views.tsx (kept for small inline spots) — every primary
 * route gets a designed illustration + explanation + real next action
 * instead of a bare placeholder card or "Phase X" text.
 */

export function RichEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--color-border,#ece1d3)] bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-soft-white)] px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-caramel)]/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -start-10 -bottom-10 h-40 w-40 rounded-full bg-[var(--color-teal)]/10 blur-2xl"
      />
      <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-espresso)] text-[var(--color-caramel)] shadow-lg shadow-[var(--color-espresso)]/20">
          <Icon className="h-8 w-8" aria-hidden />
        </span>
        <h3 className="text-lg font-bold text-[var(--color-espresso)]">{title}</h3>
        {description ? (
          <p className="text-sm leading-relaxed text-[var(--color-muted-text)]">{description}</p>
        ) : null}
        {action || secondaryAction ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]",
        className,
      )}
      role="status"
      aria-label="loading"
    >
      <div className="animate-shimmer aspect-[4/3] w-full" />
      <div className="space-y-2 p-3">
        <div className="animate-shimmer h-3.5 w-3/4 rounded" />
        <div className="animate-shimmer h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function ErrorCard({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-[var(--color-error)]/25 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-dark-text)]",
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-error)]" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
