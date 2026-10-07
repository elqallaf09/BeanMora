import { test, expect } from '@playwright/test';

test('an unresponsive session refresh cannot block public coffee, equipment or navigation', async ({
  page,
}) => {
  const user = {
    id: '33333333-3333-4333-8333-333333333333',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'startup@example.test',
    app_metadata: { provider: 'email' },
    user_metadata: {},
  };
  const encode = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString('base64url');
  const access = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: 1, role: 'authenticated' })}.isolated_signature`;
  await page.addInitScript(
    ({ user, access }) =>
      localStorage.setItem(
        'sb-mobilefixture-auth-token',
        JSON.stringify({
          user,
          access_token: access,
          refresh_token: 'isolated_refresh',
          token_type: 'bearer',
          expires_at: 1,
          expires_in: 1,
        }),
      ),
    { user, access },
  );
  let release!: () => void;
  const stalled = new Promise<void>((resolve) => {
    release = resolve;
  });
  let refreshAttempted = false;
  const publicRequests: string[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/token')) {
      refreshAttempted = true;
      await stalled;
      return route.abort();
    }
    let data: unknown = [];
    if (path.endsWith('/beans'))
      data = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name_ar: 'بن جاهز أثناء تجديد الجلسة',
          name_en: 'Coffee during refresh',
          requires_review: false,
          is_published: true,
          flavors: [],
          images: [],
        },
      ];
    if (path.endsWith('/equipment_models'))
      data = [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Available scale',
          category: 'scale',
          requires_review: false,
          specifications: {
            catalog: { schema_version: 1, name_ar: 'ميزان متاح الآن' },
          },
          brand: { name: 'Fixture' },
        },
      ];
    if (path.includes('/rest/')) {
      publicRequests.push(path);
      expect(route.request().headers().authorization).not.toContain(
        'isolated_signature',
      );
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  try {
    await page.goto('/');
    await expect.poll(() => refreshAttempted).toBe(true);
    await expect(
      page.getByRole('button', {
        name: 'بن جاهز أثناء تجديد الجلسة',
        exact: true,
      }),
    ).toBeVisible({ timeout: 3000 });
    await page
      .getByRole('button', { name: 'أدوات القهوة', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'ميزان متاح الآن', exact: true }),
    ).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'حسابي', exact: true }).click();
    await expect(
      page.getByLabel('البريد الإلكتروني', { exact: true }),
    ).toBeVisible();
    expect(publicRequests.some((path) => path.endsWith('/beans'))).toBe(true);
  } finally {
    release();
  }
});
