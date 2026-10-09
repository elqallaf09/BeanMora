import type { Bundle, CoffeeItem, RecipeItem } from './data';
import { emptyProfile, isMethod } from './core/engine';

export const CACHE_VERSION = 2;
export const CACHE_MAX_AGE = 7 * 86400000;
export const MAX_STORAGE_BYTES = 1_500_000;
/** Bound serialized payloads by bytes; Arabic and emoji use multiple bytes. */
export function storageFits(value: string): boolean {
  if (value.length > MAX_STORAGE_BYTES) return false;
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > MAX_STORAGE_BYTES) return false;
  }
  return true;
}
type Locale = 'ar' | 'en' | 'ja';
export type PublicCatalog = Pick<Bundle, 'coffees' | 'recipes' | 'recipeTotal' | 'limited'>;
export const catalogCacheKey = (project: string, locale: Locale) => `beanmora-public-catalog-v2:${project}:${locale}`;

export function validCoffee(value: unknown): value is CoffeeItem {
  if (!value || typeof value !== 'object') return false;
  const c = value as CoffeeItem;
  return typeof c.id === 'string' && typeof c.name === 'string' && typeof c.roaster === 'string'
    && ['bean', 'product'].includes(c.kind) && c.reviewed === true && c.published === true
    && Array.isArray(c.flavors) && c.flavors.every(f => typeof f === 'string')
    && Array.isArray(c.methods) && c.methods.every(isMethod)
    && Array.isArray(c.images) && c.images.every(image => typeof image === 'string');
}
export function validRecipe(value: unknown): value is RecipeItem {
  if (!value || typeof value !== 'object') return false;
  const r = value as RecipeItem;
  return typeof r.id === 'string' && typeof r.title === 'string' && r.public === true && isMethod(r.method)
    && Array.isArray(r.flavors) && r.flavors.every(f => typeof f === 'string')
    && Array.isArray(r.steps) && r.steps.every(s => s && typeof s.title === 'string' && typeof s.description === 'string')
    && Array.isArray(r.pours) && Array.isArray(r.sources) && Array.isArray(r.equipment)
    && !!r.sourceBrew && typeof r.sourceBrew === 'object';
}
/** Only public catalog fields are written, never a session, saved IDs or account preferences. */
export function encodeCatalog(bundle: Bundle, project: string, locale: Locale, savedAt: number): string | null {
  if (bundle.failures && [bundle.failures.beans, bundle.failures.products, bundle.failures.recipes, bundle.failures.profiles].some(Boolean)) return null;
  const data: PublicCatalog = { coffees: bundle.coffees, recipes: bundle.recipes, recipeTotal: bundle.recipeTotal, limited: bundle.limited };
  const value = JSON.stringify({ version: CACHE_VERSION, project, locale, savedAt, data });
  return storageFits(value) ? value : null;
}
export function decodeCatalog(value: string | null, project: string, locale: Locale, now = Date.now()): { data: Bundle; savedAt: number } | null {
  if (!value || !storageFits(value)) return null;
  try {
    const c = JSON.parse(value);
    if (c.version !== CACHE_VERSION || c.project !== project || c.locale !== locale
      || !Number.isFinite(c.savedAt) || c.savedAt > now || now - c.savedAt > CACHE_MAX_AGE
      || !Array.isArray(c.data?.coffees) || !c.data.coffees.every(validCoffee)
      || !Array.isArray(c.data?.recipes) || !c.data.recipes.every(validRecipe)
      || !Number.isFinite(c.data.recipeTotal) || c.data.recipeTotal < 0) return null;
    return { savedAt: c.savedAt, data: { coffees: c.data.coffees, recipes: c.data.recipes,
      recipeTotal: c.data.recipeTotal, limited: c.data.limited === true, warnings: false,
      profile: emptyProfile(), savedBeanIds: [] } };
  } catch { return null; }
}
/** Successful empty reads replace old rows; only failed sections retain their previous public data. */
export function mergeCatalog(next: Bundle, previous: Bundle | null): Bundle {
  if (!previous || !next.failures) return next;
  const f = next.failures;
  const byKind = (kind: CoffeeItem['kind'], failed: boolean) => (failed ? previous : next).coffees.filter(c => c.kind === kind);
  const profiles = new Map(previous.recipes.map(r => [r.id, r.xBloom]));
  return { ...next, coffees: [...byKind('product', f.products), ...byKind('bean', f.beans)],
    recipes: f.recipes ? previous.recipes : f.profiles ? next.recipes.map(r => ({ ...r, xBloom: r.xBloom ?? profiles.get(r.id) ?? null })) : next.recipes,
    recipeTotal: f.recipes ? previous.recipeTotal : next.recipeTotal };
}
