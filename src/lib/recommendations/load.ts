import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  communityEvidence, emptyProfile, isMethod, validChoice, ROASTS,
  type Attempt, type Coffee, type Gear, type Method, type Profile, type Recipe, type Review,
} from "./engine";

export const CATALOG_LIMIT = 300;
const EVIDENCE_LIMIT = 1000;
type RowResult = PromiseLike<{ data: unknown; error: unknown }>;
type ReadQuery = RowResult & { abortSignal(signal: AbortSignal): RowResult };
async function rows<T>(request: ReadQuery): Promise<{ data: T[]; failed: boolean }> {
  try {
    const result = await request.abortSignal(AbortSignal.timeout(8000));
    return { data: result.error || !Array.isArray(result.data) ? [] : result.data as T[], failed: Boolean(result.error) };
  } catch { return { data: [], failed: true }; }
}
function one<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
interface Name { name_ar: string | null; name_en: string | null }
const name = (row: Name, locale: string): string => (locale === "ar" ? row.name_ar || row.name_en : row.name_en || row.name_ar) || "";
interface CoffeeRow extends Name {
  id: string; slug: string; legacy_bean_id?: string | null; is_published?: boolean;
  requires_review: boolean; roast_level: string | null; status?: string; last_verified_at: string | null;
  suitable_for_v60: boolean; suitable_for_espresso: boolean; suitable_for_xbloom: boolean;
  flavor_notes_on_bag?: string[]; flavors?: { flavor: string }[]; roaster: Name | Name[] | null;
}
const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
interface RecipeRow {
  id: string; title: string; brew_method: string; visibility: string; bean_id: string | null;
  roasted_product_id: string | null; flavor_notes: string[]; difficulty: string | null;
  is_incomplete_source: boolean; dose_grams: number | null; water_grams: number | null;
  total_time_seconds: number | null;
}
interface PrefRow { preferred_brew_methods: string[]; preferred_flavors: string[]; preferred_roast_level: string | null }
interface GearRow { category: string; equipment_model_id: string | null }
interface InventoryRow { roasted_product_id: string | null; legacy_bean_id: string | null }
interface AttemptRow { id: string; recipe_id: string; user_id: string; status: string; outcome: string | null; created_at: string }
interface ReviewRow { recipe_id: string; user_id: string; attempt_id: string | null; overall_rating: number }
interface EquipmentRow extends GearRow { recipe_id: string }
export interface RecommendationData {
  profile: Profile; coffees: Coffee[]; recipes: Recipe[]; signedIn: boolean;
  warnings: string[]; limited: boolean; loaded: { coffees: number; recipes: number };
}
export async function loadRecommendations(locale: string, method?: Method): Promise<RecommendationData> {
  const result: RecommendationData = { profile: emptyProfile(), coffees: [], recipes: [], signedIn: false, warnings: [], limited: false, loaded: { coffees: 0, recipes: 0 } };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { result.warnings.push("catalog"); return result; }
  const supabase = await createClient(); // Request cookies + anon key. Never a service-role client.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") result.warnings.push("profile");
  result.signedIn = Boolean(user && !user.is_anonymous);

  const common = "id,slug,name_ar,name_en,requires_review,roast_level,last_verified_at,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,roaster:roasters(name_ar,name_en)";
  let productsQuery = supabase.from("roasted_products").select(`${common},legacy_bean_id,status,flavor_notes_on_bag`).eq("requires_review", false).in("status", ["available", "low_stock"]);
  let beansQuery = supabase.from("beans").select(`${common},is_published,flavors:bean_flavor_notes(flavor)`).eq("requires_review", false).eq("is_published", true);
  let recipesQuery = supabase.from("recipes").select("id,title,brew_method,visibility,bean_id,roasted_product_id,flavor_notes,difficulty,is_incomplete_source,dose_grams,water_grams,total_time_seconds").eq("visibility", "public");
  if (method && ["v60", "espresso", "xbloom"].includes(method)) {
    const column = `suitable_for_${method}`;
    productsQuery = productsQuery.eq(column, true);
    beansQuery = beansQuery.eq(column, true);
  }
  if (method) recipesQuery = recipesQuery.eq("brew_method", method);
  const [products, beans, recipes] = await Promise.all([
    rows<CoffeeRow>(productsQuery.order("updated_at", { ascending: false }).order("id").range(0, CATALOG_LIMIT)),
    rows<CoffeeRow>(beansQuery.order("updated_at", { ascending: false }).order("id").range(0, CATALOG_LIMIT)),
    rows<RecipeRow>(recipesQuery.order("updated_at", { ascending: false }).order("id").range(0, CATALOG_LIMIT)),
  ]);
  if (products.failed || beans.failed || recipes.failed) result.warnings.push("catalog");
  result.limited = [products.data, beans.data, recipes.data].some(data => data.length > CATALOG_LIMIT);
  const toCoffee = (row: CoffeeRow, kind: Coffee["kind"]): Coffee => {
    const roaster = one(row.roaster);
    const methods: Method[] = [];
    if (row.suitable_for_v60) methods.push("v60");
    if (row.suitable_for_espresso) methods.push("espresso");
    if (row.suitable_for_xbloom) methods.push("xbloom");
    return { id: row.id, slug: row.slug, kind, name: name(row, locale), roaster: roaster ? name(roaster, locale) : null, beanId: kind === "bean" ? row.id : row.legacy_bean_id ?? null, reviewed: row.requires_review === false, published: kind === "product" || row.is_published === true, methods, flavors: row.flavor_notes_on_bag ?? (row.flavors ?? []).map(f => f.flavor), roast: row.roast_level, status: row.status ?? null, verifiedAt: row.last_verified_at };
  };
  result.coffees = [...products.data.slice(0, CATALOG_LIMIT).map(row => toCoffee(row, "product")), ...beans.data.slice(0, CATALOG_LIMIT).map(row => toCoffee(row, "bean"))];
  const publicRecipes = recipes.data.slice(0, CATALOG_LIMIT).filter(row => row.visibility === "public");
  const recipeIds = publicRecipes.map(row => row.id);

  async function privateProfile(): Promise<void> {
    if (!user || user.is_anonymous) return; // No persistent personal-data queries for guests.
    const [preferences, experience, gear, inventory, ownAttempts] = await Promise.all([
      rows<PrefRow>(supabase.from("user_preferences").select("preferred_brew_methods,preferred_flavors,preferred_roast_level").eq("user_id", user.id).limit(1)),
      rows<{ experience_level: string | null }>(supabase.from("profiles").select("experience_level").eq("id", user.id).limit(1)),
      rows<GearRow>(supabase.from("user_equipment").select("category,equipment_model_id").eq("user_id", user.id).order("id").limit(201)),
      rows<InventoryRow>(supabase.from("user_bean_inventory").select("roasted_product_id,legacy_bean_id").eq("user_id", user.id).is("archived_at", null).or("remaining_weight_grams.is.null,remaining_weight_grams.gt.0").order("id").limit(201)),
      rows<AttemptRow>(supabase.from("recipe_attempts").select("id,recipe_id,user_id,status,outcome,created_at").eq("user_id", user.id).in("status", ["tried", "brewed_as_written", "brewed_with_modifications"]).order("created_at", { ascending: false }).order("id").limit(201)),
    ]);
    if ([preferences, experience, gear, inventory, ownAttempts].some(r => r.failed)) result.warnings.push("profile");
    if ([gear, inventory, ownAttempts].some(r => r.data.length > 200)) result.limited = true;
    const pref = preferences.data[0];
    result.profile.methods = (pref?.preferred_brew_methods ?? []).filter(isMethod);
    result.profile.flavors = pref?.preferred_flavors ?? [];
    result.profile.roast = validChoice(pref?.preferred_roast_level, ROASTS) ?? null;
    result.profile.experience = experience.data[0]?.experience_level ?? null;
    result.profile.gear = gear.data.slice(0, 200).map((g): Gear => ({ category: g.category, modelId: g.equipment_model_id }));
    result.profile.productIds = inventory.data.slice(0, 200).flatMap(i => i.roasted_product_id ? [i.roasted_product_id] : []);
    result.profile.beanIds = inventory.data.slice(0, 200).flatMap(i => i.legacy_bean_id ? [i.legacy_bean_id] : []);
    const seen = new Set<string>();
    for (const attempt of ownAttempts.data.slice(0, 200)) {
      if (seen.has(attempt.recipe_id)) continue;
      seen.add(attempt.recipe_id);
      if (["excellent", "good"].includes(attempt.outcome ?? "")) result.profile.successfulRecipeIds.push(attempt.recipe_id);
    }
  }
  async function publicEvidence(): Promise<void> {
    if (!recipeIds.length) return;
    const [equipment, attempts, reviews] = await Promise.all([
      rows<EquipmentRow>(supabase.from("recipe_equipment").select("recipe_id,category,equipment_model_id").in("recipe_id", recipeIds).order("id").range(0, EVIDENCE_LIMIT)),
      rows<AttemptRow>(supabase.from("recipe_attempts").select("id,recipe_id,user_id,status,outcome,created_at").in("recipe_id", recipeIds).in("status", ["tried", "brewed_as_written", "brewed_with_modifications"]).order("created_at", { ascending: false }).order("id").range(0, EVIDENCE_LIMIT)),
      rows<ReviewRow>(supabase.from("recipe_reviews").select("recipe_id,user_id,attempt_id,overall_rating").in("recipe_id", recipeIds).order("created_at", { ascending: false }).order("id").range(0, EVIDENCE_LIMIT)),
    ]);
    if ([equipment, attempts, reviews].some(r => r.failed)) result.warnings.push("evidence");
    if ([equipment, attempts, reviews].some(r => r.data.length > EVIDENCE_LIMIT)) result.limited = true;
    // Never infer complete equipment requirements from a truncated/failed read.
    const equipmentComplete = !equipment.failed && equipment.data.length <= EVIDENCE_LIMIT;
    result.recipes = publicRecipes.flatMap(row => {
      if (!isMethod(row.brew_method)) return [];
      const actual: Attempt[] = attempts.data.slice(0, EVIDENCE_LIMIT).filter(a => a.recipe_id === row.id).map(a => ({ id: a.id, userId: a.user_id, status: a.status, outcome: a.outcome, createdAt: a.created_at }));
      const ratings: Review[] = reviews.data.slice(0, EVIDENCE_LIMIT).filter(r => r.recipe_id === row.id).map(r => ({ userId: r.user_id, attemptId: r.attempt_id, rating: r.overall_rating }));
      return [{ id: row.id, title: row.title, public: true, method: row.brew_method, beanId: row.bean_id, productId: row.roasted_product_id, flavors: row.flavor_notes ?? [], difficulty: row.difficulty, incomplete: row.is_incomplete_source || !equipmentComplete, equipment: equipmentComplete ? equipment.data.filter(e => e.recipe_id === row.id).map(e => ({ category: e.category, modelId: e.equipment_model_id })) : [], dose: positiveNumber(row.dose_grams), water: positiveNumber(row.water_grams), seconds: positiveNumber(row.total_time_seconds), evidence: communityEvidence(actual, ratings) }];
    });
  }
  await Promise.all([privateProfile(), publicEvidence()]);
  result.loaded = { coffees: result.coffees.length, recipes: result.recipes.length };
  return result;
}
