import { setLanguage } from './settings';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Reviewed public catalog facts, replayed through an isolated API. Source links
// are replaced with fixture URLs; this suite never connects to production.
const reviewed = JSON.parse(readFileSync('../../supabase/research/coffee-personality-2026-10-05/profiles.json', 'utf8')) as {
  id: string; slug: string; name: string; notes: string[]; profile: Record<string, unknown>;
}[];
const base = { requires_review: false, is_published: true, suitable_for_v60: true, images: [], roaster: { name_en: 'Reviewed roaster', name_ar: 'محمصة موثقة' } };
const complete = reviewed.map(row => ({ ...base, id: row.id, slug: row.slug, name_ar: row.name, name_en: row.name,
  flavors: row.notes.map(flavor => ({ flavor })), source_url: 'https://source-fixture.test/'+row.slug,
  sensory_profile: { ...row.profile, source_url: 'https://source-fixture.test/'+row.slug },
}));
const partial = { ...base, id: '91919191-9191-4191-8191-919191919191', slug: 'partial-personality', name_ar: 'بن ببيانات جزئية', name_en: 'Coffee with partial data',
  source_url: 'https://source-fixture.test/partial', flavors: [{ flavor: 'Cocoa' }],
  sensory_profile: { source_url: 'https://source-fixture.test/partial', scale_max: 5, acidity: 0, sweetness: 4 },
};
const empty = { ...base, id: '92929292-9292-4292-8292-929292929292', slug: 'pending-personality', name_ar: 'بن بانتظار التوثيق', name_en: 'Coffee awaiting taste details', flavors: [] };
const qualitative = complete.find(row => row.slug === 'black-knight-excelso-colombia')!;
const scored = complete.find(row => row.slug === 'the-barn-atlas-guatemala')!;

for (const { locale, width, height } of [
  { locale: 'ar', width: 320, height: 960 },
  { locale: 'ar', width: 768, height: 1024 },
  { locale: 'en', width: 1536, height: 864 },
] as const) test(`${locale} ${width}: source-backed full profiles, partial records and the complete filter stay distinct`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const rows = new URL(route.request().url()).pathname.endsWith('/beans') ? [...complete, partial, empty] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: {
      'content-range': rows.length ? `0-${rows.length-1}/${rows.length}` : '*/0', 'access-control-expose-headers': 'content-range',
    }, body: JSON.stringify(rows) });
  });
  await page.goto('/');
  if (locale === 'en') {
    await setLanguage(page, 'en');
  }
  const browse = page.getByRole('button', { name: locale === 'ar' ? 'البن والإيحاءات' : 'Coffee & taste', exact: true });
  const fullFilter = page.getByRole('button', { name: locale === 'ar' ? 'شخصية البن مكتملة' : 'Complete personality', exact: true });
  const back = page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true });
  await browse.click(); await fullFilter.click();
  await expect(page.getByRole('button', { name: locale === 'ar' ? partial.name_ar : partial.name_en, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: locale === 'ar' ? empty.name_ar : empty.name_en, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: qualitative.name_en, exact: true }).click();
  const profile = page.getByTestId('coffee-sensory');
  await expect(profile.getByTestId('coffee-personality-complete')).toBeVisible();
  await expect(profile.getByRole('heading', { name: locale === 'ar' ? 'شخصية البن' : 'Coffee personality', exact: true })).toBeVisible();
  await expect(profile.getByTestId('coffee-attribute-acidity')).toContainText(locale === 'ar' ? 'ناعمة ومتزنة' : 'Soft and balanced');
  await expect(profile.getByTestId('coffee-attribute-sweetness')).toContainText(locale === 'ar' ? 'واضحة' : 'Clear');
  await expect(profile.getByTestId('coffee-attribute-body')).toContainText(locale === 'ar' ? 'كريمي ممتلئ' : 'Full and creamy');
  await expect(profile.getByTestId('coffee-flavor-notes')).toContainText(locale === 'ar' ? 'كريمة اللوز' : 'Almond cream');
  await expect(profile.getByTestId('coffee-personality-status')).toHaveCount(0);
  await expect(profile.getByText(/\d\/5/)).toHaveCount(0);
  if (width >= 768) {
    const acidity = await profile.getByTestId('coffee-attribute-acidity').boundingBox();
    const body = await profile.getByTestId('coffee-attribute-body').boundingBox();
    expect(locale === 'ar' ? acidity!.x - body!.x : body!.x - acidity!.x).toBeGreaterThan(0);
  }
  await profile.screenshot({ path: testInfo.outputPath(`personality-${locale}-${width}.png`) });
  if (width === 768) {
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(profile.getByTestId('coffee-attribute-body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width, height });
  }
  await back.click();
  await page.getByRole('button', { name: scored.name_en, exact: true }).click();
  await expect(profile.getByLabel(locale === 'ar' ? 'الحموضة: 3/5' : 'Acidity: 3/5', { exact: true })).toBeVisible();
  await expect(profile.getByLabel(locale === 'ar' ? 'الحلاوة: 4/5' : 'Sweetness: 4/5', { exact: true })).toBeVisible();
  await expect(profile.getByLabel(locale === 'ar' ? 'القوام: 4/5' : 'Body: 4/5', { exact: true })).toBeVisible();
  await back.click();
  await page.getByRole('button', { name: locale === 'ar' ? 'كل البن' : 'All coffees', exact: true }).click();
  await page.getByRole('button', { name: locale === 'ar' ? partial.name_ar : partial.name_en, exact: true }).click();
  await expect(profile.getByTestId('coffee-personality-complete')).toHaveCount(0);
  await expect(profile.getByRole('heading', { name: locale === 'ar' ? 'شخصية البن' : 'Coffee personality', exact: true })).toHaveCount(0);
  await expect(profile.getByTestId('coffee-personality-status')).toContainText(locale === 'ar' ? 'القوام' : 'Body');
  await expect(profile.getByLabel(locale === 'ar' ? 'الحموضة: 0/5' : 'Acidity: 0/5', { exact: true })).toBeVisible();
  await expect(profile.getByTestId('coffee-attribute-body')).toHaveCount(0);
  await back.click();
  await page.getByRole('button', { name: locale === 'ar' ? empty.name_ar : empty.name_en, exact: true }).click();
  await expect(profile.getByTestId('coffee-personality-complete')).toHaveCount(0);
  await expect(profile.getByTestId('coffee-flavor-notes')).toHaveCount(0);
  await expect(profile.locator('[data-testid^="coffee-attribute-"]')).toHaveCount(0);
  await expect(profile.getByTestId('coffee-personality-status')).toBeVisible();
  await back.click();
  await fullFilter.click();
  await page.getByRole('button', { name: locale === 'ar' ? 'مكتبة الوصفات' : 'Recipe library', exact: true }).click();
  await browse.click();
  await expect(page.getByRole('button', { name: locale === 'ar' ? partial.name_ar : partial.name_en, exact: true })).toBeVisible();
  if (locale === 'ar') {
    await page.getByRole('textbox').fill('كاكاو');
    await expect(page.getByRole('button', { name: partial.name_ar, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: scored.name_en, exact: true })).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
