import { describe, expect, it, vi } from 'vitest';
import { converseLocally } from './local-coffee-assistant';
import { parseCoffeeLessonContent } from './coffee-lesson-content';
import lessons from './coffee-practical-content.json';

describe('practical questions reported from the mobile app', () => {
  const search = vi.fn(async () => ({ documents: [], rates: [] }));
  it.each([
    ['شلون اسوي اسبرسو', 'ar', 'espresso-start'],
    ['كيف أحضر إسبريسو؟', 'ar', 'espresso-start'],
    ['How do I make espresso?', 'en', 'espresso-start'],
    ['جم جرام للاسبرسو وشنو درجة الطحنه له ابيها مو حامضه', 'ar', 'espresso-dose-grind'],
    ['How many grams for espresso and what grind size? I do not want it sour', 'en', 'espresso-dose-grind'],
    ['عندي مكينة لامرزوكو شلون استخدمها', 'ar', 'lamarzocco-first-use'],
    ['عندي ماكينة لا مارزوكو كيف أستخدمها؟', 'ar', 'lamarzocco-first-use'],
    ['I have a La Marzocco machine, how do I use it?', 'en', 'lamarzocco-first-use'],
    ['عندي ماكينة جديدة شلون أستخدمها', 'ar', 'equipment-use-help'],
  ] as const)('answers %s without a failed catalog search', async (question, locale, topic) => {
    search.mockClear();
    const turn = await converseLocally(question, locale, [], { search });
    expect(turn.intent).toBe('guide');
    expect(turn.knowledgeTopic).toBe(topic);
    expect(turn.answer.length).toBeGreaterThan(120);
    expect(turn.sources?.length).toBeGreaterThan(0);
    expect(turn.followUp?.length).toBeGreaterThan(20);
    expect(search).not.toHaveBeenCalled();
    if (topic.startsWith('espresso')) { expect(turn.answer).toContain('18 g'); expect(turn.answer).toContain('36 g'); }
    if (topic === 'espresso-dose-grind') expect(turn.answer).toMatch(/الحموضة|acidity/);
    if (topic === 'lamarzocco-first-use') expect(turn.answer).toContain('Linea Micra');
  });
  it('uses fresh database text for the routed lesson and its follow-up', async () => {
    const row = { ...lessons[0], body_ar: 'هذا شرح تحضير محدّث من قاعدة البيانات، ويجب عرضه بدل النص المدمج عند طرح السؤال نفسه. هذا الدرس يشرح الجرعة والطحن ويطلب تحديد سعة السلة.', more_ar: 'تفصيل عملي جديد من قاعدة البيانات.', status: 'published', requires_review: false };
    const loadLessons = async () => parseCoffeeLessonContent({ lessons: [row], phrases: [] });
    const first = await converseLocally('شلون اسوي اسبرسو', 'ar', [], { search, loadLessons });
    expect(first.answer).toContain(row.body_ar);
    row.more_ar = 'تفصيل أحدث يظهر في السؤال التالي من دون إعادة بناء التطبيق.';
    const next = await converseLocally('اشرح أكثر', 'ar', [first], { search, loadLessons });
    expect(next.answer).toBe(row.more_ar);
  });
  it('keeps espresso context for a short dose/grind question', async () => {
    const first = await converseLocally('شلون اسوي اسبرسو', 'ar', [], { search });
    const next = await converseLocally('جم جرام وشنو درجة الطحنة؟', 'ar', [first], { search });
    expect(next.knowledgeTopic).toBe('espresso-dose-grind');
  });
  it('continues to brewing after the requested machine model without asking it again', async () => {
    const first = await converseLocally('عندي مكينة لامرزوكو شلون استخدمها', 'ar', [], { search });
    const next = await converseLocally('Linea Micra', 'ar', [first], { search });
    expect(next.knowledgeTopic).toBe('espresso-start');
    expect(next.answer).toContain('36 g');
    expect(next.answer).not.toContain('هل هي Linea Mini');
  });
  it('keeps measured sourness in coaching and validates units', async () => {
    const turn = await converseLocally('My espresso is sour, dose 18 yield 36 time 30 seconds', 'en', [], { search });
    expect(turn.intent).toBe('coach');
    expect(turn.coach).toMatchObject({ dose: 18, output: 36, seconds: 30, signal: 'sour' });
  });
  it.each(['أبي وصفات إسبريسو', 'Find espresso recipes', 'وين اشتري ماكينة لامارزوكو', 'Find La Marzocco espresso machine under 3000 USD'])('preserves catalog intent: %s', async question => {
    search.mockClear();
    const turn = await converseLocally(question, 'ar', [], { search });
    expect(turn.intent).toBe('search');
    expect(search).toHaveBeenCalled();
  });
  it('admits a missing explanation and asks for useful context', async () => {
    search.mockClear();
    const turn = await converseLocally('كيف أضبط هذه الخاصية الغريبة في القهوة؟', 'ar', [], { search });
    expect(turn.intent).toBe('help');
    expect(turn.answer).toContain('موثّق');
    expect(search).not.toHaveBeenCalled();
  });
});
