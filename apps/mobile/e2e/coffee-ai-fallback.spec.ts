import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import { setLanguage } from './settings';

const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'coffee-pilot@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
const query = { kind: 'recipe', category: null, methods: ['espresso'], terms: [], amount: null, currency: null, clarification: null };

async function setup(page: Page) {
  let calls = 0, unavailable = false;
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
        calls++;
        expect(route.request().postDataJSON().locale).toBe('en');
        body = unavailable ? { error: 'CREDIT_BALANCE_EXHAUSTED' } : { mode: 'ai', answer: 'For your espresso, compare the pressure while brewing. Which gauge are you reading?', query, matches: [], sources: [{ title: 'Reviewed pressure reference', url: 'https://www.breville.com/en-us/product/bes870' }] };
        status = unavailable ? 429 : 200;
      } else body = { api_contract: 2, conversation_enabled: true, authentication_required: true };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } });
  });
  await page.goto('/'); await setLanguage(page, 'en');
  await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByRole('button', { name: 'Use the coffee guide', exact: true })).toBeVisible();
  return { count: () => calls, exhaust: () => { unavailable = true; }, renew: () => { unavailable = false; } };
}
async function ask(page: Page, question: string) {
  const field = page.getByLabel('Your coffee question', { exact: true });
  await field.fill(question);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(field).toHaveValue('');
  return page.getByTestId('assistant-latest-answer');
}

test('automatically answers with AI, falls back on exhausted balance, and persists the pause until explicitly resumed', async ({ page }) => {
  const fixture = await setup(page);
  let answer = await ask(page, 'How many bar for espresso?');
  await expect(answer).toContainText('Coffee expert · AI assisted');
  await expect(answer).toContainText('Which gauge are you reading?');
  await expect(answer.getByRole('button', { name: 'Reviewed pressure reference', exact: true })).toBeVisible();
  expect(fixture.count()).toBe(1);
  fixture.exhaust();
  answer = await ask(page, 'What pressure for espresso?');
  await expect(answer).toContainText('Coffee expert · Local coffee guide');
  await expect(answer).toContainText('9 bar');
  await expect(page.getByTestId('coffee-assistant')).toContainText('Credits or the usage allowance are unavailable');
  expect(fixture.count()).toBe(2);
  await page.reload();
  await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByRole('button', { name: 'Enable AI assistance', exact: true })).toBeEnabled();
  answer = await ask(page, 'How many bar for espresso?');
  await expect(answer).toContainText('9 bar');
  expect(fixture.count()).toBe(2);
  fixture.renew();
  await page.getByRole('button', { name: 'Enable AI assistance', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use the coffee guide', exact: true })).toBeVisible();
  answer = await ask(page, 'How many bar for espresso?');
  await expect(answer).toContainText('Coffee expert · AI assisted');
  expect(fixture.count()).toBe(3);
});

test('a saved manual opt-out and deterministic quantity calculations do not invoke AI', async ({ page }) => {
  const fixture = await setup(page);
  let answer = await ask(page, 'Calculate 18 g at 1:16');
  await expect(answer).toContainText('288 g');
  await expect(answer).toContainText('Coffee expert · Local coffee guide');
  expect(fixture.count()).toBe(0);
  await page.getByRole('button', { name: 'Use the coffee guide', exact: true }).click();
  await page.reload();
  await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByRole('button', { name: 'Enable AI assistance', exact: true })).toBeEnabled();
  answer = await ask(page, 'How many bar for espresso?');
  await expect(answer).toContainText('9 bar');
  expect(fixture.count()).toBe(0);
});
