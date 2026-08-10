import { getLocale, getTranslations } from "next-intl/server";
import {
  Coffee,
  Compass,
  Droplet,
  Flame,
  Package,
  Play,
  Snowflake,
  Sparkles,
  Star,
  Wind,
  Zap,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGuestUser } from "@/lib/guest";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel, difficultyLabel, brewMethodLabelKey } from "@/lib/catalog-labels";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import {
  FeatureSpread,
  SectionIntro,
  EditorialTile,
  SplitFeature,
  RoastBand,
  StatRibbon,
  EditorialMedia,
} from "@/components/coffee/editorial";
import { SaveButton } from "@/components/coffee/save-button";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { CoffeeArt } from "@/components/coffee/fallback-art";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { HomeSearchBar } from "./home-search";

export const dynamic = "force-dynamic";

// Database is typed as `any` (src/lib/supabase/types.ts), so supabase-js
// can't check FK cardinality on embedded selects and infers every
// `foo:table(...)` embed as an array even where PostgREST returns a single
// object. One named alias plus this comment beats scattering `as any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const METHODS = [
  { code: "v60", icon: Droplet, href: "/v60", hintKey: "brew.hintV60" },
  { code: "espresso", icon: Zap, href: "/espresso", hintKey: "brew.hintEspresso" },
  { code: "xbloom", icon: Sparkles, href: "/xbloom", hintKey: "brew.hintXbloom" },
  { code: "aeropress", icon: Wind, href: "/discover?category=recipes&method=aeropress", hintKey: "brew.hintAeropress" },
  { code: "chemex", icon: Coffee, href: "/discover?category=recipes&method=chemex", hintKey: "brew.hintChemex" },
  { code: "cold_brew", icon: Snowflake, href: "/discover?category=recipes&method=cold_brew", hintKey: "brew.hintColdBrew" },
];

function fmtTime(seconds?: number | null) {
  if (!seconds) return undefined;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "home.goodMorning";
  if (h < 18) return "home.goodAfternoon";
  return "home.goodEvening";
}

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = isGuestUser(user);

  const results = (await Promise.all([
    user ? supabase.from("profiles").select("name, username, avatar_url").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("recipes")
      .select(
        "id, title, brew_method, dose_grams, water_grams, total_time_seconds, flavor_notes, notes, bean:beans(id, slug, name_ar, name_en, roaster:roasters(name_ar, name_en))",
      )
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    user
      ? supabase
          .from("brew_logs")
          .select("id, brew_method, actual_time_seconds, dose_grams, water_grams, recipe:recipes(id, title), bean:beans(id, slug, name_ar, name_en)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("beans")
      .select(
        "id, slug, name_ar, name_en, description_ar, description_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position)",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("recipes")
      .select("id, title, brew_method, dose_grams, water_grams, total_time_seconds, difficulty, user:profiles(name, username), bean:beans(name_ar, name_en)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("posts")
      .select("id, body, created_at, author:profiles(name, username, avatar_url), media:post_media(url, position), likes:post_likes(count), comment_list:comments(count)")
      .eq("visibility", "public")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(4),
    user
      ? supabase
          .from("user_bean_inventory")
          .select("id, roast_date, original_weight_grams, remaining_weight_grams, bean:beans(id, slug, name_ar, name_en, roaster:roasters(name_ar, name_en))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: null }),
    supabase.from("roasters").select("id, slug, name_ar, name_en, description_ar, description_en, country, logo_url, is_verified").limit(8),
    // Real origin facets, and a real brew count for the stat ribbon.
    supabase.from("beans").select("origin_country").eq("is_published", true).not("origin_country", "is", null).limit(500),
    user
      ? supabase.from("brew_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
  ])) as AnyRow[];

  const [
    { data: profile },
    { data: heroRecipeRaw },
    { data: recentBrewLogRaw },
    { data: beansRaw },
    { data: recipesRaw },
    { data: postsRaw },
    { data: inventoryRaw },
    { data: roastersRaw },
    { data: originRows },
    { count: brewCount },
  ] = results;

  // Real data always wins; fixtures only fill genuinely empty sections.
  const heroRecipe = (heroRecipeRaw) as AnyRow;
  const recentBrewLog = (recentBrewLogRaw) as AnyRow;
  const beans = ((beansRaw ?? []) as AnyRow[]);
  const recipes = ((recipesRaw ?? []) as AnyRow[]);
  const posts = ((postsRaw ?? []) as AnyRow[]);
  const inventory = ((inventoryRaw ?? []) as AnyRow[]);
  const roasters = ((roastersRaw ?? []) as AnyRow[]);

  const origins = Array.from(
    new Set(((originRows ?? []) as AnyRow[]).map((r) => r.origin_country).filter(Boolean)),
  ).slice(0, 10) as string[];

  const displayName = profile?.name ?? profile?.username ?? "";
  const featureBean = beans[0];
  const featureRoaster = roasters[0];

  return (
    <div className="pb-6">
      {/* ================================================================= */}
      {/* MASTHEAD — greeting + search, sitting on the warm page ground     */}
      {/* ================================================================= */}
      <header className="relative mx-auto max-w-6xl px-4 pb-7 pt-7 sm:px-6 sm:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 animate-rise">
            <p className="type-eyebrow text-[var(--color-copper)]">{t(greetingKey())}</p>
            <h1 className="type-headline mt-2.5 text-balance text-[var(--color-espresso)]">
              {isGuest || !displayName ? t("home.greetingGuest") : t("home.greeting", { name: displayName })}
            </h1>
            <p className="type-lede mt-3 max-w-[34ch] text-[var(--color-muted-text)]">{t("brand.tagline")}</p>
          </div>

          {user ? (
            <Link
              href="/profile"
              className="lift relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-warm-lg ring-2 ring-[var(--surface-raised)] sm:h-16 sm:w-16"
            >
              <ImageWithFallback
                src={profile?.avatar_url}
                alt={displayName}
                fallbackSeed={user.id}
                artKind="roaster"
                fill
                sizes="64px"
              />
            </Link>
          ) : null}
        </div>

        <div className="animate-rise delay-1 mt-6">
          <HomeSearchBar placeholder={t("home.searchPlaceholder")} />
        </div>
      </header>

      {/* ================================================================= */}
      {/* 01 — THE COVER                                                    */}
      {/* ================================================================= */}
      <section className="animate-rise delay-2 mx-auto max-w-6xl px-4 sm:px-6">
        {heroRecipe ? (
          <FeatureSpread
            height="epic"
            eyebrow={t("home.heroEyebrow")}
            title={heroRecipe.bean ? localizedField(heroRecipe.bean, "name", locale) : heroRecipe.title}
            subtitle={heroRecipe.notes ?? undefined}
            chips={heroRecipe.flavor_notes ?? []}
            meta={[
              heroRecipe.brew_method ? { label: t("recipe.brewThis"), value: t(brewMethodLabelKey(heroRecipe.brew_method)) } : null,
              heroRecipe.dose_grams ? { label: t("recipe.dose"), value: `${heroRecipe.dose_grams}g` } : null,
              heroRecipe.water_grams ? { label: t("recipe.water"), value: `${heroRecipe.water_grams}g` } : null,
              heroRecipe.total_time_seconds ? { label: t("recipe.totalTime"), value: fmtTime(heroRecipe.total_time_seconds)! } : null,
            ].filter(Boolean) as Array<{ label: string; value: string }>}
            href={`/recipes/${heroRecipe.id}`}
            ctaLabel={t("home.heroCtaStart")}
            seed={heroRecipe.id}
            artKind="scene"
            overlaySlot={
              <SaveButton
                table="recipe_saves"
                itemId={heroRecipe.id}
                isAuthenticated={Boolean(user)}
                size="lg"
                className="glass text-white [&_svg]:text-white"
              />
            }
          />
        ) : (
          <RichEmptyState
            icon={Coffee}
            title={t("home.heroEmptyTitle")}
            description={t("home.heroEmptyHint")}
            action={
              <Link
                href="/discover?category=recipes"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink-fixed)] px-5 py-2.5 text-sm font-bold text-[var(--color-cream)] transition-transform hover:scale-105"
              >
                {t("home.heroEmptyCta")}
              </Link>
            }
          />
        )}
      </section>

      {/* ================================================================= */}
      {/* 02 — CONTINUE BREWING (wide editorial strip)                      */}
      {/* ================================================================= */}
      {recentBrewLog ? (
        <section className="animate-rise delay-3 mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <SectionIntro index="01" eyebrow={t("home.heroEyebrow")} title={t("home.continueBrewingTitle")} />
          <Link
            href={recentBrewLog.recipe ? `/recipes/${recentBrewLog.recipe.id}` : "/v60"}
            className="zoom-frame lift texture-grain group relative flex min-h-[180px] items-end overflow-hidden rounded-[var(--radius-feature)] shadow-warm-xl sm:min-h-[220px]"
          >
            <span className="absolute inset-0 block">
              <EditorialMedia src={null} alt={recentBrewLog.recipe?.title ?? ""} seed={recentBrewLog.id} artKind="scene" />
            </span>
            <span aria-hidden className="scrim-bottom absolute inset-0" />
            <span className="relative flex w-full items-end justify-between gap-4 p-6 sm:p-8">
              <span className="min-w-0">
                <span className="type-eyebrow block text-[var(--color-caramel)]">
                  {t(brewMethodLabelKey(recentBrewLog.brew_method))}
                </span>
                <span className="type-subtitle mt-2 block truncate text-[var(--color-cream)]">
                  {recentBrewLog.recipe?.title ?? t("home.continueBrewingTitle")}
                </span>
                <span className="mt-2 flex gap-4 text-xs text-white/60 tabular-nums">
                  {recentBrewLog.dose_grams ? <span>{recentBrewLog.dose_grams}g</span> : null}
                  {recentBrewLog.water_grams ? <span>{recentBrewLog.water_grams}g</span> : null}
                  {recentBrewLog.actual_time_seconds ? <span>{fmtTime(recentBrewLog.actual_time_seconds)}</span> : null}
                </span>
              </span>
              <span className="glass flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110">
                <Play className="h-5 w-5 fill-current" aria-hidden />
              </span>
            </span>
          </Link>
        </section>
      ) : null}

      {/* ================================================================= */}
      {/* 03 — METHODS as an inverted roast band                            */}
      {/* ================================================================= */}
      <RoastBand className="mt-14">
        <SectionIntro
          index="02"
          eyebrow={t("brand.name")}
          title={t("home.quickBrewTitle")}
          lede={t("brewHub.subtitle")}
          href="/brew"
          hrefLabel={t("home.seeAll")}
          invert
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {METHODS.map((m, i) => (
            <Link
              key={m.code}
              href={m.href}
              className={`zoom-frame lift group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-4 animate-rise delay-${Math.min(i + 1, 5)}`}
            >
              <span className="absolute inset-0 block">
                <CoffeeArt seed={`method-${m.code}`} kind="beans" />
              </span>
              <span aria-hidden className="scrim-bottom absolute inset-0" />
              <span className="glass relative mb-auto flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform duration-500 group-hover:scale-110">
                <m.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="relative mt-3 block text-sm font-extrabold text-[var(--color-cream)]">
                {t(brewMethodLabelKey(m.code))}
              </span>
              <span className="relative mt-0.5 block text-[11px] leading-snug text-white/55">{t(m.hintKey)}</span>
            </Link>
          ))}
        </div>
      </RoastBand>

      {/* ================================================================= */}
      {/* 04 — TRENDING RECIPES rail                                        */}
      {/* ================================================================= */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <SectionIntro
          index="03"
          eyebrow={t("home.trendingSubtitle")}
          title={t("home.trendingTitle")}
          href="/discover?category=recipes"
          hrefLabel={t("home.seeAll")}
        />
        <HorizontalCarousel>
          {recipes.slice(0, 8).map((r: AnyRow) => (
            <EditorialTile
              key={r.id}
              className="w-[250px]"
              href={`/recipes/${r.id}`}
              title={r.title}
              kicker={r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null}
              footnote={[
                r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
                fmtTime(r.total_time_seconds),
                difficultyLabel(t, r.difficulty),
              ]
                .filter(Boolean)
                .join("  ·  ")}
              seed={r.id}
              artKind="pourover"
              ratio="portrait"
              cornerSlot={
                <SaveButton table="recipe_saves" itemId={r.id} isAuthenticated={Boolean(user)} size="sm" />
              }
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* ================================================================= */}
      {/* 05 — FEATURED BEAN as a split spread                              */}
      {/* ================================================================= */}
      {featureBean ? (
        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <SplitFeature
            eyebrow={featureBean.origin_country ?? t("home.recommendedBeansTitle")}
            title={localizedField(featureBean, "name", locale)}
            body={localizedField(featureBean, "description", locale) || undefined}
            href={`/beans/${featureBean.slug}`}
            ctaLabel={t("home.seeAll")}
            seed={featureBean.id}
            imageUrl={featureBean.images?.[0]?.url}
            artKind="scene"
          />
        </section>
      ) : null}

      {/* ================================================================= */}
      {/* 06 — BEAN COLLECTION rail (tall luxury product tiles)             */}
      {/* ================================================================= */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <SectionIntro
          index="04"
          eyebrow={t("home.originsSubtitle")}
          title={t("home.recommendedBeansTitle")}
          href="/discover?category=beans"
          hrefLabel={t("home.seeAll")}
        />
        <HorizontalCarousel>
          {beans.slice(0, 10).map((b: AnyRow) => (
            <EditorialTile
              key={b.id}
              className="w-[210px]"
              href={`/beans/${b.slug}`}
              title={localizedField(b, "name", locale)}
              kicker={b.origin_country}
              footnote={b.roaster ? localizedField(b.roaster, "name", locale) : null}
              chips={[roastLabel(t, b.roast_level), processLabel(t, b.process)].filter(Boolean) as string[]}
              seed={b.id}
              imageUrl={b.images?.[0]?.url}
              artKind="bag"
              ratio="tall"
              badge={
                typeof b.rating === "number" ? (
                  <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
                    <Star className="h-3 w-3 fill-[var(--color-caramel)] text-[var(--color-caramel)]" aria-hidden />
                    <span className="tabular-nums">{b.rating.toFixed(1)}</span>
                  </span>
                ) : null
              }
              cornerSlot={<SaveButton table="bean_saves" itemId={b.id} isAuthenticated={Boolean(user)} size="sm" />}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* ================================================================= */}
      {/* 07 — ORIGINS                                                      */}
      {/* ================================================================= */}
      {origins.length > 0 ? (
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <SectionIntro index="05" eyebrow={t("home.originsSubtitle")} title={t("home.originsTitle")} />
        <HorizontalCarousel>
          {origins.map((origin) => (
            <EditorialTile
              key={origin}
              className="w-[190px]"
              href={`/discover?category=beans&q=${encodeURIComponent(origin)}`}
              title={origin}
              kicker={t("home.beanCountLabel")}
              seed={`origin-${origin}`}
              artKind="beans"
              ratio="square"
            />
          ))}
        </HorizontalCarousel>
      </section>
      ) : null}

      {/* ================================================================= */}
      {/* 08 — ROASTER FEATURE (reversed split)                             */}
      {/* ================================================================= */}
      {featureRoaster ? (
        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <SplitFeature
            reverse
            eyebrow={t("home.roastersSubtitle")}
            title={localizedField(featureRoaster, "name", locale)}
            body={localizedField(featureRoaster, "description", locale) || undefined}
            href={`/roasters/${featureRoaster.slug}`}
            ctaLabel={t("home.roastersTitle")}
            seed={featureRoaster.id}
            imageUrl={featureRoaster.logo_url}
            artKind="roaster"
          />
        </section>
      ) : null}

      {/* ================================================================= */}
      {/* 09 — YOUR SHELF + STATS (inverted band)                           */}
      {/* ================================================================= */}
      {inventory.length > 0 ? (
      <RoastBand className="mt-16">
        <SectionIntro
          index="06"
          eyebrow={t("brand.name")}
          title={t("home.myBeansTitle")}
          href="/gear/beans"
          hrefLabel={t("home.seeAll")}
          invert
        />

        <StatRibbon
          invert
          className="mb-8"
          stats={[
            { icon: Coffee, value: brewCount ?? 0, label: t("home.statBrews") },
            { icon: Package, value: inventory.length, label: t("home.statBeans") },
            { icon: Sparkles, value: recipes.length, label: t("home.statRecipes") },
            { icon: Flame, value: 7, label: t("home.statStreak") },
          ]}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {inventory.slice(0, 4).map((bag: AnyRow) => {
            const pct = bag.original_weight_grams
              ? Math.max(5, Math.round((bag.remaining_weight_grams / bag.original_weight_grams) * 100))
              : 0;
            return (
              <Link key={bag.id} href="/gear/beans" className="zoom-frame lift group relative block overflow-hidden rounded-[var(--radius-card)]">
                <span className="relative block aspect-[3/4]">
                  <EditorialMedia src={null} alt={localizedField(bag.bean, "name", locale)} seed={bag.id} artKind="bag" />
                  <span aria-hidden className="scrim-bottom absolute inset-0" />
                  <span className="absolute inset-x-0 bottom-0 p-3.5">
                    <span className="block truncate text-sm font-extrabold text-[var(--color-cream)]">
                      {localizedField(bag.bean, "name", locale)}
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                        <span
                          className="block h-full rounded-full bg-[var(--color-caramel)]"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-[10px] font-bold text-white/70 tabular-nums">
                        {bag.remaining_weight_grams}g
                      </span>
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </RoastBand>
      ) : null}

      {/* ================================================================= */}
      {/* 10 — COMMUNITY                                                    */}
      {/* ================================================================= */}
      {posts.length > 0 ? (
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <SectionIntro
          index="07"
          eyebrow={t("community.title")}
          title={t("home.communityTitle")}
          href="/community"
          hrefLabel={t("home.seeAll")}
        />
        {/* Asymmetric: one large lead post, the rest as a stacked column. */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {posts[0] ? (
            <EditorialTile
              href={`/community/${posts[0].id}`}
              title={posts[0].body ?? ""}
              kicker={posts[0].author?.name ?? posts[0].author?.username}
              footnote={posts[0].recipe?.title}
              seed={posts[0].id}
              imageUrl={posts[0].media?.[0]?.url}
              artKind="post"
              ratio="landscape"
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {posts.slice(1, 3).map((p: AnyRow) => (
              <EditorialTile
                key={p.id}
                href={`/community/${p.id}`}
                title={p.body ?? ""}
                kicker={p.author?.name ?? p.author?.username}
                seed={p.id}
                imageUrl={p.media?.[0]?.url}
                artKind="post"
                ratio="landscape"
              />
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {/* ================================================================= */}
      {/* 11 — EXPLORE closer                                               */}
      {/* ================================================================= */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <Link
          href="/discover"
          className="zoom-frame lift texture-grain group relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-[var(--radius-feature)] p-8 text-center shadow-warm-xl"
        >
          <span className="absolute inset-0 block">
            <CoffeeArt seed="explore-closer" kind="beans" />
          </span>
          <span aria-hidden className="absolute inset-0 bg-[var(--warm-950)]/70" />
          <span className="relative">
            <span className="type-eyebrow block text-[var(--color-caramel)]">{t("nav.discover")}</span>
            <span className="type-title mt-3 block text-balance text-[var(--color-cream)]">
              {t("discover.emptyBeansHint")}
            </span>
            <span className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-[var(--color-cream)] px-6 py-3 text-sm font-bold text-[var(--color-ink-fixed)] transition-transform duration-300 group-hover:scale-105">
              <Compass className="h-4 w-4" aria-hidden />
              {t("home.seeAll")}
            </span>
          </span>
        </Link>
      </section>

    </div>
  );
}
