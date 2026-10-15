import { describe, expect, it } from 'vitest';
import { assistantReply, assistantSafeUrl, convertCatalogPrice, parseAssistantQuery, rankAssistantDocuments, type AssistantDocument, type CatalogOffer, type CatalogRate } from './coffee-assistant';

const now = Date.parse('2026-10-08T12:00:00Z');
const stamp = new Date(now).toISOString();
it.each(['ar', 'en'] as const)('describes a recipe publisher search without inventing flavor matching in %s', locale => {
  const query = parseAssistantQuery('cold brew recipe blue bottle');
  const document: AssistantDocument = { id: 'cold', kind: 'recipe', slug: null, title_ar: 'كولد برو', title_en: 'Cold brew', summary_ar: '', summary_en: '', search_text: 'blue bottle cold brew', source_url: 'https://www.hario-usa.com/', category: null, methods: ['cold_brew'], facts: {}, offers: [], verified_at: stamp };
  const exact = assistantReply(query, [{ document, allTerms: true, matchedTerms: query.terms, price: null }], locale);
  const partial = assistantReply(query, [{ document, allTerms: false, matchedTerms: ['blue'], price: null }], locale);
  expect(exact).not.toMatch(/إيحاء|notes/);
  expect(partial).not.toMatch(/إيحاء|notes/);
  expect(partial).toContain(locale === 'ar' ? 'بعض شروط البحث' : 'some search terms');
});
const offer: CatalogOffer = { amount: 399, currency: 'USD', url: 'https://seller.example/product', checked_at: stamp, region: 'US', availability: 'in_stock' };
const equipment: AssistantDocument = { id: 'machine', kind: 'equipment', slug: null, title_ar: 'ماكينة', title_en: 'Machine', summary_ar: '', summary_en: '', search_text: 'espresso machine', source_url: offer.url, category: 'espresso_machine', methods: ['espresso'], facts: {}, offers: [offer], verified_at: stamp };
const rates: CatalogRate[] = [
  { currency: 'USD', kwd_per_unit: 0.307, observed_at: stamp, source_url: 'https://rates.example/usd' },
  { currency: 'KWD', kwd_per_unit: 1, observed_at: stamp, source_url: 'https://rates.example/kwd' },
  { currency: 'SAR', kwd_per_unit: 0.0819, observed_at: stamp, source_url: 'https://rates.example/sar' },
];

describe('coffee assistant catalog constraints', () => {
  it('retrieves related cocoa/chocolate notes without claiming they are the same published fact', () => {
    const cocoa: AssistantDocument = { ...equipment, kind: 'recipe', category: null, offers: [], methods: ['v60'], search_text: 'Cocoa beans', facts: { notes: ['Cocoa'] } };
    const matches = rankAssistantDocuments([cocoa], parseAssistantQuery('recipe with chocolate notes'), [], now);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ matchedTerms: ['chocolate'], confirmedNotes: [], allTerms: false });
    expect(cocoa.facts.notes).toEqual(['Cocoa']);
    expect(rankAssistantDocuments([cocoa], parseAssistantQuery('وصفة بإيحاء ككاو'), [], now)[0]).toMatchObject({ confirmedNotes: ['cocoa'], allTerms: true });
  });
  it.each(['طلعلي وصفة قهوه باردة حق مكينة اكسبلوم لي بن ايحاءة جوز الهند وعسل', 'Find a cold recipe for my xBloom machine with coconut and honey notes'])('treats the machine as a brewer in an explicit recipe request: %s', question => {
    const query = parseAssistantQuery(question);
    expect(query).toMatchObject({ kind: 'recipe', category: null, methods: ['xbloom'], servingStyle: 'cold', purchaseIntent: false });
    expect(new Set(query.terms)).toEqual(new Set(['coconut', 'honey']));
    const base: AssistantDocument = { ...equipment, kind: 'recipe', category: null, offers: [], methods: ['xbloom'], search_text: 'coconut honey' };
    const matches = rankAssistantDocuments([
      { ...base, id: 'hot', facts: { serving_style: 'hot' } },
      { ...base, id: 'unknown', facts: {} },
      { ...base, id: 'wrong-brewer', methods: ['v60'], facts: { serving_style: 'iced' } },
      { ...base, id: 'cold', facts: { serving_style: 'cold' } },
      { ...base, id: 'iced', facts: { serving_style: 'iced' } },
    ], query, [], now);
    expect(matches.map(match => match.document.id)).toEqual(['cold', 'iced']);
  });
  it('uses a published discovery serving style when no top-level style is present', () => {
    const query = parseAssistantQuery('وصفة xBloom مثلجة');
    const document: AssistantDocument = { ...equipment, kind: 'recipe', category: null, offers: [], methods: ['xbloom'], facts: { source_brew: { discovery: { serving_style: 'iced' } } } };
    expect(rankAssistantDocuments([document], query, [], now)).toHaveLength(1);
    expect(rankAssistantDocuments([document], parseAssistantQuery('وصفة xBloom حارة'), [], now)).toHaveLength(0);
  });
  it('prefers published tasting notes and does not treat honey processing as a honey flavor', () => {
    const query = parseAssistantQuery('وصفة xBloom باردة بإيحاء جوز الهند وعسل');
    const base: AssistantDocument = { ...equipment, kind: 'recipe', category: null, offers: [], methods: ['xbloom'], search_text: 'coconut honey processed', facts: { serving_style: 'iced' } };
    const matches = rankAssistantDocuments([
      { ...base, id: 'processing-only', search_text: 'Honey processed', facts: { ...base.facts, notes: ['Mango'] } },
      { ...base, id: 'sparse-title', search_text: 'Coconut Honey', facts: { ...base.facts, notes: [] } },
      { ...base, id: 'confirmed', search_text: 'Honey', facts: { ...base.facts, notes: ['Honey'] } },
    ], query, [], now);
    expect(matches.map(match => match.document.id)).toEqual(['confirmed', 'sparse-title']);
    expect(matches[0]).toMatchObject({ allTerms: false, confirmedNotes: ['honey'] });
    expect(matches[1]).toMatchObject({ allTerms: false, confirmedNotes: [] });
    expect(assistantReply(query, matches, 'ar')).toContain('غير مثبت في هذه الوصفة: جوز الهند');
  });
  it.each(['موقع بيع مكائن اسبرسو', 'أبي موقع لبيع مكائن الإسبريسو', 'وين أشتري مكائن إسبريسو', 'ابي مواقع تبيع مكاين اسبرسو', 'website selling espresso machines', 'Where can I buy an espresso machine?'])('routes the seller request %s to equipment without searching for shopping filler', question => {
    const query = parseAssistantQuery(question);
    expect(query).toMatchObject({ kind: 'equipment', category: 'espresso_machine', purchaseIntent: true, terms: [], clarification: null });
    const matches = rankAssistantDocuments([equipment], query, rates, now);
    expect(matches).toHaveLength(1);
    expect(matches[0].purchaseLinks).toEqual([{ url: offer.url, seller: 'seller.example', region: 'US' }]);
  });
  it('retains a documented seller URL without claiming an expired price or stock status', () => {
    const document = { ...equipment, offers: [{ ...offer, checked_at: '2026-09-01' }] };
    const shopping = parseAssistantQuery('موقع بيع مكائن اسبرسو');
    const matches = rankAssistantDocuments([document], shopping, rates, now);
    expect(matches[0].price).toBeNull();
    expect(matches[0].purchaseLinks?.[0].url).toBe(offer.url);
    expect(rankAssistantDocuments([document], { ...shopping, amount: 480, currency: 'USD' }, rates, now)).toEqual([]);
    expect(rankAssistantDocuments([document], { ...shopping, availableOnly: true }, rates, now)).toEqual([]);
  });
  it('does not present manufacturer references as seller links or ignore country and shipping exclusions', () => {
    const query = parseAssistantQuery('موقع بيع مكائن اسبرسو');
    expect(rankAssistantDocuments([{ ...equipment, offers: [] }], query, rates, now)).toEqual([]);
    expect(rankAssistantDocuments([{ ...equipment, offers: [{ ...offer, url: 'javascript:alert(1)' }] }], query, rates, now)).toEqual([]);
    expect(rankAssistantDocuments([equipment], { ...query, region: 'KW' }, rates, now)).toEqual([]);
    expect(rankAssistantDocuments([{ ...equipment, offers: [{ ...offer, region: 'KW', excluded_destinations: ['KW'] }] }], { ...query, region: 'KW' }, rates, now)).toEqual([]);
  });
  it('recognizes an Arabic budget without changing the requested currency', () => {
    const query = parseAssistantQuery('أبي ماكينة إسبريسو تحت ٤٨٠ دولار');
    expect(query).toMatchObject({ kind: 'equipment', category: 'espresso_machine', amount: 480, currency: 'USD', clarification: null });
    expect(rankAssistantDocuments([equipment], query, rates, now)[0].price).toMatchObject({ converted: 399, currency: 'USD' });
  });
  it('asks for a currency before returning priced results and resolves the follow-up', () => {
    const query = parseAssistantQuery('Espresso machine under 480');
    expect(query.clarification).toBe('currency');
    expect(rankAssistantDocuments([equipment], query, rates, now)).toEqual([]);
    expect(parseAssistantQuery('USD', query)).toMatchObject({ amount: 480, currency: 'USD', category: 'espresso_machine', clarification: null });
  });
  it('rejects nonpositive budgets and ambiguous currencies', () => {
    expect(parseAssistantQuery('Espresso machine under 0 USD').clarification).toBe('budget');
    expect(parseAssistantQuery('Espresso machine under 480 USD KWD').clarification).toBe('currency');
  });
  it('converts with dated rates and refuses stale or unverified prices', () => {
    expect(convertCatalogPrice(offer, 'KWD', rates, now)?.converted).toBeCloseTo(122.493);
    expect(convertCatalogPrice(offer, 'SAR', rates, now)?.converted).toBeCloseTo(1495.640, 2);
    expect(convertCatalogPrice(offer, 'KWD', rates.map(rate => ({ ...rate, observed_at: '2026-09-01' })), now)).toBeNull();
    expect(convertCatalogPrice({ ...offer, checked_at: '2026-09-01' }, 'USD', [], now)).toBeNull();
    expect(convertCatalogPrice({ ...offer, url: 'javascript:alert(1)' }, 'USD', [], now)).toBeNull();
  });
  it('excludes an over-budget option and respects requested availability and region', () => {
    expect(rankAssistantDocuments([equipment], parseAssistantQuery('Espresso machine under 300 USD'), rates, now)).toEqual([]);
    expect(rankAssistantDocuments([equipment], parseAssistantQuery('Espresso machine in Kuwait under 480 USD'), rates, now)).toEqual([]);
    expect(rankAssistantDocuments([{ ...equipment, offers: [{ ...offer, availability: 'out_of_stock' }] }], parseAssistantQuery('Espresso machine in stock under 480 USD'), rates, now)).toEqual([]);
  });
  it('matches full tasting notes without mistaking chocolate for cola', () => {
    const query = parseAssistantQuery('عندي بن بإيحاء فراولة وكولا، أبي وصفة');
    expect(query.terms).toEqual(['strawberry', 'cola']);
    const recipe = { ...equipment, kind: 'recipe' as const, category: null, offers: [], methods: ['v60'] };
    const matches = rankAssistantDocuments([
      { ...recipe, id: 'partial', search_text: 'strawberry chocolate', facts: { notes: ['Strawberry', 'Chocolate'] } },
      { ...recipe, id: 'full', search_text: 'strawberry cola', facts: { notes: ['Strawberry', 'Cola'] } },
      { ...recipe, id: 'wrong', search_text: 'chocolate', facts: { notes: ['Chocolate'] } },
    ], query, [], now);
    expect(matches.map(match => [match.document.id, match.allTerms])).toEqual([['full', true], ['partial', false]]);
  });
  it('keeps brew method constraints and accepts only credential-free HTTPS sources', () => {
    const query = parseAssistantQuery('xBloom recipe with strawberry notes');
    const recipe = { ...equipment, kind: 'recipe' as const, category: null, search_text: 'strawberry', offers: [] };
    expect(rankAssistantDocuments([{ ...recipe, methods: ['v60'] }, { ...recipe, id: 'xbloom', methods: ['xbloom'] }], query, [], now).map(match => match.document.id)).toEqual(['xbloom']);
    expect(assistantSafeUrl('http://seller.example')).toBeNull();
    expect(assistantSafeUrl('https://user:secret@seller.example')).toBeNull();
    expect(assistantSafeUrl('https://seller.example')).toBe('https://seller.example/');
  });
});
