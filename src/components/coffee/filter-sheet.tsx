"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom sheet / desktop centered dialog used for Discover's filter
 * panel. Built directly on the Radix primitive (rather than the generic
 * ui/dialog.tsx) because it needs sheet-from-bottom positioning on mobile,
 * which the centered ui/dialog doesn't support.
 *
 * FilterSheet owns its own Root (rather than exposing a separate Trigger
 * component that a caller wraps in its own Root) so the trigger button and
 * the sheet content always share exactly one Radix Root instance.
 */
export function FilterSheetTriggerButton({
  label,
  activeCount,
}: {
  label: string;
  activeCount?: number;
}) {
  return (
    <Button type="button" variant="outline" size="default" className="relative gap-2">
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      {label}
      {activeCount ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-teal)] text-[11px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--color-espresso)]/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl",
            "sm:inset-x-auto sm:start-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--color-border,#ece1d3)] sm:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="text-lg font-bold text-[var(--color-espresso)]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-full p-1.5 text-[var(--color-muted-text)] hover:bg-[var(--color-cream)]">
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-5">{children}</div>

          {footer ? <div className="mt-6 flex gap-2">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal-dark)]"
          : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)] hover:bg-[var(--color-cream)]",
      )}
    >
      {label}
    </button>
  );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[var(--color-espresso)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
