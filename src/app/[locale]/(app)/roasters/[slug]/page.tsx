import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";
import { Badge } from "@/components/ui/badge";

/**
 * Real query against the Phase 2 schema (roasters + roaster_locations +
 * roasted_products). Until the catalog is imported (see
 * supabase/research/kuwait/), this renders the Empty state for any slug —
 * intentionally, rather than a mock roaster card.
 */
export default async function RoasterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: roaster, error } = await supabase
    .from("roasters")
    .select(
      `id, name_ar, name_en, description_ar, description_en, country, city_id,
       website_url, instagram_url, tiktok_url, whatsapp_number, has_physical_store,
       ships_to_gcc, is_verified, data_confidence, last_verified_at, logo_url,
       roaster_locations ( label, address ),
       roasted_products ( id, name_ar, name_en, slug, status, roast_level )`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <ErrorState message={t("errors.supabase")} />
      </div>
    );
  }

  if (!roaster) {
    // Could be "doesn't exist" or "not imported yet" — both render the same
    // not-found for now; Phase 2 admin import is what populates this table.
    notFound();
  }

  const name = roaster.name_en ?? roaster.name_ar;
  const description = roaster.description_en ?? roaster.description_ar;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-espresso)]">{name}</h1>
          {roaster.country ? (
            <p className="text-sm text-[var(--color-muted-text)]">{roaster.country}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {roaster.is_verified ? <Badge variant="teal">Official Roaster Data</Badge> : null}
          <Badge variant="outline">{roaster.data_confidence}</Badge>
        </div>
      </div>

      {description ? <p className="mb-6 text-[var(--color-dark-text)]">{description}</p> : null}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-espresso)]">
          {t("nav.beans")}
        </h2>
        {!roaster.roasted_products || roaster.roasted_products.length === 0 ? (
          <EmptyState title={t("empty.noRecipes")} hint="No products imported for this roaster yet." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roaster.roasted_products.map((p) => (
              <li
                key={p.id}
                className="rounded-[var(--radius-brand)] border border-[var(--color-border,#ece1d3)] p-4"
              >
                <p className="font-medium">{p.name_en ?? p.name_ar}</p>
                <p className="text-xs text-[var(--color-muted-text)]">{p.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {roaster.last_verified_at ? (
        <p className="text-xs text-[var(--color-muted-text)]">
          Last verified: {new Date(roaster.last_verified_at).toISOString().slice(0, 10)}
        </p>
      ) : null}
    </div>
  );
}
