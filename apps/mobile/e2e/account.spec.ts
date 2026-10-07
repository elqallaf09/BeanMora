import { expect, test, type Page, type Route } from '@playwright/test';

// All users, sessions, Storage operations and deletions below are isolated fixtures.
const project = 'https://mobilefixture.supabase.co';
const user = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', aud: 'authenticated', role: 'authenticated',
  email: 'fixture@example.test', app_metadata: { provider: 'email' }, user_metadata: {},
  created_at: '2026-10-06T00:00:00Z', identities: [], is_anonymous: false };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
const session = { access_token: token, refresh_token: 'isolated_refresh', token_type: 'bearer', expires_in: 3600, user };
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
async function openAccount(page: Page, ar: boolean) {
  await page.goto('/');
  if (!ar) await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: ar ? 'فتح حسابي' : 'Open account', exact: true }).click();
}
async function login(page: Page, ar: boolean) {
  await openAccount(page, ar);
  await page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true }).fill(user.email);
  await page.getByLabel(ar ? 'كلمة المرور' : 'Password', { exact: true }).fill('isolated_password');
  await page.getByRole('button', { name: ar ? 'تسجيل الدخول' : 'Sign in', exact: true }).click();
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
}
for (const ar of [true, false]) test(`${ar ? 'ar' : 'en'}: deletion requires confirmation, handles failure and clears only this account`, async ({ page }, info) => {
  let deleted = false; let calls = 0; let fail = true;
  const paths: string[] = [];
  await page.route(project + '/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/settings')) return reply(route, { external: { google: true, apple: false } });
    if (path.endsWith('/token')) return reply(route, session);
    if (path.endsWith('/user')) return reply(route, deleted ? { message: 'User not found' } : user, deleted ? 404 : 200);
    if (path.includes('/storage/v1/object/list/')) { paths.push(route.request().postDataJSON().prefix); return reply(route, []); }
    if (path.endsWith('/rpc/delete_own_account')) {
      calls++;
      expect(route.request().postDataJSON()).toEqual({});
      if (fail) return reply(route, { message: 'isolated deletion outage' }, 503);
      deleted = true; return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    return reply(route, []);
  });
  await login(page, ar);
  const ownShelf = `beanmora-recipe-shelf-v1:${project}:${user.id}`;
  const guestShelf = `beanmora-recipe-shelf-v1:${project}:guest`;
  const ownDraft = 'beanmora-roast-draft:' + user.id;
  await page.evaluate(({ ownShelf, guestShelf, ownDraft }) => {
    localStorage.setItem(ownShelf, 'isolated private shelf');
    localStorage.setItem(ownDraft, 'isolated private roast');
    localStorage.setItem(guestShelf, 'isolated guest shelf');
  }, { ownShelf, guestShelf, ownDraft });
  const start = page.getByRole('button', { name: ar ? 'حذف الحساب والبيانات' : 'Delete account and data', exact: true });
  await start.click();
  const confirm = page.getByRole('button', { name: ar ? 'احذف حسابي نهائيًا' : 'Permanently delete my account', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel(ar ? 'تأكيد حذف الحساب' : 'Confirm account deletion').fill('wrong');
  await expect(confirm).toBeDisabled();
  await page.getByRole('button', { name: ar ? 'إلغاء' : 'Cancel', exact: true }).click();
  expect(calls).toBe(0);
  await start.click();
  await page.getByLabel(ar ? 'تأكيد حذف الحساب' : 'Confirm account deletion').fill(ar ? 'حذف' : 'DELETE');
  await confirm.click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'لم يتأكد حذف الحساب' : 'Account deletion was not confirmed');
  expect(calls).toBe(1); expect(deleted).toBe(false);
  expect(await page.evaluate(key => localStorage.getItem(key), ownDraft)).toBe('isolated private roast');
  await page.screenshot({ path: info.outputPath(`account-delete-${ar ? 'ar' : 'en'}.png`) });
  fail = false; await confirm.click();
  await expect(page.getByText(ar ? 'تم حذف حسابك وبياناته.' : 'Your account and its data were deleted.', { exact: true })).toBeVisible();
  expect(deleted).toBe(true); expect(calls).toBe(2);
  expect(paths).toHaveLength(14); expect(paths.every(path => path === user.id)).toBe(true);
  const stored = await page.evaluate(({ ownShelf, ownDraft, guestShelf }) => ({ ownShelf: localStorage.getItem(ownShelf),
    ownDraft: localStorage.getItem(ownDraft), guestShelf: localStorage.getItem(guestShelf), session: localStorage.getItem('sb-mobilefixture-auth-token') }), { ownShelf, ownDraft, guestShelf });
  expect(stored).toEqual({ ownShelf: null, ownDraft: null, guestShelf: 'isolated guest shelf', session: null });
  await openAccount(page, ar);
  await expect(page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true })).toBeVisible();
  await expect(start).toHaveCount(0);
});

test('Google uses PKCE, offers account selection and returns to a signed-in account', async ({ page }) => {
  let authorization: URL | undefined; let exchange = false;
  await page.route(project + '/**', async route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    if (path.endsWith('/settings')) return reply(route, { external: { google: true, apple: false } });
    if (path.endsWith('/authorize')) {
      authorization = url;
      return route.fulfill({ status: 302, headers: { location: 'http://127.0.0.1:8088/?code=isolated_code' } });
    }
    if (path.endsWith('/token')) {
      exchange = url.searchParams.get('grant_type') === 'pkce';
      expect(route.request().postDataJSON().auth_code).toBe('isolated_code');
      return reply(route, session);
    }
    if (path.endsWith('/user')) return reply(route, user);
    return reply(route, []);
  });
  await openAccount(page, false);
  await expect(page.getByRole('button', { name: 'Continue with Apple', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect.poll(() => exchange).toBe(true);
  expect(authorization?.searchParams.get('provider')).toBe('google');
  expect(authorization?.searchParams.get('redirect_to')).toBe('http://127.0.0.1:8088');
  expect(authorization?.searchParams.get('prompt')).toBe('select_account');
  expect(authorization?.searchParams.get('code_challenge_method')).toBe('s256');
  expect(authorization?.searchParams.get('code_challenge')).toBeTruthy();
  await page.getByRole('button', { name: 'Open account', exact: true }).click();
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
});

test('a disabled Google provider explains the problem without a broken redirect', async ({ page }) => {
  let authorize = 0;
  await page.route(project + '/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/authorize')) authorize++;
    return reply(route, path.endsWith('/settings') ? { external: { google: false, apple: false } } : []);
  });
  await openAccount(page, true);
  await page.getByRole('button', { name: 'تابع باستخدام Google', exact: true }).click();
  await expect(page.getByText('تسجيل Google غير مفعّل حالياً. يمكنك الدخول بالبريد الإلكتروني.', { exact: true })).toBeVisible();
  expect(authorize).toBe(0);
});

for (const ar of [true, false]) test(`${ar ? 'ar' : 'en'}: signup validates before sending and guest browsing remains prominent`, async ({ page }, info) => {
  let signups = 0;
  await page.route(project + '/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/signup')) {
      signups++;
      expect(route.request().postDataJSON().email).toBe('new@example.test');
      return reply(route, { user: { ...user, email: 'new@example.test' }, session: null });
    }
    return reply(route, path.endsWith('/settings') ? { external: { google: true, apple: false } } : []);
  });
  await openAccount(page, ar);
  const guest = page.getByTestId('guest-browse');
  await expect(guest).toBeInViewport();
  expect((await guest.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await page.getByRole('button', { name: ar ? 'إنشاء حساب' : 'Create account', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: ar ? 'ابدأ رحلتك مع القهوة' : 'Your coffee journey starts here' })).toBeVisible();
  await expect(page.getByRole('button', { name: ar ? 'نسيت كلمة المرور؟' : 'Forgot password?' })).toHaveCount(0);
  const submit = page.getByRole('button', { name: ar ? 'إنشاء حساب' : 'Create account', exact: true }).last();
  await expect(submit).toBeDisabled();
  await page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true }).fill('not-an-email');
  await page.getByLabel(ar ? 'كلمة المرور' : 'Password', { exact: true }).fill('fixture-password');
  await page.getByLabel(ar ? 'تأكيد كلمة المرور' : 'Confirm password', { exact: true }).fill('mismatch');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'بريدًا إلكترونيًا صحيحًا' : 'valid email');
  await page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true }).fill('new@example.test');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'غير متطابقتين' : 'do not match');
  expect(signups).toBe(0);
  await page.getByLabel(ar ? 'تأكيد كلمة المرور' : 'Confirm password', { exact: true }).fill('fixture-password');
  await submit.click();
  await expect(page.getByText(ar ? 'راجع بريدك الإلكتروني لتأكيد حسابك.' : 'Check your email to confirm your account.', { exact: true })).toBeVisible();
  expect(signups).toBe(1);
  await guest.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`signup-${ar ? 'ar' : 'en'}.png`) });
  await guest.click();
  await expect(page.getByRole('heading', { name: ar ? 'اكتشف عالم القهوة.' : 'Discover the world of coffee.' })).toBeVisible();
});

for (const ar of [true, false])
  test(`${ar ? 'ar' : 'en'}: recovery validates, retries failed password update and opens legal policies`, async ({
    page,
  }) => {
    let recovery = false;
    let updates = 0;
    let fail = true;
    await page.route(project + '/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.endsWith('/settings'))
        return reply(route, { external: { google: true, apple: false } });
      if (path.endsWith('/recover')) {
        recovery = true;
        expect(url.searchParams.get('redirect_to')).toBe(
          'http://127.0.0.1:8088',
        );
        expect(route.request().postDataJSON().code_challenge).toBeTruthy();
        return reply(route, {});
      }
      if (path.endsWith('/token')) return reply(route, session);
      if (path.endsWith('/user') && route.request().method() === 'PUT') {
        updates++;
        expect(route.request().postDataJSON().password).toBe(
          'new_fixture_password',
        );
        return reply(
          route,
          fail ? { message: 'isolated update failure' } : user,
          fail ? 503 : 200,
        );
      }
      if (path.endsWith('/user')) return reply(route, user);
      return reply(route, []);
    });
    await openAccount(page, ar);
    await page
      .getByRole('button', {
        name: ar ? 'سياسة الخصوصية' : 'Privacy policy',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('heading', {
        name: ar ? 'سياسة الخصوصية' : 'Privacy policy',
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: ar ? 'إغلاق' : 'Close', exact: true })
      .click();
    await page
      .getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true })
      .fill(user.email);
    await page
      .getByRole('button', {
        name: ar ? 'نسيت كلمة المرور؟' : 'Forgot password?',
        exact: true,
      })
      .click();
    await expect.poll(() => recovery).toBe(true);
    await page.goto('/?code=isolated_recovery');
    await expect(page.getByTestId('password-recovery')).toBeVisible();
    const password = page.getByLabel(
      ar ? 'كلمة المرور الجديدة' : 'New password',
      { exact: true },
    );
    const confirmation = page.getByLabel(
      ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password',
      { exact: true },
    );
    const save = page.getByRole('button', {
      name: ar ? 'حفظ كلمة المرور' : 'Save password',
      exact: true,
    });
    await password.fill('short');
    await confirmation.fill('different');
    await save.click();
    await expect(page.getByRole('alert')).toContainText(
      ar ? '8 أحرف' : '8 characters',
    );
    expect(updates).toBe(0);
    await password.fill('new_fixture_password');
    await confirmation.fill('new_fixture_password');
    await save.click();
    await expect(page.getByRole('alert')).toContainText(
      ar ? 'تعذر حفظ' : 'Could not save',
    );
    expect(updates).toBe(1);
    fail = false;
    await save.click();
    await expect(page.getByTestId('password-recovery')).toHaveCount(0);
    expect(updates).toBe(2);
    await expect(page.getByText(user.email, { exact: true })).toBeVisible();
  });
