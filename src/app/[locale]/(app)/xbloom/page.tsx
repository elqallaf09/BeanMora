import { getLocale, getTranslations } from "next-intl/server";
import { Lock, Plus, Sparkles, Smartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { AbstractCoffeeBackground } from "@/components/coffee/fallback-art";
import { SectionIntro } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { BeanCard, type BeanCardData } from "@/components/coffee/cards";
import { SaveButton } from "@/components/coffee/save-button";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { XBloomRecipeActions } from "./recipe-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function XBloomHubPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const beanSelect =
    "id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position)";

  const [{ data: devices }, { data: recommendedBeans }, { data: savedRecipes }] = await Promise.all([
    user ? supabase.from("xbloom_devices").select("id, model, nickname, is_default").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    supabase.from("beans").select(beanSelect).eq("is_published", true).eq("suitable_for_xbloom", true).order("created_at", { ascending: false }).limit(8),
    user
      ? supabase
          .from("recipe_saves")
          .select(
            "recipe:recipes!inner(id, title, dose_grams, water_grams, grinder_setting, water_temp_c, brew_method, xbloom_profile:xbloom_recipe_profiles(dose_grams, water_grams, grind_setting, water_temp_c, compatibility_status))",
          )
          .eq("user_id", user.id)
          .eq("recipe.brew_method", "xbloom")
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const savedXbloomRecipes: AnyRow[] = (savedRecipes ?? []).map((s: AnyRow) => s.recipe).filter(Boolean);
  const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

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
    };
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:py-8">
      <AbstractCoffeeBackground
        seed="xbloom-hero"
        className="relative isolate overflow-hidden rounded-3xl px-6 py-10 text-center text-white shadow-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-espresso)]/85 via-[var(--color-espresso)]/40 to-transparent" />
        <div className="relative flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Sparkles className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("xbloomHub.heroTitle")}</h1>
          <p className="text-sm text-white/80">{t("xbloomHub.heroSubtitle")}</p>
          <p className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            <Lock className="h-3 w-3" aria-hidden />
            {t("xbloomHub.disconnectedNote")}
          </p>
        </div>
      </AbstractCoffeeBackground>

      {/* Devices */}
      <section className="mt-6">
        <SectionIntro title={t("xbloomHub.devicesTitle")} />
        {!devices || devices.length === 0 ? (
          <RichEmptyState
            icon={Smartphone}
            title={t("xbloomHub.devicesEmptyTitle")}
            description={t("xbloomHub.devicesEmptyHint")}
            action={
              <Button variant="accent" size="sm" asChild>
                <Link href="/settings">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("xbloomHub.addDevice")}
                </Link>
              </Button>
            }
            className="py-8"
          />
        ) : (
          <div className="flex gap-2 overflow-x-auto">
            {devices.map((d: AnyRow) => (
              <div key={d.id} className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)]">
                <Smartphone className="h-4 w-4 text-[var(--color-teal)]" aria-hidden />
                {d.nickname || (d.model === "xbloom_studio" ? "xBloom Studio" : "xBloom Original")}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended beans */}
      <section className="mt-8">
        <SectionIntro title={t("xbloomHub.recommendedBeansTitle")} href="/discover?category=beans&method=xbloom" hrefLabel={t("home.seeAll")} />
        {!recommendedBeans || recommendedBeans.length === 0 ? (
          <RichEmptyState icon={Sparkles} title={t("xbloomHub.savedRecipesEmptyTitle")} className="py-8" />
        ) : (
          <HorizontalCarousel>
            {recommendedBeans.map((b: AnyRow) => (
              <BeanCard key={b.id} bean={toBeanCard(b)} isAuthenticated={Boolean(user)} labels={compatLabels} />
            ))}
          </HorizontalCarousel>
        )}
      </section>

      {/* Saved xBloom recipes with full settings */}
      <section className="mt-8">
        <SectionIntro title={t("xbloomHub.savedRecipesTitle")} />
        {savedXbloomRecipes.length === 0 ? (
          <RichEmptyState icon={Sparkles} title={t("xbloomHub.savedRecipesEmptyTitle")} description={t("xbloomHub.savedRecipesEmptyHint")} className="py-8" />
        ) : (
          <div className="flex flex-col gap-3">
            {savedXbloomRecipes.map((r: AnyRow) => {
              const profile = r.xbloom_profile?.[0];
              const dose = profile?.dose_grams ?? r.dose_grams;
              const water = profile?.water_grams ?? r.water_grams;
              const grind = profile?.grind_setting ?? r.grinder_setting;
              const temp = profile?.water_temp_c ?? r.water_temp_c;
              return (
                <div key={r.id} className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/recipes/${r.id}`} className="font-bold text-[var(--color-espresso)] hover:underline">
                      {r.title}
                    </Link>
                    <SaveButton table="recipe_saves" itemId={r.id} initialSaved isAuthenticated={Boolean(user)} size="sm" />
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-[var(--color-dark-text)]">{dose ?? "—"}g</p>
                      <p className="text-[var(--color-muted-text)]">{t("xbloomHub.dose")}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-dark-text)]">{water ?? "—"}g</p>
                      <p className="text-[var(--color-muted-text)]">{t("xbloomHub.water")}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-dark-text)]">{grind ?? "—"}</p>
                      <p className="text-[var(--color-muted-text)]">{t("xbloomHub.grind")}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-dark-text)]">{temp ? `${temp}°C` : "—"}</p>
                      <p className="text-[var(--color-muted-text)]">{t("xbloomHub.temp")}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <XBloomRecipeActions
                      settings={{ title: r.title, doseGrams: dose, waterGrams: water, grindSetting: grind, waterTempC: temp }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Direct sync — always disabled today */}
      <section className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--color-border,#ece1d3)] bg-[var(--color-cream)] p-4">
        <div>
          <p className="text-sm font-bold text-[var(--color-espresso)]">{t("xbloomHub.directSyncTitle")}</p>
          <p className="mt-0.5 max-w-md text-xs text-[var(--color-muted-text)]">{t("xbloomHub.directSyncNote")}</p>
        </div>
        <Button disabled variant="outline" size="sm" className="shrink-0">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {t("xbloomHub.directSyncDisabled")}
        </Button>
      </section>
    </div>
  );
}
