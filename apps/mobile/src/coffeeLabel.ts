import { normalizeSearch } from './core/deepSearch';
import { coffeeOrigins, coffeeVarieties, coffeeProcesses, coffeeRoasts } from './core/coffee-label-vocabulary';
import { flavorSearchVocabulary } from './core/flavor-vocabulary';
import type { CoffeeItem } from './data';

export type CoffeeLabel = { name: string; origin: string; variety: string; process: string; roast: string; notes: string };
export const emptyCoffeeLabel = (): CoffeeLabel => ({ name: '', origin: '', variety: '', process: '', roast: '', notes: '' });
const contains = (text: string, term: string) => (' ' + normalizeSearch(text).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ')
  .includes(' ' + normalizeSearch(term).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ');
function found(text: string, groups: readonly (readonly string[])[]): string[] {
  return groups.filter(g => g.some(t => contains(text, t))).map(g => g[0]);
}
/** Extract only visible label words; unknown fields remain editable and empty. */
export function readCoffeeLabel(text: string): CoffeeLabel {
  const lines = text.slice(0, 20000).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const labeled = (keys: string) => lines.find(l => new RegExp(`^(?:${keys})\\s*[:：-]`, 'iu').test(l))?.replace(/^[^:：-]+[:：-]\s*/, '') ?? '';
  const originText = labeled('origin|country|منشأ|المنشأ|بلد|الدولة') || lines.slice(0, 6)
    .filter(l => !/roast(?:ed|ery)|address|street|محمصة|العنوان|هاتف|تحميص/iu.test(l)).join(' ');
  const origins = found(originText, coffeeOrigins);
  const noteLine = labeled('(?:tasting |flavou?r )?notes|flavou?rs?|الإيحاءات|الايحاءات|إيحاءات|ايحاءات|النكهات|نكهات');
  const notes = noteLine || lines.find(l => /[,،;·]/u.test(l) && found(l, flavorSearchVocabulary).length >= 2) || '';
  const processLine = labeled('process(?:ing)?|المعالجة|معالجة') || lines.find(l => found(l, coffeeProcesses).length && !/notes|إيحاءات|نكهات|[,،]/iu.test(l)) || '';
  const roastLine = labeled('roast(?: level)?|التحميص|تحميص') || lines.find(l => /roast|تحميص/iu.test(l)) || '';
  const varietyLine = labeled('variet(?:y|al|ies)|السلالة|سلالة');
  // Java may be a region. An unlabeled location/name must not become a variety.
  const varieties = varietyLine ? found(varietyLine, coffeeVarieties) : coffeeVarieties
    .filter(group => group[0] !== 'Java' && lines.some(line => group.some(alias => normalizeSearch(line) === normalizeSearch(alias))))
    .map(group => group[0]);
  const processes = found(processLine, coffeeProcesses);
  const roasts = found(roastLine, coffeeRoasts);
  const name = labeled('coffee|name|اسم البن|الاسم') || lines.slice(0, 6).find(l => l.length >= 4 && l.length <= 100
    && !/[:：]|^\d|roast|notes|process|origin|weight|تحميص|إيحاءات|المعالجة/iu.test(l)
    && !coffeeOrigins.some(g => g.some(t => normalizeSearch(l) === normalizeSearch(t)))) || '';
  return { name: name.slice(0, 160), origin: origins.length === 1 ? origins[0] : '', variety: varieties.join(', '),
    process: processes.length === 1 ? processes[0] : processLine.slice(0, 160), roast: roasts.length === 1 ? roasts[0] : '', notes: notes.slice(0, 1000) };
}
export function coffeeLabelCandidates(text: string, coffees: CoffeeItem[]): CoffeeItem[] {
  return coffees.filter(c => [c.name, c.localeContent?.en?.name, c.localeContent?.ar?.name].some(name => {
    if (!name || name.length < 8 || normalizeSearch(name).split(' ').length < 2) return false;
    return contains(text, name);
  })).slice(0, 3);
}
export function hasCoffeeLabelFacts(label: CoffeeLabel): boolean {
  return Boolean(label.origin.trim() || label.variety.trim() || label.notes.trim());
}
