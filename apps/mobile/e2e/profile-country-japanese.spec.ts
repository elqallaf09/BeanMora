import { expect, test, type Route } from '@playwright/test';
import { setLanguage } from './settings';

const project = 'https://mobilefixture.supabase.co';
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const user = { id: '99999999-9999-4999-8999-999999999999', email: 'profile@example.test', aud: 'authenticated', role: 'authenticated', is_anonymous: false, user_metadata: { country: 'JP', phone: '+819012345678' }, app_metadata: { provider: 'email' }, created_at: '2026-01-01T00:00:00Z', identities: [] };
const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', is_anonymous: false, exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_fixture_signature`;

test('Japanese persists after restart, uses LTR navigation and submits country / username / private phone', async ({ page }, info) => {
  let metadata: Record<string, unknown> | undefined, taken = false, signups = 0;
  await page.route(project + '/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/signup')) { signups++; metadata = route.request().postDataJSON().data; return reply(route, { user, session: null }); }
    if (url.pathname.endsWith('/profiles') && url.searchParams.get('username')) return reply(route, taken ? [{ username: 'japan_fixture' }] : []);
    return reply(route, url.pathname.endsWith('/settings') ? { external: { google: true, apple: false } } : []);
  });
  await page.goto('/');
  await setLanguage(page, 'ja');
  await expect(page.getByRole('button', { name: 'ホーム', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'ホーム', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'コーヒーの世界を見つけよう。' })).toBeVisible();
  await page.getByRole('button', { name: 'マイページを開く', exact: true }).click();
  await page.getByRole('button', { name: 'アカウントを作成', exact: true }).first().click();
  const submit = page.getByRole('button', { name: 'アカウントを作成', exact: true }).last();
  await expect(submit).toBeDisabled();
  await page.getByRole('button', { name: '国・地域', exact: true }).click();
  await page.getByLabel('国・地域を検索', { exact: true }).fill('Japan');
  await page.getByRole('button', { name: '日本', exact: true }).click();
  await page.getByLabel('ユーザー名', { exact: true }).fill('Japan_Fixture');
  await page.getByLabel('メールアドレス', { exact: true }).fill('new@example.test');
  await page.getByLabel('パスワード', { exact: true }).fill('fixture_password');
  await page.getByLabel('パスワードの確認', { exact: true }).fill('fixture_password');
  await page.getByLabel('電話番号', { exact: true }).fill('09012345678');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('国番号');
  expect(signups).toBe(0);
  await page.getByLabel('電話番号', { exact: true }).fill('００８１ ９０-１２３４-５６７８');
  taken = true;
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('使用されています');
  expect(signups).toBe(0);
  taken = false;
  await submit.click();
  await expect(page.getByText('確認メールからアカウントを有効にしてください。', { exact: true })).toBeVisible();
  expect(signups).toBe(1);
  expect(metadata).toEqual({ name: 'japan_fixture', username: 'japan_fixture', country: 'JP', phone: '+819012345678', language: 'ja' });
  await page.screenshot({ path: info.outputPath('signup-japanese.png'), animations: 'disabled' });
  await page.getByTestId('guest-browse').click();
  for (const name of ['コーヒーと風味', 'レシピ一覧', '器具', 'ロースター', 'カプセル']) {
    await page.getByTestId('library-navigation').getByRole('button', { name, exact: true }).click();
    await expect(page.getByText(/This screen could not be loaded|تعذّر عرض هذه الصفحة/)).toHaveCount(0);
    await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  }
  await setLanguage(page, 'ar');
  await expect(page.getByRole('heading', { name: 'اكتشف عالم القهوة.' })).toBeVisible();
});

for (const ar of [true, false]) test(`${ar ? 'Arabic' : 'English'}: bio uses Edit profile; country flag updates after settings save, phone stays private and retry keeps input`, async ({ page }, info) => {
  let current = { ...user, user_metadata: { ...user.user_metadata } };
  let profile = { id: user.id, name: 'Profile fixture', username: 'profile_fixture', avatar_url: null, bio: '', country: 'JP', is_private: false, share_collection: false };
  let failSave = true, saves = 0;
  await page.route(project + '/**', route => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (path.endsWith('/token')) return reply(route, { access_token: token, refresh_token: 'isolated_refresh', token_type: 'bearer', expires_in: 3600, user: current });
    if (path.endsWith('/user')) {
      if (route.request().method() === 'PUT') {
        saves++;
        const data = route.request().postDataJSON().data;
        expect(data).toEqual({ country: 'KW', phone: '+96550000000' });
        if (failSave) return reply(route, { message: 'isolated temporary failure' }, 503);
        current = { ...current, user_metadata: data }; profile.country = data.country;
      }
      return reply(route, current);
    }
    if (path.endsWith('/profiles')) {
      if (route.request().method() === 'PATCH') { const data = route.request().postDataJSON(); expect(data).not.toHaveProperty('phone'); profile = { ...profile, ...data }; return reply(route, { id: user.id }); }
      return reply(route, url.searchParams.get('select') === 'country' ? { country: profile.country } : { username: profile.username });
    }
    if (path.endsWith('/rpc/get_member_profile')) return reply(route, { profile, is_owner: true, can_view: true, follower_count: 0, following_count: 0, relationship: null, equipment: [], beans: [], recipes: [], favorites: [], comments: [], photos: [] });
    return reply(route, path.endsWith('/settings') ? { external: { google: true, apple: false } } : []);
  });
  await page.goto('/'); if (!ar) await setLanguage(page, 'en');
  await page.getByRole('button', { name: ar ? 'فتح حسابي' : 'Open account', exact: true }).click();
  await page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email', { exact: true }).fill(user.email);
  await page.getByLabel(ar ? 'كلمة المرور' : 'Password', { exact: true }).fill('fixture_password');
  await page.getByRole('button', { name: ar ? 'تسجيل الدخول' : 'Sign in', exact: true }).click();
  await expect(page.getByTestId('profile-country-flag')).toContainText('🇯🇵');
  await expect(page.getByRole('button', { name: ar ? 'أضف نبذة عنك' : 'Add a bio', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: ar ? 'تعديل الملف' : 'Edit profile', exact: true }).click();
  await page.getByLabel(ar ? 'نبذة عني' : 'Bio', { exact: true }).fill('Coffee lover · V60 and espresso');
  await page.getByRole('button', { name: ar ? 'حفظ الملف' : 'Save profile', exact: true }).click();
  await expect(page.getByTestId('profile-bio')).toContainText('Coffee lover · V60 and espresso');
  await page.getByRole('button', { name: ar ? 'الإعدادات' : 'Settings', exact: true }).first().click();
  const details = page.getByTestId('account-details');
  await details.getByRole('button', { name: ar ? 'الدولة' : 'Country', exact: true }).click();
  await details.getByLabel(ar ? 'ابحث عن الدولة' : 'Search countries', { exact: true }).fill('Kuwait');
  await details.getByRole('button', { name: ar ? 'الكويت' : 'Kuwait', exact: true }).click();
  await details.getByLabel(ar ? 'رقم الهاتف' : 'Phone number', { exact: true }).fill('+٩٦٥ ٥٠٠٠٠٠٠٠');
  const save = details.getByRole('button', { name: ar ? 'حفظ بيانات الحساب' : 'Save account details', exact: true });
  await save.click();
  await expect(details.getByRole('alert')).toBeVisible();
  await expect(details.getByLabel(ar ? 'رقم الهاتف' : 'Phone number', { exact: true })).toHaveValue('+٩٦٥ ٥٠٠٠٠٠٠٠');
  failSave = false; await save.click();
  await expect(details.getByText(ar ? 'تم تحديث الدولة ورقم الهاتف.' : 'Country and phone updated.', { exact: true })).toBeVisible();
  expect(saves).toBe(2);
  await page.getByTestId('settings-screen').getByRole('button', { name: ar ? 'تم' : 'Done', exact: true }).click();
  await expect(page.getByTestId('profile-country-flag')).toContainText('🇰🇼');
  await expect(page.getByTestId('member-profile')).not.toContainText('+96550000000');
  await page.screenshot({ path: info.outputPath(`profile-country-${ar ? 'ar' : 'en'}.png`), animations: 'disabled' });
});
