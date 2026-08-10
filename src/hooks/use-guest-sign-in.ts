"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { mapGuestErrorToMessageKey } from "@/lib/auth-errors";

/**
 * Shared "Continue as guest" logic (Supabase anonymous sign-in), extracted
 * out of the login page so the landing page's guest CTA can trigger the
 * exact same flow without duplicating it — the product-rebuild spec is
 * explicit that guest login must not be reimplemented per-screen.
 */
export function useGuestSignIn(redirectTo: `/${string}` = "/home") {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInAsGuest() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            language: locale,
            source: "guest_login",
          },
        },
      });
      if (signInError) {
        setError(t(mapGuestErrorToMessageKey(signInError)));
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(t(mapGuestErrorToMessageKey(caught)));
    } finally {
      setPending(false);
    }
  }

  return { signInAsGuest, pending, error, setError };
}
