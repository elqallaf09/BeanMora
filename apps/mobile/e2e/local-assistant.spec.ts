import { expect, test, type Page } from '@playwright/test';
import { setLanguage } from './settings';

async function openAssistant(page: Page, offlineCatalog = false) {
  let providerCalls = 0;
  const searches: unknown[] = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (/openai|anthropic|generativelanguage|functions\/v1\/coffee-assistant/.test(url)) { providerCalls++; return route.abort(); }
    if (!url.startsWith('https://mobilefixture.supabase.co')) return route.continue();
    const path = new URL(url).pathname;
    if (offlineCatalog && /search_coffee_assistant|catalog_currency_rates/.test(path)) return route.abort();
    let data: unknown = [];
    if (path.endsWith('/rpc/search_coffee_assistant')) {
      searches.push(route.request().postDataJSON());
      data = [300, 400].map((amount, i) => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${i}`, kind: 'equipment', title_ar: `ماكينة ${i + 1}`, title_en: `Machine ${i + 1}`, search_text: 'espresso machine manual', summary_ar: '', summary_en: '', category: 'espresso_machine', methods: ['espresso'], facts: { operation: ['يدوي','Manual'], ...(i ? {} : { pressure_gauge: ['نعم','Yes'] }) }, offers: [{ amount, currency: 'USD', checked_at: new Date().toISOString(), region: 'US', url: 'https://seller.example/machine', availability: 'in_stock' }], source_url: 'https://seller.example/machine' }));
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  await page.getByRole('button', { name: 'خبير القهوة', exact: true }).click();
  return { providerCalls: () => providerCalls, searches };
}
async function ask(page: Page, question: string, english = false) {
  await page.getByLabel(english ? 'Your coffee question' : 'سؤالك عن القهوة', { exact: true }).fill(question);
  await page.getByRole('button', { name: english ? 'Send' : 'إرسال', exact: true }).click();
}

test('Arabic conversation clarifies currency, compares and resolves references without provider requests', async ({ page }) => {
  const network = await openAssistant(page);
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, 'أبي ماكينة إسبريسو تحت ٤٨٠');
  await expect(panel).toContainText('حدد عملة الميزانية');
  expect(network.searches).toHaveLength(0);
  await panel.getByRole('button', { name: 'USD', exact: true }).click();
  await expect(page.getByTestId('assistant-result')).toHaveCount(2);
  await panel.getByRole('button', { name: 'قارن الأول والثاني', exact: true }).click();
  await expect(panel).toContainText('أقارن المواصفات المنشورة');
  await expect(panel).toContainText('غير مذكور في المصدر');
  await ask(page, 'اشرح الثاني');
  await expect(page.getByTestId('assistant-result')).toHaveCount(1);
  expect(network.searches).toHaveLength(1);
  expect(network.providerCalls()).toBe(0);
  await panel.getByRole('button', { name: 'محادثة جديدة', exact: true }).click();
  await ask(page, 'اشرح الثاني');
  await expect(panel).toContainText('ابحث عن الخيارات أولًا');
  await expect(page.getByTestId('assistant-result')).toHaveCount(0);
});
for (const width of [320, 800]) {
  test(`offline calculations keep context and distinguish espresso yield (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const network = await openAssistant(page, true);
    await setLanguage(page, 'en');
    await ask(page, 'Calculate 18 g at 1:16', true);
    const panel = page.getByTestId('coffee-assistant');
    await expect(panel).toContainText('288 g');
    await panel.getByRole('button', { name: 'Make it 20 g', exact: true }).click();
    await expect(panel).toContainText('320 g');
    await ask(page, 'Espresso 18 g 1:2', true);
    await expect(panel).toContainText('Target espresso beverage yield: 36 g');
    expect(network.searches).toHaveLength(0);
    expect(network.providerCalls()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('brewing guidance remains available when the catalog cannot be reached', async ({ page }) => {
  const network = await openAssistant(page, true);
  await ask(page, 'أبي ماكينة اسبريسو');
  const panel = page.getByTestId('coffee-assistant');
  await expect(panel).toContainText('تعذّر الوصول لبيانات الكتالوغ');
  await expect(page.getByLabel('سؤالك عن القهوة', { exact: true })).toHaveValue('أبي ماكينة اسبريسو');
  await ask(page, 'قهوتي حامضة');
  await expect(panel).toContainText('تستخدم إسبريسو أم V60');
  await panel.getByRole('button', { name: 'V60', exact: true }).click();
  await expect(panel).toContainText('أنعم قليلًا');
  await expect(panel.getByRole('button', { name: 'Barista Hustle — Coffee Compass', exact: true })).toBeVisible();
  expect(network.providerCalls()).toBe(0);
});
