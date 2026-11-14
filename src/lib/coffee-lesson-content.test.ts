import { expect, it, vi } from 'vitest';
import { parseCoffeeLessonContent } from './coffee-lesson-content';
import { coffeeKnowledgeAnswer, coffeeLearningTopics } from './coffee-knowledge';
import { converseLocally } from './local-coffee-assistant';

const row = {
  id: 'geisha-variety', course_group: 'beans', title_ar: 'سلالة الجيشا', title_en: 'Geisha variety',
  body_ar: 'الجيشا سلالة قهوة، وليست طريقة معالجة. قد تظهر فيها روائح زهرية، وتتأثر النتيجة ببيئة الزراعة والتحميص والتحضير.',
  body_en: 'Geisha is a coffee variety, not a processing method. Floral aromas may be present; growing conditions, roasting and brewing affect the result.',
  more_ar: 'قارن عينتين بالوصفة والماء نفسيهما، وسجّل الرائحة والقوام.',
  more_en: 'Compare two samples with the same recipe and water, recording aroma and body.',
  source_title: 'World Coffee Research', source_url: 'https://varieties.worldcoffeeresearch.org/',
  supporting_sources: [], keywords: ['جيشا', 'geisha'], priority: 100,
  status: 'published', requires_review: false,
};
const payload = (overrides = {}) => ({ lessons: [{ ...row, ...overrides }], phrases: [{ lesson_id: row.id, phrase: 'قيشا', status: 'published' }] });
it('answers entirely new database lessons and dialects, in both languages, including follow-ups', async () => {
  const content = parseCoffeeLessonContent(payload());
  const search = vi.fn(async () => ({ documents: [], rates: [] }));
  const deps = { search, loadLessons: async () => content };
  const ar = await converseLocally('شنو قيشا؟', 'ar', [], deps);
  expect(ar.knowledgeTopic).toBe(row.id);
  expect(ar.answer).toContain(row.body_ar);
  const en = await converseLocally('What is Geisha?', 'en', [], deps);
  expect(en.answer).toContain(row.body_en);
  expect((await converseLocally('Tell me more', 'en', [en], deps)).answer).toBe(row.more_en);
  expect(coffeeLearningTopics('ar', content).filter(topic => topic.id === row.id)).toHaveLength(1);
  expect(search).not.toHaveBeenCalled();
});
it('takes edited database content over a bundled lesson without mutating the bundled fallback', () => {
  const content = parseCoffeeLessonContent(payload({ id: 'processing-comparison', keywords: ['تقشير رطب'] }));
  expect(coffeeKnowledgeAnswer('تقشير رطب', 'ar', undefined, undefined, content)?.answer).toContain(row.body_ar);
  expect(coffeeKnowledgeAnswer('تقشير رطب', 'ar')?.answer).toContain('القشرة الرقّية');
});
it.each([
  { status: 'draft' }, { status: 'archived' }, { requires_review: true }, { requires_review: 'false' },
  { source_url: 'javascript:alert(1)' }, { source_url: 'https://user:pass@example.com' },
  { body_ar: 'short' }, { priority: 1000 }, { course_group: 'unknown' }, { keywords: ['x'.repeat(121)] },
])('rejects unreviewed or malformed lesson records: %j', invalid => {
  expect(parseCoffeeLessonContent(payload(invalid)).lessons).toEqual([]);
});
it('treats keywords literally and does not match inside unrelated words', () => {
  const content = parseCoffeeLessonContent(payload({ keywords: ['(a+)+$', 'geisha'] }));
  expect(coffeeKnowledgeAnswer('aaaaaaaaaa', 'en', undefined, undefined, content)).toBeNull();
  expect(coffeeKnowledgeAnswer('notgeisha', 'en', undefined, undefined, content)).toBeNull();
  expect(coffeeKnowledgeAnswer('(a+)+$', 'en', undefined, undefined, content)?.topic).toBe(row.id);
});
it('supports phrases for bundled lessons, ignores withdrawn and orphan phrases, and filters unsafe supporting sources', () => {
  const content = parseCoffeeLessonContent({ lessons: [{ ...row, supporting_sources: [
    { title: 'Unsafe source', url: 'javascript:alert(1)' }, { title: 'Safe source', url: 'https://example.com/coffee' },
  ] }], phrases: [
    { lesson_id: 'storage', phrase: 'خزن حبوبك', status: 'published' },
    { lesson_id: row.id, phrase: 'سلالة مسحوبة', status: 'archived' },
    { lesson_id: 'missing-lesson', phrase: 'درس مفقود', status: 'published' },
  ] });
  expect(coffeeKnowledgeAnswer('خزن حبوبك', 'ar', undefined, undefined, content)?.topic).toBe('storage');
  expect(coffeeKnowledgeAnswer('سلالة مسحوبة', 'ar', undefined, undefined, content)?.topic).not.toBe(row.id);
  expect(coffeeKnowledgeAnswer('درس مفقود', 'ar', undefined, undefined, content)).toBeNull();
  expect(coffeeKnowledgeAnswer('geisha', 'en', undefined, undefined, content)?.sources).toHaveLength(2);
});
it('keeps calculations offline and coffee shopping out of lesson answers', async () => {
  const loadLessons = vi.fn(async () => parseCoffeeLessonContent(payload()));
  const search = vi.fn(async () => ({ documents: [], rates: [] }));
  const deps = { loadLessons, search };
  expect((await converseLocally('Calculate 18 g at 1:16', 'en', [], deps)).intent).toBe('calculate');
  expect(loadLessons).not.toHaveBeenCalled();
  expect((await converseLocally('أبي بن جيشا', 'ar', [], deps)).knowledgeTopic).toBeUndefined();
  expect(search).toHaveBeenCalled();
});
