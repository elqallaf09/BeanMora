import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import { openSettings, setLanguage } from './settings';

const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'coffee-pilot@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
const query = { kind: 'recipe', category: null, methods: ['espresso'], terms: [], amount: null, currency: null, clarification: null };

async function setup(page: Page) {
  const state = { calls: 0, checks: 0, exhausted: false, enabled: true, catalog: false, readiness: null as Promise<void> | null, questions: [] as string[] };
  await page.clock.install();
  await page.addInitScript(({ user, token }) => {
    if (!localStorage.getItem('sb-mobilefixture-auth-token')) localStorage.setItem('sb-mobilefixture-auth-token', JSON.stringify({ access_token: token, refresh_token: 'isolated_refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
  }, { user, token });
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [], status = 200;
    if (path.endsWith('/auth/v1/user')) body = user;
    if (path.endsWith('/profiles')) body = { username: 'coffee_pilot' };
    if (path.endsWith('/functions/v1/coffee-assistant')) {
      expect(route.request().headers().authorization).toBe('Bearer ' + token);
      if (route.request().method() === 'POST') {
        state.calls++;
        const request = route.request().postDataJSON(); state.questions.push(request.question);
        body = state.exhausted ? { error: 'CREDIT_BALANCE_EXHAUSTED' } : state.catalog ? { mode: 'catalog', notice: 'catalog_no_matches' } : { mode: 'ai', answer: request.locale === 'ar' ? request.question.includes('الطحن') ? 'درجة الطحن تعتمد على موديل الطاحونة وطريقة التحضير؛ تاريخ التحميص وحده لا يحدد رقمًا مناسبًا. ما موديل الطاحونة وطريقة التحضير؟' : 'إيحاء الفراولة وصف للمذاق. اختر بنًا منشورًا بهذه الإيحاءات وتحقق من وصف المحمصة.' : 'For your espresso, compare the pressure while brewing. Which gauge are you reading?', query, matches: [], sources: [{ title: 'Reviewed pressure reference', url: 'https://www.breville.com/en-us/product/bes870' }] };
        status = state.exhausted ? 429 : 200;
      } else { state.checks++; if (state.readiness) await state.readiness; body = { api_contract: 2, conversation_enabled: state.enabled, authentication_required: true }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } });
  });
  await page.goto('/'); await setLanguage(page, 'en'); await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByTestId('coffee-assistant')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enable AI assistance|Use the coffee guide/ })).toHaveCount(0);
  return state;
}
async function ask(page: Page, question: string, ar = false) {
  const field = page.getByLabel(ar ? 'سؤالك عن القهوة' : 'Your coffee question', { exact: true });
  await field.fill(question);
  await page.getByRole('button', { name: ar ? 'إرسال' : 'Send', exact: true }).click();
  await expect(field).toHaveValue('');
  return page.getByTestId('assistant-latest-answer');
}

test('automatically uses AI and recovers after the persisted credit cooldown on the next question', async ({ page }) => {
  const fixture = await setup(page);
  let answer = await ask(page, 'How many bar for espresso?');
  await expect(answer).toContainText('Coffee expert · AI assisted');
  await expect(answer.getByRole('button', { name: 'Reviewed pressure reference', exact: true })).toBeVisible();
  expect(fixture.calls).toBe(1);
  fixture.exhausted = true; answer = await ask(page, 'What pressure for espresso?');
  await expect(answer).toContainText('Coffee expert · Local coffee guide'); await expect(answer).toContainText('9 bar');
  await expect(page.getByTestId('coffee-assistant')).toContainText('AI is currently unavailable because of a usage limit');
  expect(fixture.calls).toBe(2);
  await page.reload(); await openCoffeeShortcut(page, 'Coffee expert');
  answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('9 bar');
  expect(fixture.calls).toBe(2);
  fixture.exhausted = false;
  // Reload may reset the mocked clock baseline; use the persisted absolute
  // deadline to verify recovery on the first eligible question deterministically.
  const retryAt = await page.evaluate(id => JSON.parse(localStorage.getItem(`beanmora:coffee-assistant:v2:https://mobilefixture.supabase.co:${id}`) ?? '{}').retryAt as number, user.id);
  expect(retryAt).toBeGreaterThan(0);
  await page.clock.setSystemTime(retryAt + 1);
  expect(fixture.calls).toBe(2); // No background paid retry.
  answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('Coffee expert · AI assisted');
  expect(fixture.calls).toBe(3);
});

test('settings preserve the privacy opt-out while exact calculations remain local', async ({ page }) => {
  const fixture = await setup(page);
  let answer = await ask(page, 'Calculate 18 g at 1:16');
  await expect(answer).toContainText('288 g'); await expect(answer).toContainText('Local coffee guide');
  expect(fixture.calls).toBe(0); expect(fixture.checks).toBe(0);
  const settings = await openSettings(page), online = settings.getByRole('switch', { name: 'Online answers', exact: true });
  await expect(online).toBeChecked(); await online.uncheck();
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload(); await openCoffeeShortcut(page, 'Coffee expert');
  answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('9 bar');
  expect(fixture.calls).toBe(0); expect(fixture.checks).toBe(0);
  const reopened = await openSettings(page);
  await reopened.getByRole('switch', { name: 'Online answers', exact: true }).check();
  await reopened.getByRole('button', { name: 'Done', exact: true }).click();
  answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('AI assisted');
  expect(fixture.calls).toBe(1);
});

test('rechecks disabled readiness on a later submitted question without an activation button', async ({ page }) => {
  const fixture = await setup(page); fixture.enabled = false;
  let answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('Local coffee guide');
  await expect(page.getByTestId('coffee-assistant')).toContainText('not currently enabled by the service');
  expect(fixture.calls).toBe(0); expect(fixture.checks).toBe(1);
  fixture.enabled = true; await page.clock.fastForward(30001); expect(fixture.checks).toBe(1);
  answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('AI assisted');
  expect(fixture.calls).toBe(1); expect(fixture.checks).toBe(2);
});

test('catalog-only results do not report connection failure or pause the next question', async ({ page }) => {
  const fixture = await setup(page); fixture.catalog = true;
  let answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('Local coffee guide');
  await expect(page.getByTestId('coffee-assistant')).not.toContainText('AI assistance is temporarily unavailable');
  fixture.catalog = false; answer = await ask(page, 'How many bar for espresso?'); await expect(answer).toContainText('AI assisted');
  expect(fixture.calls).toBe(2);
});

test('the reported Arabic strawberry question reaches AI without an activation control', async ({ page }, info) => {
  const fixture = await setup(page); await setLanguage(page, 'ar');
  const question = 'شنو البن الي طعمه او ايحاءه على فراولة';
  const answer = await ask(page, question, true); await expect(answer).toContainText('إيحاء الفراولة وصف للمذاق');
  expect(fixture.questions).toEqual([question]);
  await expect(page.getByRole('button', { name: 'تفعيل المساعدة الذكية', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('coffee-expert-automatic-ar.png') });
});


test('switching off online answers while readiness is pending prevents the question POST', async ({ page }) => {
  const fixture = await setup(page);
  let release!: () => void;
  fixture.readiness = new Promise<void>(resolve => { release = resolve; });
  const field = page.getByLabel('Your coffee question', { exact: true });
  await field.fill('How many bar for espresso?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => fixture.checks).toBe(1);
  const settings = await openSettings(page);
  await settings.getByRole('switch', { name: 'Online answers', exact: true }).uncheck();
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  release();
  await expect(field).toHaveValue('');
  await expect(page.getByTestId('assistant-latest-answer')).toContainText('Local coffee guide');
  expect(fixture.calls).toBe(0);
  const reopened = await openSettings(page);
  await expect(reopened.getByRole('switch', { name: 'Online answers', exact: true })).not.toBeChecked();
});


test('the reported roast-date grinding question reaches AI with the complete original date instead of the calculator', async ({ page }) => {
  const fixture = await setup(page); await setLanguage(page, 'ar');
  const question = 'البن مالي محموص بتاريخ ١/١٠/٢٠٢٦ برازيلي ، جم درجه الطحن اللي تنصح فيه ؟';
  const answer = await ask(page, question, true);
  await expect(answer).toContainText('بمساعدة الذكاء الاصطناعي');
  await expect(answer).toContainText('ما موديل الطاحونة وطريقة التحضير؟');
  await expect(answer).not.toContainText('حدد وزن البن والنسبة');
  await expect(answer).not.toContainText('1:16');
  expect(fixture.questions).toEqual([question]);
  expect(fixture.calls).toBe(1);
  await expect(page.getByRole('button', { name: 'تفعيل المساعدة الذكية', exact: true })).toHaveCount(0);
});
