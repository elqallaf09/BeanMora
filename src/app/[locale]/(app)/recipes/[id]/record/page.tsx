import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { BrewOutcomeForm } from '@/components/coffee/brew-outcome-form';
import { METHODS, isUuid, type Method } from '@/lib/brewing/outcome';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
interface RecipeRow { id: string; title: string; bean_id: string | null; visibility: string; brew_method: Method; dose_grams: number | string | null; water_grams: number | string | null }
export default async function RecordBrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations('brewOutcome');
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.from('recipes').select('id,title,bean_id,visibility,brew_method,dose_grams,water_grams').eq('id', id).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) return <div role="alert" className="mx-auto max-w-xl p-6">{t('loadError')} <Link href={`/recipes/${id}`} className="underline">{t('backRecipe')}</Link></div>;
  const recipe = data as RecipeRow | null;
  if (!recipe || !(METHODS as readonly string[]).includes(recipe.brew_method)) notFound();
  return <div lang={locale} className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
    <Link href={`/recipes/${id}`} className="text-sm underline">{t('backRecipe')}</Link>
    <h1 className="break-words text-2xl font-bold text-[var(--color-espresso)]">{recipe.title}</h1>
    <BrewOutcomeForm recipeId={recipe.id} beanId={recipe.bean_id} method={recipe.brew_method} doseGrams={recipe.dose_grams ? Number(recipe.dose_grams) : null} waterGrams={recipe.water_grams ? Number(recipe.water_grams) : null} allowCommunity={recipe.visibility === 'public'} />
  </div>;
}
