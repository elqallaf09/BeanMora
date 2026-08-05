/**
 * Pure recipe math shared by the V60/Espresso/xBloom recipe builders
 * (Phase 4+) and covered by unit tests here in Phase 1 so the core
 * formulas are locked down before the builder UI is built on top of them.
 */

export interface Pour {
  waterGrams: number;
  startAtSeconds: number;
}

/** Coffee-to-water ratio, expressed as the "1:N" N value, rounded to 2dp. */
export function calculateRatio(doseGrams: number, waterGrams: number): number {
  if (doseGrams <= 0) {
    throw new Error("doseGrams must be greater than 0");
  }
  return Math.round((waterGrams / doseGrams) * 100) / 100;
}

/** Sum of all pour amounts, including bloom if passed as a pour. */
export function totalPourWater(pours: Pour[]): number {
  return Math.round(pours.reduce((sum, p) => sum + p.waterGrams, 0) * 100) / 100;
}

/**
 * A recipe's pours must sum to its declared total water within a small
 * floating-point tolerance. Used by the recipe builder to block submission
 * (spec §13: "التحقق من أن مجموع الصبات يساوي كمية الماء").
 */
export function validatePourSum(
  pours: Pour[],
  totalWaterGrams: number,
  toleranceGrams = 0.5,
): { valid: boolean; difference: number } {
  const sum = totalPourWater(pours);
  const difference = Math.round((sum - totalWaterGrams) * 100) / 100;
  return { valid: Math.abs(difference) <= toleranceGrams, difference };
}

/** Total elapsed brew time, from the last pour's start time to brew end. */
export function calculateTotalTime(pours: Pour[], finalDrawdownSeconds: number): number {
  if (pours.length === 0) return finalDrawdownSeconds;
  const lastPourStart = Math.max(...pours.map((p) => p.startAtSeconds));
  return lastPourStart + finalDrawdownSeconds;
}

/** xBloom dose is only valid within the device's supported range (5–18g). */
export function isXBloomDoseValid(doseGrams: number): boolean {
  return doseGrams >= 5 && doseGrams <= 18;
}
