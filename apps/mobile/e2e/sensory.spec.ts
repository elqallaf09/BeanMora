import { test, expect } from '@playwright/test';

// Deliberately tall synthetic artwork makes cover cropping observable.
// Neither these beans nor their sourced scales are used outside this browser fixture.
const photoUrl = 'https://photo-fixture.test/tall-bag.svg';
const sourceUrl = 'https://source-fixture.test/coffee/scored';
const photo = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="400" viewBox="0 0 160 400"><rect x="3" y="3" width="154" height="394" rx="8" fill="#efe2cf" stroke="#6a4634" stroke-width="6"/><rect x="20" y="150" width="120" height="100" fill="#23695f"/><circle cx="14" cy="14" r="7" fill="#b05e46"/><circle cx="146" cy="386" r="7" fill="#b05e46"/></svg>';
const base = {
  requires_review: false, is_published: true, suitable_for_v60: true,
  suitable_for_espresso: false, suitable_for_xbloom: false, roast_level: 'light',
  roaster: { name_en: 'Fixture roaster', name_ar: 'محمصة التجربة', country: 'Kuwait' },
  origin_country: 'Ethiopia', process: 'washed',
};
const scored = {
  ...base, id: '77777777-7777-4777-8777-777777777771', slug: 'sourced-sensory',
  name_en: 'Coffee with a sourced scale', name_ar: 'بن بدرجات موثقة',
  source_url: sourceUrl, flavors: [{ flavor: 'citrus' }, { flavor: 'jasmine' }],
  sensory_profile: { source_url: sourceUrl, scale_max: 5, acidity: 3, sweetness: 4, body: 2 },
  images: [{ url: photoUrl, position: 0, image_usage_status: 'rights_confirmed' }],
};
const unknown = {
  ...base, id: '77777777-7777-4777-8777-777777777772', slug: 'unknown-sensory',
  name_en: 'Coffee without an intensity score', name_ar: 'بن بدون درجات للشدة',
  source_url: 'https://source-fixture.test/coffee/unknown',
  flavors: [{ flavor: 'citrus' }], images: [],
};

for (const { locale, width } of [{ locale: 'ar', width: 320 }, { locale: 'en', width: 768 }] as const) {
  test(`${locale}: a full sourced personality preserves its scale and partial data keeps no empty bars`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('https://source-fixture.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Isolated sensory source</p>' }));
    await page.route(photoUrl, route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: photo }));
    await page.route('https://mobilefixture.supabase.co/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/rpc/search_public_recipes') || path.endsWith('/rpc/recipes_for_coffee')) expect(route.request().method()).toBe('POST');
      const data = path.endsWith('/beans') ? [scored, unknown] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': data.length ? `0-${data.length - 1}/${data.length}` : '*/0', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
    });
    await page.goto('/');
    if (locale === 'en') {
      await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click();
      await page.getByRole('button', { name: 'English', exact: true }).click();
    }
    await page.getByRole('button', { name: locale === 'ar' ? scored.name_ar : scored.name_en, exact: true }).click();
    const profile = page.getByTestId('coffee-sensory');
    await expect(profile).toBeVisible();
    await expect(profile.getByLabel(locale === 'ar' ? 'الحموضة: 3/5' : 'Acidity: 3/5', { exact: true })).toBeVisible();
    await expect(profile.getByLabel(locale === 'ar' ? 'الحلاوة: 4/5' : 'Sweetness: 4/5', { exact: true })).toBeVisible();
    await expect(profile.getByLabel(locale === 'ar' ? 'القوام: 2/5' : 'Body: 2/5', { exact: true })).toBeVisible();
    await expect(profile.getByRole('heading', { name: locale === 'ar' ? 'شخصية البن' : 'Coffee personality', exact: true })).toBeVisible();
    await expect(profile.getByTestId('coffee-personality-complete')).toBeVisible();
    await expect(profile.getByText(locale === 'ar' ? 'غير محددة' : 'Unspecified', { exact: true })).toHaveCount(0);
    const image = page.getByTestId('coffee-product-photo');
    await expect(image).toHaveCount(1);
    await expect.poll(() => image.evaluate(element => Array.from(element.querySelectorAll('img')).some(img => img.complete && img.naturalWidth === 160 && img.naturalHeight === 400))).toBe(true);
    const sizing = await image.evaluate(element => [element, ...Array.from(element.querySelectorAll('*'))].flatMap(node => {
      const style = getComputedStyle(node);
      return style.backgroundImage.includes('tall-bag.svg') ? [style.backgroundSize] : node instanceof HTMLImageElement && node.src.includes('tall-bag.svg') ? [style.objectFit] : [];
    }));
    expect(sizing).toContain('contain');
    const box = await image.boundingBox();
    expect(box!.width / box!.height).toBeGreaterThan(160 / 400);
    const popupPromise = page.waitForEvent('popup');
    await profile.getByRole('link', { name: locale === 'ar' ? /درجات المحمصة.*عرض المصدر/ : /Roaster’s scale.*View source/ }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(sourceUrl);
    await popup.close();
    await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? unknown.name_ar : unknown.name_en, exact: true }).click();
    await expect(profile.getByLabel(locale === 'ar' ? /^الحموضة:/ : /^Acidity:/)).toHaveCount(0);
    await expect(profile.getByTestId('coffee-personality-pending')).toBeVisible();
    await expect(profile.getByTestId('coffee-personality-status')).toContainText(locale === 'ar' ? 'الحموضة، الحلاوة، القوام' : 'Acidity, Sweetness, Body');
    await expect(profile.getByText('3/5', { exact: true })).toHaveCount(0);
    await expect(profile.getByRole('link')).toHaveCount(1);
    await expect(page.getByTestId('coffee-photo-unavailable')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
