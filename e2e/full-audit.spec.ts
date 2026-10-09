import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ar from '../messages/ar.json';
import en from '../messages/en.json';

const routeRoot = join(process.cwd(), 'src/app/[locale]');
function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? pages(path) : entry.name === 'page.tsx' ? [path] : [];
  });
}
const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Home starts deferred RSC prefetches after rendering. Finish the inventory
// there so its document stays alive; release-smoke covers real SPA navigation
// from home. Keep every route and every pageerror assertion in this sweep.
const routes = pages(routeRoot).map(path => '/' + relative(routeRoot, path).split(/[\\/]/).slice(0, -1)
  .filter(segment => !segment.startsWith('('))
  .map(segment => segment === '[id]' ? uuid : segment === '[slug]' ? 'locale-fixture' : segment === '[username]' ? 'fixture_barista' : segment)
  .join('/')).sort((a, b) => Number(a === '/home') - Number(b === '/home') || a.localeCompare(b));

async function fixtureSignInAt(page: Page, locale: 'ar' | 'en', path: string) {
  const m = locale === 'ar' ? ar : en;
  // The isolated auth fixture returns the same anonymous user for either flow.
  // Use the real safe return path to land on the target without unloading home
  // during its deferred RSC prefetches. Guest-button behavior is covered in
  // release-smoke.spec.ts; no production credentials or session are involved.
  await page.goto(`/${locale}/login?next=${encodeURIComponent(path)}`);
  await page.getByLabel(m.auth.emailLabel, { exact: true }).fill('fixture@example.test');
  await page.getByLabel(m.auth.passwordLabel, { exact: true }).fill('fixture_password');
  await page.getByRole('button', { name: m.auth.loginButton, exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3000/${locale}${path === '/' ? '' : path}`);
  await page.waitForLoadState('networkidle');
}

for (const locale of ['ar', 'en'] as const) test(`${locale}: every page route renders or enforces its access boundary`, async ({ page }, info) => {
  test.setTimeout(150000);
  const errors: string[] = [], observations: { path: string; status: number; destination: string; ms: number }[] = [];
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  await fixtureSignInAt(page, locale, '/');
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

for (const locale of ['ar', 'en'] as const) test(`${locale}: incorrect-info button opens a usable correction form and failed submissions can be retried`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixtureSignInAt(page, locale, '/beans/locale-fixture');
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

for (const locale of ['ar', 'en'] as const) test(`${locale}: discover filter button opens, applies a method and resets the filters`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixtureSignInAt(page, locale, '/discover?category=beans');
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

for (const locale of ['ar', 'en'] as const) test(`${locale}: onboarding options stay translated through every step`, async ({ page }) => {
  const m = locale === 'ar' ? ar : en, errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixtureSignInAt(page, locale, '/onboarding');
  for (const label of [m.auth.experienceBeginner, m.auth.experienceIntermediate, m.auth.experienceAdvanced, m.auth.experienceBarista]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: m.auth.experienceBeginner, exact: true }).click();
  await page.getByRole('button', { name: m.common.next, exact: true }).click();
  for (const [key, label] of Object.entries(m.onboarding).filter(([key]) => key.startsWith('method'))) {
    await expect(page.getByRole('button', { name: label, exact: true }), key).toBeVisible();
  }
  await page.getByRole('button', { name: m.onboarding.methodV60, exact: true }).click();
  await page.getByRole('button', { name: m.common.next, exact: true }).click();
  for (const [key, label] of Object.entries(m.onboarding).filter(([key]) => key.startsWith('flavor'))) {
    await expect(page.getByRole('button', { name: label, exact: true }), key).toBeVisible();
  }
  await page.getByRole('button', { name: m.onboarding.flavorFruity, exact: true }).click();
  await page.getByRole('button', { name: m.common.next, exact: true }).click();
  for (const [key, label] of Object.entries(m.onboarding).filter(([key]) => key.startsWith('roast'))) {
    await expect(page.getByRole('button', { name: label, exact: true }), key).toBeVisible();
  }
  await expect(page.getByRole('button', { name: m.common.done, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
