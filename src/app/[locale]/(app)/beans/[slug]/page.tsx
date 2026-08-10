import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, Flag, MapPin, Mountain, Plus, Sprout } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel, dataConfidenceLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/coffee/save-button";
import { RoastBadge, ProcessBadge, CompatibilityBadge } from "@/components/coffee/badges";
import { SectionIntro, EditorialMedia } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { RecipeCard, BeanCard, type RecipeCardData, type BeanCardData } from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function toRecipeCard(r: AnyRow): RecipeCardData {
  return {
    id: r.id,
    title: r.title,
    authorName: r.user?.name ?? r.user?.username ?? null,
    beanName: null,
    ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
    coverSeed: r.id,
  };
}

export default async function BeanDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: beanRaw } = await supabase
    .from("beans")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, origin_country, origin_region, farm, varietal, process, altitude_meters, roast_level, roast_date, harvest_season, acidity_level, body_level, sweetness_level, bag_weight_grams, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, source_name, source_url, data_confidence, last_verified_at, roaster:roasters(name_ar, name_en, slug, logo_url), flavors:bean_flavor_notes(flavor), images:bean_images(url, position, image_usage_status)",
    )
    .eq("slug", slug)
    .maybeSingle();
  // See AnyRow comment below — supabase-js infers embedded many-to-one
  // relations (roaster:roasters(...)) as arrays without real generated
  // types to check cardinality against; PostgREST returns a single object.
  // Fall back to the matching demo bean (or the first one) so a bean
  // detail link is never a dead end while the catalog is unimported.
  const bean = beanRaw as AnyRow;

  if (!bean) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <RichEmptyState
          icon={Sprout}
          title={t("bean.notFoundTitle")}
          description={t("bean.notFoundHint")}
          action={
            <Button asChild variant="accent">
              <Link href="/discover">{t("bean.backToDiscover")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const recipeSelect =
    "id, title, brew_method, dose_grams, water_grams, difficulty, user:profiles(name, username)";

  const [{ data: v60Recipes }, { data: espressoRecipes }, { data: xbloomRecipes }, { data: myRecipes }, { data: relatedBeans }] =
    await Promise.all([
      supabase.from("recipes").select(recipeSelect).eq("bean_id", bean.id).eq("brew_method", "v60").eq("visibility", "public").limit(6),
      supabase.from("recipes").select(recipeSelect).eq("bean_id", bean.id).eq("brew_method", "espresso").eq("visibility", "public").limit(6),
      supabase.from("recipes").select(recipeSelect).eq("bean_id", bean.id).eq("brew_method", "xbloom").eq("visibility", "public").limit(6),
      user
        ? supabase.from("recipes").select(recipeSelect).eq("bean_id", bean.id).eq("user_id", user.id).neq("visibility", "public").limit(6)
        : Promise.resolve({ data: [] }),
      supabase
        .from("beans")
        .select(
          "id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position)",
        )
        .eq("is_published", true)
        .eq("origin_country", bean.origin_country ?? "")
        .neq("id", bean.id)
        .limit(4),
    ]);

  const name = localizedField(bean, "name", locale);
  const description = localizedField(bean, "description", locale);
  const roasterName = bean.roaster ? localizedField(bean.roaster, "name", locale) : null;
  const images = (bean.images ?? []).sort((a: AnyRow, b: AnyRow) => a.position - b.position);
  // Real product photo > nothing — never a stand-in image credited as the
  // real one. bean_images defaults image_usage_status to 'rights_confirmed'
  // for pre-existing/manually-curated rows (migration 25), so this is a
  // no-op for everything already on the site; it only holds back a photo a
  // future discovery-pipeline row explicitly couldn't confirm rights for.
  const heroImage = images.find((img: AnyRow) => img.image_usage_status === "rights_confirmed");
  const flavors = (bean.flavors ?? []).map((f: AnyRow) => f.flavor);
  const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

  // Matching-recipe rails fall back per method, so a bean page always shows
  // something brewable rather than three empty rows.
  const recipeGroups: Array<{ key: string; title: string; recipes: AnyRow[] }> = [
    {
      key: "v60",
      title: t("bean.bestV60Title"),
      recipes: ((v60Recipes ?? []) as AnyRow[]),
    },
    {
      key: "espresso",
      title: t("bean.bestEspressoTitle"),
      recipes: ((espressoRecipes ?? []) as AnyRow[]),
    },
    {
      key: "xbloom",
      title: t("bean.xbloomRecipesTitle"),
      recipes: ((xbloomRecipes ?? []) as AnyRow[]),
    },
  ];
  if (user && myRecipes && myRecipes.length) {
    recipeGroups.push({ key: "mine", title: t("bean.myRecipesTitle"), recipes: myRecipes });
  }

  return (
    <div>
      {/* ============ Full-bleed product hero ============ */}
      <div className="texture-grain relative isolate min-h-[440px] overflow-hidden sm:min-h-[520px]">
        <div className="absolute inset-0 -z-20">
          <EditorialMedia
            src={heroImage?.url}
            alt={name}
            seed={bean.id}
            artKind="scene"
            kenBurns
            priority
            sizes="100vw"
          />
        </div>
        <div aria-hidden className="scrim-bottom absolute inset-0 -z-10" />

        <div className="absolute end-5 top-5 z-10">
          <SaveButton
            table="bean_saves"
            itemId={bean.id}
            isAuthenticated={Boolean(user)}
            size="lg"
            className="glass text-white [&_svg]:text-white"
          />
        </div>

        <div className="relative mx-auto flex min-h-[440px] max-w-5xl flex-col justify-end gap-4 px-4 pb-9 pt-10 text-[var(--color-cream)] sm:min-h-[520px] sm:px-6">
          {roasterName ? (
            <Link
              href={bean.roaster?.slug ? `/roasters/${bean.roaster.slug}` : "/discover?category=roasters"}
              className="type-eyebrow w-fit text-[var(--color-caramel)] hover:underline"
            >
              {roasterName}
            </Link>
          ) : null}

          <h1 className="type-headline max-w-[16ch] text-balance">{name}</h1>

          {bean.origin_country ? (
            <p className="flex items-center gap-1.5 text-sm text-white/70">
              <MapPin className="h-4 w-4" aria-hidden />
              {[bean.origin_region, bean.origin_country].filter(Boolean).join(", ")}
            </p>
          ) : null}

          {flavors.length ? (
            <div className="flex flex-wrap gap-2">
              {flavors.slice(0, 5).map((f: string) => (
                <span key={f} className="glass rounded-full px-4 py-1.5 text-xs font-semibold">
                  {f}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {bean.roast_level ? <RoastBadge level={bean.roast_level} label={roastLabel(t, bean.roast_level) ?? ""} /> : null}
            {bean.process ? <ProcessBadge label={processLabel(t, bean.process) ?? ""} /> : null}
            {bean.suitable_for_v60 ? <CompatibilityBadge label={compatLabels.v60} /> : null}
            {bean.suitable_for_espresso ? <CompatibilityBadge label={compatLabels.espresso} /> : null}
            {bean.suitable_for_xbloom ? <CompatibilityBadge label={compatLabels.xbloom} /> : null}
            {bean.data_confidence ? (
              <span className="glass rounded-full px-4 py-1.5 text-xs font-medium">
                {dataConfidenceLabel(t, bean.data_confidence)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">

          <dl className="surface-panel grid grid-cols-2 gap-5 rounded-[var(--radius-card)] p-6 text-sm sm:grid-cols-3">
            {bean.origin_country ? (
              <div>
                <dt className="type-eyebrow flex items-center gap-1.5 text-[var(--color-muted-text)]">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {t("bean.origin")}
                </dt>
                <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">
                  {[bean.origin_region, bean.origin_country].filter(Boolean).join(", ")}
                </dd>
              </div>
            ) : null}
            {bean.farm ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.farm")}</dt>
                <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">{bean.farm}</dd>
              </div>
            ) : null}
            {bean.varietal ? (
              <div>
                <dt className="type-eyebrow flex items-center gap-1.5 text-[var(--color-muted-text)]">
                  <Sprout className="h-3 w-3" aria-hidden />
                  {t("bean.variety")}
                </dt>
                <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">{bean.varietal}</dd>
              </div>
            ) : null}
            {bean.altitude_meters ? (
              <div>
                <dt className="type-eyebrow flex items-center gap-1.5 text-[var(--color-muted-text)]">
                  <Mountain className="h-3 w-3" aria-hidden />
                  {t("bean.altitude")}
                </dt>
                <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">
                  {bean.altitude_meters} {t("bean.meters")}
                </dd>
              </div>
            ) : null}
            {bean.roast_date ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.roastDate")}</dt>
                <dd className="mt-1.5 font-bold tabular-nums text-[var(--color-espresso)]">{bean.roast_date}</dd>
              </div>
            ) : null}
            {bean.harvest_season ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.harvestSeason")}</dt>
                <dd className="mt-1.5 font-bold text-[var(--color-espresso)]">{bean.harvest_season}</dd>
              </div>
            ) : null}
            {bean.bag_weight_grams ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.bagWeight")}</dt>
                <dd className="mt-1.5 font-bold tabular-nums text-[var(--color-espresso)]">
                  {bean.bag_weight_grams}{t("bean.grams")}
                </dd>
              </div>
            ) : null}
            {bean.acidity_level ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.acidity")}</dt>
                <dd className="mt-1.5 font-bold tabular-nums text-[var(--color-espresso)]">{bean.acidity_level}/5</dd>
              </div>
            ) : null}
            {bean.body_level ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.body")}</dt>
                <dd className="mt-1.5 font-bold tabular-nums text-[var(--color-espresso)]">{bean.body_level}/5</dd>
              </div>
            ) : null}
            {bean.sweetness_level ? (
              <div>
                <dt className="type-eyebrow text-[var(--color-muted-text)]">{t("bean.sweetness")}</dt>
                <dd className="mt-1.5 font-bold tabular-nums text-[var(--color-espresso)]">{bean.sweetness_level}/5</dd>
              </div>
            ) : null}
          </dl>

          {description ? (
            <div>
              <h2 className="type-subtitle mb-2 text-[var(--color-espresso)]">{t("bean.aboutTitle")}</h2>
              <p className="type-lede max-w-prose text-[var(--color-muted-text)]">{description}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="accent">
              <Link href={`/gear/beans?add=${bean.id}`}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("bean.addToMyBeans")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/recipes/create?bean=${bean.id}`}>{t("bean.addRecipe")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-[var(--color-muted-text)]">
              <Link href={`/beans/${bean.slug}/report`}>
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {t("bean.reportIncorrect")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Recipe sections */}
      <div className="mt-10 flex flex-col gap-8">
        {recipeGroups.map((group) => (
          <section key={group.key}>
            <SectionIntro title={group.title} />
            {group.recipes.length === 0 ? (
              <RichEmptyState
                icon={Sprout}
                title={t("bean.noRecipesForMethod")}
                description={t("bean.noRecipesForMethodHint")}
                className="py-8"
              />
            ) : (
              <HorizontalCarousel>
                {group.recipes.map((r: AnyRow) => (
                  <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} />
                ))}
              </HorizontalCarousel>
            )}
          </section>
        ))}

        {relatedBeans && relatedBeans.length > 0 ? (
          <section>
            <SectionIntro title={t("bean.relatedBeansTitle")} />
            <HorizontalCarousel>
              {relatedBeans.map((b: AnyRow) => {
                const card: BeanCardData = {
                  id: b.id,
                  slug: b.slug,
                  name: localizedField(b, "name", locale),
                  roasterName: b.roaster ? localizedField(b.roaster, "name", locale) : null,
                  originCountry: b.origin_country,
                  originRegion: b.origin_region,
                  processLabel: processLabel(t, b.process),
                  roastLevel: b.roast_level,
                  roastLevelLabel: roastLabel(t, b.roast_level),
                  flavors: (b.flavors ?? []).map((f: AnyRow) => f.flavor),
                  compatible: { v60: b.suitable_for_v60, espresso: b.suitable_for_espresso, xbloom: b.suitable_for_xbloom },
                  imageUrl: b.images?.[0]?.url ?? null,
                };
                return <BeanCard key={b.id} bean={card} isAuthenticated={Boolean(user)} labels={compatLabels} />;
              })}
            </HorizontalCarousel>
          </section>
        ) : null}

        {bean.source_name || bean.last_verified_at ? (
          <p className="mt-8 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-text)]">
            {bean.source_name ? (
              <span>
                {t("bean.sourcedFrom")}:{" "}
                {bean.source_url ? (
                  <a
                    href={bean.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-medium text-[var(--color-teal)] hover:underline"
                  >
                    {bean.source_name}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  bean.source_name
                )}
              </span>
            ) : null}
            {bean.last_verified_at ? (
              <span>
                {bean.source_name ? "· " : ""}
                {t("roasterProfile.lastVerified")}: {new Date(bean.last_verified_at).toISOString().slice(0, 10)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      </div>
    </div>
  );
}
