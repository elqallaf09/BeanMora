"use client";

import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuestSignIn } from "@/hooks/use-guest-sign-in";

/**
 * Landing page's guest CTA — thin wrapper around the shared
 * useGuestSignIn hook (also used by the login page) so the anonymous
 * sign-in flow is implemented exactly once.
 */
export function LandingGuestButton({
  label,
  loadingLabel,
}: {
  label: string;
  loadingLabel: string;
}) {
  const { signInAsGuest, pending, error } = useGuestSignIn("/home");

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={signInAsGuest}
        disabled={pending}
        aria-busy={pending}
        className="gap-2 text-[var(--color-teal-dark)]"
      >
        <Coffee className="h-4 w-4" aria-hidden />
        {pending ? loadingLabel : label}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
