import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      {children}
    </div>
  );
}
