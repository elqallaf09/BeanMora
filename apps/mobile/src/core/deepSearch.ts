import { catalogSearchVocabulary } from "./catalog-names";
import { flavorSearchVocabulary, flavorRetrievalEquivalents } from "./flavor-vocabulary";
import { coffeeNameAliases } from "./coffee-name-aliases";
import { coffeeLabelVocabulary } from "./coffee-label-vocabulary";
import { multilingualSearchVocabulary,multilingualCountryTerms } from "./multilingual-vocabulary";
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
  ...coffeeLabelVocabulary,
  ...multilingualSearchVocabulary.filter(([term])=>multilingualCountryTerms.includes(term))
    .map(([term,...aliases])=>[term,...aliases.filter(alias=>/\p{Script=Arabic}/u.test(alias))]),
  ["coffee", "قهوة", "القهوة", "بن", "البن"],
  ["gesha", "geisha", "قيشا", "قيشة", "غيشا", "جيشا"],
  ["zill", "زل", "زيل", "زِلّ"],
  ['tropical fruit','tropical fruits','فاكهة استوائية','فواكه استوائية'],
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
// Translate known foreign catalog terms only. Literal names and unknown terms
// remain required search terms; spaces and SQL punctuation never become syntax.
// Latin accent-insensitive matching must not remove Japanese dakuten/handakuten.
const normalizeForeign = (value:string) => value.normalize('NFKC').toLowerCase()
  .replace(/\p{Script=Latin}+/gu,part=>part.normalize('NFKD').replace(/\p{M}/gu,''));
// Consume the reviewed spellings as complete terms, including جوز الهند.
// Keep these groups aligned with recipe_discovery_query_normalize in Postgres.
const foreignTerms = multilingualSearchVocabulary.flatMap(([canonical,...aliases]) =>
  aliases.filter(alias => normalizeSearch(alias)!==normalizeSearch(canonical) &&
    (['coconut','cola','wine','chocolate','cocoa'].includes(canonical) || !/\p{Script=Arabic}/u.test(alias)))
    .map(alias=>({canonical,alias:alias.normalize('NFKC').toLowerCase()})))
  .sort((a,b)=>b.alias.length-a.alias.length);
const escapeSearch = (value:string) => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const foreignPattern = (alias:string)=>(
  (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(alias)?'':'(?<![\\p{L}\\p{N}_])')+escapeSearch(alias)+
  (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(alias)?'':'(?![\\p{L}\\p{N}_])'));
const exactAliases = new Map<string,string>();
for(const {canonical,alias} of foreignTerms) if(!exactAliases.has(alias))exactAliases.set(alias,canonical);
const countryTerms = new Set(multilingualCountryTerms);
const countryAliases = new Map(exactAliases);
for(const {canonical,alias} of foreignTerms) if(countryTerms.has(canonical))countryAliases.set(alias,canonical);
for(const canonical of countryTerms) if(exactAliases.has(canonical))countryAliases.set(canonical,canonical);
const foreignPatternAll = new RegExp([...exactAliases.keys()].map(foreignPattern).join('|'),'gu');
const accentTerms = new Map<string,Set<string>>();
for(const {canonical,alias} of foreignTerms) {
  const normalized=normalizeForeign(alias),terms=accentTerms.get(normalized)??new Set<string>();
  terms.add(canonical);accentTerms.set(normalized,terms);
}
const accentAliases = new Map([...accentTerms].filter(([,terms])=>terms.size===1).sort((a,b)=>b[0].length-a[0].length)
  .map(([alias,terms])=>[alias,[...terms][0]]));
const accentPatternAll = new RegExp([...accentAliases.keys()].map(foreignPattern).join('|'),'gu');
const canonicalQueries = new Map<string,string>();
export function canonicalSearchQuery(value:string,mode:'general'|'country'='general'):string {
  const cacheKey=mode+'\u0000'+value;
  const cached=canonicalQueries.get(cacheKey);if(cached!==undefined)return cached;
  if(mode==='country'&&countryTerms.has(value.trim().toLowerCase()))return value;
  let normalized=value.normalize('NFKC').toLowerCase(),changed=false;
  const slots:string[]=[];
  normalized=normalized.replace(foreignPatternAll,alias=>{
    changed=true;return `\u0000${slots.push((mode==='country'?countryAliases:exactAliases).get(alias)!)-1}\u0000`;
  });
  normalized=normalizeForeign(normalized);
  normalized=normalized.replace(accentPatternAll,alias=>{
    changed=true;return `\u0000${slots.push(accentAliases.get(alias)!)-1}\u0000`;
  });
  // CJK conjunctions between recognized concepts separate terms. An unknown
  // phrase, name or neighboring letter never disappears from the query.
  normalized=normalized.replace(/(\u0000\d+\u0000)\s*(?:と|和|与)\s*(?=\u0000\d+\u0000)/gu,'$1 ');
  const result=changed?normalized.replace(/\u0000(\d+)\u0000/g,(_,index)=>' '+slots[Number(index)]+' ').replace(/\s+/g,' ').trim():value;
  if(canonicalQueries.size>=128)canonicalQueries.delete(canonicalQueries.keys().next().value!);
  canonicalQueries.set(cacheKey,result);return result;
}
export function deepSearchText(value: string, options: { equivalentFlavors?: boolean } = {}): string {
  const original = normalizeSearch(value+' '+canonicalSearchQuery(value,countryTerms.has(value.trim().toLowerCase())?'country':'general'));
  const words = new Set(original.split(/[^\p{L}\p{N}]+/u));
  const vocabulary = options.equivalentFlavors === false ? normalizedVocabulary
    : [...normalizedVocabulary, ...flavorRetrievalEquivalents.map(group => group.map(normalizeSearch))];
  const extra = vocabulary
    .filter((group) =>
      group.some((alias) => {
        const term = alias;
        return !/^[\p{L}\p{N}]+$/u.test(term)
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
  // Keep literal English queries too: e.g. "raisin" is also French for grape.
  // Arabic compounds must use the canonical path (جوز الهند is not walnut/India).
  const candidates = [canonicalSearchQuery(query), canonicalSearchQuery(query,'country')];
  if (/^[\x20-\x7e]*$/.test(query)) candidates.push(query);
  return [...new Set(candidates)].some(candidate=>
    normalizeSearch(candidate).split(" ").filter(Boolean).every(word=>
      // cola is not a substring of chocolate; winegum is its own tasting note.
      ['cola','wine'].includes(word)
        ? new RegExp('(?<![\\p{L}\\p{N}_])'+word+'(?![\\p{L}\\p{N}_])','u').test(indexed)
        : indexed.includes(word)));
}
