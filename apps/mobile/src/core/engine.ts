/** Explainable rules, not a trained model or a probability of liking coffee. */
export const METHODS = ["v60", "espresso", "xbloom", "aeropress", "chemex", "french_press", "cold_brew", "moka_pot"] as const;
export type Method = (typeof METHODS)[number];
export const FLAVORS = ["chocolate", "nutty", "fruity", "citrus", "floral", "caramel", "spice"] as const;
export type Flavor = (typeof FLAVORS)[number];
export const ROASTS = ["light", "medium", "dark"] as const;
export type Roast = (typeof ROASTS)[number];
const EQUIPMENT_METHOD: Record<string, Method> = { v60_dripper: "v60", espresso_machine: "espresso", manual_espresso: "espresso", xbloom: "xbloom", aeropress: "aeropress", chemex: "chemex", french_press: "french_press", moka_pot: "moka_pot" };
const ALIASES: Record<Flavor, readonly string[]> = {
  chocolate: ["chocolate", "cocoa", "cacao", "شوكولاتة", "شوكولاته", "كاكاو"],
  nutty: ["nutty", "nuts", "hazelnut", "almond", "مكسرات", "بندق", "لوز"],
  fruity: ["fruity", "fruit", "berry", "berries", "strawberry", "blueberry", "فواكه", "فراولة", "توت"],
  citrus: ["citrus", "lemon", "orange", "grapefruit", "حمضيات", "ليمون", "برتقال"],
  floral: ["floral", "jasmine", "rose", "زهور", "ياسمين", "ورد"],
  caramel: ["caramel", "toffee", "كراميل", "توفي"],
  spice: ["spice", "spicy", "cinnamon", "cardamom", "توابل", "قرفة", "هيل"],
};
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").toLowerCase().trim();
}
export function flavorGroups(notes: readonly string[]): Flavor[] {
  const tokens = new Set(notes.flatMap(note => normalize(note).split(/[^\p{L}\p{N}]+/u)));
  return FLAVORS.filter(group => tokens.has(group) || ALIASES[group].some(alias => tokens.has(normalize(alias))));
}
export function isMethod(value: unknown): value is Method { return METHODS.includes(value as Method); }
export function validChoice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return typeof value === "string" && choices.includes(value as T) ? value as T : undefined;
}
export interface Gear { category: string; modelId: string | null }
export interface Profile {
  methods: Method[]; flavors: string[]; roast: Roast | null; experience: string | null;
  gear: Gear[]; productIds: string[]; beanIds: string[]; successfulRecipeIds: string[];
}
export const emptyProfile = (): Profile => ({ methods: [], flavors: [], roast: null, experience: null, gear: [], productIds: [], beanIds: [], successfulRecipeIds: [] });
export function ownedMethods(profile: Profile): Method[] { return [...new Set(profile.gear.map(g => EQUIPMENT_METHOD[g.category]).filter(isMethod))]; }
export function hasPersonalSignals(profile: Profile): boolean {
  return Boolean(profile.methods.length || flavorGroups(profile.flavors).length || profile.roast || ownedMethods(profile).length || profile.productIds.length || profile.beanIds.length || profile.successfulRecipeIds.length);
}
export type Reason = "method" | "gearMethod" | "flavor" | "roast" | "inventory" | "exactEquipment" | "beginner" | "ownSuccess" | "community";
export type Caveat = "stockUnknown" | "stale" | "unverified" | "equipmentUnknown" | "equipmentDifferent" | "incomplete" | "communityLimited";
export type Freshness = "fresh" | "aging" | "stale" | "unverified";
export function freshness(timestamp: string | null, now: number): Freshness {
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(parsed) || parsed > now) return "unverified";
  const age = (now - parsed) / 86400000;
  return age <= 30 ? "fresh" : age <= 90 ? "aging" : "stale";
}
export interface Coffee {
  id: string; kind: "bean" | "product"; slug: string; name: string; roaster: string | null;
  beanId: string | null; reviewed: boolean; published: boolean; methods: Method[];
  flavors: string[]; roast: string | null; status: string | null; verifiedAt: string | null;
}
export interface Attempt { id: string; userId: string; status: string; outcome: string | null; createdAt: string }
export interface Review { userId: string; attemptId: string | null; rating: number }
export interface Evidence { brewers: number; rated: number; successful: number; reviews: number; average: number | null }
/** Count people, not repeated clicks. A review must reference that person's actual brew. */
export function communityEvidence(attempts: Attempt[], reviews: Review[]): Evidence {
  const actual = attempts.filter(a => ["tried", "brewed_as_written", "brewed_with_modifications"].includes(a.status));
  const byUser = new Map<string, Attempt>();
  const byId = new Map(actual.map(a => [a.id, a]));
  for (const attempt of [...actual].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))) {
    if (!byUser.has(attempt.userId)) byUser.set(attempt.userId, attempt);
  }
  const outcomes = [...byUser.values()].filter(a => ["excellent", "good", "needs_adjustment", "poor"].includes(a.outcome ?? ""));
  const verified = new Map<string, number>();
  for (const review of reviews) {
    const attempt = review.attemptId ? byId.get(review.attemptId) : undefined;
    if (attempt?.userId === review.userId && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5) verified.set(review.userId, review.rating);
  }
  const ratings = [...verified.values()];
  return { brewers: byUser.size, rated: outcomes.length, successful: outcomes.filter(a => ["excellent", "good"].includes(a.outcome ?? "")).length, reviews: ratings.length, average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null };
}
export interface Recipe {
  id: string; title: string; public: boolean; method: Method; beanId: string | null; productId: string | null;
  flavors: string[]; difficulty: string | null; incomplete: boolean; equipment: Gear[];
  dose: number | null; water: number | null; seconds: number | null; evidence: Evidence;
}
export interface Ranked<T> { item: T; rank: number; reasons: Reason[]; caveats: Caveat[]; matchingFlavors: Flavor[] }
function flavorMatch(profile: Profile, notes: string[]): Flavor[] {
  const wanted = new Set(flavorGroups(profile.flavors));
  return flavorGroups(notes).filter(flavor => wanted.has(flavor));
}
function base<T>(item: T): Ranked<T> { return { item, rank: 0, reasons: [], caveats: [], matchingFlavors: [] }; }
function reward<T>(r: Ranked<T>, reason: Reason, weight: number) { r.reasons.push(reason); r.rank += weight; }
const ROAST_GROUP: Record<string, Roast> = { light: "light", medium_light: "light", medium: "medium", medium_dark: "dark", dark: "dark" };
function sortRank<T extends { id: string }>(rows: Ranked<T>[], limit: number): Ranked<T>[] {
  const seen = new Set<string>();
  return rows.sort((a, b) => b.rank - a.rank || a.item.id.localeCompare(b.item.id)).filter(row => { if (seen.has(row.item.id)) return false; seen.add(row.item.id); return true; }).slice(0, Math.max(0, Math.min(24, limit)));
}
export function recommendCoffees(coffees: Coffee[], profile: Profile, now: number, method?: Method, limit = 8): Ranked<Coffee>[] {
  const gearMethods = ownedMethods(profile);
  const productBeans = new Set(coffees.filter(c => c.kind === "product" && c.reviewed && c.published && ["available", "low_stock"].includes(c.status ?? "") && (!method || c.methods.includes(method))).map(c => c.beanId).filter(Boolean));
  const ranked: Ranked<Coffee>[] = [];
  for (const coffee of coffees) {
    if (!coffee.reviewed || !coffee.published || (method && !coffee.methods.includes(method))) continue;
    if (coffee.kind === "product" && !["available", "low_stock"].includes(coffee.status ?? "")) continue;
    if (coffee.kind === "bean" && productBeans.has(coffee.id)) continue;
    const row = base(coffee);
    if (coffee.methods.some(m => (method ? [method] : profile.methods).includes(m))) reward(row, "method", 30);
    if (coffee.methods.some(m => gearMethods.includes(m))) reward(row, "gearMethod", 25);
    row.matchingFlavors = flavorMatch(profile, coffee.flavors);
    if (row.matchingFlavors.length) reward(row, "flavor", Math.min(24, row.matchingFlavors.length * 8));
    if (profile.roast && ROAST_GROUP[coffee.roast ?? ""] === profile.roast) reward(row, "roast", 12);
    if (profile.productIds.includes(coffee.id) || profile.beanIds.includes(coffee.beanId ?? coffee.id)) reward(row, "inventory", 10);
    const age = freshness(coffee.verifiedAt, now);
    if (age === "stale" || age === "unverified") { row.caveats.push(age); row.rank -= 8; }
    if (coffee.kind === "bean") row.caveats.push("stockUnknown");
    ranked.push(row);
  }
  return sortRank(ranked, limit);
}
export function recommendRecipes(recipes: Recipe[], profile: Profile, method?: Method, limit = 8): Ranked<Recipe>[] {
  const gearMethods = ownedMethods(profile);
  const ranked: Ranked<Recipe>[] = [];
  for (const recipe of recipes) {
    if (!recipe.public || (method && recipe.method !== method)) continue;
    // With known brewing gear, don't present a different brew method as ready-to-brew.
    if (!method && gearMethods.length && !gearMethods.includes(recipe.method)) continue;
    const row = base(recipe);
    if ((method ? [method] : profile.methods).includes(recipe.method)) reward(row, "method", 30);
    if (gearMethods.includes(recipe.method)) reward(row, "gearMethod", 25);
    if (!gearMethods.length) row.caveats.push("equipmentUnknown");
    const exact = recipe.equipment.length > 0 && recipe.equipment.every(required => profile.gear.some(owned => required.modelId ? required.modelId === owned.modelId : required.category === owned.category));
    if (exact) reward(row, "exactEquipment", 12);
    else if (recipe.equipment.length || (gearMethods.length && !gearMethods.includes(recipe.method))) { row.caveats.push("equipmentDifferent"); row.rank -= 12; }
    row.matchingFlavors = flavorMatch(profile, recipe.flavors);
    if (row.matchingFlavors.length) reward(row, "flavor", Math.min(24, row.matchingFlavors.length * 8));
    if ((recipe.productId && profile.productIds.includes(recipe.productId)) || (recipe.beanId && profile.beanIds.includes(recipe.beanId))) reward(row, "inventory", 20);
    if (profile.experience === "beginner" && recipe.difficulty === "beginner") reward(row, "beginner", 8);
    if (profile.successfulRecipeIds.includes(recipe.id)) reward(row, "ownSuccess", 15);
    const evidence = recipe.evidence;
    if (evidence.rated >= 3 && evidence.successful >= 3 && evidence.successful / evidence.rated >= 0.6) {
      // A bounded evidence boost, deliberately smaller than personal-method/gear fit.
      reward(row, "community", Math.min(10, 2 * Math.log1p(evidence.rated)) * evidence.successful / evidence.rated);
    } else row.caveats.push("communityLimited");
    if (recipe.incomplete || !Number.isFinite(recipe.dose) || Number(recipe.dose) <= 0 || !Number.isFinite(recipe.water) || Number(recipe.water) <= 0) { row.caveats.push("incomplete"); row.rank -= 20; }
    ranked.push(row);
  }
  return sortRank(ranked, limit);
}
