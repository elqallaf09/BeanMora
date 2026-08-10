import { describe, expect, it } from "vitest";
import { TASTING_NOTES, isTastingNote, isValidAttemptInput } from "@/lib/espresso-attempt";

describe("TASTING_NOTES", () => {
  it("has exactly the six presets the edit/create UI offers", () => {
    expect(TASTING_NOTES).toEqual(["balanced", "too_sour", "too_bitter", "too_fast", "too_slow", "custom"]);
  });
});

describe("isTastingNote", () => {
  it("accepts every preset", () => {
    for (const note of TASTING_NOTES) {
      expect(isTastingNote(note)).toBe(true);
    }
  });

  it("rejects arbitrary strings, null, and undefined", () => {
    expect(isTastingNote("delicious")).toBe(false);
    expect(isTastingNote(null)).toBe(false);
    expect(isTastingNote(undefined)).toBe(false);
    expect(isTastingNote("")).toBe(false);
  });
});

describe("isValidAttemptInput", () => {
  it("accepts a normal shot", () => {
    expect(isValidAttemptInput({ doseGrams: 18, waterGrams: 36, timeSeconds: 28 })).toBe(true);
  });

  it("rejects zero or negative values", () => {
    expect(isValidAttemptInput({ doseGrams: 0, waterGrams: 36, timeSeconds: 28 })).toBe(false);
    expect(isValidAttemptInput({ doseGrams: 18, waterGrams: 0, timeSeconds: 28 })).toBe(false);
    expect(isValidAttemptInput({ doseGrams: 18, waterGrams: 36, timeSeconds: 0 })).toBe(false);
    expect(isValidAttemptInput({ doseGrams: -1, waterGrams: 36, timeSeconds: 28 })).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isValidAttemptInput({ doseGrams: NaN, waterGrams: 36, timeSeconds: 28 })).toBe(false);
    expect(isValidAttemptInput({ doseGrams: 18, waterGrams: Infinity, timeSeconds: 28 })).toBe(false);
  });
});
