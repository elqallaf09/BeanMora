import { normalizeSearch } from './deepSearch';
import type { AssistantQuery } from './coffee-assistant';

export const ESPRESSO_CONTROLS_TOPIC = 'espresso-control-selection';
// Requirements are not product names. Keep named models and other constraints
// in the catalog path instead of silently substituting unrelated machines.
const requirementWords = new Set(normalizeSearch('اقدر اقدرها اتحكم نتحكم تتحكم تحكم التحكم ضبط اضبط تعديل اعدل حراره الحراره بالحراره ضغط الضغط بالضغط والضغط تدفق التدفق بالتدفق والتدفق درجه درجات حرارة حراره بضغط قابل قابله للتحكم للتحكم بالحراره temperature temperatures pressure flow control controls controlling adjustable adjust adjustment regulate regulation profiling programmable pid ability able lets let allows allow that can where both and heat thermal with').split(' '));
export function isEspressoControlRequest(question: string, query: AssistantQuery): boolean {
  const q = normalizeSearch(question);
  return query.kind === 'equipment' && query.category === 'espresso_machine'
    && /حرار|temperature|\bpid\b|\bheat\b/.test(q)
    && /ضغط|تدفق|\bpressure\b|\bflow\b/.test(q)
    && /تحكم|اضبط|ضبط|اعدل|تعديل|control|adjust|profil|regulat/.test(q)
    && !/بدون|مو ابي|لا اريد|لا احتاج|\b(?:without|not|no)\b/.test(q)
    && query.terms.every(term => requirementWords.has(term) || requirementWords.has(term.replace(/^و/, '')));
}

export function isEspressoControlFollowUp(question: string, previousTopic?: string): boolean {
  if (previousTopic !== ESPRESSO_CONTROLS_TOPIC) return false;
  const q = normalizeSearch(question).replace(/[؟?!.,،]/g, '').trim();
  if (/^(?:اشرح اكثر|وضح اكثر|اكمل|كمل|tell me more|explain more|continue)$/.test(q)) return true;
  // Only a standalone budget response retains this topic. A new named product,
  // recipe, symptom or feature request must use its own route.
  return /^(?:(?:ميزانيتي|ميزانيه|الميزانيه|بحدود|حدود|تحت|budget|under|my budget is)\s+)?[\d٠-٩۰-۹]+(?:\s*(?:-|–|الى|إلى|to)\s*[\d٠-٩۰-۹]+)?(?:\s*(?:دولار|دينار|ريال|usd|kwd|sar)(?:\s+(?:امريكي|كويتي|سعودي))?)?$/.test(q)
    || /^(?:usd|kwd|sar|دولار|دينار|ريال)$/.test(q);
}

export function espressoControlAdvice(L: (ar: string, en: string) => string, hasBudget: boolean, more = false) {
  const summary = L('تحتاج ماكينة تضبط حرارة التحضير، مع تحديد نوع التحكم الذي تريده أثناء الاستخلاص.', 'You need adjustable brew temperature and a clear choice of control during extraction.');
  const distinctions = L('1. الحرارة: ابحث عن ضبط حرارة التحضير؛ وجود PID وحده لا يعني برمجة الضغط.\n2. الضغط: تغيير الضغط خلال الشوت يختلف عن ضبط ضغط المضخة مرة واحدة، ووجود عداد لا يعني إمكانية التحكم.\n3. التدفق: يغيّر كمية الماء المارة إلى البن؛ يتأثر الضغط أيضًا بمقاومة البن، لذلك التحكم بالتدفق ليس ضبطًا مباشرًا للضغط.', '1. Temperature: look for adjustable brew temperature; PID alone does not provide pressure profiling.\n2. Pressure: changing pressure during a shot differs from setting pump pressure once. A gauge alone does not provide control.\n3. Flow: changes water delivery to the coffee. Pressure also depends on puck resistance, so flow control is not direct pressure control.');
  const examples = L('أمثلة للمقارنة بالمواصفات\n• Profitec DRIVE: ضبط حرارة الغلايتين عبر PID وتحكم يدوي بالتدفق أثناء الشوت؛ لا أصفه كبرمجة مباشرة لمنحنى الضغط.\n• Decent DE1: يتيح إعداد مراحل للتحكم بالضغط أو التدفق وحرارة التحضير عبر التطبيق.', 'Examples to compare by specification\n• Profitec DRIVE: PID temperature settings for both boilers and manual flow control during extraction; this is not direct programmable pressure profiling.\n• Decent DE1: supports stages controlling pressure or flow and brew temperature through its app.');
  const availability = L('هذه أمثلة للمواصفات، وليست عروضًا مؤكدة ضمن ميزانيتك أو متوفرة في بلدك. السعر والتوفر يحتاجان تحققًا من البائع.', 'These are specification examples, not confirmed offers within your budget or available in your country. Check price and stock with the seller.');
  const practical = L('إذا تريد تحكمًا يدويًا أثناء الشوت، قارن أجهزة التحكم بالتدفق. وإذا تريد حفظ منحنى يتكرر تلقائيًا، قارن أجهزة برمجة الضغط والتدفق. راجع دليل الموديل نفسه؛ لا أفترض أن إضافة قطعة تحكم تناسب كل ماكينة.', 'For hands-on adjustment during a shot, compare machines with flow control. To save a profile that repeats automatically, compare pressure and flow profiling machines. Check the exact model manual; a control accessory does not fit every machine.');
  return {
    answer: (more ? [distinctions, practical] : [summary, distinctions, examples, availability]).join('\n\n'),
    followUp: hasBudget
      ? L('للمقارنة قبل الشراء: تأكد من نوع التحكم المطلوب ومن سعر الموديل لدى البائع.', 'Before buying, compare the required control type and confirm the model price with the seller.')
      : L('كم ميزانيتك وبأي عملة؟', 'What is your budget and currency?'),
    sources: [
      // Manufacturer specifications checked 2026-10-16. No prices or stock claims.
      { title: 'Profitec — DRIVE', url: 'https://www.profitec-espresso.com/en/products/drive' },
      { title: 'Decent — Profiling', url: 'https://en.decentespresso.com/profiling' },
    ],
    suggestions: [L('اشرح أكثر', 'Tell me more')],
  };
}
