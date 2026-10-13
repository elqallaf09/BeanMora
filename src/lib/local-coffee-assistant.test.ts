import { describe, expect, it, vi } from 'vitest';
import { converseLocally, localAssistantSearchTerms, parseLocalAssistantQuery, type LocalAssistantDependencies, type LocalAssistantTurn } from './local-coffee-assistant';
import type { AssistantDocument } from './coffee-assistant';

const now = Date.parse('2026-10-08T12:00:00Z');
const stamp = new Date(now).toISOString();
const machine: AssistantDocument = { id: 'm1', kind: 'equipment', slug: null, title_ar: 'فلير', title_en: 'Flair', summary_ar: '', summary_en: '', search_text: 'manual espresso flair', source_url: 'https://example.com/flair', category: 'espresso_machine', methods: ['espresso'], facts: { operation: ['يدوي', 'Manual'], pressure_gauge: ['نعم', 'Yes'] }, offers: [{ amount: 300, currency: 'USD', region: 'US', checked_at: stamp, url: 'https://example.com/flair', availability: 'in_stock' }], verified_at: stamp };
const second: AssistantDocument = { ...machine, id: 'm2', title_ar: 'ميراكي', title_en: 'Meraki', search_text: 'electric espresso meraki', facts: { operation: ['كهربائي', 'Electric'] }, offers: [{ ...machine.offers[0], amount: 400 }] };
const recipe: AssistantDocument = { ...machine, id: 'r1', kind: 'recipe', title_ar: 'وصفة فراولة', title_en: 'Strawberry recipe', category: null, methods: ['v60'], search_text: 'strawberry cola v60', offers: [], facts: { dose: 15, water: 250, temperature: 94, steps: [{ description_ar: 'اشطف الفلتر.', description_en: 'Rinse the filter.' }] } };
const search = vi.fn(async () => ({ documents: [machine, second, recipe], rates: [] }));
const deps: LocalAssistantDependencies = { search, now };
const offline: LocalAssistantDependencies = { search: async () => { throw new Error('No network allowed'); }, now };
const ask = (q: string, history: LocalAssistantTurn[] = [], dependencies = deps, locale: 'ar' | 'en' = 'ar') => converseLocally(q, locale, history, dependencies);

describe('local conversational coffee assistant', () => {
  it.each([
    ['الإسبريسو حامض جرعة ١٨ غرام خرج ٣٦ غرام في ٣٠ ثانية', 18, 36, 30],
    ['قهوتي إسبريسو حامضة جرعتي: ۱۸٫۵ غرام طلعت ۳۷ غرام في ۲۸ ثواني', 18.5, 37, 28],
    ['My espresso is sour dose: 18 yield: 36 time: 30 seconds', 18, 36, 30],
    ['الإسبريسو حامض الجرعة: 18 الناتج: 36 الوقت 30 ثانية', 18, 36, 30],
  ])('reads labeled and colloquial mass measurements: %s', async (question, dose, output, seconds) => {
    const turn = await ask(question as string, [], offline);
    expect(turn.coach).toMatchObject({ dose, output, seconds, method: 'espresso' });
    expect(turn.answer).toContain('1:2');
  });
  it.each(['ar', 'en'] as const)('gives different sourced espresso flow advice in %s', async locale => {
    const fast = await ask(locale === 'ar' ? 'استخلاص الإسبريسو سريع' : 'My espresso shot is fast', [], offline, locale);
    const slow = await ask(locale === 'ar' ? 'استخلاص الإسبريسو بطيء' : 'My espresso shot is slow', [], offline, locale);
    expect(fast.answer).toContain(locale === 'ar' ? 'أنعم' : 'finer');
    expect(slow.answer).toContain(locale === 'ar' ? 'أخشن' : 'coarser');
    expect(fast.answer).not.toBe(slow.answer);
    expect(fast.sources?.some(source => new URL(source.url).hostname === 'flairespresso.com')).toBe(true);
  });
  it.each(['الناتج 36 ml', 'طلع 36 ثانية', 'ماء 9 بار', 'الناتج 0.036 kg', 'ماء 92 °C'])('does not treat other units as mass: %s', async question => {
    const first = await ask('قهوتي إسبريسو حامضة جرعة 18', [], offline);
    const turn = await ask(question, [first], offline);
    expect(turn.coach?.output).toBeUndefined();
    expect(turn.answer).not.toContain('1:2');
  });
  it('clears an invalid supplied measurement instead of using the previous cup value', async () => {
    const first = await ask('قهوتي إسبريسو حامضة جرعة 18 الناتج 36 الوقت 30 ثانية', [], offline);
    const next = await ask('جرعة: 0', [first], offline);
    expect(next.coach?.dose).toBeUndefined();
    expect(next.answer).toContain('أكبر من صفر');
    expect(next.answer).not.toContain('1:2');
  });
  it.each([
    ['طلعلي بن بطعم الككاو', 'cocoa'],
    ['طلعلي بن بطعم الكاكاو', 'cocoa'],
    ['عطني بن نكته واين', 'wine'],
    ['i want beans wine', 'wine'],
    ['شنو بن ايحاء ويسكي', 'whisky'],
    ['I want coffee with whiskey notes', 'whisky'],
    ['أبي بن بالكاكاو', 'cocoa'],
    ['أبي بن بإيحاءات الشوكولاتة البيضاء', 'white chocolate'],
    ['Find beans with black currant notes', 'blackcurrant'],
  ])('understands the full tasting-note request %s across languages', async (question, note) => {
    const coffee: AssistantDocument = { ...recipe, id: 'matching-coffee', kind: 'coffee', title_ar: 'بن مطابق', search_text: note, facts: { notes: [note] } };
    const unrelated = { ...coffee, id: 'unrelated', search_text: 'Whole coffee beans chocolate winegum India walnut' };
    const lookup = vi.fn(async () => ({ documents: [unrelated, coffee, recipe], rates: [] }));
    const turn = await ask(question, [], { search: lookup, now });
    expect(turn.intent).toBe('search');
    expect(turn.query).toMatchObject({ kind: 'coffee', terms: [note], clarification: null });
    expect(turn.matches.map(m => m.document.id)).toEqual(['matching-coffee']);
    expect(turn.answer).toContain('بن مطابق');
    expect(turn.answer).not.toMatch(/يطابق:.*(?:beans|نكته|بطعم|طلعلي)/);
  });
  it('uses the same wine results for Arabic and English and excludes winegum', async () => {
    const documents = ['Red Wine', 'White Wine', 'winey fruitiness', 'winegum', 'Whole coffee beans chocolate'].map((search_text, index) => ({ ...recipe, kind: 'coffee' as const, id: String(index), search_text }));
    const lookup = { search: async () => ({ documents, rates: [] }), now };
    const arabic = await ask('عطني بن نكته واين', [], lookup);
    const english = await ask('i want beans wine', [], lookup);
    expect(arabic.matches.map(m => m.document.id)).toEqual(['0', '1', '2']);
    expect(english.matches.map(m => m.document.id)).toEqual(['0', '1', '2']);
    expect(localAssistantSearchTerms(arabic.query)).toEqual(localAssistantSearchTerms(english.query));
  });
  it('reports missing whisky without substituting another note or a lesson', async () => {
    const lookup = { search: async () => ({ documents: [{ ...recipe, kind: 'coffee' as const, search_text: 'Whole beans red wine chocolate' }], rates: [] }), now };
    const turn = await ask('شنو بن ايحاء ويسكي', [], lookup);
    expect(turn.intent).toBe('search');
    expect(turn.matches).toEqual([]);
    expect(turn.answer).toContain('«ويسكي»');
  });
  it('moves from processing education to cocoa and replaces wine with whisky in follow-ups', async () => {
    const lookup = { search: async () => ({ documents: [{ ...recipe, kind: 'coffee' as const, search_text: 'Cacao' }], rates: [] }), now };
    const lesson = await ask('معالجات البن', [], offline);
    const cocoa = await ask('طلعلي بن بطعم الككاو', [lesson], lookup);
    expect(cocoa.query).toMatchObject({ kind: 'coffee', terms: ['cocoa'] });
    expect(cocoa.matches).toHaveLength(1);
    const wine = await ask('عطني بن نكته واين', [cocoa], lookup);
    const whisky = await ask('شنو بن ايحاء ويسكي', [wine], lookup);
    expect(wine.query.terms).toEqual(['wine']);
    expect(whisky.query.terms).toEqual(['whisky']);
    expect(wine.matches).toEqual([]);
    expect(whisky.matches).toEqual([]);
  });
  it('preserves the requested roaster or unknown note alongside recognized flavors', async () => {
    const query = parseLocalAssistantQuery('أبي بن كاكاو من روستادو');
    expect(query.terms).toEqual(['cocoa', 'روستادو']);
    const turn = await ask('أبي بن كاكاو وزعفران', [], { search: async () => ({ documents: [{ ...recipe, kind: 'coffee' as const, search_text: 'Cacao' }], rates: [] }), now });
    expect(turn.query.terms).toContain('وزعفران');
    expect(turn.matches[0].allTerms).toBe(false);
    expect(turn.answer).toContain('خيار جزئي');
  });
  it.each(['شنو يعني إيحاءات البن؟', 'ليش طعم البن كاكاو؟', 'What do wine notes in coffee mean?'])('keeps %s educational', async question => {
    expect((await ask(question, [], offline)).intent).toBe('knowledge');
  });
  const coconutCoffee: AssistantDocument = { ...recipe, id: 'coconut-coffee', kind: 'coffee', title_ar: 'مونتيبلانكو', title_en: 'Monteblanco', methods: ['v60'], search_text: 'Monteblanco Coconut Lemonade جوز الهند', summary_ar: 'إيحاءات جوز الهند والليمونادة. تخمير مشترك مع إضافات بحسب المحمصة.', summary_en: 'Coconut and lemonade. Co-fermented and infused according to the roaster.', facts: { notes: ['Coconut', 'Lemonade'], roaster: 'Test roaster' } };
  it.each([
    ['شنو احسن بن ايحاء جوز الهند', 'ar'],
    ['أفضل بن بإيحاء جوز الهند', 'ar'],
    ['رشح لي بن نكهته كوكونت', 'ar'],
    ['What is the best coffee with coconut notes?', 'en'],
    ['Recommend beans with coconut tasting notes', 'en'],
  ] as const)('recommends a named coffee for %s rather than teaching tasting notes', async (question, locale) => {
    const wrong = { ...coconutCoffee, id: 'india-coffee', title_ar: 'بن الهند', search_text: 'India walnut chocolate', facts: { notes: ['Walnut'] } };
    const lookup = vi.fn(async () => ({ documents: [wrong, coconutCoffee, recipe], rates: [] }));
    const turn = await ask(question, [], { search: lookup, now }, locale);
    expect(turn.intent).toBe('search');
    expect(turn.knowledgeTopic).toBeUndefined();
    expect(turn.query.kind).toBe('coffee');
    expect(turn.query.terms).toEqual(['coconut']);
    expect(localAssistantSearchTerms(turn.query)).toEqual(expect.arrayContaining(['coconut', 'جوز الهند']));
    expect(lookup).toHaveBeenCalledOnce();
    expect(turn.matches.map(m => m.document.id)).toEqual(['coconut-coffee']);
    expect(turn.answer).toContain(locale === 'ar' ? 'مونتيبلانكو' : 'Monteblanco');
    expect(turn.answer).toContain(locale === 'ar' ? 'جوز الهند' : 'coconut');
  });
  it('reports an absent coffee honestly and does not substitute a recipe', async () => {
    const turn = await ask('شنو احسن بن ايحاء جوز الهند', [], { search: async () => ({ documents: [{ ...recipe, search_text: 'coconut' }], rates: [] }), now });
    expect(turn.matches).toEqual([]);
    expect(turn.answer).toContain('لم أجد بنًا منشورًا');
    expect(turn.answer).toContain('جوز الهند');
  });
  it('switches from a tasting lesson to a recommendation and explains the actual coffee description', async () => {
    const lesson = await ask('شنو يعني إيحاءات البن؟', [], offline);
    expect(lesson.intent).toBe('knowledge');
    const found = await ask('شنو احسن بن ايحاء جوز الهند', [lesson], { search: async () => ({ documents: [coconutCoffee], rates: [] }), now });
    expect(found.intent).toBe('search');
    expect(found.matches).toHaveLength(1);
    const details = await ask('اشرح الأول', [lesson, found], offline);
    expect(details.intent).toBe('explain');
    expect(details.answer).toContain('تخمير مشترك مع إضافات');
  });
  it.each(['محمصة ليمو', 'أبي محمصة ليمو', 'Limu roastery'])('retrieves a named roaster for %s instead of treating its name as roasting instruction', async question => {
    const limu: AssistantDocument = { ...machine, id: 'limu-roaster', kind: 'roaster', category: null, methods: [], title_ar: 'محمصة ليمو', title_en: 'Limu Roastery', search_text: 'محمصة ليمو Limu Roastery KW', facts: { country: 'KW' }, offers: [] };
    const unrelated = { ...limu, id: 'other-roaster', title_ar: 'محمصة أخرى', title_en: 'Other roaster', search_text: 'Other roaster KW' };
    const lookup = vi.fn(async () => ({ documents: [limu, unrelated], rates: [] }));
    const turn = await ask(question, [], { search: lookup, now });
    expect(turn.intent).toBe('search');
    expect(lookup).toHaveBeenCalledOnce();
    expect(turn.query.terms).toContain(question.includes('Limu') ? 'limu' : 'ليمو');
    expect(turn.matches.map(m => m.document.id)).toEqual(['limu-roaster']);
    expect(turn.knowledgeTopic).toBeUndefined();
  });
  it.each(['محامص ARK', 'محامص A R K', 'محامص آرك'])('matches the published spaced brand for %s without accepting substrings', async question => {
    const ark: AssistantDocument = { ...machine, id: 'ark-roaster', kind: 'roaster', category: null, methods: [], title_ar: 'آرك روسترز', title_en: 'A R K Roasters', search_text: 'آرك روسترز A R K Roasters KW', facts: { country: 'KW' }, offers: [] };
    const unrelated = { ...ark, id: 'other-roaster', title_en: 'Market coffee', search_text: 'Market coffee with dark roast' };
    const turn = await ask(question, [], { search: async () => ({ documents: [ark, unrelated], rates: [] }), now });
    expect(localAssistantSearchTerms(turn.query)).toContain('a r k');
    expect(turn.matches.map(m => m.document.id)).toEqual(['ark-roaster']);
  });
  it('finds Kuwaiti roasters whose catalog country is the ISO code KW', async () => {
    const roaster: AssistantDocument = { ...machine, id: 'kw-roaster', kind: 'roaster', category: null, methods: [], title_ar: 'محمصة الكويت', title_en: 'Kuwait roaster', search_text: 'Altitude Roasters KW', facts: { country: 'KW' }, offers: [] };
    const lookup = vi.fn(async () => ({ documents: [roaster], rates: [] }));
    const turn = await ask('محامص بالكويت', [], { search: lookup, now });
    expect(localAssistantSearchTerms(turn.query)).toContain('kw');
    expect(turn.matches.map(m => m.document.id)).toEqual(['kw-roaster']);
    expect(turn.matches[0].allTerms).toBe(true);
  });
  it.each([
    ['استخلاص الإسبريسو بطيء وطحنه ناعمة', 'ar', 'slow', 'espresso'],
    ['استخلاص الإسبريسو سريع بعد تغيير الطحن', 'ar', 'fast', 'espresso'],
    ['قهوتي V60 حامضة بعد تغيير الماء', 'ar', 'sour', 'v60'],
    ['My espresso shot is slow after changing grind', 'en', 'slow', 'espresso'],
    ['My V60 is sour after changing water', 'en', 'sour', 'v60'],
  ] as const)('coaches %s instead of answering a broad keyword lesson', async (question, locale, signal, method) => {
    const turn = await ask(question, [], offline, locale);
    expect(turn.intent).toBe('coach');
    expect(turn.coach).toMatchObject({ signal, method });
    expect(turn.sources?.[0].url).toContain('baristahustle.com');
    expect(turn.knowledgeTopic).toBeUndefined();
  });
  it('keeps labeled water measurements in a coaching follow-up', async () => {
    const first = await ask('قهوتي V60 حامضة', [], offline);
    const next = await ask('جرعة 18 الماء 288 الوقت 150 ثانية', [first], offline);
    expect(next.intent).toBe('coach');
    expect(next.coach).toMatchObject({ signal: 'sour', method: 'v60', dose: 18, output: 288, seconds: 150 });
    expect(next.answer).toContain('1:16');
  });
  it.each(['ar', 'en'] as const)('clears espresso measurements when coaching switches methods in %s', async locale => {
    const first = await ask(locale === 'ar' ? 'قهوتي إسبريسو حامضة' : 'My espresso tastes sour', [], offline, locale);
    const measured = await ask('dose 18 yield 36 time 30 seconds', [first], offline, locale);
    const next = await ask(locale === 'ar' ? 'قهوتي V60 حامضة' : 'My V60 tastes sour', [measured], offline, locale);
    expect(next.coach).toEqual({ signal: 'sour', method: 'v60' });
    expect(next.answer).not.toContain('1:2');
    const updated = await ask('dose 20 water 320 time 180 seconds', [next], offline, locale);
    expect(updated.coach).toMatchObject({ dose: 20, output: 320, seconds: 180 });
    expect(updated.answer).toContain('1:16');
  });
  it.each([['الكولد برو والاستخلاص البارد', 'ar'], ['What is cold brew?', 'en']] as const)('lets %s switch from coaching to a new lesson', async (question, locale) => {
    const first = await ask('قهوتي V60 حامضة', [], offline);
    const turn = await ask(question, [first], offline, locale);
    expect(turn.intent).toBe('knowledge');
    expect(turn.knowledgeTopic).toBe('cold-brew');
  });
  it('preserves Kuwaiti budget follow-ups and resolves currency without model calls', async () => {
    const a = await ask('أبي ماكينة إسبريسو تحت ٤٨٠');
    expect(a.query).toMatchObject({ amount: 480, clarification: 'currency' });
    const b = await ask('دولار', [a]);
    expect(b.matches).toHaveLength(2);
    const c = await ask('خل الميزانية ٣٥٠ دولار', [a,b]);
    expect(c.query).toMatchObject({ category: 'espresso_machine', amount: 350, currency: 'USD' });
    expect(c.matches.map(m => m.document.id)).toEqual(['m1']);
    const d = await ask('ابحث بدون ميزانية', [c]);
    expect(d.query.amount).toBeNull();
    expect(d.matches).toHaveLength(2);
  });
  it('clears budget/category when changing from gear to a recipe', async () => {
    const a = await ask('Espresso machine under 480 USD');
    const b = await ask('عندي بن بإيحاء فراولة وكولا أبي وصفة V60', [a]);
    expect(b.query).toMatchObject({ kind: 'recipe', category: null, amount: null, currency: null, methods: ['v60'], terms: ['strawberry','cola'] });
    expect(b.matches.map(m => m.document.id)).toEqual(['r1']);
  });
  it('searches beans as beans, recognizes kettle and brand aliases', () => {
    expect(parseLocalAssistantQuery('أبي بن فراولة').kind).toBe('coffee');
    expect(parseLocalAssistantQuery('أبي غلاية')).toMatchObject({ kind: 'equipment', category: 'kettle' });
    expect(parseLocalAssistantQuery('ماكينة فلير').terms).toContain('flair');
    expect(localAssistantSearchTerms(parseLocalAssistantQuery('ماكينة يدوية'))).toContain('manual');
  });
  it('does not quietly use a previous supported currency for an unsupported one', async () => {
    const a = await ask('Espresso machine under 480 USD');
    const b = await ask('300 EUR', [a]);
    expect(b.query.clarification).toBe('currency');
    expect(b.query.currency).toBeNull();
    expect(b.matches).toEqual([]);
    const c = await ask('USD', [a,b]);
    expect(c.query.amount).toBe(300);
  });
  it('compares selected records, marks absent facts, then explains the second', async () => {
    const a = await ask('أبي ماكينة إسبريسو تحت 480 دولار');
    const b = await ask('قارن الأول والثاني', [a], offline);
    expect(b.intent).toBe('compare');
    expect(b.matches.map(m => m.document.id)).toEqual(['m1','m2']);
    expect(b.answer).toContain('غير مذكور في المصدر');
    const c = await ask('اشرح الثاني', [a,b], offline);
    expect(c.matches.map(m => m.document.id)).toEqual(['m2']);
    const d = await ask('اشرح رقم 9', [a], offline);
    expect(d.intent).toBe('help');
    expect(d.answer).toContain('النتائج');
  });
  it('answers a new educational topic instead of explaining an unrelated previous machine', async () => {
    const first = await ask('أبي ماكينة إسبريسو تحت 480 دولار');
    const next = await ask('اشرح الماء', [first], offline);
    expect(next.intent).toBe('knowledge');
    expect(next.knowledgeTopic).toBe('water');
    expect(next.answer).not.toContain('فلير');
  });
  it('asks about the new cup instead of reusing an old symptom when only the method changes', async () => {
    const first = await ask('My espresso tastes sour', [], offline, 'en');
    const next = await ask('V60', [first], offline, 'en');
    expect(next.coach).toEqual({ signal: 'unknown', method: 'v60' });
    expect(next.answer).toContain('Describe this cup');
    expect(next.answer).not.toContain('finer');
  });
  it('requires explicit two results and does not substitute another reference', async () => {
    const a = await ask('أبي ماكينة إسبريسو تحت 350 دولار');
    const b = await ask('قارن الاول والثاني', [a], offline);
    expect(b.intent).toBe('help');
  });
  it('explains only the published recipe steps and quantities', async () => {
    const a = await ask('وصفة فراولة');
    const b = await ask('اشرح الأول', [a], offline);
    expect(b.answer).toContain('15 g');
    expect(b.answer).toContain('250 g');
    expect(b.answer).toContain('اشطف الفلتر');
    expect(b.answer).not.toContain('30 ثانية');
  });
  it('calculates without network and keeps ratio across follow-up doses', async () => {
    const a = await ask('احسب ١٨ غرام بنسبة 1:16', [], offline);
    expect(a.answer).toContain('288 g');
    expect(a.answer).toContain('ماء التحضير');
    const b = await ask('خلها 20 غرام', [a], offline);
    expect(b.answer).toContain('320 g');
    const c = await ask('غير النسبة إلى 1:15', [a,b], offline);
    expect(c.answer).toContain('300 g');
  });
  it('asks for missing ratios and distinguishes espresso beverage yield', async () => {
    const a = await ask('احسب 18 غرام', [], offline);
    expect(a.calculation?.ratio).toBeNull();
    const b = await ask('إسبريسو 1:2', [a], offline);
    expect(b.answer).toContain('36 g');
    expect(b.answer).toContain('ناتج الإسبريسو');
    expect(b.answer).not.toContain('ماء التحضير:');
  });
  it('does not scale moka pots or accept impossible/xBloom doses', async () => {
    expect((await ask('احسب موكا بوت 18 g 1:16', [], offline)).answer).toContain('سعة');
    expect((await ask('احسب xBloom 20 g 1:16', [], offline)).answer).toContain('خارج نطاق');
    expect((await ask('calculate -18 g 1:16', [], offline, 'en')).answer).toContain('greater than zero');
  });
  it('supports currency words and attached Arabic amounts without confusing budget with scales', () => {
    expect(parseLocalAssistantQuery('ماكينة اسبريسو ب480دولار')).toMatchObject({ amount: 480, currency: 'USD' });
    expect(parseLocalAssistantQuery('espresso machine under 480 dollars')).toMatchObject({ amount: 480, currency: 'USD' });
    expect(parseLocalAssistantQuery('محامص بالكويت')).toMatchObject({ kind: 'roaster', terms: ['kuwait'] });
    expect(parseLocalAssistantQuery('ميزانيتي 300 دينار')).not.toMatchObject({ category: 'scale' });
  });
  it('does not carry an espresso ratio into a different brewing method', async () => {
    const a = await ask('احسب اسبريسو 18 g 1:2', [], offline);
    const b = await ask('احسب V60 20 g', [a], offline);
    expect(b.calculation?.ratio).toBeNull();
  });
  it('asks for brew method then gives conditional guidance without a made-up grind number', async () => {
    const a = await ask('قهوتي حامضة', [], offline);
    expect(a.coach?.signal).toBe('sour');
    expect(a.answer).toContain('تستخدم');
    const b = await ask('V60', [a], offline);
    expect(b.intent).toBe('coach');
    expect(b.answer).toContain('أنعم');
    expect(b.sources?.[0].url).toContain('baristahustle');
    const mixed = await ask('My espresso is sour and bitter', [], offline, 'en');
    expect(mixed.answer).toContain('uneven extraction');
    expect(mixed.answer).not.toContain('finer');
    const measurements = await ask('dose 18 yield 36 time 30 seconds', [mixed], offline, 'en');
    expect(measurements.intent).toBe('coach');
    expect(measurements.answer).toContain('1:2');
    expect(measurements.answer).toContain('30 s');
  });
  it('requires published operation evidence for a manual preference', async () => {
    const a = await ask('أبي ماكينة إسبريسو يدوية');
    expect(a.matches.map(m => m.document.id)).toEqual(['m1']);
  });
  it('does not resurrect old prices in reference answers', async () => {
    const a = await ask('أبي ماكينة إسبريسو تحت 480 دولار');
    const b = await ask('اشرح الأول', [a], { ...offline, now: now + 20 * 86400000 });
    expect(b.matches[0].price).toBeNull();
  });
  it('answers help and bundled method guidance without catalog availability', async () => {
    expect((await ask('مرحبا', [], offline)).answer).toContain('خبير القهوة');
    const turn = await ask('شلون أستخدم الكيمكس', [], { ...offline, guides: { chemex: { title: 'Chemex', title_ar: 'كيمكس', intro: 'Paper filter', intro_ar: 'فلتر ورقي', tips: ['Rinse it'], tips_ar: ['اشطفه'], source: 'https://example.com/guide', source_name: 'Maker' } } });
    expect(turn.intent).toBe('guide');
    expect(turn.answer).toContain('اشطفه');
  });
});
