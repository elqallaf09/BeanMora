import { expect, it } from 'vitest';
import { coffeeKnowledgeAnswer, coffeeLearningTopics, coffeeLessonById } from './coffee-knowledge';
import { converseLocally } from './local-coffee-assistant';
const offline = { search: async () => { throw new Error('Education must work offline'); } };
it('offers a sourced bilingual learning path with a useful second explanation', () => {
  const ar = coffeeLearningTopics('ar'), en = coffeeLearningTopics('en');
  expect(ar.length).toBeGreaterThanOrEqual(40);
  expect(new Set(ar.map(t => t.id)).size).toBe(ar.length);
  expect(new Set(ar.map(t => t.group)).size).toBe(7);
  for (const topic of ar) {
    const lesson = coffeeLessonById(topic.id, 'ar')!;
    const english = coffeeLessonById(topic.id, 'en')!;
    expect(lesson.source.url).toMatch(/^https:\/\//);
    expect(lesson.answer.length).toBeGreaterThan(100);
    expect(english.answer.length).toBeGreaterThan(100);
    expect(coffeeKnowledgeAnswer(topic.title, 'ar')?.topic).toBe(topic.id);
    expect(coffeeKnowledgeAnswer(en.find(t => t.id === topic.id)!.title, 'en')?.topic).toBe(topic.id);
    expect(coffeeKnowledgeAnswer('اشرح أكثر', 'ar', topic.id)?.answer).toBe(lesson.more);
    expect(lesson.more).not.toBe(lesson.answer);
  }
});
it.each([
  ['شنو PID بالماكينة؟', 'pid'], ['ليش يصير تشانلنغ؟', 'channeling'],
  ['ما الفرق بين الشفرات المسطحة والمخروطية؟', 'burrs'], ['شلون اعاير الطاحونة؟', 'grinder-calibration'],
  ['ماي الماكينة', 'machine-water'], ['شنو RoR بالحمص؟', 'rate-of-rise'],
  ['الفرقعة الأولى', 'development-time'], ['What does 9 bar mean?', 'pressure'],
  ['What is grinder retention?', 'retention'], ['How do I measure roast color?', 'roast-color'],
  ['Coffee flavor notes', 'flavor-notes'], ['What is a dual boiler?', 'boilers'],
])('answers %s locally', async (question, id) => {
  const locale = /[\u0600-\u06FF]/.test(question) ? 'ar' : 'en';
  const turn = await converseLocally(question, locale, [], offline);
  expect(turn.knowledgeTopic).toBe(id);
  expect(turn.sources?.[0]?.url).toMatch(/^https:\/\//);
});
it('keeps budgets out of scale education and separates manufacturer water limits', () => {
  expect(coffeeKnowledgeAnswer('خل الميزانية ٣٥٠ دولار', 'ar', 'scales')).toBeNull();
  expect(coffeeKnowledgeAnswer('Best espresso machine under 500 USD', 'en')).toBeNull();
  expect(coffeeLessonById('machine-water', 'en')?.answer).toContain('La Marzocco');
  expect(coffeeLessonById('grind-size', 'ar')?.answer).toContain('رقم');
  expect(coffeeLessonById('roast-color', 'ar')?.answer).toContain('الإضاءة');
});
