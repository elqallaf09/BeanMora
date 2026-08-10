import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { GuidedBrewClient, type GuidedRecipe } from "./guided-brew-client";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function quickStartRecipe(t: (k: string) => string): GuidedRecipe {
  return {
    title: t("v60.heroTitle"),
    doseGrams: 18,
    waterGrams: 300,
    steps: [
      { key: "bloom", label: t("v60.stepBloom"), atSeconds: 0, targetWaterGrams: 36, isBloom: true },
      { key: "pour1", label: t("v60.stepPour1"), atSeconds: 45, targetWaterGrams: 180 },
      { key: "pour2", label: t("v60.stepPour2"), atSeconds: 90, targetWaterGrams: 300 },
      { key: "drawdown", label: t("v60.stepDrawdown"), atSeconds: 165, targetWaterGrams: 300 },
    ],
  };
}

export default async function V60BrewPage({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string; bean?: string }>;
}) {
  const { recipe: recipeId, bean: beanId } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations();

  let guidedRecipe: GuidedRecipe = quickStartRecipe(t);
  if (beanId) guidedRecipe = { ...guidedRecipe, beanId };

  if (recipeId) {
    const { data: recipe } = await supabase
      .from("recipes")
      .select("id, title, dose_grams, water_grams, bean_id, steps:recipe_steps(step_number, title, duration_seconds), pours:recipe_pours(pour_number, water_grams, start_at_seconds, is_bloom)")
      .eq("id", recipeId)
      .maybeSingle();

    const r = recipe as AnyRow;
    if (r) {
      const pours = (r.pours ?? []).sort((a: AnyRow, b: AnyRow) => a.pour_number - b.pour_number);
      let cumulative = 0;
      const steps =
        pours.length > 0
          ? pours.map((p: AnyRow, i: number) => {
              cumulative += Number(p.water_grams);
              return {
                key: `pour-${i}`,
                label: p.is_bloom ? t("v60.stepBloom") : `${t("v60.stepPour1")} ${i + 1}`,
                atSeconds: p.start_at_seconds,
                targetWaterGrams: Math.round(cumulative),
                isBloom: p.is_bloom,
              };
            })
          : quickStartRecipe(t).steps;

      guidedRecipe = {
        recipeId: r.id,
        beanId: r.bean_id,
        title: r.title,
        doseGrams: Number(r.dose_grams) || 18,
        waterGrams: Number(r.water_grams) || 300,
        steps,
      };
    }
  }

  return <GuidedBrewClient recipe={guidedRecipe} />;
}
