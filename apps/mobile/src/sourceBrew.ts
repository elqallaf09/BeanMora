export interface SourceBrew {
  water_ml?: number;
  dose?: number;
  ratio?: number;
  grind_size?: number;
  rpm?: number | null;
  source_model_code?: number;
  cup_type?: string;
  model?: string;
  source_tier?: string;
  poured_water_ml?: number;
  pour_sum_matches_stated_water?: boolean;
  pours?: {
    volume: number | null;
    temperature: number | null;
    flow_rate: number | null;
    pause_seconds: number | null;
    pattern_code: number | null;
    vibration_before: number | null;
    vibration_after: number | null;
  }[];
}
const numeric = (v: unknown, zero = false): number | null =>
  typeof v === "number" && Number.isFinite(v) && (zero ? v >= 0 : v > 0)
    ? v
    : null;
export function sourceBrew(value: unknown): SourceBrew {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const result: SourceBrew = {};
  for (const field of [
    "water_ml",
    "dose",
    "ratio",
    "grind_size",
    "rpm",
    "source_model_code",
    "poured_water_ml",
  ] as const) {
    const n = numeric(row[field]);
    if (n !== null) result[field] = n;
  }
  for (const field of ["cup_type", "model", "source_tier"] as const)
    if (typeof row[field] === "string") result[field] = row[field].slice(0, 80);
  if (typeof row.pour_sum_matches_stated_water === "boolean")
    result.pour_sum_matches_stated_water = row.pour_sum_matches_stated_water;
  if (Array.isArray(row.pours))
    result.pours = row.pours
      .slice(0, 50)
      .filter((p) => p && typeof p === "object" && !Array.isArray(p))
      .map((p) => ({
        volume: numeric(p.volume),
        temperature: numeric(p.temperature, true),
        flow_rate: numeric(p.flow_rate),
        pause_seconds: numeric(p.pause_seconds, true),
        pattern_code: numeric(p.pattern_code),
        vibration_before: numeric(p.vibration_before),
        vibration_after: numeric(p.vibration_after),
      }));
  return result;
}
export function sourceTemperature(value: number | null, ar: boolean): string {
  return value === null ? "—" : `${value}°C`;
}
