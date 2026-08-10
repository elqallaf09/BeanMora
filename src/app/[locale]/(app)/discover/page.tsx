import { getLocale, getTranslations } from "next-intl/server";
import { Compass, Coffee, Sparkles, Users, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel, difficultyLabel, brewMethodLabelKey, equipmentCategoryLabel } from "@/lib/catalog-labels";
import { SectionIntro, PillLink } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import {
  BeanCard,
  RoasterCard,
  RecipeCard,
  EquipmentCard,
  OriginCard,
  type BeanCardData,
  type RecipeCardData,
} from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { DiscoverToolbar } from "./discover-toolbar";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const category = str(sp, "category") || "beans";
  const q = str(sp, "q");
  const process = str(sp, "process");
  const roast = str(sp, "roast");
  const method = str(sp, "method");
  const equipmentCategory = str(sp, "equipmentCategory");
  const sort = str(sp, "sort") || "newest";
  const hasFilters = Boolean(q || process || roast || method || equipmentCategory);

  const categories = [
    { key: "beans", label: t("discover.categoryBeans"), icon: Coffee },
    { key: "roasters", label: t("discover.categoryRoasters"), icon: Users },
    { key: "recipes", label: t("discover.categoryRecipes"), icon: Sparkles },
    { key: "equipment", label: t("discover.categoryEquipment"), icon: Wrench },
  ];

  const compatColumn = (m: string) =>
    m === "v60" ? "suitable_for_v60" : m === "espresso" ? "suitable_for_espresso" : "suitable_for_xbloom";

  let results: AnyRow[] = [];
  let resultsError: string | null = null;

  if (category === "beans") {
    let query = supabase
      .from("beans")
      .select(
        "id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position)",
      )
      .eq("is_published", true);
    if (q) query = query.or(`name_en.ilike.%${q}%,name_ar.ilike.%${q}%,origin_country.ilike.%${q}%`);
    if (process) query = query.eq("process", process);
    if (roast) query = query.eq("roast_level", roast);
    if (method) query = query.eq(compatColumn(method), true);
    query = query.order(sort === "name" ? "name_en" : "created_at", { ascending: sort === "name" }).limit(24);
    const { data, error } = await query;
    results = data ?? [];
    resultsError = error?.message ? t("errors.supabase") : null;
  } else if (category === "roasters") {
    let query = supabase.from("roasters").select("id, slug, name_ar, name_en, country, logo_url, is_verified");
    if (q) query = query.or(`name_en.ilike.%${q}%,name_ar.ilike.%${q}%,country.ilike.%${q}%`);
    query = query.order(sort === "name" ? "name_en" : "created_at", { ascending: sort === "name" }).limit(24);
    const { data, error } = await query;
    results = data ?? [];
    resultsError = error?.message ? t("errors.supabase") : null;
  } else if (category === "recipes") {
    let query = supabase
      .from("recipes")
      .select(
        "id, title, brew_method, dose_grams, water_grams, total_time_seconds, difficulty, created_at, user:profiles(name, username), bean:beans(name_ar, name_en)",
      )
      .eq("visibility", "public");
    // "18g" / "18" style searches match the dose exactly (a real, common way
    // brewers look a recipe up) in addition to the normal title search —
    // whichever the query looks like.
    const doseMatch = q.trim().match(/^(\d+(?:\.\d+)?)\s*g?$/i);
    if (doseMatch) {
      query = query.eq("dose_grams", Number(doseMatch[1]));
    } else if (q) {
      query = query.ilike("title", `%${q}%`);
    }
    if (method) query = query.eq("brew_method", method);
    query = query.order(sort === "name" ? "title" : "created_at", { ascending: sort === "name" }).limit(24);
    const { data, error } = await query;
    results = data ?? [];
    resultsError = error?.message ? t("errors.supabase") : null;
  } else if (category === "equipment") {
    let query = supabase
      .from("equipment_models")
      .select(
        "id, name, category, image_url, description, official_url, data_confidence, brand:equipment_brands(name)",
      );
    if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
    if (equipmentCategory) query = query.eq("category", equipmentCategory);
    query = query.order("name", { ascending: true }).limit(24);
    const { data, error } = await query;
    results = data ?? [];
    resultsError = error?.message ? t("errors.supabase") : null;
  }

  // Origin facets are derived from the real catalogue rather than a fixed
  // list, so the rail only ever offers origins that actually have beans.
  const { data: originRows } = await supabase
    .from("beans")
    .select("origin_country")
    .eq("is_published", true)
    .not("origin_country", "is", null)
    .limit(500);
  const origins = Array.from(
    new Set(((originRows ?? []) as AnyRow[]).map((r) => r.origin_country).filter(Boolean)),
  ).slice(0, 12) as string[];

  // Featured sections only render on the beans tab with no active search/filters.
  let featured: { newBeans: AnyRow[]; bestV60: AnyRow[]; bestEspresso: AnyRow[]; xbloomCompat: AnyRow[] } | null = null;
  if (category === "beans" && !hasFilters) {
    const beanSelect =
      "id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position)";
    const [newBeans, bestV60, bestEspresso, xbloomCompat] = await Promise.all([
      supabase.from("beans").select(beanSelect).eq("is_published", true).order("created_at", { ascending: false }).limit(8),
      supabase.from("beans").select(beanSelect).eq("is_published", true).eq("suitable_for_v60", true).order("created_at", { ascending: false }).limit(8),
      supabase.from("beans").select(beanSelect).eq("is_published", true).eq("suitable_for_espresso", true).order("created_at", { ascending: false }).limit(8),
      supabase.from("beans").select(beanSelect).eq("is_published", true).eq("suitable_for_xbloom", true).order("created_at", { ascending: false }).limit(8),
    ]);
    featured = {
      newBeans: ((newBeans.data as AnyRow[]) ?? []),
      bestV60: ((bestV60.data as AnyRow[]) ?? []),
      bestEspresso: ((bestEspresso.data as AnyRow[]) ?? []),
      xbloomCompat: ((xbloomCompat.data as AnyRow[]) ?? []),
    };
  }

  function toBeanCard(b: AnyRow): BeanCardData {
    return {
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
      rating: b.rating ?? null,
      price: typeof b.priceKwd === "number" ? `${b.priceKwd.toFixed(2)} KWD` : null,
    };
  }

  function toRecipeCard(r: AnyRow): RecipeCardData {
    return {
      id: r.id,
      title: r.title,
      authorName: r.user?.name ?? r.user?.username ?? null,
      beanName: r.bean ? localizedField(r.bean, "name", locale) : null,
      ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
      difficultyLabel: difficultyLabel(t, r.difficulty) ?? null,
      brewTimeLabel: r.total_time_seconds
        ? `${Math.floor(r.total_time_seconds / 60)}:${String(r.total_time_seconds % 60).padStart(2, "0")}`
        : null,
      methodLabel: r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null,
      rating: r.rating ?? null,
      coverSeed: r.id,
    };
  }

  const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-6">
        <p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p>
        <h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("nav.discover")}</h1>
      </header>

      <DiscoverToolbar
        category={category}
        initialQuery={q}
        initialFilters={{ process, roast, method, equipmentCategory, sort }}
      />

      {/* Category tabs */}
      <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1">
        {categories.map(({ key, label, icon: Icon }) => (
          <PillLink
            key={key}
            href={`/discover?category=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            label={label}
            icon={Icon}
            active={category === key}
          />
        ))}
      </div>

      {/* Origin rail — a browsable entry point when nothing is filtered. */}
      {category === "beans" && !hasFilters && origins.length > 0 ? (
        <section className="mt-6">
          <SectionIntro title={t("discover.filterOrigin")} eyebrow={t("nav.discover")} />
          <HorizontalCarousel>
            {origins.map((origin) => (
              <OriginCard
                key={origin}
                name={origin}
                href={`/discover?category=beans&q=${encodeURIComponent(origin)}`}
                seed={`origin-${origin}`}
              />
            ))}
          </HorizontalCarousel>
        </section>
      ) : null}

      <div className="mt-6">
        {q ? (
          <p className="mb-3 text-sm text-[var(--color-muted-text)]">{t("discover.resultsFor", { query: q })}</p>
        ) : null}

        {/* A backend error no longer blocks the whole page: if we still have
            something to show (demo catalog), render it and surface the error
            as a dismissable notice above rather than replacing the catalog
            with a full-page error card. */}
        {resultsError && results.length > 0 ? (
          <p className="mb-4 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2.5 text-xs font-medium text-[var(--color-warning)]">
            {resultsError}
          </p>
        ) : null}

        {resultsError && results.length === 0 ? (
          <RichEmptyState icon={Compass} title={resultsError} />
        ) : results.length === 0 ? (
          <RichEmptyState
            icon={
              category === "beans" ? Coffee : category === "roasters" ? Users : category === "recipes" ? Sparkles : Wrench
            }
            title={
              hasFilters
                ? t("discover.noResultsTitle")
                : t(
                    category === "beans"
                      ? "discover.emptyBeansTitle"
                      : category === "roasters"
                        ? "discover.emptyRoastersTitle"
                        : category === "recipes"
                          ? "discover.emptyRecipesTitle"
                          : "discover.emptyEquipmentTitle",
                  )
            }
            description={
              hasFilters
                ? t("discover.noResultsHint")
                : t(
                    category === "beans"
                      ? "discover.emptyBeansHint"
                      : category === "roasters"
                        ? "discover.emptyRoastersHint"
                        : category === "recipes"
                          ? "discover.emptyRecipesHint"
                          : "discover.emptyEquipmentHint",
                  )
            }
          />
        ) : category === "beans" ? (
          <div className="masonry">
            {results.map((b, i) => (
              <BeanCard key={b.id} bean={toBeanCard(b)} isAuthenticated={Boolean(user)} labels={compatLabels} width="w-full" size={i % 3 === 0 ? "lg" : "md"} />
            ))}
          </div>
        ) : category === "roasters" ? (
          <div className="masonry">
            {results.map((r) => (
              <RoasterCard
                key={r.id}
                id={r.id}
                slug={r.slug}
                name={localizedField(r, "name", locale)}
                country={r.country}
                logoUrl={r.logo_url}
                isVerified={r.is_verified}
                beanCount={r.beanCount}
                beanCountLabel={t("home.beanCountLabel")}
                className="w-full"
              />
            ))}
          </div>
        ) : category === "recipes" ? (
          <div className="masonry">
            {results.map((r) => (
              <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} width="w-full" />
            ))}
          </div>
        ) : (
          <div className="masonry">
            {results.map((eq) => (
              <EquipmentCard
                key={eq.id}
                id={eq.id}
                name={eq.name}
                brand={eq.brand?.name}
                categoryLabel={equipmentCategoryLabel(t, eq.category) ?? eq.category}
                imageUrl={eq.image_url}
                href={`/equipment/${eq.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {featured ? (
        <div className="mt-10 flex flex-col gap-8">
          {(
            [
              ["sectionNewBeans", featured.newBeans],
              ["sectionBestV60", featured.bestV60],
              ["sectionBestEspresso", featured.bestEspresso],
              ["sectionXbloomCompatible", featured.xbloomCompat],
            ] as const
          ).map(([key, beans]) =>
            beans.length ? (
              <section key={key}>
                <SectionIntro title={t(`discover.${key}`)} eyebrow={t("nav.beans")} />
                <HorizontalCarousel>
                  {beans.map((b) => (
                    <BeanCard key={b.id} bean={toBeanCard(b)} isAuthenticated={Boolean(user)} labels={compatLabels} />
                  ))}
                </HorizontalCarousel>
              </section>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
