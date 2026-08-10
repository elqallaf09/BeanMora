import { describe, it, expect } from "vitest";
import { extractParameters, looksLikeRecipe, contentHash } from "../extract";
import { isBlockedPlatform, isConfigured, SOURCE_REGISTRY, BLOCKED_PLATFORMS } from "../sources";

describe("extractParameters — brew method", () => {
  it("identifies each supported method", () => {
    expect(extractParameters("A classic V60 recipe").brewMethod).toBe("v60");
    expect(extractParameters("Dialing in espresso on the Flair 58").brewMethod).toBe("espresso");
    expect(extractParameters("My xBloom profile").brewMethod).toBe("xbloom");
    expect(extractParameters("AeroPress inverted method").brewMethod).toBe("aeropress");
    expect(extractParameters("Chemex for six").brewMethod).toBe("chemex");
    expect(extractParameters("French press steeping").brewMethod).toBe("french_press");
    expect(extractParameters("Cold brew overnight").brewMethod).toBe("cold_brew");
  });

  it("returns null when no method is mentioned", () => {
    expect(extractParameters("A lovely morning at the cafe").brewMethod).toBeNull();
  });
});

describe("extractParameters — quantities", () => {
  it("reads a labelled dose", () => {
    expect(extractParameters("Dose: 18g").doseGrams).toBe(18);
    expect(extractParameters("18g of coffee").doseGrams).toBe(18);
    expect(extractParameters("Use 20.5 g coffee, ground fine").doseGrams).toBe(20.5);
  });

  it("reads water and yield separately", () => {
    expect(extractParameters("300g water").waterGrams).toBe(300);
    expect(extractParameters("Yield: 36g").yieldGrams).toBe(36);
    expect(extractParameters("18g : 36g in 28 seconds").yieldGrams).toBe(36);
  });

  it("ignores gram figures that are out of plausible range", () => {
    // A 900g "dose" is a bag weight, not a dose.
    expect(extractParameters("900g of coffee beans in the bag").doseGrams).toBeNull();
  });

  it("does not invent a dose from unrelated numbers", () => {
    const p = extractParameters("We visited 3 cafes and walked 5 km that morning.");
    expect(p.doseGrams).toBeNull();
    expect(p.waterGrams).toBeNull();
  });
});

describe("extractParameters — temperature", () => {
  it("reads Celsius directly", () => {
    expect(extractParameters("Brew at 93C").waterTempC).toBe(93);
    expect(extractParameters("Water temperature: 94.5 °C").waterTempC).toBe(94.5);
  });

  it("converts Fahrenheit to Celsius", () => {
    // 200F ≈ 93.3C
    expect(extractParameters("Heat water to 200F").waterTempC).toBeCloseTo(93.3, 1);
  });

  it("rejects temperatures outside brewing range", () => {
    expect(extractParameters("It was 25C outside").waterTempC).toBeNull();
  });
});

describe("extractParameters — ratio", () => {
  it("reads a stated ratio", () => {
    expect(extractParameters("A 1:16 brew ratio").ratio).toBe(16);
    expect(extractParameters("Ratio 1:16.7 works well").ratio).toBe(16.7);
  });

  it("derives dose:water for filter when not stated", () => {
    const p = extractParameters("V60. Dose: 18g. 300g water.");
    expect(p.ratio).toBeCloseTo(16.67, 1);
  });

  it("derives dose:yield for espresso, not dose:water", () => {
    const p = extractParameters("Espresso. Dose: 18g. Yield: 36g.");
    expect(p.ratio).toBe(2);
  });
});

describe("extractParameters — timings", () => {
  it("parses mm:ss, compound and bare-second forms", () => {
    expect(extractParameters("Total time 2:45").totalTimeSeconds).toBe(165);
    expect(extractParameters("Brew time: 1 min 30 sec").totalTimeSeconds).toBe(90);
    expect(extractParameters("Shot time: 28s").totalTimeSeconds).toBe(28);
  });

  it("reads bloom duration in either phrasing", () => {
    expect(extractParameters("Bloom for 45 seconds").bloomSeconds).toBe(45);
    expect(extractParameters("A 30s bloom, then pour").bloomSeconds).toBe(30);
  });
});

describe("extractParameters — espresso pressure", () => {
  it("captures a multi-stage profile with labels and timings", () => {
    const p = extractParameters(
      "Flair 58: 2 bar pre-infusion for 10 seconds, then 9 bar extraction.",
    );
    expect(p.pressureProfile).toHaveLength(2);
    expect(p.pressureProfile?.[0]).toMatchObject({ bar: 2, seconds: 10, label: "pre-infusion" });
    expect(p.pressureProfile?.[1]).toMatchObject({ bar: 9, label: "extraction" });
  });

  it("ignores implausible pressures", () => {
    expect(extractParameters("A 400 bar industrial pump").pressureProfile).toBeNull();
  });
});

describe("extractParameters — pour schedule", () => {
  it("builds an ordered schedule from timed pours", () => {
    const p = extractParameters("Pour 36g at 0:00, then 180g at 0:45, then 300g at 1:30.");
    expect(p.pourSchedule).toHaveLength(3);
    expect(p.pourSchedule?.[0]).toMatchObject({ atSeconds: 0, waterGrams: 36, isBloom: true });
    expect(p.pourSchedule?.[2]).toMatchObject({ atSeconds: 90, waterGrams: 300 });
  });

  it("requires at least two points to count as a schedule", () => {
    expect(extractParameters("Pour 300g at 1:30.").pourSchedule).toBeNull();
  });
});

describe("extractParameters — measurements and provenance", () => {
  it("reads TDS and extraction yield", () => {
    const p = extractParameters("Measured TDS 1.38%, extraction yield 21.5%");
    expect(p.tds).toBe(1.38);
    expect(p.extractionYield).toBe(21.5);
  });

  it("identifies origin, process, varietal and roast level", () => {
    const p = extractParameters(
      "An Ethiopian Yirgacheffe, washed process, heirloom varietal, light roast.",
    );
    expect(p.originCountry).toBe("Ethiopia");
    expect(p.process).toBe("washed");
    expect(p.varietal).toMatch(/heirloom/i);
    expect(p.roastLevel).toBe("light");
  });

  it("recognises grinders and brewers by name", () => {
    const p = extractParameters("Ground on a Comandante C40 at 22 clicks, brewed in a Hario V60 02.");
    expect(p.grinderName).toMatch(/comandante c40/i);
    expect(p.grindSetting).toContain("22");
    expect(p.brewerName).toMatch(/hario v60/i);
  });
});

describe("extractParameters — confidence", () => {
  it("scores a complete recipe highly", () => {
    const p = extractParameters(
      "V60 recipe. Dose: 18g. Water: 300g at 94C. Ratio 1:16.7. Total time 2:45.",
    );
    expect(p.confidence).toBeGreaterThan(0.7);
  });

  it("scores prose with only soft signals low", () => {
    const p = extractParameters("An Ethiopian coffee, washed, light roast. Delicious.");
    expect(p.confidence).toBeLessThan(0.3);
  });
});

describe("looksLikeRecipe", () => {
  it("accepts a method plus a quantity", () => {
    expect(looksLikeRecipe(extractParameters("V60 with 18g of coffee"))).toBe(true);
  });

  it("accepts a dose/water pair even without a named method", () => {
    expect(looksLikeRecipe(extractParameters("Dose: 18g, 300g water"))).toBe(true);
  });

  it("rejects an article that merely mentions coffee", () => {
    expect(looksLikeRecipe(extractParameters("We toured three roasteries in Oslo."))).toBe(false);
  });

  it("rejects a method mention with no numbers at all", () => {
    expect(looksLikeRecipe(extractParameters("I prefer the V60 to the Chemex."))).toBe(false);
  });
});

describe("contentHash", () => {
  it("is stable for identical parameters", () => {
    const a = extractParameters("V60. 18g. 300g water. 94C. 2:45.");
    const b = extractParameters("V60. 18g. 300g water. 94C. 2:45.");
    expect(contentHash(a)).toBe(contentHash(b));
  });

  it("differs when a parameter differs", () => {
    const a = extractParameters("V60. Dose: 18g. 300g water.");
    const b = extractParameters("V60. Dose: 20g. 300g water.");
    expect(contentHash(a)).not.toBe(contentHash(b));
  });

  it("collapses the same recipe republished with different prose", () => {
    const a = extractParameters("Our house V60. Dose: 18g. 300g water at 94C. Total time 2:45.");
    const b = extractParameters("V60 guide — dose 18g, water 300g, 94C, total time 2:45. Enjoy!");
    expect(contentHash(a)).toBe(contentHash(b));
  });
});

/* ------------------------------------------------------------------ */
/* Compliance guardrails — these encode legal constraints, not prefs   */
/* ------------------------------------------------------------------ */

describe("source compliance", () => {
  it("blocks platforms whose terms prohibit automated collection", () => {
    expect(isBlockedPlatform("https://www.instagram.com/p/abc").blocked).toBe(true);
    expect(isBlockedPlatform("https://www.tiktok.com/@user/video/1").blocked).toBe(true);
    expect(isBlockedPlatform("https://www.facebook.com/post/1").blocked).toBe(true);
  });

  it("gives a stated reason for every block", () => {
    for (const b of BLOCKED_PLATFORMS) {
      expect(b.reason.length).toBeGreaterThan(20);
    }
  });

  it("allows a published feed", () => {
    expect(isBlockedPlatform("https://sprudge.com/feed").blocked).toBe(false);
  });

  it("registers no source pointing at a blocked platform", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(isBlockedPlatform(s.endpoint).blocked).toBe(false);
      if (s.siteUrl) expect(isBlockedPlatform(s.siteUrl).blocked).toBe(false);
    }
  });

  it("uses only access modes we have a compliant client for", () => {
    const allowed = new Set(["rss", "youtube_api", "reddit_api", "x_api", "sitemap", "partner_feed"]);
    for (const s of SOURCE_REGISTRY) {
      expect(allowed.has(s.accessMode)).toBe(true);
    }
  });

  it("treats credential-gated sources as unconfigured when the env var is absent", () => {
    const yt = SOURCE_REGISTRY.find((s) => s.accessMode === "youtube_api")!;
    expect(isConfigured(yt, {} as NodeJS.ProcessEnv)).toBe(false);
    expect(isConfigured(yt, { YOUTUBE_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("treats feed sources as configured with no credentials", () => {
    const rss = SOURCE_REGISTRY.find((s) => s.slug === "sprudge")!;
    expect(isConfigured(rss, {} as NodeJS.ProcessEnv)).toBe(true);
  });
});
