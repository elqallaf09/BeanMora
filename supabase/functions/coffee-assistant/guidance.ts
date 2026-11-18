import { COFFEE_CURRICULUM, type CoffeeLesson } from '../_shared/coffee-curriculum.ts';
import { COFFEE_KNOWLEDGE_BASICS } from '../_shared/coffee-knowledge-basics.ts';

export interface Guidance {
  id: string;
  title: string;
  body: string;
  sources: { title: string; url: string }[];
}

const basics = COFFEE_KNOWLEDGE_BASICS.map(row => ({
  id: row.id, title: row.title, body: row.en,
  sources: [{ title: row.title, url: row.url }],
}));
const fromLesson = (row: CoffeeLesson): Guidance => ({
  id: row.id, title: row.titles[1], body: row.en + '\n' + row.more[1],
  sources: [{ title: row.title, url: row.url }, ...(row.supportingSources ?? [])],
});
// Evidence is maintained in the repository, never accepted from the client.
const guidance = [...basics, ...COFFEE_CURRICULUM.map(fromLesson)];
export const guidanceIndex = guidance.map(({ id, title }) => ({ id, title }));

export function selectGuidance(ids: string[]): Guidance[] {
  if (ids.length > 4 || ids.some(id => !guidance.some(row => row.id === id))) throw new Error('MODEL_UNKNOWN_REFERENCE');
  return [...new Set(ids)].map(id => guidance.find(row => row.id === id)!);
}

export function guidanceSources(ids: string[], available: Guidance[]) {
  if (ids.length > 4 || ids.some(id => !available.some(row => row.id === id))) throw new Error('MODEL_UNKNOWN_REFERENCE');
  return [...new Map(available.filter(row => ids.includes(row.id)).flatMap(row => row.sources).map(source => [source.url, source])).values()].slice(0, 8);
}

/** Only explicit figures in the selected evidence or the user's own question
 * may appear in a generated answer. Ratios/yields stay on the deterministic path. */
export function hasUnsupportedNumbers(text: string, evidence: string): boolean {
  const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/٫/g, '.');
  const numbers = (value: string) => normalizeDigits(value).match(/\d+(?:[.,]\d+)*/g) ?? [];
  const allowed = new Set(numbers(evidence));
  return numbers(text).some(number => !allowed.has(number));
}
