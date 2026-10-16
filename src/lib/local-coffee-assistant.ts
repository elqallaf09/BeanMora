import { assistantRecipeServingStyle, assistantReply, assistantSafeUrl, assistantSearchTerms, assistantTermLabel, hasEquipmentIntent, hasRecipeIntent, parseAssistantQuery, rankAssistantDocuments, type AssistantDocument, type AssistantMatch, type AssistantQuery, type CatalogRate } from './coffee-assistant';
import { factLabels } from './equipment-facts';
import { normalizeSearch } from './search/deepSearch';
import { coffeeKnowledgeAnswer, coffeeLearningTopics } from './coffee-knowledge';
import { ESPRESSO_CONTROLS_TOPIC, espressoControlAdvice, isEspressoControlFollowUp, isEspressoControlRequest } from './espresso-control-advice';

/** A bounded coffee expert system, not a generative model. No provider, keys or training uploads. */
export interface LocalAssistantTurn {
  question: string; answer: string; query: AssistantQuery; matches: AssistantMatch[];
  mode: 'local'; intent: 'search' | 'compare' | 'explain' | 'calculate' | 'coach' | 'guide' | 'knowledge' | 'help';
  knowledgeTopic?: string;
  recipeAlternative?: boolean;
  followUp?: string; suggestions?: string[]; sources?: { title: string; url: string }[];
  calculation?: { dose: number | null; ratio: number | null; method: string | null; servingStyle?: 'iced' | 'hot' };
  coach?: { signal: string; method: string | null; dose?: number; output?: number; seconds?: number };
}
export interface LocalGuide { title_ar: string; title: string; intro_ar: string; intro: string; tips_ar: string[]; tips: string[]; source: string; source_name: string }
export interface LocalAssistantDependencies {
  search: (query: AssistantQuery) => Promise<{ documents: AssistantDocument[]; rates: CatalogRate[] }>;
  guides?: Record<string, LocalGuide>; now?: number;
  translate?: (arabic:string,english:string)=>string;
  translateValue?: (arabic:string,english:string)=>string;
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
const norm = (s: string) => normalizeSearch(digits(s).slice(0, 1000)).replace(/v[\s‐‑–—-]*60\b/g, 'v60');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, phrase: string) => new RegExp('(?:^|[^\\p{L}\\p{N}])(?:و|ب|ال)?' + escape(norm(phrase)) + '(?=$|[^\\p{L}\\p{N}])', 'u').test(s);
const methodOf = (s: string) => methodAliases.filter(([, aliases]) => aliases.some(alias => has(s, alias) || has(s, 'ل' + alias) || has(s, 'لل' + alias) || has(s, 'بال' + alias))).map(([id]) => id);
const textValue = (v: unknown, ar: boolean): string => Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'string') ? String(v[ar ? 0 : 1]).slice(0, 320) : typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 320) : '';
const title = (d: AssistantDocument, ar: boolean) => ar ? d.title_ar || d.title_en : d.title_en || d.title_ar;
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const number = (v: number) => String(Math.round(v * 100) / 100);
const massUnits = 'غرام|جرام|غ|جم|grams?|g';
const brewLiquids = 'ماء|ماي|مويه|مويا|ميه|ثلج|water|ice';
const quantityWords = 'كم|جم|شكثر|اشكثر|كميه|مقدار|قد ايش|how much|how many';
const quantityFillers = 'احط|نحط|اضيف|نضيف|اصب|استخدم|احتاج|نحتاج|يحتاج|يبي|يبيله|احطله|احطلها|له|لها|عليه|عليها|لي|من|of|hot|cold|' + massUnits + '|مل|ml';
function isBrewQuantityQuestion(q: string) {
  // Match short, explicit quantity phrases. Do not globally replace جم: after
  // a number it is a mass unit, while "جم ماي" is the Kuwaiti question "how much".
  const forward = new RegExp('(?:^|[^\\p{L}\\p{N}])و?(' + quantityWords + ')\\s+(?:(?:' + quantityFillers + ')\\s+){0,4}(?:ال)?(?:' + brewLiquids + ')(?=$|[^\\p{L}])', 'gu');
  const asksFirst = [...q.matchAll(forward)].some(match => match[1] !== 'جم' || !/(?:^|[^\p{L}\p{N}])-?\d+(?:\.\d+)?\s*$/u.test(q.slice(0, match.index)));
  const asksLast = new RegExp('(?:^|[^\\p{L}\\p{N}])(?:و?ب?(?:ال)?)(?:' + brewLiquids + ')\\s+(?:' + quantityWords + '|amount)(?=$|[^\\p{L}])', 'u').test(q);
  return asksFirst || asksLast;
}
// Short corrections describe the same cup. Consume only brewer names and
// preparation words so a new shopping request or taste complaint stays separate.
function isPreparationReply(q: string) {
  let rest = q;
  for (const [, aliases] of methodAliases) for (const alias of aliases) {
    rest = rest.replace(new RegExp('(?:^|[^\\p{L}\\p{N}])(?:لل|بال|ل|ب)?' + escape(norm(alias)) + '(?=$|[^\\p{L}\\p{N}])', 'gu'), ' ');
  }
  const words = new Set('ابي ابيها ابغيها ابغاها اباها خلها خله حار حاره بارد بارده مثلج مثلجه متلج متلجه بالثلج ثلج بدون استخدم استعمل اسويها احضرها على علي بال ب hot cold iced ice without no make it that using with please'.split(' '));
  return rest.replace(/[؟?!.,،+]/g, ' ').split(/\s+/).filter(Boolean).every(word => words.has(word));
}
const otherUnits = 'كيلوغرام|كيلوجرام|كيلو|كغ|kg|kilograms?|oz|ounces?|lbs?|pounds?|ملليلتر|مل|ml|millilit(?:er|re)s?|لتر|lit(?:er|re)s?|بار|bars?|ثانيه|ثواني|seconds?|sec|s|دقيقه|دقائق|minutes?|min|°c|درجه';
function coachingMass(q: string, labels: string, requireUnit = false) {
  const match = q.match(new RegExp('(?:^|[^\\p{L}\\p{N}])(?:' + labels + ')\\s*[:=]?\\s*(-?\\d+(?:\\.\\d+)?)(?![\\d.])\\s*(' + massUnits + '|' + otherUnits + ')?(?![\\p{L}\\p{N}])', 'u'));
  if (!match) return undefined;
  const grams = match[2] && new RegExp('^(?:' + massUnits + ')$', 'u').test(match[2]);
  // Never turn an explicitly supplied volume, pressure or time into grams.
  return (match[2] && !grams) || (requireUnit && !grams) ? 'invalid' : match[1];
}

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
  const gear = hasEquipmentIntent(q);
  const roaster = /محامص|محمص|roaster/.test(q);
  const beans = /حبوب|\bbeans?\b/.test(q) || ((has(q, 'بن') || has(q, 'قهوه') || has(q, 'coffee')) && !recipe && !gear && !roaster && !/عندي|have/.test(q));
  const budgetFollowUp = /ميزاني|سعر|حدود|تحت|ارخص|budget|under|cheaper|price/.test(q) || /^(?:\d+[,.\d]*\s*)?(?:usd|kwd|sar|دولار|دينار|ريال)/.test(q);
  const clean = q.split(/\s+/).filter(word => !filler.has(word.replace(/[،,.?؟]/g, ''))).join(' ');
  const explicitKind = hasRecipeIntent(q) ? 'recipe' : gear ? 'equipment' : recipe ? 'recipe' : roaster ? 'roaster' : beans ? 'coffee' : null;
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
  const unsupportedCurrency = /يورو|درهم|جنيه|\b(?:eur|aed|gbp|egp|brl|jpy|cny)\b|€|£|¥/.test(q);
  if (unsupportedCurrency) {
    const amount = q.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:eur|aed|gbp|egp|brl|jpy|cny|يورو|درهم|جنيه|€|£|¥)/)?.[1];
    if (amount) query.amount = Number(amount);
    query.currency = null; query.clarification = 'currency'; return query;
  }
  if (query.kind !== 'equipment') { query.amount = null; query.currency = null; query.category = null; query.region = null; query.availableOnly = false; query.purchaseIntent = false; }
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
function referenceText(matches: AssistantMatch[], ar: boolean, compare: boolean, translate?: (arabic:string,english:string)=>string, translateValue?: (arabic:string,english:string)=>string, grouped = false) {
  const L=translate??((arabic:string,english:string)=>ar?arabic:english);
  const V=translateValue??((arabic:string,english:string)=>ar?arabic:english);
  const missing = L('غير مذكور في المصدر', 'Not reported by the source');
  const keys = [...new Set(matches.flatMap(m => Object.keys(m.document.facts ?? {}).filter(k => k in factLabels)))].slice(0, 8);
  return matches.map((m, i) => {
    const d = m.document, f = d.facts ?? {};
    const lines = [`${grouped ? '' : `${i + 1}. `}${V(title(d,true),title(d,false))}`];
    if (d.kind === 'recipe') {
      const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
      const source = record(f.source_brew), manual = record(source.manual);
      // Preserve publisher units and ranges. Boiler input water is never an
      // espresso beverage yield, and a volume is not a mass-based ratio.
      const quantity = (scalar: unknown, low: unknown, high: unknown, unit: string, limit = 20000) => {
        const valid = (value: unknown): value is number => positive(value) && value <= limit;
        return valid(scalar) ? `${number(scalar)} ${unit}` : valid(low) && valid(high) && low <= high ? `${number(low)}–${number(high)} ${unit}` : '';
      };
      const note = (key: string) => {
        const english = textValue(manual[key], false), arabic = textValue(manual[`${key}_ar`], true);
        return english || arabic ? L(arabic || english, english || arabic) : '';
      };
      const waterMl = source.water_ml ?? manual.water_ml;
      const hasPourTemperatures = Array.isArray(source.pours) && source.pours.some(pour => positive(record(pour).temperature));
      const style = assistantRecipeServingStyle(d);
      if (grouped) lines.push('');
      if (style) lines.push(`${L('التقديم', 'Serving')}: ${style === 'hot' ? (L('حار', 'Hot')) : (L('بارد', 'Cold'))}`);
      if (grouped) lines.push('');
      for (const [key, label, unit] of [['dose', L('البن', 'Coffee'), 'g'], ['water', L('ماء التحضير', 'Brew water'), 'g'], ['temperature', L('الحرارة', 'Temperature'), '°C']] as const) {
        // The catalog water field is not espresso beverage yield.
        if (key === 'water' && d.methods.includes('espresso')) continue;
        lines.push(`${label}: ${positive(f[key]) ? number(f[key] as number) + ' ' + unit : key === 'water' && positive(waterMl) ? number(waterMl) + ' ml' : key === 'temperature' && hasPourTemperatures ? (L('حسب الصبات المنشورة أدناه', 'See the published pour temperatures below')) : key === 'temperature' ? note('temperature_note') || missing : missing}`);
      }
      const ice = style === 'iced' ? quantity(manual.ice_grams ?? source.ice_grams, null, null, 'g') : '';
      if (ice) lines.push(`${L('الثلج', 'Ice')}: ${ice}`);
      const total = ice ? quantity(manual.water_input_total_grams, null, null, 'g') : '';
      if (total) lines.push(`${L('إجمالي الماء والثلج', 'Total water and ice')}: ${total}`);
      if (grouped) lines.push('');
      if (d.methods.includes('espresso')) {
        const yields = [quantity(manual.yield_grams, manual.yield_min_grams, manual.yield_max_grams, 'g'), quantity(manual.yield_ml, manual.yield_min_ml, manual.yield_max_ml, 'ml')].filter(Boolean);
        const calculated = manual.yield_derived_from_ratio === true && yields.length ? L(' (محسوب)', ' (calculated)') : '';
        lines.push(`${L('الناتج', 'Yield')}: ${yields.join(' · ') || missing}${calculated}`);
        for (const key of ['scalar_yield_basis', 'yield_scope']) { const scope = note(key); if (scope) lines.push(scope); }
      }
      const time = note('time_note') || quantity(f.seconds, manual.time_min_seconds, manual.time_max_seconds, 's', 172800);
      if (time) lines.push(`${L('الوقت', 'Time')}: ${time}`);
      const sourceRatio = textValue(manual.source_ratio_text, false);
      if (sourceRatio) lines.push(`${L('نسبة المصدر', 'Source ratio')}: ${sourceRatio}`);
      const grindAr = textValue(manual.grind_ar,true) || textValue(f.grind,true) || textValue(source.grind_size,true);
      const grindEn = textValue(f.grind,false) || textValue(source.grind_size,false);
      const grind = typeof manual.grind_ar === 'string' && manual.grind_ar.trim() ? L(grindAr, grindEn || grindAr)
        : norm(grindEn) === 'medium-fine' ? L('متوسطة إلى ناعمة', 'Medium-fine')
        : norm(grindEn) === 'medium-coarse' ? L('متوسطة إلى خشنة', 'Medium-coarse')
          : grindAr || grindEn ? L(grindAr||grindEn,grindEn||grindAr) : '';
      lines.push(`${L('الطحن المنشور', 'Published grind')}: ${grind || missing}`);
      if (typeof source.model === 'string' && source.model.trim()) lines.push(`${L('موديل المصدر', 'Source model')}: ${source.model.trim().slice(0, 80)}`);
      if (style === 'iced' && !ice) lines.push(L('راجع كمية الثلج في المصدر؛ لا أضيف مقدارًا غير منشور.', 'Check the source for the ice amount; no unpublished quantity is added.'));
      const steps = Array.isArray(f.steps) ? f.steps : [];
      if (grouped && steps.length) lines.push('', L('طريقة التحضير', 'How to brew'));
      if (!compare) for (const step of steps.slice(0, 12)) {
        if (!step || typeof step !== 'object') continue;
        const english = String(step.description_en || step.description_ar || '').slice(0,600);
        const arabic = String(step.description_ar || step.description_en || '').slice(0,600);
        if (english.trim()) lines.push('• ' + L(arabic,english));
      }
      if (!compare && !steps.length) lines.push(L('خطوات هذه الوصفة غير منشورة؛ افتح المصدر.', 'Steps are not published for this recipe; open its source.'));
    } else if (d.kind === 'coffee') {
      const summary = ar ? d.summary_ar : d.summary_en;
      if (summary?.trim()) lines.push(summary.trim().slice(0, 1000));
      if (typeof f.roaster === 'string' && f.roaster.trim()) lines.push(`${L('المحمصة', 'Roaster')}: ${f.roaster.trim().slice(0, 160)}`);
      if (!summary?.trim()) lines.push(L('لا يوجد وصف منشور كافٍ لهذا البن؛ راجع المصدر الأصلي.', 'There is not enough published description for this coffee; check the original source.'));
    } else for (const key of keys) {
      const arabic=textValue(f[key],true),english=textValue(f[key],false);
      lines.push(`${L(factLabels[key][0],factLabels[key][1])}: ${arabic||english?L(arabic||english,english||arabic):missing}`);
    }
    if (d.kind === 'equipment' && !keys.length) lines.push(L('لا توجد مواصفات موثقة تكفي للمقارنة.', 'There are not enough documented specifications to compare.'));
    return lines.join('\n');
  }).join('\n\n');
}

/** Prefer usable publisher instructions when a requested coffee/note has no match. */
function recipeInstructionScore(document: AssistantDocument): number {
  const f = document.facts ?? {};
  const source = f.source_brew as Record<string, unknown> | undefined;
  const manual = source?.manual as Record<string, unknown> | undefined;
  const steps = Array.isArray(f.steps) ? f.steps.filter(step => step && typeof step === 'object' &&
    [step.description_ar, step.description_en].some(text => typeof text === 'string' && text.trim())) : [];
  if (!assistantSafeUrl(document.source_url) || !steps.length || !positive(f.dose)) return -1;
  return Number(f.incomplete === false) * 8 + Number(positive(f.water) || positive(source?.water_ml) || positive(manual?.water_ml)) * 4
    + Number(positive(manual?.ice_grams ?? source?.ice_grams)) * 2 + Math.min(steps.length, 4);
}

function recipeAlternativeNotice(query: AssistantQuery, L: (arabic:string,english:string)=>string) {
  const requested = query.terms.map(term => L(assistantTermLabel(term, 'ar'), assistantTermLabel(term, 'en'))).join(L('، ', ', '));
  return [L('وصفة بديلة يمكنك البدء بها', 'An alternative recipe to start with'),
    L(`لم أجد وصفة مخصّصة لـ«${requested}». هذا بديل بنفس طريقة التحضير والتقديم، ولا يؤكد المصدر مطابقته للبن أو الإيحاء المطلوب.`, `I found no recipe specifically for “${requested}”. This alternative keeps the brewer and serving style; its source does not confirm your requested coffee or tasting notes.`),
  ].join('\n\n');
}

/** All answers are assembled from typed facts, explicit arithmetic or reviewed local guidance. */
export async function converseLocally(question: string, locale: 'ar' | 'en', history: LocalAssistantTurn[], dependencies: LocalAssistantDependencies): Promise<LocalAssistantTurn> {
  const ar = locale === 'ar', q = norm(question), previous = history.at(-1);
  const L=dependencies.translate??((arabic:string,english:string)=>ar?arabic:english);
  const query = parseLocalAssistantQuery(question, previous?.query);
  const base: LocalAssistantTurn = { question: question.trim().slice(0, 1000), query, matches: [], mode: 'local', intent: 'help', answer: '' };
  const reply = (answer: string, extra: Partial<LocalAssistantTurn> = {}) => ({ ...base, answer:L(answer,answer), ...extra });
  if (!q || question.length > 1000) return reply(L('اكتب سؤالًا عن القهوة لا يزيد على 1000 حرف.', 'Ask a coffee question using no more than 1000 characters.'));
  const methods = methodOf(q), method = methods[0] ?? previous?.calculation?.method ?? previous?.coach?.method ?? previous?.query.methods[0] ?? null;
  const references = previous?.matches ?? [];
  const selection = selectedResults(q, references);
  const shopping = query.kind === 'equipment' && query.purchaseIntent === true;
  const controlsFollowUp = isEspressoControlFollowUp(question, previous?.knowledgeTopic);
  if (!selection.explicit && (isEspressoControlRequest(question, query) || controlsFollowUp)) {
    const controlQuery = { ...query, kind: 'equipment' as const, category: 'espresso_machine', methods: ['espresso'], terms: [] };
    if (query.clarification === 'budget' || query.clarification === 'currency') {
      return reply(assistantReply(query, [], locale, L, dependencies.translateValue), { intent: 'knowledge', knowledgeTopic: ESPRESSO_CONTROLS_TOPIC, query: controlQuery });
    }
    const more = controlsFollowUp && /اشرح|وضح|اكمل|كمل|more|continue/.test(q);
    const advice = espressoControlAdvice(L, query.amount !== null, more);
    return reply(advice.answer, { ...advice, intent: 'knowledge', knowledgeTopic: ESPRESSO_CONTROLS_TOPIC, query: controlQuery });
  }
  const compare = /قارن|مقارنه|الفرق|compare|comparison|difference/.test(q);
  const explain = /اشرح|تفاصيل|مواصفات|خطوات|explain|details|specs|steps|ليش|why/.test(q);
  const ratioMatch = q.match(/1\s*[:/]\s*(-?\d+(?:\.\d+)?)/);
  const massMatches = [...q.matchAll(/(?<![\p{L}\p{N}.])(-?\d+(?:\.\d+)?)\s*(?:غرام|جرام|غ|جم|grams?|g)(?=$|[^a-z\p{L}])/gu)];
  const coffeeLabel = /(?:بن|قهوه|جرعه|جرعتي|coffee|dose)\s*[:=]?\s*$/u;
  const otherLabel = new RegExp('(?:' + brewLiquids + ')\\s*[:=]?\\s*$', 'u');
  const liquidAfterMass = new RegExp('^\\s*(?:من\\s+|of\\s+)?(?:ال)?(?:' + brewLiquids + ')(?=$|[^\\p{L}])', 'u');
  const doseMatch = massMatches.find(m => coffeeLabel.test(q.slice(0, m.index)))
    ?? massMatches.find(m => !otherLabel.test(q.slice(0, m.index)) && /^\s*(?:من\s+|of\s+)?(?:ال)?(?:بن|قهوه|coffee)(?=$|[^\p{L}])/u.test(q.slice(m.index! + m[0].length)))
    ?? massMatches.find(m => !otherLabel.test(q.slice(0, m.index)) && !liquidAfterMass.test(q.slice(m.index! + m[0].length)));
  // Amount questions must be routed before broad lesson keywords such as "water".
  const quantityQuestion = isBrewQuantityQuestion(q);
  const hasServing = /حار|بارد|مثلج|متلج|ثلج|\b(?:hot|cold|iced|ice)\b/.test(q);
  const preparationReply = isPreparationReply(q) && (hasServing || methods.length > 0)
    && (previous?.intent === 'calculate' || (methods.includes('v60') && hasServing));
  const differentIntent = shopping || hasRecipeIntent(q) || has(q, 'مر') || has(q, 'مره')
    || /وصف|ابحث|دور|رشح|اقترح|اشتري|شراء|افضل|احسن|انسب|اشرح|ليش|لماذا|شنو|حامض|حموضه|مراره|جفاف|خفيف|ضعيف|\b(?:recipe|find|recommend|buy|best|explain|why|sour|bitter|weak|watery)\b/.test(q);
  // A measured cup description is a brew request, but a recipe search, lesson
  // or taste complaint must retain its own intent even when it includes a dose.
  const doseServingRequest = !!doseMatch && !differentIntent && (hasServing || (methods.length > 0 && /شلون|كيف|اسوي|احضر|\b(?:how|make|prepare)\b/.test(q)));
  const bareDose = previous?.intent === 'calculate' && previous.calculation?.dose === null && /^-?\d+(?:\.\d+)?$/.test(q) ? Number(q) : null;
  const calculate = quantityQuestion || doseServingRequest || preparationReply || bareDose !== null || /احسب|حساب|نسبه|ريشو|ratio|calculate/.test(q) || !!ratioMatch || (!!doseMatch && !differentIntent && (previous?.intent === 'calculate' || /خل|غير|اضبط|make|change/.test(q)));

  if (calculate) {
    const methodChanged = methods.length > 0 && previous?.calculation?.method && methods[0] !== previous.calculation.method;
    const last = previous?.intent === 'calculate' && !methodChanged ? previous.calculation : undefined;
    const selected = selection.explicit ? selection.matches : !quantityQuestion && references.length === 1 ? references : [];
    if (selection.invalid) return reply(L('هذا الرقم غير موجود في النتائج السابقة. اختر رقمًا ظاهرًا.', 'That result number is not in the previous results. Choose a displayed number.'));
    const recipe = selected.find(m => m.document.kind === 'recipe')?.document;
    const f = recipe?.facts ?? {};
    const sourceBrew = f.source_brew as Record<string, unknown> | undefined;
    const manual = sourceBrew?.manual as Record<string, unknown> | undefined;
    const sourceIce = manual?.ice_grams ?? sourceBrew?.ice_grams;
    const sourceStyle = recipe ? assistantRecipeServingStyle(recipe) : null;
    const knownIceSplit = sourceStyle === 'iced' && positive(f.dose) && positive(f.water) && positive(sourceIce)
      && f.dose <= 1000 && f.water + sourceIce <= 20000
      && (manual?.water_input_total_grams === undefined || positive(manual.water_input_total_grams)
        && Math.abs(manual.water_input_total_grams - f.water - sourceIce) < .01);
    const dose = doseMatch ? Number(doseMatch[1]) : bareDose ?? last?.dose ?? null;
    const baseRatio = recipe && !recipe.methods.includes('espresso') && positive(f.dose) && positive(f.water) ? (f.water + (knownIceSplit ? sourceIce as number : 0)) / f.dose : null;
    const brewMethod = methods[0] ?? recipe?.methods[0] ?? last?.method ?? method;
    const servingStyle = /(?:بدون|دون)\s+(?:ال)?ثلج|\b(?:without|no) ice\b/.test(q) ? 'hot'
      : /ثلج|مثلج|متلج|\b(?:ice|iced)\b/.test(q) || (brewMethod !== 'cold_brew' && /بارد|\bcold\b/.test(q)) ? 'iced'
        : /حار|\bhot\b/.test(q) ? 'hot' : last?.servingStyle ?? (sourceStyle === 'iced' ? 'iced' : sourceStyle === 'hot' ? 'hot' : undefined);
    // The default is scoped to explicitly hot or iced V60. Never apply it to espresso,
    // cold brew or source recipes whose ice quantities are not published.
    const icedV60 = servingStyle === 'iced' && brewMethod === 'v60' && !recipe;
    const hotV60 = servingStyle === 'hot' && brewMethod === 'v60' && !recipe;
    const sourceIcedV60 = servingStyle === 'iced' && brewMethod === 'v60' && recipe?.methods.includes('v60') && knownIceSplit;
    const ratio = ratioMatch ? Number(ratioMatch[1]) : last?.ratio ?? baseRatio ?? (icedV60 || hotV60 ? 15 : null);
    const calculation = { dose, ratio, method: brewMethod, ...(servingStyle ? { servingStyle } : {}) };
    if (!brewMethod && (quantityQuestion || doseServingRequest || (previous?.intent === 'calculate' && ratio === null))) return reply([
      dose !== null ? `${L('البن', 'Coffee')}: ${number(dose)} g` : L('كم غرام بن تستخدم؟', 'How many grams of coffee are you using?'),
      servingStyle ? `${L('التقديم', 'Serving')}: ${servingStyle === 'iced' ? L('بارد', 'Cold') : L('حار', 'Hot')}` : L('هل تريده حارًا أم بالثلج؟', 'Would you like it hot or iced?'),
      L('ما طريقة التحضير؟ مثل V60 أو إسبريسو.', 'Which brewing method are you using? For example, V60 or espresso.'),
    ].join('\n'), { intent: 'calculate', calculation, suggestions: ['V60', L('إسبريسو', 'Espresso')] });
    if (brewMethod === 'v60' && !servingStyle && ratio === null && !recipe) return reply([
      dose !== null ? `${L('البن', 'Coffee')}: ${number(dose)} g` : L('كم غرام بن تستخدم؟', 'How many grams of coffee are you using?'),
      L('هل تريده حارًا أم بالثلج؟', 'Would you like it hot or iced?'),
    ].join('\n'), { intent: 'calculate', calculation, suggestions: [L('V60 بالثلج', 'Iced V60'), L('V60 حار', 'Hot V60')] });
    if (servingStyle === 'iced' && !icedV60 && !sourceIcedV60) return reply(L('اذكر طريقة التحضير ووصفة تحدد كمية الثلج؛ لا أطبّق تقسيم V60 على طريقة أخرى أو أفترض كمية ثلج لوصفة منشورة.', 'Specify the brewer and a recipe with an ice amount; the V60 split does not apply to other methods or to published recipes with unspecified ice.'), { intent: 'calculate', calculation });
    if (icedV60 && dose === null) return reply(L('كم غرام بن تستخدم للـV60؟ أحسب لك الماء الساخن والثلج حسب وزن البن.', 'How many grams of coffee are you using for V60? I can calculate hot water and ice from the coffee dose.'), { intent: 'calculate', calculation });
    if (dose === null || ratio === null) return reply(L('حدد وزن البن والنسبة، مثل: احسب 18 غرام بنسبة 1:16. للإسبريسو اذكر أنه إسبريسو لحساب وزن المشروب.', 'Give the coffee dose and ratio, for example: calculate 18 g at 1:16. Say espresso when you mean beverage yield.'), { intent: 'calculate', calculation });
    if (dose <= 0 || dose > 1000 || ratio <= 0 || ratio > 100) return reply(L('استخدم جرعة بين 0 و1000 غرام ونسبة بين 0 و100، وكلاهما أكبر من صفر.', 'Use a dose up to 1000 g and a ratio up to 100, both greater than zero.'), { intent: 'calculate', calculation });
    if (brewMethod === 'moka_pot') return reply(L('الموكا بوت تعتمد على سعة السلة والخزان. لا أغيّر تعبئتها بحساب النسبة؛ اتبع دليل مقاس إبريقك.', 'Moka pot filling depends on its basket and boiler size. Follow the guide for your pot instead of scaling its fill by ratio.'), { intent: 'calculate', calculation });
    if (brewMethod === 'xbloom' && (dose < 5 || dose > 18)) return reply(L('هذه الجرعة خارج نطاق 5–18 g الذي يدعمه مسار xBloom في التطبيق. اختر جرعة ضمنه.', 'This dose is outside the app’s supported xBloom range of 5–18 g. Choose a dose in that range.'), { intent: 'calculate', calculation });
    if (sourceIcedV60) {
      const total = Math.round(dose * ratio * 100) / 100;
      const water = Math.round(total * (f.water as number) / ((f.water as number) + (sourceIce as number)) * 100) / 100;
      const ice = Math.round((total - water) * 100) / 100;
      return reply([
        ...(previous?.recipeAlternative ? [recipeAlternativeNotice(previous.query, L)] : []),
        L('مقادير معدّلة من الوصفة المختارة', 'Adjusted quantities from the selected recipe'),
        [`${L('البن', 'Coffee')}: ${number(dose)} g`, `${L('الماء الساخن', 'Hot water')}: ${number(water)} g`, `${L('الثلج', 'Ice')}: ${number(ice)} g`, `${L('إجمالي الماء والثلج', 'Total water and ice')}: ${number(total)} g`].join('\n'),
        ...(dose > 40 ? [L('هذه مقادير إجمالية لكمية كبيرة. قسّمها إلى دفعات تناسب سعة القمع والإبريق؛ لا تحضّرها كلها في دفعة واحدة.', 'These are totals for a large batch. Divide it into batches that fit your dripper and server; do not brew it all at once.')] : []),
        L('هذه مقادير محسوبة بتقسيم الماء والثلج في المصدر. راجع خطوات الوصفة الأصلية؛ تغيير الجرعة لا يعني تغيير التوقيت بنفس النسبة.', 'These quantities use the source’s water and ice split. Refer to the original recipe steps; changing the dose does not scale the timing by the same factor.'),
      ].join('\n\n'), { intent: 'calculate', calculation, matches: selected, recipeAlternative: previous?.recipeAlternative,
        query: previous?.recipeAlternative ? previous.query : query,
        sources: recipe?.source_url ? [{title: title(recipe, ar), url: recipe.source_url}] : [],
      });
    }
    if (icedV60 || hotV60) {
      // Adapt Bean Rock's published pour proportions, explicitly labelled as a
      // starting point. Round cumulative targets so every added pour sums exactly.
      const total = Math.round(dose * ratio * 100) / 100;
      const water = Math.round(total * (icedV60 ? .6 : 1) * 100) / 100;
      const ice = Math.round((total - water) * 100) / 100;
      const fractions = icedV60 ? [5 / 18, 2 / 3, 1] : [1 / 6, .4, .6, .8, 1];
      let poured = 0;
      const pours = fractions.map((fraction, i) => {
        const target = Math.round(water * fraction * 100) / 100;
        const added = Math.round((target - poured) * 100) / 100; poured = target;
        const seconds = i * 45;
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} — ${number(added)} g`;
      });
      const amounts = [
        `${L('البن', 'Coffee')}: ${number(dose)} g`,
        `${L('الماء الساخن', 'Hot water')}: ${number(water)} g`,
        ...(icedV60 ? [`${L('الثلج', 'Ice')}: ${number(ice)} g`, `${L('إجمالي الماء والثلج', 'Total water and ice')}: ${number(total)} g`] : []),
        `${L('النسبة', 'Ratio')}: 1:${number(ratio)}`,
      ];
      const preparation = [
        L('طريقة التحضير', 'How to brew'),
        '1. ' + L('اشطف الفلتر بماء ساخن، ثم تخلّص من ماء الشطف.', 'Rinse the filter with hot water, then discard the rinse water.'),
        '2. ' + (icedV60
          ? L('ضع الثلج في الإبريق والبن في الفلتر، ثم صفّر الميزان قبل الصب.', 'Put the ice in the server and the coffee in the filter, then tare the scale before pouring.')
          : L('ضع البن في الفلتر وسوِّ سطحه، ثم صفّر الميزان قبل الصب.', 'Add the coffee to the filter, level the bed, then tare the scale before pouring.')),
        '3. ' + L('صب بحركة دائرية هادئة. الأرقام التالية كمية كل صبّة، وليست قراءة الميزان التراكمية.', 'Pour in gentle circles. The amounts below are added per pour, not cumulative scale readings.'),
      ];
      const note = L('هذه نقطة بداية محسوبة من دليل التحضير؛ التوقيت إرشادي ويتغيّر مع البن والطحن. ماء شطف الفلتر منفصل، ووزن المشروب النهائي أقل من إجمالي الماء بسبب احتفاظ البن بالماء.', 'This is a calculated starting point adapted from the brew guide. Timing is approximate and depends on the coffee and grind. Rinse water is separate; beverage yield is lower than total water because the grounds retain water.');
      const largeBatch = L('هذه مقادير إجمالية لكمية كبيرة. قسّمها إلى دفعات تناسب سعة القمع والإبريق؛ لا تحضّرها كلها في دفعة واحدة.', 'These are totals for a large batch. Divide it into batches that fit your dripper and server; do not brew it all at once.');
      return reply([
        icedV60 ? L('مقادير V60 بالثلج', 'Iced V60 quantities') : L('مقادير V60 الحار', 'Hot V60 quantities'),
        amounts.join('\n'),
        dose > 40 ? largeBatch : preparation.join('\n'),
        ...(dose > 40 ? [] : [
          [L('الصبّات المقترحة', 'Suggested pours'), ...pours].join('\n'),
          icedV60 ? L('ابدأ بطحن متوسط وماء بعد الغليان مباشرة. بعد التقطير، حرّك المشروب مع الثلج.', 'Start with a medium grind and water just off the boil. After drawdown, stir the drink with the ice.')
            : L('ابدأ بطحن خشن لهذه الطريقة، واضبط حرارة الماء حسب التحميص.', 'Start with a coarse grind for this method, and adjust water temperature to the roast.'),
        ]),
        note,
      ].join('\n\n'), { intent: 'calculate', calculation, sources: [{ title: icedV60 ? 'Bean Rock Coffee — Iced V60' : 'Bean Rock Coffee — V60 4:6', url: icedV60 ? 'https://beanrockcoffee.com/coffee-recipes/v60-iced-coffee-japanese-style/' : 'https://beanrockcoffee.com/coffee-recipes/v60-4-6-method-advanced/' }], suggestions: [L('خلها 20 غرام', 'Make it 20 g'), icedV60 ? L('V60 حار', 'Hot V60') : L('V60 بالثلج', 'Iced V60')] });
    }
    const outputLabel = brewMethod === 'espresso' ? (L('ناتج الإسبريسو المستهدف', 'Target espresso beverage yield')) : (L('ماء التحضير', 'Brew water'));
    return reply(`${L('حساب النسبة المطلوبة', 'Requested ratio calculation')}: ${number(dose)} g × ${number(ratio)} = ${number(dose * ratio)} g\n${outputLabel}: ${number(dose * ratio)} g\n${L('هذا حساب رياضي، وليس وصفة مختبرة. لا يحدد درجة الطحن أو الحرارة أو الوقت؛ تحقق من سعة أداتك.', 'This is arithmetic, not a tested recipe. It does not set grind, temperature or time; check your brewer capacity.')}`, { intent: 'calculate', calculation, matches: selected, suggestions: [L('خلها 20 غرام', 'Make it 20 g'), L('غير النسبة إلى 1:15', 'Change ratio to 1:15')] });
  }
  const lessonRequest = /^(?:اشرح|وضح|ليش|لماذا|ما هو|ما هي|explain|what|why|how)(?:\s|$)/.test(q) || coffeeLearningTopics(locale).some(topic => norm(topic.title) === q.replace(/[؟?!.,،]/g,'').trim());
  const knowledge = !shopping && (!hasRecipeIntent(q) || lessonRequest) && !selection.explicit && !(compare && references.length) ? coffeeKnowledgeAnswer(question, locale, previous?.knowledgeTopic, L) : null;
  if (!shopping && ((compare && (references.length > 0 || !knowledge)) || selection.explicit || (explain && references.length && !knowledge))) {
    const chosen = selection.explicit ? selection.matches : compare ? references.slice(0, 3) : references.length === 1 ? references : [];
    if (selection.invalid || !chosen.length || (compare && chosen.length < 2)) return reply(L('ابحث عن الخيارات أولًا، ثم قل «اشرح الأول» أو «قارن الأول والثاني». اختر رقمًا من النتائج الظاهرة.', 'Search for options first, then say “explain the first” or “compare the first and second”. Use a displayed result number.'), { matches: references, query: previous?.query ?? query });
    // Revalidate dated offers locally before displaying references; never keep a stale price alive.
    const matches = chosen.map(m => ({ ...m, price: rankAssistantDocuments([m.document], { ...query, kind: m.document.kind, category: null, methods: [], terms: [], amount: null, currency: m.price?.currency ?? null, region: null, availableOnly: false, clarification: null }, [], dependencies.now)[0]?.price ?? null }));
    return reply((previous?.recipeAlternative ? recipeAlternativeNotice(previous.query, L) + '\n\n' : '') + (compare ? (L('أقارن المواصفات المنشورة فقط؛ غير المذكور يبقى غير معروف.\n\n', 'Comparing published specifications; missing details remain unknown.\n\n')) : '') + referenceText(matches, ar, compare, L, dependencies.translateValue, previous?.recipeAlternative), { intent: compare ? 'compare' : 'explain', matches, query: previous?.query ?? query, recipeAlternative: previous?.recipeAlternative, suggestions: compare ? ([L('أبي أرخص خيار', 'Show a cheaper option'), L('اشرح الأول', 'Explain the first')]) : [] });
  }

  const negated = q.replace(/(?:مو|مش|ليس|بدون|not|isnt|isn't)\s+(?:حامض|حامضه|مر|مره|sour|bitter)/g, '');
  const sour = /حامض|حموضه (?:قويه|زايده)|\bsour\b/.test(negated);
  const bitter = /مراره|جفاف|\bbitter\b|\bdry\b/.test(negated) || has(negated, 'مر') || has(negated, 'مره');
  const weak = /خفيفه|مائي|ضعيف|\bweak\b|\bwatery\b/.test(negated);
  const measurements = {
    dose: coachingMass(q, 'الجرعه|جرعه|جرعتي|dose'),
    output: coachingMass(q, 'ناتج|الناتج|ماء|الماء|yield|output|water') ?? coachingMass(q, 'خرج|طلع|طلعت|نزل', true),
    seconds: q.match(/(?:^|[^\d.])(-?\d+(?:\.\d+)?)\s*(?:ثانيه|ثواني|seconds?|sec|s)(?![\p{L}\p{N}])/u)?.[1],
  };
  const measurementFollowUp = previous?.intent === 'coach' && Object.values(measurements).some(Boolean);
  // Espresso yield and filter water are different measurements. Keep an
  // unanswered method clarification, but start fresh for a different brewer.
  const previousCoach = previous?.intent === 'coach' && (!methods.length || !previous.coach?.method || methods[0] === previous.coach.method) ? previous.coach : undefined;
  // Require a direct flow statement, not merely an equipment request that
  // mentions fast shipping or a fast machine. Both languages can omit “shot”.
  const directFlow = methods.includes('espresso') && /(?:\bespresso\b|اسبر(?:ي)?سو)\s+(?:(?:is|shot|extraction|flow|flows)\s+)*(?:(?:too|very)\s+)?(?:fast\b|slow\b|سريع|بطي)/.test(q);
  const coachIntent = !shopping && !/وصف|recipe|ايحاء|notes|احب|love/.test(q) && (sour || bitter || weak || directFlow || /استخلاص.*بطي|استخلاص.*سريع|shot.*(?:slow|fast)|chok/.test(q) || (previous?.intent === 'coach' && methods.length > 0 && !knowledge) || measurementFollowUp);
  if (coachIntent) {
    const signal = sour && bitter ? 'mixed' : sour ? 'sour' : bitter ? 'bitter' : weak ? 'weak' : /بطي|slow|chok/.test(q) ? 'slow' : /سريع|fast/.test(q) ? 'fast' : previousCoach?.signal ?? 'unknown';
    const coach = { ...previousCoach, signal, method, ...Object.fromEntries(Object.entries(measurements).filter(([, value]) => value && positive(Number(value))).map(([key, value]) => [key, Number(value)])) };
    const limits = { dose: 1000, output: 10000, seconds: 604800 };
    const invalid = (Object.keys(measurements) as (keyof typeof measurements)[]).filter(key => measurements[key] !== undefined && (!positive(Number(measurements[key])) || Number(measurements[key]) > limits[key]));
    if (invalid.length) {
      for (const key of invalid) delete coach[key];
      return reply(L('اكتب الجرعة والناتج أو ماء التحضير بالغرام، والوقت بالثواني. القيم يجب أن تكون أكبر من صفر وضمن حدود التحضير؛ لا أحوّل الملليلتر أو الضغط إلى وزن، ولا أستخدم القياس القديم بدل قيمة غير صالحة.', 'Use grams for dose and yield or brew water, and seconds for time. Values must be positive and within brewing limits; I do not convert milliliters or pressure to mass, or reuse an old measurement in place of an invalid value.'), { intent: 'coach', coach });
    }
    if (!method) return reply(L('حتى أحدد الخطوة المناسبة: تستخدم إسبريسو أم V60 أم طريقة ثانية؟', 'Which method are you using: espresso, V60 or another brewer?'), { intent: 'coach', coach, suggestions: ['Espresso', 'V60'] });
    if (signal === 'unknown') return reply(L('بدأنا لطريقة جديدة. اذكر مشكلة هذا الكوب وطريقة التحضير وجرعة البن والماء أو الناتج والوقت؛ لا أنقل قياسات الكوب السابق.', 'We are starting a new brewing method. Describe this cup’s problem, dose, water or yield, and time; the previous cup’s measurements do not carry over.'), { intent: 'coach', coach });
    let advice: string;
    if (signal === 'mixed') advice = L('اجتماع الحموضة والمرارة قد يدل على استخلاص غير متجانس. راجع توزيع البن وانتظام مرور الماء قبل تغيير الطحن.', 'Sourness together with bitterness can indicate uneven extraction. Check grounds distribution and even water flow before changing grind.');
    else if (signal === 'weak') advice = L('الخفة وحدها لا تحدد اتجاه الطحن. اذكر جرعة البن ووزن الماء أو ناتج الإسبريسو لنراجع النسبة.', 'Weakness alone does not tell us which way to move the grind. Give the dose and water weight or espresso yield so we can review the ratio.');
    else if (method === 'espresso') {
      const flow = signal === 'fast' ? (L('إذا كان الشوت أسرع من وصفتك المعتادة، جرّب طحنًا أنعم قليلًا بعد مراجعة تجانس التوزيع.', 'If the shot is faster than your usual recipe, try a slightly finer grind after checking even distribution.')) : signal === 'slow' ? (L('إذا كان الشوت أبطأ من وصفتك المعتادة، جرّب طحنًا أخشن قليلًا وراجع نظافة السلة وتجانس التوزيع.', 'If the shot is slower than your usual recipe, try a slightly coarser grind and check basket cleanliness and even distribution.')) : '';
      advice = flow + (flow ? '\n' : '') + (L('ثبّت الجرعة والناتج وطريقة حساب الوقت، ثم عدّل عاملًا واحدًا وقارن الطعم. لا أقدر أحدد رقم طاحونة من الطعم وحده؛ لا توجد مدة واحدة مناسبة لكل البن والأجهزة.', 'Keep dose, yield and the timing convention fixed, then change one variable and compare taste. Taste alone cannot determine a grinder setting; no single duration suits every coffee and machine.'));
    }
    else advice = signal === 'sour' || signal === 'fast' ? (L('جرّب طحنًا أنعم قليلًا مع تثبيت بقية الوصفة، ثم قارن الطعم. الحموضة وحدها لا تثبت نقص الاستخلاص.', 'Try a slightly finer grind while keeping the rest of the recipe fixed, then compare taste. Sourness alone does not prove under-extraction.')) : (L('جرّب طحنًا أخشن قليلًا مع تثبيت بقية الوصفة، ثم قارن الطعم. تأكد أيضًا من نظافة الفلتر وانتظام الصب.', 'Try a slightly coarser grind while keeping the rest of the recipe fixed, then compare taste. Also check the filter and even pouring.'));
    if (positive(coach.dose) && positive(coach.output)) advice = `${L('حسب الأوزان التي ذكرتها، النسبة', 'From the weights you provided, the ratio is')} 1:${number(coach.output / coach.dose)}${positive(coach.seconds) ? ` · ${number(coach.seconds)} s` : ''}.\n${advice}`;
    return reply(advice, { intent: 'coach', coach, followUp: L('اكتب الأوزان بهذا الشكل: جرعة 18، الناتج 36، الوقت 30 ثانية؛ هذه أمثلة لطريقة الإدخال وليست وصفة.', 'Label measurements, for example: dose 18, yield 36, 30 seconds. These are input examples, not a recipe.'), sources: [{ title: 'Barista Hustle — ' + (method === 'espresso' ? 'Espresso Compass' : 'Coffee Compass'), url: method === 'espresso' ? 'https://www.baristahustle.com/the-espresso-compass/' : 'https://www.baristahustle.com/coffee-compass/' }, ...(method === 'espresso' && ['fast', 'slow'].includes(signal) ? [{ title: 'Flair — Dialing in espresso', url: 'https://flairespresso.com/blogs/news/dialing-in-flair-58-plus-manual-espresso-maker' }] : [])] });
  }
  // Symptoms and labeled follow-up measurements take precedence over broad
  // lesson keywords such as "water" and "grind". Catalog references stay first.
  if (knowledge) return reply(knowledge.answer, { intent: 'knowledge', knowledgeTopic: knowledge.topic, sources: knowledge.sources, suggestions: knowledge.suggestions });
  if (methods.length && /شلون|كيف|طريقه|دليل|how|guide|use/.test(q)) {
    const guide = dependencies.guides?.[methods[0]];
    if (guide) return reply([L(guide.title_ar, guide.title), L(guide.intro_ar, guide.intro), ...guide.tips.map((t, i) => '• ' + L(guide.tips_ar[i] ?? t, t))].join('\n'), { intent: 'guide', sources: [{ title: guide.source_name, url: guide.source }], suggestions: [L(`أبي وصفة ${methods[0]}`, `Find a ${methods[0]} recipe`)] });
  }
  if (/^(?:هلا|مرحبا|السلام عليكم|hello|hi|شكرا|مشكور|thanks|thank you)[! .؟?]*$/.test(q) || /شنو تقدر|شقاعد تسوي|what can you|help|مساعده/.test(q)) return reply(L('أنا خبير القهوة. أشرح البن والماء والطحن والمكاين والأدوات والتحميص والتذوق، وأحسب النسب وأقارن مواصفات الكتالوغ. اكتب سؤالك أو الموضوع الذي تريد تعلّمه.', 'I am your coffee expert. I explain beans, water, grinding, machines, tools, roasting and tasting, calculate ratios and compare catalog specifications. Ask your question or name a topic you want to learn.'), { suggestions: [L('علمني القهوة من الألف إلى الياء', 'Teach me coffee from A to Z'), L('احسب 18 غرام بنسبة 1:16', 'Calculate 18 g at 1:16'), L('قهوتي V60 حامضة', 'My V60 tastes sour')] });
  if (query.clarification) return reply(assistantReply(query, [], locale, L, dependencies.translateValue), { intent: 'search', suggestions: query.clarification === 'currency' ? ['USD', 'KWD', 'SAR'] : [] });
  const searched = await dependencies.search(query);
  const now = dependencies.now ?? Date.now();
  const operation = query.terms.find(t => ['manual', 'electric', 'automatic'].includes(t));
  const documents = operation ? searched.documents.filter(d => {
    const published = norm(textValue(d.facts?.operation, false) + ' ' + textValue(d.facts?.operation, true));
    return (gearAliases.find(g => g[0] === operation) ?? [operation]).some(alias => has(published, alias));
  }) : searched.documents;
  const selectedEquipment = shopping && selection.explicit ? new Set(selection.matches.filter(match => match.document.kind === 'equipment').map(match => match.document.id)) : null;
  const matches = rankAssistantDocuments(selectedEquipment ? documents.filter(document => selectedEquipment.has(document.id)) : documents, query, searched.rates, now);
  if (!matches.length && query.kind === 'recipe' && query.terms.length && query.methods.length === 1 && query.servingStyle) {
    // One bounded retry drops only coffee/note terms. Brewer and hot/cold are
    // still enforced on the server and rechecked locally before any suggestion.
    const alternativeQuery = { ...query, terms: [], noteTerms: [] };
    const alternativeSearch = await dependencies.search(alternativeQuery);
    const alternatives = alternativeSearch.documents.slice(0, 200)
      .flatMap(document => rankAssistantDocuments([document], alternativeQuery, alternativeSearch.rates, now))
      .filter(match => recipeInstructionScore(match.document) >= 0)
      .sort((a, b) => recipeInstructionScore(b.document) - recipeInstructionScore(a.document));
    if (alternatives.length) {
      // Keep the original request for follow-ups and never label broadened
      // results as matching the requested coffee, origin or tasting notes.
      const alternative = { ...alternatives[0], allTerms: false, matchedTerms: [], confirmedNotes: [] };
      return reply(recipeAlternativeNotice(query, L) + '\n\n' + referenceText([alternative], ar, false, L, dependencies.translateValue, true), {
        intent: 'search', recipeAlternative: true, matches: [alternative],
        suggestions: [L('اشرح الأول', 'Explain the first'), L(`وصفات ${query.methods[0]} بدون إيحاءات`, `${query.methods[0]} recipes without tasting notes`)],
      });
    }
  }
  const answer = assistantReply(query, matches, locale, L, dependencies.translateValue) + (query.kind === 'recipe' && matches.length ? '\n\n' + referenceText(matches.slice(0, 1), ar, false, L, dependencies.translateValue) : '');
  return reply(answer, { intent: 'search', matches, sources: [], suggestions: matches.length >= 2 ? ([L('قارن الأول والثاني', 'Compare the first and second'), L('اشرح الأول', 'Explain the first')]) : matches.length ? ([L('اشرح الأول', 'Explain the first')]) : query.kind === 'recipe' && query.terms.length && query.methods.length ? ([L(`وصفات ${query.methods[0]} بدون إيحاءات`, `${query.methods[0]} recipes without tasting notes`)]) : query.amount !== null ? ([L('ابحث بدون ميزانية', 'Search without budget')]) : [] });
}

export function localAssistantSources(turn: LocalAssistantTurn) {
  return (turn.sources ?? []).filter(source => assistantSafeUrl(source.url));
}
