import { flavorSearchVocabulary } from './flavor-vocabulary';
import { deepSearchText, normalizeSearch } from './deepSearch';

export type AssistantKind = 'equipment' | 'recipe' | 'coffee' | 'roaster';
export type AssistantCurrency = 'USD' | 'KWD' | 'SAR';
export interface AssistantQuery {
  kind: AssistantKind | null; category: string | null; methods: string[];
  terms: string[]; amount: number | null; currency: AssistantCurrency | null;
  clarification: 'currency' | 'budget' | 'intent' | null;
  region?: 'KW' | 'SA' | 'US' | null; availableOnly?: boolean; purchaseIntent?: boolean;
  servingStyle?: 'hot' | 'cold' | null;
  noteTerms?: string[];
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
  purchaseLinks?: { url: string; seller: string; region: string }[];
  confirmedNotes?: string[];
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
/** A machine mentioned as the brewer is not a request to buy that machine. */
export function hasRecipeIntent(message: string): boolean {
  const q = normalizeSearch(message);
  return ['وصفة', 'وصفات', 'recipe', 'recipes'].some(alias => matchesAlias(q, alias));
}
const servingAliases = {
  cold: ['بارد', 'باردة', 'مثلج', 'مثلجة', 'ايس', 'ايسد', 'cold', 'iced', 'ice'],
  hot: ['حار', 'حارة', 'ساخن', 'ساخنة', 'hot'],
};
export function assistantRecipeServingStyle(document: AssistantDocument): 'hot' | 'cold' | 'iced' | null {
  const brew = document.facts?.source_brew as Record<string, unknown> | undefined;
  const discovery = brew?.discovery as Record<string, unknown> | undefined;
  const style = document.facts?.serving_style ?? discovery?.serving_style;
  return style === 'hot' || style === 'cold' || style === 'iced' ? style : null;
}
const equipmentPlurals = ['مكائن', 'مكاين', 'مكنة', 'طواحين', 'مطاحن', 'machines', 'grinders', 'kettles', 'scales'];
const shoppingWords = ['موقع', 'مواقع', 'متجر', 'متاجر', 'محل', 'محلات', 'بيع', 'لبيع', 'يبيع', 'تبيع', 'يبع', 'شراء', 'لشراء', 'اشتري', 'اشتريها', 'اشتريه', 'ينباع', 'رابط', 'روابط', 'online', 'website', 'websites', 'site', 'sites', 'shop', 'shops', 'store', 'stores', 'retailer', 'retailers', 'seller', 'sellers', 'buy', 'purchase', 'sell', 'sells', 'selling'];
export function isEquipmentShoppingRequest(message: string): boolean {
  const q = normalizeSearch(message);
  return shoppingWords.some(word => matchesAlias(q, word));
}
/** Explicit equipment and shopping requests must replace an older coffee topic. */
export function hasEquipmentIntent(message: string): boolean {
  const q = normalizeSearch(message);
  return /ماكين|مكين|ممكين|معدات|طاحون|مطحن|machine|grinder|equipment|غلاي|kettle|\bscale\b/.test(q)
    || equipmentPlurals.some(word => matchesAlias(q, word)) || ['آلة', 'جهاز', 'أجهزة', 'ميزان'].some(word => matchesAlias(q, word));
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
  const gear = hasEquipmentIntent(q);
  const kind: AssistantKind | null = hasRecipeIntent(q) ? 'recipe' : gear ? 'equipment' : recipe ? 'recipe' : /محمص|محامص|roaster/.test(q) ? 'roaster' : /حبوب|\bbeans?\b/.test(q) ? 'coffee' : previous?.kind ?? null;
  const purchaseFollowUp = /ميزاني|سعر|دولار|دينار|ريال|budget|price|under|\b(?:usd|kwd|sar)\b|متوفر|متاح|in stock|available|بالكويت|في الكويت|بالسعوديه|في السعوديه|in kuwait|in saudi/.test(q) || /^\d+(?:[.,]\d+)?$/.test(q);
  const purchaseIntent = kind === 'equipment' && (isEquipmentShoppingRequest(q) || (!gear && purchaseFollowUp && previous?.purchaseIntent === true));
  const category = kind !== 'equipment' ? null : /طاحون|مطحن|طواحين|مطاحن|grinder/.test(q) ? 'grinder' : /غلاي|kettle/.test(q) ? 'kettle' : matchesAlias(q,'ميزان') || /\bscale\b/.test(q) ? 'scale' : gear && foundMethods.includes('espresso') ? 'espresso_machine' : gear && foundMethods.includes('xbloom') ? 'xbloom' : gear ? null : kind === previous?.kind ? previous?.category ?? null : null;
  const requestedStyles = (['cold', 'hot'] as const).filter(style => servingAliases[style].some(alias => matchesAlias(q, alias)));
  const servingStyle = kind === 'recipe' ? requestedStyles.length === 1 ? requestedStyles[0] : requestedStyles.length ? null : previous?.kind === 'recipe' ? previous.servingStyle ?? null : null : null;
  const noteRequest = ['إيحاء', 'إيحاءات', 'إيحاءة', 'نكهة', 'نكهات', 'طعم', 'notes', 'flavor', 'flavors', 'flavour', 'flavours', 'taste'].some(alias => matchesAlias(q, alias));
  const noteTerms = kind === 'recipe' ? noteRequest ? foundNotes : !gear && !recipe ? previous?.noteTerms ?? [] : [] : [];
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
      && !(kind === 'equipment' && equipmentPlurals.some(alias => matchesAlias(word, alias)))
      && !(purchaseIntent && [...shoppingWords, 'وين', 'where', 'can', 'looking', 'looking for', 'first', 'second', 'third', 'الأول', 'الثاني', 'الثالث'].some(alias => matchesAlias(word, alias)))
      && !/^(\d|محامص|محمص|roasters?$|in$)/.test(word)
      && !(kind === 'recipe' && Object.values(servingAliases).flat().some(alias => matchesAlias(word, alias)))
      && !methods.some(([, aliases]) => aliases.some(alias => normalizeSearch(alias).split(' ').some(part => matchesAlias(word, part)))))
    .map(word => places.find(group => group.some(alias => matchesAlias(word, alias)))?.[0] ?? word);
  const region = kind==='equipment' ? (/بالكويت|في الكويت|in kuwait/.test(q)?'KW':/بالسعوديه|في السعوديه|in saudi/.test(q)?'SA':previous?.region??null) : null;
  const availableOnly = kind==='equipment' && /متوفر|متاح|in stock|available/.test(q) && !/غير متوفر|نفاد|out of stock/.test(q) ? true : kind==='equipment' ? previous?.availableOnly??false : false;
  const terms = [...new Set([...foundNames, ...foundNotes, ...unknownTerms.filter(term=>!catalogNames.some(group=>group.some(alias=>normalizeSearch(alias)===term))&&!(kind==='equipment'&&(/^(متوفر|متاح)/.test(term)||['available','stock'].includes(term)))&&!(region&&['kuwait','saudi','بالكويت','بالسعوديه'].includes(term)))])].slice(0,8);
  return { kind, category, methods: foundMethods.length ? foundMethods : (gear || recipe) && kind !== previous?.kind ? [] : previous?.methods ?? [], terms: terms.length ? terms : !gear && !recipe ? previous?.terms ?? [] : [], amount, currency, region, availableOnly, purchaseIntent, servingStyle, noteTerms,
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
    if (query.kind === 'recipe' && query.servingStyle) {
      const style = assistantRecipeServingStyle(document);
      if (query.servingStyle === 'cold' ? style !== 'cold' && style !== 'iced' : style !== 'hot') return [];
    }
    const search = deepSearchText(document.search_text);
    const rawNotes = document.facts?.notes;
    const publishedNotes = deepSearchText(typeof rawNotes === 'string' ? rawNotes : Array.isArray(rawNotes) ? rawNotes.filter(note => typeof note === 'string').join(' ') : '');
    const noteTerms = query.kind === 'recipe' ? query.noteTerms ?? [] : [];
    const confirmedNotes = noteTerms.filter(term => assistantSearchTerms({ ...query, terms: [term] }).some(alias => matchesAlias(publishedNotes, alias)));
    // Honey processing is not a honey tasting note. Sparse catalog records may
    // remain nearby search results, but cannot claim confirmed flavor matching.
    const matchedTerms = query.terms.filter(term=>assistantSearchTerms({...query,terms:[term]}).some(alias=>matchesAlias(noteTerms.includes(term) && publishedNotes ? publishedNotes : search,alias)));
    if (query.terms.length && !matchedTerms.length) return [];
    const offers = (Array.isArray(document.offers) ? document.offers : []).filter(offer =>
      assistantSafeUrl(offer.url) && (!query.region || (offer.region === query.region && !offer.excluded_destinations?.includes(query.region)))
      && (!query.availableOnly || (offer.availability === 'in_stock' && recent(offer.checked_at, now, 14))));
    const prices = offers.flatMap(offer=>{
      if (query.region && (offer.region !== query.region || offer.excluded_destinations?.includes(query.region))) return [];
      if (query.availableOnly && offer.availability !== 'in_stock') return [];
      const currency = query.currency ?? (rates.some(rate=>rate.currency==='KWD')?'KWD':offer.currency);
      const converted = convertCatalogPrice(offer,currency,rates,now);
      const price = converted ?? (!query.currency ? convertCatalogPrice(offer,offer.currency,rates,now) : null);
      const effectiveCurrency = converted ? currency : offer.currency;
      return price && (query.amount===null || price.converted<=query.amount) ? [{offer,currency:effectiveCurrency,...price}] : [];
    }).sort((a,b)=>Number(a.offer.availability==='out_of_stock')-Number(b.offer.availability==='out_of_stock') || (a.currency===b.currency?a.converted-b.converted:0));
    const purchaseLinks = query.purchaseIntent ? [...new Map((query.amount !== null ? prices.map(price => price.offer) : offers).map(offer => {
      const url = assistantSafeUrl(offer.url)!;
      return [url, { url, seller: offer.seller?.trim().slice(0, 160) || new URL(url).hostname.replace(/^www\./, ''), region: offer.region }] as const;
    })).values()].slice(0, 3) : undefined;
    if (query.purchaseIntent && !purchaseLinks?.length) return [];
    if ((query.amount!==null || (!query.purchaseIntent && (query.region || query.availableOnly))) && !prices.length) return [];
    return [{document,matchedTerms,allTerms:matchedTerms.length===query.terms.length && confirmedNotes.length===noteTerms.length,price:prices[0]??null,purchaseLinks,confirmedNotes}];
  }).sort((a,b)=>Number(b.allTerms)-Number(a.allTerms) || (b.confirmedNotes?.length ?? 0)-(a.confirmedNotes?.length ?? 0) || b.matchedTerms.length-a.matchedTerms.length || Number(a.price?.offer.availability==='out_of_stock')-Number(b.price?.offer.availability==='out_of_stock') || (a.price?.currency===b.price?.currency?(a.price?.converted??Infinity)-(b.price?.converted??Infinity):0) || a.document.id.localeCompare(b.document.id)).slice(0,6);
}
export function assistantReply(query: AssistantQuery, matches: AssistantMatch[], locale: 'ar'|'en', translate?: (arabic:string,english:string)=>string, translateValue?: (arabic:string,english:string)=>string): string {
  const ar=locale==='ar';
  const L=translate??((arabic:string,english:string)=>ar?arabic:english);
  const V=translateValue??((arabic:string,english:string)=>ar?arabic:english);
  const termLabel=(term:string)=>notes.some(group=>group[0]===term)||places.some(group=>group[0]===term)?L(assistantTermLabel(term,'ar'),assistantTermLabel(term,'en')):assistantTermLabel(term,locale);
  if(query.clarification==='currency')return L('حدد عملة الميزانية: دولار أمريكي USD، دينار كويتي KWD، أو ريال سعودي SAR.', 'Which budget currency: US dollars (USD), Kuwaiti dinars (KWD), or Saudi riyals (SAR)?');
  if(query.clarification==='budget')return L('اكتب ميزانية أكبر من صفر مع العملة.', 'Enter a budget greater than zero and its currency.');
  if(query.clarification==='intent')return L('اسألني عن معدات وميزانيتها، أو وصفة حسب إيحاءات البن وطريقة التحضير، أو محمصة.', 'Ask about equipment and a budget, a recipe for your tasting notes and brew method, or a roaster.');
  if(query.kind==='equipment' && query.purchaseIntent) {
    if(!matches.length)return query.amount!==null
      ? (L('لم أجد رابط بائع بسعر حديث موثق ضمن ميزانيتك. جرّب البحث بدون ميزانية.', 'I found no seller link with a recent verified price within your budget. Try searching without a budget.'))
      : (L('لم أجد روابط بائعين موثقة تطابق طلبك في كتالوغنا. جرّب اسم جهاز أو دولة أخرى.', 'I found no documented seller links matching your request in our catalog. Try an equipment name or another country.'));
    return L('هذه روابط بائعين للمعدات التي طلبتها، من بيانات كتالوغنا. افتح «موقع البائع» للشراء، وراجع السعر والتوفر والشحن إلى بلدك في المتجر.', 'These are catalog seller links for the equipment you requested. Open “Seller website” to buy and check current price, availability and shipping to your country at the store.');
  }
  if(query.kind==='coffee') {
    const requested = query.terms.map(term=>termLabel(term)).join(ar?'، ':', ');
    if(!matches.length)return L(`لم أجد بنًا منشورًا يطابق${requested?' «'+requested+'»':' طلبك'} في مكتبتنا. جرّب إيحاءً آخر أو اسم البن أو المحمصة.`, `I found no published coffee matching ${requested||'your request'} in our catalog. Try another tasting note, coffee or roaster name.`);
    const best = matches[0], name = V(best.document.title_ar||best.document.title_en,best.document.title_en||best.document.title_ar);
    const matched = best.matchedTerms.map(term=>termLabel(term)).join(ar?'، ':', ');
    const heading = best.allTerms ? L('أقرب ترشيح لطلبك', 'My closest catalog recommendation') : L('لم أجد بنًا يطابق كل طلبك؛ أقرب خيار جزئي', 'No coffee matched everything; the closest partial match is');
    return `${heading}: ${name}.${matched?'\n'+L('يطابق: ', 'Matches: ')+matched+L('، بحسب البيانات المنشورة.', ', according to the published information.'):''}\n${L('راجع وصف المحمصة لمعرفة المعالجة والإيحاءات قبل الاختيار.', 'Check the roaster’s description for processing and tasting notes before choosing.')}`;
  }
  if (query.kind === 'recipe') {
    const style = query.servingStyle === 'cold' ? (L(' باردة', ' cold')) : query.servingStyle === 'hot' ? (L(' حارة', ' hot')) : '';
    if (!matches.length) return L(`لم أجد وصفة${style} منشورة تطابق طريقة التحضير وكلمات بحثك. جرّب إيحاءً واحدًا أو اسم البن، أو اطلب وصفات الجهاز بدون إيحاءات.`, `I found no published${style} recipe matching the brewer and your search terms. Try one tasting note, the coffee name, or recipes for this brewer without tasting notes.`);
    const best = matches[0];
    const name = V(best.document.title_ar || best.document.title_en,best.document.title_en || best.document.title_ar);
    const matched = best.matchedTerms.filter(term => !query.noteTerms?.includes(term) || best.confirmedNotes?.includes(term));
    const missing = query.terms.filter(term => !matched.includes(term)).map(term => termLabel(term));
    const lead = best.allTerms ? (L(`أقرب وصفة${style} لطلبك: ${name}.`, `Closest published${style} recipe: ${name}.`)) : (L(`لم أجد وصفة تطابق كل شروط البحث. هذه خيارات قريبة تطابق بعض شروط البحث فقط. أقرب وصفة${style}: ${name}.`, `No recipe matched every search term. These nearby options match some search terms only. Closest${style} recipe: ${name}.`));
    return [lead, matched.length ? (L('يطابق في بيانات الوصفة: ', 'Matches in the published recipe data: ')) + matched.map(term => termLabel(term)).join(ar ? '، ' : ', ') + '.' : '', missing.length ? (L('غير مثبت في هذه الوصفة: ', 'Not confirmed in this recipe: ')) + missing.join(ar ? '، ' : ', ') + '.' : '', L('راجع البن والمقادير والجهاز في المصدر الأصلي؛ تطابق كلمات البحث لا يثبت أن الوصفة مختبرة مع بنّك.', 'Check the coffee, quantities and brewer in the original source; matching search words does not mean this recipe was tested with your coffee.')].filter(Boolean).join('\n');
  }
  if(!matches.length)return query.amount!==null?(L('لم أجد خيارًا بسعر موثّق ضمن هذه الميزانية. جرّب ميزانية أخرى أو ابحث دون سعر.', 'I found no option with a documented price within this budget. Try another budget or search without a price.')):(L('لم أجد سجلًا منشورًا يطابق طلبك. جرّب اسم البن أو الجهاز أو المحمصة.', 'I found no published record matching your request. Try a coffee, equipment or roaster name.'));
  return query.amount!==null?(L('هذه خيارات من دليلنا ضمن الميزانية بحسب أسعار مؤرخة. التحويل تقديري، والشحن والضرائب وتوفر المتجر تُراجع عند الشراء.', 'These catalog options fit the budget using dated prices. Conversion is indicative; check shipping, taxes and seller availability before buying.')):(L('هذه السجلات الأقرب لطلبك من معلومات BeanMora المنشورة.', 'These are the closest published BeanMora records for your request.'));
}
