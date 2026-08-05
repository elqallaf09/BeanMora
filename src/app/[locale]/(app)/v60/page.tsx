import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/state-views";

/**
 * Route scaffold for the BeanMora IA. This screen is intentionally a real,
 * navigable Next.js route (not a design mock) so the sitemap in
 * docs/SITEMAP.md is end-to-end clickable from Phase 1. Deep functionality
 * for this route ships in a later phase — see docs/ROADMAP.md.
 * Phase 4 — V60 hub
 */
export default async function Page() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-espresso)]">{t("nav.v60")}</h1>
      <EmptyState title={t("nav.v60")} hint="Phase 4 — V60 hub" />
    </div>
  );
}
