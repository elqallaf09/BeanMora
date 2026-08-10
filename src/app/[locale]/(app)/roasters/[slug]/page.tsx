import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Globe, Instagram, MapPin, Store, Truck, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { SectionIntro, EditorialMedia } from "@/components/coffee/editorial";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { SaveButton } from "@/components/coffee/save-button";
import { BeanCard, type BeanCardData } from "@/components/coffee/cards";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const CONFIDENCE_KEY: Record<string, string> = {
  official: "roasterProfile.dataConfidenceOfficial",
  verified: "roasterProfile.dataConfidenceVerified",
  community_submitted: "roasterProfile.dataConfidenceCommunitySubmitted",
  suggested: "roasterProfile.dataConfidenceSuggested",
  unverified: "roasterProfile.dataConfidenceUnverified",
};

export default async function RoasterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: roasterRaw } = await supabase
    .from("roasters")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, country, website_url, instagram_url, logo_url, is_verified, data_confidence, has_physical_store, ships_to_gcc, last_verified_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  // Fall back to the matching demo roaster so the page is never a dead end
  // while the Phase 2 catalog import is still pending.
  const roaster = roasterRaw as AnyRow;

  if (!roaster) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RichEmptyState
          icon={Users}
          title={t("roasterProfile.notFoundTitle")}
          description={t("roasterProfile.notFoundHint")}
          action={
            <Button asChild variant="accent">
              <Link href="/discover">{t("roasterProfile.backToDiscover")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [{ data: mySave }, { data: beansRaw }] = await Promise.all([
    user ? supabase.from("roaster_saves").select("id").eq("roaster_id", roaster.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("beans")
      .select(
        "id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, flavors:bean_flavor_notes(flavor), images:bean_images(url, position)",
      )
      .eq("roaster_id", roaster.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  const beans = ((beansRaw ?? []) as AnyRow[]);

  const name = localizedField(roaster, "name", locale);
  const description = localizedField(roaster, "description", locale);
  const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

  function toBeanCard(b: AnyRow): BeanCardData {
    return {
      id: b.id,
      slug: b.slug,
      name: localizedField(b, "name", locale),
      roasterName: name,
      originCountry: b.origin_country,
      originRegion: b.origin_region,
      processLabel: processLabel(t, b.process),
      roastLevel: b.roast_level,
      roastLevelLabel: roastLabel(t, b.roast_level),
      flavors: (b.flavors ?? []).map((f: AnyRow) => f.flavor),
      compatible: { v60: b.suitable_for_v60, espresso: b.suitable_for_espresso, xbloom: b.suitable_for_xbloom },
      imageUrl: b.images?.[0]?.url ?? null,
    };
  }

  return (
    <div>
      {/* ============ Full-bleed roaster hero (mirrors bean detail) ============ */}
      <div className="texture-grain relative isolate min-h-[420px] overflow-hidden sm:min-h-[500px]">
        <div className="absolute inset-0 -z-20">
          <EditorialMedia seed={roaster.id} alt={name} artKind="scene" kenBurns priority sizes="100vw" />
        </div>
        <div aria-hidden className="scrim-bottom absolute inset-0 -z-10" />

        <div className="absolute end-5 top-5 z-10">
          <SaveButton
            table="roaster_saves"
            itemId={roaster.id}
            initialSaved={Boolean(mySave)}
            isAuthenticated={Boolean(user)}
            size="lg"
            className="glass text-white [&_svg]:text-white"
          />
        </div>

        <div className="relative mx-auto flex min-h-[420px] max-w-5xl flex-col justify-end gap-4 px-4 pb-9 pt-10 text-[var(--color-cream)] sm:min-h-[500px] sm:px-6">
          <div className="relative h-20 w-20 overflow-hidden rounded-3xl shadow-warm-xl ring-2 ring-white/25 sm:h-24 sm:w-24">
            <ImageWithFallback src={roaster.logo_url} alt={name} fallbackSeed={roaster.id} artKind="roaster" fill sizes="96px" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="type-headline max-w-[16ch] text-balance">{name}</h1>
            {roaster.is_verified ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 fill-[var(--color-teal)] text-[var(--color-espresso)]" aria-hidden />
            ) : null}
          </div>

          {roaster.country ? (
            <p className="flex items-center gap-1.5 text-sm text-white/70">
              <MapPin className="h-4 w-4" aria-hidden />
              {roaster.country}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {roaster.is_verified ? (
              <span className="glass rounded-full px-4 py-1.5 text-xs font-semibold">{t("roasterProfile.verified")}</span>
            ) : null}
            <span className="glass rounded-full px-4 py-1.5 text-xs font-medium">
              {t(CONFIDENCE_KEY[roaster.data_confidence] ?? "roasterProfile.dataConfidenceUnverified")}
            </span>
            {roaster.has_physical_store ? (
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium">
                <Store className="h-3 w-3" aria-hidden />
                {t("roasterProfile.hasPhysicalStore")}
              </span>
            ) : null}
            {roaster.ships_to_gcc ? (
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium">
                <Truck className="h-3 w-3" aria-hidden />
                {t("roasterProfile.shipsToGcc")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {description ? <p className="type-lede max-w-prose text-[var(--color-muted-text)]">{description}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {roaster.website_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={roaster.website_url} target="_blank" rel="noreferrer noopener">
              <Globe className="h-4 w-4" aria-hidden />
              {t("roasterProfile.visitWebsite")}
            </a>
          </Button>
        ) : null}
        {roaster.instagram_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={roaster.instagram_url} target="_blank" rel="noreferrer noopener">
              <Instagram className="h-4 w-4" aria-hidden />
              {t("roasterProfile.instagram")}
            </a>
          </Button>
        ) : null}
      </div>

      <section className="mt-8">
        <SectionIntro title={t("roasterProfile.beansTitle")} eyebrow={t("nav.beans")} />
        {beans.length === 0 ? (
          <RichEmptyState icon={Users} title={t("roasterProfile.beansEmptyTitle")} description={t("roasterProfile.beansEmptyHint")} className="py-8" />
        ) : (
          <div className="masonry">
            {beans.map((b, i) => (
              <BeanCard key={b.id} bean={toBeanCard(b)} isAuthenticated={Boolean(user)} labels={compatLabels} width="w-full" size={i % 3 === 0 ? "lg" : "md"} />
            ))}
          </div>
        )}
      </section>

      {roaster.last_verified_at ? (
        <p className="mt-8 text-xs text-[var(--color-muted-text)]">
          {t("roasterProfile.lastVerified")}: {new Date(roaster.last_verified_at).toISOString().slice(0, 10)}
        </p>
      ) : null}
      </div>
    </div>
  );
}
