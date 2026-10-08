import { deepSearchText, normalizeSearch } from './search/deepSearch.ts';

export type AssistantKind = 'equipment' | 'recipe' | 'coffee' | 'roaster';
export type AssistantCurrency = 'USD' | 'KWD' | 'SAR';
export interface AssistantQuery {
  kind: AssistantKind | null; category: string | null; methods: string[];
  terms: string[]; amount: number | null; currency: AssistantCurrency | null;
  clarification: 'currency' | 'budget' | 'intent' | null;
  region?: 'KW' | 'SA' | 'US' | null; availableOnly?: boolean;
}
export interface CatalogOffer {
  amount: number; currency: AssistantCurrency; url: string; checked_at: string;
  region: string; availability?: 'in_stock' | 'out_of_stock' | 'unknown';
  seller?: string; variant?: string; shipping_note_ar?: string; shipping_note_en?: string; excluded_destinations?: string[];
}
export interface CatalogRate { currency: AssistantCurrency; kwd_per_unit: number; observed_at: string; source_url: string }
export interface AssistantDocument {
  id: string; kind: AssistantKind; slug: string | null;
  title_ar: string; title_en: string; summary_ar: string; summary_en: string;
  search_text: string; source_url: string | null; category: string | null;
  methods: string[]; facts: Record<string, unknown>; offers: CatalogOffer[];
  verified_at: string | null;
}
export interface AssistantMatch {
  document: AssistantDocument; matchedTerms: string[]; allTerms: boolean;
  price: { offer: CatalogOffer; converted: number; currency: AssistantCurrency; rateDates: string[]; rateSources: string[] } | null;
}
const notes = [
  ['strawberry','فراولة','فراوله'], ['cola','كولا'], ['blueberry','توت ازرق'],
  ['raspberry','توت العليق'], ['cherry','كرز'], ['chocolate','شوكولاتة','شوكولاته'],
  ['caramel','كراميل'], ['peach','خوخ'], ['mango','مانجو'], ['pineapple','اناناس'],
  ['orange','برتقال'], ['lemon','ليمون'], ['jasmine','ياسمين'], ['honey','عسل'],
  ['hazelnut','بندق'], ['almond','لوز'], ['floral','زهور'], ['fruity','فواكه'],
  ['citrus','حمضيات'], ['cinnamon','قرفة','قرفه'], ['vanilla','فانيلا'],
];
const places = [['kuwait','الكويت','كويت'],['saudi','السعودية','السعوديه'],['riyadh','الرياض','رياض'],['jeddah','جدة','جده'],['uae','الإمارات','الامارات'],['dubai','دبي'],['qatar','قطر'],['bahrain','البحرين'],['oman','عمان']];
const stop = new Set(normalizeSearch('ابي ابغى اريد عندي عندكم عنده عندها لي له لها فيه فيها عن من على الى في مع حق حقي هذا هذه شنو وش اي احسن افضل اقرب يناسب مناسبة مناسب نبي ابيها ممكن طلعلي يقوله يقولي سعر بسعر بسعره ميزانية ميزانيه بميزانية بميزانيه تحت لحد حدود ماكينة مكينة مكنة ممكينه ممكينة اله جهاز اجهزه معدات طاحونة طاحونه مطحنة مطحنه وصفة وصفه وصفات بن قهوة قهوه ايحاء ايحاءات ايحاءه طعم نكهة نكهه نكهات ابحث ابيهم ابيك اريدها دولار دولارات دينار كويتي ريال سعودي dollars dollar dinar riyal usd kwd sar machine espresso grinder recipe coffee roaster please find recommend want need for with under budget price best nearest closest have has tasting notes note flavor flavours flavor i a an the and or to me my of is it about tell show give up buy').split(' '));
const methods: [string, string[]][] = [
  ['xbloom',['xbloom','x bloom','اكسبلوم','اكس بلوم','بالاكسبلوم']],
  ['espresso',['espresso','اسبرسو','اسبريسو','اسبر يسو','بالاسبرسو']],
  ['v60',['v60','v 60','في60']], ['aeropress',['aeropress','ايروبريس']],
  ['chemex',['chemex','كيمكس']], ['french_press',['french press','فرنش برس']],
  ['cold_brew',['cold brew','كولد برو']], ['moka_pot',['moka','موكا بوت']],
];
// Match complete notes: cola is not a match for chocolate / شوكولاتة.
function matchesAlias(text:string,alias:string):boolean {
  const escaped=normalizeSearch(alias).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(?:^|[^\\p{L}\\p{N}])(?:و|ب|ال)?'+escaped+'(?=$|[^\\p{L}\\p{N}])','u').test(text);
}
export function assistantSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function parseAssistantQuery(message: string, previous?: AssistantQuery | null): AssistantQuery {
  const digits = message.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٫/g,'.').replace(/٬/g,',');
  const q = normalizeSearch(digits.slice(0,1000));
  const foundMethods = methods.filter(([,aliases])=>aliases.some(alias=>q.includes(normalizeSearch(alias)))).map(([id])=>id);
  const foundNotes = notes.filter(group=>group.some(alias=>matchesAlias(q,alias))).map(group=>group[0]);
  const recipe = /وصف|تحضير|استخلاص|recipe|brew|ايحاء|نكه|طعم/.test(q) || foundNotes.length > 0;
  const gear = /ماكين|مكين|ممكين|اله|معدات|طاحون|مطحن|machine|grinder|equipment|kettle|\bscale\b/.test(q) || matchesAlias(q,'ميزان');
  const kind: AssistantKind | null = gear ? 'equipment' : recipe ? 'recipe' : /محمص|محامص|roaster/.test(q) ? 'roaster' : /حبوب|\bbeans?\b/.test(q) ? 'coffee' : previous?.kind ?? null;
  const category = /طاحون|مطحن|grinder/.test(q) ? 'grinder' : /غلاي|kettle/.test(q) ? 'kettle' : matchesAlias(q,'ميزان') || /\bscale\b/.test(q) ? 'scale' : gear && foundMethods.includes('espresso') ? 'espresso_machine' : gear && foundMethods.includes('xbloom') ? 'xbloom' : gear ? null : kind === previous?.kind ? previous?.category ?? null : null;
  const currencies: AssistantCurrency[] = [];
  if (/(?:\b|\d)usd\b|\$|دولار/.test(q)) currencies.push('USD');
  if (/(?:\b|\d)kwd\b|دينار|د\.?\s?ك(?:\s|$)/.test(q)) currencies.push('KWD');
  if (/(?:\b|\d)sar\b|ريال|ر\.?\s?س(?:\s|$)/.test(q)) currencies.push('SAR');
  const currency = currencies.length === 1 ? currencies[0] : currencies.length > 1 ? null : kind === 'equipment' ? previous?.currency ?? null : null;
  const rawNumber = digits.match(/(?:^|\s)(-?\d+(?:[,.]\d+)*)(?=\s|$|\$|usd|kwd|sar)/i)?.[1];
  const budgetMentioned = !!rawNumber && (currencies.length > 0 || /سعر|ميزاني|تحت|لحد|حدود|budget|under|price/.test(q) || previous?.clarification === 'budget');
  const value = rawNumber ? Number(rawNumber.replace(/,(?=\d{3}(?:,|$))/g,'')) : null;
  const amount = budgetMentioned ? value : (gear && previous?.kind !== 'equipment') || (kind !== 'equipment') ? null : previous?.amount ?? null;
  const unknownTerms = q.split(/[^\p{L}\p{N}]+/u).map(word=>/^[وب]/.test(word)&&[...stop,...notes.flat(),...methods.flatMap(([,aliases])=>aliases)].some(alias=>normalizeSearch(alias)===word.slice(1))?word.slice(1):word).filter(word=>word.length > 2 && !stop.has(word) && !/^(\d|محامص|محمص|roasters?$|in$)/.test(word) && !methods.some(([,aliases])=>aliases.some(alias=>normalizeSearch(alias).includes(word))) && !notes.some(group=>group.some(alias=>normalizeSearch(alias).includes(word)))).map(word=>places.find(group=>group.some(alias=>normalizeSearch(alias)===word))?.[0]??word);
  const region = kind==='equipment' ? (/بالكويت|في الكويت|in kuwait/.test(q)?'KW':/بالسعوديه|في السعوديه|in saudi/.test(q)?'SA':previous?.region??null) : null;
  const availableOnly = kind==='equipment' && /متوفر|متاح|in stock|available/.test(q) && !/غير متوفر|نفاد|out of stock/.test(q) ? true : kind==='equipment' ? previous?.availableOnly??false : false;
  const terms = [...new Set(kind==='recipe'&&foundNotes.length?foundNotes:[...foundNotes, ...unknownTerms.filter(term=>!(kind==='equipment'&&(/^(متوفر|متاح)/.test(term)||['available','stock'].includes(term)))&&!(region&&['kuwait','saudi','بالكويت','بالسعوديه'].includes(term)))])].slice(0,8);
  return { kind, category, methods: foundMethods.length ? foundMethods : (gear || recipe) && kind !== previous?.kind ? [] : previous?.methods ?? [], terms: terms.length ? terms : !gear && !recipe ? previous?.terms ?? [] : [], amount, currency, region, availableOnly,
    clarification: amount !== null && (!Number.isFinite(amount) || amount <= 0) ? 'budget' : amount !== null && (!currency || currencies.length > 1) ? 'currency' : !kind ? 'intent' : null };
}
export function assistantSearchTerms(query: AssistantQuery): string[] {
  return [...new Set(query.terms.flatMap(term=>[...notes,...places].find(group=>group[0]===term) ?? [term]))].slice(0,24);
}
export function assistantTermLabel(term: string, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? ([...notes, ...places].find(group => group[0] === term)?.[1] ?? term) : term;
}
function recent(date: string, now: number, days: number): boolean {
  const time = Date.parse(date); return Number.isFinite(time) && time <= now + 60_000 && now-time <= days*86400000;
}
export function convertCatalogPrice(offer: CatalogOffer, target: AssistantCurrency, rates: CatalogRate[], now: number) {
  if (!Number.isFinite(offer.amount) || offer.amount <= 0 || !assistantSafeUrl(offer.url) || !recent(offer.checked_at,now,14)) return null;
  if (offer.currency === target) return { converted: offer.amount, rateDates: [] as string[], rateSources: [] as string[] };
  const from = rates.find(rate=>rate.currency===offer.currency), to = rates.find(rate=>rate.currency===target);
  if (!from || !to || ![from,to].every(rate=>Number.isFinite(rate.kwd_per_unit) && rate.kwd_per_unit>0 && recent(rate.observed_at,now,7) && assistantSafeUrl(rate.source_url))) return null;
  return { converted: offer.amount*from.kwd_per_unit/to.kwd_per_unit, rateDates:[from.observed_at,to.observed_at], rateSources:[from.source_url,to.source_url] };
}
export function rankAssistantDocuments(documents: AssistantDocument[], query: AssistantQuery, rates: CatalogRate[], now=Date.now()): AssistantMatch[] {
  if (query.clarification || !query.kind) return [];
  return documents.flatMap(document=>{
    if (query.kind==='equipment' && query.category==='grinder' && query.methods.length && !document.methods.some(method=>query.methods.includes(method))) return [];
    if (document.kind !== query.kind || (query.category && document.category !== query.category) || (query.methods.length && query.kind==='recipe' && !document.methods.some(method=>query.methods.includes(method)))) return [];
    const search = deepSearchText(document.search_text);
    const matchedTerms = query.terms.filter(term=>assistantSearchTerms({...query,terms:[term]}).some(alias=>matchesAlias(search,alias)));
    if (query.terms.length && !matchedTerms.length) return [];
    const prices = (Array.isArray(document.offers)?document.offers:[]).flatMap(offer=>{
      if (query.region && (offer.region !== query.region || offer.excluded_destinations?.includes(query.region))) return [];
      if (query.availableOnly && offer.availability !== 'in_stock') return [];
      const currency = query.currency ?? (rates.some(rate=>rate.currency==='KWD')?'KWD':offer.currency);
      const converted = convertCatalogPrice(offer,currency,rates,now);
      const price = converted ?? (!query.currency ? convertCatalogPrice(offer,offer.currency,rates,now) : null);
      const effectiveCurrency = converted ? currency : offer.currency;
      return price && (query.amount===null || price.converted<=query.amount) ? [{offer,currency:effectiveCurrency,...price}] : [];
    }).sort((a,b)=>Number(a.offer.availability==='out_of_stock')-Number(b.offer.availability==='out_of_stock') || (a.currency===b.currency?a.converted-b.converted:0));
    if ((query.amount!==null || query.region || query.availableOnly) && !prices.length) return [];
    return [{document,matchedTerms,allTerms:matchedTerms.length===query.terms.length,price:prices[0]??null}];
  }).sort((a,b)=>Number(b.allTerms)-Number(a.allTerms) || b.matchedTerms.length-a.matchedTerms.length || Number(a.price?.offer.availability==='out_of_stock')-Number(b.price?.offer.availability==='out_of_stock') || (a.price?.currency===b.price?.currency?(a.price?.converted??Infinity)-(b.price?.converted??Infinity):0) || a.document.id.localeCompare(b.document.id)).slice(0,6);
}
export function assistantReply(query: AssistantQuery, matches: AssistantMatch[], locale: 'ar'|'en'): string {
  const ar=locale==='ar';
  if(query.clarification==='currency')return ar?'حدد عملة الميزانية: دولار أمريكي USD، دينار كويتي KWD، أو ريال سعودي SAR.':'Which budget currency: US dollars (USD), Kuwaiti dinars (KWD), or Saudi riyals (SAR)?';
  if(query.clarification==='budget')return ar?'اكتب ميزانية أكبر من صفر مع العملة.':'Enter a budget greater than zero and its currency.';
  if(query.clarification==='intent')return ar?'اسألني عن معدات وميزانيتها، أو وصفة حسب إيحاءات البن وطريقة التحضير، أو محمصة.':'Ask about equipment and a budget, a recipe for your tasting notes and brew method, or a roaster.';
  if(!matches.length)return query.amount!==null?(ar?'لم أجد خيارًا بسعر موثّق ضمن هذه الميزانية. جرّب ميزانية أخرى أو ابحث دون سعر.':'I found no option with a documented price within this budget. Try another budget or search without a price.'):(ar?'لم أجد سجلًا منشورًا يطابق طلبك. جرّب اسم البن أو الجهاز أو المحمصة.':'I found no published record matching your request. Try a coffee, equipment or roaster name.');
  if(query.kind==='recipe'&&query.terms.length)return matches.some(match=>match.allTerms)?(ar?'هذه أقرب الوصفات حسب الإيحاءات المذكورة. تشابه الإيحاءات لا يعني أنها وصفة لنفس البن؛ افتح الوصفة لمراجعة المحصول والجهاز.':'These recipes match the requested notes. Matching notes does not mean the same coffee; open each recipe to review its coffee and equipment.'):(ar?'لم أجد وصفة تطابق كل الإيحاءات. هذه خيارات قريبة تطابق بعض الإيحاءات فقط.':'No recipe matched every requested note. These nearby options match only some notes.');
  return query.amount!==null?(ar?'هذه خيارات من دليلنا ضمن الميزانية بحسب أسعار مؤرخة. التحويل تقديري، والشحن والضرائب وتوفر المتجر تُراجع عند الشراء.':'These catalog options fit the budget using dated prices. Conversion is indicative; check shipping, taxes and seller availability before buying.'):(ar?'هذه السجلات الأقرب لطلبك من معلومات BeanMora المنشورة.':'These are the closest published BeanMora records for your request.');
}
