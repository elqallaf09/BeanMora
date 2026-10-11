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
      const query = route.request().postDataJSON();
      searches.push(query);
      data = query.p_kind === 'roaster'
        ? [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0', kind: 'roaster', title_ar: query.p_terms.includes('ark') ? 'آرك روسترز' : 'ألتيتيود روسترز', title_en: query.p_terms.includes('ark') ? 'A R K Roasters' : 'Altitude Roasters', search_text: query.p_terms.includes('ark') ? 'آرك روسترز A R K Roasters KW' : 'Altitude Roasters KW', summary_ar: '', summary_en: '', category: null, methods: [], facts: { country: 'KW' }, offers: [], source_url: query.p_terms.includes('ark') ? 'https://www.ark.com.kw/pages/about' : 'https://altituderoasters.co/en/' }]
        : [300, 400].map((amount, i) => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${i}`, kind: 'equipment', title_ar: `ماكينة ${i + 1}`, title_en: `Machine ${i + 1}`, search_text: 'espresso machine manual', summary_ar: '', summary_en: '', category: 'espresso_machine', methods: ['espresso'], facts: { operation: ['يدوي','Manual'], ...(i ? {} : { pressure_gauge: ['نعم','Yes'] }) }, offers: [{ amount, currency: 'USD', checked_at: new Date().toISOString(), region: 'US', url: 'https://seller.example/machine', availability: 'in_stock' }], source_url: 'https://seller.example/machine' }));
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
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
test('Kuwaiti roaster search expands the country code before retrieval and displays the result', async ({ page }) => {
  const network = await openAssistant(page);
  await ask(page, 'محامص بالكويت');
  await expect(page.getByTestId('assistant-result')).toContainText('ألتيتيود روسترز');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'roaster', p_terms: expect.arrayContaining(['kuwait', 'kw']) })]);
  expect(network.providerCalls()).toBe(0);
});
test('published spaced roaster names retain an explicit catalog search instead of returning every roaster', async ({ page }) => {
  const network = await openAssistant(page);
  await ask(page, 'محامص A R K');
  await expect(page.getByTestId('assistant-result')).toContainText('آرك روسترز');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'roaster', p_terms: expect.arrayContaining(['ark', 'a r k']) })]);
  expect(network.providerCalls()).toBe(0);
});
for (const english of [false, true]) test(`symptoms, water measurements and new lessons work offline (${english ? 'en' : 'ar'})`, async ({ page }) => {
  const network = await openAssistant(page, true);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'My V60 is sour after changing water' : 'قهوتي V60 حامضة بعد تغيير الماء', english);
  await expect(panel.getByRole('button', { name: 'Barista Hustle — Coffee Compass', exact: true })).toBeVisible();
  await ask(page, english ? 'dose 18 water 288 150 seconds' : 'جرعة 18 الماء 288 الوقت 150 ثانية', english);
  await expect(panel).toContainText('1:16');
  await ask(page, english ? 'What is cold brew?' : 'الكولد برو والاستخلاص البارد', english);
  await expect(panel.getByRole('button', { name: 'HARIO — Mizudashi', exact: true })).toBeVisible();
  await ask(page, english ? 'Tell me more' : 'اشرح أكثر', english);
  await expect(panel).toContainText(english ? 'Not every cold brew is a concentrate' : 'لا تفترض أن كل كولد برو مركز');
  expect(network.searches).toHaveLength(0);
  expect(network.providerCalls()).toBe(0);
});
