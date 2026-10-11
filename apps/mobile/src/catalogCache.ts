import type { Bundle, CoffeeItem, RecipeItem } from './data';
import { emptyProfile, isMethod } from './core/engine';

export const CACHE_VERSION = 2;
export const CACHE_MAX_AGE = 7 * 86400000;
export const MAX_STORAGE_BYTES = 1_500_000;
/** Bound serialized payloads by bytes; Arabic and emoji use multiple bytes. */
function storageBytes(value: string): number {
  if (value.length > MAX_STORAGE_BYTES) return value.length;
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > MAX_STORAGE_BYTES) return bytes;
  }
  return bytes;
}
export const storageFits = (value: string): boolean => storageBytes(value) <= MAX_STORAGE_BYTES;
type Locale = 'ar' | 'en' | 'ja';
export type PublicCatalog = Pick<Bundle, 'coffees' | 'recipes' | 'recipeTotal' | 'limited'>;
export const catalogCacheKey = (project: string, locale: Locale) => `beanmora-public-catalog-v2:${project}:${locale}`;

/** Device profiles enrich recipes; their failure does not mean the catalog is offline. */
export function catalogReadFailed(bundle: Bundle): boolean {
  return !!bundle.failures &&
    [bundle.failures.beans, bundle.failures.products, bundle.failures.recipes].some(Boolean);
}

/** Cache persistence is optional and must never turn a successful request into a failure. */
export function scheduleCatalogSave(save: () => void | Promise<void>): () => void {
  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    void Promise.resolve().then(save).catch(() => {});
  };
  if (
    typeof globalThis.requestIdleCallback === 'function' &&
    typeof globalThis.cancelIdleCallback === 'function'
  ) {
    const id = globalThis.requestIdleCallback(run, { timeout: 1000 });
    return () => {
      cancelled = true;
      globalThis.cancelIdleCallback(id);
    };
  }
  // Safari and some embedded web views do not provide the idle callback API.
  const id = setTimeout(run, 0);
  return () => {
    cancelled = true;
    clearTimeout(id);
  };
}

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
  const serialize = (data: PublicCatalog) => JSON.stringify({ version: CACHE_VERSION, project, locale, savedAt, data });
  const complete = serialize(data);
  if (storageFits(complete)) return complete;

  // Larger catalogs must still leave a usable offline copy. Keep whole records,
  // including sources, brew settings and both languages; disclose the subset.
  const subset: PublicCatalog = { coffees: [], recipes: [], recipeTotal: bundle.recipeTotal, limited: true };
  let available = MAX_STORAGE_BYTES - storageBytes(serialize(subset));
  const add = <T,>(rows: T[], target: T[], budget = available): T[] => {
    const omitted: T[] = [];
    for (const row of rows) {
      const bytes = storageBytes(JSON.stringify(row)) + (target.length ? 1 : 0);
      if (bytes > budget || bytes > available) {
        omitted.push(row);
        continue;
      }
      target.push(row);
      budget -= bytes;
      available -= bytes;
    }
    return omitted;
  };
  // Reserve room for each collection, then use any spare space for more coffee.
  const remainingCoffees = add(bundle.coffees, subset.coffees, Math.floor(available / 2));
  add(bundle.recipes, subset.recipes);
  add(remainingCoffees, subset.coffees);
  const keptCoffees = new Set(subset.coffees);
  subset.coffees = bundle.coffees.filter(coffee => keptCoffees.has(coffee));
  if (!subset.coffees.length && !subset.recipes.length) return null;
  const value = serialize(subset);
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
    limited: next.limited || (previous.limited && catalogReadFailed(next)),
    recipeTotal: f.recipes ? previous.recipeTotal : next.recipeTotal };
}
