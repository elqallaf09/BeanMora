import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: EmailOtpType }>;
}) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      redirect({ href: "/onboarding", locale });
    }
  }

  redirect({ href: "/login", locale });
}
