import type { CoffeeItem, RecipeItem } from './data';

export type XBloomModel = 'all' | 'Studio' | 'Original';
export interface XBloomMatch {
  recipe_id: string;
  match_kind: 'exact' | 'similar';
  score: number;
  matching_notes: string[];
  matching_families: string[];
  same_origin: boolean;
  same_process: boolean;
  same_roast: boolean;
  device_model: 'Studio' | 'Original' | null;
}
export interface CoffeeRecipeMatch extends XBloomMatch {
  coffee: Pick<CoffeeItem, 'id' | 'kind' | 'beanId' | 'name' | 'localeContent'>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function xbloomMatchParams(coffee: Pick<CoffeeItem, 'id' | 'kind'>, model: XBloomModel) {
  return {
    ...(coffee.kind === 'product' ? { p_product_id: coffee.id } : { p_bean_id: coffee.id }),
    p_model: model === 'all' ? null : model,
    p_limit: 3,
  };
}
const strings = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80))].slice(0, 20)
  : [];
export function readXBloomMatches(value: unknown): XBloomMatch[] {
  if (!Array.isArray(value)) throw new Error('Invalid xBloom matches');
  return value.slice(0, 6).map((row: unknown) => {
    if (!row || typeof row !== 'object') throw new Error('Invalid xBloom match');
    const r = row as Record<string, unknown>;
    if (typeof r.recipe_id !== 'string' || !UUID.test(r.recipe_id)
      || (r.match_kind !== 'exact' && r.match_kind !== 'similar')
      || typeof r.score !== 'number' || !Number.isFinite(r.score)
      || ![null, 'Studio', 'Original'].includes(r.device_model as null)) throw new Error('Invalid xBloom match');
    return { recipe_id: r.recipe_id, match_kind: r.match_kind, score: r.score,
      matching_notes: strings(r.matching_notes), matching_families: strings(r.matching_families),
      same_origin: r.same_origin === true, same_process: r.same_process === true,
      same_roast: r.same_roast === true, device_model: r.device_model as XBloomMatch['device_model'] };
  });
}
export function attachXBloomMatches(coffee: CoffeeItem, matches: XBloomMatch[], recipes: RecipeItem[]): RecipeItem[] {
  const byId = new Map(recipes.filter(r => r.public && r.method === 'xbloom').map(r => [r.id, r]));
  return matches.flatMap(match => {
    const recipe = byId.get(match.recipe_id);
    return recipe ? [{ ...recipe, coffeeMatch: { ...match, coffee: {
      id: coffee.id, kind: coffee.kind, beanId: coffee.beanId,
      name: coffee.name, localeContent: coffee.localeContent,
    } } }] : [];
  });
}
/** A borrowed profile is logged against the coffee actually brewed. It must
 * not count as an attempt/evidence for the source recipe's original coffee. */
export function coffeeBrewIds(recipe: RecipeItem) {
  if (recipe.labelMatch?.match_kind === 'similar') {
    const target = recipe.labelMatch.coffee;
    return { recipeId: null, beanId: target ? target.kind === 'bean' ? target.id : target.beanId : null,
      productId: target?.kind === 'product' ? target.id : null };
  }
  const coffee = recipe.coffeeMatch?.match_kind === 'similar' ? recipe.coffeeMatch.coffee : null;
  return coffee ? { recipeId: null, beanId: coffee.kind === 'bean' ? coffee.id : coffee.beanId,
    productId: coffee.kind === 'product' ? coffee.id : null }
    : { recipeId: recipe.id, beanId: recipe.beanId, productId: recipe.productId };
}
