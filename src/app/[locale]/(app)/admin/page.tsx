import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/state-views";

/**
 * Admin gate: checks the `user_roles` table (never `user_metadata`, which is
 * user-editable) for an "admin" or "moderator" role. Full dashboard
 * (users/recipes/beans/roasters/reports/stats) ships in Phase 8 — see
 * docs/ROADMAP.md. This route enforces the access boundary from day one so
 * it's never accidentally left open.
 */
export default async function AdminPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "moderator"])
    .maybeSingle();

  if (!role) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-espresso)]">{t("nav.admin")}</h1>
      <EmptyState title={t("nav.admin")} hint="Phase 8 — Admin dashboard (users, content moderation, stats, audit logs)." />
    </div>
  );
}
