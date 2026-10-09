import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const routeRoot = join(process.cwd(), 'src/app/[locale]');
function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? pages(path) : entry.name === 'page.tsx' ? [path] : [];
  });
}
const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const routes = pages(routeRoot).map(path => '/' + relative(routeRoot, path).split(/[\\/]/).slice(0, -1)
  .filter(segment => !segment.startsWith('('))
  .map(segment => segment === '[id]' ? uuid : segment === '[slug]' ? 'locale-fixture' : segment === '[username]' ? 'fixture_barista' : segment)
  .join('/')).sort();

for (const locale of ['ar', 'en']) test(`${locale}: every page route renders or enforces its access boundary`, async ({ page }, info) => {
  test.setTimeout(150000);
  const errors: string[] = [], observations: { path: string; status: number; destination: string; ms: number }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  await page.goto(`/${locale}/login`);
  await page.getByRole('button', { name: locale === 'ar' ? 'الدخول كضيف' : 'Continue as guest', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  for (const route of routes) {
    const path = `/${locale}${route}`, started = Date.now();
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    expect([200, 404], path).toContain(response!.status());
    await expect(page.locator('body'), path).toBeVisible();
    if (route.startsWith('/admin')) {
      // Existing admin guards deny access through a 404, sign-in or home redirect.
      const denied = page.getByRole('heading', { name: '404', exact: true });
      if (response!.status() === 404 || await denied.count()) await expect(denied, path).toBeVisible();
      else expect([`/${locale}/login`, `/${locale}/home`], path).toContain(new URL(page.url()).pathname);
    }
    await page.waitForLoadState('networkidle');
    observations.push({ path, status: response!.status(), destination: new URL(page.url()).pathname, ms: Date.now() - started });
  }
  await info.attach('all-page-routes', { body: JSON.stringify(observations), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('unmatched URLs return a complete document with working bilingual recovery links', async ({ page, request }) => {
  for (const path of ['/en/audit-missing-page', '/ar/audit-missing-page', '/api/audit-missing-route']) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toMatch(/<html\b/);
    expect(html).toMatch(/<body\b/);
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'الرئيسية', exact: true })).toHaveAttribute('href', '/ar');
    await expect(page.getByRole('link', { name: 'Return home', exact: true })).toHaveAttribute('href', '/en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByRole('link', { name: 'Return home', exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
});

for (const locale of ['ar', 'en']) test(`${locale}: incorrect-info button opens a usable correction form and failed submissions can be retried`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/${locale}/login`);
  await page.getByRole('button', { name: locale === 'ar' ? 'الدخول كضيف' : 'Continue as guest', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  await page.goto(`/${locale}/beans/locale-fixture`);
  await page.getByRole('link', { name: locale === 'ar' ? 'إبلاغ عن معلومة غير صحيحة' : 'Report incorrect info', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/beans/locale-fixture/report$`));
  const reason = 'The published origin needs correction.', suggestion = 'Brazil, according to the roaster.';
  await page.getByRole('textbox', { name: locale === 'ar' ? 'ما المعلومة غير الصحيحة؟' : 'What information is incorrect?', exact: true }).fill(reason);
  await page.getByRole('textbox', { name: locale === 'ar' ? 'المعلومة الصحيحة أو رابط المصدر (اختياري)' : 'Correct information or source URL (optional)', exact: true }).fill(suggestion);
  let calls = 0;
  await page.route('**/rest/v1/data_correction_requests?**', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ entity_type: 'bean', entity_id: uuid, reported_by: '00000000-0000-4000-8000-000000000099', reason, suggested_value: suggestion });
    calls++;
    await route.fulfill({ status: calls === 1 ? 503 : 201, contentType: 'application/json', body: JSON.stringify(calls === 1 ? { code: 'isolated_unavailable', message: 'fixture' } : { id: uuid }) });
  });
  const submit = page.getByRole('button', { name: locale === 'ar' ? 'إرسال الملاحظة' : 'Submit correction', exact: true });
  await submit.click();
  await expect(page.getByRole('alert').filter({ hasText: locale === 'ar' ? 'تعذّر إرسال الملاحظة' : 'Could not submit' })).toBeVisible();
  await expect(page.getByText(locale === 'ar' ? 'تم إرسال الملاحظة للمراجعة.' : 'Your correction was submitted for review.', { exact: true })).toHaveCount(0);
  await submit.click();
  await expect(page.getByText(locale === 'ar' ? 'تم إرسال الملاحظة للمراجعة.' : 'Your correction was submitted for review.', { exact: true })).toBeVisible();
  expect(calls).toBe(2);
  expect(errors).toEqual([]);
});

for (const locale of ['ar', 'en']) test(`${locale}: discover filter button opens, applies a method and resets the filters`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/${locale}/login`);
  await page.getByRole('button', { name: locale === 'ar' ? 'الدخول كضيف' : 'Continue as guest', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  await page.goto(`/${locale}/discover?category=beans`);
  const name = locale === 'ar' ? 'الفلاتر' : 'Filters';
  await page.getByRole('button', { name, exact: true }).click();
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'V60', exact: true }).click();
  await dialog.getByRole('button', { name: locale === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters', exact: true }).click();
  await expect(page).toHaveURL(/method=v60/);
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: locale === 'ar' ? 'إعادة تعيين' : 'Reset', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/discover\\?category=beans$`));
  expect(errors).toEqual([]);
});
