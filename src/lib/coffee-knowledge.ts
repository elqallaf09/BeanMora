import { normalizeSearch } from "./search/deepSearch";
/** Reviewed bilingual education. Product settings always remain with their source. */
const articles = [
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
    url: "https://lacabra.com/pages/water",
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
export function coffeeKnowledgeAnswer(
  question: string,
  locale: "ar" | "en",
  previousTopic?: string,
) {
  const q = normalizeSearch(question);
  if (
    /ابي (?:بن|ماكين|وصف)|ابحث|محامص|recommend|find|recipe with|buy|under \d/.test(
      q,
    )
  )
    return null;
  const followUp = /^(?:اشرح اكثر|وضح اكثر|tell me more|explain more)$/.test(q);
  const article = followUp
    ? articles.find((row) => row.id === previousTopic)
    : (articles.find((row) => row.id !== "water" && row.keywords.test(q)) ??
      articles.find((row) => row.id === "water" && row.keywords.test(q)));
  if (!article) return null;
  return {
    topic: article.id,
    answer: locale === "ar" ? article.ar : article.en,
    sources: [{ title: article.title, url: article.url }],
    suggestions: locale === "ar" ? article.suggestions : article.suggestionsEn,
  };
}
