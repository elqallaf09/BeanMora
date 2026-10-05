import { sourceBrew, type SourceBrew } from './sourceBrew';
import type { SupabaseClient } from '@supabase/supabase-js';
import { communityEvidence, emptyProfile, isMethod, ROASTS, validChoice, type Coffee, type Recipe, type Profile, type Method } from './core/engine';
import { safeUrl } from './guards';
import type { ManualPour } from './manualBrew';
import { readSensory, type CoffeeSensoryData } from './sensory';
import { readRecipeDiscovery, type RecipeDiscovery } from './recipeDiscovery';
export type CoffeeImageKind = 'packaging' | 'product_artwork' | 'origin_photo' | 'unclassified';
export interface CoffeeItem extends Coffee { roasterId: string | null; description: string; origin: string; process: string; variety?: string; roasterCountry?: string; sensory?: CoffeeSensoryData; sourceUrl: string | null; logoUrl: string | null; imageUrl: string | null; imageSourceUrl?: string | null; imageKind?: CoffeeImageKind; images: string[] }
export interface RecipeSource { url: string; name: string; confidence: string; verifiedAt: string | null }
export type { SourceBrew } from './sourceBrew';
export interface RecipeItem extends Recipe { pours: ManualPour[]; waterUnit: 'g' | 'ml'; sourceBrew: SourceBrew; discovery?: RecipeDiscovery; grindSetting: string | null; author: string | null; temperatureMin: number | null; temperatureMax: number | null; sources: RecipeSource[]; recipeType: string; notes: string; temperature: number | null; coverUrl: string | null; coverKind?: CoffeeImageKind; videoUrl: string | null; xBloom: { deviceModel: string; grindSetting: string | null; dose: number | null; water: number | null; temp: number | null; pours: unknown } | null; steps: { number: number; title: string; description: string }[] }
export interface Bundle { coffees: CoffeeItem[]; recipes: RecipeItem[]; savedBeanIds: string[]; profile: Profile; recipeTotal: number; warnings: boolean; limited: boolean }
interface Name { name_ar?: string | null; name_en?: string | null; logo_url?: string | null; country?: string | null }
interface CoffeeRow extends Name {
  id: string; slug: string; roaster_id?: string | null; requires_review: boolean; is_published?: boolean;
  legacy_bean_id?: string | null; roast_level: string | null; last_verified_at: string | null;
  suitable_for_v60: boolean; suitable_for_espresso: boolean; suitable_for_xbloom: boolean;
  flavor_notes_on_bag?: string[]; flavors?: { flavor: string }[];
  roaster: Name | Name[] | null; status?: string; description_ar?: string | null; description_en?: string | null;
  short_description?: string; origin_country?: string; source_url?: string; image_url?: string | null; image_source_url?: string | null; image_usage_status?: string | null; image_kind?: string; process?: string; varietal?: string | null; sensory_profile?: unknown;
  images?: { url?: string; image_source_url?: string; image_usage_status: string; position: number }[];
  lot?: { origin_country?: string; process?: string; varietal?: string } | { origin_country?: string; process?: string; varietal?: string }[] | null;
}
export interface RecipeRow {
  id: string; title: string; title_ar: string | null; brew_method: string; visibility: string;
  bean_id: string | null; roasted_product_id: string | null; flavor_notes: string[];
  dose_grams: number | string | null; water_grams: number | string | null; water_temp_c: number | string | null; total_time_seconds: number | null;
  difficulty: string | null; is_incomplete_source: boolean; notes: string | null; notes_ar: string | null;
  cover_image_url: string | null; video_url: string | null; steps: { step_number: number; title: string; description: string; title_ar?: string | null; description_ar?: string | null }[];
  pours?: { pour_number: number; water_grams: number | string; start_at_seconds: number | null; is_bloom: boolean }[];
  equipment: { category: string; equipment_model_id: string | null }[];
  recipe_type?: string; sources?: { source_url: string | null; source_name: string | null; data_confidence: string; last_verified_at: string | null }[];
  source_brew_parameters?: SourceBrew; grinder_setting?: string | null; source_author_name?: string | null; water_temp_c_min?: number | null; water_temp_c_max?: number | null;
}
export const RECIPE_FIELDS = 'id,title,title_ar,brew_method,visibility,bean_id,roasted_product_id,flavor_notes,difficulty,is_incomplete_source,dose_grams,water_grams,water_temp_c,water_temp_c_min,water_temp_c_max,grinder_setting,source_author_name,source_brew_parameters,total_time_seconds,notes,notes_ar,cover_image_url,video_url,recipe_type,sources:recipe_sources(source_url,source_name,data_confidence,last_verified_at),steps:recipe_steps(step_number,title,description,title_ar,description_ar),pours:recipe_pours(pour_number,water_grams,start_at_seconds,is_bloom),equipment:recipe_equipment(category,equipment_model_id)';
interface OwnAttempt { recipe_id: string; outcome: string | null }
interface Inventory { roasted_product_id: string | null; legacy_bean_id: string | null }
const one = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? v[0] ?? null : v;
const label = (v: Name | null, ar: boolean) => (ar ? v?.name_ar || v?.name_en : v?.name_en || v?.name_ar) ?? '';
const inferredFlavors = (row: CoffeeRow): string[] => {
  const direct = row.flavor_notes_on_bag ?? row.flavors?.map(f => f.flavor) ?? [];
  if (direct.length) return direct;
  const text = row.description_en ?? row.description_ar ?? row.short_description ?? '';
  const m = text.match(/(?:tasting notes|flavor notes|notes)(?: per [^:]+)?:\s*([^.;]+)/i);
  return m?.[1] ? m[1].split(/,| and /i).map(x => x.trim()).filter(Boolean).slice(0, 5) : [];
};
const amount = (v: number | string | null): number | null => v !== null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
const catalogDescription = (row: CoffeeRow, ar: boolean): string => {
  const text = (ar ? row.description_ar || row.description_en : row.description_en || row.description_ar) || row.short_description || '';
  // Imported catalog descriptions sometimes contain database mapping notes.
  // Keep coffee information in the product screen and omit those internal sentences.
  return text.split(/\.\s+|\r?\n/).filter(sentence => !/\b[a-z][a-z0-9]*_[a-z0-9_]+\b|\bleft null\b|\bnot mapped\b/i.test(sentence)).join('. ').trim();
};
async function read<T>(query: PromiseLike<{ data: unknown; error: unknown; count?: number | null }>, limit = 200): Promise<{ rows: T[]; failed: boolean; limited: boolean; total: number | null }> {
  try {
    const { data, error, count } = await query;
    if (error || !Array.isArray(data)) return { rows: [], failed: true, limited: false, total: null };
    return { rows: data.slice(0, limit) as T[], failed: false, limited: data.length > limit || (count ?? 0) > limit, total: count ?? null };
  } catch { return { rows: [], failed: true, limited: false, total: null }; }
}
export function mapRecipe(row: RecipeRow, locale: 'ar' | 'en', profile: RecipeItem['xBloom'] = null): RecipeItem | null {
  if (!isMethod(row.brew_method)) return null;
  const ar = locale === 'ar'; const source = sourceBrew(row.source_brew_parameters);
  const rawMedia = (row.source_brew_parameters as unknown as Record<string, unknown> | undefined)?.global_roasters_import;
  const media = rawMedia && typeof rawMedia === 'object' && !Array.isArray(rawMedia) ? rawMedia as Record<string, unknown> : {};
  const coverUrl = safeUrl(row.cover_image_url);
  return {
    id: row.id, title: (ar ? row.title_ar || row.title : row.title || row.title_ar) ?? '', public: row.visibility === 'public',
    method: row.brew_method, beanId: row.bean_id, productId: row.roasted_product_id, flavors: row.flavor_notes ?? [], difficulty: row.difficulty,
    incomplete: row.is_incomplete_source, equipment: (row.equipment ?? []).map(e => ({ category: e.category, modelId: e.equipment_model_id })),
    recipeType: row.recipe_type ?? 'personal', sources: (row.sources ?? []).flatMap(s => { const url = safeUrl(s.source_url); return url ? [{ url, name: s.source_name || new URL(url).hostname, confidence: s.data_confidence, verifiedAt: s.last_verified_at }] : []; }),
    dose: amount(row.dose_grams) ?? amount(source.dose ?? null) ?? profile?.dose ?? null, water: amount(row.water_grams) ?? amount(source.water_ml ?? null) ?? profile?.water ?? null, waterUnit: amount(row.water_grams) ? 'g' : source.water_ml ? 'ml' : 'g', sourceBrew: source, discovery: readRecipeDiscovery(row, locale), grindSetting: row.grinder_setting || profile?.grindSetting || (source.grind_size !== undefined ? String(source.grind_size) : null), author: row.source_author_name ?? null, temperatureMin: amount(row.water_temp_c_min ?? null), temperatureMax: amount(row.water_temp_c_max ?? null), seconds: amount(row.total_time_seconds), temperature: amount(row.water_temp_c),
    // This mobile preview does not fetch public user-level evidence. Never imply community validation.
    evidence: communityEvidence([], []), coverUrl, coverKind: coverUrl && coverUrl === safeUrl(media.photo_url) ? validChoice(media.photo_kind, ['packaging', 'product_artwork', 'origin_photo', 'unclassified'] as const) ?? undefined : undefined, videoUrl: safeUrl(row.video_url), xBloom: profile, notes: (ar ? row.notes_ar || row.notes : row.notes || row.notes_ar) ?? '',
    pours: [...(row.pours ?? [])].sort((a, b) => a.pour_number - b.pour_number).flatMap(p => {
      const grams = amount(p.water_grams); if (!grams || !Number.isInteger(p.pour_number) || p.pour_number < 1) return [];
      const at = typeof p.start_at_seconds === 'number' && Number.isFinite(p.start_at_seconds) && p.start_at_seconds >= 0 ? p.start_at_seconds : null;
      return [{ number: p.pour_number, grams, at, bloom: p.is_bloom === true }];
    }),
    steps: [...(row.steps ?? [])].sort((a, z) => a.step_number - z.step_number).map(s => ({ number: s.step_number, title: (ar ? s.title_ar || s.title : s.title || s.title_ar) ?? '', description: (ar ? s.description_ar || s.description : s.description || s.description_ar) ?? '' })),
  };
}
export async function loadData(db: SupabaseClient, locale: 'ar' | 'en', userId: string | null, method?: Method): Promise<Bundle> {
  const ar = locale === 'ar';
  const result: Bundle = { coffees: [], recipes: [], savedBeanIds: [], profile: emptyProfile(), recipeTotal: 0, warnings: false, limited: false };
  const fields = 'id,slug,roaster_id,name_ar,name_en,requires_review,roast_level,last_verified_at,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,source_url,image_url,image_source_url,image_usage_status,image_kind,sensory_profile,roaster:roasters(name_ar,name_en,logo_url,country)';
  let beans = db.from('beans').select(`${fields},is_published,origin_country,process,varietal,description_ar,description_en,flavors:bean_flavor_notes(flavor),images:bean_images(url,position,image_usage_status)`).eq('requires_review', false).eq('is_published', true);
  let products = db.from('roasted_products').select(`${fields},legacy_bean_id,status,short_description,flavor_notes_on_bag,lot:coffee_lots(origin_country,process,varietal),images:product_images(image_source_url,position,image_usage_status)`).eq('requires_review', false).in('status', ['available', 'low_stock']);
  let recipes = db.from('recipes').select(RECIPE_FIELDS, { count: 'exact' }).eq('visibility', 'public');
  if (method && ['v60', 'espresso', 'xbloom'].includes(method)) { beans = beans.eq(`suitable_for_${method}`, true); products = products.eq(`suitable_for_${method}`, true); }
  if (method) recipes = recipes.eq('brew_method', method);
  const [b, p, r, xb] = await Promise.all([
    read<CoffeeRow>(beans.order('updated_at', { ascending: false }).order('id').limit(1001), 1000),
    read<CoffeeRow>(products.order('updated_at', { ascending: false }).order('id').limit(201)),
    read<RecipeRow>(recipes.order('updated_at', { ascending: false }).order('id').limit(201)),
    read<{ recipe_id: string; device_model: string; grind_setting: string | null; dose_grams: number | string | null; water_grams: number | string | null; water_temp_c: number | string | null; pours: unknown }>(db.from('xbloom_recipe_profiles').select('recipe_id,device_model,grind_setting,dose_grams,water_grams,water_temp_c,pours').eq('compatibility_status','compatible').limit(201)),
  ]);
  result.warnings = [b, p, r, xb].some(x => x.failed); result.limited = [b, p, r, xb].some(x => x.limited);
  const xbByRecipe = new Map(xb.rows.map(x => [x.recipe_id, x]));
  const coffee = (row: CoffeeRow, kind: Coffee['kind']): CoffeeItem => {
    const images = [...new Set((row.images ?? []).filter(i => i.image_usage_status === 'rights_confirmed' || i.image_usage_status === 'source_linked' && safeUrl(row.source_url)).sort((a, b) => a.position - b.position).flatMap(i => { const url = safeUrl(i.url ?? i.image_source_url); return url ? [url] : []; }))];
    const direct = row.image_usage_status === 'rights_confirmed' || row.image_usage_status === 'source_linked' && safeUrl(row.source_url) ? safeUrl(row.image_url) : null;
    if (direct && !images.includes(direct)) images.unshift(direct);
    return {
    id: row.id, slug: row.slug, kind, name: label(row, ar), roaster: label(one(row.roaster), ar), roasterId: row.roaster_id ?? null,
    beanId: kind === 'bean' ? row.id : row.legacy_bean_id ?? null, reviewed: row.requires_review === false,
    published: kind === 'product' || row.is_published === true, methods: (['v60','espresso','xbloom'] as const).filter(m => row[`suitable_for_${m}`]),
    flavors: inferredFlavors(row), roast: row.roast_level, status: row.status ?? null, verifiedAt: row.last_verified_at,
    description: catalogDescription(row, ar),
    origin: row.origin_country ?? one(row.lot ?? null)?.origin_country ?? '', process: row.process ?? one(row.lot ?? null)?.process ?? '', variety: row.varietal ?? one(row.lot ?? null)?.varietal ?? '', roasterCountry: one(row.roaster)?.country ?? '', sensory: readSensory(row.sensory_profile), sourceUrl: safeUrl(row.source_url), logoUrl: safeUrl(one(row.roaster)?.logo_url), imageUrl: images[0] ?? null, imageSourceUrl: safeUrl(row.image_source_url), imageKind: validChoice(row.image_kind, ['packaging', 'product_artwork', 'origin_photo', 'unclassified'] as const) ?? 'unclassified', images,
  }; };
  result.coffees = [...p.rows.map(x => coffee(x, 'product')), ...b.rows.map(x => coffee(x, 'bean'))];
  result.recipeTotal = r.total ?? r.rows.length;
  // Keep linked coffee recipes available even when the global catalog is much larger.
  const linked = result.coffees.length ? await read<RecipeRow>(db.from('recipes').select(RECIPE_FIELDS).eq('visibility', 'public').or('bean_id.not.is.null,roasted_product_id.not.is.null').order('updated_at', { ascending: false }).limit(201)) : { rows: [], failed: false, limited: false };
  result.warnings ||= linked.failed; result.limited ||= linked.limited;
  const recipeRows = [...new Map([...linked.rows, ...r.rows].map(row => [row.id, row])).values()];
  result.recipes = recipeRows.flatMap(row => {
    const x = xbByRecipe.get(row.id);
    const mapped = mapRecipe(row, locale, x ? { deviceModel: x.device_model, grindSetting: x.grind_setting, dose: amount(x.dose_grams), water: amount(x.water_grams), temp: amount(x.water_temp_c), pours: x.pours } : null);
    return mapped ? [mapped] : [];
  });
  // The legacy suitability columns cover three methods. Exact public recipe
  // links also expose a coffee's documented April, Orea and other brew methods.
  for (const coffee of result.coffees) {
    const linkedMethods = result.recipes.filter(recipe => recipe.public && (coffee.kind === 'product'
      ? recipe.productId === coffee.id || Boolean(coffee.beanId && recipe.beanId === coffee.beanId)
      : recipe.beanId === coffee.id)).map(recipe => recipe.method);
    coffee.methods = [...new Set([...coffee.methods, ...linkedMethods])];
  }
  if (!userId) return result;
  const [prefs, gear, inventory, attempts, saves] = await Promise.all([
    read<{ preferred_brew_methods: string[]; preferred_flavors: string[]; preferred_roast_level: string | null }>(db.from('user_preferences').select('preferred_brew_methods,preferred_flavors,preferred_roast_level').eq('user_id', userId).limit(1)),
    read<{ category: string; equipment_model_id: string | null; custom_name: string | null; model: { name?: string | null } | { name?: string | null }[] | null }>(db.from('user_equipment').select('category,equipment_model_id,custom_name,model:equipment_models(name)').eq('user_id', userId).order('id').limit(201)),
    read<Inventory>(db.from('user_bean_inventory').select('roasted_product_id,legacy_bean_id').eq('user_id', userId).is('archived_at', null).or('remaining_weight_grams.is.null,remaining_weight_grams.gt.0').order('id').limit(201)),
    read<OwnAttempt>(db.from('recipe_attempts').select('recipe_id,outcome').eq('user_id', userId).in('status', ['tried','brewed_as_written','brewed_with_modifications']).order('created_at', { ascending: false }).order('id').limit(201)),
    read<{ bean_id: string }>(db.from('bean_saves').select('bean_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1001), 1000),
  ]);
  result.warnings ||= [prefs, gear, inventory, attempts, saves].some(x => x.failed);
  result.limited ||= [gear, inventory, attempts, saves].some(x => x.limited);
  result.savedBeanIds = saves.rows.map(s => s.bean_id);
  const pref = prefs.rows[0];
  result.profile.methods = (pref?.preferred_brew_methods ?? []).filter(isMethod);
  result.profile.flavors = pref?.preferred_flavors ?? [];
  result.profile.roast = validChoice(pref?.preferred_roast_level, ROASTS) ?? null;
  const inferredGearMethod=(category:string,name:string):Method|undefined=>{
    const text=(name||'').toLowerCase();
    const byName:Method|undefined =
      /moka/.test(text)?'moka_pot':
      /orea/.test(text)?'orea':
      /april/.test(text)?'april':
      /french\s*press|cafeti/.test(text)?'french_press':
      /cold\s*brew/.test(text)?'cold_brew':
      undefined;
    if(byName)return byName;
    const aliases:Record<string,Method>={kalita_dripper:'kalita_wave',origami_dripper:'origami'};
    return aliases[category]??(isMethod(category)?category:undefined);
  };
  result.profile.gear = gear.rows.map(g => {
    const model=Array.isArray(g.model)?g.model[0]:g.model;
    const name=model?.name||g.custom_name||'';
    return { category: g.category, modelId: g.equipment_model_id, method: inferredGearMethod(g.category,name) };
  });
  result.profile.productIds = inventory.rows.flatMap(i => i.roasted_product_id ? [i.roasted_product_id] : []);
  result.profile.beanIds = inventory.rows.flatMap(i => i.legacy_bean_id ? [i.legacy_bean_id] : []);
  const seen = new Set<string>();
  for (const a of attempts.rows) { if (seen.has(a.recipe_id)) continue; seen.add(a.recipe_id); if (['good', 'excellent'].includes(a.outcome ?? '')) result.profile.successfulRecipeIds.push(a.recipe_id); }
  return result;
}
