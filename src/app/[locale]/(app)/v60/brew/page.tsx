import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/brewing/outcome';
import { GuidedBrewClient, type GuidedRecipe } from './guided-brew-client';
export const dynamic = 'force-dynamic';
function quickStartRecipe(t: (k: string) => string): GuidedRecipe {
  return { title: t('v60.heroTitle'), doseGrams: 18, waterGrams: 300, steps: [
    { key: 'bloom', label: t('v60.stepBloom'), atSeconds: 0, targetWaterGrams: 36, isBloom: true },
    { key: 'pour1', label: t('v60.stepPour1'), atSeconds: 45, targetWaterGrams: 180 },
    { key: 'pour2', label: t('v60.stepPour2'), atSeconds: 90, targetWaterGrams: 300 },
    { key: 'drawdown', label: t('v60.stepDrawdown'), atSeconds: 165, targetWaterGrams: 300 },
  ] };
}
interface RecipeRow { id: string; title: string; bean_id: string | null; dose_grams: number | string | null; water_grams: number | string | null; visibility: string; pours: { pour_number: number; water_grams: number; start_at_seconds: number; is_bloom: boolean }[] }
export default async function V60BrewPage({ searchParams }: { searchParams: Promise<{ recipe?: string; bean?: string }> }) {
  const { recipe: recipeId, bean: beanId } = await searchParams;
  if ((recipeId && !isUuid(recipeId)) || (beanId && !isUuid(beanId))) notFound();
  const t = await getTranslations();
  let guidedRecipe = quickStartRecipe(t);
  if (beanId) guidedRecipe = { ...guidedRecipe, beanId };
  if (recipeId) {
    const client = await createClient();
    const { data, error } = await client.from('recipes').select('id,title,bean_id,dose_grams,water_grams,visibility,pours:recipe_pours(pour_number,water_grams,start_at_seconds,is_bloom)').eq('id', recipeId).eq('brew_method', 'v60').abortSignal(AbortSignal.timeout(8000)).maybeSingle();
    if (error) return <p role="alert" className="p-6">{t('brewOutcome.loadError')}</p>;
    const row = data as RecipeRow | null;
    if (!row) notFound();
    const pours = [...(row.pours ?? [])].sort((a,b) => a.pour_number - b.pour_number);
    let cumulative = 0;
    const steps = pours.length ? pours.map((p,i) => {
      cumulative += Number(p.water_grams);
      return { key: `pour-${i}`, label: p.is_bloom ? t('v60.stepBloom') : `${t('v60.stepPour1')} ${i+1}`, atSeconds: p.start_at_seconds, targetWaterGrams: Math.round(cumulative), isBloom: p.is_bloom };
    }) : quickStartRecipe(t).steps;
    guidedRecipe = { recipeId: row.id, beanId: row.bean_id, title: row.title, doseGrams: Number(row.dose_grams) || 18, waterGrams: Number(row.water_grams) || 300, steps, allowCommunity: row.visibility === 'public' };
  }
  return <GuidedBrewClient recipe={guidedRecipe} />;
}
