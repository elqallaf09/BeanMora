import type { SupabaseClient } from '@supabase/supabase-js';
import type { Method } from './core/engine';
import type { CoffeeItem, RecipeItem } from './data';
import { loadMatchRecipeDetails } from './useXBloomMatches';
import { readXBloomMatches, type XBloomMatch, type XBloomModel } from './xbloomMatching';
import type { CoffeeLabel } from './coffeeLabel';
export type LabelRecipeMatch = XBloomMatch & {
  same_variety: boolean;
  label: CoffeeLabel;
  coffee?: Pick<CoffeeItem, 'id' | 'kind' | 'beanId'>;
};
export type LabelServing = '' | 'hot' | 'cold_or_iced';
export function coffeeLabelMatchParams(label: CoffeeLabel, method: Method, model: XBloomModel, coffee?: CoffeeItem | null, serving: LabelServing = '') {
  return { p_origin: label.origin.trim().slice(0,160) || null, p_variety: label.variety.trim().slice(0,160) || null,
    p_process: label.process.trim().slice(0,160) || null, p_roast: label.roast.trim().slice(0,160) || null,
    p_notes: label.notes.trim().slice(0,1000) || null, p_method: method,
    p_model: method === 'xbloom' && model !== 'all' ? model : null,
    p_bean_id: coffee?.kind === 'bean' ? coffee.id : null, p_product_id: coffee?.kind === 'product' ? coffee.id : null, p_limit: 6, p_serving: serving || null };
}
export async function loadCoffeeLabelMatches(db: SupabaseClient, label: CoffeeLabel, method: Method, model: XBloomModel,
  locale: 'ar' | 'en', signal: AbortSignal, coffee?: CoffeeItem | null, serving: LabelServing = ''): Promise<RecipeItem[]> {
  const { data, error } = await db.rpc('recipes_for_coffee_label_v2', coffeeLabelMatchParams(label, method, model, coffee, serving)).abortSignal(signal);
  if (error) throw new Error('LABEL_MATCH_UNAVAILABLE');
  const matches = readXBloomMatches(data);
  const recipes = await loadMatchRecipeDetails(db, matches, locale, method, signal);
  const byId = new Map(recipes.filter(r => r.public && r.method === method).map(r => [r.id,r]));
  return matches.flatMap((match, i) => {
    const recipe = byId.get(match.recipe_id);
    return recipe ? [{ ...recipe, labelMatch: { ...match, same_variety: data[i]?.same_variety === true, label: { ...label },
      ...(coffee ? { coffee: { id: coffee.id, kind: coffee.kind, beanId: coffee.beanId } } : {}) } }] : [];
  });
}
