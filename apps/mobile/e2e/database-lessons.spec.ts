import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import { setLanguage } from './settings';

const lesson = {
  id: 'database-only-lesson', course_group: 'beans', title_ar: 'درس من قاعدة البيانات', title_en: 'A database lesson',
  body_ar: 'محتوى منشور من قاعدة البيانات للاختبار. يشرح هذا الدرس الفرق بين سلالة البن وطريقة المعالجة، ويبين أثر التحميص والتحضير على النتيجة.',
  body_en: 'Published database content for this test. This lesson explains the difference between coffee variety and processing, and the effects of roasting and brewing.',
  more_ar: 'تطبيق من قاعدة البيانات: قارن عينتين بنفس الماء والوصفة.',
  more_en: 'Database exercise: compare two samples using the same water and recipe.',
  source_title: 'Editorial source', source_url: 'https://example.com/coffee-lesson', supporting_sources: [],
  keywords: ['سلالة اختبارية', 'database variety'], priority: 100, status: 'published', requires_review: false,
};
async function ask(page: Page, question: string, ar = true) {
  await page.getByLabel(ar ? 'سؤالك عن القهوة' : 'Your coffee question', { exact: true }).fill(question);
  await page.getByRole('button', { name: ar ? 'إرسال' : 'Send', exact: true }).click();
  await expect(page.getByLabel(ar ? 'سؤالك عن القهوة' : 'Your coffee question', { exact: true })).toHaveValue('');
  return page.getByTestId('assistant-turn').last();
}
for (const locale of ['ar', 'en'] as const) test(`${locale}: database edits appear on the next question and remain usable offline`, async ({ page }) => {
  const ar = locale === 'ar';
  let revision = 1, online = true, published = true, truncated = false;
  const lessonRequests: URL[] = [];
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const url = new URL(route.request().url());
    const lessons = url.pathname.endsWith('/coffee_lessons');
    const phrases = url.pathname.endsWith('/coffee_lesson_phrases');
    if (lessons || phrases) {
      lessonRequests.push(url);
      if (!online) return route.abort();
    }
    const data = !published ? [] : lessons ? [{ ...lesson, body_ar: lesson.body_ar + ` مراجعة ${revision}`, body_en: lesson.body_en + ` Revision ${revision}` }]
      : phrases ? [{ lesson_id: lesson.id, phrase: 'قيشا تجريبية', status: 'published' }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': data.length ? (truncated ? '0-0/2' : '0-0/1') : '*/0', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  });
  await page.goto('/');
  if (!ar) await setLanguage(page, 'en');
  await openCoffeeShortcut(page, ar ? 'خبير القهوة' : 'Coffee expert');
  const question = ar ? 'شنو قيشا تجريبية؟' : 'What is a database variety?';
  await expect(await ask(page, question, ar)).toContainText(ar ? 'مراجعة 1' : 'Revision 1');
  revision = 2;
  await expect(await ask(page, question, ar)).toContainText(ar ? 'مراجعة 2' : 'Revision 2');
  await expect(await ask(page, ar ? 'اشرح أكثر' : 'Tell me more', ar)).toContainText(ar ? lesson.more_ar : lesson.more_en);
  expect(lessonRequests.filter(url => url.pathname.endsWith('/coffee_lessons'))).toHaveLength(3);
  for (const url of lessonRequests) {
    expect(url.searchParams.get('status')).toBe('eq.published');
    if (url.pathname.endsWith('/coffee_lessons')) expect(url.searchParams.get('requires_review')).toBe('eq.false');
  }
  revision = 3; truncated = true;
  await expect(await ask(page, question, ar)).toContainText(ar ? 'مراجعة 2' : 'Revision 2');
  truncated = false;
  // Reload the app, losing module memory, to verify the persistent offline copy.
  online = false;
  await page.reload();
  await openCoffeeShortcut(page, ar ? 'خبير القهوة' : 'Coffee expert');
  await expect(await ask(page, question, ar)).toContainText(ar ? 'مراجعة 2' : 'Revision 2');
  online = true; published = false;
  await expect(await ask(page, question, ar)).not.toContainText(ar ? lesson.body_ar : lesson.body_en);
  online = false;
  await expect(await ask(page, question, ar)).not.toContainText(ar ? lesson.body_ar : lesson.body_en);
});
