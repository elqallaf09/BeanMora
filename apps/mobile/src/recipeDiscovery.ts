import { catalogName } from './localizedContent';
import type { SupabaseClient } from '@supabase/supabase-js';
import { flavorGroups, type Flavor, type Method } from './core/engine';
import { safeUrl } from './guards';

export const RECIPE_PAGE_SIZE = 30;
export const RECIPE_DISCOVERY_FIELDS =
  'serving_style,source_coffee_name,source_roaster_name,source_origin_country,source_varietal,source_tasting_notes';
export type RecipeSourceFilter = 'all' | 'official' | 'community';
export type ServingStyle = '' | 'hot' | 'iced' | 'cold';
export type ServingFilter = ServingStyle | 'cold_or_iced';
export interface RecipeDiscoveryFilters {
  flavorNote: string;
  flavorFamily: Flavor | '';
  creatorName: string;
  creatorCountry: string;
  recipeCountry: string;
  recipeName: string;
  servingStyle: ServingFilter;
  coffeeType: string;
  coffeeName: string;
  coffeeOrigin: string;
  roasterName: string;
  sourceName: string;
}
export const emptyRecipeFilters = (): RecipeDiscoveryFilters => ({
  flavorNote: '',
  flavorFamily: '',
  creatorName: '',
  creatorCountry: '',
  recipeCountry: '',
  recipeName: '',
  servingStyle: '',
  coffeeType: '',
  coffeeName: '',
  coffeeOrigin: '',
  roasterName: '',
  sourceName: '',
});
export function recipeFilterCount(filters: RecipeDiscoveryFilters): number {
  return Object.values(filters).filter((value) => value.trim().length > 0)
    .length;
}
export interface RecipeSearch {
  query: string;
  method?: Method;
  source: RecipeSourceFilter;
  model: string;
  filters: RecipeDiscoveryFilters;
  coffee?: { kind: 'bean' | 'product'; id: string };
}
const parameter = (value: string | undefined) =>
  value?.trim().slice(0, 160) || null;
export function recipeSearchParams(search: RecipeSearch) {
  const f = search.filters;
  // Values stay bound JSON parameters, including quotes, %, _ and commas.
  // A text search must never become a PostgREST expression.
  return {
    ...(search.coffee
      ? {
          [search.coffee.kind === 'product' ? 'p_product_id' : 'p_bean_id']:
            search.coffee.id,
        }
      : {}),
    p_query: parameter(search.query),
    p_method: parameter(search.method),
    p_source: search.source === 'all' ? null : search.source,
    p_model:
      search.method === 'xbloom' && search.model !== 'all'
        ? parameter(search.model)
        : null,
    p_flavor_note: parameter(f.flavorNote),
    p_flavor_family: parameter(f.flavorFamily),
    p_creator_name: parameter(f.creatorName),
    p_creator_country: parameter(f.creatorCountry),
    p_recipe_country: parameter(f.recipeCountry),
    p_recipe_name: parameter(f.recipeName),
    p_serving_style: parameter(f.servingStyle),
    p_coffee_type: parameter(f.coffeeType),
    p_coffee_name: parameter(f.coffeeName),
    p_coffee_origin: parameter(f.coffeeOrigin),
    p_roaster_name: parameter(f.roasterName),
    p_source_name: parameter(f.sourceName),
  };
}
function selectWithRecipeSortKeys(fields: string): string {
  const selected: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= fields.length; i += 1) {
    if (fields[i] === '(') depth += 1;
    if (fields[i] === ')') depth -= 1;
    if (i === fields.length || (fields[i] === ',' && depth === 0)) {
      const field = fields.slice(start, i).trim();
      if (field) selected.push(field);
      start = i + 1;
    }
  }
  // The deployed PostgREST RPC projection needs its ORDER BY columns selected.
  // Nested resource columns do not satisfy the parent recipe's sort keys.
  if (!selected.includes('*')) {
    for (const key of ['id', 'updated_at'])
      if (!selected.includes(key)) selected.push(key);
  }
  return selected.join(',');
}
export function recipePageQuery(
  db: Pick<SupabaseClient, 'rpc'>,
  search: RecipeSearch,
  page: number,
  fields: string,
  signal: AbortSignal,
  requestedPageSize = RECIPE_PAGE_SIZE,
) {
  const pageSize =
    Number.isInteger(requestedPageSize) &&
    requestedPageSize > 0 &&
    requestedPageSize <= RECIPE_PAGE_SIZE
      ? requestedPageSize
      : RECIPE_PAGE_SIZE;
  const offset = Math.max(0, Math.floor(page)) * pageSize;
  return db
    .rpc(
      search.coffee ? 'search_public_recipes_v2' : 'search_public_recipes',
      recipeSearchParams(search),
      {
        count: 'exact',
      },
    )
    .select(selectWithRecipeSortKeys(fields))
    .order('updated_at', { ascending: false })
    .order('id')
    .range(offset, offset + pageSize - 1)
    .abortSignal(signal);
}

export type RecipeCriterion = { field: keyof RecipeDiscoveryFilters | 'query'; value: string };
export type RecipeNearMatch = { matched: RecipeCriterion[]; missing: RecipeCriterion[] };
export const recipeFilterLabels: Record<RecipeCriterion['field'], readonly [string,string]> = {
  query: ['البحث','Search'], flavorNote: ['الإيحاء','Tasting note'], flavorFamily: ['النكهة','Flavor'],
  creatorName: ['صانع الوصفة','Creator'], creatorCountry: ['بلد الصانع','Creator country'],
  recipeCountry: ['منشأ الوصفة','Recipe origin'], recipeName: ['اسم الوصفة','Recipe name'],
  servingStyle: ['التقديم','Serving'], coffeeType: ['السلالة','Variety'], coffeeName: ['البن','Coffee'],
  coffeeOrigin: ['منشأ البن','Coffee origin'], roasterName: ['المحمصة','Roaster'], sourceName: ['المصدر','Source'],
};
export function recipeCriterionLabel(criterion: RecipeCriterion, ar: boolean): string {
  const values: Record<string, readonly [string,string]> = {
    chocolate:['شوكولاتة','Chocolate'],nutty:['مكسرات','Nutty'],fruity:['فواكه','Fruity'],
    citrus:['حمضيات','Citrus'],floral:['زهور','Floral'],caramel:['كراميل','Caramel'],spice:['توابل','Spice'],
    hot:['ساخن','Hot'],iced:['مثلج','Iced'],cold:['بارد','Cold'],cold_or_iced:['بارد ومثلج','Cold & iced'],
  };
  const value = criterion.field === 'flavorFamily' || criterion.field === 'servingStyle'
    ? values[criterion.value]?.[ar ? 0 : 1] ?? criterion.value : criterion.value;
  return `${recipeFilterLabels[criterion.field][ar ? 0 : 1]}: ${value}`;
}
function nearMatchCriteria(value: unknown): RecipeCriterion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => item && typeof item === 'object'
    && typeof item.field === 'string' && Object.hasOwn(recipeFilterLabels,item.field)
    && typeof item.value === 'string' && item.value.trim()
      ? [{ field:item.field as RecipeCriterion['field'],value:item.value.slice(0,160) }] : []).slice(0,80);
}
export function recipeSearchCriterionCount(search: RecipeSearch): number {
  return search.query.trim().split(/[\s,،;؛]+/).filter(Boolean).length
    + Object.entries(search.filters).reduce((count,[key,value]) => count + (key === 'servingStyle' ? 0
      : key === 'flavorNote' ? value.split(/[,،;؛]+/).filter((v:string)=>v.trim()).length : value.trim() ? 1 : 0),0);
}
/** Exact public results always win; only an empty successful search can relax text facts. */
export async function recipeCatalogPage(
  db: Pick<SupabaseClient,'rpc'|'from'>, search: RecipeSearch, page: number, fields: string,
  signal: AbortSignal, pageSize = RECIPE_PAGE_SIZE, near = false,
) {
  const matches: Record<string,RecipeNearMatch> = {};
  if (!near) {
    const exact = await recipePageQuery(db,search,page,fields,signal,pageSize);
    if (exact.error || page > 0 || exact.data?.length || recipeSearchCriterionCount(search) < 2)
      return { ...exact,near:false,matches };
  }
  const result = await db.rpc('search_public_recipe_near_matches',{
    ...recipeSearchParams(search),p_limit:pageSize,p_offset:Math.max(0,page)*pageSize,
  }).abortSignal(signal);
  if (result.error) return { ...result,count:null,near,matches };
  const ranked = (result.data ?? []) as { recipe_id:string; matched:unknown; missing:unknown; total_count:number|string }[];
  if (!ranked.length) return { ...result,count:0,near,matches };
  const ids = ranked.map(row=>row.recipe_id);
  const recipes = await db.from('recipes').select(fields).eq('visibility','public').in('id',ids).abortSignal(signal);
  if (recipes.error) return { ...recipes,count:null,near:true,matches };
  const records = new Map((recipes.data ?? []).map(row=>[(row as unknown as {id:string}).id,row]));
  for (const row of ranked) matches[row.recipe_id] = { matched:nearMatchCriteria(row.matched),missing:nearMatchCriteria(row.missing) };
  const count = Number(ranked[0].total_count);
  return { ...recipes,data:ids.flatMap(id=>records.has(id)?[records.get(id)!]:[]),
    count:Number.isSafeInteger(count)&&count>=0?count:ids.length,near:true,matches };
}

export interface RecipeDiscoveryRow {
  source_brew_parameters?: unknown;
  source_author_name?: unknown;
  source_coffee_name?: unknown;
  source_roaster_name?: unknown;
  source_origin_country?: unknown;
  source_varietal?: unknown;
  source_tasting_notes?: unknown;
  serving_style?: unknown;
  flavor_notes?: unknown;
}
export interface RecipeDiscovery {
  creatorName: string | null;
  creatorCountry: string | null;
  recipeCountry: string | null;
  coffeeOrigin: string | null;
  coffeeType: string | null;
  coffeeName: string | null;
  applicableCoffeeNames: string[];
  roasterName: string | null;
  flavorNotes: string[];
  flavorFamilies: Flavor[];
  servingStyle: ServingStyle;
  servingStyleInferred?: boolean;
  sourceUrls: string[];
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 300) : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((value) => (text(value) ? [text(value)!] : [])).slice(0, 20)
    : [];
export function readRecipeDiscovery(
  row: RecipeDiscoveryRow,
  locale: 'ar' | 'en',
): RecipeDiscovery {
  const metadata = object(object(row.source_brew_parameters).discovery);
  const localized = (key: string): string | null =>
    locale === 'ar'
      ? text(metadata[`${key}_ar`]) || text(metadata[key])
      : text(metadata[key]) || text(metadata[`${key}_ar`]);
  const localizedNotes = strings(
    metadata[locale === 'ar' ? 'flavor_notes_ar' : 'flavor_notes'],
  );
  const otherNotes = strings(
    metadata[locale === 'ar' ? 'flavor_notes' : 'flavor_notes_ar'],
  );
  const applicableNames = strings(
    metadata[
      locale === 'ar' ? 'applicable_coffee_names_ar' : 'applicable_coffee_names'
    ],
  );
  const otherApplicableNames = strings(
    metadata[
      locale === 'ar' ? 'applicable_coffee_names' : 'applicable_coffee_names_ar'
    ],
  );
  const notes = localizedNotes.length
    ? localizedNotes
    : otherNotes.length
      ? otherNotes
      : strings(row.flavor_notes).length
        ? strings(row.flavor_notes)
        : (text(row.source_tasting_notes)
            ?.split(/[,،;]/)
            .map((value) => value.trim())
            .filter(Boolean) ?? []);
  const knownStyle = (value: unknown): ServingStyle =>
    value === 'hot' || value === 'iced' || value === 'cold' ? value : '';
  return {
    creatorName:
      catalogName(
        localized('creator_name') || text(row.source_author_name),
        locale,
      ) || null,
    // These two countries have no fallback to coffee origin or roaster address.
    creatorCountry: catalogName(localized('creator_country'), locale) || null,
    recipeCountry: catalogName(localized('recipe_country'), locale) || null,
    coffeeOrigin:
      catalogName(
        localized('coffee_origin') || text(row.source_origin_country),
        locale,
      ) || null,
    coffeeType: localized('coffee_type') || text(row.source_varietal),
    coffeeName:
      catalogName(
        localized('coffee_name') || text(row.source_coffee_name),
        locale,
      ) || null,
    // Only promoted, verified discovery names qualify; a general guide stays empty.
    applicableCoffeeNames: [
      ...new Set(
        applicableNames.length ? applicableNames : otherApplicableNames,
      ),
    ],
    roasterName:
      catalogName(
        localized('roaster_name') || text(row.source_roaster_name),
        locale,
      ) || null,
    flavorNotes: [...new Set(notes)],
    flavorFamilies: flavorGroups([
      ...notes,
      ...strings(metadata.flavor_families),
    ]),
    servingStyle:
      knownStyle(row.serving_style) || knownStyle(metadata.serving_style),
    servingStyleInferred:
      object(metadata.serving_style_evidence).classification === 'inferred',
    sourceUrls: strings(metadata.source_urls).flatMap((value) => {
      const url = safeUrl(value);
      return url ? [url] : [];
    }),
  };
}
