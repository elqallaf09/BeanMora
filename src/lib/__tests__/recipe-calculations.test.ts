import { describe, expect, it } from "vitest";
import {
  calculateRatio,
  calculateTotalTime,
  isXBloomDoseValid,
  totalPourWater,
  validatePourSum,
} from "@/lib/recipe-calculations";

describe("calculateRatio", () => {
  it("computes the 1:N ratio", () => {
    expect(calculateRatio(15, 250)).toBeCloseTo(16.67, 2);
    expect(calculateRatio(20, 300)).toBe(15);
  });

  it("throws for a non-positive dose", () => {
    expect(() => calculateRatio(0, 250)).toThrow();
  });
});

describe("totalPourWater", () => {
  it("sums pour amounts", () => {
    const pours = [
      { waterGrams: 50, startAtSeconds: 0 },
      { waterGrams: 100, startAtSeconds: 30 },
      { waterGrams: 100, startAtSeconds: 60 },
    ];
    expect(totalPourWater(pours)).toBe(250);
  });
});

describe("validatePourSum", () => {
  const pours = [
    { waterGrams: 50, startAtSeconds: 0 },
    { waterGrams: 200, startAtSeconds: 30 },
  ];

  it("passes when pours sum to the declared total water", () => {
    expect(validatePourSum(pours, 250).valid).toBe(true);
  });

  it("fails when pours don't sum to the declared total water", () => {
    const result = validatePourSum(pours, 260);
    expect(result.valid).toBe(false);
    expect(result.difference).toBeCloseTo(-10, 2);
  });
});

describe("calculateTotalTime", () => {
  it("adds final drawdown to the last pour's start time", () => {
    const pours = [
      { waterGrams: 50, startAtSeconds: 0 },
      { waterGrams: 100, startAtSeconds: 45 },
    ];
    expect(calculateTotalTime(pours, 30)).toBe(75);
  });

  it("falls back to drawdown time alone with no pours", () => {
    expect(calculateTotalTime([], 20)).toBe(20);
  });
});

describe("isXBloomDoseValid", () => {
  it("accepts the 5-18g supported range", () => {
    expect(isXBloomDoseValid(5)).toBe(true);
    expect(isXBloomDoseValid(18)).toBe(true);
    expect(isXBloomDoseValid(11.5)).toBe(true);
  });

  it("rejects doses outside the supported range", () => {
    expect(isXBloomDoseValid(4.9)).toBe(false);
    expect(isXBloomDoseValid(18.1)).toBe(false);
  });
});
