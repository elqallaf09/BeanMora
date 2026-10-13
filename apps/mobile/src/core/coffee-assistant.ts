import { flavorSearchVocabulary } from './flavor-vocabulary';
import { deepSearchText, normalizeSearch } from './deepSearch';

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
const notes = flavorSearchVocabulary;
// Reviewed catalog countries use both names and ISO codes. Expand codes for
// retrieval and ranking without rewriting roaster records or ownership.
const places = [['kuwait','الكويت','كويت','kw'],['saudi','السعودية','السعوديه','sa'],['riyadh','الرياض','رياض'],['jeddah','جدة','جده'],['uae','الإمارات','الامارات','ae'],['dubai','دبي'],['qatar','قطر','qa'],['bahrain','البحرين','bh'],['oman','عمان','om']];
// Published spaced brand and Arabic catalog label, reviewed 2026-10-11:
// https://www.ark.com.kw/pages/about . Keep matching at word boundaries.
const catalogNames = [['ark','آرك','a r k','ارك']];
const stop = new Set(normalizeSearch('ابي ابغى اريد عندي عندكم عنده عندها لي له لها فيه فيها عن من على الى في مع حق حقي هذا هذه شنو وش اي احسن افضل اقرب يناسب مناسبة مناسب نبي ابيها ممكن طلعلي طلع طلع لي رشح اقترح تنصحني يقوله يقولي سعر بسعر بسعره ميزانية ميزانيه بميزانية بميزانيه تحت لحد حدود ماكينة مكينة مكنة ممكينه ممكينة اله جهاز اجهزه معدات طاحونة طاحونه مطحنة مطحنه وصفة وصفه وصفات بن حبوب beans bean قهوة قهوه ايحاء ايحاءات ايحاءه طعم نكهة نكهه نكهات نكهته نكتة نكته ابحث ابيهم ابيك اريدها دولار دولارات دينار كويتي ريال سعودي dollars dollar dinar riyal usd kwd sar machine espresso grinder recipe coffee roaster please find recommend want need for with under budget price best nearest closest have has tasting tastes taste notes note flavor flavors flavour flavours i a an the and or to me my of is it about tell show give up buy').split(' '));
const methods: [string, string[]][] = [
  ['xbloom',['xbloom','x bloom','اكسبلوم','اكس بلوم','بالاكسبلوم']],
  ['espresso',['espresso','اسبرسو','اسبريسو','اسبر يسو','بالاسبرسو']],
  ['v60',['v60','v 60','في60']], ['aeropress',['aeropress','ايروبريس']],
  ['chemex',['chemex','كيمكس']], ['french_press',['french press','فرنش برس']],
  ['cold_brew',['cold brew','كولد برو']], ['moka_pot',['moka','موكا بوت']],
];
// Optional Arabic clitics apply to known words only, never arbitrary brand names.
function aliasPattern(alias: string): string {
  const escaped = normalizeSearch(alias).split(' ').map((word, index) => {
    const literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return index && /[\u0600-\u06ff]/.test(word) && !word.startsWith('ال') ? '(?:ال)?' + literal : literal;
  }).join(' ');
  const prefix = /[\u0600-\u06ff]/.test(alias) ? '(?:[وف]?ب?ال|[وفب])?' : '';
  return '(?:^|[^\\p{L}\\p{N}])' + prefix + escaped + '(?=$|[^\\p{L}\\p{N}])';
}
function matchesAlias(text: string, alias: string): boolean {
  return new RegExp(aliasPattern(alias), 'u').test(text);
}
// Consume longest phrases first: جوز الهند is coconut, not walnut + India;
// white chocolate and red wine remain specific notes, not two unrelated terms.
const noteAliases = notes.flatMap(group => group.map(alias => ({ term: group[0], alias })))
  .sort((a, b) => normalizeSearch(b.alias).length - normalizeSearch(a.alias).length);
function extractNotes(text: string) {
  let rest = text;
  const found = new Set<string>();
  for (const { term, alias } of noteAliases) {
    rest = rest.replace(new RegExp(aliasPattern(alias), 'gu'), () => { found.add(term); return ' '; });
  }
  return { terms: notes.filter(group => found.has(group[0])).map(group => group[0]), rest };
}
/** Catalog requests take priority over broad educational keyword matches. */
export function isCoffeeRecommendationRequest(message: string): boolean {
  const q = normalizeSearch(message);
  if (!['بن', 'حبوب', 'قهوه', 'coffee', 'bean', 'beans'].some(word => matchesAlias(q, word))) return false;
  const request = /(?:احسن|افضل)\s+(?:نوع\s+)?(?:بن|حبوب|قهوه)(?:\s|$)|\bbest\s+(?:coffee|beans?)\b/.test(q)
    || ['رشح', 'رشحلي', 'اقترح', 'تنصحني', 'عطني', 'عطيني', 'طلعلي', 'طلع لي', 'ابي', 'ابغي', 'ابغى', 'اريد', 'دورلي', 'نبي', 'want', 'recommend', 'find', 'give', 'looking for', 'buy'].some(word => matchesAlias(q, word));
  const questionAboutMeaning = /يعني|معني|اشرح|ليش|لماذا|\b(?:mean|meaning|explain|why)\b/.test(q);
  return !questionAboutMeaning && (request || (extractNotes(q).terms.length > 0 && /ايحاء|نكه|طعم|\b(?:notes?|flavou?rs?|taste)\b/.test(q)));
}
export function assistantSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function parseAssistantQuery(message: string, previous?: AssistantQuery | null): AssistantQuery {
  const digits = message.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٫/g,'.').replace(/٬/g,',');
  const q = normalizeSearch(digits.slice(0,1000));
  const foundMethods = methods.filter(([,aliases])=>aliases.some(alias=>q.includes(normalizeSearch(alias)))).map(([id])=>id);
  const extracted = extractNotes(q);
  const foundNotes = extracted.terms;
  const foundNames = catalogNames.filter(group=>group.some(alias=>matchesAlias(q,alias))).map(group=>group[0]);
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
  // A partial flavor word can be a real brand: ليمو must not disappear inside ليمون.
  const unknownTerms = extracted.rest.split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length > 2 && ![...stop].some(alias => matchesAlias(word, alias))
      && !/^(\d|محامص|محمص|roasters?$|in$)/.test(word)
      && !methods.some(([, aliases]) => aliases.some(alias => normalizeSearch(alias).split(' ').includes(word))))
    .map(word => places.find(group => group.some(alias => matchesAlias(word, alias)))?.[0] ?? word);
  const region = kind==='equipment' ? (/بالكويت|في الكويت|in kuwait/.test(q)?'KW':/بالسعوديه|في السعوديه|in saudi/.test(q)?'SA':previous?.region??null) : null;
  const availableOnly = kind==='equipment' && /متوفر|متاح|in stock|available/.test(q) && !/غير متوفر|نفاد|out of stock/.test(q) ? true : kind==='equipment' ? previous?.availableOnly??false : false;
  const terms = [...new Set([...foundNames, ...foundNotes, ...unknownTerms.filter(term=>!catalogNames.some(group=>group.some(alias=>normalizeSearch(alias)===term))&&!(kind==='equipment'&&(/^(متوفر|متاح)/.test(term)||['available','stock'].includes(term)))&&!(region&&['kuwait','saudi','بالكويت','بالسعوديه'].includes(term)))])].slice(0,8);
  return { kind, category, methods: foundMethods.length ? foundMethods : (gear || recipe) && kind !== previous?.kind ? [] : previous?.methods ?? [], terms: terms.length ? terms : !gear && !recipe ? previous?.terms ?? [] : [], amount, currency, region, availableOnly,
    clarification: amount !== null && (!Number.isFinite(amount) || amount <= 0) ? 'budget' : amount !== null && (!currency || currencies.length > 1) ? 'currency' : !kind ? 'intent' : null };
}
export function assistantSearchTerms(query: AssistantQuery): string[] {
  return [...new Set(query.terms.flatMap(term=>[...notes,...places,...catalogNames].find(group=>group[0]===term) ?? [term]))].slice(0,24);
}
export function assistantTermLabel(term: string, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? ([...notes, ...places, ...catalogNames].find(group => group[0] === term)?.[1] ?? term) : term;
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
  if(query.kind==='coffee') {
    const requested = query.terms.map(term=>assistantTermLabel(term,locale)).join(ar?'، ':', ');
    if(!matches.length)return ar?`لم أجد بنًا منشورًا يطابق${requested?' «'+requested+'»':' طلبك'} في مكتبتنا. جرّب إيحاءً آخر أو اسم البن أو المحمصة.`:`I found no published coffee matching ${requested||'your request'} in our catalog. Try another tasting note, coffee or roaster name.`;
    const best = matches[0], name = ar ? best.document.title_ar||best.document.title_en : best.document.title_en||best.document.title_ar;
    const matched = best.matchedTerms.map(term=>assistantTermLabel(term,locale)).join(ar?'، ':', ');
    return ar ? `${best.allTerms?'أقرب ترشيح لطلبك':'لم أجد بنًا يطابق كل طلبك؛ أقرب خيار جزئي'}: ${name}.${matched?'\nيطابق: '+matched+'، بحسب البيانات المنشورة.':''}\nراجع وصف المحمصة لمعرفة المعالجة والإيحاءات قبل الاختيار.` : `${best.allTerms?'My closest catalog recommendation':'No coffee matched everything; the closest partial match is'}: ${name}.${matched?'\nMatches: '+matched+', according to the published information.':''}\nCheck the roaster’s description for processing and tasting notes before choosing.`;
  }
  if(!matches.length)return query.amount!==null?(ar?'لم أجد خيارًا بسعر موثّق ضمن هذه الميزانية. جرّب ميزانية أخرى أو ابحث دون سعر.':'I found no option with a documented price within this budget. Try another budget or search without a price.'):(ar?'لم أجد سجلًا منشورًا يطابق طلبك. جرّب اسم البن أو الجهاز أو المحمصة.':'I found no published record matching your request. Try a coffee, equipment or roaster name.');
  if(query.kind==='recipe'&&query.terms.length)return matches.some(match=>match.allTerms)?(ar?'هذه الوصفات تطابق شروط البحث في بياناتها المنشورة. افتح كل وصفة لمراجعة البن والمقادير والجهاز في مصدرها.':'These recipes match your search terms in their published data. Open each recipe to review its coffee, quantities and equipment in the source.'):(ar?'لم أجد وصفة تطابق كل شروط البحث. هذه خيارات قريبة تطابق بعض شروط البحث فقط.':'No recipe matched every search term. These nearby options match some search terms only.');
  return query.amount!==null?(ar?'هذه خيارات من دليلنا ضمن الميزانية بحسب أسعار مؤرخة. التحويل تقديري، والشحن والضرائب وتوفر المتجر تُراجع عند الشراء.':'These catalog options fit the budget using dated prices. Conversion is indicative; check shipping, taxes and seller availability before buying.'):(ar?'هذه السجلات الأقرب لطلبك من معلومات BeanMora المنشورة.':'These are the closest published BeanMora records for your request.');
}
