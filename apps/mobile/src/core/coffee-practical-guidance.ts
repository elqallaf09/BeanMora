import { normalizeSearch } from './deepSearch';
import { hasEquipmentIntent, hasRecipeIntent, isCoffeeRecommendationRequest, isEquipmentShoppingRequest } from './coffee-assistant';

/** Select a reviewed lesson by intent. The answer itself remains editable content. */
export function practicalCoffeeLesson(question: string, method: string | null, previousTopic?: string): string | null {
  const q = normalizeSearch(question);
  if (hasRecipeIntent(q) || isCoffeeRecommendationRequest(q) || isEquipmentShoppingRequest(q)
    || /ابحث|قارن|رشح|اقترح|ميزاني|دولار|دينار|ريال|\b(?:find|compare|recommend|budget|price)\b|(?:ابي|اريد|افضل|احسن).*(?:مكين|ماكين|طاحون|مطحن)/.test(q)) return null;
  const how = /شلون|كيف|طريقه|خطوات|\bhow\b|step by step/.test(q);
  const use = /استخدم|استعمل|اشغل|تشغيل|\b(?:use|operate)\b/.test(q);
  const make = /اسوي|احضر|تحضير|نسوي|اعمل|\b(?:make|prepare|brew)\b/.test(q);
  const marzocco = /لامار?زوكو|لامرزوكو|لا\s+مارزوكو|\bla\s*marzocco\b/.test(q);
  if (how && use && marzocco) return 'lamarzocco-first-use';
  if (how && use && hasEquipmentIntent(q)) return 'equipment-use-help';
  if (method === 'espresso') {
    const doseOrGrind = /(?:كم|جم|شكثر|شنو).*?(?:جرام|غرام|جرعه|بن)|(?:شنو|شو|كم|درجه|اضبط).*?(?:طحن|طحنه)|\b(?:how much|how many|what dose|grind setting|grind size)\b/.test(q);
    if (doseOrGrind) return 'espresso-dose-grind';
    if (how && make) return 'espresso-start';
  }
  // Continue to the first-shot guide after a model answer instead of asking
  // for the same model again. Do not invent model-specific control settings.
  if (previousTopic === 'lamarzocco-first-use' && /^(?:عندي\s+|my\s+)?(?:linea\s+)?(?:mini|micra|gs3|لينيا\s+ميني|لينيا\s+ميكرا|ميني|ميكرا)[؟?.!\s]*$/.test(q)) return 'espresso-start';
  return null;
}
