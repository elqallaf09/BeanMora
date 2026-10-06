/** Shared literal search vocabulary; expands retrieval terms without changing coffee facts. */
export const searchVocabulary: readonly (readonly string[])[] = [
  [
    "strawberry",
    "strawberries",
    "فراولة",
    "فراوله",
    "fraise",
    "fraises",
    "fresa",
    "fresas",
    "草莓",
    "イチゴ",
    "🍓",
  ],
  ["blueberry", "blueberries", "توت ازرق", "توت أزرق", "بلوبيري"],
  ["raspberry", "raspberries", "توت العليق", "رازبيري"],
  ["peach", "peaches", "خوخ"],
  ["chocolate", "شوكولاتة", "شوكولاته"],
  ["cocoa", "cacao", "كاكاو"],
  ["jasmine", "ياسمين"],
  ["caramel", "كراميل"],
  ["vanilla", "فانيلا", "فانيليا"],
  ["cherry", "cherries", "كرز"],
  ["orange", "برتقال"],
  ["lemon", "ليمون"],
  ["mango", "مانجو", "منجا"],
  ["pineapple", "اناناس", "أناناس"],
  ["passion fruit", "باشن فروت", "فاكهة العاطفة"],
  ["hazelnut", "بندق"],
  ["almond", "لوز"],
  ["honey", "عسل"],
  ["floral", "زهور", "زهري"],
  ["ethiopia", "ethiopian", "اثيوبيا", "إثيوبيا"],
  ["colombia", "colombian", "كولومبيا"],
  ["cold", "iced", "ice", "بارد", "مثلج", "مثلّج"],
] as const;
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function deepSearchText(value: string): string {
  const original = normalizeSearch(value);
  const words = new Set(original.split(/[^\p{L}\p{N}]+/u));
  const extra = searchVocabulary
    .filter((group) =>
      group.some((alias) => {
        const term = normalizeSearch(alias);
        return term.includes(" ") || !/[\p{L}\p{N}]/u.test(term)
          ? original.includes(term)
          : words.has(term);
      }),
    )
    .flatMap((group) => [...group].map(normalizeSearch));
  return [original, ...extra].join(" ");
}
export function matchesDeepSearch(value: string, query: string): boolean {
  return matchesIndexedSearch(deepSearchText(value), query);
}
export function matchesIndexedSearch(indexed: string, query: string): boolean {
  return normalizeSearch(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => indexed.includes(word));
}
