import { expect, it } from "vitest";
import { matchesDeepSearch,canonicalSearchQuery,canonicalFlavorQuery,deepSearchText,matchesIndexedSearch } from "./deepSearch";
import {multilingualSearchVocabulary} from './multilingual-vocabulary';
import {flavorSearchVocabulary, flavorRetrievalEquivalents} from './flavor-vocabulary';

it.each(flavorSearchVocabulary.map(group => [group[0], group] as const))(
  'every reviewed flavor spelling retrieves %s in both directions', (canonical, aliases) => {
    for (const alias of aliases) {
      expect(matchesDeepSearch(canonical, alias), alias).toBe(true);
      expect(matchesDeepSearch(alias, canonical), alias).toBe(true);
      expect(matchesDeepSearch(canonical, alias+' unknown_brand_fixture'), alias).toBe(false);
    }
  });
it.each(flavorSearchVocabulary.map(group => [group[0], group] as const))(
  'query spellings use the same complete concept for %s', (canonical, aliases) => {
    for(const alias of aliases) {
      expect(canonicalFlavorQuery(alias)).toBe(canonicalFlavorQuery(canonical));
      expect(canonicalFlavorQuery(alias+' unknown_brand_fixture')).toBe(canonicalFlavorQuery(canonical)+' unknown_brand_fixture');
    }
  });
it.each(flavorRetrievalEquivalents[0])('cocoa/chocolate search accepts %s without dropping other terms', alias => {
  expect(matchesDeepSearch('Cocoa', alias)).toBe(true);
  expect(matchesDeepSearch('Chocolate', alias)).toBe(true);
  expect(matchesDeepSearch(alias, 'cocoa')).toBe(true);
  expect(matchesDeepSearch(alias, 'chocolate')).toBe(true);
  expect(matchesDeepSearch('Cocoa honey', alias+' honey')).toBe(true);
  expect(matchesDeepSearch('Cocoa', alias+' honey')).toBe(false);
});
it('keeps cola, coconut and winegum separate, with literal unknown constraints', () => {
  for (const alias of flavorSearchVocabulary.find(group => group[0]==='cola')!) {
    expect(matchesDeepSearch('Chocolate coconut', alias), alias).toBe(false);
    expect(matchesDeepSearch('Cola strawberry', alias+' فراولة'), alias).toBe(true);
    expect(matchesDeepSearch('Cola', alias+' فراولة'), alias).toBe(false);
    expect(matchesDeepSearch('Cola', alias+' unknown_brand_fixture'), alias).toBe(false);
  }
  for (const alias of flavorSearchVocabulary.find(group => group[0]==='wine')!) {
    expect(matchesDeepSearch('Winegum', alias), alias).toBe(false);
    expect(matchesDeepSearch('Red wine', alias), alias).toBe(true);
  }
  expect(matchesDeepSearch('White chocolate', 'dark chocolate')).toBe(false);
  expect(matchesDeepSearch('White wine', 'red wine')).toBe(false);
  expect(matchesDeepSearch('Cola wine', 'كوكاكولا واين')).toBe(true);
  expect(matchesDeepSearch('Cola', "كوكاكولا %') OR true --")).toBe(false);
});
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

it('keeps complete-term boundaries and adjacent CJK concepts during literal replacement', () => {
  expect(canonicalSearchQuery('noix de coco miel')).toBe('coconut honey');
  expect(canonicalSearchQuery('椰子和蜂蜜')).toBe('coconut honey');
  expect(canonicalFlavorQuery('cola_ cola winegum')).toBe('cola_ cola winegum');
  expect(canonicalFlavorQuery('𐐀cola cola𐐀 cola')).toBe(normalizeExpected('𐐀cola cola𐐀 cola'));
  function normalizeExpected(value: string) { return value.normalize('NFKD').toLowerCase(); }
});
it('indexes a full bilingual catalog without a multi-second synchronous stall', () => {
  const start = performance.now();
  const documents = Array.from({ length: 239 }, (_,i) => deepSearchText(
    'Coffee '+i+' العنب إثيوبيا washed red grapes tart berries jasmine '+('other details '.repeat(80)),
  ));
  expect(documents.every(document => matchesIndexedSearch(document,'grape'))).toBe(true);
  // A broad regression budget for shared CI; native single-tap tests enforce
  // actual navigation on Hermes. This batch took over 10 seconds before the fix.
  expect(performance.now()-start).toBeLessThan(5000);
});
