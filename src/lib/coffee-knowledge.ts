import { isCoffeeRecommendationRequest } from './coffee-assistant';
import { normalizeSearch } from "./search/deepSearch";
import { COFFEE_CURRICULUM, type CoffeeCourseGroup, type CoffeeLesson } from './coffee-curriculum';
/** Reviewed bilingual education. Product settings always remain with their source. */
const basics = [
  {
    id: "storage",
    keywords:
      /تخزين|اخزن|خزن|احفظ|حفظ البن|فريزر|تجميد|ثلاجه|stor(?:e|age|ing)|freez|refrigerat/,
    ar: "احفظ البن في وعاء محكم بعيد عن الضوء والحرارة والرطوبة، واطحن حاجتك قبل التحضير. اشترِ كمية تناسب استهلاكك. للتخزين الطويل، استخدم عبوات صغيرة محكمة في الفريزر وخذ حاجتك دون تكرار إخراج الكمية كلها وإرجاعها؛ الرطوبة والروائح تؤثر في البن.",
    en: "Keep beans airtight, away from light, heat and moisture. Grind what you need before brewing and buy an amount suited to your use. For longer storage, freeze in small airtight portions; take what you need without repeatedly moving the whole supply in and out. Moisture and odors affect coffee.",
    title: "NCA — Coffee storage",
    url: "https://www.aboutcoffee.org/beans/storage-and-shelf-life/",
    suggestions: ["شنو الفرق بين المعالجات؟", "ليش نسوي بلوم؟"],
    suggestionsEn: [
      "What is the difference between processes?",
      "Why bloom coffee?",
    ],
  },
  {
    id: "water",
    keywords: /ماء|ماي|المويه|مياه|water|alkalinity|hardness|\btds\b/,
    ar: "نوع الماء يغيّر طعم القهوة. العسر يقيس معادن مثل الكالسيوم والمغنيسيوم، والقلوية تخفف الإحساس بالحموضة؛ زيادتها قد تجعل الكوب مسطحًا. رقم TDS وحده لا يبين توازن هذه المعادن. قارن مصدرَي ماء مع تثبيت البن والوصفة. للإسبريسو، اتبع حدود الماء التي يحددها صانع الماكينة لتجنب الترسبات.",
    en: "Water changes coffee flavor. Hardness reflects minerals such as calcium and magnesium; alkalinity buffers acidity, and too much can flatten the cup. TDS alone does not show the mineral balance. Compare two water sources while keeping coffee and recipe fixed. For espresso, follow your machine manufacturer’s water limits to manage scale.",
    title: "Barista Hustle — Water hardness",
    url: "https://www.baristahustle.com/water-hardness/",
    suggestions: ["قهوتي V60 حامضة", "شلون أخزن البن؟"],
    suggestionsEn: ["My V60 tastes sour", "How should I store beans?"],
  },
  {
    id: "processing",
    keywords:
      /معالج|مغسول|مجفف|عسلي|washed|natural process|honey process|processing|between processes/,
    ar: "المغسولة: تزال القشرة واللب والطبقة اللزجة قبل تجفيف البذور. المجففة: تجف الحبة داخل كرزة القهوة كاملة. العسلية: تزال القشرة وتبقى كمية من الطبقة اللزجة أثناء التجفيف؛ الاسم لا يعني إضافة عسل. المعالجة تؤثر في الطعم مع الصنف والمنشأ والتحميص والتحضير، لذلك لا تحدد وصفة واحدة لكل معالجة.",
    en: "Washed processing removes the fruit and mucilage before drying the seeds. Natural processing dries the whole cherry. Honey processing removes the skin and keeps some mucilage during drying; its name does not mean honey is added. Processing affects taste alongside variety, origin, roasting and brewing, so one recipe cannot fit every coffee with the same process.",
    title: "NCA — Coffee processes",
    url: "https://www.aboutcoffee.org/beans/processes/",
    suggestions: ["ليش نسوي بلوم؟", "شلون أخزن البن؟"],
    suggestionsEn: ["Why bloom coffee?", "How should I store beans?"],
  },
  {
    id: "bloom",
    keywords: /بلوم|تفتح|bloom|pre.?wet/,
    ar: "البلوم هو ترطيب البن بقليل من ماء التحضير قبل بقية الصبات. يساعد على وصول الماء لكل البن وخروج غازات التحميص، لذلك قد ينتفخ البن الطازج أكثر. حافظ على ترطيب متجانس وطريقة تحريك ثابتة. كمية الماء والانتظار تتبع الوصفة؛ كبر البلوم وحده لا يقيس جودة البن.",
    en: "Blooming wets the grounds with a small part of the brew water before the remaining pours. It helps wet the bed evenly and releases roasting gas, so fresh coffee can expand more. Keep wetting and agitation consistent. Follow the recipe for water amount and waiting time; bloom size alone does not measure coffee quality.",
    title: "Barista Hustle — Blooming",
    url: "https://www.baristahustle.com/lesson/p-1-05-blooming/",
    suggestions: ["احسب 18 غرام بنسبة 1:16", "قهوتي V60 حامضة"],
    suggestionsEn: ["Calculate 18 g at 1:16", "My V60 tastes sour"],
  },
  {
    id: "rest",
    keywords:
      /راحه.*حمص|راحه.*بن|ارتاح|بعد التحميص|بعد الحم|degass|rest.*(?:coffee|roast)|fresh.*roast/,
    ar: "بعد التحميص يخرج الغاز تدريجيًا، ومدة الراحة تختلف حسب البن ودرجة التحميص. اتبع توصية محمصتك وسجّل تغير الطعم مع الأيام. لا كابرا توصي لبنها براحة عشرة أيام على الأقل وقد يناسب بعض بنها الكثيف وقت أطول؛ هذا يخص تحميصها وليس قاعدة لكل المحامص.",
    en: "Roasting gas leaves the beans gradually, and resting time varies with the coffee and roast. Follow your roaster’s guidance and track taste over time. La Cabra recommends at least ten days for its own coffee and sometimes longer for dense coffees; that is its roast guidance, not a rule for every roaster.",
    title: "La Cabra — Resting coffee",
    url: "https://us.lacabra.com/pages/resting-coffee",
    suggestions: ["شلون أخزن البن؟", "ليش نسوي بلوم؟"],
    suggestionsEn: ["How should I store beans?", "Why bloom coffee?"],
  },
  {
    id: "roast",
    keywords:
      /حمصه.*فاتح|حمصه.*غامق|تحميص.*فاتح|تحميص.*غامق|درجات التحميص|light roast|dark roast|roast level/,
    ar: "التحميص الفاتح غالبًا يبرز شخصية البن، والغامق يبرز نكهات التحميص أكثر. لون البن وأسماء درجات التحميص تختلف بين المحامص ولا تعني وحدها الجودة أو كمية الكافيين. ابدأ بوصفة المحمصة ثم عدّل عاملًا واحدًا بحسب الطعم.",
    en: "Lighter roasts tend to emphasize the coffee’s character; darker roasts bring more roast flavors. Colors and roast names vary between roasters and alone do not establish quality or caffeine content. Start with the roaster’s recipe, then change one variable at a time based on taste.",
    title: "NCA — Coffee roasts",
    url: "https://www.aboutcoffee.org/beans/roasts/",
    suggestions: ["قهوتي V60 حامضة", "شنو الفرق بين المعالجات؟"],
    suggestionsEn: [
      "My V60 tastes sour",
      "What is the difference between processes?",
    ],
  },
];
const basicLabels: Record<string, { group: CoffeeCourseGroup; titles: [string, string]; more: [string, string] }> = {
  storage: { group: 'beans', titles: ['تخزين البن', 'Storing coffee'], more: ['قسّم الكمية الكبيرة إلى عبوات صغيرة. اترك العبوة المجمدة مغلقة حتى تصل إلى حرارة الغرفة قبل فتحها لتقليل التكاثف.', 'Divide a large supply into small airtight portions. Let a frozen package reach room temperature while sealed before opening to reduce condensation.'] },
  water: { group: 'water', titles: ['العسر والقلوية وTDS', 'Hardness, alkalinity and TDS'], more: ['العسر والقلوية قياسان مختلفان حتى لو كُتبا بوحدة ppm ككربونات الكالسيوم. جهاز TDS لا يفصل بينهما؛ تحتاج تحليلًا أو اختبارين مناسبين.', 'Hardness and alkalinity are separate measurements even when both are expressed in ppm as calcium carbonate. A TDS meter cannot separate them; use suitable tests or a water analysis.'] },
  processing: { group: 'beans', titles: ['معالجات البن', 'Coffee processing'], more: ['المعالجة اللاهوائية تصف بيئة تخمير محدودة الأكسجين، وقد تُدمج مع مغسول أو مجفف. اقرأ تفاصيل المنتج بدل افتراض أن الاسم يضمن نكهة ثابتة.', 'Anaerobic processing describes a low-oxygen fermentation environment and can accompany washed or natural processing. Read producer details rather than assuming the name guarantees one flavor.'] },
  bloom: { group: 'brewing', titles: ['البلوم وخروج الغاز', 'Blooming and gas release'], more: ['تأكد أن كل طبقة البن ابتلت؛ اسكب بهدوء وسجّل طريقة التحريك. إذا غيّرت مدة البلوم، ثبّت بقية الصبات حتى تكون المقارنة مفيدة.', 'Wet the whole bed gently and record agitation. When changing bloom duration, keep the other pours fixed for a useful comparison.'] },
  rest: { group: 'beans', titles: ['راحة البن بعد التحميص', 'Resting after roasting'], more: ['تذوق نفس البن في عدة أيام بنفس الوصفة وسجل التدفق والطعم. تاريخ التحميص وحده لا يحدد يوم الذروة لكل البن.', 'Taste the same coffee on several days with the same recipe, recording flow and taste. Roast date alone cannot predict a universal peak day.'] },
  roast: { group: 'roasting', titles: ['درجات التحميص', 'Roast levels'], more: ['الفاتح ليس مرادفًا لنقص التطوير، والغامق ليس مرادفًا للجودة المنخفضة. قارن لونًا وطعمًا مستهدفين، ولا تحكم من اسم الحمصة فقط.', 'Light does not mean underdeveloped, and dark does not automatically mean low quality. Compare intended color and flavor rather than judging roast names alone.'] },
};
type Article = Omit<CoffeeLesson, 'keywords'> & { keywords: { test(question: string): boolean }; suggestions: string[]; suggestionsEn: string[] };
const bundledArticles: Article[] = [
  ...basics.map(row => ({ ...row, ...basicLabels[row.id], priority: row.id === 'water' ? 5 : 55 })),
  ...COFFEE_CURRICULUM.map(row => ({ ...row, suggestions: [] as string[], suggestionsEn: [] as string[] })),
];
/** Bundled lessons plus any published database lessons applied at runtime. */
let articles: Article[] = bundledArticles;
const lessonSources = (row: Article) => [{ title: row.title, url: row.url }, ...(row.supportingSources ?? [])];
export const coffeeCourseGroups: Record<CoffeeCourseGroup, [string, string]> = {
  beans: ['البن والمعالجة', 'Beans and processing'], grinding: ['الطحن', 'Grinding'],
  water: ['الماء', 'Water'], equipment: ['المكاين والأدوات', 'Machines and tools'],
  brewing: ['التحضير', 'Brewing'], roasting: ['التحميص', 'Roasting'], sensory: ['التذوق والإيحاءات', 'Tasting and flavor'],
};
/** Columns the app reads from public.coffee_lessons. */
export const remoteCoffeeLessonColumns = 'id,course_group,title_ar,title_en,body_ar,body_en,more_ar,more_en,source_title,source_url,supporting_sources,keywords,priority';
const boundedText = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
const httpsUrl = (value: unknown) => {
  const url = boundedText(value, 9, 500);
  try { return url && new URL(url).protocol === 'https:' ? url : null; } catch { return null; }
};
/** Whole-word matcher for plain phrases; common Arabic prefixes (و، بـ، الـ…) may precede a phrase. */
function phraseMatcher(phrases: string[]) {
  const escaped = phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('(?:^|[^\\p{L}\\p{N}])(?:[وفبلك]?(?:ال|لل)?)?(?:' + escaped.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'u');
}
const plainPhrases = (values: unknown[], min: number, limit: number) => [...new Set(values
  .map(phrase => typeof phrase === 'string' ? normalizeSearch(phrase) : '')
  .filter(phrase => phrase.length >= min && phrase.length <= 60))].slice(0, limit);
/** Columns the app reads from public.coffee_lesson_phrases. */
export const remoteCoffeePhraseColumns = 'lesson_id,phrase';
/**
 * Applies published lessons from the database over the bundled copy. A row with
 * a bundled id replaces that lesson's text and keeps its reviewed routing; a new
 * id adds a lesson routed by its plain phrases. Rows are untrusted input: an
 * invalid row is skipped, phrases are escaped and never run as expressions.
 * `learned` holds rows of public.coffee_lesson_phrases: extra wordings (Kuwaiti,
 * Gulf, American, British…) that route a question to an existing lesson.
 * Returns the number of lesson rows applied; anything but an array restores the bundle.
 */
export function applyRemoteCoffeeLessons(rows: unknown, learned?: unknown): number {
  const byId = new Map<string, Article>();
  for (const value of Array.isArray(rows) ? rows.slice(0, 400) : []) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const id = typeof row.id === 'string' && /^[a-z0-9][a-z0-9-]{1,59}$/.test(row.id) ? row.id : null;
    const group = typeof row.course_group === 'string' && Object.hasOwn(coffeeCourseGroups, row.course_group) ? row.course_group as CoffeeCourseGroup : null;
    const titleAr = boundedText(row.title_ar, 2, 120), titleEn = boundedText(row.title_en, 2, 120);
    const ar = boundedText(row.body_ar, 100, 2400), en = boundedText(row.body_en, 100, 2400);
    const moreAr = boundedText(row.more_ar, 20, 1200), moreEn = boundedText(row.more_en, 20, 1200);
    const title = boundedText(row.source_title, 2, 160), url = httpsUrl(row.source_url);
    if (!id || !group || !titleAr || !titleEn || !ar || !en || !moreAr || !moreEn || !title || !url) continue;
    const phrases = plainPhrases(Array.isArray(row.keywords) ? row.keywords : [], 3, 24);
    const supportingSources = (Array.isArray(row.supporting_sources) ? row.supporting_sources : []).flatMap(source => {
      const item = source && typeof source === 'object' ? source as Record<string, unknown> : {};
      const sourceTitle = boundedText(item.title, 2, 160), sourceUrl = httpsUrl(item.url);
      return sourceTitle && sourceUrl ? [{ title: sourceTitle, url: sourceUrl }] : [];
    }).slice(0, 4);
    const bundled = bundledArticles.find(article => article.id === id);
    const priority = typeof row.priority === 'number' && Number.isFinite(row.priority) ? Math.min(200, Math.max(1, Math.round(row.priority))) : bundled?.priority ?? 60;
    const own = phrases.length ? phraseMatcher(phrases) : null;
    const keywords = bundled && own ? { test: (question: string) => bundled.keywords.test(question) || own.test(question) } : bundled?.keywords ?? own ?? /(?!)/;
    byId.set(id, {
      id, group, titles: [titleAr, titleEn], keywords, priority, ar, en, more: [moreAr, moreEn], title, url,
      ...(supportingSources.length ? { supportingSources } : {}),
      suggestions: bundled?.suggestions ?? [], suggestionsEn: bundled?.suggestionsEn ?? [],
    });
  }
  const learnedByLesson = new Map<string, unknown[]>();
  for (const value of Array.isArray(learned) ? learned.slice(0, 20000) : []) {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    if (typeof item.lesson_id !== 'string') continue;
    learnedByLesson.set(item.lesson_id, [...(learnedByLesson.get(item.lesson_id) ?? []), item.phrase]);
  }
  articles = [
    ...bundledArticles.map(article => byId.get(article.id) ?? article),
    ...[...byId.values()].filter(article => !bundledArticles.some(bundled => bundled.id === article.id)),
  ].map(article => {
    // Learned wordings need at least four characters so a short generic word cannot capture questions.
    const phrases = plainPhrases(learnedByLesson.get(article.id) ?? [], 4, 400);
    if (!phrases.length) return article;
    const extra = phraseMatcher(phrases), base = article.keywords;
    return { ...article, keywords: { test: (question: string) => base.test(question) || extra.test(question) } };
  });
  return byId.size;
}
export function coffeeLearningTopics(locale: 'ar' | 'en') {
  return articles.map(row => ({ id: row.id, group: row.group, title: row.titles[locale === 'ar' ? 0 : 1], priority: row.priority }));
}
export function coffeeLessonById(id: string, locale: 'ar' | 'en') {
  const row = articles.find(row => row.id === id);
  return row ? { title: row.titles[locale === 'ar' ? 0 : 1], answer: locale === 'ar' ? row.ar : row.en, more: row.more[locale === 'ar' ? 0 : 1], source: { title: row.title, url: row.url }, sources: lessonSources(row) } : null;
}
export function coffeeKnowledgeAnswer(
  question: string,
  locale: "ar" | "en",
  previousTopic?: string,
  translate?: (arabic: string, english: string) => string,
) {
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
  const ranked = articles.map(row => ({ row, score: row.titles.some(title => normalizeSearch(title) === clean) ? 1000 : row.keywords.test(q) ? row.priority : 0 })).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score);
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
