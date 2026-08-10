/**
 * Accepts either the client `useTranslations()` or server `getTranslations()`
 * return value — both are plain callable functions at runtime, but their
 * exact TS types differ slightly, so this is intentionally loose rather
 * than importing either type and fighting a mismatch at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = (key: string, ...args: any[]) => string;

const PROCESS_KEYS: Record<string, string> = {
  washed: "catalog.processWashed",
  natural: "catalog.processNatural",
  honey: "catalog.processHoney",
  anaerobic: "catalog.processAnaerobic",
  wet_hulled: "catalog.processWetHulled",
  other: "catalog.processOther",
};

const ROAST_KEYS: Record<string, string> = {
  light: "catalog.roastLight",
  medium_light: "catalog.roastMediumLight",
  medium: "catalog.roastMedium",
  medium_dark: "catalog.roastMediumDark",
  dark: "catalog.roastDark",
};

const DIFFICULTY_KEYS: Record<string, string> = {
  beginner: "catalog.difficultyBeginner",
  intermediate: "catalog.difficultyIntermediate",
  advanced: "catalog.difficultyAdvanced",
};

export function processLabel(t: T, code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const key = PROCESS_KEYS[code];
  return key ? t(key) : code;
}

export function roastLabel(t: T, code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const key = ROAST_KEYS[code];
  return key ? t(key) : code;
}

export function difficultyLabel(t: T, code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const key = DIFFICULTY_KEYS[code];
  return key ? t(key) : code;
}

const DATA_CONFIDENCE_KEYS: Record<string, string> = {
  official: "roasterProfile.dataConfidenceOfficial",
  verified: "roasterProfile.dataConfidenceVerified",
  community_submitted: "roasterProfile.dataConfidenceCommunitySubmitted",
  suggested: "roasterProfile.dataConfidenceSuggested",
  unverified: "roasterProfile.dataConfidenceUnverified",
};

/**
 * Shared across bean/roaster/equipment/recipe detail pages so every entity
 * type describes its provenance with the same wording — reuses the
 * `roasterProfile.dataConfidence*` strings (generic phrasing, not actually
 * roaster-specific) rather than duplicating four near-identical key sets.
 */
export function dataConfidenceLabel(t: T, code: string | null | undefined): string {
  const key = code ? DATA_CONFIDENCE_KEYS[code] : undefined;
  return t(key ?? "roasterProfile.dataConfidenceUnverified");
}

const EQUIPMENT_CATEGORY_KEYS: Record<string, string> = {
  grinder: "myGear.categoryGrinder",
  espresso_machine: "myGear.categoryEspressoMachine",
  xbloom: "myGear.categoryXbloom",
  v60_dripper: "myGear.categoryV60Dripper",
  aeropress: "myGear.categoryAeropress",
  chemex: "myGear.categoryChemex",
  scale: "myGear.categoryScale",
  kettle: "myGear.categoryKettle",
  filter: "myGear.categoryFilter",
  portafilter_basket: "myGear.categoryPortafilterBasket",
  distribution_tool: "myGear.categoryDistributionTool",
  other: "myGear.categoryOther",
};

export function equipmentCategoryLabel(t: T, code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const key = EQUIPMENT_CATEGORY_KEYS[code];
  return key ? t(key) : code;
}

export function brewMethodLabelKey(code: string): string {
  const map: Record<string, string> = {
    v60: "onboarding.methodV60",
    espresso: "onboarding.methodEspresso",
    xbloom: "onboarding.methodXbloom",
    aeropress: "onboarding.methodAeropress",
    chemex: "onboarding.methodChemex",
    french_press: "onboarding.methodFrenchPress",
    cold_brew: "onboarding.methodColdBrew",
    moka_pot: "onboarding.methodMokaPot",
  };
  return map[code] ?? "onboarding.methodV60";
}
