import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import lessons from '../src/core/coffee-practical-content.json';
import { setLanguage } from './settings';

async function ask(page: Page, text: string, ar: boolean) {
  const input = page.getByLabel(ar ? 'سؤالك عن القهوة' : 'Your coffee question', { exact: true });
  await input.fill(text);
  await page.getByRole('button', { name: ar ? 'إرسال' : 'Send', exact: true }).click();
  await expect(input).toHaveValue('');
  return page.getByTestId('assistant-turn').last();
}
for (const ar of [true, false]) test(`practical espresso and machine questions ${ar ? 'ar' : 'en'}`, async ({ page }, info) => {
  let searches = 0;
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes('assistant') || path.includes('search_catalog')) searches++;
    const data = path.endsWith('/coffee_lessons') ? lessons.map(row => ({ ...row, status: 'published', requires_review: false })) : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data), headers: { 'content-range': data.length ? `0-${data.length-1}/${data.length}` : '*/0', 'access-control-expose-headers': 'content-range' } });
  });
  await page.goto('/');
  if (!ar) await setLanguage(page, 'en');
  await openCoffeeShortcut(page, ar ? 'خبير القهوة' : 'Coffee expert');
  const first = await ask(page, ar ? 'شلون اسوي اسبرسو' : 'How do I make espresso?', ar);
  await expect(first).toContainText('18 g');
  await expect(first).toContainText('36 g');
  await expect(first).toContainText(ar ? 'خطوة بخطوة' : 'step by step');
  const machine = await ask(page, ar ? 'عندي مكينة لامرزوكو شلون استخدمها' : 'I have a La Marzocco machine, how do I use it?', ar);
  await expect(machine).toContainText('Linea Mini');
  await expect(machine).toContainText('Linea Micra');
  const grind = await ask(page, ar ? 'جم جرام للاسبرسو وشنو درجة الطحنه له ابيها مو حامضه' : 'How many grams for espresso and what grind size? I do not want it sour', ar);
  await expect(grind).toContainText(ar ? 'الجرعة' : 'Dose');
  await expect(grind).toContainText(ar ? 'الطحن' : 'Grind');
  await expect(grind).toContainText(ar ? 'الحموضة' : 'acidity');
  await expect(grind).not.toContainText(ar ? 'لم أجد' : 'No published');
  expect(searches).toBe(0);
  await page.screenshot({ path: info.outputPath(`practical-espresso-${ar ? 'ar' : 'en'}.png`), animations: 'disabled' });
});

