import { expect, it } from "vitest";
import { matchesDeepSearch,canonicalSearchQuery } from "./deepSearch";
import {multilingualSearchVocabulary} from './multilingual-vocabulary';
it("Arabic names and displayed flavor labels retrieve original source text without changing it", () => {
  for (const [english, arabic] of [
    ["Kenya", "كينيا"],
    ["Colombia", "كولومبيا"],
    ["Castillo", "كاستيلو"],
    ["Brasil", "برازيل"],
    ["البرازيل", "Brazil"],
    ["Costa Rica", "كوستاريكا"],
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
it('all reviewed multilingual concepts retrieve the source and preserve literal AND constraints',()=>{
  for(const [canonical,...aliases] of multilingualSearchVocabulary) {
    for(const alias of aliases) expect(matchesDeepSearch(canonical,alias),canonical+' / '+alias).toBe(true);
  }
  for(const query of ['noix de coco miel','cocco miele','coco miel','coco mel','ココナッツとはちみつ','椰子和蜂蜜']) {
    expect(matchesDeepSearch('coconut honey Colombia',query),query).toBe(true);
    expect(matchesDeepSearch('coconut Colombia',query),query).toBe(false);
    expect(matchesDeepSearch('coconut honey Kenya',query+' missingbrand'),query).toBe(false);
  }
  expect(canonicalSearchQuery('プディング ココナッツ')).toBe('プディング coconut');
  expect(canonicalSearchQuery("UnknownBrand %') OR true --")).toBe("UnknownBrand %') OR true --");
});
