import { isCoffeeRecommendationRequest } from './coffee-assistant';
import { normalizeSearch } from "./deepSearch";
import { COFFEE_CURRICULUM, type CoffeeCourseGroup, type CoffeeLesson } from './coffee-curriculum';
import { coffeePhrasePattern, type CoffeeLessonContent } from './coffee-lesson-content';
import { COFFEE_KNOWLEDGE_BASICS as basics } from './coffee-knowledge-basics';
const basicLabels: Record<string, { group: CoffeeCourseGroup; titles: [string, string]; more: [string, string] }> = {
  storage: { group: 'beans', titles: ['تخزين البن', 'Storing coffee'], more: ['قسّم الكمية الكبيرة إلى عبوات صغيرة. اترك العبوة المجمدة مغلقة حتى تصل إلى حرارة الغرفة قبل فتحها لتقليل التكاثف.', 'Divide a large supply into small airtight portions. Let a frozen package reach room temperature while sealed before opening to reduce condensation.'] },
  water: { group: 'water', titles: ['العسر والقلوية وTDS', 'Hardness, alkalinity and TDS'], more: ['العسر والقلوية قياسان مختلفان حتى لو كُتبا بوحدة ppm ككربونات الكالسيوم. جهاز TDS لا يفصل بينهما؛ تحتاج تحليلًا أو اختبارين مناسبين.', 'Hardness and alkalinity are separate measurements even when both are expressed in ppm as calcium carbonate. A TDS meter cannot separate them; use suitable tests or a water analysis.'] },
  processing: { group: 'beans', titles: ['معالجات البن', 'Coffee processing'], more: ['المعالجة اللاهوائية تصف بيئة تخمير محدودة الأكسجين، وقد تُدمج مع مغسول أو مجفف. اقرأ تفاصيل المنتج بدل افتراض أن الاسم يضمن نكهة ثابتة.', 'Anaerobic processing describes a low-oxygen fermentation environment and can accompany washed or natural processing. Read producer details rather than assuming the name guarantees one flavor.'] },
  bloom: { group: 'brewing', titles: ['البلوم وخروج الغاز', 'Blooming and gas release'], more: ['تأكد أن كل طبقة البن ابتلت؛ اسكب بهدوء وسجّل طريقة التحريك. إذا غيّرت مدة البلوم، ثبّت بقية الصبات حتى تكون المقارنة مفيدة.', 'Wet the whole bed gently and record agitation. When changing bloom duration, keep the other pours fixed for a useful comparison.'] },
  rest: { group: 'beans', titles: ['راحة البن بعد التحميص', 'Resting after roasting'], more: ['تذوق نفس البن في عدة أيام بنفس الوصفة وسجل التدفق والطعم. تاريخ التحميص وحده لا يحدد يوم الذروة لكل البن.', 'Taste the same coffee on several days with the same recipe, recording flow and taste. Roast date alone cannot predict a universal peak day.'] },
  roast: { group: 'roasting', titles: ['درجات التحميص', 'Roast levels'], more: ['الفاتح ليس مرادفًا لنقص التطوير، والغامق ليس مرادفًا للجودة المنخفضة. قارن لونًا وطعمًا مستهدفين، ولا تحكم من اسم الحمصة فقط.', 'Light does not mean underdeveloped, and dark does not automatically mean low quality. Compare intended color and flavor rather than judging roast names alone.'] },
};
const bundledArticles: (CoffeeLesson & { suggestions: string[]; suggestionsEn: string[] })[] = [
  ...basics.map(row => ({ ...row, ...basicLabels[row.id], priority: row.id === 'water' ? 5 : 55 })),
  ...COFFEE_CURRICULUM.map(row => ({ ...row, suggestions: [] as string[], suggestionsEn: [] as string[] })),
];
function lessonArticles(content?: CoffeeLessonContent) {
  if (!content) return bundledArticles;
  const merged = new Map(bundledArticles.map(row => [row.id, row]));
  for (const row of content.lessons) {
    const bundled = merged.get(row.id);
    merged.set(row.id, { ...row, suggestions: [], suggestionsEn: [],
      keywords: bundled ? new RegExp('(?:' + bundled.keywords.source + ')|(?:' + row.keywords.source + ')', 'u') : row.keywords });
  }
  return [...merged.values()].map(row => {
    const aliases = content.phrases.filter(phrase => phrase.lessonId === row.id).map(phrase => phrase.phrase);
    return aliases.length ? { ...row, keywords: new RegExp('(?:' + row.keywords.source + ')|(?:' + coffeePhrasePattern(aliases).source + ')', 'u') } : row;
  });
}
const lessonSources = (row: CoffeeLesson) => [{ title: row.title, url: row.url }, ...(row.supportingSources ?? [])];
export const coffeeCourseGroups: Record<CoffeeCourseGroup, [string, string]> = {
  beans: ['البن والمعالجة', 'Beans and processing'], grinding: ['الطحن', 'Grinding'],
  water: ['الماء', 'Water'], equipment: ['المكاين والأدوات', 'Machines and tools'],
  brewing: ['التحضير', 'Brewing'], roasting: ['التحميص', 'Roasting'], sensory: ['التذوق والإيحاءات', 'Tasting and flavor'],
};
export function coffeeLearningTopics(locale: 'ar' | 'en', content?: CoffeeLessonContent) {
  return lessonArticles(content).map(row => ({ id: row.id, group: row.group, title: row.titles[locale === 'ar' ? 0 : 1] }));
}
export function coffeeLessonById(id: string, locale: 'ar' | 'en', content?: CoffeeLessonContent) {
  const row = lessonArticles(content).find(row => row.id === id);
  return row ? { title: row.titles[locale === 'ar' ? 0 : 1], answer: locale === 'ar' ? row.ar : row.en, more: row.more[locale === 'ar' ? 0 : 1], source: { title: row.title, url: row.url }, sources: lessonSources(row) } : null;
}
export function coffeeKnowledgeAnswer(
  question: string,
  locale: "ar" | "en",
  previousTopic?: string,
  translate?: (arabic: string, english: string) => string,
  content?: CoffeeLessonContent,
) {
  const articles = lessonArticles(content);
  const L = translate ?? ((arabic: string, english: string) => locale === 'ar' ? arabic : english);
  const q = normalizeSearch(question);
  // Shopping follow-ups must keep their catalog context instead of matching
  // educational words such as ميزان inside ميزانية.
  if (/ميزاني|دولار|دينار|ريال|budget|\b(?:usd|kwd|sar)\b|under \d/.test(q)) return null;
  // A request for a coffee recommendation is not a lesson about tasting notes.
  // Keep "best water for coffee" and "what do tasting notes mean?" educational.
  if (isCoffeeRecommendationRequest(question)) return null;
  if (
    /ابي (?:بن|ماكين|مكين|طاحون|مطحن|غلاي|معدات|وصف)|ابحث|محامص|recommend|find|recipe with|buy|under \d|(?:افضل|best).*(?:طاحون|ماكين|grinder|machine)/.test(
      q,
    )
  )
    return null;
  const clean = q.replace(/[؟?!.,،]/g, '').trim();
  const followUp = /^(?:اشرح اكثر|وضح اكثر|اكمل|كمل|tell me more|explain more|continue)$/.test(clean);
  const ranked = articles.map(row => ({ row, score: row.titles.some(title => normalizeSearch(title).replace(/[؟?!.,،]/g, '').trim() === clean) ? 1000 : row.keywords.test(q) ? row.priority : 0 })).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score);
  const article = followUp ? articles.find(row => row.id === previousTopic) : ranked[0]?.row;
  if (!article && /علمني.*قهوه|تعلم.*قهوه|من الالف|من ا.*ي|a to z|learn.*coffee|all about coffee/.test(q)) {
    return {
      topic: 'curriculum',
      answer: L('ابدأ بالبن والمعالجة، ثم الماء والطحن والتحضير، وبعدها المكاين والتحميص والتذوق. اكتب الموضوع الذي تريد تعلّمه؛ كل شرح معه مصدر وخطوة عملية. تقدر تسأل عن موديل معين للمواصفات أو تعطيني وصفة كوبك لضبطها.', 'Start with beans and processing, then water, grinding and brewing, followed by equipment, roasting and tasting. Ask about the topic you want to learn; each lesson includes a source and a practical next step. Ask about a model for specifications or provide your brew measurements for coaching.'),
      sources: [] as { title: string; url: string }[],
      suggestions: [L('من الشجرة إلى الكوب', 'From seed to cup'), L('درجة الطحن حسب التحضير', 'Grind size by method'), L('مراحل التحميص من الأخضر إلى البني', 'Roast stages: green to brown')],
    };
  }
  if (!article) return null;
  // Answer each explicitly separated question rather than dropping all but
  // the highest-priority keyword. Never turn one broad sentence into a dump.
  const clauses = q.split(/[؟?؛;\n+]+|\s+و(?=شنو|شلون|ليش|كيف|ما الفرق|اشرح)|\s+(?:and also|also)\s+/).filter(part => part.trim());
  const multiple = followUp ? [] : clauses.map(clause => articles
    .filter(row => row.keywords.test(clause))
    .sort((a, b) => b.priority - a.priority)[0]).filter((row): row is typeof article => !!row);
  const chosen = [...new Map(multiple.map(row => [row.id, row])).values()].slice(0, 3);
  if (chosen.length > 1) return {
    topic: chosen[0].id,
    answer: chosen.map(row => L(row.titles[0], row.titles[1]) + '\n' + L(row.ar, row.en)).join('\n\n'),
    sources: [...new Map(chosen.flatMap(lessonSources).map(source => [source.url, source])).values()],
    suggestions: chosen.slice(0, 2).map(row => L(row.titles[0], row.titles[1])),
  };
  const related = articles.filter(row => row.group === article.group && row.id !== article.id).slice(0, 2);
  return {
    topic: article.id,
    answer: followUp ? L(article.more[0], article.more[1]) : L(article.titles[0], article.titles[1]) + '\n\n' + L(article.ar, article.en) + '\n\n' + L('تطبيق عملي', 'Try this') + '\n' + L(article.more[0], article.more[1]),
    sources: lessonSources(article),
    suggestions: [L('اشرح أكثر', 'Tell me more'), ...related.map(row => L(row.titles[0], row.titles[1]))],
  };
}
