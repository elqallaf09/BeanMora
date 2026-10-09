import { catalogSearchVocabulary } from "../catalog-names";
import { flavorSearchVocabulary } from "./flavor-vocabulary";
import { coffeeNameAliases } from "./coffee-name-aliases";
/** Shared literal search vocabulary; expands retrieval terms without changing coffee facts. */
export const searchVocabulary: readonly (readonly string[])[] = [
  ["rawi", "rawee", "راوي", "راوى"],
  ["jebla", "jabla", "جبلة", "جبله"],
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
  ...flavorSearchVocabulary,
  ...catalogSearchVocabulary,
  ...coffeeNameAliases,
  ["coffee", "قهوة", "القهوة", "بن", "البن"],
  ["gesha", "geisha", "قيشا", "قيشة", "غيشا", "جيشا"],
  ["zill", "زل", "زيل", "زِلّ"],
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
const normalizedVocabulary = searchVocabulary.map((group) =>
  group.map(normalizeSearch),
);
export function deepSearchText(value: string): string {
  const original = normalizeSearch(value);
  const words = new Set(original.split(/[^\p{L}\p{N}]+/u));
  const extra = normalizedVocabulary
    .filter((group) =>
      group.some((alias) => {
        const term = alias;
        return term.includes(" ") || !/[\p{L}\p{N}]/u.test(term)
          ? original.includes(term)
          : words.has(term);
      }),
    )
    .flatMap((group) => group);
  return [original, ...extra].join(" ");
}
export function matchesDeepSearch(value: string, query: string): boolean {
  if (!query.trim()) return true;
  return matchesIndexedSearch(deepSearchText(value), query);
}
export function matchesIndexedSearch(indexed: string, query: string): boolean {
  return normalizeSearch(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => indexed.includes(word));
}
