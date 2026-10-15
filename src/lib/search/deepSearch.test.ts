import { expect, it } from "vitest";
import { matchesDeepSearch,canonicalSearchQuery } from "./deepSearch";
import {multilingualSearchVocabulary} from './multilingual-vocabulary';
it.each(['جوز الهند', 'جوزالهند', 'كوكونت', 'كوكونوت', 'كوكونات', 'كوكونن'])(
  'coconut spelling %s retrieves published recipes without dropping other terms', (query) => {
    expect(matchesDeepSearch('Coconut beans', query)).toBe(true);
    expect(matchesDeepSearch(query, 'coconut')).toBe(true);
    expect(matchesDeepSearch('Coconut beans honey', query + ' عسل')).toBe(true);
    expect(matchesDeepSearch('Coconut beans', query + ' عسل')).toBe(false);
    expect(matchesDeepSearch('Coconut beans', query + ' unknown_brand_fixture')).toBe(false);
    expect(matchesDeepSearch('Chocolate beans', query)).toBe(false);
    expect(matchesDeepSearch('Walnut coffee from India', query)).toBe(false);
  },
);
it.each([
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
  ])("Arabic alias %s retrieves the original source text", (english, arabic) => {
  expect(matchesDeepSearch(english, arabic)).toBe(true);
});
it("Arabic compound queries preserve all terms and literal punctuation", () => {
  expect(matchesDeepSearch("Kenya black tea", "كينيا شاي أسود")).toBe(true);
  expect(matchesDeepSearch("Colombia black tea", "كينيا شاي أسود")).toBe(false);
  expect(matchesDeepSearch("Kenya black tea", "%') OR true --")).toBe(false);
});
// Each concept gets its own timeout. The full dictionary remains exhaustive,
// without making the combined work depend on the speed of a shared CI runner.
it.each(multilingualSearchVocabulary.map(([canonical,...aliases])=>[canonical,aliases] as const))(
  'reviewed multilingual aliases retrieve %s', (canonical,aliases)=>{
    for(const alias of aliases) expect(matchesDeepSearch(canonical,alias),canonical+' / '+alias).toBe(true);
  });
it('multilingual compound queries preserve literal AND constraints',()=>{
  for(const query of ['noix de coco miel','cocco miele','coco miel','coco mel','ココナッツとはちみつ','椰子和蜂蜜']) {
    expect(matchesDeepSearch('coconut honey Colombia',query),query).toBe(true);
    expect(matchesDeepSearch('coconut Colombia',query),query).toBe(false);
    expect(matchesDeepSearch('coconut honey Kenya',query+' missingbrand'),query).toBe(false);
  }
  expect(canonicalSearchQuery('プディング ココナッツ')).toBe('プディング coconut');
  expect(canonicalSearchQuery("UnknownBrand %') OR true --")).toBe("UnknownBrand %') OR true --");
});
