"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, Inbox, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standardized loading / empty / error states used across BeanMora instead
 * of ad-hoc spinners or blank screens. Never render mock data in place of
 * one of these — an empty dataset must show <EmptyState />.
 */

export function LoadingState({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-muted-text)]",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-teal)]" aria-hidden />
      <span className="text-sm">{t("loading")}</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-brand)] border border-dashed border-[var(--color-border,#ece1d3)] px-6 py-16 text-center",
        className,
      )}
    >
      <Inbox className="h-8 w-8 text-[var(--color-muted-text)]" aria-hidden />
      <p className="font-medium text-[var(--color-dark-text)]">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-[var(--color-muted-text)]">{hint}</p> : null}
      {action}
    </div>
  );
}

/**
 * `onRetry`, when provided, is called on click (client-side refetch). When
 * omitted, retry falls back to a router refresh — safe to use directly from
 * a Server Component's rendered output, since no function prop needs to
 * cross the server/client boundary.
 */
export function ErrorState({
  message,
  onRetry,
  offline = false,
  showRetry = true,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  offline?: boolean;
  showRetry?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const Icon = offline ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-brand)] bg-[var(--color-error)]/5 px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-[var(--color-error)]" aria-hidden />
      <p className="max-w-sm text-sm text-[var(--color-dark-text)]">
        {message ?? (offline ? t("errors.network") : t("errors.generic"))}
      </p>
      {showRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry ?? (() => router.refresh())}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
