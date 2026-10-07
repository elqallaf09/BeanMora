import { test, expect } from '@playwright/test';

const models = Array.from({ length: 120 }, (_, i) => ({
  id: '44444444-4444-4444-8444-' + String(i).padStart(12, '0'),
  name: `${i % 2 ? 'Rocket' : 'Profitec'} Model ${String(i).padStart(3, '0')}`,
  category: i % 3 ? 'espresso_machine' : 'grinder',
  brand: { name: i % 2 ? 'Rocket' : 'Profitec' },
  requires_review: false,
  specifications: {
    catalog: {
      schema_version: 1,
      name_ar: `موديل تجربة ${String(i).padStart(3, '0')}`,
      facts: { operation: ['تشغيل يدوي', 'Manual operation'] },
    },
  },
}));

for (const width of [390, 1024])
  test(`equipment filters, comparison and cached return at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let reads = 0;
    await page.route('https://mobilefixture.supabase.co/**', (route) => {
      const equipment = new URL(route.request().url()).pathname.endsWith(
        '/equipment_models',
      );
      if (equipment) reads++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(equipment ? models : []),
      });
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'English', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Equipment', exact: true })
      .click();
    await expect(
      page.getByText('120 of 120 models', { exact: true }),
    ).toBeVisible();
    // A large catalog must not mount every card on entry.
    expect(
      await page.locator('[data-testid^="equipment-card-"]').count(),
    ).toBeLessThan(80);
    await page
      .getByRole('button', { name: 'Rocket', exact: true })
      .click();
    await expect(
      page.getByText('60 of 120 models', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Find equipment', { exact: true }).fill('119');
    await expect(
      page.getByText('1 of 120 models', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: models[119].name, exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Clear equipment filters',
        exact: true,
      })
      .click();
    await page
      .getByLabel('Find equipment', { exact: true })
      .fill('Model 00');
    await expect(
      page.getByText('10 of 120 models', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Add to comparison', exact: true })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Add to comparison', exact: true })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Compare (2/3)', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Equipment comparison',
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Close comparison', exact: true })
      .click();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page
      .getByRole('button', { name: 'Equipment', exact: true })
      .click();
    await expect(
      page.getByText('120 of 120 models', { exact: true }),
    ).toBeVisible();
    expect(reads).toBe(1);
    await page
      .getByRole('button', { name: 'العربية', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'أدوات القهوة', exact: true })
      .click();
    await expect(
      page.getByText('120 من 120 موديلًا', { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('ابحث عن أداة', { exact: true })
      .fill('تجربة 119');
    await expect(
      page.getByRole('button', { name: 'موديل تجربة 119', exact: true }),
    ).toBeVisible();
    const card = await page
      .getByTestId('equipment-card-' + models[119].id)
      .boundingBox();
    expect(card!.height).toBeLessThan(245);
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`equipment-${width}.png`),
    });
    expect(errors).toEqual([]);
  });
