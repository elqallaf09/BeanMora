import type { SupabaseClient } from '@supabase/supabase-js';
import { communityEvidence, emptyProfile, isMethod, ROASTS, validChoice, type Coffee, type Recipe, type Profile, type Method } from './core/engine';
import { safeUrl } from './guards';
export interface CoffeeItem extends Coffee { description: string; origin: string; sourceUrl: string | null }
export interface RecipeItem extends Recipe { notes: string; steps: { number: number; title: string; description: string }[] }
export interface Bundle { coffees: CoffeeItem[]; recipes: RecipeItem[]; profile: Profile; warnings: boolean; limited: boolean }
interface Name { name_ar?: string | null; name_en?: string | null }
interface CoffeeRow extends Name {
  id: string; slug: string; requires_review: boolean; is_published?: boolean;
  legacy_bean_id?: string | null; roast_level: string | null; last_verified_at: string | null;
  suitable_for_v60: boolean; suitable_for_espresso: boolean; suitable_for_xbloom: boolean;
  flavor_notes_on_bag?: string[]; flavors?: { flavor: string }[];
  roaster: Name | Name[] | null; status?: string; description_ar?: string | null; description_en?: string | null;
  short_description?: string; origin_country?: string; source_url?: string;
}
interface RecipeRow {
  id: string; title: string; title_ar: string | null; brew_method: string; visibility: string;
  bean_id: string | null; roasted_product_id: string | null; flavor_notes: string[];
  dose_grams: number | string | null; water_grams: number | string | null; total_time_seconds: number | null;
  difficulty: string | null; is_incomplete_source: boolean; notes: string | null; notes_ar: string | null;
  steps: { step_number: number; title: string; description: string }[];
  equipment: { category: string; equipment_model_id: string | null }[];
}
interface OwnAttempt { recipe_id: string; outcome: string | null }
interface Inventory { roasted_product_id: string | null; legacy_bean_id: string | null }
const one = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? v[0] ?? null : v;
const label = (v: Name | null, ar: boolean) => (ar ? v?.name_ar || v?.name_en : v?.name_en || v?.name_ar) ?? '';
const amount = (v: number | string | null): number | null => v !== null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
async function read<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<{ rows: T[]; failed: boolean; limited: boolean }> {
  try {
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return { rows: [], failed: true, limited: false };
    return { rows: data.slice(0, 200) as T[], failed: false, limited: data.length > 200 };
  } catch { return { rows: [], failed: true, limited: false }; }
}
export async function loadData(db: SupabaseClient, locale: 'ar' | 'en', userId: string | null, method?: Method): Promise<Bundle> {
  const ar = locale === 'ar';
  const result: Bundle = { coffees: [], recipes: [], profile: emptyProfile(), warnings: false, limited: false };
  const fields = 'id,slug,name_ar,name_en,requires_review,roast_level,last_verified_at,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,source_url,roaster:roasters(name_ar,name_en)';
  let beans = db.from('beans').select(`${fields},is_published,origin_country,description_ar,description_en,flavors:bean_flavor_notes(flavor)`).eq('requires_review', false).eq('is_published', true);
  let products = db.from('roasted_products').select(`${fields},legacy_bean_id,status,short_description,flavor_notes_on_bag`).eq('requires_review', false).in('status', ['available', 'low_stock']);
  let recipes = db.from('recipes').select('id,title,title_ar,brew_method,visibility,bean_id,roasted_product_id,flavor_notes,difficulty,is_incomplete_source,dose_grams,water_grams,total_time_seconds,notes,notes_ar,steps:recipe_steps(step_number,title,description),equipment:recipe_equipment(category,equipment_model_id)').eq('visibility', 'public');
  if (method && ['v60', 'espresso', 'xbloom'].includes(method)) { beans = beans.eq(`suitable_for_${method}`, true); products = products.eq(`suitable_for_${method}`, true); }
  if (method) recipes = recipes.eq('brew_method', method);
  const [b, p, r] = await Promise.all([
    read<CoffeeRow>(beans.order('updated_at', { ascending: false }).order('id').limit(201)),
    read<CoffeeRow>(products.order('updated_at', { ascending: false }).order('id').limit(201)),
    read<RecipeRow>(recipes.order('updated_at', { ascending: false }).order('id').limit(201)),
  ]);
  result.warnings = [b, p, r].some(x => x.failed); result.limited = [b, p, r].some(x => x.limited);
  const coffee = (row: CoffeeRow, kind: Coffee['kind']): CoffeeItem => ({
    id: row.id, slug: row.slug, kind, name: label(row, ar), roaster: label(one(row.roaster), ar),
    beanId: kind === 'bean' ? row.id : row.legacy_bean_id ?? null, reviewed: row.requires_review === false,
    published: kind === 'product' || row.is_published === true, methods: (['v60','espresso','xbloom'] as const).filter(m => row[`suitable_for_${m}`]),
    flavors: row.flavor_notes_on_bag ?? row.flavors?.map(f => f.flavor) ?? [], roast: row.roast_level, status: row.status ?? null, verifiedAt: row.last_verified_at,
    description: (ar ? row.description_ar || row.description_en : row.description_en || row.description_ar) || row.short_description || '',
    origin: row.origin_country ?? '', sourceUrl: safeUrl(row.source_url),
  });
  result.coffees = [...p.rows.map(x => coffee(x, 'product')), ...b.rows.map(x => coffee(x, 'bean'))];
  result.recipes = r.rows.flatMap(row => isMethod(row.brew_method) ? [{
    id: row.id, title: (ar ? row.title_ar || row.title : row.title || row.title_ar) ?? '', public: row.visibility === 'public',
    method: row.brew_method, beanId: row.bean_id, productId: row.roasted_product_id, flavors: row.flavor_notes ?? [], difficulty: row.difficulty,
    incomplete: row.is_incomplete_source, equipment: (row.equipment ?? []).map(e => ({ category: e.category, modelId: e.equipment_model_id })),
    dose: amount(row.dose_grams), water: amount(row.water_grams), seconds: amount(row.total_time_seconds),
    // This mobile preview does not fetch public user-level evidence. Never imply community validation.
    evidence: communityEvidence([], []), notes: (ar ? row.notes_ar || row.notes : row.notes || row.notes_ar) ?? '',
    steps: [...(row.steps ?? [])].sort((a, z) => a.step_number - z.step_number).map(s => ({ number: s.step_number, title: s.title, description: s.description })),
  }] : []);
  if (!userId) return result;
  const [prefs, gear, inventory, attempts] = await Promise.all([
    read<{ preferred_brew_methods: string[]; preferred_flavors: string[]; preferred_roast_level: string | null }>(db.from('user_preferences').select('preferred_brew_methods,preferred_flavors,preferred_roast_level').eq('user_id', userId).limit(1)),
    read<{ category: string; equipment_model_id: string | null }>(db.from('user_equipment').select('category,equipment_model_id').eq('user_id', userId).order('id').limit(201)),
    read<Inventory>(db.from('user_bean_inventory').select('roasted_product_id,legacy_bean_id').eq('user_id', userId).is('archived_at', null).or('remaining_weight_grams.is.null,remaining_weight_grams.gt.0').order('id').limit(201)),
    read<OwnAttempt>(db.from('recipe_attempts').select('recipe_id,outcome').eq('user_id', userId).in('status', ['tried','brewed_as_written','brewed_with_modifications']).order('created_at', { ascending: false }).order('id').limit(201)),
  ]);
  result.warnings ||= [prefs, gear, inventory, attempts].some(x => x.failed);
  result.limited ||= [gear, inventory, attempts].some(x => x.limited);
  const pref = prefs.rows[0];
  result.profile.methods = (pref?.preferred_brew_methods ?? []).filter(isMethod);
  result.profile.flavors = pref?.preferred_flavors ?? [];
  result.profile.roast = validChoice(pref?.preferred_roast_level, ROASTS) ?? null;
  result.profile.gear = gear.rows.map(g => ({ category: g.category, modelId: g.equipment_model_id }));
  result.profile.productIds = inventory.rows.flatMap(i => i.roasted_product_id ? [i.roasted_product_id] : []);
  result.profile.beanIds = inventory.rows.flatMap(i => i.legacy_bean_id ? [i.legacy_bean_id] : []);
  const seen = new Set<string>();
  for (const a of attempts.rows) { if (seen.has(a.recipe_id)) continue; seen.add(a.recipe_id); if (['good', 'excellent'].includes(a.outcome ?? '')) result.profile.successfulRecipeIds.push(a.recipe_id); }
  return result;
}
