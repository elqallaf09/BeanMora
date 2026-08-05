"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwords do not match",
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
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
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setLoading(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/home");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
            {loading ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
