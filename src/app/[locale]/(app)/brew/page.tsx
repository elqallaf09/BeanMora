import { getTranslations } from "next-intl/server";
import { Coffee, Droplet, Plus, Snowflake, Sparkles, Wind, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { brewMethodLabelKey } from "@/lib/catalog-labels";
import { BrewTimeline } from "@/components/coffee/brew-timeline";
import { Button } from "@/components/ui/button";
import { SectionIntro } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { BrewMethodCard, RecipeCard, type RecipeCardData } from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const METHODS = [
  { code: "v60", icon: Droplet, accent: "teal" as const, href: "/v60", hintKey: "brew.hintV60" },
  { code: "espresso", icon: Zap, accent: "copper" as const, href: "/espresso", hintKey: "brew.hintEspresso" },
  { code: "xbloom", icon: Sparkles, accent: "caramel" as const, href: "/xbloom", hintKey: "brew.hintXbloom" },
  { code: "aeropress", icon: Wind, accent: "teal" as const, href: "/discover?category=recipes&method=aeropress", hintKey: "brew.hintAeropress" },
  { code: "chemex", icon: Coffee, accent: "copper" as const, href: "/discover?category=recipes&method=chemex", hintKey: "brew.hintChemex" },
  { code: "cold_brew", icon: Snowflake, accent: "caramel" as const, href: "/discover?category=recipes&method=cold_brew", hintKey: "brew.hintColdBrew" },
];

export default async function BrewHubPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: recentBrewLogRaw }, { data: myRecipesRaw }, { data: featuredRaw }] = await Promise.all([
    user
      ? supabase
          .from("brew_logs")
          .select("id, brew_method, actual_time_seconds, dose_grams, water_grams, recipe:recipes(id, title), bean:beans(id, slug, name_ar, name_en)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("recipes")
          .select("id, title, brew_method, dose_grams, water_grams, difficulty, total_time_seconds")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: null }),
    supabase
      .from("recipes")
      .select(
        "id, title, brew_method, dose_grams, water_grams, total_time_seconds, steps:recipe_steps(id, step_number, title, description, duration_seconds), pours:recipe_pours(id, pour_number, water_grams, start_at_seconds, is_bloom)",
      )
      .eq("visibility", "public")
      .eq("brew_method", "v60")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  // See AnyRow comment in other pages — the recipe:recipes(...) embed is
  // mis-inferred as an array (Database = any means supabase-js can't check
  // real FK cardinality), though PostgREST returns a single object here.
  const recentBrewLog = recentBrewLogRaw as AnyRow;
  const myRecipes = ((myRecipesRaw ?? []) as AnyRow[]);

  // Featured recipe drives the live timeline below. Pours carry cumulative
  // water targets; steps supply the prose for each stage.
  const featured = featuredRaw as AnyRow;
  const fPours = [...(featured?.pours ?? [])].sort((a: AnyRow, b: AnyRow) => a.pour_number - b.pour_number);
  const fSteps = [...(featured?.steps ?? [])].sort((a: AnyRow, b: AnyRow) => a.step_number - b.step_number);
  let cumulative = 0;
  const timelineSteps = fPours.length
    ? fPours.map((p: AnyRow, i: number) => {
        cumulative += Number(p.water_grams) || 0;
        // Only borrow step prose when steps and pours line up 1:1 — see the
        // same guard on the recipe detail page.
        const matching = fSteps.length === fPours.length ? fSteps[i] : undefined;
        return {
          id: p.id,
          label: p.is_bloom ? t("recipe.bloomPour") : (matching?.title ?? `${t("recipe.water")} ${i + 1}`),
          detail: matching?.description ?? null,
          atSeconds: p.start_at_seconds,
          targetWaterGrams: Math.round(cumulative),
          isBloom: p.is_bloom,
        };
      })
    : fSteps.map((st: AnyRow, i: number) => ({
        id: st.id,
        label: st.title,
        detail: st.description ?? null,
        atSeconds: fSteps.slice(0, i).reduce((a: number, x: AnyRow) => a + (x.duration_seconds ?? 0), 0),
        targetWaterGrams: null,
        isBloom: false,
      }));

  function toRecipeCard(r: AnyRow): RecipeCardData {
    return {
      id: r.id,
      title: r.title,
      ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
      brewTimeLabel: r.total_time_seconds
        ? `${Math.floor(r.total_time_seconds / 60)}:${String(r.total_time_seconds % 60).padStart(2, "0")}`
        : null,
      methodLabel: r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null,
      coverSeed: r.id,
    };
  }

  const brewLogHref = recentBrewLog?.recipe?.id
    ? `/recipes/${recentBrewLog.recipe.id}`
    : recentBrewLog?.brew_method === "espresso"
      ? "/espresso"
      : recentBrewLog?.brew_method === "xbloom"
        ? "/xbloom"
        : "/v60";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p>
          <h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("brewHub.title")}</h1>
          <p className="type-lede mt-3 max-w-[34ch] text-[var(--color-muted-text)]">{t("brewHub.subtitle")}</p>
        </div>
        {user ? (
          <Button asChild variant="accent" size="sm" className="hidden shrink-0 sm:inline-flex">
            <Link href="/recipes/create">
              <Plus className="h-4 w-4" aria-hidden />
              {t("brewHub.createCta")}
            </Link>
          </Button>
        ) : null}
      </div>

      <section aria-labelledby="brew-methods-heading">
        <SectionIntro title={t("brewHub.methodsTitle")} />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {METHODS.map((m) => (
            <BrewMethodCard
              key={m.code}
              icon={m.icon}
              label={t(brewMethodLabelKey(m.code))}
              hint={t(m.hintKey)}
              href={m.href}
              accent={m.accent}
              className="w-full"
            />
          ))}
        </div>
      </section>

      {timelineSteps.length > 0 ? (
        <section className="mt-12" aria-labelledby="live-timeline-heading">
          <SectionIntro
            index="01"
            eyebrow={featured.title}
            title={t("brewHub.timelineTitle")}
            lede={t("brewHub.timelineLede")}
            href={`/recipes/${featured.id}`}
            hrefLabel={t("home.seeAll")}
          />
          <BrewTimeline
            steps={timelineSteps}
            totalSeconds={featured.total_time_seconds ?? null}
            totalWaterGrams={featured.water_grams ?? null}
          />
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="continue-brewing-heading">
        <SectionIntro title={t("brewHub.continueTitle")} />
        {recentBrewLog ? (
          <Link
            href={brewLogHref}
            className="card-lift flex items-center gap-4 rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)]">
              <ImageWithFallback src={null} alt={recentBrewLog.recipe?.title ?? ""} fallbackSeed={recentBrewLog.id} artKind="cup" fill sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-bold text-[var(--color-espresso)]">
                {recentBrewLog.recipe?.title ?? t(brewMethodLabelKey(recentBrewLog.brew_method))}
              </p>
              <p className="text-xs text-[var(--color-muted-text)]">
                {recentBrewLog.dose_grams ? `${recentBrewLog.dose_grams}g` : ""}
                {recentBrewLog.water_grams ? ` : ${recentBrewLog.water_grams}g` : ""}
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0">
              {t("brewHub.continueCta")}
            </Button>
          </Link>
        ) : (
          <RichEmptyState
            icon={Coffee}
            title={t("brewHub.continueEmptyTitle")}
            description={t("brewHub.continueEmptyHint")}
            className="py-8"
          />
        )}
      </section>

      {user ? (
        <section className="mt-8" aria-labelledby="my-recipes-heading">
          <SectionIntro title={t("brewHub.myRecipesTitle")} />
          {myRecipes.length === 0 ? (
            <RichEmptyState
              icon={Coffee}
              title={t("brewHub.myRecipesEmptyTitle")}
              description={t("brewHub.myRecipesEmptyHint")}
              action={
                <Button asChild variant="accent">
                  <Link href="/recipes/create">{t("brewHub.createCta")}</Link>
                </Button>
              }
              className="py-8"
            />
          ) : (
            <HorizontalCarousel>
              {myRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} />
              ))}
            </HorizontalCarousel>
          )}
        </section>
      ) : null}
    </div>
  );
}
