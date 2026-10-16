import { expect, it, vi } from 'vitest';
import { converseLocally, parseLocalAssistantQuery } from './local-coffee-assistant';
import { coffeeKnowledgeAnswer, coffeeLearningTopics } from './coffee-knowledge';
import type { AssistantDocument } from './coffee-assistant';
const now = Date.parse('2026-10-16T12:00:00Z');
const machine: AssistantDocument = { id: 'm1', kind: 'equipment', slug: null, title_ar: 'ماكينة ألف', title_en: 'Machine A', summary_ar: 'مواصفات الشركة', summary_en: 'Maker specifications', search_text: 'espresso', source_url: 'https://maker.example/a', category: 'espresso_machine', methods: ['espresso'], facts: { boiler: ['غلاية واحدة', 'Single boiler'] }, offers: [], verified_at: null };
const lookup = (documents: AssistantDocument[]) => ({ search: vi.fn(async () => ({ documents, rates: [] })), now });
const reported = 'طلعي مكينة اسبريسو قيمتها ما بين ٢٠٠ الى ٤٠٠ دينار كويتي';
it('retains the reported range and provides useful guidance instead of a dead end', async () => {
  const dependencies = lookup([machine, { ...machine, id: 'm2' }]);
  const turn = await converseLocally(reported, 'ar', [], dependencies);
  expect(turn.query).toMatchObject({ kind: 'equipment', category: 'espresso_machine', minAmount: 200, amount: 400, currency: 'KWD', terms: [], clarification: null });
  expect(turn.equipmentAdvice).toBe('unverified-price');
  expect(turn.answer).toContain('200–400 KWD');
  expect(turn.answer).toContain('شلون تختار');
  expect(turn.answer).toContain('ليست خيارات مؤكدة ضمن الميزانية');
  expect(turn.followUp).toContain('طاحونة');
  expect(turn.matches).toHaveLength(2);
  expect(turn.matches.every(match => match.price === null && !match.purchaseLinks)).toBe(true);
  const compared = await converseLocally('قارن الأول والثاني', 'ar', [turn], dependencies);
  expect(compared.intent).toBe('compare');
  expect(compared.equipmentAdvice).toBe('unverified-price');
  expect(compared.query).toMatchObject({ minAmount: 200, amount: 400, currency: 'KWD' });
  expect(compared.matches.every(match => match.price === null)).toBe(true);
});
it('does not invent a price, known-outside-budget recommendation, product, seller or availability', async () => {
  const priced = { ...machine, id: 'costly', offers: [{ amount: 500, currency: 'KWD' as const, checked_at: '2026-10-16', url: 'https://seller.example/a', region: 'KW', availability: 'in_stock' as const }] };
  const stale = { ...machine, id: 'stale', offers: [{ ...priced.offers[0], checked_at: '2026-01-01' }] };
  const unsafe = { ...machine, id: 'unsafe', source_url: 'javascript:alert(1)' };
  const irrelevant = { ...machine, id: 'irrelevant', kind: 'coffee' as const };
  const turn = await converseLocally(reported, 'ar', [], lookup([priced, stale, unsafe, irrelevant]));
  expect(turn.matches.map(match => match.document.id)).toEqual(['stale']);
  expect(turn.matches[0].price).toBeNull();
  expect(turn.answer).not.toContain('500');
  const none = await converseLocally(reported, 'ar', [], lookup([]));
  expect(none.matches).toEqual([]);
  expect(none.answer).toContain('غلاية');
});
it('keeps a brand constraint instead of substituting unrelated specification candidates', async () => {
  const turn = await converseLocally('أبي ماكينة إسبريسو Unicorn تحت 400 دينار', 'ar', [], lookup([machine]));
  expect(turn.query.terms).toContain('unicorn');
  expect(turn.matches).toEqual([]);
});
it('returns actual in-range priced records ahead of specification guidance', async () => {
  const document = { ...machine, offers: [{ amount: 300, currency: 'KWD' as const, checked_at: '2026-10-16', url: 'https://seller.example/a', region: 'KW' }] };
  const turn = await converseLocally(reported, 'ar', [], lookup([document]));
  expect(turn.equipmentAdvice).toBeUndefined();
  expect(turn.matches[0].price?.converted).toBe(300);
});
it('resets both bounds when the user removes or replaces the budget and resets them for a new topic', () => {
  const query = parseLocalAssistantQuery(reported);
  expect(parseLocalAssistantQuery('ابحث بدون ميزانية', query)).toMatchObject({ amount: null, minAmount: null });
  expect(parseLocalAssistantQuery('300', query)).toMatchObject({ amount: 300, minAmount: null });
  expect(parseLocalAssistantQuery('تحت 350 دينار', query)).toMatchObject({ amount: 350, minAmount: null });
  expect(parseLocalAssistantQuery('أبي بن جوز الهند', query)).toMatchObject({ kind: 'coffee', minAmount: null, amount: null });
});
it.each([
  ['شنو مضخة روتاري واهتزازية؟', 'pumps'], ['What is a rotary pump?', 'pumps'],
  ['شلون أضيف فلو كنترول؟', 'flow-control'], ['What is flow control?', 'flow-control'],
  ['الطاحونة المدمجة أم المنفصلة؟', 'integrated-grinder'], ['Choosing an espresso machine', 'machine-choice'],
])('answers an additional sourced lesson offline: %s', async (question, topic) => {
  const dependencies = { search: vi.fn(async () => { throw new Error('Must stay offline'); }) };
  const turn = await converseLocally(question, /[\u0600-\u06ff]/.test(question) ? 'ar' : 'en', [], dependencies);
  expect(turn.knowledgeTopic).toBe(topic);
  expect(turn.answer.split('\n\n').length).toBeGreaterThanOrEqual(3);
  expect(turn.sources?.length).toBeGreaterThan(0);
  expect(dependencies.search).not.toHaveBeenCalled();
});
it('answers both explicitly separated questions with distinct primary sources', () => {
  const answer = coffeeKnowledgeAnswer('شنو دبل بويلر؟ وشنو مضخة روتاري؟', 'ar')!;
  expect(answer.answer).toContain('الغلاية الواحدة والمزدوجة');
  expect(answer.answer).toContain('المضخة الروتاري والاهتزازية');
  expect(new Set(answer.sources.map(source => source.url)).size).toBe(answer.sources.length);
  expect(coffeeLearningTopics('ar').length).toBeGreaterThanOrEqual(50);
});

it.each(['عندي طاحونة إسبريسو', 'ما عندي طاحونة', 'الميزانية تشمل طاحونة', 'I have an espresso grinder', "I don't have a grinder"])('understands the follow-up to its grinder question: %s', async question => {
  const dependencies = lookup([machine]);
  const first = await converseLocally(reported, 'ar', [], dependencies);
  dependencies.search.mockClear();
  const turn = await converseLocally(question, 'ar', [first], dependencies);
  expect(turn.intent).toBe('explain');
  expect(turn.query).toMatchObject({ kind: 'equipment', category: 'espresso_machine', minAmount: 200, amount: 400, currency: 'KWD' });
  expect(turn.answer).toContain('200–400 KWD');
  expect(dependencies.search).not.toHaveBeenCalled();
});
