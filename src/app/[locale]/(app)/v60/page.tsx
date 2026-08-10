import { getTranslations } from "next-intl/server";
import { Droplet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { difficultyLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { AbstractCoffeeBackground } from "@/components/coffee/fallback-art";
import { SectionIntro } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { RecipeCard, type RecipeCardData } from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function toRecipeCard(r: AnyRow): RecipeCardData {
  return {
    id: r.id,
    title: r.title,
    authorName: r.user?.name ?? r.user?.username ?? null,
    ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
    difficultyLabel: undefined,
    coverSeed: r.id,
  };
}

export default async function V60HubPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recipeSelect =
    "id, title, dose_grams, water_grams, difficulty, user:profiles(name, username)";

  const [{ data: recentBrews }, { data: savedRecipes }, { data: beginnerRecipes }, { data: advancedRecipes }] =
    await Promise.all([
      user
        ? supabase
            .from("brew_logs")
            .select("id, dose_grams, water_grams, actual_time_seconds, created_at, recipe:recipes(id, title)")
            .eq("user_id", user.id)
            .eq("brew_method", "v60")
            .order("created_at", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("recipe_saves")
            .select("recipe:recipes!inner(id, title, dose_grams, water_grams, difficulty, brew_method, user:profiles(name, username))")
            .eq("user_id", user.id)
            .eq("recipe.brew_method", "v60")
            .limit(6)
        : Promise.resolve({ data: [] }),
      supabase
        .from("recipes")
        .select(recipeSelect)
        .eq("brew_method", "v60")
        .eq("visibility", "public")
        .in("difficulty", ["beginner"])
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("recipes")
        .select(recipeSelect)
        .eq("brew_method", "v60")
        .eq("visibility", "public")
        .in("difficulty", ["advanced", "intermediate"])
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const savedV60: AnyRow[] = (((savedRecipes ?? []).map((s: AnyRow) => s.recipe).filter(Boolean)) ?? []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:py-8">
      {/* Hero */}
      <AbstractCoffeeBackground
        seed="v60-hero"
        className="relative isolate overflow-hidden rounded-3xl px-6 py-10 text-center text-white shadow-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-espresso)]/85 via-[var(--color-espresso)]/40 to-transparent" />
        <div className="relative flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Droplet className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("v60.heroTitle")}</h1>
          <p className="text-sm text-white/80">{t("v60.heroSubtitle")}</p>
          <Button asChild size="lg" variant="accent" className="mt-2">
            <Link href="/v60/brew">{t("v60.startQuickBrew")}</Link>
          </Button>
        </div>
      </AbstractCoffeeBackground>

      {/* Recent brews */}
      {user && recentBrews && recentBrews.length > 0 ? (
        <section className="mt-8">
          <SectionIntro title={t("v60.recentTitle")} />
          <div className="flex flex-col gap-2">
            {recentBrews.map((b: AnyRow) => (
              <Link
                key={b.id}
                href={b.recipe ? `/v60/brew?recipe=${b.recipe.id}` : "/v60/brew"}
                className="card-lift flex items-center justify-between rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3"
              >
                <div>
                  <p className="text-sm font-bold text-[var(--color-espresso)]">{b.recipe?.title ?? t("v60.heroTitle")}</p>
                  <p className="text-xs text-[var(--color-muted-text)]">
                    {b.dose_grams}g : {b.water_grams}g
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--color-teal)]">{t("v60.brewAgain")}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Saved recipes */}
      <section className="mt-8">
        <SectionIntro title={t("v60.savedTitle")} />
        {savedV60.length === 0 ? (
          <RichEmptyState icon={Droplet} title={t("v60.savedEmptyTitle")} description={t("v60.savedEmptyHint")} className="py-8" />
        ) : (
          <HorizontalCarousel>
            {savedV60.map((r) => (
              <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} />
            ))}
          </HorizontalCarousel>
        )}
      </section>

      {/* Beginner recipes */}
      <section className="mt-8">
        <SectionIntro title={t("v60.beginnerTitle")} />
        {!beginnerRecipes || beginnerRecipes.length === 0 ? (
          <RichEmptyState icon={Droplet} title={t("v60.savedEmptyTitle")} className="py-8" />
        ) : (
          <HorizontalCarousel>
            {beginnerRecipes.map((r: AnyRow) => (
              <RecipeCard
                key={r.id}
                recipe={{ ...toRecipeCard(r), difficultyLabel: difficultyLabel(t, r.difficulty) ?? null }}
                isAuthenticated={Boolean(user)}
              />
            ))}
          </HorizontalCarousel>
        )}
      </section>

      {/* Advanced recipes */}
      {advancedRecipes && advancedRecipes.length > 0 ? (
        <section className="mt-8">
          <SectionIntro title={t("v60.advancedTitle")} />
          <HorizontalCarousel>
            {advancedRecipes.map((r: AnyRow) => (
              <RecipeCard
                key={r.id}
                recipe={{ ...toRecipeCard(r), difficultyLabel: difficultyLabel(t, r.difficulty) ?? null }}
                isAuthenticated={Boolean(user)}
              />
            ))}
          </HorizontalCarousel>
        </section>
      ) : null}
    </div>
  );
}
