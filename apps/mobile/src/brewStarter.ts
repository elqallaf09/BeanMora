import type { RecipeItem } from './data';
import { doseLabel, waterLabel } from './manualBrew';

/** A manufacturer's general guide must not borrow another coffee's identity or compatibility. */
export function isGeneralBrewGuide(recipe: RecipeItem): boolean {
  return recipe.public && recipe.method !== 'xbloom'
    && ['official_manufacturer', 'official_roaster', 'verified_barista'].includes(recipe.recipeType)
    && !recipe.beanId && !recipe.productId && !recipe.discovery?.coffeeName
    && !recipe.discovery?.applicableCoffeeNames.length
    && !recipe.sourceBrew.manual?.applies_to_coffee_names?.length
    && recipe.sources.length > 0 && recipe.steps.length > 0
    && doseLabel(recipe) !== '—' && waterLabel(recipe) !== '—';
}
