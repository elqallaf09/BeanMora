import { safeUrl } from './guards';

export const SENSORY_KEYS = ['acidity', 'sweetness', 'body', 'fermentation'] as const;
export type SensoryKey = typeof SENSORY_KEYS[number];
export interface SensoryValue { value: number; max: number }
export interface CoffeeSensoryData {
  sourceUrl: string | null;
  acidity?: SensoryValue; sweetness?: SensoryValue; body?: SensoryValue;
  fermentation?: SensoryValue; roast?: SensoryValue;
  descriptions?: Partial<Record<SensoryKey, { en: string; ar: string }>>;
}

/** Keep the roaster's original scale. A flavor word never supplies an intensity. */
export function readSensory(value: unknown, legacy: { acidity?: unknown; sweetness?: unknown; body?: unknown } = {}, legacySource?: string | null): CoffeeSensoryData {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const sourceUrl = safeUrl(row.source_url) || safeUrl(legacySource);
  const result: CoffeeSensoryData = { sourceUrl };
  if (!sourceUrl) return result;
  const descriptions: NonNullable<CoffeeSensoryData['descriptions']> = {};
  for (const key of SENSORY_KEYS) {
    const raw = row[`${key}_description`];
    const translated = row[`${key}_description_ar`];
    if (typeof raw === 'string' && raw.trim()) descriptions[key] = {
      en: raw.trim().slice(0, 160),
      ar: typeof translated === 'string' && translated.trim() ? translated.trim().slice(0, 160) : raw.trim().slice(0, 160),
    };
  }
  if (Object.keys(descriptions).length) result.descriptions = descriptions;
  const scale = typeof row.scale_max === 'number' ? row.scale_max : NaN;
  for (const key of [...SENSORY_KEYS, 'roast'] as const) {
    const raw = row[key] ?? (key === 'acidity' || key === 'sweetness' || key === 'body' ? legacy[key] : undefined);
    const structured = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
    const n = structured ? structured.value : raw;
    const max = structured ? structured.max ?? structured.scale_max ?? scale : row[key] !== undefined ? scale : 5;
    if (typeof n === 'number' && typeof max === 'number' && Number.isFinite(n) && Number.isInteger(max) && max >= 2 && max <= 10 && n >= 0 && n <= max) result[key] = { value: n, max };
  }
  return result;
}

const normalize = (v: string) => v.normalize('NFKC').toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
export type FlavorArt = 'citrus' | 'flower' | 'peach' | 'berry' | 'honey' | 'chocolate' | 'nut' | 'caramel' | 'spice' | 'bean';
export function flavorArt(note: string): FlavorArt {
  const n = normalize(note);
  if (/citrus|lemon|lime|orange|grapefruit|bergamot|yuzu|حمضيات|ليمون|برتقال|جريب|يوسفي/.test(n)) return 'citrus';
  if (/floral|flower|jasmine|rose|hibiscus|زهور|ازهار|ياسمين|ورد|كركديه/.test(n)) return 'flower';
  if (/peach|apricot|nectarine|mango|stone fruit|خوخ|دراق|مشمش|مانجو/.test(n)) return 'peach';
  if (/honey|عسل/.test(n)) return 'honey';
  if (/chocolate|cocoa|cacao|شوكولا|كاكاو/.test(n)) return 'chocolate';
  if (/nut|almond|hazelnut|pecan|pistachio|walnut|مكسر|لوز|بندق|فستق|جوز/.test(n)) return 'nut';
  if (/caramel|toffee|butterscotch|brown sugar|كراميل|توفي|سكر بني/.test(n)) return 'caramel';
  if (/spic|cinnamon|cardamom|clove|توابل|قرفه|هيل|قرنفل/.test(n)) return 'spice';
  if (/fruit|berr|cherry|cherries|plum|grape|apple|فواكه|توت|فراول|كرز|برقوق|عنب|تفاح/.test(n)) return 'berry';
  return 'bean';
}
const labels: Record<string, string> = {
  chocolate: 'شوكولاتة', 'milk chocolate': 'شوكولاتة بالحليب', 'dark chocolate': 'شوكولاتة داكنة', cocoa: 'كاكاو', cacao: 'كاكاو',
  nutty: 'مكسرات', nuts: 'مكسرات', almond: 'لوز', almonds: 'لوز', hazelnut: 'بندق', hazelnuts: 'بندق', pistachio: 'فستق', walnut: 'جوز',
  fruity: 'فواكه', fruit: 'فواكه', citrus: 'حمضيات', lemon: 'ليمون', orange: 'برتقال', grapefruit: 'جريب فروت', bergamot: 'برغموت',
  floral: 'زهور', jasmine: 'ياسمين', rose: 'ورد', hibiscus: 'كركديه', peach: 'خوخ', apricot: 'مشمش', mango: 'مانجو', 'stone fruit': 'فواكه ذات نواة',
  honey: 'عسل', caramel: 'كراميل', toffee: 'توفي', 'brown sugar': 'سكر بني', spice: 'توابل', cinnamon: 'قرفة', cardamom: 'هيل',
  berry: 'توت', berries: 'توت', raspberry: 'توت العليق', strawberry: 'فراولة', blueberry: 'توت أزرق', blackberry: 'توت أسود',
  cherry: 'كرز', 'red apple': 'تفاح أحمر', 'green apple': 'تفاح أخضر', plum: 'برقوق', grape: 'عنب', raisin: 'زبيب', vanilla: 'فانيلا',
  'red berries': 'توت أحمر', 'red berry': 'توت أحمر', 'mixed berries': 'توت مشكّل', 'black berries': 'توت داكن',
  botanical: 'نباتية', 'sweet citrus': 'حمضيات حلوة', 'orange zest': 'قشر البرتقال', 'sugar cane': 'قصب السكر',
};
export function flavorLabel(note: string, ar: boolean): string {
  const clean = note.trim();
  return ar ? labels[clean.toLowerCase()] ?? clean : Object.entries(labels).find(([, value]) => normalize(value) === normalize(clean))?.[0] ?? clean;
}
