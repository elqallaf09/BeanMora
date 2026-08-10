import { getLocale, getTranslations } from "next-intl/server";
import { Clock, Coffee, Droplets, ExternalLink, Flame, Play, Scale, Star, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { difficultyLabel, brewMethodLabelKey, dataConfidenceLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { AbstractCoffeeBackground } from "@/components/coffee/fallback-art";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { RatingDisplay, FlavorChips } from "@/components/coffee/badges";
import { SaveButton } from "@/components/coffee/save-button";
import { CommentBox } from "@/components/coffee/comment-box";
import { BrewTimeline } from "@/components/coffee/brew-timeline";
import { SectionIntro } from "@/components/coffee/editorial";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function equipmentCategoryKey(c: string) {
  return `myGear.category${c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipeRaw } = await supabase
    .from("recipes")
    .select(
      "id, title, brew_method, dose_grams, water_grams, ratio, water_temp_c, grinder_setting, total_time_seconds, pour_style, difficulty, flavor_notes, notes, recipe_type, is_incomplete_source, created_at, user:profiles(name, username, avatar_url), bean:beans(id, slug, name_ar, name_en), steps:recipe_steps(id, step_number, title, description, duration_seconds), pours:recipe_pours(id, pour_number, water_grams, start_at_seconds, is_bloom), equipment:recipe_equipment(id, category, notes, equipment_model:equipment_models(name, brand:equipment_brands(name))), sources:recipe_sources(source_name, source_url, data_confidence, last_verified_at)",
    )
    .eq("id", id)
    .maybeSingle();
  // See AnyRow comment in bean detail / other pages — Database = any means
  // supabase-js can't infer embedded relation cardinality from real FKs, so
  // many-to-one embeds (user:profiles(...), bean:beans(...)) get typed as
  // arrays even though PostgREST returns a single object here.
  const recipe = recipeRaw as AnyRow;

  if (!recipe) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RichEmptyState
          icon={Coffee}
          title={t("recipe.notFoundTitle")}
          description={t("recipe.notFoundHint")}
          action={
            <Button asChild variant="accent">
              <Link href="/discover">{t("recipe.backToDiscover")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [{ data: mySave }, { data: ratingsRaw }] = await Promise.all([
    user ? supabase.from("recipe_saves").select("id").eq("recipe_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("recipe_ratings")
      .select("id, rating, review, created_at, user:profiles(name, username, avatar_url)")
      .eq("recipe_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const ratings = ((ratingsRaw ?? []) as AnyRow[]);

  const { data: commentsRaw } = await supabase
    .from("comments")
    .select("id, body, created_at, author:profiles(name, username, avatar_url)")
    .eq("recipe_id", id)
    .order("created_at", { ascending: true })
    .limit(50);
  const comments = ((commentsRaw ?? []) as AnyRow[]);

  const authorName = recipe.user?.name ?? recipe.user?.username ?? "";
  // Must go through localizedField — hardcoding name_ar first showed the
  // Arabic name on the English page.
  const beanName = recipe.bean ? localizedField(recipe.bean, "name", locale) : null;
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;

  const steps = [...(recipe.steps ?? [])].sort((a: AnyRow, b: AnyRow) => a.step_number - b.step_number);
  const pours = [...(recipe.pours ?? [])].sort((a: AnyRow, b: AnyRow) => a.pour_number - b.pour_number);
  const equipment = recipe.equipment ?? [];

  // The timeline merges the pour schedule with the written steps: pours
  // carry cumulative water targets, steps carry the instructions. Where a
  // recipe has both, pours win on timing and steps supply the prose.
  let cumulative = 0;
  const timelineSteps = (
    pours.length > 0
      ? pours.map((p: AnyRow, i: number) => {
          cumulative += Number(p.water_grams) || 0;
          // Only borrow step prose when the two lists line up 1:1. A recipe
          // with rinse/drawdown steps has more steps than pours, and zipping
          // by index would caption "Bloom" with "Rinse the filter".
          const matching = steps.length === pours.length ? steps[i] : undefined;
          return {
            id: p.id,
            label: p.is_bloom ? t("recipe.bloomPour") : (matching?.title ?? `${t("recipe.water")} ${i + 1}`),
            detail: matching?.description ?? null,
            atSeconds: p.start_at_seconds,
            targetWaterGrams: Math.round(cumulative),
            isBloom: p.is_bloom,
          };
        })
      : steps.map((s2: AnyRow, i: number) => {
          const at = steps.slice(0, i).reduce((acc: number, x: AnyRow) => acc + (x.duration_seconds ?? 0), 0);
          return {
            id: s2.id,
            label: s2.title,
            detail: s2.description ?? null,
            atSeconds: at,
            targetWaterGrams: null,
            isBloom: false,
          };
        })
  );

  const brewCta =
    recipe.brew_method === "v60"
      ? { href: `/v60/brew?recipe=${recipe.id}`, label: t("recipe.brewThis") }
      : recipe.brew_method === "xbloom"
        ? { href: `/xbloom?recipe=${recipe.id}`, label: t("recipe.openInHub") }
        : recipe.brew_method === "espresso"
          ? { href: `/espresso?recipe=${recipe.id}`, label: t("recipe.openInEspresso") }
          : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:py-8">
      {/* Large editorial hero — the recipe's primary visual, not a caption bar. */}
      <div className="relative isolate min-h-[340px] overflow-hidden rounded-[28px] shadow-2xl shadow-[var(--color-espresso)]/30 sm:min-h-[400px]">
        <div className="absolute inset-0 -z-10">
          <AbstractCoffeeBackground seed={recipe.id} className="h-full w-full" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--color-espresso)] via-[var(--color-espresso)]/60 to-transparent"
        />
        <div className="pointer-events-none absolute end-8 top-6 flex gap-1.5 opacity-55" aria-hidden>
          <span className="animate-steam h-14 w-2 rounded-full bg-white/40 blur-[2px]" />
          <span className="animate-steam-delay h-10 w-2 rounded-full bg-white/30 blur-[2px]" />
        </div>

        <div className="relative flex min-h-[340px] flex-col justify-end gap-3 p-6 text-[var(--color-soft-white)] sm:min-h-[400px] sm:p-9">
          <div className="absolute end-6 top-6 sm:end-9 sm:top-9">
            <SaveButton
              table="recipe_saves"
              itemId={recipe.id}
              initialSaved={Boolean(mySave)}
              isAuthenticated={Boolean(user)}
              size="lg"
              className="bg-white/20 text-white backdrop-blur-md hover:bg-white/30 [&_svg]:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-teal)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg">
              {t(brewMethodLabelKey(recipe.brew_method))}
            </span>
            {recipe.recipe_type === "official_roaster" || recipe.recipe_type === "verified_barista" || recipe.recipe_type === "beanmora_suggested" ? (
              <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
                {t(
                  recipe.recipe_type === "official_roaster"
                    ? "recipe.typeOfficialRoaster"
                    : recipe.recipe_type === "verified_barista"
                      ? "recipe.typeVerifiedBarista"
                      : "recipe.typeBeanmoraSuggested",
                )}
              </span>
            ) : null}
          </div>

          <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
            {recipe.title}
          </h1>

          <p className="text-sm text-white/85">
            {t("recipe.by")}{" "}
            <Link href={`/profile/${recipe.user?.username ?? ""}`} className="font-bold hover:underline">
              {authorName}
            </Link>
            {beanName ? (
              <>
                {" · "}
                <Link href={`/beans/${recipe.bean?.slug ?? ""}`} className="font-bold hover:underline">
                  {beanName}
                </Link>
              </>
            ) : null}
          </p>

          {avgRating !== null ? (
            <div className="flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 backdrop-blur-md">
              <Star className="h-3.5 w-3.5 fill-[var(--color-caramel)] text-[var(--color-caramel)]" aria-hidden />
              <span className="text-sm font-bold tabular-nums">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-white/65">({ratings.length})</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {recipe.dose_grams ? (
          <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3 text-center">
            <Scale className="mx-auto h-4 w-4 text-[var(--color-copper)]" aria-hidden />
            <p className="mt-1 text-sm font-bold text-[var(--color-espresso)] tabular-nums">{recipe.dose_grams}g</p>
            <p className="text-[11px] text-[var(--color-muted-text)]">{t("recipe.dose")}</p>
          </div>
        ) : null}
        {recipe.water_grams ? (
          <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3 text-center">
            <Droplets className="mx-auto h-4 w-4 text-[var(--color-copper)]" aria-hidden />
            <p className="mt-1 text-sm font-bold text-[var(--color-espresso)] tabular-nums">{recipe.water_grams}g</p>
            <p className="text-[11px] text-[var(--color-muted-text)]">{t("recipe.water")}</p>
          </div>
        ) : null}
        {recipe.water_temp_c ? (
          <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3 text-center">
            <Flame className="mx-auto h-4 w-4 text-[var(--color-copper)]" aria-hidden />
            <p className="mt-1 text-sm font-bold text-[var(--color-espresso)] tabular-nums">{recipe.water_temp_c}°</p>
            <p className="text-[11px] text-[var(--color-muted-text)]">{t("recipe.temp")}</p>
          </div>
        ) : null}
        {recipe.total_time_seconds ? (
          <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3 text-center">
            <Clock className="mx-auto h-4 w-4 text-[var(--color-copper)]" aria-hidden />
            <p className="mt-1 text-sm font-bold text-[var(--color-espresso)] tabular-nums">
              {Math.round(recipe.total_time_seconds / 60)}:{String(recipe.total_time_seconds % 60).padStart(2, "0")}
            </p>
            <p className="text-[11px] text-[var(--color-muted-text)]">{t("recipe.totalTime")}</p>
          </div>
        ) : null}
      </div>

      {recipe.difficulty ? (
        <div className="mt-3">
          <Badge variant="outline">{difficultyLabel(t, recipe.difficulty)}</Badge>
        </div>
      ) : null}

      {recipe.flavor_notes?.length ? (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold text-[var(--color-espresso)]">{t("recipe.flavorNotesTitle")}</h2>
          <FlavorChips flavors={recipe.flavor_notes} max={8} />
        </section>
      ) : null}

      {brewCta ? (
        <Button asChild size="lg" variant="accent" className="mt-5 w-full sm:w-auto">
          <Link href={brewCta.href}>
            <Play className="h-4 w-4" aria-hidden />
            {brewCta.label}
          </Link>
        </Button>
      ) : null}

      {/* ---------- Ingredients ---------- */}
      <section className="mt-10">
        <SectionIntro index="01" eyebrow={t("recipe.brewThis")} title={t("recipe.ingredientsTitle")} />
        <ul className="flex flex-col gap-2.5">
          {recipe.bean ? (
            <li className="surface-panel flex items-center gap-4 rounded-[var(--radius-tile)] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-caramel)]/15 text-[var(--color-copper)]">
                <Coffee className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-eyebrow block text-[var(--color-muted-text)]">{t("nav.beans")}</span>
                <Link href={`/beans/${recipe.bean.slug ?? ""}`} className="block truncate font-bold text-[var(--color-espresso)] hover:underline">
                  {beanName}
                </Link>
              </span>
              {recipe.dose_grams ? (
                <span className="shrink-0 text-lg font-extrabold tabular-nums text-[var(--color-espresso)]">{recipe.dose_grams}g</span>
              ) : null}
            </li>
          ) : null}

          {recipe.water_grams ? (
            <li className="surface-panel flex items-center gap-4 rounded-[var(--radius-tile)] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-teal)]/12 text-[var(--color-teal-dark)]">
                <Droplets className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-eyebrow block text-[var(--color-muted-text)]">{t("recipe.water")}</span>
                <span className="block font-bold text-[var(--color-espresso)]">
                  {recipe.water_temp_c ? `${recipe.water_temp_c}°C` : t("recipe.water")}
                </span>
              </span>
              <span className="shrink-0 text-lg font-extrabold tabular-nums text-[var(--color-espresso)]">{recipe.water_grams}g</span>
            </li>
          ) : null}

          {recipe.grinder_setting ? (
            <li className="surface-panel flex items-center gap-4 rounded-[var(--radius-tile)] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-caramel)]/15 text-[var(--color-copper)]">
                <Scale className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-eyebrow block text-[var(--color-muted-text)]">{t("recipeCreate.grinderLabel")}</span>
                <span className="block truncate font-bold text-[var(--color-espresso)]">{recipe.grinder_setting}</span>
              </span>
            </li>
          ) : null}
        </ul>
      </section>

      {/* ---------- Interactive brew timeline ---------- */}
      {timelineSteps.length > 0 ? (
        <section className="mt-12">
          <SectionIntro index="02" eyebrow={t("recipe.poursTitle")} title={t("recipe.stepsTitle")} />
          <BrewTimeline
            steps={timelineSteps}
            totalSeconds={recipe.total_time_seconds ?? null}
            totalWaterGrams={recipe.water_grams ?? null}
          />
        </section>
      ) : null}

      {equipment.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[var(--color-espresso)]">
            <Wrench className="h-4 w-4" aria-hidden />
            {t("recipe.equipmentTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {equipment.map((e: AnyRow) => (
              <Badge key={e.id} variant="outline">
                {e.equipment_model?.name ?? t(equipmentCategoryKey(e.category))}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {recipe.is_incomplete_source ? (
        <p className="mt-6 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2.5 text-xs font-medium text-[var(--color-warning)]">
          {t("recipe.incompleteSource")}
        </p>
      ) : null}

      {recipe.notes ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-[var(--color-espresso)]">{t("recipe.notesTitle")}</h2>
          <p className="text-sm text-[var(--color-dark-text)]">{recipe.notes}</p>
        </section>
      ) : null}

      {(recipe.sources ?? []).length > 0 ? (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-text)]">
          {(recipe.sources as AnyRow[]).map((s: AnyRow, i: number) => (
            <span key={i}>
              {i > 0 ? " · " : `${t("bean.sourcedFrom")}: `}
              {s.source_url ? (
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-[var(--color-teal)] hover:underline"
                >
                  {s.source_name ?? s.source_url}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                (s.source_name ?? dataConfidenceLabel(t, s.data_confidence))
              )}
            </span>
          ))}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[var(--color-espresso)]">
          <Star className="h-4 w-4" aria-hidden />
          {t("recipe.ratingsTitle")}
          {avgRating !== null ? <RatingDisplay rating={avgRating} count={ratings.length} className="ms-1" /> : null}
        </h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-text)]">{t("recipe.noRatingsYet")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ratings
              .filter((r) => r.review)
              .map((r: AnyRow) => (
                <li key={r.id} className="flex gap-2">
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--color-cream)]">
                    <ImageWithFallback src={r.user?.avatar_url} alt={r.user?.name ?? ""} fallbackSeed={r.id} fill sizes="28px" />
                  </div>
                  <div className="rounded-2xl bg-[var(--color-cream)] px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--color-espresso)]">{r.user?.name ?? r.user?.username}</p>
                      <RatingDisplay rating={r.rating} size="sm" />
                    </div>
                    <p className="text-[var(--color-dark-text)]">{r.review}</p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-[var(--color-espresso)]">{t("community.commentsTitle")}</h2>
        <div className="mb-4">
          <CommentBox recipeId={recipe.id} isAuthenticated={Boolean(user)} />
        </div>
        {!comments || comments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-text)]">{t("community.noComments")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c: AnyRow) => (
              <li key={c.id} className="flex gap-2">
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--color-cream)]">
                  <ImageWithFallback src={c.author?.avatar_url} alt={c.author?.name ?? ""} fallbackSeed={c.id} fill sizes="28px" />
                </div>
                <div className="rounded-2xl bg-[var(--color-cream)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--color-espresso)]">{c.author?.name ?? c.author?.username}</p>
                  <p className="text-[var(--color-dark-text)]">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
