import { afterEach, describe, expect, it } from 'vitest';
import { applyRemoteCoffeeLessons, coffeeKnowledgeAnswer, coffeeLearningTopics, coffeeLessonById } from './coffee-knowledge';
import { converseLocally } from './local-coffee-assistant';
const offline = { search: async () => { throw new Error('Education must work offline'); } };
it.each(['بارد', 'باردة', 'قهوه باردة', 'باريستا', 'اختبار'])('does not read a partial Arabic word as pressure: %s', question => {
  expect(coffeeKnowledgeAnswer(question, 'ar')?.topic).not.toBe('pressure');
});
it.each(['شنو يعني 9 بار؟', 'شنو البار؟', 'القياس بالبار', 'ضغط 9بار', 'What does 9 bars mean?'])('still recognizes a real pressure question: %s', question => {
  expect(coffeeKnowledgeAnswer(question, 'ar')?.topic).toBe('pressure');
});
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
  ['حمص', 'roast-stages'], ['شلون احمص البن؟', 'roast-stages'],
  ['الفرقعة الأولى', 'development-time'], ['What does 9 bar mean?', 'pressure'],
  ['What is grinder retention?', 'retention'], ['How do I measure roast color?', 'roast-color'],
  ['Coffee flavor notes', 'flavor-notes'], ['What is a dual boiler?', 'boilers'],
  ['القهوة المثلجة وماء التحضير والثلج', 'flash-brew'], ['What is cold brew?', 'cold-brew'],
  ['شنو البايباس؟', 'bypass-dilution'], ['تكبير وصفة الترشيح لكوبين', 'batch-scaling'],
  ['اشرح النقع والفرنش برس', 'immersion-percolation'], ['What is immersion brewing?', 'immersion-percolation'],
  ['اشرح ضبط وصفة الإسبريسو', 'espresso-dial-in'], ['Dialing in espresso', 'espresso-dial-in'],
  ['اشرح الموكا بوت وصمام الأمان', 'moka-safety'], ['Moka pot and safety valve', 'moka-safety'],
])('answers %s locally', async (question, id) => {
  const locale = /[\u0600-\u06FF]/.test(question) ? 'ar' : 'en';
  const turn = await converseLocally(question, locale, [], offline);
  expect(turn.knowledgeTopic).toBe(id);
  expect(turn.sources?.[0]?.url).toMatch(/^https:\/\//);
});
it('attributes the new immersion lesson to both reviewed primary sources', () => {
  const lesson = coffeeLessonById('immersion-percolation', 'en')!;
  expect(lesson.sources.map(source => new URL(source.url).hostname)).toEqual(['www.aboutcoffee.org', 'www.hario-usa.com']);
});
it('keeps budgets out of scale education and separates manufacturer water limits', () => {
  expect(coffeeKnowledgeAnswer('خل الميزانية ٣٥٠ دولار', 'ar', 'scales')).toBeNull();
  expect(coffeeKnowledgeAnswer('Best espresso machine under 500 USD', 'en')).toBeNull();
  expect(coffeeLessonById('machine-water', 'en')?.answer).toContain('La Marzocco');
  expect(coffeeLessonById('grind-size', 'ar')?.answer).toContain('رقم');
  expect(coffeeLessonById('roast-color', 'ar')?.answer).toContain('الإضاءة');
});
it.each([
  ['شلون أحضر V60؟', 'v60-technique'], ['How do I brew a V60?', 'v60-technique'],
  ['شنو أفضل نسبة قهوة للماء؟', 'brew-ratio'], ['What is a good brew ratio?', 'brew-ratio'],
  ['شنو الراو سبن؟', 'pour-agitation'], ['ليش ينسد الفلتر والتصفية بطيئة؟', 'drawdown'],
  ['شلون أستخدم الإيروبرس؟', 'aeropress'], ['Chemex instructions', 'chemex'],
  ['القهوة التركية', 'turkish-coffee'], ['آداب القهوة العربية', 'arabic-coffee'],
  ['شنو الإسبريسو؟', 'espresso-basics'], ['What is espresso?', 'espresso-basics'],
  ['شنو الفرق بين الريستريتو واللونغو؟', 'espresso-ratio'], ['What is crema?', 'crema'],
  ['شنو الفلات وايت؟', 'espresso-drinks'], ['كم كافيين بالقهوة؟', 'caffeine'],
  ['How much caffeine is safe?', 'caffeine'], ['مناطق زراعة البن', 'origins'],
  ['شنو يعني قهوة مختصة؟', 'specialty'], ['Single origin or blend?', 'blends'],
  ['شنو فايدة صمام الكيس؟', 'freshness'], ['Drum roaster or air roaster?', 'roaster-types'],
  ['شلون أحسب فاقد الوزن؟', 'roast-weight-loss'], ['شنو الفرقعة الثانية؟', 'second-crack'],
  ['What is second crack?', 'second-crack'], ['شنو الفرق بين تحميص الإسبريسو والفلتر؟', 'roast-for-brew'],
  ['هل دخان التحميص خطر؟', 'roast-safety'], ['شنو نقطة التحول؟', 'turning-point'],
  ['What is a between-batch protocol?', 'between-batch'], ['Sample roasting', 'sample-roast'],
])('covers the V60, espresso, bean and roasting expansion: %s', async (question, id) => {
  const locale = /[؀-ۿ]/.test(question) ? 'ar' : 'en';
  const turn = await converseLocally(question, locale, [], offline);
  expect(turn.knowledgeTopic).toBe(id);
  expect(turn.sources?.[0]?.url).toMatch(/^https:\/\//);
});
it('keeps earlier routing intact after the expansion', async () => {
  expect(coffeeLearningTopics('ar').length).toBeGreaterThanOrEqual(80);
  expect(coffeeKnowledgeAnswer('القهوة منزوعة الكافيين', 'ar')?.topic).toBe('decaf');
  expect(coffeeKnowledgeAnswer('الفرقعة الأولى', 'ar')?.topic).toBe('development-time');
  expect(coffeeKnowledgeAnswer('ليش نسوي بلوم؟', 'ar')?.topic).toBe('bloom');
  expect((await converseLocally('احسب 18 غرام بنسبة 1:16', 'ar', [], offline)).intent).toBe('calculate');
  expect((await converseLocally('قهوتي V60 حامضة', 'ar', [], offline)).intent).toBe('coach');
  expect(coffeeLessonById('caffeine', 'en')?.answer).toContain('400 mg');
});
describe('database lessons', () => {
  const row = {
    id: 'siphon', course_group: 'brewing', title_ar: 'السايفون', title_en: 'Siphon brewing',
    body_ar: 'س'.repeat(120), body_en: 'A siphon brewer uses vapor pressure and vacuum to move water. '.repeat(3),
    more_ar: 'جرّب تثبيت الحرارة وقارن الطعم.', more_en: 'Hold heat steady and compare taste.',
    source_title: 'Example — Siphon', source_url: 'https://example.com/siphon',
    supporting_sources: [{ title: 'Second', url: 'https://example.com/2' }, { title: 'Bad', url: 'http://example.com/insecure' }],
    keywords: ['سايفون', 'Siphon', 'x', '(.*)+$'], priority: 110,
  };
  afterEach(() => { applyRemoteCoffeeLessons(null); });
  it('adds a published lesson, routes it by plain phrases and keeps it sourced', async () => {
    const before = coffeeLearningTopics('ar').length;
    expect(applyRemoteCoffeeLessons([row])).toBe(1);
    expect(coffeeLearningTopics('ar').length).toBe(before + 1);
    const turn = await converseLocally('شلون أستخدم السايفون؟', 'ar', [], offline);
    expect(turn.knowledgeTopic).toBe('siphon');
    expect(turn.sources?.map(source => source.url)).toEqual(['https://example.com/siphon', 'https://example.com/2']);
    expect(coffeeKnowledgeAnswer('Siphon brewing', 'en')?.topic).toBe('siphon');
    expect(coffeeKnowledgeAnswer('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!', 'en')).toBeNull();
  });
  it('overrides bundled text by id while keeping reviewed routing', () => {
    applyRemoteCoffeeLessons([{ ...row, id: 'crema', keywords: [] }]);
    expect(coffeeLessonById('crema', 'en')?.answer).toContain('siphon brewer');
    expect(coffeeKnowledgeAnswer('What is crema?', 'en')?.topic).toBe('crema');
  });
  it('skips invalid rows and restores the bundle', () => {
    const bundled = coffeeLessonById('crema', 'en')?.answer;
    expect(applyRemoteCoffeeLessons([
      { ...row, id: 'Bad Id' }, { ...row, course_group: 'gossip' }, { ...row, source_url: 'http://example.com' },
      { ...row, body_en: 'short' }, null, 'text', { ...row, id: 'crema', body_ar: 5 },
    ])).toBe(0);
    expect(coffeeLessonById('crema', 'en')?.answer).toBe(bundled);
    applyRemoteCoffeeLessons([row]);
    expect(applyRemoteCoffeeLessons({ not: 'an array' })).toBe(0);
    expect(coffeeLessonById('siphon', 'en')).toBeNull();
  });
});
