import { describe, expect, it } from 'vitest';
import { assistantSafeUrl, convertCatalogPrice, parseAssistantQuery, rankAssistantDocuments, type AssistantDocument, type CatalogOffer, type CatalogRate } from './coffee-assistant';

const now = Date.parse('2026-10-08T12:00:00Z');
const stamp = new Date(now).toISOString();
const offer: CatalogOffer = { amount: 399, currency: 'USD', url: 'https://seller.example/product', checked_at: stamp, region: 'US', availability: 'in_stock' };
const equipment: AssistantDocument = { id: 'machine', kind: 'equipment', slug: null, title_ar: 'ماكينة', title_en: 'Machine', summary_ar: '', summary_en: '', search_text: 'espresso machine', source_url: offer.url, category: 'espresso_machine', methods: ['espresso'], facts: {}, offers: [offer], verified_at: stamp };
const rates: CatalogRate[] = [
  { currency: 'USD', kwd_per_unit: 0.307, observed_at: stamp, source_url: 'https://rates.example/usd' },
  { currency: 'KWD', kwd_per_unit: 1, observed_at: stamp, source_url: 'https://rates.example/kwd' },
  { currency: 'SAR', kwd_per_unit: 0.0819, observed_at: stamp, source_url: 'https://rates.example/sar' },
];

describe('coffee assistant catalog constraints', () => {
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
      { ...recipe, id: 'partial', search_text: 'strawberry chocolate' },
      { ...recipe, id: 'full', search_text: 'strawberry cola' },
      { ...recipe, id: 'wrong', search_text: 'chocolate' },
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
