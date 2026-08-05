import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGuestUser } from "@/lib/guest";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GuestBanner } from "@/components/shared/guest-banner";

// Every request re-checks the Supabase session (via cookies()), so this
// layout is never eligible for static rendering or caching — required so
// guest-session-specific UI (the badge/banner below) is never served from
// a shared cache to a different visitor. See docs/DATABASE.md / the Phase
// 2+ auth report for the fuller rendering-safety review.
export const dynamic = "force-dynamic";

export default async function AppLayout({
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

  const isGuest = isGuestUser(user);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header isGuest={isGuest} />
        {isGuest ? <GuestBanner /> : null}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
