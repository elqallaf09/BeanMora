import { safeUrl } from './guards';

export const SENSORY_KEYS = [
  'acidity',
  'sweetness',
  'body',
  'fermentation',
] as const;
export type SensoryKey = (typeof SENSORY_KEYS)[number];
export const PERSONALITY_KEYS = ['acidity', 'sweetness', 'body'] as const;
export interface SensoryValue {
  value: number;
  max: number;
}
export interface CoffeeSensoryData {
  sourceUrl: string | null;
  acidity?: SensoryValue;
  sweetness?: SensoryValue;
  body?: SensoryValue;
  fermentation?: SensoryValue;
  roast?: SensoryValue;
  descriptions?: Partial<Record<SensoryKey, { en: string; ar: string }>>;
}

/** A full personality needs tasting notes and each core attribute from a source. */
export function missingPersonalityAttributes(
  sensory?: CoffeeSensoryData,
): (typeof PERSONALITY_KEYS)[number][] {
  return PERSONALITY_KEYS.filter(
    (key) =>
      !safeUrl(sensory?.sourceUrl) ||
      (!sensory?.[key] && !sensory?.descriptions?.[key]),
  );
}
export function hasCompletePersonality(
  notes: string[],
  sensory?: CoffeeSensoryData,
): boolean {
  return (
    notes.some((note) => note.trim()) &&
    missingPersonalityAttributes(sensory).length === 0
  );
}

/** Keep the roaster's original scale. A flavor word never supplies an intensity. */
export function readSensory(
  value: unknown,
  legacy: { acidity?: unknown; sweetness?: unknown; body?: unknown } = {},
  legacySource?: string | null,
): CoffeeSensoryData {
  const row =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const sourceUrl = safeUrl(row.source_url) || safeUrl(legacySource);
  const result: CoffeeSensoryData = { sourceUrl };
  if (!sourceUrl) return result;
  const descriptions: NonNullable<CoffeeSensoryData['descriptions']> = {};
  for (const key of SENSORY_KEYS) {
    const raw = row[`${key}_description`];
    const translated = row[`${key}_description_ar`];
    if (typeof raw === 'string' && raw.trim())
      descriptions[key] = {
        en: raw.trim().slice(0, 160),
        ar:
          typeof translated === 'string' && translated.trim()
            ? translated.trim().slice(0, 160)
            : raw.trim().slice(0, 160),
      };
  }
  if (Object.keys(descriptions).length) result.descriptions = descriptions;
  const scale = typeof row.scale_max === 'number' ? row.scale_max : NaN;
  for (const key of [...SENSORY_KEYS, 'roast'] as const) {
    const raw =
      row[key] ??
      (key === 'acidity' || key === 'sweetness' || key === 'body'
        ? legacy[key]
        : undefined);
    const structured =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : null;
    const n = structured ? structured.value : raw;
    const max = structured
      ? (structured.max ?? structured.scale_max ?? scale)
      : row[key] !== undefined
        ? scale
        : 5;
    if (
      typeof n === 'number' &&
      typeof max === 'number' &&
      Number.isFinite(n) &&
      Number.isInteger(max) &&
      max >= 2 &&
      max <= 10 &&
      n >= 0 &&
      n <= max
    )
      result[key] = { value: n, max };
  }
  return result;
}

const normalize = (v: string) =>
  v
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
export type FlavorArt =
  | 'citrus'
  | 'flower'
  | 'peach'
  | 'berry'
  | 'honey'
  | 'chocolate'
  | 'nut'
  | 'caramel'
  | 'spice'
  | 'bean';
export function flavorArt(note: string): FlavorArt {
  const n = normalize(note);
  if (
    /citrus|lemon|lime|orange|grapefruit|bergamot|yuzu|حمضيات|ليمون|برتقال|جريب|يوسفي/.test(
      n,
    )
  )
    return 'citrus';
  if (
    /floral|flower|jasmine|rose|hibiscus|زهور|ازهار|ياسمين|ورد|كركديه/.test(n)
  )
    return 'flower';
  if (/peach|apricot|nectarine|mango|stone fruit|خوخ|دراق|مشمش|مانجو/.test(n))
    return 'peach';
  if (/honey|عسل/.test(n)) return 'honey';
  if (/chocolate|cocoa|cacao|شوكولا|كاكاو/.test(n)) return 'chocolate';
  if (
    /nut|almond|hazelnut|pecan|pistachio|walnut|مكسر|لوز|بندق|فستق|جوز/.test(n)
  )
    return 'nut';
  if (/caramel|toffee|butterscotch|brown sugar|كراميل|توفي|سكر بني/.test(n))
    return 'caramel';
  if (/spic|cinnamon|cardamom|clove|توابل|قرفه|هيل|قرنفل/.test(n))
    return 'spice';
  if (
    /fruit|berr|cherry|cherries|plum|grape|apple|فواكه|توت|فراول|كرز|برقوق|عنب|تفاح/.test(
      n,
    )
  )
    return 'berry';
  return 'bean';
}
const labels: Record<string, string> = {
  allspice: 'بهار حلو',
  amaretto: 'أماريتو',
  'barley tea': 'شاي الشعير',
  biscuits: 'بسكويت',
  blackberries: 'توت أسود',
  'butter biscuit': 'بسكويت بالزبدة',
  butterscotch: 'كراميل بالزبدة',
  'candied almond': 'لوز محلّى',
  'candied lemon': 'ليمون محلّى',
  'cane sugar': 'سكر القصب',
  'cashew butter': 'زبدة الكاجو',
  'cherry filled doughnut': 'دونات بحشوة الكرز',
  'chocolate fudge': 'فدج الشوكولاتة',
  'chocolate milk': 'حليب بالشوكولاتة',
  clean: 'واضحة',
  clementine: 'كلمنتينا',
  cola: 'كولا',
  cookies: 'بسكويت',
  'creamy white chocolate': 'شوكولاتة بيضاء كريمية',
  currants: 'كشمش',
  'dark grape': 'عنب داكن',
  'dried berries': 'توت مجفف',
  'earl grey': 'شاي إيرل غراي',
  fig: 'تين',
  florals: 'زهور',
  fruits: 'فواكه',
  'grape soda': 'مشروب عنب غازي',
  'heavy chocolate': 'شوكولاتة كثيفة',
  honeycomb: 'قرص العسل',
  honeydew: 'شمام عسلي',
  honeysuckle: 'زهرة العسلة',
  'juicy & citrus finish': 'قوام عصيري ونهاية حمضية',
  'key lime': 'لايم',
  kumquat: 'كمكوات',
  lime: 'لايم',
  'lime curd': 'كريمة اللايم',
  'lotus biscuit': 'بسكويت لوتس',
  malt: 'شعير',
  mandarin: 'يوسفي',
  maple: 'قيقب',
  'maple syrup': 'شراب القيقب',
  matcha: 'ماتشا',
  melon: 'شمام',
  'mulled wine': 'نبيذ متبّل',
  'mulling spice': 'توابل دافئة',
  'myrtle liquor': 'مشروب الآس',
  panela: 'سكر قصب غير مكرر',
  'peanut butter': 'زبدة الفول السوداني',
  pecan: 'بيكان',
  'pink grapefruit': 'جريب فروت وردي',
  'raspberry candy': 'حلوى توت العليق',
  'raw honey': 'عسل خام',
  'red grape': 'عنب أحمر',
  'red wine': 'نبيذ أحمر',
  redcurrant: 'كشمش أحمر',
  refined: 'رقيقة',
  rhubarb: 'راوند',
  'ripe fruits': 'فواكه ناضجة',
  'ripe orange': 'برتقال ناضج',
  'roasted almonds': 'لوز محمص',
  'roasted macadamia': 'مكاديميا محمصة',
  round: 'متوازنة',
  silky: 'حريرية',
  spearmint: 'نعناع',
  spices: 'توابل',
  'stone fruits': 'فواكه ذات نواة',
  sugarcane: 'قصب السكر',
  'sweet berries': 'توت حلو',
  'sweet blood orange': 'برتقال أحمر حلو',
  'sweet tea': 'شاي حلو',
  'tart apple': 'تفاح حامض',
  'thick & syrupy': 'قوام كثيف',
  'tropical fruits': 'فواكه استوائية',
  'tropical fruit': 'فاكهة استوائية',
  'vanilla cake': 'كيك الفانيلا',
  'vanilla malt': 'شعير بالفانيلا',
  violet: 'بنفسج',
  waffle: 'وافل',
  'white florals': 'زهور بيضاء',
  'white grape': 'عنب أبيض',
  'white wine': 'نبيذ أبيض',
  'white chocolate': 'شوكولاتة بيضاء',
  'white peach': 'خوخ أبيض',
  'passion fruit': 'باشن فروت',
  passionfruit: 'باشن فروت',
  'burnt sugar': 'سكر محروق',
  'dried cherry': 'كرز مجفف',
  'dried apricot': 'مشمش مجفف',
  'orange marmalade': 'مربى البرتقال',
  'black cherry': 'كرز أسود',
  'red grapes': 'عنب أحمر',
  nutmeg: 'جوزة الطيب',
  marzipan: 'مرزبان',
  sultana: 'زبيب سلطاني',
  'bitter orange': 'برتقال مر',
  pear: 'إجاص',
  'miso caramel': 'كراميل الميسو',
  stonefruit: 'فواكه ذات نواة',
  'star anise': 'يانسون نجمي',
  kiwi: 'كيوي',
  'berries jam': 'مربى توت',
  'grape yoghurt': 'زبادي العنب',
  winegum: 'حلوى فاكهة',
  'peach iced tea': 'شاي خوخ مثلج',
  'jammy berries': 'توت بقوام مربى',
  'sweet candy': 'حلوى',
  'winey fruitiness': 'فاكهة مخمّرة',
  'candy-like finish': 'نهاية حلوة',
  'slight floral': 'لمسة زهرية',
  chocolate: 'شوكولاتة',
  'milk chocolate': 'شوكولاتة بالحليب',
  'dark chocolate': 'شوكولاتة داكنة',
  cocoa: 'كاكاو',
  cacao: 'كاكاو',
  nutty: 'مكسرات',
  nuts: 'مكسرات',
  almond: 'لوز',
  almonds: 'لوز',
  hazelnut: 'بندق',
  hazelnuts: 'بندق',
  pistachio: 'فستق',
  walnut: 'جوز',
  fruity: 'فواكه',
  fruit: 'فواكه',
  citrus: 'حمضيات',
  lemon: 'ليمون',
  orange: 'برتقال',
  grapefruit: 'جريب فروت',
  bergamot: 'برغموت',
  floral: 'زهور',
  jasmine: 'ياسمين',
  rose: 'ورد',
  hibiscus: 'كركديه',
  peach: 'خوخ',
  apricot: 'مشمش',
  mango: 'مانجو',
  'stone fruit': 'فواكه ذات نواة',
  honey: 'عسل',
  caramel: 'كراميل',
  toffee: 'توفي',
  'brown sugar': 'سكر بني',
  spice: 'توابل',
  cinnamon: 'قرفة',
  cardamom: 'هيل',
  berry: 'توت',
  berries: 'توت',
  raspberry: 'توت العليق',
  strawberry: 'فراولة',
  blueberry: 'توت أزرق',
  blackberry: 'توت أسود',
  cherry: 'كرز',
  apple: 'تفاح',
  'red apple': 'تفاح أحمر',
  'green apple': 'تفاح أخضر',
  plum: 'برقوق',
  grape: 'عنب',
  grapes: 'عنب',
  raisin: 'زبيب',
  raisins: 'زبيب',
  vanilla: 'فانيلا',
  lavender: 'لافندر',
  chamomile: 'بابونج',
  'black tea': 'شاي أسود',
  'yellow plum': 'برقوق أصفر',
  dates: 'تمر',
  cloves: 'قرنفل',
  lychee: 'ليتشي',
  cantaloupe: 'شمام',
  pineapple: 'أناناس',
  mandarine: 'يوسفي',
  tangerine: 'يوسفي',
  pomegranate: 'رمان',
  'dried fig': 'تين مجفف',
  'red berries': 'توت أحمر',
  'red berry': 'توت أحمر',
  'mixed berries': 'توت مشكّل',
  'black berries': 'توت داكن',
  'almond cream': 'كريمة اللوز',
  'blood orange': 'برتقال أحمر',
  nectarine: 'نكتارين',
  lemongrass: 'عشبة الليمون',
  'dried fruit': 'فواكه مجففة',
  'dried fruits': 'فواكه مجففة',
  blackcurrant: 'كشمش أسود',
  'white grapes': 'عنب أبيض',
  'blueberry pie': 'فطيرة التوت الأزرق',
  'candied pecan': 'بيكان مُحلّى',
  'roasted walnuts': 'جوز محمّص',
  'cacao nibs': 'قطع الكاكاو',
  'candied walnuts': 'جوز مُحلّى',
  liquorice: 'عرق السوس',
  molasses: 'دبس',
  'maraschino cherries': 'كرز ماراشينو',
  'fruit-smoked': 'فواكه مع لمسة دخان',
  nougat: 'نوجا',
  praline: 'برالين',
  maltesers: 'مالتيزرز',
  sweet: 'حلوة',
  elegant: 'أنيقة',
  botanical: 'نباتية',
  'sweet citrus': 'حمضيات حلوة',
  'orange zest': 'قشر البرتقال',
  'sugar cane': 'قصب السكر',
};
export function flavorLabel(note: string, ar: boolean): string {
  const clean = note.trim();
  return ar
    ? (labels[clean.toLowerCase()] ?? clean)
    : (Object.entries(labels).find(
        ([, value]) => normalize(value) === normalize(clean),
      )?.[0] ?? clean);
}

/** Recover the publisher's written notes, never intensity scores or inferred flavors. */
export function publishedFlavorNotes(
  direct: (string[] | undefined)[],
  descriptions: (string | null | undefined)[],
): string[] {
  const clean = (notes: string[]) =>
    [...new Set(notes.map((note) => note.trim()).filter(Boolean))].slice(0, 20);
  for (const notes of direct) {
    if (notes?.length) {
      const values = clean(notes);
      if (values.length) return values;
    }
  }
  const split = (text: string) => clean(text.split(/[,،]|\s+and\s+/i));
  for (const description of descriptions) {
    if (!description) continue;
    const labeled =
      description.match(
        /\b(?:(?:tasting|flavou?r)\s+)?notes(?:\s+(?:as stated(?: by [^:.;\n]{1,60})?|on the product page|per [^:.;\n]{1,60}))?\s*(?::|：|\bof\b|["“])\s*([^.;\n"”]+)/i,
      ) ??
      description.match(/\bflavou?r\s*[:：]\s*([^.;\n]+)/i) ??
      description.match(
        /(?:إيحاءات|ايحاءات|نكهات)(?:\s+(?:النكهة|النكهه|البن|القهوة))?\s*[:：]\s*([^.;\n]+)/,
      );
    if (labeled?.[1]) return split(labeled[1]);
    // Several reviewed roasters open their description with a plain flavor list.
    // Only accept a complete comma-separated list of recognizable flavor words.
    const first = split(description.split(/[.;\n]/)[0]);
    const leading = first.filter(
      (note) => !/\b(?:acidity|sweetness|body|fermentation)\b/i.test(note),
    );
    if (
      first.length > 1 &&
      leading.length &&
      leading.every(
        (note) =>
          note.length <= 60 &&
          !/\b(?:no|not|notes|coffee|roast|lot|origin|process|published|stated|altitude|intensity|scale)\b/i.test(
            note,
          ) &&
          (flavorArt(note) !== 'bean' ||
            /vanilla|tea|chamomile|lavender|melon|lychee|mandarin|pineapple|date|raisin|sugar|winegum|\bfig\b|فانيلا|شاي|بابونج|لافندر|شمام|ليتشي|اناناس|أناناس|تمر|زبيب|سكر/i.test(
              note,
            )),
      )
    )
      return leading;
  }
  return [];
}
