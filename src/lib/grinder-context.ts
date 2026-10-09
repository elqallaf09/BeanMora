import {
  isUuid,
  outcomeError,
  parseOutcome,
  type BrewOutcome,
  type SaveResult,
} from "./brewing/outcome";
export const roastLevels = [
  "light",
  "medium_light",
  "medium",
  "medium_dark",
  "dark",
] as const;
export type GrinderContext = {
  grinder_model_id: string | null;
  brewer_model_id: string | null;
  roasted_product_id: string | null;
  grind_setting: string | null;
  roast_level: (typeof roastLevels)[number] | null;
  roast_date: string | null;
  calibration: string | null;
  taste_signal:
    "sharp_sour" | "bitter_dry" | "thin_weak" | "balanced" | "other" | null;
};
export const emptyGrinderContext = (): GrinderContext => ({
  grinder_model_id: null,
  brewer_model_id: null,
  roasted_product_id: null,
  grind_setting: null,
  roast_level: null,
  roast_date: null,
  calibration: null,
  taste_signal: null,
});
export function parseGrinderContext(value: unknown): GrinderContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>,
    keys = Object.keys(emptyGrinderContext());
  if (
    Object.keys(row).length !== keys.length ||
    Object.keys(row).some((k) => !keys.includes(k))
  )
    return null;
  if (
    ["grinder_model_id", "brewer_model_id", "roasted_product_id"].some(
      (k) => row[k] !== null && !isUuid(row[k]),
    )
  )
    return null;
  if (
    ["grind_setting", "calibration"].some(
      (k) =>
        row[k] !== null &&
        (typeof row[k] !== "string" ||
          !(row[k] as string).trim() ||
          (row[k] as string).length > 100),
    )
  )
    return null;
  if (
    row.roast_level !== null &&
    !(roastLevels as readonly unknown[]).includes(row.roast_level)
  )
    return null;
  if (row.roast_date !== null) {
    if (
      typeof row.roast_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.roast_date)
    )
      return null;
    const date = new Date(row.roast_date + "T00:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== row.roast_date
    )
      return null;
  }
  if (
    ![
      null,
      "sharp_sour",
      "bitter_dry",
      "thin_weak",
      "balanced",
      "other",
    ].includes(row.taste_signal as string | null)
  )
    return null;
  return row as unknown as GrinderContext;
}
type Transport = {
  rpc: (
    name: "record_configured_brew_v1",
    args: {
      p_request_id: string;
      p_payload: BrewOutcome;
      p_context: GrinderContext;
    },
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};
export async function saveConfiguredBrew(
  db: Transport,
  requestId: string,
  input: unknown,
  context: unknown,
): Promise<SaveResult> {
  const payload = parseOutcome(input),
    parsed = parseGrinderContext(context);
  if (!isUuid(requestId) || !payload || !parsed)
    return { ok: false, error: "invalid" };
  try {
    const { data, error } = await db.rpc("record_configured_brew_v1", {
      p_request_id: requestId,
      p_payload: payload,
      p_context: parsed,
    });
    return error
      ? { ok: false, error: outcomeError(error) }
      : data === requestId
        ? { ok: true, id: requestId }
        : { ok: false, error: "retry" };
  } catch {
    return { ok: false, error: "retry" };
  }
}
/** Manufacturer starting points apply to this exact model/burrs, never a named bean. */
export const grinderStartingPoints = [
  {
    model: "Baratza Encore ESP",
    source:
      "https://assets.breville.com/ZCG495/manual-encoreesp-v1-0-en-010923.pdf",
    note: {
      ar: "نقطة بداية من دليل المصنع؛ اضبطها بالطعم والوقت لنفس البن والجرعة.",
      en: "Manufacturer starting point; dial in by taste and time for your coffee and dose.",
    },
    settings: {
      espresso: "15",
      aeropress: "22",
      v60: "25",
      auto_drip: "28",
      chemex: "30",
      french_press: "32",
    },
  },
  {
    model: "Comandante C40 MK4",
    source: "https://comandantegrinder.co.uk/pages/frequently-asked-questions",
    note: {
      ar: "نطاق C40 بالمحور القياسي من الصفر؛ محور Red Clix له تدريج مختلف. ليس إعدادًا مجرّبًا لبن محدد.",
      en: "C40 standard axle range from zero; Red Clix uses a different scale. Not a tested setting for a named coffee.",
    },
    settings: {
      espresso: "7–13",
      v60: "18–35",
      pour_over: "18–35",
      french_press: "28–35",
    },
  },
] as const;
export function grinderStart(model: string, method: string, brewer = "") {
  if (
    model === "Fellow Ode Gen 2" &&
    brewer === "Fellow Aiden Precision Coffee Maker" &&
    method === "auto_drip"
  ) {
    return {
      model,
      setting: "5⅓ / 8 / 10",
      source:
        "https://help.fellowproducts.com/hc/en-us/articles/29101533994267-How-should-I-dial-in-my-grinder-when-brewing-with-Aiden-Getting-Started-With-Aiden-Pt-3",
      note: {
        ar: "بداية Fellow لـ Ode Gen 2 مع Aiden فقط: ماء ١٥٠–٤٥٠ مل = ٥ وثلث، ٤٥١–٧٥٠ مل = ٨، ٧٥١–١٥٠٠ مل = ١٠. اختر حسب حجم الماء، ثم اضبط بالطعم لنفس الحمصة والجرعة.",
        en: "Fellow starts for Ode Gen 2 with Aiden only: 150–450 mL water = 5⅓, 451–750 mL = 8, 751–1,500 mL = 10. Choose by water volume, then dial in by taste for roast and dose.",
      },
    };
  }
  const entry = grinderStartingPoints.find(
    (x) => x.model.toLowerCase() === model.toLowerCase(),
  );
  const setting = entry?.settings[method as keyof typeof entry.settings] as
    string | undefined;
  if (!setting || !entry) return null;
  const note =
    entry.model === "Baratza Encore ESP" && method === "espresso"
      ? {
          ar: "درجة ١٥ نقطة بداية المصنع لجرعة ١٨ غرامًا وحمصة متوسطة على Encore ESP. اضبط بالطعم والوقت؛ ليست درجة مجرّبة لكل بن.",
          en: "15 is the manufacturer start for an 18 g medium-roast dose on Encore ESP. Dial in by taste and time; it is not a tested setting for every coffee.",
        }
      : entry.note;
  return { ...entry, setting, note };
}
