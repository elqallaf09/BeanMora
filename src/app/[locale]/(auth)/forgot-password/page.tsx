"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    });
    setLoading(false);
    // Always show the same confirmation regardless of whether the email
    // exists, to avoid leaking account existence.
    setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-[var(--color-muted-text)]">{t("auth.resetPasswordSent")}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("auth.emailLabel")}</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email ? (
                <p className="text-xs text-[var(--color-error)]">{errors.email.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : t("auth.sendResetLink")}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-[var(--color-muted-text)]">
          <Link href="/login" className="font-medium text-[var(--color-teal)]">
            {t("auth.loginButton")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
