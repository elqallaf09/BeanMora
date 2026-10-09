import { expect, test, type Page } from '@playwright/test';
import { setLanguage } from './settings';

const equipmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function fixtures(page: Page) {
  const queries: Record<string, unknown>[] = [];
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    const document = { id: equipmentId, kind: 'equipment', title_ar: 'ماكينة الاختبار', title_en: 'Test espresso machine', summary_ar: 'ماكينة إسبريسو يدوية', summary_en: 'Manual espresso machine', category: 'espresso_machine', methods: ['espresso'], facts: { operation: ['يدوي','Manual'] }, offers: [{ amount: 399, currency: 'USD', checked_at: new Date().toISOString(), url: 'https://seller.example/machine', region: 'US', availability: 'in_stock' }], search_text: 'espresso machine manual', source_url: 'https://seller.example/machine', verified_at: new Date().toISOString(), slug: null };
    let data: unknown = [];
    if (path.endsWith('/functions/v1/coffee-assistant')) data = { status: 'ok', conversation_enabled: false };
    if (path.endsWith('/equipment_models')) data = [{ id: equipmentId, name: 'Test espresso machine', category: 'espresso_machine', requires_review: false, specifications: { catalog: { schema_version: 1, name_ar: 'ماكينة الاختبار' } } }];
    if (path.endsWith('/rpc/search_coffee_assistant')) { queries.push(route.request().postDataJSON()); data = [document]; }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  });
  return queries;
}

for (const width of [390, 800]) {
  test(`appearance persists and settings preserve equipment detail (${width})`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 }); await fixtures(page); await page.goto('/');
    await page.getByRole('button', { name: 'أدوات القهوة', exact: true }).click();
    await expect(page.getByRole('button', { name: 'إضافة إلى معداتي', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ماكينة الاختبار', exact: true }).click();
    await page.getByRole('button', { name: 'الإعدادات', exact: true }).first().click();
    const panel = page.getByTestId('settings-screen');
    await panel.getByRole('button', { name: 'ليلي', exact: true }).click();
    await panel.getByRole('button', { name: 'English', exact: true }).click();
    await page.screenshot({ path: info.outputPath('settings-dark.png') });
    await panel.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Test espresso machine', exact: true })).toBeVisible();
    await expect(page.getByTestId('app-header')).toBeVisible();
    expect(await page.getByTestId('app-header').evaluate(el => getComputedStyle(el.parentElement!).backgroundColor)).toBe('rgb(21, 18, 15)');
    await page.reload();
    await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
    await expect(panel.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await panel.getByRole('button', { name: 'Light', exact: true }).click();
    await panel.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('button', { name: 'coffeeHO', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`catalog assistant preserves budget currency and displays source (${width})`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 }); const queries = await fixtures(page); await page.goto('/');
    await setLanguage(page, 'en');
    await page.getByRole('button', { name: 'Coffee expert', exact: true }).click();
    await expect(page.getByText('From choosing beans to dialing in your cup.', { exact: true })).toBeVisible();
    await page.getByLabel('Your coffee question', { exact: true }).fill('Espresso machine under 480 USD');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByTestId('assistant-result')).toContainText('Test espresso machine');
    await expect(page.getByTestId('assistant-result')).toContainText('399 USD');
    await expect(page.getByTestId('assistant-result').getByRole('button', { name: 'Original source', exact: true })).toBeVisible();
    expect(queries.at(-1)?.p_kind).toBe('equipment');
    expect(queries.at(-1)?.p_category).toBe('espresso_machine');
    await page.screenshot({ path: info.outputPath('assistant-result.png') });
    await page.getByTestId('assistant-result').getByRole('button', { name: 'View details', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Test espresso machine', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByTestId('assistant-result')).toContainText('399 USD');
    await page.getByRole('button', { name: 'New conversation', exact: true }).click();
    await expect(page.getByTestId('assistant-result')).toHaveCount(0);
    await page.getByLabel('Your coffee question', { exact: true }).fill('Espresso machine under 480');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByTestId('coffee-assistant')).toContainText('Which budget currency');
    await expect(page.getByTestId('assistant-result')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
