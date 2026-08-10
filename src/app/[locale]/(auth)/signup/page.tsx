"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { isGuestUser } from "@/lib/guest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    name: z.string().min(2),
    username: z
      .string()
      .min(3)
      .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore only"),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwords do not match",
  });
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/${locale}${searchParams.get("next") ?? "/onboarding"}`;

      // A guest (anonymous) session upgrades in place — we link the email
      // and password onto the SAME auth.uid() via updateUser(), never
      // supabase.auth.signUp(), which would create an unrelated second
      // user and strand every row the guest already owns (draft recipes,
      // brew logs, saved gear, ...). See migration 18 and
      // docs/ROADMAP.md's auth section for the full rationale. The guest
      // is never signed out first — updateUser() runs on their existing
      // session.
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (isGuestUser(currentUser)) {
        const { error: updateError } = await supabase.auth.updateUser(
          {
            email: values.email,
            password: values.password,
            data: { name: values.name, username: values.username, language: locale },
          },
          { emailRedirectTo },
        );
        if (updateError) {
          setServerError(updateError.message);
          return;
        }
        // auth.users.raw_user_meta_data is updated above, but the
        // public.profiles row was already created (with placeholder
        // "Guest" / "guest_xxxxxxxx" values) by handle_new_user() at
        // anonymous sign-in time and only fires on INSERT — an UPDATE
        // never re-triggers it. Update the profile directly with the
        // real name/username the guest just chose.
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ name: values.name, username: values.username, language: locale })
          .eq("id", currentUser!.id);
        if (profileError) {
          setServerError(profileError.message);
          return;
        }
        setSubmitted(true);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            username: values.username,
            language: locale,
          },
          // Preserve the page the user was on as the post-confirmation
          // destination; default to onboarding for a fresh signup with no
          // prior context.
          emailRedirectTo,
        },
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      setSubmitted(true);
    } catch {
      // Network failures etc. throw rather than returning `{ error }` —
      // never let those reach the Next.js error overlay.
      setServerError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("auth.confirmEmailTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-text)]">{t("auth.confirmEmailSent")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.signupTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("auth.nameLabel")}</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name ? <p className="text-xs text-[var(--color-error)]">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">{t("auth.usernameLabel")}</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username ? (
              <p className="text-xs text-[var(--color-error)]">{errors.username.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-[var(--color-error)]">{errors.email.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-[var(--color-error)]">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("auth.confirmPasswordLabel")}</Label>
            <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword ? (
              <p className="text-xs text-[var(--color-error)]">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {serverError ? <p role="alert" className="text-sm text-[var(--color-error)]">{serverError}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? t("common.loading") : t("auth.signupButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-text)]">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-[var(--color-teal)]">
            {t("auth.loginButton")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
