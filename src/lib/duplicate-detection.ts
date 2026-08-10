/**
 * Duplicate-candidate scoring for coffee_lots / roasted_products / roasters
 * (spec §20). This ONLY computes a similarity score and a suggested
 * action — it never merges anything itself. Merge decisions are always a
 * human action in the admin duplicate-review queue
 * (public.duplicate_candidates), matching the DB check constraint on
 * `suggested_action`.
 */

export type SuggestedAction = "merge" | "needs_review" | "keep_separate";

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string | null | undefined): Set<string> {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

/** Jaccard similarity of two strings' token sets, 0 (no overlap) to 1 (identical). */
export function tokenSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Exact-match similarity after normalization: 1 if equal, 0 otherwise. */
export function exactSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === "" && nb === "") return 1;
  return na === nb ? 1 : 0;
}

export interface CoffeeLotFields {
  originCountry: string | null;
  originRegion?: string | null;
  farm?: string | null;
  varietal?: string | null;
  process?: string | null;
}

/**
 * Weighted similarity for two Coffee Lots. Origin country must match
 * closely (it's the strongest signal); farm/varietal/process contribute
 * less individually since any one alone can coincidentally match across
 * genuinely different lots.
 */
export function coffeeLotSimilarity(a: CoffeeLotFields, b: CoffeeLotFields): number {
  const weights = {
    originCountry: 0.35,
    originRegion: 0.15,
    farm: 0.25,
    varietal: 0.15,
    process: 0.1,
  } as const;

  const score =
    exactSimilarity(a.originCountry, b.originCountry) * weights.originCountry +
    tokenSimilarity(a.originRegion, b.originRegion) * weights.originRegion +
    tokenSimilarity(a.farm, b.farm) * weights.farm +
    exactSimilarity(a.varietal, b.varietal) * weights.varietal +
    exactSimilarity(a.process, b.process) * weights.process;

  return Math.round(score * 1000) / 1000;
}

export interface RoastedProductFields {
  roasterId: string;
  nameEn?: string | null;
  nameAr?: string | null;
}

/**
 * Two products are only ever compared as potential duplicates within the
 * SAME roaster — two different roasters selling coffee from the same farm
 * is normal and must never be flagged (spec §20's whole point).
 */
export function roastedProductSimilarity(
  a: RoastedProductFields,
  b: RoastedProductFields,
): number | null {
  if (a.roasterId !== b.roasterId) return null;
  const enSim = tokenSimilarity(a.nameEn, b.nameEn);
  const arSim = tokenSimilarity(a.nameAr, b.nameAr);
  return Math.max(enSim, arSim);
}

const MERGE_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.5;

/**
 * Maps a similarity score to one of duplicate_candidates.suggested_action's
 * allowed values. "merge" here still only means "suggest merge to admin" —
 * see the module docstring.
 */
export function suggestAction(similarityScore: number): SuggestedAction {
  if (similarityScore >= MERGE_THRESHOLD) return "merge";
  if (similarityScore >= REVIEW_THRESHOLD) return "needs_review";
  return "keep_separate";
}
