import { test, expect, type Page, type Route } from '@playwright/test';
import ar from '../messages/ar.json';
import en from '../messages/en.json';
const postId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', owner = '00000000-0000-4000-8000-000000000088';
const unavailable = { code: 'isolated_unavailable', message: 'Test-only failure' };
async function reply(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3000' }, body: JSON.stringify(body) });
}
async function signInAt(page: Page, locale: 'ar' | 'en', path: string) {
  const m = locale === 'ar' ? ar : en;
  await page.goto(`/${locale}/login?next=${encodeURIComponent(path)}`);
  await page.getByLabel(m.auth.emailLabel, { exact: true }).fill('member@fixture.test');
  await page.getByLabel(m.auth.passwordLabel, { exact: true }).fill('fixture_password');
  await page.getByRole('button', { name: m.auth.loginButton, exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3000/${locale}${path}`);
  await page.waitForLoadState('networkidle');
}
for (const locale of ['ar', 'en'] as const) {
  test(`${locale}: onboarding retains choices on failure and confirms a retry before leaving`, async ({ page }) => {
    const m = locale === 'ar' ? ar : en, errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await signInAt(page, locale, '/onboarding');
    for (const label of [m.auth.experienceBeginner, m.common.next, m.onboarding.methodV60, m.common.next, m.onboarding.flavorFruity, m.common.next, m.onboarding.roastLight])
      await page.getByRole('button', { name: label, exact: true }).click();
    let profiles = 0, preferences = 0;
    await page.route('**/rest/v1/profiles?**', async route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      expect(route.request().postDataJSON()).toEqual({ experience_level: 'beginner' }); profiles++;
      await reply(route, 200, { id: owner });
    });
    await page.route('**/rest/v1/user_preferences?**', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      expect(route.request().postDataJSON()).toEqual({ user_id: owner, preferred_brew_methods: ['v60'], preferred_flavors: ['fruity'], preferred_roast_level: 'light', onboarding_completed: true });
      preferences++; await reply(route, preferences === 1 ? 503 : 201, preferences === 1 ? unavailable : { user_id: owner });
    });
    const done = page.getByRole('button', { name: m.common.done, exact: true });
    await done.click();
    await expect(page.getByRole('alert').filter({ hasText: m.onboarding.saveError })).toHaveText(m.onboarding.saveError);
    await expect(page).toHaveURL(new RegExp(`/${locale}/onboarding$`));
    await expect(page.getByRole('button', { name: m.onboarding.roastLight, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await done.click(); await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
    await page.waitForLoadState('networkidle');
    expect({ profiles, preferences }).toEqual({ profiles: 2, preferences: 2 }); expect(errors).toEqual([]);
  });
  test(`${locale}: likes, sharing and reports give confirmed feedback and retry safely`, async ({ page }) => {
    const m = locale === 'ar' ? ar : en, errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await signInAt(page, locale, '/community');
    const article = page.getByRole('article').filter({ hasText: 'Community write fixture' });
    await expect(article).toBeVisible();
    let likes = 0;
    await page.route('**/rest/v1/post_likes?**', async route => {
      if (route.request().method() === 'POST') {
        expect(route.request().postDataJSON()).toEqual({ user_id: owner, post_id: postId }); likes++;
        await reply(route, likes === 1 ? 503 : 201, likes === 1 ? unavailable : null);
      } else await reply(route, 200, likes > 1 ? { id: postId } : null);
    });
    const like = article.getByRole('button', { name: new RegExp(m.community.like + '$') });
    await like.click(); await expect(article.getByRole('alert')).toHaveText(m.community.likeError);
    await expect(like).toHaveAttribute('aria-pressed', 'false'); await expect(like).toContainText('2');
    await like.click(); await expect(like).toHaveAttribute('aria-pressed', 'true'); await expect(like).toContainText('3');
    const options = article.getByRole('button', { name: m.community.postOptions, exact: true });
    await page.evaluate(() => {
      let calls = 0;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { if (++calls === 1) throw new Error('isolated clipboard failure'); } } });
    });
    await options.click(); await article.getByRole('button', { name: m.community.share, exact: true }).click();
    await expect(article.getByRole('alert')).toHaveText(m.community.shareError);
    await article.getByRole('button', { name: m.community.share, exact: true }).click();
    await expect(article.getByRole('status')).toHaveText(m.community.linkCopied); await expect(options).toBeFocused();
    const reports: { id: string; reporter_id: string; target_id: string }[] = [];
    await page.route('**/rest/v1/reports?**', async route => {
      if (route.request().method() === 'POST') {
        reports.push(route.request().postDataJSON()); expect(reports.at(-1)).toMatchObject({ reporter_id: owner, target_id: postId });
        // Model a persisted write whose first response was lost.
        await reply(route, reports.length === 1 ? 503 : 201, reports.length === 1 ? unavailable : null);
      } else await reply(route, 200, { id: reports[0].id });
    });
    await options.click(); await article.getByRole('button', { name: m.community.report, exact: true }).click();
    await expect(article.getByRole('alert')).toHaveText(m.community.reportError); await expect(article.getByRole('status')).toHaveCount(0);
    await article.getByRole('button', { name: m.community.report, exact: true }).click();
    await expect(article.getByRole('status')).toHaveText(m.community.reportSent);
    expect(reports).toHaveLength(2); expect(reports[0]).toEqual(reports[1]); expect(likes).toBe(2); expect(errors).toEqual([]);
  });
  test(`${locale}: comment retries preserve the draft and request ID until confirmation`, async ({ page }) => {
    const m = locale === 'ar' ? ar : en, errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await signInAt(page, locale, `/community/${postId}`);
    const input = page.getByRole('textbox', { name: m.community.writeComment, exact: true });
    await input.fill('A useful coffee comment');
    const attempts: { id: string; user_id: string; post_id: string; body: string }[] = [];
    await page.route('**/rest/v1/comments?**', async route => {
      if (route.request().method() === 'POST') {
        attempts.push(route.request().postDataJSON()); expect(attempts.at(-1)).toMatchObject({ user_id: owner, post_id: postId, body: 'A useful coffee comment' });
        await reply(route, attempts.length === 1 ? 503 : 201, attempts.length === 1 ? unavailable : null);
      } else await reply(route, 200, { id: attempts[0].id });
    });
    const submit = page.getByRole('button', { name: m.community.postComment, exact: true });
    await submit.click(); await expect(page.getByRole('alert').filter({ hasText: m.community.commentError })).toHaveText(m.community.commentError); await expect(input).toHaveValue('A useful coffee comment');
    await submit.click(); await expect(input).toHaveValue(''); await expect(page.getByRole('alert').filter({ hasText: m.community.commentError })).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]); expect(errors).toEqual([]);
  });
}
