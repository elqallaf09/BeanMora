import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "./copy";
import { safeUrl } from "./guards";

export interface EquipmentItem {
  id: string;
  name: string;
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
export interface EquipmentReview {
  id: string;
  user_id: string;
  rating: number;
  review_text: string;
  pros: string;
  cons: string;
  experience: "owner" | "used" | "interested";
  status: "published" | "hidden";
  created_at: string;
}
export const countryNames: Record<string, [string, string]> = {
  KW: ["الكويت", "Kuwait"],
  SA: ["السعودية", "Saudi Arabia"],
  AE: ["الإمارات", "UAE"],
  QA: ["قطر", "Qatar"],
  BH: ["البحرين", "Bahrain"],
  OM: ["عُمان", "Oman"],
};
export const countryLabel = (country: string, locale: Locale) =>
  countryNames[country]?.[locale === "ar" ? 0 : 1] ?? country;
export function equipmentKind(
  item: Pick<EquipmentItem, "name" | "category">,
): string {
  return /moka/i.test(item.name) ? "moka_pot" : item.category;
}
export const categoryNames: Record<string, [string, string]> = {
  all: ["الكل", "All"],
  grinder: ["الطواحين", "Grinders"],
  scale: ["الموازين", "Scales"],
  moka_pot: ["موكا بوت", "Moka pot"],
  xbloom: ["xBloom", "xBloom"],
  v60_dripper: ["V60", "V60"],
  aeropress: ["إيروبريس", "AeroPress"],
  chemex: ["كيمكس", "Chemex"],
  kettle: ["الغلايات", "Kettles"],
  espresso_machine: ["ماكينات إسبريسو", "Espresso machines"],
  other: ["أدوات أخرى", "Other tools"],
};
export const categoryLabel = (kind: string, locale: Locale) =>
  categoryNames[kind]?.[locale === "ar" ? 0 : 1] ?? kind.replaceAll("_", " ");
export function reviewedRows<T extends { requires_review?: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((row) => row.requires_review === false);
}
export async function loadEquipment(
  db: SupabaseClient,
): Promise<EquipmentItem[]> {
  const { data, error } = await db
    .from("equipment_models")
    .select(
      "id,name,category,description,notes,specifications,suitable_brew_methods,source_url,official_url,image_url,image_usage_status,last_verified_at,data_confidence,requires_review",
    )
    .eq("requires_review", false)
    .order("name")
    .limit(1000);
  if (error) throw error;
  return reviewedRows(data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || row.notes || "",
    specifications:
      row.specifications &&
      typeof row.specifications === "object" &&
      !Array.isArray(row.specifications)
        ? row.specifications
        : {},
    methods: row.suitable_brew_methods ?? [],
    sourceUrl: safeUrl(row.source_url) || safeUrl(row.official_url),
    imageUrl:
      row.image_usage_status === "rights_confirmed" ||
      (row.image_usage_status === "source_linked" && safeUrl(row.source_url))
        ? safeUrl(row.image_url)
        : null,
    verifiedAt: row.last_verified_at,
    confidence: row.data_confidence,
  }));
}
export async function loadRoasters(
  db: SupabaseClient,
  locale: Locale,
): Promise<RoasterItem[]> {
  const { data, error } = await db
    .from("roasters")
    .select(
      "id,slug,name_ar,name_en,description_ar,description_en,country,website_url,instagram_url,source_url,is_verified,last_verified_at,data_confidence,requires_review,has_physical_store,ships_to_gcc,locations:roaster_locations(label,address,latitude,longitude)",
    )
    .eq("requires_review", false)
    .order(locale === "ar" ? "name_ar" : "name_en")
    .limit(1000);
  if (error) throw error;
  return reviewedRows(data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name:
      (locale === "ar"
        ? row.name_ar || row.name_en
        : row.name_en || row.name_ar) ?? "",
    description:
      (locale === "ar"
        ? row.description_ar || row.description_en
        : row.description_en || row.description_ar) ?? "",
    country: row.country ?? "",
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
    ar: "مكتبة وصفات xBloom الرسمية",
    en: "Official xBloom Recipe Hub",
    url: "https://collective.xbloom.com/",
    noteAr: "استكشف الوصفات ثم افتحها في تطبيق xBloom.",
    noteEn: "Explore recipes and open them in the xBloom app.",
  },
  {
    ar: "تطبيق xBloom",
    en: "Get the xBloom app",
    url: "https://xbloom.com/pages/download-app",
    noteAr: "التطبيق الرسمي لإدارة الجهاز والوصفات.",
    noteEn: "The official app for your machine and recipes.",
  },
  {
    ar: "دليل xBloom Studio",
    en: "About xBloom Studio",
    url: "https://xbloom.com/pages/xbloom-studio",
    noteAr: "طرق التشغيل واستخدام حبوبك الخاصة.",
    noteEn: "Operating modes and brewing your own beans.",
  },
  {
    ar: "دليل xBloom Original",
    en: "About xBloom Original",
    url: "https://xbloom.com/pages/xbloom-original",
    noteAr: "تحضير الحبوب الخاصة باستخدام القطّارة القابلة لإعادة الاستخدام.",
    noteEn: "Brew your own beans with the reusable dripper.",
  },
];
