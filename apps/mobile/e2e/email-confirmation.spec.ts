import { test, expect, type Page, type Route } from '@playwright/test';

const project = 'https://mobilefixture.supabase.co';
const proof = 'a'.repeat(56);
const user = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', email_confirmed_at: '2026-10-16T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-16T00:00:00Z', identities: [], is_anonymous: false };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
const session = { access_token: token, refresh_token: 'isolated_refresh', token_type: 'bearer', expires_in: 3600, user };
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
async function fixture(page: Page, failure = '') {
  const verify: unknown[] = [], exchanges: unknown[] = [];
  await page.route(project + '/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/verify')) {
      verify.push(route.request().postDataJSON());
      if (failure === 'network' && verify.length === 1) return reply(route, { message: 'Request timed out' }, 408);
      return failure === 'expired' ? reply(route, { code: 'otp_expired', message: 'Token expired' }, 403) : reply(route, session);
    }
    if (path.endsWith('/token')) { exchanges.push(route.request().postDataJSON()); return reply(route, { code: 'bad_code_verifier', message: 'code challenge does not match previously saved code verifier' }, 400); }
    if (path.endsWith('/settings')) return reply(route, { external: { google: true, apple: false } });
    if (path.endsWith('/user')) return reply(route, user);
    return reply(route, []);
  });
  return { verify, exchanges };
}
for (const locale of ['ar', 'en']) test(`${locale}: confirmation in a fresh browser waits for a click, verifies once and clears proof`, async ({ page }) => {
  const f = await fixture(page);
  await page.addInitScript(locale => localStorage.setItem('beanmora-language', locale), locale);
  await page.goto(`/#token_hash=${proof}&type=email`);
  const dialog = page.getByTestId('email-confirmation');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:8088/');
  expect(f.verify).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('sb-mobilefixture-auth-token-code-verifier'))).toBeNull();
  await dialog.getByRole('button', { name: locale === 'ar' ? 'تأكيد البريد' : 'Confirm email', exact: true }).click();
  await expect(dialog).toContainText(locale === 'ar' ? 'تم تأكيد بريدك وتسجيل دخولك' : 'Your email is confirmed and you are signed in');
  expect(f.verify).toEqual([{ token_hash: proof, type: 'email', gotrue_meta_security: {} }]);
  expect(f.exchanges).toEqual([]);
  await page.reload();
  await expect(dialog).toHaveCount(0);
  expect(f.verify).toHaveLength(1);
});
test('expired confirmation shows a specific message and no success', async ({ page }) => {
  const f = await fixture(page, 'expired');
  await page.goto(`/#token_hash=${proof}&type=email`);
  const dialog = page.getByTestId('email-confirmation');
  await dialog.getByRole('button', { name: 'تأكيد البريد', exact: true }).click();
  await expect(dialog).toContainText('رابط التأكيد منتهي الصلاحية أو استُخدم سابقًا');
  await expect(dialog).not.toContainText('تم تأكيد بريدك');
  expect(f.verify).toHaveLength(1);
});
test('confirmation can be retried after a connection timeout', async ({ page }) => {
  const f = await fixture(page, 'network');
  await page.goto(`/#token_hash=${proof}&type=email`);
  const dialog = page.getByTestId('email-confirmation');
  await dialog.getByRole('button', { name: 'تأكيد البريد', exact: true }).click();
  await expect(dialog).toContainText('تعذّر الاتصال لتأكيد البريد');
  await dialog.getByRole('button', { name: 'تأكيد البريد', exact: true }).click();
  await expect(dialog).toContainText('تم تأكيد بريدك');
  expect(f.verify).toHaveLength(2);
});
test('legacy PKCE mismatch explains automatic sign-in instead of blaming the password', async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => localStorage.setItem('sb-mobilefixture-auth-token-code-verifier', JSON.stringify('old-proof')));
  await page.goto('/?code=old-email');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('تعذّر الدخول التلقائي من رابط البريد');
  await expect(dialog).not.toContainText('تحقق من البريد وكلمة المرور وتأكيد البريد والاتصال');
  await expect(page).toHaveURL('http://127.0.0.1:8088/');
  await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await expect(page.getByLabel('البريد الإلكتروني', { exact: true })).toBeVisible();
});

test('unconfirmed sign-in offers resend and reports email limits without claiming delivery', async ({ page }) => {
  const requests: unknown[] = [];
  await fixture(page);
  await page.route(project + '/auth/v1/token**', route => reply(route, { error_code: 'email_not_confirmed', message: 'Email not confirmed' }, 400));
  await page.route(project + '/auth/v1/resend**', route => {
    requests.push(route.request().postDataJSON());
    return requests.length === 1 ? reply(route, { error_code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, 429) : reply(route, {});
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'فتح حسابي', exact: true }).click();
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(user.email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
  const resend = page.getByRole('button', { name: 'إعادة إرسال رسالة التأكيد', exact: true });
  await resend.click();
  await expect(page.getByText('تم بلوغ حد إرسال رسائل البريد. انتظر قليلًا قبل طلب رسالة أخرى.', { exact: true })).toBeVisible();
  await resend.click();
  await expect(page.getByText('إذا كان البريد بحاجة إلى تأكيد، ستصلك رسالة جديدة من BeanMora. استخدم أحدث رابط.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toMatchObject({ email: user.email, type: 'signup' });
});
