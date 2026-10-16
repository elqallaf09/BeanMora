import { normalizeSearch } from './core/deepSearch';
import { coffeeOrigins, coffeeVarieties, coffeeProcesses, coffeeRoasts } from './core/coffee-label-vocabulary';
import { flavorSearchVocabulary } from './core/flavor-vocabulary';
import type { CoffeeItem } from './data';

export type CoffeeLabel = { name: string; origin: string; variety: string; process: string; roast: string; notes: string };
export const emptyCoffeeLabel = (): CoffeeLabel => ({ name: '', origin: '', variety: '', process: '', roast: '', notes: '' });
const normalized = (text: string) => normalizeSearch(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const contains = (text: string, term: string) => (' ' + normalized(text) + ' ').includes(' ' + normalized(term) + ' ');
function found(text: string, groups: readonly (readonly string[])[]): string[] {
  return groups.filter(g => g.some(t => contains(text, t))).map(g => g[0]);
}
const headings = {
  name: 'coffee(?: name)?|name|اسم البن|اسم القهوة|الاسم',
  origin: 'origin|country|منشأ|المنشأ|المنشا|بلد المنشأ|بلد|الدولة|البلد',
  variety: 'variet(?:y|al|ies)|السلالة|سلالة|الصنف',
  process: 'process(?:ing)?|المعالجة|معالجة',
  roast: 'roast(?: level)?|التحميص|تحميص|درجة التحميص',
  notes: '(?:tasting |flavou?r )?notes|flavou?rs?|الإيحاءات|الايحاءات|إيحاءات|ايحاءات|النكهات|نكهات',
} as const;
const heading = new RegExp(`^(?:${Object.values(headings).join('|')})(?:\\s*[:：|–-]|$)`, 'iu');
const packaging = /roast(?:ed|ery)|address|street|specialty|speciality|net weight|www\.|https?:|@|محمصة|محمصه|العنوان|هاتف|تحميص|قهوة مختصة|تاريخ|الوزن/iu;
const cleanOcrLine = (value: string) => value.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '').replace(/\s+/g, ' ').trim();
/** Reject short OCR debris such as "SE oe" instead of presenting it as a coffee name. */
export function plausibleCoffeeName(value: string): boolean {
  const words = value.match(/[\p{L}\p{M}]+/gu) ?? [];
  const letters = words.join('');
  return letters.length >= 4 && words.some(w => w.length >= 3)
    && letters.length / Math.max(1, value.replace(/\s/g, '').length) >= 0.65
    && !packaging.test(value) && !heading.test(value) && value.length <= 160
    && !/[|\\/=:;]/u.test(value)
    && words.every(word => word.length >= 3 || /^(?:el|la|lo|las|los|de|del|di|da|do|al|of|بن|أبو|ابو)$/iu.test(word))
    && !(/\p{Script=Arabic}/u.test(value) && /[a-z]/iu.test(value));
}
/** Literal extraction only. No origin, flavor or catalog identity is guessed. */
export function readCoffeeLabel(text: string): CoffeeLabel {
  const lines = text.slice(0, 20000).split(/\r?\n/).map(cleanOcrLine).filter(Boolean);
  const labeled = (key: keyof typeof headings) => {
    const pattern = new RegExp(`^(?:${headings[key]})\\s*(?:[:：|–-]\\s*|$)(.*)$`, 'iu');
    // RTL layout can place the value before its heading in OCR reading order.
    const reversed = new RegExp(`^(.+?)\\s*[:：|–-]\\s*(?:${headings[key]})$`, 'iu');
    const index = lines.findIndex(l => pattern.test(l) || reversed.test(l));
    if (index < 0) return '';
    const reverseValue = lines[index].match(reversed)?.[1]?.trim();
    if (reverseValue) return reverseValue;
    const inline = lines[index].match(pattern)?.[1]?.trim();
    if (inline) return inline;
    const next = lines[index + 1];
    return next && !heading.test(next) && !packaging.test(next) ? next : '';
  };
  const standaloneFlavor = (line: string) => flavorSearchVocabulary.some(group => group.some(alias => normalized(line) === normalized(alias)));
  const notes = labeled('notes') || lines.find(l => /[,،;·]/u.test(l) && found(l, flavorSearchVocabulary).length >= 2)
    || lines.filter(standaloneFlavor).filter((line, i, all) => all.findIndex(other => normalized(other) === normalized(line)) === i).join(', ');
  const originLine = labeled('origin');
  // Coconut (جوز الهند) is a taste, not evidence that the beans grew in India.
  const originText = originLine || lines.filter(l => !packaging.test(l) && l !== notes && !standaloneFlavor(l)
    && !/notes|إيحاءات|ايحاءات|نكهات/iu.test(l)).join(' ');
  const origins = found(originText, coffeeOrigins);
  const processLine = labeled('process') || lines.find(l => found(l, coffeeProcesses).length && !/notes|إيحاءات|ايحاءات|نكهات|[,،]/iu.test(l)) || '';
  const roastLine = labeled('roast') || lines.find(l => /roast|تحميص/iu.test(l) && !packaging.test(l.replace(/roast|تحميص/iu,''))) || '';
  const varietyLine = labeled('variety');
  const varieties = varietyLine ? found(varietyLine, coffeeVarieties) : coffeeVarieties
    .filter(group => group[0] !== 'Java' && lines.some(line => group.some(alias => normalized(line) === normalized(alias))))
    .map(group => group[0]);
  const processes = found(processLine, coffeeProcesses), roasts = found(roastLine, coffeeRoasts);
  const explicitName = labeled('name');
  const roasterNames = new Set<number>();
  lines.forEach((line, index) => {
    if (/^(?:roastery|roasters?|محمصة|محمصه)$/iu.test(line) && index > 0) roasterNames.add(index - 1);
  });
  // A logo alone is not evidence of a coffee name. Require a name heading or
  // a product title on/just after a growing-country line; never take the first OCR line.
  const title = lines.find((line, index) => plausibleCoffeeName(line) && !roasterNames.has(index)
    && !/[:：]|^\d/iu.test(line) && line !== notes && line !== processLine && line !== roastLine && !standaloneFlavor(line)
    && ![...coffeeOrigins, ...coffeeVarieties].some(g => g.some(t => normalized(line) === normalized(t)))
    && (found(line, coffeeOrigins).length === 1 || (index > 0 && coffeeOrigins.some(g => g.some(t => normalized(lines[index - 1]) === normalized(t))))));
  const name = explicitName ? (plausibleCoffeeName(explicitName) ? explicitName : '') : title || '';
  // Keep an explicitly labeled process even when it is absent from the small
  // normalization vocabulary (e.g. carbonic infusion). Do not invent an equivalent.
  const literalProcess = labeled('process');
  return { name: name.slice(0, 160), origin: origins.length === 1 ? origins[0] : '', variety: varieties.join(', '),
    process: processes.length ? processes.join(', ') : literalProcess.slice(0, 160),
    roast: roasts.length === 1 ? roasts[0] : '', notes: notes.slice(0, 1000) };
}
export function coffeeLabelCandidates(text: string, coffees: CoffeeItem[]): CoffeeItem[] {
  const seen = new Set<string>();
  return coffees.filter(c => {
    const key = `${c.kind}:${c.id}`;
    if (seen.has(key)) return false;
    const matches = [c.name, c.localeContent?.en?.name, c.localeContent?.ar?.name].some(name => {
      if (!name || name.length < 8 || normalized(name).split(' ').length < 2) return false;
      return contains(text, name);
    });
    if (matches) seen.add(key);
    return matches;
  }).slice(0, 3);
}
export function hasCoffeeLabelFacts(label: CoffeeLabel): boolean {
  return Boolean(label.origin.trim() || label.variety.trim() || label.notes.trim());
}
