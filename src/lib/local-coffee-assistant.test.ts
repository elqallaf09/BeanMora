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
