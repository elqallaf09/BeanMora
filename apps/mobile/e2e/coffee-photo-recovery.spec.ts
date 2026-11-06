import { test, expect } from '@playwright/test';
import { openRecipeLibrary } from './navigation';
import { readFileSync } from 'node:fs';

const bean = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'photo-fixture', name_ar: 'بن الصورة المحفوظة', name_en: 'Saved photo coffee',
  is_published: true, requires_review: false, image_url: 'storage://member-media/owner/bean.jpg', image_usage_status: 'rights_confirmed', suitable_for_xbloom: true };
const recipe = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Photo recipe', title_ar: 'وصفة الصورة المحفوظة', brew_method: 'xbloom',
  visibility: 'public', bean_id: bean.id, roasted_product_id: null, coffee_bean: bean, cover_image_url: 'https://photo-fixture.test/broken.jpg',
  cover_image_usage_status: 'rights_confirmed', cover_image_permission_ref: 'fixture-only', steps: [], equipment: [], flavor_notes: ['chocolate'] };

for (const mode of ['signed', 'signing-failed', 'no-photo'] as const) test(`coffee imagery recovers in cards and details: ${mode}`, async ({ page }, info) => {
  const payload = { ...recipe, coffee_bean: mode === 'no-photo' ? { ...bean, image_url: null } : bean };
  let signed = 0;
  await page.route('https://photo-fixture.test/**', route => route.abort());
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes('/storage/v1/object/sign/')) {
      signed++;
      return route.fulfill({ status: mode === 'signing-failed' ? 400 : 200, contentType: 'application/json', body: JSON.stringify(
        mode === 'signing-failed' ? { message: 'Missing object' } : { signedURL: '/object/sign/member-media/owner/bean.jpg?token=fixture' }) });
    }
    const rows = path.endsWith('/recipes') || path.endsWith('/rpc/search_public_recipes') ? [payload] : [];
    return route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(rows) });
  });
  // A valid, locally supplied fixture image; it never goes to an external server.
  await page.route('https://mobilefixture.supabase.co/storage/v1/object/sign/member-media/owner/bean.jpg?token=fixture', route =>
    route.fulfill({ contentType: 'image/jpeg', body: readFileSync('assets/images/coffee-beans.jpg') }));
  await page.goto('/'); await openRecipeLibrary(page, 'ar');
  const card = page.getByTestId('recipe-catalog').getByRole('button', { name: recipe.title_ar, exact: true });
  await expect(card).toBeVisible();
  if (mode === 'signed') {
    await expect(card.getByTestId('coffee-product-photo')).toBeVisible();
    await expect(card.getByTestId('coffee-fallback-art')).toHaveCount(0);
    expect(signed).toBeGreaterThan(0);
  } else await expect(card.getByTestId('coffee-fallback-art')).toBeVisible();
  await card.click();
  const detail = page.getByTestId('recipe-detail');
  if (mode === 'signed') {
    await expect(detail.getByTestId('coffee-product-photo')).toBeVisible();
    await expect(detail.getByTestId('coffee-fallback-art')).toHaveCount(0);
  } else await expect(detail.getByTestId('coffee-fallback-art')).toBeVisible();
  await page.screenshot({ path: info.outputPath(`coffee-${mode}.png`) });
});
