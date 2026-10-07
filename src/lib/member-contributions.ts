import type { SupabaseClient } from "@supabase/supabase-js";

export type ContributionKind = "recipe" | "bean";
export type ContributionField = {
  key: string;
  ar: string;
  en: string;
  required?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  choices?: readonly (readonly [string, string, string])[];
};
export const contributionFields: Record<ContributionKind, ContributionField[]> =
  {
    recipe: [
      { key: "name", ar: "اسم الوصفة", en: "Recipe name", required: true },
      {
        key: "method",
        ar: "طريقة التحضير",
        en: "Brew method",
        required: true,
        choices: [
          ["v60", "ترشيح يدوي", "V60"],
          ["espresso", "إسبريسو", "Espresso"],
          ["xbloom", "إكس بلوم", "xBloom"],
          ["aeropress", "إيروبرس", "AeroPress"],
          ["french_press", "فرنش برس", "French press"],
          ["cold_brew", "تحضير بارد", "Cold brew"],
          ["moka_pot", "موكا بوت", "Moka pot"],
        ],
      },
      { key: "roaster_name", ar: "المحمصة", en: "Roaster" },
      { key: "coffee_name", ar: "اسم البن", en: "Coffee name" },
      {
        key: "dose",
        ar: "جرعة البن (غرام)",
        en: "Coffee dose (g)",
        numeric: true,
        required: true,
      },
      {
        key: "water",
        ar: "كمية الماء أو المشروب (غرام)",
        en: "Water or beverage weight (g)",
        numeric: true,
        required: true,
      },
      {
        key: "temperature",
        ar: "حرارة الماء (مئوية)",
        en: "Water temperature (°C)",
        numeric: true,
      },
      {
        key: "seconds",
        ar: "وقت التحضير (ثانية)",
        en: "Brew time (seconds)",
        numeric: true,
      },
      {
        key: "grind",
        ar: "الطاحونة ودرجة الطحن",
        en: "Grinder and grind setting",
      },
      {
        key: "steps",
        ar: "خطوات التحضير — كل خطوة في سطر",
        en: "Brew steps — one step per line",
        required: true,
        multiline: true,
      },
      {
        key: "description",
        ar: "ملاحظات الوصفة",
        en: "Recipe notes",
        multiline: true,
      },
      {
        key: "source_url",
        ar: "رابط الوصفة (https://)",
        en: "Recipe URL (https://)",
      },
      {
        key: "visibility",
        ar: "من يشاهد الوصفة؟",
        en: "Who can see this recipe?",
        choices: [
          ["private", "أنا فقط", "Only me"],
          ["public", "المجتمع", "Community"],
        ],
      },
    ],
    bean: [
      { key: "name", ar: "اسم البن", en: "Coffee name", required: true },
      {
        key: "roaster_name",
        ar: "اسم المحمصة",
        en: "Roaster name",
        required: true,
      },
      { key: "origin", ar: "بلد المنشأ", en: "Origin country", required: true },
      { key: "region", ar: "منطقة الزراعة", en: "Growing region" },
      { key: "farm", ar: "المزرعة أو المنتج", en: "Farm or producer" },
      { key: "variety", ar: "السلالة", en: "Variety" },
      {
        key: "process",
        ar: "المعالجة",
        en: "Process",
        choices: [
          ["", "غير محددة", "Not specified"],
          ["washed", "مغسولة", "Washed"],
          ["natural", "مجففة", "Natural"],
          ["honey", "عسلية", "Honey"],
          ["anaerobic", "لاهوائية", "Anaerobic"],
          ["wet_hulled", "تقشير رطب", "Wet hulled"],
          ["other", "أخرى", "Other"],
        ],
      },
      {
        key: "roast",
        ar: "درجة التحميص",
        en: "Roast level",
        choices: [
          ["", "غير محددة", "Not specified"],
          ["light", "فاتح", "Light"],
          ["medium_light", "متوسط فاتح", "Medium light"],
          ["medium", "متوسط", "Medium"],
          ["medium_dark", "متوسط داكن", "Medium dark"],
          ["dark", "داكن", "Dark"],
        ],
      },
      {
        key: "altitude",
        ar: "الارتفاع (متر)",
        en: "Altitude (m)",
        numeric: true,
      },
      {
        key: "weight",
        ar: "وزن الكيس (غرام)",
        en: "Bag weight (g)",
        numeric: true,
      },
      {
        key: "roast_date",
        ar: "تاريخ التحميص (YYYY-MM-DD)",
        en: "Roast date (YYYY-MM-DD)",
      },
      {
        key: "flavors",
        ar: "الإيحاءات — مفصولة بفاصلة",
        en: "Tasting notes — comma separated",
      },
      {
        key: "description",
        ar: "معلومات البن",
        en: "Coffee details",
        multiline: true,
      },
      {
        key: "source_url",
        ar: "رابط صفحة البن (https://)",
        en: "Coffee product URL (https://)",
      },
      {
        key: "roaster_url",
        ar: "رابط موقع المحمصة (https://)",
        en: "Roaster website (https://)",
      },
    ],
  };
export const initialContribution = (
  kind: ContributionKind,
): Record<string, string> =>
  kind === "recipe" ? { method: "v60", visibility: "private" } : {};
const digits = (v: string) =>
  v
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/٫/g, ".");
export function contributionPayload(
  kind: ContributionKind,
  values: Record<string, string>,
  locale: "ar" | "en",
) {
  const result: Record<string, string | string[]> = { locale };
  const fail = (f: ContributionField) => {
    throw new Error(
      locale === "ar" ? `تحقق من حقل: ${f.ar}` : `Check: ${f.en}`,
    );
  };
  for (const f of contributionFields[kind]) {
    let value = (values[f.key] ?? "").trim();
    if (
      (f.required && !value) ||
      value.length > (f.key === "steps" ? 20000 : f.multiline ? 5000 : 2048)
    )
      fail(f);
    if (f.choices && !f.choices.some((x) => x[0] === value)) fail(f);
    if (f.numeric && value) {
      value = digits(value);
      const n = Number(value);
      const max =
        f.key === "temperature"
          ? 100
          : f.key === "altitude"
            ? 3000
            : f.key === "seconds"
              ? 86400
              : 100000;
      if (
        !/^\d+(\.\d+)?$/.test(value) ||
        !Number.isFinite(n) ||
        n < 0 ||
        n > max ||
        (["weight", "seconds", "altitude"].includes(f.key) &&
          !Number.isInteger(n)) ||
        (["weight", "seconds"].includes(f.key) && n === 0) ||
        (["dose", "water"].includes(f.key) && n < 0.01)
      )
        fail(f);
    }
    if (f.key.endsWith("_url") && value) {
      try {
        const u = new URL(value);
        if (
          u.protocol !== "https:" ||
          !u.hostname.includes(".") ||
          u.username ||
          u.password ||
          /[\s\\]/.test(value)
        )
          fail(f);
      } catch {
        fail(f);
      }
    }
    if (
      ["name", "roaster_name", "origin"].includes(f.key) &&
      value &&
      (value.length < 2 || value.length > (f.key === "origin" ? 120 : 180))
    )
      fail(f);
    if (
      ["region", "farm", "variety", "grind", "coffee_name"].includes(f.key) &&
      value.length > 500
    )
      fail(f);
    if (f.key === "roast_date" && value) {
      value = digits(value);
      const d = new Date(value + "T00:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(d.getTime()) ||
        d.toISOString().slice(0, 10) !== value
      )
        fail(f);
    }
    result[f.key] = value;
  }
  if (kind === "recipe") {
    const steps = String(result.steps)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      !steps.length ||
      steps.length > 30 ||
      steps.some((x) => x.length < 2 || x.length > 2000)
    )
      fail(contributionFields.recipe.find((x) => x.key === "steps")!);
    result.steps = steps;
  } else {
    result.flavors = String(result.flavors)
      .split(/[,،]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (result.flavors.some((x) => x.length > 100))
      fail(contributionFields.bean.find((x) => x.key === "flavors")!);
  }
  // Match the RPC UTF-8 limit before locking a retry attempt (Arabic uses multiple bytes).
  const bytes = Array.from(JSON.stringify(result)).reduce(
    (sum, c) =>
      sum +
      ((c.codePointAt(0) ?? 0) < 128
        ? 1
        : (c.codePointAt(0) ?? 0) < 2048
          ? 2
          : (c.codePointAt(0) ?? 0) < 65536
            ? 3
            : 4),
    0,
  );
  if (bytes > 29000)
    throw new Error(
      locale === "ar"
        ? "تحقق من طول التفاصيل؛ اختصر النص ثم أعد المحاولة."
        : "Check: shorten the submission details and try again.",
    );
  return result;
}
export function contributionImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new Error("IMAGE_SIZE");
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { extension: "jpg", mime: "image/jpeg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x))
    return { extension: "png", mime: "image/png" };
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { extension: "webp", mime: "image/webp" };
  throw new Error("IMAGE_FORMAT");
}
export async function requireMember(
  client: SupabaseClient,
  expectedOwner?: string,
) {
  const { data, error } = await client.auth.getUser();
  if (
    error ||
    !data.user ||
    data.user.is_anonymous ||
    (expectedOwner && data.user.id !== expectedOwner)
  )
    throw new Error("MEMBER_SIGN_IN_REQUIRED");
  return data.user.id;
}
export async function uploadContributionImage(
  client: SupabaseClient,
  owner: string,
  id: string,
  bytes: Uint8Array,
  bucket: "member-media" | "profile-gallery" = "member-media",
) {
  await requireMember(client, owner);
  const type = contributionImage(bytes);
  const path = `${owner}/${id}.${type.extension}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes.buffer as ArrayBuffer, {
      contentType: type.mime,
      upsert: false,
    });
  // A lost upload response can be retried safely: the attempt keeps its UUID and bytes.
  if (error && !("statusCode" in error && String(error.statusCode) === "409"))
    throw new Error("IMAGE_UPLOAD_FAILED");
  return path;
}
export async function submitContribution(
  client: SupabaseClient,
  kind: ContributionKind,
  owner: string,
  id: string,
  payload: Record<string, unknown>,
) {
  await requireMember(client, owner);
  const { data, error } = await client.rpc(
    kind === "bean" ? "submit_member_bean" : "submit_member_recipe",
    { p_id: id, p_payload: payload },
  );
  if (error || data !== id) throw new Error("SUBMISSION_FAILED");
  return id;
}
