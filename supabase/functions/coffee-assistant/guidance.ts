import { COFFEE_CURRICULUM, type CoffeeLesson } from '../_shared/coffee-curriculum.ts';
import { COFFEE_KNOWLEDGE_BASICS } from '../_shared/coffee-knowledge-basics.ts';
import { normalizeSearch } from '../_shared/search/deepSearch.ts';

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

// Only familiar, explicit coffee concepts are handled here. Product searches,
// new subjects and ambiguous statements still belong to the planner. The IDs
// are repository-owned; dialogue can never supply a new source or lesson ID.
const clarificationTopics: { pattern: RegExp; ids: string[] }[] = [
  { pattern: /(?:طريقه|طرق|اسلوب) (?:ال)?(?:تحضير|تخمير)|\b(?:brewing?|preparation) methods?\b/, ids: ['immersion-percolation', 'grind-size'] },
  { pattern: /(?:موديل|اسم(?: شركه)?|نوع|ماركه|شركه) (?:ال)?(?:طاحون(?:ه|تي|تك)|مطحن(?:ه|تي|تك)|طحنه)|(?:ال)?(?:طاحونه|مطحنه|طحنه) (?:الموديل|الاسم|النوع|الماركه|الشركه)|\bgrinder(?:'s)? (?:model|name|brand|type)\b|\b(?:model|name|brand|type) (?:of (?:the |my )?)?grinder\b/, ids: ['equipment-use-help', 'grind-size'] },
  { pattern: /(?:درجه|نعومه|حجم) (?:ال)?طحن|\bgrind (?:size|setting|adjustment)\b|\bcoffee grind(?:er|ing)\b/, ids: ['grind-size', 'equipment-use-help'] },
  { pattern: /(?:ضغط|بار) (?:(?:استخلاص|تحضير|ماكينه|مكينه) )?(?:ال)?(?:اسبريسو|اسبرسو)(?: بالبار)?|(?:ال)?(?:اسبريسو|اسبرسو) (?:بال)?(?:ضغط|بار)|\bespresso pressure\b|\bpressure (?:unit|in bar)\b/, ids: ['espresso-pressure-bar'] },
  { pattern: /(?:جرعه|ناتج|وزن) (?:ال)?(?:بن|قهوه|اسبريسو|اسبرسو)|\b(?:coffee|espresso) (?:dose|yield)\b/, ids: ['scales', 'espresso-dial-in'] },
  { pattern: /(?:معني|شنو|ما هو|ماهو) (?:ال)?استخلاص|\b(?:coffee )?extraction\b/, ids: ['extraction'] },
  { pattern: /(?:عسر|قلويه) (?:ال)?(?:ماء|ماي)|\bwater (?:hardness|alkalinity)\b/, ids: ['water'] },
  { pattern: /بلوم|\b(?:coffee )?bloom(?:ing)?\b/, ids: ['bloom'] },
  { pattern: /(?:معالجه|معالجات) (?:ال)?(?:بن|قهوه)|\bcoffee processing\b/, ids: ['processing'] },
];
const explanationRequest = /شنو يعني|وش يعني|ايش يعني|ما معني|معني|المقصود|تقصد|قصدك|وضح|اشرح|فسر|ما فهمت|مو فاهم|لم افهم|\b(?:explain|clarify|meaning|means?|what is|what are|don'?t understand|do not understand)\b/;
const shoppingRequest = /\b(?:buy|find|recommend|budget|price|cost|compare|usd|kwd|sar)\b|اشتري|شراء|رشح|ميزانيه|سعر|بكم|قارن|دولار|دينار|ريال|[$€£¥]/;
function topicIds(text: string): string[] {
  return [...new Set(clarificationTopics.filter(topic => topic.pattern.test(normalizeSearch(text))).flatMap(topic => topic.ids))].slice(0, 4);
}
function onlyConceptTerms(text: string): boolean {
  let remainder = text;
  for (const topic of clarificationTopics) remainder = remainder.replace(new RegExp(topic.pattern.source, 'gu'), ' ');
  // A whole short concept question may omit "coffee" in this coffee expert.
  // Any other subject (teeth, flowers, rice, a named product...) stays with the
  // planner, even when it shares a word such as extraction or preparation.
  const connectors = new Set('what do does did you your mean means by meaning of the a an and or is are can could please explain clarify that this more question asked for again which use using in coffee شنو وش ايش يعني تقصد قصدك المعني معني المقصود ما ماذا هو هي ممكن توضح وضح تشرح اشرح فسر لي ب و او عن في من هذا هذي ذلك سؤالك كلامك اكثر مره ثانيه القهوه قهوه البن بن'.split(' '));
  return remainder.split(/[\s\p{P}\p{S}]+/u).filter(Boolean).every(word => connectors.has(word));
}

/** Recover a misunderstood explanation request without treating every new
 * question as a continuation. Questions-only clients remain supported. */
export function clarificationGuidanceIds(question: string, history: { question: string; answer?: string; followUp?: string }[]): string[] {
  const current = normalizeSearch(question);
  if (!explanationRequest.test(current) || shoppingRequest.test(current)) return [];
  const explicit = topicIds(current);
  if (explicit.length) return onlyConceptTerms(current) ? explicit : [];
  // Inherit a topic only for a whole, subject-free clarification. A question
  // such as "What does quantum mean?" must not inherit the previous grinder.
  const plain = current.replace(/[؟?!.,،;:…]/g, '').trim();
  if (!/^(?:(?:شنو|وش|ايش) (?:يعني|تقصد)|(?:ما|مو|لم) (?:فهمت|فاهم|افهم)(?: (?:سؤالك|قصدك|كلامك))?|(?:وضح|اشرح)(?: ?لي)?(?: (?:اكثر|سؤالك|قصدك|كلامك))?|(?:what do you mean|what does that mean|(?:can you |could you )?(?:explain|clarify)(?: that| your question)?|i (?:don'?t|do not) understand(?: your question)?))(?: please)?$/.test(plain)) return [];
  const previous = history.at(-1);
  if (!previous) return [];
  // Prefer the actual last follow-up when present, then the user's previous
  // topic for old clients. Generated text is topic context only, not evidence.
  for (const text of [previous.followUp, previous.question, previous.answer]) {
    if (!text) continue;
    const normalized = normalizeSearch(text);
    if (!/قهوه|(?:^|\s)(?:ال)?بن(?:\s|$)|اسبريسو|اسبرسو|\b(?:coffee|espresso)\b/.test(normalized) && !onlyConceptTerms(normalized)) continue;
    const ids = topicIds(normalized);
    if (ids.length) return ids;
  }
  return [];
}

export function selectGuidance(ids: string[]): Guidance[] {
  if (ids.length > 4 || ids.some(id => !guidance.some(row => row.id === id))) throw new Error('MODEL_UNKNOWN_REFERENCE');
  return [...new Set(ids)].map(id => guidance.find(row => row.id === id)!);
}

export function guidanceSources(ids: string[], available: Guidance[]) {
  if (ids.length > 4 || ids.some(id => !available.some(row => row.id === id))) throw new Error('MODEL_UNKNOWN_REFERENCE');
  return [...new Map(available.filter(row => ids.includes(row.id)).flatMap(row => row.sources).map(source => [source.url, source])).values()].slice(0, 8);
}

/** Only explicit figures in the selected evidence or the user's own messages
 * may appear in a generated answer. Ratios/yields stay on the deterministic path. */
export function hasUnsupportedNumbers(text: string, evidence: string): boolean {
  const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/٫/g, '.');
  const numbers = (value: string) => normalizeDigits(value).match(/\d+(?:[.,]\d+)*/g) ?? [];
  const allowed = new Set(numbers(evidence));
  return numbers(text).some(number => !allowed.has(number));
}
