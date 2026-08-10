import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The bottom-nav / sidebar "Profile" link points at /profile (no
 * username segment — the nav item can't know the signed-in user's
 * username ahead of time). This resolves the current session's own
 * username and redirects to the real /profile/[username] route so that
 * link is never a dead end.
 */
export default async function MyProfileRedirectPage({
  params,
}: {
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

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user!.id).maybeSingle();

  redirect({ href: `/profile/${profile?.username ?? ""}`, locale });
}
