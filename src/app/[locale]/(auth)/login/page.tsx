"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Coffee } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { mapLoginErrorToMessageKey, mapGuestErrorToMessageKey } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

type PendingAction = "password" | "google" | "guest" | null;

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isBusy = pendingAction !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Surfaces the OAuth callback route's failure redirect
  // (/{locale}/login?error=google_oauth_failed) as the same localized
  // error UI as every other login failure — the callback route itself
  // never carries a raw Supabase error message in the URL, only this
  // fixed code.
  useEffect(() => {
    if (searchParams.get("error") === "google_oauth_failed") {
      setServerError(t("auth.googleOAuthFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onSubmit(values: FormValues) {
    if (isBusy) return;
    setServerError(null);
    setPendingAction("password");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setServerError(t(mapLoginErrorToMessageKey(error)));
        return;
      }
      router.push((searchParams.get("next") as `/${string}`) ?? "/home");
      router.refresh();
    } catch (error) {
      // Network failures, CORS issues, etc. throw rather than returning
      // `{ error }` — never let those reach the Next.js error overlay.
      setServerError(t(mapLoginErrorToMessageKey(error)));
    } finally {
      setPendingAction(null);
    }
  }

  async function onGoogle() {
    if (isBusy) return;
    setServerError(null);
    setPendingAction("google");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/${locale}/api/auth/callback?next=/${locale}/home`,
        },
      });
      if (error) {
        setServerError(t(mapLoginErrorToMessageKey(error)));
      }
      // On success the browser is redirected to Google, so there is
      // nothing further to do here — `finally` still resets the loading
      // state for the (rare) case the redirect is blocked.
    } catch (error) {
      setServerError(t(mapLoginErrorToMessageKey(error)));
    } finally {
      setPendingAction(null);
    }
  }

  async function onGuest() {
    if (isBusy) return;
    setServerError(null);
    setPendingAction("guest");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            language: locale,
            source: "guest_login",
          },
        },
      });
      if (error) {
        setServerError(t(mapGuestErrorToMessageKey(error)));
        return;
      }
      router.push("/home");
      router.refresh();
    } catch (error) {
      setServerError(t(mapGuestErrorToMessageKey(error)));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-[var(--color-error)]">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
              <Link href="/forgot-password" className="text-xs text-[var(--color-teal)]">
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-[var(--color-error)]">{errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" disabled={isBusy}>
            {pendingAction === "password" ? t("common.loading") : t("auth.loginButton")}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-muted-text)]">
          <span className="h-px flex-1 bg-[var(--color-border,#ece1d3)]" />
          <span>{t("common.optional")}</span>
          <span className="h-px flex-1 bg-[var(--color-border,#ece1d3)]" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={isBusy}>
          {pendingAction === "google" ? t("common.loading") : t("auth.googleButton")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="mt-2 w-full"
          onClick={onGuest}
          disabled={isBusy}
          aria-busy={pendingAction === "guest"}
        >
          <Coffee className="h-4 w-4" aria-hidden />
          {pendingAction === "guest" ? t("auth.guestLoadingLabel") : t("auth.continueAsGuest")}
        </Button>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-text)]">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-[var(--color-teal)]">
            {t("auth.createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
