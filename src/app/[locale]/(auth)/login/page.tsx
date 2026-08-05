"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push((searchParams.get("next") as `/${string}`) ?? "/home");
    router.refresh();
  }

  async function onGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
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
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-[var(--color-error)]">{errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? <p role="alert" className="text-sm text-[var(--color-error)]">{serverError}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? t("common.loading") : t("auth.loginButton")}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-muted-text)]">
          <span className="h-px flex-1 bg-[var(--color-border,#ece1d3)]" />
          <span>{t("common.optional")}</span>
          <span className="h-px flex-1 bg-[var(--color-border,#ece1d3)]" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
          {t("auth.googleButton")}
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
