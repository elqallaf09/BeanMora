"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
          username: values.username,
          language: locale,
        },
        emailRedirectTo: `${window.location.origin}/${locale}/onboarding`,
      },
    });
    setLoading(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    setSubmitted(true);
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
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-[var(--color-error)]">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("auth.confirmPasswordLabel")}</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
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
