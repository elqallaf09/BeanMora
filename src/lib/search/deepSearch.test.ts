import { expect, it } from "vitest";
import { matchesDeepSearch } from "./deepSearch";
it("Arabic names and displayed flavor labels retrieve original source text without changing it", () => {
  for (const [english, arabic] of [
    ["Kenya", "كينيا"],
    ["Colombia", "كولومبيا"],
    ["Gesha", "قيشا"],
    ["beeswax", "شمع العسل"],
    ["red currant", "كشمش أحمر"],
    ["blackcurrant", "كشمش أسود"],
    ["black tea", "شاي أسود"],
    ["yellow peach", "خوخ أصفر"],
  ])
    expect(matchesDeepSearch(english, arabic)).toBe(true);
  expect(matchesDeepSearch("Kenya black tea", "كينيا شاي أسود")).toBe(true);
  expect(matchesDeepSearch("Colombia black tea", "كينيا شاي أسود")).toBe(false);
  expect(matchesDeepSearch("Kenya black tea", "%') OR true --")).toBe(false);
});
