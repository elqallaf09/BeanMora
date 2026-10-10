import { assistantReply, assistantSafeUrl, assistantSearchTerms, parseAssistantQuery, rankAssistantDocuments, type AssistantDocument, type AssistantMatch, type AssistantQuery, type CatalogRate } from './coffee-assistant';
import { factLabels } from './equipment-facts';
import { normalizeSearch } from './search/deepSearch';
import { coffeeKnowledgeAnswer } from './coffee-knowledge';

/** A bounded coffee expert system, not a generative model. No provider, keys or training uploads. */
export interface LocalAssistantTurn {
  question: string; answer: string; query: AssistantQuery; matches: AssistantMatch[];
  mode: 'local'; intent: 'search' | 'compare' | 'explain' | 'calculate' | 'coach' | 'guide' | 'knowledge' | 'help';
  knowledgeTopic?: string;
  followUp?: string; suggestions?: string[]; sources?: { title: string; url: string }[];
  calculation?: { dose: number | null; ratio: number | null; method: string | null };
  coach?: { signal: string; method: string | null; dose?: number; output?: number; seconds?: number };
}
export interface LocalGuide { title_ar: string; title: string; intro_ar: string; intro: string; tips_ar: string[]; tips: string[]; source: string; source_name: string }
export interface LocalAssistantDependencies {
  search: (query: AssistantQuery) => Promise<{ documents: AssistantDocument[]; rates: CatalogRate[] }>;
  guides?: Record<string, LocalGuide>; now?: number;
}
const methodAliases: [string, string[]][] = [
  ['espresso', ['espresso', 'اسبرسو', 'اسبريسو', 'اسبر يسو']],
  ['v60', ['v60', 'v 60', 'في 60', 'في60']], ['xbloom', ['xbloom', 'x bloom', 'اكسبلوم', 'اكس بلوم']],
  ['aeropress', ['aeropress', 'ايروبريس', 'ايروبرس']], ['chemex', ['chemex', 'كيمكس']],
  ['french_press', ['french press', 'فرنش برس']], ['moka_pot', ['moka pot', 'moka', 'موكا بوت']],
  ['cold_brew', ['cold brew', 'كولد برو']], ['origami', ['origami', 'اوريغامي']],
  ['kalita_wave', ['kalita', 'كاليتا']], ['april', ['april', 'ابريل']], ['orea', ['orea', 'اوريا', 'اوريه']],
  ['switch', ['hario switch', 'سويتش']],
  ['pour_over', ['pour over', 'ترشيح يدوي']], ['auto_drip', ['automatic drip', 'auto drip', 'تقطير الي']],
];
const gearAliases = [['manual', 'يدوي', 'يدويه'], ['electric', 'كهربائي', 'كهربائيه'], ['automatic', 'اوتوماتيك', 'اوتوماتيكيه', 'اتوماتيك'], ['meraki', 'ميراكي', 'ميراكى', 'مراكي'], ['flair', 'فلير', 'فلاير'], ['profitec', 'بروفيتك', 'بروفيتيك']];
const filler = new Set(normalizeSearch('بدون دون خل خلي خلها خله زيد زيدها غير غيرها غيره بس فقط لا ابيها ابيه ابيهم ابيك ابيلى دور دورلي ورني وورني عطنى عطني يطلعلي تطلعلي بغيت بغيته احتاج ابي نبي شنو شلون شرايك رايك اشرح اشرحلي قارن قارنهم بينهم ليش لي تقدر حق نفس هذي هذيل هذه هذول بعد زين زينه ممتاز طيب اوكي تمام لو اذا يكون تكون ابحثلي بحدود اقصى حد متوفره موجود موجوده بروحها ابيله ابيها تكفي تكفيني ارخص اسعار سعرها سعره ميزانيتي الميزانيه دولار امريكي موجوده please could would can you get show tell explain change make that those these them only cheaper cheapest just now instead whats what which your for want with without budget to the it one me is how much look looking some at').split(' '));
for (const word of ['دولار', 'budget', 'ميزانيتي', 'الميزانيه']) filler.delete(word);
const digits = (s: string) => s.replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٫/g, '.').replace(/٬/g, ',');
const norm = (s: string) => normalizeSearch(digits(s).slice(0, 1000));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, phrase: string) => new RegExp('(?:^|[^\\p{L}\\p{N}])(?:و|ب|ال)?' + escape(norm(phrase)) + '(?=$|[^\\p{L}\\p{N}])', 'u').test(s);
const methodOf = (s: string) => methodAliases.filter(([, aliases]) => aliases.some(alias => has(s, alias))).map(([id]) => id);
const textValue = (v: unknown, ar: boolean): string => Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'string') ? String(v[ar ? 0 : 1]).slice(0, 320) : typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 320) : '';
const title = (d: AssistantDocument, ar: boolean) => ar ? d.title_ar || d.title_en : d.title_en || d.title_ar;
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const number = (v: number) => String(Math.round(v * 100) / 100);

export function localAssistantSearchTerms(query: AssistantQuery) {
  return [...new Set(assistantSearchTerms(query).flatMap(term => gearAliases.find(group => group[0] === term) ?? [term]))].slice(0, 32);
}

export function parseLocalAssistantQuery(message: string, previous?: AssistantQuery): AssistantQuery {
  let q = norm(message);
  q = q.replace(/بالكويت/g, 'في الكويت').replace(/بالسعوديه/g, 'في السعوديه')
    .replace(/\b(?:us )?dollars?\b/g, 'usd').replace(/\b(?:kuwaiti )?dinars?\b/g, 'kwd').replace(/\b(?:saudi )?riyals?\b/g, 'sar')
    .replace(/(?:^|\s)ب(?=\d)/g, ' ').replace(/(\d)(?=دولار|دينار|ريال)/g, '$1 ');
  for (const group of gearAliases) for (const alias of group.slice(1)) q = q.replace(new RegExp('(?:^|\\s)(?:و|ب|ال)?' + escape(norm(alias)) + '(?=$|\\s|[،,.?؟])', 'gu'), ' ' + group[0]);
  const foundMethods = methodOf(q);
  const recipe = /وصف|تحضير|recipe|brew/.test(q);
  const gear = /ماكين|مكين|ممكين|معدات|طاحون|مطحن|machine|grinder|equipment|غلاي|kettle|\bscale\b/.test(q) || has(q, 'ميزان');
  const roaster = /محامص|محمص|roaster/.test(q);
  const beans = /حبوب|\bbeans?\b/.test(q) || ((has(q, 'بن') || has(q, 'قهوه') || has(q, 'coffee')) && !recipe && !gear && !roaster && !/عندي|have/.test(q));
  const budgetFollowUp = /ميزاني|سعر|حدود|تحت|ارخص|budget|under|cheaper|price/.test(q) || /^(?:\d+[,.\d]*\s*)?(?:usd|kwd|sar|دولار|دينار|ريال)/.test(q);
  const clean = q.split(/\s+/).filter(word => !filler.has(word.replace(/[،,.?؟]/g, ''))).join(' ');
  const explicitKind = gear ? 'equipment' : recipe ? 'recipe' : roaster ? 'roaster' : beans ? 'coffee' : null;
  const newTopic = !!explicitKind && explicitKind !== previous?.kind;
  const query = parseAssistantQuery(clean, newTopic ? undefined : previous);
  if (previous?.kind === 'equipment' && /^\d+(?:[.,]\d+)?$/.test(q)) query.amount = Number(q.replace(',', '.'));
  if (previous?.clarification === 'budget' && /^\d+(?:[.,]\d+)?$/.test(q)) query.amount = Number(q.replace(',', '.'));
  if (explicitKind) query.kind = explicitKind;
  if (foundMethods.length) query.methods = foundMethods;
  if (!query.kind && foundMethods.length) query.kind = 'recipe';
  if (query.kind === 'equipment' && budgetFollowUp && previous?.kind === 'equipment' && !gear) query.category = previous.category;
  if (gear && /غلاي|kettle/.test(q)) query.category = 'kettle';
  if (query.kind === 'equipment' && /espresso|اسبرسو|اسبريسو/.test(q) && query.category !== 'grinder') query.category = 'espresso_machine';
  const featureTerms = gearAliases.filter(group => has(q, group[0])).map(group => group[0]);
  query.terms = query.terms.filter(term => !/ميزاني|^budget$|^خيار$|^options?$/.test(term) && !filler.has(term) && !methodAliases.some(([, aliases]) => aliases.some(alias => norm(alias).split(' ').includes(term))));
  if (featureTerms.length) query.terms = [...new Set([...query.terms, ...featureTerms])].slice(0, 8);
  if (previous && !newTopic && !query.terms.length && !explicitKind) query.terms = previous.terms;
  if (/بدون (?:سعر|ميزانيه)|دون (?:سعر|ميزانيه)|(?:no|without|remove) (?:price|budget)/.test(q)) { query.amount = null; query.currency = null; }
  if (/كل الدول|اي دوله|any country|all countries/.test(q)) query.region = null;
  // Monetary follow-ups keep the amount even when the currency is not supported.
  const unsupportedCurrency = /يورو|درهم|جنيه|\beur\b|\baed\b|\bgbp\b|\begp\b|€|£/.test(q);
  if (unsupportedCurrency) {
    const amount = q.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:eur|aed|gbp|egp|يورو|درهم|جنيه|€|£)/)?.[1];
    if (amount) query.amount = Number(amount);
    query.currency = null; query.clarification = 'currency'; return query;
  }
  if (query.kind !== 'equipment') { query.amount = null; query.currency = null; query.category = null; query.region = null; query.availableOnly = false; }
  query.clarification = query.amount !== null && (!Number.isFinite(query.amount) || query.amount <= 0) ? 'budget' : query.amount !== null && !query.currency ? 'currency' : !query.kind ? 'intent' : null;
  return query;
}

function selectedResults(q: string, matches: AssistantMatch[]) {
  const ordinals = [['الاول', 'اول', 'first'], ['الثاني', 'ثاني', 'second'], ['الثالث', 'ثالث', 'third'], ['الرابع', 'fourth'], ['الخامس', 'fifth'], ['السادس', 'sixth']];
  const indexes = ordinals.flatMap((words, i) => words.some(word => has(q, word)) ? [i] : []);
  for (const m of q.matchAll(/(?:رقم|number|option|#)\s*(\d+)/g)) indexes.push(Number(m[1]) - 1);
  const named = matches.filter(m => [m.document.title_ar, m.document.title_en].some(name => name && q.includes(norm(name))));
  if (indexes.length) return { explicit: true, matches: [...new Set(indexes)].flatMap(i => matches[i] ? [matches[i]] : []), invalid: indexes.some(i => !matches[i]) };
  return { explicit: named.length > 0, matches: named, invalid: false };
}
function referenceText(matches: AssistantMatch[], ar: boolean, compare: boolean) {
  const missing = ar ? 'غير مذكور في المصدر' : 'Not reported by the source';
  const keys = [...new Set(matches.flatMap(m => Object.keys(m.document.facts ?? {}).filter(k => k in factLabels)))].slice(0, 8);
  return matches.map((m, i) => {
    const d = m.document, f = d.facts ?? {};
    const lines = [`${i + 1}. ${title(d, ar)}`];
    if (d.kind === 'recipe') {
      for (const [key, label, unit] of [['dose', ar ? 'البن' : 'Coffee', 'g'], ['water', ar ? 'ماء التحضير' : 'Brew water', 'g'], ['temperature', ar ? 'الحرارة' : 'Temperature', '°C']] as const) {
        // The catalog water field is not espresso beverage yield.
        if (key === 'water' && d.methods.includes('espresso')) continue;
        lines.push(`${label}: ${positive(f[key]) ? number(f[key] as number) + ' ' + unit : missing}`);
      }
      const steps = Array.isArray(f.steps) ? f.steps : [];
      if (!compare) for (const step of steps.slice(0, 12)) {
        if (!step || typeof step !== 'object') continue;
        const content = ar ? step.description_ar : step.description_en;
        if (typeof content === 'string' && content.trim()) lines.push('• ' + content.slice(0, 600));
      }
      if (!compare && !steps.length) lines.push(ar ? 'خطوات هذه الوصفة غير منشورة؛ افتح المصدر.' : 'Steps are not published for this recipe; open its source.');
    } else for (const key of keys) lines.push(`${factLabels[key][ar ? 0 : 1]}: ${textValue(f[key], ar) || missing}`);
    if (d.kind === 'equipment' && !keys.length) lines.push(ar ? 'لا توجد مواصفات موثقة تكفي للمقارنة.' : 'There are not enough documented specifications to compare.');
    return lines.join('\n');
  }).join('\n\n');
}

/** All answers are assembled from typed facts, explicit arithmetic or reviewed local guidance. */
export async function converseLocally(question: string, locale: 'ar' | 'en', history: LocalAssistantTurn[], dependencies: LocalAssistantDependencies): Promise<LocalAssistantTurn> {
  const ar = locale === 'ar', q = norm(question), previous = history.at(-1);
  const query = parseLocalAssistantQuery(question, previous?.query);
  const base: LocalAssistantTurn = { question: question.trim().slice(0, 1000), query, matches: [], mode: 'local', intent: 'help', answer: '' };
  const reply = (answer: string, extra: Partial<LocalAssistantTurn> = {}) => ({ ...base, answer, ...extra });
  if (!q || question.length > 1000) return reply(ar ? 'اكتب سؤالًا عن القهوة لا يزيد على 1000 حرف.' : 'Ask a coffee question using no more than 1000 characters.');
  const methods = methodOf(q), method = methods[0] ?? previous?.calculation?.method ?? previous?.coach?.method ?? previous?.query.methods[0] ?? null;
  const references = previous?.matches ?? [];
  const selection = selectedResults(q, references);
  const compare = /قارن|مقارنه|الفرق|compare|comparison|difference/.test(q);
  const explain = /اشرح|تفاصيل|مواصفات|خطوات|explain|details|specs|steps|ليش|why/.test(q);
  const ratioMatch = q.match(/1\s*[:/]\s*(-?\d+(?:\.\d+)?)/);
  const doseMatch = q.match(/(?:^|[^\d.])(-?\d+(?:\.\d+)?)\s*(?:غرام|جرام|غ|جم|grams?|g)(?=$|[^a-z\p{L}])/u);
  const calculate = /احسب|حساب|نسبه|ريشو|ratio|calculate/.test(q) || !!ratioMatch || (!!doseMatch && (previous?.intent === 'calculate' || /خل|غير|اضبط|make|change/.test(q)));

  if (calculate) {
    const methodChanged = methods.length > 0 && previous?.calculation?.method && methods[0] !== previous.calculation.method;
    const last = previous?.intent === 'calculate' && !methodChanged ? previous.calculation : undefined;
    const selected = selection.explicit ? selection.matches : references.length === 1 ? references : [];
    if (selection.invalid) return reply(ar ? 'هذا الرقم غير موجود في النتائج السابقة. اختر رقمًا ظاهرًا.' : 'That result number is not in the previous results. Choose a displayed number.');
    const recipe = selected.find(m => m.document.kind === 'recipe')?.document;
    const f = recipe?.facts ?? {};
    const dose = doseMatch ? Number(doseMatch[1]) : last?.dose ?? null;
    const baseRatio = recipe && !recipe.methods.includes('espresso') && positive(f.dose) && positive(f.water) ? f.water / f.dose : null;
    const ratio = ratioMatch ? Number(ratioMatch[1]) : last?.ratio ?? baseRatio;
    const brewMethod = methods[0] ?? recipe?.methods[0] ?? last?.method ?? method;
    const calculation = { dose, ratio, method: brewMethod };
    if (dose === null || ratio === null) return reply(ar ? 'حدد وزن البن والنسبة، مثل: احسب 18 غرام بنسبة 1:16. للإسبريسو اذكر أنه إسبريسو لحساب وزن المشروب.' : 'Give the coffee dose and ratio, for example: calculate 18 g at 1:16. Say espresso when you mean beverage yield.', { intent: 'calculate', calculation });
    if (dose <= 0 || dose > 1000 || ratio <= 0 || ratio > 100) return reply(ar ? 'استخدم جرعة بين 0 و1000 غرام ونسبة بين 0 و100، وكلاهما أكبر من صفر.' : 'Use a dose up to 1000 g and a ratio up to 100, both greater than zero.', { intent: 'calculate', calculation });
    if (brewMethod === 'moka_pot') return reply(ar ? 'الموكا بوت تعتمد على سعة السلة والخزان. لا أغيّر تعبئتها بحساب النسبة؛ اتبع دليل مقاس إبريقك.' : 'Moka pot filling depends on its basket and boiler size. Follow the guide for your pot instead of scaling its fill by ratio.', { intent: 'calculate', calculation });
    if (brewMethod === 'xbloom' && (dose < 5 || dose > 18)) return reply(ar ? 'هذه الجرعة خارج نطاق 5–18 g الذي يدعمه مسار xBloom في التطبيق. اختر جرعة ضمنه.' : 'This dose is outside the app’s supported xBloom range of 5–18 g. Choose a dose in that range.', { intent: 'calculate', calculation });
    const outputLabel = brewMethod === 'espresso' ? (ar ? 'ناتج الإسبريسو المستهدف' : 'Target espresso beverage yield') : (ar ? 'ماء التحضير' : 'Brew water');
    return reply(`${ar ? 'حساب النسبة المطلوبة' : 'Requested ratio calculation'}: ${number(dose)} g × ${number(ratio)} = ${number(dose * ratio)} g\n${outputLabel}: ${number(dose * ratio)} g\n${ar ? 'هذا حساب رياضي، وليس وصفة مختبرة. لا يحدد درجة الطحن أو الحرارة أو الوقت؛ تحقق من سعة أداتك.' : 'This is arithmetic, not a tested recipe. It does not set grind, temperature or time; check your brewer capacity.'}`, { intent: 'calculate', calculation, matches: selected, suggestions: ar ? ['خلها 20 غرام', 'غير النسبة إلى 1:15'] : ['Make it 20 g', 'Change ratio to 1:15'] });
  }
  const knowledge = !selection.explicit && !(compare && references.length) ? coffeeKnowledgeAnswer(question, locale, previous?.knowledgeTopic) : null;
  if (knowledge) return reply(knowledge.answer, { intent: 'knowledge', knowledgeTopic: knowledge.topic, sources: knowledge.sources, suggestions: knowledge.suggestions });
  if (compare || selection.explicit || (explain && references.length)) {
    const chosen = selection.explicit ? selection.matches : compare ? references.slice(0, 3) : references.length === 1 ? references : [];
    if (selection.invalid || !chosen.length || (compare && chosen.length < 2)) return reply(ar ? 'ابحث عن الخيارات أولًا، ثم قل «اشرح الأول» أو «قارن الأول والثاني». اختر رقمًا من النتائج الظاهرة.' : 'Search for options first, then say “explain the first” or “compare the first and second”. Use a displayed result number.', { matches: references, query: previous?.query ?? query });
    // Revalidate dated offers locally before displaying references; never keep a stale price alive.
    const matches = chosen.map(m => ({ ...m, price: rankAssistantDocuments([m.document], { ...query, kind: m.document.kind, category: null, methods: [], terms: [], amount: null, currency: m.price?.currency ?? null, region: null, availableOnly: false, clarification: null }, [], dependencies.now)[0]?.price ?? null }));
    return reply((compare ? (ar ? 'أقارن المواصفات المنشورة فقط؛ غير المذكور يبقى غير معروف.\n\n' : 'Comparing published specifications; missing details remain unknown.\n\n') : '') + referenceText(matches, ar, compare), { intent: compare ? 'compare' : 'explain', matches, query: previous?.query ?? query, suggestions: compare ? (ar ? ['أبي أرخص خيار', 'اشرح الأول'] : ['Show a cheaper option', 'Explain the first']) : [] });
  }

  const negated = q.replace(/(?:مو|مش|ليس|بدون|not|isnt|isn't)\s+(?:حامض|حامضه|مر|مره|sour|bitter)/g, '');
  const sour = /حامض|حموضه (?:قويه|زايده)|\bsour\b/.test(negated);
  const bitter = /مراره|جفاف|\bbitter\b|\bdry\b/.test(negated) || has(negated, 'مر') || has(negated, 'مره');
  const weak = /خفيفه|مائي|ضعيف|\bweak\b|\bwatery\b/.test(negated);
  const measurements = {
    dose: q.match(/(?:جرعه|جرعتي|dose)\s*(\d+(?:\.\d+)?)/)?.[1],
    output: q.match(/(?:ناتج|الناتج|ماء|الماء|yield|output|water)\s*(\d+(?:\.\d+)?)/)?.[1],
    seconds: q.match(/(\d+(?:\.\d+)?)\s*(?:ثانيه|ثواني|seconds?|sec\b)/)?.[1],
  };
  const measurementFollowUp = previous?.intent === 'coach' && Object.values(measurements).some(Boolean);
  const coachIntent = !/وصف|recipe|ايحاء|notes|احب|love/.test(q) && (sour || bitter || weak || /استخلاص.*بطي|استخلاص.*سريع|shot.*(?:slow|fast)|chok/.test(q) || (previous?.intent === 'coach' && methods.length > 0) || measurementFollowUp);
  if (coachIntent) {
    const signal = sour && bitter ? 'mixed' : sour ? 'sour' : bitter ? 'bitter' : weak ? 'weak' : /بطي|slow|chok/.test(q) ? 'slow' : /سريع|fast/.test(q) ? 'fast' : previous?.coach?.signal ?? 'unknown';
    const coach = { ...(previous?.intent === 'coach' ? previous.coach : {}), signal, method, ...Object.fromEntries(Object.entries(measurements).filter(([, value]) => value && positive(Number(value))).map(([key, value]) => [key, Number(value)])) };
    if (!method) return reply(ar ? 'حتى أحدد الخطوة المناسبة: تستخدم إسبريسو أم V60 أم طريقة ثانية؟' : 'Which method are you using: espresso, V60 or another brewer?', { intent: 'coach', coach, suggestions: ['Espresso', 'V60'] });
    let advice: string;
    if (signal === 'mixed') advice = ar ? 'اجتماع الحموضة والمرارة قد يدل على استخلاص غير متجانس. راجع توزيع البن وانتظام مرور الماء قبل تغيير الطحن.' : 'Sourness together with bitterness can indicate uneven extraction. Check grounds distribution and even water flow before changing grind.';
    else if (signal === 'weak') advice = ar ? 'الخفة وحدها لا تحدد اتجاه الطحن. اذكر جرعة البن ووزن الماء أو ناتج الإسبريسو لنراجع النسبة.' : 'Weakness alone does not tell us which way to move the grind. Give the dose and water weight or espresso yield so we can review the ratio.';
    else if (method === 'espresso') advice = ar ? 'ثبّت جرعة البن وسجّل وزن المشروب والوقت. لا أقدر أحدد رقم طاحونة من الطعم وحده. راجع تجانس التوزيع أولًا، ثم عدّل عاملًا واحدًا وقارن الطعم.' : 'Keep the dose fixed and record beverage yield and time. Taste alone cannot determine a grinder setting. Check even distribution first, then change one variable and compare taste.';
    else advice = signal === 'sour' || signal === 'fast' ? (ar ? 'جرّب طحنًا أنعم قليلًا مع تثبيت بقية الوصفة، ثم قارن الطعم. الحموضة وحدها لا تثبت نقص الاستخلاص.' : 'Try a slightly finer grind while keeping the rest of the recipe fixed, then compare taste. Sourness alone does not prove under-extraction.') : (ar ? 'جرّب طحنًا أخشن قليلًا مع تثبيت بقية الوصفة، ثم قارن الطعم. تأكد أيضًا من نظافة الفلتر وانتظام الصب.' : 'Try a slightly coarser grind while keeping the rest of the recipe fixed, then compare taste. Also check the filter and even pouring.');
    if (positive(coach.dose) && positive(coach.output)) advice = `${ar ? 'حسب الأوزان التي ذكرتها، النسبة' : 'From the weights you provided, the ratio is'} 1:${number(coach.output / coach.dose)}${positive(coach.seconds) ? ` · ${number(coach.seconds)} s` : ''}.\n${advice}`;
    return reply(advice, { intent: 'coach', coach, followUp: ar ? 'اكتب الأوزان بهذا الشكل: جرعة 18، الناتج 36، الوقت 30 ثانية؛ هذه أمثلة لطريقة الإدخال وليست وصفة.' : 'Label measurements, for example: dose 18, yield 36, 30 seconds. These are input examples, not a recipe.', sources: [{ title: 'Barista Hustle — ' + (method === 'espresso' ? 'Espresso Compass' : 'Coffee Compass'), url: method === 'espresso' ? 'https://www.baristahustle.com/the-espresso-compass/' : 'https://www.baristahustle.com/coffee-compass/' }] });
  }
  if (methods.length && /شلون|كيف|طريقه|دليل|how|guide|use/.test(q)) {
    const guide = dependencies.guides?.[methods[0]];
    if (guide) return reply([ar ? guide.title_ar : guide.title, ar ? guide.intro_ar : guide.intro, ...(ar ? guide.tips_ar : guide.tips).map(t => '• ' + t)].join('\n'), { intent: 'guide', sources: [{ title: guide.source_name, url: guide.source }], suggestions: ar ? [`أبي وصفة ${methods[0]}`] : [`Find a ${methods[0]} recipe`] });
  }
  if (/^(?:هلا|مرحبا|السلام عليكم|hello|hi|شكرا|مشكور|thanks|thank you)[! .؟?]*$/.test(q) || /شنو تقدر|شقاعد تسوي|what can you|help|مساعده/.test(q)) return reply(ar ? 'أنا خبير القهوة. أشرح البن والماء والطحن والمكاين والأدوات والتحميص والتذوق، وأحسب النسب وأقارن مواصفات الكتالوغ. اكتب سؤالك أو الموضوع الذي تريد تعلّمه.' : 'I am your coffee expert. I explain beans, water, grinding, machines, tools, roasting and tasting, calculate ratios and compare catalog specifications. Ask your question or name a topic you want to learn.', { suggestions: ar ? ['علمني القهوة من الألف إلى الياء', 'احسب 18 غرام بنسبة 1:16', 'قهوتي V60 حامضة'] : ['Teach me coffee from A to Z', 'Calculate 18 g at 1:16', 'My V60 tastes sour'] });
  if (query.clarification) return reply(assistantReply(query, [], locale), { intent: 'search', suggestions: query.clarification === 'currency' ? ['USD', 'KWD', 'SAR'] : [] });
  const searched = await dependencies.search(query);
  const now = dependencies.now ?? Date.now();
  const operation = query.terms.find(t => ['manual', 'electric', 'automatic'].includes(t));
  const documents = operation ? searched.documents.filter(d => {
    const published = norm(textValue(d.facts?.operation, false) + ' ' + textValue(d.facts?.operation, true));
    return (gearAliases.find(g => g[0] === operation) ?? [operation]).some(alias => has(published, alias));
  }) : searched.documents;
  const matches = rankAssistantDocuments(documents, query, searched.rates, now);
  return reply(assistantReply(query, matches, locale), { intent: 'search', matches, sources: [], suggestions: matches.length >= 2 ? (ar ? ['قارن الأول والثاني', 'اشرح الأول'] : ['Compare the first and second', 'Explain the first']) : matches.length ? (ar ? ['اشرح الأول'] : ['Explain the first']) : query.amount !== null ? (ar ? ['ابحث بدون ميزانية'] : ['Search without budget']) : [] });
}

export function localAssistantSources(turn: LocalAssistantTurn) {
  return (turn.sources ?? []).filter(source => assistantSafeUrl(source.url));
}
