import { expect, test } from '@playwright/test';
const beans = Array.from({ length: 1000 }, (_, i) => ({
  id: '22222222-2222-4222-8222-' + String(i).padStart(12, '0'), slug: 'performance-' + i,
  name_ar: 'بن اختبار الأداء ' + i, name_en: 'Performance coffee ' + i,
  description_ar: 'قهوة كولومبيا بإيحاءات فراولة وشوكولاتة وكراميل وياسمين',
  description_en: 'Colombian coffee with strawberry chocolate caramel jasmine notes',
  requires_review: false, is_published: true, suitable_for_v60: true, suitable_for_xbloom: true,
  roast_level: 'light', origin_country: 'Colombia', process: 'natural',
  roaster: { name_ar: 'محمصة الاختبار', name_en: 'Test roaster' },
  flavors: [{ flavor: 'chocolate' }, { flavor: 'strawberry' }, { flavor: 'jasmine' }],
}));
test('large catalog keeps account navigation responsive', async ({ page }, info) => {
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(path.endsWith('/beans') ? beans : path.endsWith('/settings') ? { external: { google: true } } : []) });
  });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/');
  await expect(page.getByText('بن اختبار الأداء 0', { exact: true })).toBeVisible();
  const timings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await page.getByRole('button', { name: 'فتح حسابي', exact: true }).click();
    await expect(page.getByLabel('البريد الإلكتروني', { exact: true })).toBeVisible();
    timings.push(Date.now() - start);
    await page.getByRole('button', { name: 'تصفح بدون حساب', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'اكتشف عالم القهوة.' })).toBeVisible();
  }
  console.log('Account navigation at 4x CPU (ms):', timings.join(', '));
  await info.attach('navigation-timings', { body: JSON.stringify(timings), contentType: 'application/json' });
  expect(Math.max(...timings)).toBeLessThan(1000);
});
