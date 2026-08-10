/**
 * Brew-parameter extraction.
 *
 * Pulls the FACTS out of a piece of source text — dose, yield, ratio,
 * temperature, grind, pressure, timings, TDS — and nothing else. It never
 * returns prose, tasting notes, or any span of the author's writing: those
 * are the author's copyrighted expression. Numbers, units and equipment
 * names are facts and are not protectable.
 *
 * The extractor is intentionally conservative. It would rather return
 * `null` for a field than guess, because a wrong dose is worse than a
 * missing one — a moderator can fill a gap but may not notice a plausible
 * wrong number.
 */

export interface PressurePoint {
  bar: number;
  seconds?: number | null;
  label?: string | null;
}

export interface PourPoint {
  atSeconds: number;
  waterGrams: number;
  isBloom: boolean;
}

export interface ExtractedParameters {
  brewMethod: string | null;
  doseGrams: number | null;
  waterGrams: number | null;
  yieldGrams: number | null;
  ratio: number | null;
  waterTempC: number | null;
  grinderName: string | null;
  grindSetting: string | null;
  brewerName: string | null;
  filterType: string | null;
  bloomSeconds: number | null;
  totalTimeSeconds: number | null;
  pressureProfile: PressurePoint[] | null;
  pourSchedule: PourPoint[] | null;
  tds: number | null;
  extractionYield: number | null;
  originCountry: string | null;
  process: string | null;
  varietal: string | null;
  roastLevel: string | null;
  /** Names of the fields that were actually found. */
  extractedFields: string[];
  /** 0-1. Weighted by how many of the fields that matter were found. */
  confidence: number;
}

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const BREW_METHOD_PATTERNS: Array<[string, RegExp]> = [
  ["v60", /\bv-?60\b|\bhario\s+v-?60\b|\bpour[- ]?over\b/i],
  ["espresso", /\bespresso\b|\bflair\b|\bportafilter\b|\bnaked\s+basket\b/i],
  ["xbloom", /\bx-?bloom\b/i],
  ["aeropress", /\baero-?press\b/i],
  ["chemex", /\bchemex\b/i],
  ["french_press", /\bfrench\s+press\b|\bcafeti[eè]re\b|\bplunger\b/i],
  ["cold_brew", /\bcold\s+brew\b|\bcold[- ]?drip\b/i],
  ["moka_pot", /\bmoka\s+pot\b|\bstovetop\b/i],
];

// Grinders and brewers we recognise by name. Recognising a product name is
// nominative reference, not reproduction of anyone's content.
const GRINDER_PATTERNS: RegExp[] = [
  /\bcomandante\s+c\d{2}\b/i,
  /\b1zpresso\s+[a-z]+\b/i,
  /\bniche\s+zero\b/i,
  /\btimemore\s+(?:c\d|chestnut\s+[a-z0-9]+)\b/i,
  /\bkinu\s+m\d+\b/i,
  /\bweber\s+(?:hg-?2|key|eg-?1)\b/i,
  /\bdf\s?\d{2}\b/i,
  /\bfellow\s+ode(?:\s+gen\s?2)?\b/i,
  /\bbaratza\s+[a-z]+\b/i,
  /\bmahlk[oö]nig\s+[a-z0-9]+\b/i,
  /\bzp6\b/i,
];

const BREWER_PATTERNS: RegExp[] = [
  /\bhario\s+v-?60(?:\s+0?[123])?\b/i,
  /\borigami\s+(?:dripper|air)\b/i,
  /\bkalita\s+wave(?:\s+\d+)?\b/i,
  /\bapril\s+(?:brewer|dripper)\b/i,
  /\borea\s+v\d\b/i,
  /\bflair\s+(?:58|pro\s?2?|classic|signature)\b/i,
  /\bchemex\b/i,
  /\baero-?press(?:\s+go)?\b/i,
  /\bx-?bloom(?:\s+studio)?\b/i,
  /\bcafec\s+[a-z0-9\s]+\b/i,
  /\bswitch\b/i,
];

const PROCESS_PATTERNS: Array<[string, RegExp]> = [
  ["washed", /\bwashed\b|\bfully\s+washed\b/i],
  ["natural", /\bnatural(?:ly)?\s+process|\bnatural\b(?!\s+gas)/i],
  ["honey", /\bhoney\s+process|\b(?:yellow|red|black)\s+honey\b/i],
  ["anaerobic", /\banaerobic\b|\bcarbonic\s+macerat/i],
  ["wet_hulled", /\bwet[- ]?hulled\b|\bgiling\s+basah\b/i],
];

const ROAST_PATTERNS: Array<[string, RegExp]> = [
  ["light", /\blight\s+roast(?:ed)?\b|\bnordic\s+roast\b/i],
  ["medium_light", /\bmedium[- ]light\s+roast(?:ed)?\b/i],
  ["medium_dark", /\bmedium[- ]dark\s+roast(?:ed)?\b/i],
  ["dark", /\bdark\s+roast(?:ed)?\b/i],
  ["medium", /\bmedium\s+roast(?:ed)?\b/i],
];

const ORIGIN_PATTERNS: Array<[string, RegExp]> = [
  ["Ethiopia", /\bethiopian?\b|\byirgacheffe\b|\bguji\b|\bsidamo\b|\bharrar\b/i],
  ["Kenya", /\bkenyan?\b|\bnyeri\b|\bkirinyaga\b/i],
  ["Colombia", /\bcolombian?\b|\bhuila\b|\bnari[nñ]o\b|\bcauca\b/i],
  ["Brazil", /\bbrazil(?:ian)?\b|\bcerrado\b|\bmogiana\b/i],
  ["Guatemala", /\bguatemalan?\b|\bantigua\b|\bhuehuetenango\b/i],
  ["Costa Rica", /\bcosta\s+rican?\b|\btarraz[uú]\b/i],
  ["Panama", /\bpanama(?:nian)?\b|\bboquete\b/i],
  ["Indonesia", /\bindonesian?\b|\bsumatra\b|\bjava\b|\bsulawesi\b/i],
  ["Rwanda", /\brwandan?\b/i],
  ["Burundi", /\bburundian?\b/i],
  ["Peru", /\bperuvian?\b|\bperu\b/i],
  ["Honduras", /\bhondura[ns]\b/i],
  ["Yemen", /\byemen(?:i)?\b/i],
];

const VARIETAL_PATTERNS: RegExp[] = [
  /\bgeisha\b|\bgesha\b/i,
  /\bsl-?28\b/i,
  /\bsl-?34\b/i,
  /\bbourbon\b/i,
  /\bcaturra\b/i,
  /\bcatuai\b/i,
  /\btypica\b/i,
  /\bpacamara\b/i,
  /\bheirloom\b/i,
  /\bpink\s+bourbon\b/i,
  /\bvilla\s+sarchi\b/i,
  /\bmaragogype\b/i,
];

/* ------------------------------------------------------------------ */
/* Unit helpers                                                        */
/* ------------------------------------------------------------------ */

const num = (s: string) => Number.parseFloat(s.replace(",", "."));

/** Fahrenheit is common in US sources; the schema stores Celsius. */
function toCelsius(value: number, unit: string): number {
  return /f/i.test(unit) ? Math.round(((value - 32) * 5) / 9 * 10) / 10 : value;
}

/** Accepts "1:16", "1/16", "16:1", or a bare "16" ratio. */
function parseRatio(text: string): number | null {
  const m = text.match(/\b1\s*[:/]\s*(\d{1,2}(?:[.,]\d)?)\b/);
  if (m) {
    const r = num(m[1]);
    return r >= 1 && r <= 25 ? r : null;
  }
  return null;
}

/** "2:45", "2m45s", "2 min 45 sec", "165s" -> seconds. */
function parseDuration(text: string): number | null {
  let m = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) {
    const mins = Number(m[1]);
    const secs = Number(m[2]);
    if (secs < 60 && mins <= 30) return mins * 60 + secs;
  }
  m = text.match(/\b(\d{1,2})\s*m(?:in(?:ute)?s?)?\s*(\d{1,2})\s*s(?:ec(?:ond)?s?)?\b/i);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = text.match(/\b(\d{1,3})\s*s(?:ec(?:ond)?s?)?\b/i);
  if (m) {
    const s = Number(m[1]);
    if (s > 0 && s <= 900) return s;
  }
  m = text.match(/\b(\d{1,2})\s*m(?:in(?:ute)?s?)\b/i);
  if (m) return Number(m[1]) * 60;
  return null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].trim();
  }
  return null;
}

function firstLabelled(text: string, patterns: Array<[string, RegExp]>): string | null {
  for (const [label, re] of patterns) {
    if (re.test(text)) return label;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Field extractors                                                    */
/* ------------------------------------------------------------------ */

/**
 * Dose. Prefers an explicitly labelled value ("dose: 18g", "18g in") over a
 * bare gram figure, because articles are full of unrelated gram numbers.
 */
function extractDose(text: string): number | null {
  const labelled =
    text.match(/\b(?:dose|coffee|grounds?)\s*[:=-]?\s*(\d{1,2}(?:[.,]\d)?)\s*g\b/i) ??
    text.match(/\b(\d{1,2}(?:[.,]\d)?)\s*g(?:rams?)?\s+(?:of\s+)?(?:coffee|grounds?|in)\b/i) ??
    text.match(/\b(\d{1,2}(?:[.,]\d)?)\s*g\s*(?::|→|->)\s*\d/);
  if (!labelled) return null;
  const v = num(labelled[1]);
  return v >= 5 && v <= 60 ? v : null;
}

function extractWater(text: string): number | null {
  const labelled =
    text.match(/\b(?:water|brew\s+water)\s*[:=-]?\s*(\d{2,4}(?:[.,]\d)?)\s*(?:g|ml)\b/i) ??
    text.match(/\b(\d{2,4}(?:[.,]\d)?)\s*(?:g|ml)\s+(?:of\s+)?water\b/i);
  if (!labelled) return null;
  const v = num(labelled[1]);
  return v >= 50 && v <= 2000 ? v : null;
}

/** Espresso yield — "out", "yield", or the right side of "18g : 36g". */
function extractYield(text: string): number | null {
  const labelled =
    text.match(/\b(?:yield|out|output)\s*[:=-]?\s*(\d{1,3}(?:[.,]\d)?)\s*g\b/i) ??
    text.match(/\b(\d{1,3}(?:[.,]\d)?)\s*g(?:rams?)?\s+out\b/i) ??
    text.match(/\b\d{1,2}(?:[.,]\d)?\s*g\s*(?::|→|->)\s*(\d{1,3}(?:[.,]\d)?)\s*g\b/i);
  if (!labelled) return null;
  const v = num(labelled[1]);
  return v >= 10 && v <= 200 ? v : null;
}

function extractTemp(text: string): number | null {
  const m =
    text.match(/\b(\d{2,3}(?:[.,]\d)?)\s*°?\s*(c|f)\b/i) ??
    text.match(/\b(?:temp(?:erature)?|water)\s*[:=-]?\s*(\d{2,3}(?:[.,]\d)?)\s*°?\s*(c|f)?\b/i);
  if (!m) return null;
  const c = toCelsius(num(m[1]), m[2] ?? "c");
  return c >= 60 && c <= 100 ? c : null;
}

function extractGrind(text: string): string | null {
  const m =
    text.match(/\b(?:grind|setting|clicks?)\s*[:=-]?\s*(\d{1,3}(?:\.\d)?)\s*(?:clicks?|notches?)?\b/i) ??
    text.match(/\b(\d{1,3})\s*clicks?\b/i);
  if (!m) return null;
  return `${m[1]}${/clicks?/i.test(m[0]) ? " clicks" : ""}`;
}

function extractBloom(text: string): number | null {
  const m = text.match(/\bbloom\b[^.]{0,40}?\b(\d{1,3})\s*(?:s|sec(?:ond)?s?)\b/i);
  if (m) {
    const v = Number(m[1]);
    return v > 0 && v <= 180 ? v : null;
  }
  const m2 = text.match(/\b(\d{1,3})\s*(?:s|sec(?:ond)?s?)\s+bloom\b/i);
  if (m2) {
    const v = Number(m2[1]);
    return v > 0 && v <= 180 ? v : null;
  }
  return null;
}

function extractTotalTime(text: string): number | null {
  const m = text.match(/\b(?:total|brew|shot)\s+time\s*[:=-]?\s*([^.,;\n]{1,20})/i);
  if (m) {
    const d = parseDuration(m[1]);
    if (d) return d;
  }
  const m2 = text.match(/\bin\s+(\d{1,2}:\d{2})\b/);
  if (m2) return parseDuration(m2[1]);
  return null;
}

/** Espresso pressure profile: "2 bar pre-infusion (10s), 9 bar extraction". */
function extractPressure(text: string): PressurePoint[] | null {
  const points: PressurePoint[] = [];
  // Lookahead, not a consuming group: consuming the trailing context
  // moved lastIndex past any following reading, so a two-stage profile
  // only ever yielded its first stage.
  const re = /(\d{1,2}(?:[.,]\d)?)\s*bar\b(?=([^.;\n]{0,60}))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const bar = num(m[1]);
    if (bar <= 0 || bar > 15) continue;
    const tail = m[2] ?? "";
    const seconds = parseDuration(tail);
    const label = /pre-?infus/i.test(tail)
      ? "pre-infusion"
      : /extract|ramp|decline|taper/i.test(tail)
        ? (tail.match(/\b(extraction|ramp|decline|taper)\b/i)?.[1].toLowerCase() ?? null)
        : null;
    points.push({ bar, seconds: seconds ?? null, label });
  }
  return points.length ? points : null;
}

/** Pour schedule: "36g at 0:00, 180g at 0:45, 300g at 1:30". */
function extractPours(text: string): PourPoint[] | null {
  const points: PourPoint[] = [];
  const re = /(\d{2,4})\s*g\b[^.;\n]{0,24}?\bat\s+(\d{1,2}:\d{2}|\d{1,3}\s*s)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const grams = Number(m[1]);
    const at = parseDuration(m[2]);
    if (at == null || grams <= 0 || grams > 2000) continue;
    points.push({ atSeconds: at, waterGrams: grams, isBloom: at === 0 });
  }
  if (points.length < 2) return null;
  points.sort((a, b) => a.atSeconds - b.atSeconds);
  return points;
}

function extractTds(text: string): number | null {
  const m = text.match(/\btds\s*[:=-]?\s*(\d(?:[.,]\d{1,2})?)\s*%?/i);
  if (!m) return null;
  const v = num(m[1]);
  return v > 0 && v <= 30 ? v : null;
}

function extractExtractionYield(text: string): number | null {
  const m = text.match(/\b(?:extraction\s+yield|ey)\s*[:=-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i);
  if (!m) return null;
  const v = num(m[1]);
  return v > 0 && v <= 40 ? v : null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fields that most determine whether an extraction is worth reviewing.
 * "output" is one slot satisfied by EITHER waterGrams (filter) or
 * yieldGrams (espresso) — listing both made a perfect score unreachable,
 * since no single brew method produces both.
 */
const CORE_FIELDS = ["brewMethod", "doseGrams", "output", "ratio", "totalTimeSeconds", "waterTempC"];

export function extractParameters(rawText: string): ExtractedParameters {
  // Normalise whitespace and common unicode so the patterns above only need
  // to handle one shape.
  const text = rawText
    .replace(/ /g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const brewMethod = firstLabelled(text, BREW_METHOD_PATTERNS);
  const doseGrams = extractDose(text);
  const waterGrams = extractWater(text);
  const yieldGrams = extractYield(text);
  const waterTempC = extractTemp(text);
  const grinderName = firstMatch(text, GRINDER_PATTERNS);
  const grindSetting = extractGrind(text);
  const brewerName = firstMatch(text, BREWER_PATTERNS);
  const bloomSeconds = extractBloom(text);
  const totalTimeSeconds = extractTotalTime(text);
  const pressureProfile = extractPressure(text);
  const pourSchedule = extractPours(text);
  const tds = extractTds(text);
  const extractionYield = extractExtractionYield(text);
  const originCountry = firstLabelled(text, ORIGIN_PATTERNS);
  const process = firstLabelled(text, PROCESS_PATTERNS);
  const varietal = firstMatch(text, VARIETAL_PATTERNS);
  const roastLevel = firstLabelled(text, ROAST_PATTERNS);

  // Ratio: prefer a stated one, otherwise derive it. For espresso the
  // meaningful ratio is dose:yield; for everything else dose:water.
  let ratio = parseRatio(text);
  if (ratio == null) {
    const out = brewMethod === "espresso" ? yieldGrams : waterGrams;
    if (doseGrams && out) {
      const derived = Math.round((out / doseGrams) * 100) / 100;
      if (derived >= 1 && derived <= 25) ratio = derived;
    }
  }

  const values: Record<string, unknown> = {
    brewMethod,
    doseGrams,
    waterGrams,
    yieldGrams,
    ratio,
    waterTempC,
    grinderName,
    grindSetting,
    brewerName,
    bloomSeconds,
    totalTimeSeconds,
    pressureProfile,
    pourSchedule,
    tds,
    extractionYield,
    originCountry,
    process,
    varietal,
    roastLevel,
  };

  const extractedFields = Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k]) => k);

  // Confidence leans on the core fields: a page that yields only "Ethiopia"
  // and "washed" is not a recipe, however many soft fields it matched.
  const hasOutput = waterGrams != null || yieldGrams != null;
  const coreHits = CORE_FIELDS.filter((f) =>
    f === "output" ? hasOutput : extractedFields.includes(f),
  ).length;
  const softHits = Math.max(0, extractedFields.length - coreHits);
  const confidence = Math.min(
    1,
    Math.round(((coreHits / CORE_FIELDS.length) * 0.8 + Math.min(softHits, 6) / 6 * 0.2) * 100) / 100,
  );

  return {
    brewMethod,
    doseGrams,
    waterGrams,
    yieldGrams,
    ratio,
    waterTempC,
    grinderName,
    grindSetting,
    brewerName,
    filterType: null,
    bloomSeconds,
    totalTimeSeconds,
    pressureProfile,
    pourSchedule,
    tds,
    extractionYield,
    originCountry,
    process,
    varietal,
    roastLevel,
    extractedFields,
    confidence,
  };
}

/**
 * An item is only worth a moderator's time if it actually looks like a
 * recipe: a brew method plus at least one hard quantity, or a dose paired
 * with a water/yield figure.
 */
export function looksLikeRecipe(p: ExtractedParameters): boolean {
  const hasQuantity = p.doseGrams != null || p.waterGrams != null || p.yieldGrams != null;
  const hasPair = p.doseGrams != null && (p.waterGrams != null || p.yieldGrams != null);
  return (p.brewMethod != null && hasQuantity) || hasPair;
}

/**
 * Stable hash over the normalised parameter set, used to spot the same
 * recipe arriving from two feeds. Deliberately excludes prose and source
 * so genuine re-publications collapse onto one row.
 */
export function contentHash(p: ExtractedParameters): string {
  const key = [
    p.brewMethod ?? "",
    p.doseGrams ?? "",
    p.waterGrams ?? "",
    p.yieldGrams ?? "",
    p.waterTempC ?? "",
    p.totalTimeSeconds ?? "",
    p.originCountry ?? "",
  ].join("|");

  // FNV-1a, hex. Not cryptographic — this only needs to be stable and fast.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
