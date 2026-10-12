import { test, expect, type Page } from '@playwright/test';
import { setLanguage } from './settings';
const id = '11111111-1111-4111-8111-111111111111';
const recipe = { id, title: 'Public source profile', title_ar: 'وصفة المصدر المعزولة', brew_method: 'xbloom', visibility: 'public',
  serving_style: 'hot', bean_id: null, roasted_product_id: null, flavor_notes: ['Chocolate', 'Caramel'], steps: [], equipment: [],
  source_coffee_name: 'Different source coffee', source_origin_country: 'Brazil',
  source_brew_parameters: { model: 'Studio', dose: 15, water_ml: 240, grind_size: 50, pours: [{ volume: 240, temperature: 92 }] } };
async function fixtures(page: Page, mode: 'success' | 'error' | 'empty' = 'success') {
  const parameters: Record<string, unknown>[] = []; let fail = mode === 'error'; let serving = 'hot';
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/rpc/recipes_for_coffee_label_v2')) {
      parameters.push(request.postDataJSON()); serving = request.postDataJSON().p_serving === 'cold_or_iced' ? 'iced' : 'hot';
      if (fail) { fail = false; return route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"isolated failure"}' }); }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(mode === 'empty' ? [] : [{ recipe_id: id, match_kind: 'similar', score: 62,
        matching_notes: ['chocolate', 'caramel'], matching_families: ['chocolate', 'sweet'], same_origin: true, same_variety: false,
        same_process: false, same_roast: false, device_model: 'Studio' }]) });
    }
    return route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(path.endsWith('/recipes') ? [{ ...recipe, serving_style: serving }] : []) });
  });
  return parameters;
}
async function openScanner(page: Page, english = true) {
  await page.goto('/'); if (english) await setLanguage(page, 'en');
  await page.getByTestId('library-navigation').getByRole('button', { name: english ? 'Recipe library' : 'مكتبة الوصفات', exact: true }).click();
  await page.getByRole('button', { name: english ? 'Scan coffee for a recipe' : 'صوّر البن واختر الوصفة', exact: true }).click();
  await expect(page.getByTestId('coffee-label-scanner')).toBeVisible();
}
test('real free OCR reads a label, review binds facts only, source ml survive and images never leave the device', async ({ page }) => {
  test.setTimeout(120000);
  const params = await fixtures(page); await openScanner(page);
  const requests: { url: string; method: string; data: string | null }[] = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), data: request.postData() }));
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 850;
    const context = canvas.getContext('2d')!; context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black'; context.font = '54px Arial';
    ['Coffee: Test estate', 'Origin: Brazil', 'Variety: Castillo', 'Processing: Natural', 'Roast: Light', 'Notes: Chocolate, Caramel, Hazelnut']
      .forEach((line, i) => context.fillText(line, 55, 95 + i * 110));
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose a photo', exact: true }).click();
  await (await chooser).setFiles({ name: 'test-label.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  const panel = page.getByTestId('coffee-label-scanner');
  await expect(panel.getByLabel('Coffee origin', { exact: true })).toHaveValue('Brazil', { timeout: 90000 });
  await expect(panel.getByLabel('Variety', { exact: true })).toHaveValue('Castillo');
  await expect(panel.getByLabel('Tasting notes on the bag', { exact: true })).toHaveValue(/Chocolate/);
  await expect(panel.getByRole('button', { name: 'Find the closest recipe', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Crop label and reread', exact: true }).click();
  const crop = panel.getByTestId('coffee-crop-image');
  await crop.scrollIntoViewIfNeeded();
  const size = (await crop.boundingBox())!;
  await crop.click({ position: { x: size.width * .01, y: size.height * .01 } });
  await crop.click({ position: { x: size.width * .99, y: size.height * .99 } });
  await expect(panel.getByTestId('coffee-crop-selection')).toBeVisible();
  await panel.getByRole('button', { name: 'Read selected label', exact: true }).click();
  await expect(panel.getByLabel('Coffee origin', { exact: true })).toHaveValue('Brazil', { timeout: 90000 });
  await panel.getByRole('button', { name: 'I reviewed the label details', exact: true }).click();
  await panel.getByRole('button', { name: 'Find the closest recipe', exact: true }).click();
  await expect(panel.getByTestId('coffee-label-recipe')).toHaveCount(1);
  await expect(panel.getByTestId('recipe-serving-badge')).toHaveText('Hot');
  expect(params[0]).toMatchObject({ p_serving: null, p_limit: 6, p_origin: 'Brazil', p_variety: 'Castillo', p_model: null, p_bean_id: null, p_product_id: null });
  expect(params[0].p_notes).toContain('Chocolate');
  expect(requests.filter(r => r.method === 'POST').every(r => r.url.startsWith('https://mobilefixture.supabase.co/'))).toBe(true);
  expect(requests.filter(r => r.data).every(r => !r.data!.includes('base64'))).toBe(true);
  await panel.getByRole('button', { name: 'Open recipe & source', exact: true }).click();
  await expect(page.getByTestId('recipe-detail')).toBeVisible();
  await expect(page.getByTestId('coffee-label-match-notice')).toContainText('similar coffee');
  await expect(page.getByTestId('recipe-source-facts').getByText('240 ml', { exact: true })).toBeVisible();
});
test('320 px Arabic manual review has no overflow and failed lookup keeps the details for retry', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 960 }); const params = await fixtures(page, 'error'); await openScanner(page, false);
  const panel = page.getByTestId('coffee-label-scanner');
  await expect(panel.getByRole('button', { name: 'اعثر على أقرب وصفة', exact: true })).toBeDisabled();
  await panel.getByLabel('منشأ البن', { exact: true }).fill('برازيل');
  await panel.getByLabel('السلالة', { exact: true }).fill('كاستيلو');
  await panel.getByLabel('الإيحاءات والطعم المكتوب على الكيس', { exact: true }).fill('شوكولاتة، كراميل');
  await panel.getByRole('button', { name: 'اعثر على أقرب وصفة', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('تعذّر البحث');
  await expect(panel.getByLabel('منشأ البن', { exact: true })).toHaveValue('برازيل');
  await panel.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
  await expect(panel.getByTestId('coffee-label-recipe')).toHaveCount(1); expect(params).toHaveLength(2);
  const rect = await panel.boundingBox(); expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.width).toBeLessThanOrEqual(320);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});
test('missing source evidence shows an empty result without manufacturing parameters', async ({ page }) => {
  await fixtures(page, 'empty'); await openScanner(page);
  const panel = page.getByTestId('coffee-label-scanner'); await panel.getByLabel('Coffee origin', { exact: true }).fill('Unknown origin');
  await panel.getByRole('button', { name: 'Find the closest recipe', exact: true }).click();
  await expect(panel.getByTestId('coffee-label-no-match')).toContainText('No close published recipe');
  await expect(panel.getByTestId('coffee-label-recipe')).toHaveCount(0);
});

test('cold choice is sent before ranking and editing the facts clears stale recipes', async ({ page }) => {
  const params = await fixtures(page); await openScanner(page, false);
  const panel = page.getByTestId('coffee-label-scanner');
  await panel.getByLabel('منشأ البن', { exact: true }).fill('اثيوبيا');
  await panel.getByTestId('coffee-label-serving-filters').getByRole('button', { name: 'بارد', exact: true }).click();
  await panel.getByRole('button', { name: 'اعثر على أقرب وصفة', exact: true }).click();
  await expect(panel.getByTestId('coffee-label-recipe')).toHaveCount(1);
  await expect(panel.getByTestId('recipe-serving-badge')).toHaveText('بارد · مثلّج');
  await panel.getByTestId('coffee-label-recipe').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/coffee-label-ar-mobile.png' });
  expect(params[0]).toMatchObject({ p_origin: 'اثيوبيا', p_serving: 'cold_or_iced', p_limit: 6 });
  await panel.getByLabel('منشأ البن', { exact: true }).fill('برازيل');
  await expect(panel.getByTestId('coffee-label-recipe')).toHaveCount(0);
});
