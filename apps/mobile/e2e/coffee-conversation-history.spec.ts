import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import { setLanguage } from './settings';

const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'coffee-history@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
const generation = '33333333-3333-4333-8333-333333333333';
const query = { kind: null, category: null, methods: [], terms: [], amount: null, currency: null, clarification: null };
type Row = { id: string; title: string; turns: { question: string; answer: string }[]; consent_generation: string | null; updated_at: string };

async function setup(page: Page) {
  const state = { rows: [] as Row[], saves: 0, failSaves: false, remote: [] as { question: string; history: unknown[] }[] };
  await page.addInitScript(({ user, token }) => {
    if (!localStorage.getItem('sb-mobilefixture-auth-token')) localStorage.setItem('sb-mobilefixture-auth-token', JSON.stringify({ access_token: token, refresh_token: 'isolated_refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
  }, { user, token });
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    let body: unknown = [], status = 200;
    if (path.endsWith('/auth/v1/user')) body = user;
    if (path.endsWith('/profiles')) body = { username: 'coffee_history' };
    if (path.endsWith('/functions/v1/coffee-assistant')) {
      if (method === 'POST') {
        const sent = request.postDataJSON() as { question: string; history: unknown[] };
        state.remote.push(sent);
        body = { mode: 'ai', answer: 'Answer to: ' + sent.question, query, matches: [], sources: [{ title: 'Reviewed reference', url: 'https://example.com/reference' }] };
      } else body = { api_contract: 3, conversation_enabled: true, authentication_required: true, consent_policy: 'openai-v1', consent_available: true, consent_choice: 'allow', consent_generation: generation };
    }
    if (path.endsWith('/rest/v1/coffee_expert_conversations')) {
      expect(request.headers().authorization).toBe('Bearer ' + token);
      const id = url.searchParams.get('id')?.replace('eq.', '');
      if (method === 'POST') {
        state.saves++;
        if (state.failSaves) { status = 500; body = { message: 'unavailable' }; }
        else {
          const row = request.postDataJSON() as Omit<Row, 'updated_at'>;
          expect(Object.keys(row).sort()).toEqual(['consent_generation', 'id', 'title', 'turns']);
          state.rows = [{ ...row, updated_at: new Date().toISOString() }, ...state.rows.filter(item => item.id !== row.id)];
          status = 201;
        }
      } else if (method === 'DELETE') {
        if (id) state.rows = state.rows.filter(row => row.id !== id);
        else { expect(url.searchParams.get('owner_id')).toBe('eq.' + user.id); state.rows = []; }
        status = 204;
      } else if (id) body = state.rows.find(row => row.id === id) ?? null;
      else body = state.rows.map(({ id, title, updated_at }) => ({ id, title, updated_at }));
    }
    await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(body), headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } });
  });
  await page.goto('/'); await setLanguage(page, 'en'); await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByTestId('coffee-assistant')).toBeVisible();
  return state;
}
async function ask(page: Page, question: string) {
  await page.getByLabel('Your coffee question').fill(question);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('assistant-latest-answer')).toContainText('Answer to: ' + question);
}

test('saves each conversation to the account and reopens it from the side list', async ({ page }) => {
  const state = await setup(page);
  await ask(page, 'Why is my espresso pressure low?');
  await expect.poll(() => state.rows.length).toBe(1);
  await ask(page, 'And how do I read the gauge?');
  await expect.poll(() => state.rows[0].turns.length).toBe(2);
  expect(state.rows).toHaveLength(1);
  expect(state.rows[0]).toMatchObject({ title: 'Why is my espresso pressure low?', consent_generation: generation });

  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await expect(page.getByTestId('assistant-turn')).toHaveCount(0);
  await ask(page, 'How should I store beans at home?');
  await expect.poll(() => state.rows.length).toBe(2);

  await page.getByRole('button', { name: 'My conversations', exact: true }).click();
  const list = page.getByTestId('assistant-conversations');
  await expect(list.getByTestId('assistant-conversation-row')).toHaveCount(2);
  await expect(list.getByTestId('assistant-conversation-row').first()).toContainText('How should I store beans at home?');
  await list.getByRole('button', { name: 'Why is my espresso pressure low?', exact: true }).click();
  await expect(list).toHaveCount(0);
  await expect(page.getByTestId('assistant-turn')).toHaveCount(2);
  await expect(page.getByTestId('assistant-latest-answer')).toContainText('Answer to: And how do I read the gauge?');

  // A reopened conversation continues in the same saved row, with its online context.
  await ask(page, 'Is nine bar normal?');
  await expect.poll(() => state.rows.find(row => row.title === 'Why is my espresso pressure low?')?.turns.length).toBe(3);
  expect(state.rows).toHaveLength(2);
  expect(state.remote.at(-1)?.history).toHaveLength(2);
});

test('deletes one conversation, clears all after a confirmation, and keeps the answer when saving fails', async ({ page }) => {
  const state = await setup(page);
  await ask(page, 'First saved question about water?');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await ask(page, 'Second saved question about grind?');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await ask(page, 'Third saved question about bloom?');
  await expect.poll(() => state.rows.length).toBe(3);

  await page.getByRole('button', { name: 'My conversations', exact: true }).click();
  const list = page.getByTestId('assistant-conversations');
  await list.getByRole('button', { name: 'Delete conversation: First saved question about water?' }).click();
  await expect(list.getByTestId('assistant-conversation-row')).toHaveCount(2);
  expect(state.rows.map(row => row.title)).not.toContain('First saved question about water?');

  await list.getByRole('button', { name: 'Clear all conversations', exact: true }).click();
  await expect(list).toContainText('deleted permanently');
  expect(state.rows).toHaveLength(2);
  await list.getByRole('button', { name: 'Keep them', exact: true }).click();
  await list.getByRole('button', { name: 'Clear all conversations', exact: true }).click();
  await list.getByRole('button', { name: 'Yes, clear all', exact: true }).click();
  await expect(list).toContainText('No saved conversations yet');
  expect(state.rows).toHaveLength(0);
  await list.getByRole('button', { name: 'Close', exact: true }).first().click();
  // The answer on screen is untouched by clearing the saved copies.
  await expect(page.getByTestId('assistant-latest-answer')).toContainText('Third saved question about bloom?');

  state.failSaves = true;
  await ask(page, 'Does a failed save lose my answer?');
  await expect(page.getByTestId('coffee-assistant')).toContainText('could not be saved to your account');
  expect(state.rows).toHaveLength(0);
});

test('guests are not offered saved conversations', async ({ page }) => {
  await page.route('https://mobilefixture.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/'); await setLanguage(page, 'en'); await openCoffeeShortcut(page, 'Coffee expert');
  await expect(page.getByTestId('coffee-assistant')).toBeVisible();
  await expect(page.getByRole('button', { name: 'My conversations', exact: true })).toHaveCount(0);
});
