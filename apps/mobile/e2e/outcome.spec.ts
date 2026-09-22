import { test, expect } from '@playwright/test';

// Browser-only isolated fixtures. No real identity, token or database is involved.
test('signed-in mobile web preview saves only a confirmed, private brew and retries identically', async ({ page }) => {
  const user = { id: '33333333-3333-4333-8333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', identities: [], is_anonymous: false };
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  const recipe = { id: '11111111-1111-4111-8111-111111111111', title: 'Isolated outcome recipe', title_ar: 'وصفة اختبار الحفظ', brew_method: 'v60', visibility: 'public', bean_id: null, roasted_product_id: null, flavor_notes: [], difficulty: 'beginner', is_incomplete_source: false, dose_grams: 18, water_grams: 300, total_time_seconds: 180, steps: [], equipment: [] };
  const writes: { p_request_id: string; p_payload: Record<string, unknown> }[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = []; let status = 200;
    if (path.endsWith('/token')) data = { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: 'isolated_refresh_fixture', user };
    else if (path.endsWith('/user')) data = user;
    else if (path.endsWith('/recipes')) data = [recipe];
    else if (path.endsWith('/rpc/record_brew_outcome_v1')) {
      const body = route.request().postDataJSON(); writes.push(body);
      status = writes.length === 1 ? 503 : 200;
      data = writes.length === 1 ? { message: 'isolated temporary failure' } : body.p_request_id;
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('isolated-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Recipes', exact: true }).click();
  await page.getByRole('button', { name: recipe.title, exact: true }).click();
  await page.getByRole('button', { name: 'Record my brew', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Check quantities, time, result and actual-brew confirmation.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByRole('switch', { name: 'I actually brewed this cup', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Save was not confirmed. Retry the same request.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Your brew was saved.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(writes[0].p_payload).toMatchObject({ outcome: 'good', share_with_community: false, actual_time_seconds: null, brewed: true, taste_scores: {} });
  expect(writes[0].p_payload).not.toHaveProperty('user_id');
  const persisted = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('auth-token')));
  expect(persisted).toEqual([]);
});
