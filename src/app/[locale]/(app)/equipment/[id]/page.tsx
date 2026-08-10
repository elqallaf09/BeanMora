import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { dataConfidenceLabel, equipmentCategoryLabel, brewMethodLabelKey, processLabel, roastLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { SectionIntro, EditorialMedia } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { RecipeCard, BeanCard, type RecipeCardData, type BeanCardData } from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: eqRaw } = await supabase
    .from("equipment_models")
    .select(
      "id, name, category, image_url, image_usage_status, description, specifications, official_url, suitable_brew_methods, grind_range, notes, source_name, source_url, data_confidence, last_verified_at, brand:equipment_brands(name, logo_url)",
    )
    .eq("id", id)
    .maybeSingle();
  const equipment = eqRaw as AnyRow;

  if (!equipment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <RichEmptyState
          icon={Wrench}
          title={t("equipment.notFoundTitle")}
          description={t("equipment.notFoundHint")}
          action={
            <Button asChild variant="accent">
              <Link href="/discover?category=equipment">{t("equipment.backToDiscover")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Real graph edges only: recipes explicitly linked to this equipment
  // model via recipe_equipment (migration 05/29), never an inferred
  // "probably works with this brew method" guess.
  const { data: linkedRaw } = await supabase
    .from("recipe_equipment")
    .select(
      "recipe:recipes(id, title, brew_method, dose_grams, water_grams, difficulty, visibility, user:profiles(name, username), bean:beans(id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, flavors:bean_flavor_notes(flavor), images:bean_images(url, position)))",
    )
    .eq("equipment_model_id", id)
    .limit(12);

  const linkedRecipes = ((linkedRaw ?? []) as AnyRow[])
    .map((row) => row.recipe)
    .filter((r: AnyRow) => r && r.visibility === "public");

  // Beans reached only through a real linked recipe's bean_id — deduped.
  const compatibleBeansMap = new Map<string, AnyRow>();
  for (const r of linkedRecipes) {
    if (r.bean?.id) compatibleBeansMap.set(r.bean.id, r.bean);
  }
  const compatibleBeans = Array.from(compatibleBeansMap.values());

  const image = equipment.image_usage_status === "rights_confirmed" ? equipment.image_url : null;
  const brandName = equipment.brand?.name ?? null;
  const specs = (equipment.specifications ?? {}) as Record<string, unknown>;
  const specEntries = Object.entries(specs).filter(([, v]) => v !== null && v !== undefined && v !== "");
  const methods = (equipment.suitable_brew_methods ?? []) as string[];
  const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

  function toRecipeCard(r: AnyRow): RecipeCardData {
    return {
      id: r.id,
      title: r.title,
      authorName: r.user?.name ?? r.user?.username ?? null,
      beanName: r.bean ? localizedField(r.bean, "name", locale) : null,
      ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
      methodLabel: r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null,
      coverSeed: r.id,
    };
  }

  function toBeanCard(b: AnyRow): BeanCardData {
    return {
      id: b.id,
      slug: b.slug,
      name: localizedField(b, "name", locale),
      roasterName: null,
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
      <div className="texture-grain relative isolate min-h-[380px] overflow-hidden sm:min-h-[440px]">
        <div className="absolute inset-0 -z-20">
          <EditorialMedia src={image} alt={equipment.name} seed={equipment.id} artKind="gear" kenBurns priority sizes="100vw" />
        </div>
        <div aria-hidden className="scrim-bottom absolute inset-0 -z-10" />

        <div className="relative mx-auto flex min-h-[380px] max-w-5xl flex-col justify-end gap-4 px-4 pb-9 pt-10 text-[var(--color-cream)] sm:min-h-[440px] sm:px-6">
          {brandName ? <p className="type-eyebrow w-fit text-[var(--color-caramel)]">{brandName}</p> : null}
          <h1 className="type-headline max-w-[18ch] text-balance">{equipment.name}</h1>

          <div className="flex flex-wrap gap-2">
            <span className="glass rounded-full px-4 py-1.5 text-xs font-semibold">
              {equipmentCategoryLabel(t, equipment.category)}
            </span>
            {equipment.data_confidence ? (
              <span className="glass rounded-full px-4 py-1.5 text-xs font-medium">
                {dataConfidenceLabel(t, equipment.data_confidence)}
              </span>
            ) : null}
            {methods.map((m) => (
              <span key={m} className="glass rounded-full px-4 py-1.5 text-xs font-medium">
                {t(brewMethodLabelKey(m))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8">
          {equipment.description ? (
            <div>
              <h2 className="type-subtitle mb-2 text-[var(--color-espresso)]">{t("equipment.aboutTitle")}</h2>
              <p className="type-lede max-w-prose text-[var(--color-muted-text)]">{equipment.description}</p>
            </div>
          ) : null}

          {specEntries.length || equipment.grind_range ? (
            <dl className="surface-panel grid grid-cols-2 gap-5 rounded-[var(--radius-card)] p-6 text-sm sm:grid-cols-3">
              {equipment.grind_range ? (
                <div>
                  <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("equipment.grindRange")}</dt>
                  <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">{equipment.grind_range}</dd>
                </div>
              ) : null}
              {specEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="type-eyebrow text-[var(--color-muted-text)]">{key.replace(/_/g, " ")}</dt>
                  <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {equipment.official_url ? (
              <Button asChild variant="outline" size="sm">
                <a href={equipment.official_url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {t("equipment.visitOfficialSite")}
                </a>
              </Button>
            ) : null}
          </div>

        </div>

        <div className="mt-10 flex flex-col gap-8">
          <section>
            <SectionIntro title={t("equipment.recipesTitle")} />
            {linkedRecipes.length === 0 ? (
              <RichEmptyState
                icon={Wrench}
                title={t("equipment.noRecipesTitle")}
                description={t("equipment.noRecipesHint")}
                className="py-8"
              />
            ) : (
              <HorizontalCarousel>
                {linkedRecipes.map((r: AnyRow) => (
                  <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} />
                ))}
              </HorizontalCarousel>
            )}
          </section>

          {compatibleBeans.length > 0 ? (
            <section>
              <SectionIntro title={t("equipment.compatibleBeansTitle")} />
              <HorizontalCarousel>
                {compatibleBeans.map((b: AnyRow) => (
                  <BeanCard key={b.id} bean={toBeanCard(b)} isAuthenticated={Boolean(user)} labels={compatLabels} />
                ))}
              </HorizontalCarousel>
            </section>
          ) : null}
        </div>

        {equipment.source_name || equipment.last_verified_at ? (
          <p className="mt-8 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-text)]">
            {equipment.source_name ? (
              <span>
                {t("bean.sourcedFrom")}:{" "}
                {equipment.source_url ? (
                  <a
                    href={equipment.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-medium text-[var(--color-teal)] hover:underline"
                  >
                    {equipment.source_name}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  equipment.source_name
                )}
              </span>
            ) : null}
            {equipment.last_verified_at ? (
              <span>
                {equipment.source_name ? "· " : ""}
                {t("roasterProfile.lastVerified")}: {new Date(equipment.last_verified_at).toISOString().slice(0, 10)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
