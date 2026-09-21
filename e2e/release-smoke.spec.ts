import { test, expect, type Page } from '@playwright/test';
import ar from '../messages/ar.json';
import en from '../messages/en.json';
import brewingAr from '../messages/brewing/ar.json';
import brewingEn from '../messages/brewing/en.json';
import recAr from '../messages/recommendations/ar.json';
import recEn from '../messages/recommendations/en.json';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, context }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page)!.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}
async function guest(page: Page, locale: string) {
  await page.goto(`/${locale}/login`);
  await page.getByRole('button', {name: locale === 'ar' ? 'الدخول كضيف' : 'Continue as guest', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  await expect(page.locator('main')).toBeVisible();
  // The next step deliberately performs a full document navigation. Drain the
  // local fixture's RSC prefetch first: WebKit reports cancelled document fetches
  // as access-control errors. Do not filter or suppress real page errors.
  await page.waitForLoadState('networkidle');
}
for (const locale of ['ar', 'en'] as const) {
  const m = locale === 'ar' ? ar : en;
  const brew = locale === 'ar' ? brewingAr : brewingEn;
  const rec = locale === 'ar' ? recAr : recEn;
  test(`${locale}: password controls, language direction and security headers`, async ({ page }) => {
    const response = await page.goto(`/${locale}/login`);
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    expect(response?.headers()['x-frame-options']).toBe('DENY');
    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response?.headers()['x-powered-by']).toBeUndefined();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    const input = page.getByLabel(locale === 'ar' ? 'كلمة المرور' : 'Password', {exact:true});
    await input.fill('test-only-no-login');
    await page.getByRole('button',{name:locale === 'ar' ? 'إظهار كلمة المرور' : 'Show password',exact:true}).click();
    await expect(input).toHaveAttribute('type','text');
    await expect(input).toHaveValue('test-only-no-login');
    await page.getByRole('button',{name:locale === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password',exact:true}).click();
    await expect(input).toHaveAttribute('type','password');
    await noOverflow(page);
  });
  test(`${locale}: admin route remains protected with middleware bypass header`, async ({ page }) => {
    await page.setExtraHTTPHeaders({'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'});
    await page.goto(`/${locale}/admin`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
  });
  test(`${locale}: guest recommendations filters and mobile navigation`, async ({ page }) => {
    await guest(page,locale);
    await page.goto(`/${locale}/recommendations`);
    await expect(page.getByRole('heading',{name:rec.title,exact:true})).toBeVisible();
    await expect(page.getByText(rec.noCoffee,{exact:true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.locator('select[name="method"]').selectOption('v60');
    await page.getByRole('button',{name:rec.apply,exact:true}).click();
    await expect(page).toHaveURL(/method=v60/);
    await expect(page.locator('select[name="method"]')).toHaveValue('v60');
    await noOverflow(page);
    const denied = await page.context().newPage();
    denied.on('pageerror', error => errors.get(page)!.push(error.message));
    try {
      await denied.goto(`/${locale}/admin/import`);
      await expect(denied.getByRole('heading',{name:'404',exact:true})).toBeVisible();
    } finally { await denied.close(); }
    await page.waitForLoadState('networkidle');
  });
  test(`${locale}: skipped timer has no invented duration or ratings and guest cannot save`, async ({ page }) => {
    await guest(page,locale);
    await page.goto(`/${locale}/v60/brew`);
    await page.getByRole('button',{name:m.v60.controlsSkip,exact:true}).click();
    await page.getByRole('button',{name:m.v60.feedbackTitle,exact:true}).click();
    await expect(page.getByText(brew.skippedTime,{exact:true})).toBeVisible();
    await expect(page.locator('input[name="seconds"]')).toHaveValue('');
    await expect(page.locator('select[name="outcome"]')).toHaveValue('');
    await expect(page.locator('select[name="overall_rating"]')).toHaveValue('');
    await expect(page.locator('input[name="share"]')).toHaveCount(0);
    await page.locator('select[name="outcome"]').selectOption('good');
    await page.locator('select[name="status"]').selectOption('brewed_as_written');
    await page.locator('input[name="brewed"]').check();
    let rpcRequests = 0;
    page.on('request', request => { if(request.url().includes('/rest/v1/rpc/')) rpcRequests++; });
    await page.getByRole('button',{name:brew.save,exact:true}).click();
    // Next also has a route-announcer role=alert; assert the form's own alert.
    await expect(page.locator('form').getByRole('alert')).toHaveText(brew.errors.auth);
    expect(rpcRequests).toBe(0);
    await expect(page.getByRole('heading',{name:brew.saved,exact:true})).toHaveCount(0);
    await noOverflow(page);
    await page.waitForLoadState('networkidle');
  });
}
