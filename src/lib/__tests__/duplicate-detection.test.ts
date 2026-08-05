import { describe, expect, it } from "vitest";
import {
  coffeeLotSimilarity,
  roastedProductSimilarity,
  suggestAction,
  tokenSimilarity,
} from "@/lib/duplicate-detection";

describe("tokenSimilarity", () => {
  it("is 1 for identical normalized strings", () => {
    expect(tokenSimilarity("Yirgacheffe", "yirgacheffe")).toBe(1);
  });

  it("ignores punctuation and extra whitespace", () => {
    expect(tokenSimilarity("Guji, Ethiopia", "guji   ethiopia")).toBe(1);
  });

  it("is 0 for completely different strings", () => {
    expect(tokenSimilarity("Ethiopia Guji", "Colombia Huila")).toBe(0);
  });

  it("is partial for partially overlapping strings", () => {
    const score = tokenSimilarity("Guji Ethiopia Natural", "Guji Ethiopia Washed");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("coffeeLotSimilarity", () => {
  it("scores the same lot sold under slightly different text as highly similar", () => {
    const a = { originCountry: "Ethiopia", originRegion: "Guji", farm: "Guji Highlands", varietal: "Heirloom", process: "natural" };
    const b = { originCountry: "Ethiopia", originRegion: "Guji", farm: "Guji Highlands Cooperative", varietal: "Heirloom", process: "natural" };
    expect(coffeeLotSimilarity(a, b)).toBeGreaterThanOrEqual(0.85);
  });

  it("scores genuinely different lots as low similarity", () => {
    const a = { originCountry: "Ethiopia", farm: "Guji Highlands", varietal: "Heirloom", process: "natural" };
    const b = { originCountry: "Colombia", farm: "Finca El Paraiso", varietal: "Caturra", process: "washed" };
    expect(coffeeLotSimilarity(a, b)).toBeLessThan(0.5);
  });

  it("does not treat same-region-different-farm as a duplicate on region alone", () => {
    const a = { originCountry: "Ethiopia", originRegion: "Guji", farm: "Farm A", varietal: "Heirloom", process: "natural" };
    const b = { originCountry: "Ethiopia", originRegion: "Guji", farm: "Farm B (unrelated)", varietal: "Typica", process: "washed" };
    expect(coffeeLotSimilarity(a, b)).toBeLessThan(0.85);
  });
});

describe("roastedProductSimilarity", () => {
  it("returns null when comparing products from different roasters", () => {
    // Two roasters selling the same origin lot is normal, never a duplicate.
    const a = { roasterId: "roaster-a", nameEn: "Ethiopia Guji Natural" };
    const b = { roasterId: "roaster-b", nameEn: "Ethiopia Guji Natural" };
    expect(roastedProductSimilarity(a, b)).toBeNull();
  });

  it("scores near-identical product names from the same roaster as similar", () => {
    const a = { roasterId: "roaster-a", nameEn: "Ethiopia Guji Natural 250g" };
    const b = { roasterId: "roaster-a", nameEn: "Ethiopia Guji Natural" };
    const score = roastedProductSimilarity(a, b);
    expect(score).not.toBeNull();
    expect(score as number).toBeGreaterThan(0.5);
  });
});

describe("suggestAction", () => {
  it("suggests merge only above the high-confidence threshold", () => {
    expect(suggestAction(0.95)).toBe("merge");
    expect(suggestAction(0.85)).toBe("merge");
  });

  it("suggests needs_review in the middle band", () => {
    expect(suggestAction(0.6)).toBe("needs_review");
    expect(suggestAction(0.5)).toBe("needs_review");
  });

  it("suggests keep_separate for low similarity", () => {
    expect(suggestAction(0.2)).toBe("keep_separate");
    expect(suggestAction(0)).toBe("keep_separate");
  });
});
