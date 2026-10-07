import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from './copy';
import { safeUrl } from './guards';
import { catalogName } from './localizedContent';

export interface EquipmentItem {
  id: string;
  name: string;
  originalName?: string;
  brand?: string;
  category: string;
  description: string;
  methods: string[];
  specifications: Record<string, unknown>;
  sourceUrl: string | null;
  imageUrl: string | null;
  verifiedAt: string | null;
  confidence: string;
}
export interface RoasterItem {
  searchDocument?: string;
  id: string;
  slug: string;
  name: string;
  description: string;
  country: string;
  websiteUrl: string | null;
  instagramUrl: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  confidence: string;
  verified: boolean;
  physicalStore: boolean | null;
  shipsToGcc: boolean | null;
  locations: {
    label: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
}
export function reviewedSupportingSources(item: EquipmentItem): string[] {
  const catalog = item.specifications.catalog as
    { schema_version?: number; extra_sources?: unknown } | undefined;
  if (catalog?.schema_version !== 1 || !Array.isArray(catalog.extra_sources))
    return [];
  return [
    ...new Set(
      catalog.extra_sources.flatMap((value) => {
        const url = typeof value === 'string' ? safeUrl(value) : null;
        return url && url !== item.sourceUrl ? [url] : [];
      }),
    ),
  ].slice(0, 8);
}
export interface EquipmentReview {
  id: string;
  user_id: string;
  rating: number;
  review_text: string;
  pros: string;
  cons: string;
  experience: 'owner' | 'used' | 'interested';
  status: 'published' | 'hidden';
  created_at: string;
}
export const countryNames: Record<string, [string, string]> = {
  KW: ['الكويت', 'Kuwait'],
  SA: ['السعودية', 'Saudi Arabia'],
  AE: ['الإمارات', 'UAE'],
  QA: ['قطر', 'Qatar'],
  BH: ['البحرين', 'Bahrain'],
  OM: ['عُمان', 'Oman'],
  US: ['الولايات المتحدة', 'United States'],
  GB: ['المملكة المتحدة', 'United Kingdom'],
  DE: ['ألمانيا', 'Germany'],
  DK: ['الدنمارك', 'Denmark'],
  NL: ['هولندا', 'Netherlands'],
  FR: ['فرنسا', 'France'],
  ES: ['إسبانيا', 'Spain'],
  SE: ['السويد', 'Sweden'],
  NO: ['النرويج', 'Norway'],
  IT: ['إيطاليا', 'Italy'],
  CH: ['سويسرا', 'Switzerland'],
  AT: ['النمسا', 'Austria'],
  BE: ['بلجيكا', 'Belgium'],
  PT: ['البرتغال', 'Portugal'],
  AU: ['أستراليا', 'Australia'],
  NZ: ['نيوزيلندا', 'New Zealand'],
  CA: ['كندا', 'Canada'],
  JP: ['اليابان', 'Japan'],
  KR: ['كوريا الجنوبية', 'South Korea'],
  TW: ['تايوان', 'Taiwan'],
  CN: ['الصين', 'China'],
  HK: ['هونغ كونغ', 'Hong Kong'],
  SG: ['سنغافورة', 'Singapore'],
  MY: ['ماليزيا', 'Malaysia'],
  TH: ['تايلند', 'Thailand'],
  ID: ['إندونيسيا', 'Indonesia'],
  IN: ['الهند', 'India'],
  BR: ['البرازيل', 'Brazil'],
  CO: ['كولومبيا', 'Colombia'],
  ET: ['إثيوبيا', 'Ethiopia'],
  YE: ['اليمن', 'Yemen'],
  KE: ['كينيا', 'Kenya'],
  PA: ['بنما', 'Panama'],
  CR: ['كوستاريكا', 'Costa Rica'],
  GT: ['غواتيمالا', 'Guatemala'],
  SV: ['السلفادور', 'El Salvador'],
  PE: ['بيرو', 'Peru'],
  RW: ['رواندا', 'Rwanda'],
  UG: ['أوغندا', 'Uganda'],
  HN: ['هندوراس', 'Honduras'],
  TZ: ['تنزانيا', 'Tanzania'],
  BO: ['بوليفيا', 'Bolivia'],
  EC: ['الإكوادور', 'Ecuador'],
  PG: ['بابوا غينيا الجديدة', 'Papua New Guinea'],
  EG: ['مصر', 'Egypt'],
  JO: ['الأردن', 'Jordan'],
  LB: ['لبنان', 'Lebanon'],
  TR: ['تركيا', 'Türkiye'],
  ZA: ['جنوب أفريقيا', 'South Africa'],
  PH: ['الفلبين', 'Philippines'],
  VN: ['فيتنام', 'Vietnam'],
  MX: ['المكسيك', 'Mexico'],
  IE: ['أيرلندا', 'Ireland'],
  RU: ['روسيا', 'Russia'],
  PL: ['بولندا', 'Poland'],
  CZ: ['التشيك', 'Czechia'],
  FI: ['فنلندا', 'Finland'],
  IS: ['آيسلندا', 'Iceland'],
  LU: ['لوكسمبورغ', 'Luxembourg'],
  RO: ['رومانيا', 'Romania'],
};
export const countryLabel = (country: string, locale: Locale) =>
  countryNames[country.toUpperCase()]?.[locale === 'ar' ? 0 : 1] ??
  catalogName(country, locale);
export function equipmentKind(
  item: Pick<EquipmentItem, 'name' | 'category' | 'originalName'>,
): string {
  return /moka|موكا/i.test(item.originalName ?? item.name)
    ? 'moka_pot'
    : item.category;
}
export const categoryNames: Record<string, [string, string]> = {
  all: ['الكل', 'All'],
  grinder: ['الطواحين', 'Grinders'],
  scale: ['الموازين', 'Scales'],
  moka_pot: ['موكا بوت', 'Moka pot'],
  xbloom: ['xBloom', 'xBloom'],
  v60_dripper: ['V60', 'V60'],
  aeropress: ['إيروبريس', 'AeroPress'],
  chemex: ['كيمكس', 'Chemex'],
  kettle: ['الغلايات', 'Kettles'],
  espresso_machine: ['ماكينات إسبريسو', 'Espresso machines'],
  kalita_dripper: ['كاليتا ويف', 'Kalita Wave'],
  origami_dripper: ['أوريغامي', 'Origami'],
  filter: ['الفلاتر', 'Filters'],
  portafilter_basket: ['سلال الإسبريسو', 'Espresso baskets'],
  distribution_tool: ['التوزيع والكبس', 'Distribution and tamping'],
  roaster: ['ماكينات التحميص', 'Coffee roasters'],
  other: ['أدوات أخرى', 'Other tools'],
};
export const categoryLabel = (kind: string, locale: Locale) =>
  categoryNames[kind]?.[locale === 'ar' ? 0 : 1] ??
  catalogName(kind.replaceAll('_', ' '), locale);

export const factLabels: Record<string, [string, string]> = {
  operation: ['التشغيل', 'Operation'],
  focus: ['الاستخدام', 'Designed for'],
  capacity: ['السعة المنشورة', 'Published capacity'],
  coffee_capacity: ['كمية البن', 'Coffee capacity'],
  burr_type: ['نوع التروس', 'Burr type'],
  burr_diameter: ['قطر التروس', 'Burr diameter'],
  burr: ['التروس', 'Burrs'],
  burr_options: ['خيارات التروس', 'Burr options'],
  adjustment: ['ضبط الطحنة', 'Grind adjustment'],
  dosing: ['الجرعات', 'Dosing'],
  grinder: ['الطاحونة المدمجة', 'Integrated grinder'],
  heating: ['نظام التسخين', 'Heating system'],
  boiler: ['الغلايات', 'Boilers'],
  portafilter: ['البورتافلتر', 'Portafilter'],
  steam: ['تبخير الحليب', 'Milk steaming'],
  water_tank: ['خزان الماء', 'Water tank'],
  brew_pressure: ['ضغط الاستخلاص', 'Extraction pressure'],
  max_pump_pressure: ['الحد الأقصى للمضخة', 'Maximum pump pressure'],
  pressure_gauge: ['مقياس الضغط', 'Pressure gauge'],
  preinfusion: ['النقع الأولي', 'Pre-infusion'],
  flow_control: ['التحكم بالتدفق', 'Flow control'],
  heats_water: ['يسخّن الماء', 'Heats water'],
  readability: ['دقة القراءة', 'Readability'],
  timer: ['المؤقت', 'Timer'],
  guidance: ['مساعدة التحضير', 'Brew assistance'],
  display: ['الشاشة', 'Display'],
  connection: ['الاتصال والشحن', 'Connectivity and charging'],
  dimensions: ['الأبعاد', 'Dimensions'],
  weight: ['الوزن', 'Weight'],
  material: ['الخامة', 'Material'],
  filter: ['الفلتر', 'Filter'],
  compatibility: ['التوافق', 'Compatibility'],
  spout: ['المصب', 'Spout'],
  temperature: ['الحرارة', 'Temperature'],
  hold: ['حفظ الحرارة', 'Temperature hold'],
  motor_power: ['القدرة الكهربائية', 'Electrical power'],
  voltage: ['الجهد', 'Voltage'],
  drum_speed: ['سرعة الأسطوانة', 'Drum speed'],
  battery: ['البطارية', 'Battery'],
  made_in: ['الصناعة', 'Made in'],
  included: ['المرفقات', 'Included'],
  care: ['العناية', 'Care'],
  sieves: ['شبكات المنخل', 'Sieves'],
  springs: ['الزنبركات', 'Springs'],
  sizes: ['المقاسات', 'Sizes'],
  programs: ['البرامج', 'Programs'],
  bottoms: ['قواعد التحضير', 'Brewer bottoms'],
  own_beans: ['حبوبك الخاصة', 'Your own beans'],
  handle: ['المقبض', 'Handle'],
  use: ['الاستخدام', 'Use'],
  region: ['إصدار السوق', 'Market version'],
};
export function reviewedFacts(
  item: Pick<EquipmentItem, 'specifications'>,
  locale: Locale,
): { key: string; label: string; value: string }[] {
  const c = item.specifications.catalog as
    { schema_version?: number; facts?: Record<string, unknown> } | undefined;
  if (c?.schema_version !== 1 || !c.facts || typeof c.facts !== 'object')
    return [];
  return Object.entries(c.facts).flatMap(([key, value]) =>
    factLabels[key] &&
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => typeof v === 'string' && v.length <= 400)
      ? [
          {
            key,
            label: factLabels[key][locale === 'ar' ? 0 : 1],
            value: value[locale === 'ar' ? 0 : 1],
          },
        ]
      : [],
  );
}
export function reviewedRows<T extends { requires_review?: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((row) => row.requires_review === false);
}
const equipmentCache = new WeakMap<
  SupabaseClient,
  Map<Locale, { at: number; request: Promise<EquipmentItem[]> }>
>();
export function loadEquipment(
  db: SupabaseClient,
  locale: Locale = 'en',
  refresh = false,
): Promise<EquipmentItem[]> {
  let cache = equipmentCache.get(db);
  if (!cache) {
    cache = new Map();
    equipmentCache.set(db, cache);
  }
  const previous = cache.get(locale);
  if (!refresh && previous && Date.now() - previous.at < 5 * 60_000)
    return previous.request;
  const request = readEquipment(db, locale).catch((error) => {
    if (cache.get(locale)?.request === request) cache.delete(locale);
    throw error;
  });
  cache.set(locale, { at: Date.now(), request });
  return request;
}
async function readEquipment(
  db: SupabaseClient,
  locale: Locale = 'en',
): Promise<EquipmentItem[]> {
  const { data, error } = await db
    .from('equipment_models')
    .select(
      'id,name,category,description,notes,specifications,suitable_brew_methods,source_url,official_url,image_url,image_usage_status,last_verified_at,data_confidence,requires_review,brand:equipment_brands(name)',
    )
    .eq('requires_review', false)
    .order('name')
    .limit(1000);
  if (error) throw error;
  return reviewedRows(data ?? []).map((row) => {
    const c = row.specifications?.catalog as
      | {
          schema_version?: number;
          name_ar?: string;
          description_ar?: string;
          description_en?: string;
        }
      | undefined;
    const translated = c?.schema_version === 1;
    const brand = (
      Array.isArray(row.brand) ? row.brand[0] : row.brand
    ) as {
      name?: string;
    } | null;
    return {
      id: row.id,
      name:
        locale === 'ar' && translated && c.name_ar
          ? c.name_ar
          : catalogName(row.name, locale),
      originalName: row.name,
      brand: brand?.name ?? '',
      category: row.category,
      description:
        locale === 'ar'
          ? translated && c.description_ar
            ? c.description_ar
            : ''
          : translated && c.description_en
            ? c.description_en
            : row.description || row.notes || '',
      specifications:
        row.specifications &&
        typeof row.specifications === 'object' &&
        !Array.isArray(row.specifications)
          ? row.specifications
          : {},
      methods: row.suitable_brew_methods ?? [],
      sourceUrl: safeUrl(row.source_url) || safeUrl(row.official_url),
      imageUrl:
        row.image_usage_status === 'rights_confirmed' ||
        (row.image_usage_status === 'source_linked' &&
          safeUrl(row.source_url))
          ? safeUrl(row.image_url)
          : null,
      verifiedAt: row.last_verified_at,
      confidence: row.data_confidence,
    };
  });
}
export async function loadRoasters(
  db: SupabaseClient,
  locale: Locale,
): Promise<RoasterItem[]> {
  const { data, error } = await db
    .from('roasters')
    .select(
      'id,slug,name_ar,name_en,description_ar,description_en,country,website_url,instagram_url,source_url,is_verified,last_verified_at,data_confidence,requires_review,has_physical_store,ships_to_gcc,locations:roaster_locations(label,address,latitude,longitude)',
    )
    .eq('requires_review', false)
    .order(locale === 'ar' ? 'name_ar' : 'name_en')
    .limit(1000);
  if (error) throw error;
  return reviewedRows(data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    searchDocument: [
      row.name_ar,
      row.name_en,
      row.description_ar,
      row.description_en,
      row.country,
    ]
      .filter(Boolean)
      .join(' '),
    name:
      (locale === 'ar'
        ? row.name_ar || catalogName(row.name_en, locale)
        : row.name_en || row.name_ar) ?? '',
    description:
      (locale === 'ar'
        ? row.description_ar
        : row.description_en || row.description_ar) ?? '',
    country: row.country ?? '',
    websiteUrl: safeUrl(row.website_url),
    instagramUrl: safeUrl(row.instagram_url),
    sourceUrl: safeUrl(row.source_url),
    verifiedAt: row.last_verified_at,
    confidence: row.data_confidence,
    verified: row.is_verified === true,
    physicalStore: row.has_physical_store,
    shipsToGcc: row.ships_to_gcc,
    locations: row.locations ?? [],
  }));
}
export function validateReview(
  rating: number,
  text: string,
  pros: string,
  cons: string,
): boolean {
  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5 &&
    text.trim().length >= 10 &&
    text.trim().length <= 2000 &&
    pros.trim().length <= 500 &&
    cons.trim().length <= 500
  );
}
export const XBLOOM_RESOURCES = [
  {
    ar: 'مكتبة وصفات xBloom الرسمية',
    en: 'Official xBloom Recipe Hub',
    url: 'https://collective.xbloom.com/',
    noteAr: 'استكشف الوصفات ثم افتحها في تطبيق xBloom.',
    noteEn: 'Explore recipes and open them in the xBloom app.',
  },
  {
    ar: 'تطبيق xBloom',
    en: 'Get the xBloom app',
    url: 'https://xbloom.com/pages/download-app',
    noteAr: 'التطبيق الرسمي لإدارة الجهاز والوصفات.',
    noteEn: 'The official app for your machine and recipes.',
  },
  {
    ar: 'دليل xBloom Studio',
    en: 'About xBloom Studio',
    url: 'https://xbloom.com/pages/xbloom-studio',
    noteAr: 'طرق التشغيل واستخدام حبوبك الخاصة.',
    noteEn: 'Operating modes and brewing your own beans.',
  },
  {
    ar: 'دليل xBloom Original',
    en: 'About xBloom Original',
    url: 'https://xbloom.com/pages/xbloom-original',
    noteAr: 'تحضير الحبوب الخاصة باستخدام القطّارة القابلة لإعادة الاستخدام.',
    noteEn: 'Brew your own beans with the reusable dripper.',
  },
];
