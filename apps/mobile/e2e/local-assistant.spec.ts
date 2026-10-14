import { expect, test, type Page } from '@playwright/test';
import { setLanguage } from './settings';

async function openAssistant(page: Page, offlineCatalog = false, expiredOffer = false) {
  let providerCalls = 0;
  const searches: unknown[] = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (/openai|anthropic|generativelanguage|functions\/v1\/coffee-assistant/.test(url)) { providerCalls++; return route.abort(); }
    if (!url.startsWith('https://mobilefixture.supabase.co')) return route.continue();
    const path = new URL(url).pathname;
    if (offlineCatalog && /search_coffee_assistant|catalog_currency_rates/.test(path)) return route.abort();
    let data: unknown = [];
    if (path.endsWith('/rpc/search_coffee_assistant_recipes')) {
      const query = route.request().postDataJSON();
      searches.push(query);
      // Return wrong-style and wrong-brewer records too: the client must retain
      // the user's constraints even if a backend response is inconsistent.
      const base = { kind: 'recipe', category: null, offers: [], methods: ['xbloom'], source_url: 'https://recipe.example/coconut', summary_ar: 'إعدادات التحضير من المصدر؛ الماء بالملليلتر. افتح الرابط الأصلي لتعليمات الجهاز. وقت التحضير الكلي غير منشور.', summary_en: 'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.', facts: { dose: 15, water: null, temperature: 90, grind: '57', notes: ['Coconut'], serving_style: 'iced', source_brew: { water_ml: 150, model: 'Original' }, steps: [{ description_ar: 'صب 45 مل حسب المصدر.', description_en: 'Pour 45 ml as published.' }, {description_ar:'الماء: 35 مل · حرارة المصدر: 92 · التدفق: غير منشور · التوقف: 19 ث. راجع نمط الصب في رابط المصدر.',description_en:'Water: 35 ml; source temperature: 92; flow: unspecified ml/s; pause: 19 s. Check the original link for pouring pattern.'}] } };
      data = [
        { ...base, id: 'cold-coconut', title_ar: 'وصفة جوز الهند الباردة', title_en: 'Cold coconut recipe', search_text: 'coconut xbloom' },
        { ...base, id: 'hot-both', title_ar: 'وصفة حارة', title_en: 'Hot recipe', search_text: 'coconut honey xbloom', facts: { ...base.facts, serving_style: 'hot' } },
        { ...base, id: 'cold-v60', title_ar: 'وصفة V60', title_en: 'V60 recipe', search_text: 'coconut honey', methods: ['v60'] },
      ];
    }
    if (path.endsWith('/rpc/search_coffee_assistant')) {
      const query = route.request().postDataJSON();
      searches.push(query);
      const namedLimu = query.p_terms.includes('ليمو') || query.p_terms.includes('limu');
      data = query.p_kind === 'roaster'
        ? [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0', kind: 'roaster', title_ar: namedLimu ? 'محمصة ليمو' : query.p_terms.includes('ark') ? 'آرك روسترز' : 'ألتيتيود روسترز', title_en: namedLimu ? 'Limu Roastery' : query.p_terms.includes('ark') ? 'A R K Roasters' : 'Altitude Roasters', search_text: namedLimu ? 'محمصة ليمو Limu Roastery KW' : query.p_terms.includes('ark') ? 'آرك روسترز A R K Roasters KW' : 'Altitude Roasters KW', summary_ar: '', summary_en: '', category: null, methods: [], facts: { country: 'KW' }, offers: [], source_url: namedLimu ? 'https://limukw.com/' : query.p_terms.includes('ark') ? 'https://www.ark.com.kw/pages/about' : 'https://altituderoasters.co/en/' }]
        : query.p_kind === 'coffee' ? [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaac0', kind: 'coffee', title_ar: 'بن مونتيبلانكو التجريبي', title_en: 'Fixture Monteblanco', search_text: 'Fixture Monteblanco Coconut Lemonade', summary_ar: 'جوز الهند والليمونادة؛ تخمير مشترك مع إضافات بحسب المصدر.', summary_en: 'Coconut and lemonade; co-fermented and infused according to the source.', category: null, methods: ['v60'], facts: { notes: ['Coconut', 'Lemonade'] }, offers: [], source_url: 'https://roaster.example/coffee' },
          ...[['cocoa', 'بن الكاكاو التجريبي', 'Cacao'], ['wine', 'بن واين التجريبي', 'Red Wine'], ['unrelated', 'بن غير مطابق', 'Whole coffee beans chocolate winegum']].map(([id, title, notes]) => ({ id, kind: 'coffee', title_ar: title, title_en: title, search_text: notes, summary_ar: notes, summary_en: notes, category: null, methods: [], facts: { notes: [notes] }, offers: [], source_url: 'https://roaster.example/coffee' }))]
        : [300, 400].map((amount, i) => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${i}`, kind: 'equipment', title_ar: `ماكينة ${i + 1}`, title_en: `Machine ${i + 1}`, search_text: 'espresso machine manual', summary_ar: 'أداة إسبريسو محمولة بمضخة يدوية وسلة غير مضغوطة؛ لا تسخّن الماء.', summary_en: 'Portable hand-pump espresso maker with an unpressurised basket; does not heat water.', category: 'espresso_machine', methods: ['espresso'], facts: { operation: ['ذراع يدوي','Manual lever'], heats_water:'No', capacity:'80 ml water', ...(i ? {} : { pressure_gauge: ['نعم','Yes'] }) }, offers: [{ amount, currency: 'USD', checked_at: new Date(Date.now() - (expiredOffer ? 30 * 86400000 : 0)).toISOString(), region: 'US', url: 'https://seller.example/machine', availability: 'in_stock' }], source_url: 'https://seller.example/machine' }));
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'خبير القهوة', exact: true }).click();
  return { providerCalls: () => providerCalls, searches };
}
async function ask(page: Page, question: string, english = false) {
  await page.getByLabel(english ? 'Your coffee question' : 'سؤالك عن القهوة', { exact: true }).fill(question);
  await page.getByRole('button', { name: english ? 'Send' : 'إرسال', exact: true }).click();
}

for (const english of [false, true]) test(`the reported cold xBloom recipe request replaces shopping and shows published recipe facts (${english ? 'en' : 'ar'})`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const network = await openAssistant(page);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'A website selling espresso machines' : 'موقع بيع مكائن اسبرسو', english);
  await expect(page.getByTestId('assistant-result')).toHaveCount(2);
  await ask(page, english ? 'Find a cold recipe for my xBloom machine with coconut and honey notes' : 'طلعلي وصفة قهوه باردة حق مكينة اكسبلوم لي بن ايحاءة جوز الهند وعسل', english);
  await expect(page.getByTestId('assistant-result')).toHaveCount(1);
  await expect(page.getByTestId('assistant-result')).toContainText(english ? 'Cold coconut recipe' : 'وصفة جوز الهند الباردة');
  await expect(page.getByTestId('assistant-result')).toContainText(english ? 'Cold' : 'بارد');
  await expect(panel).toContainText(english ? 'Not confirmed in this recipe: honey' : 'غير مثبت في هذه الوصفة: عسل');
  await expect(panel).toContainText('150 ml');
  await expect(panel).not.toContainText('150 g');
  await expect(panel).toContainText('57');
  await expect(panel).toContainText('Original');
  await expect(panel).toContainText(english ? 'Pour 45 ml' : 'صب 45 مل');
  await expect(panel.getByRole('button', { name: english ? 'Seller website' : 'موقع البائع', exact: true })).toHaveCount(0);
  expect(network.searches.at(-1)).toEqual({ p_terms: expect.arrayContaining(['coconut', 'جوز الهند', 'honey', 'عسل']), p_methods: ['xbloom'], p_serving_style: 'cold', p_limit: 60 });
  expect(network.providerCalls()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const english of [false, true]) test(`espresso seller websites replace a previous coffee topic (${english ? 'en' : 'ar'})`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const network = await openAssistant(page);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'Recommend beans with coconut notes' : 'أبي بن جوز الهند', english);
  await expect(page.getByTestId('assistant-result')).toHaveCount(1);
  await ask(page, english ? 'A website selling espresso machines' : 'موقع بيع مكائن اسبرسو', english);
  const results = page.getByTestId('assistant-result');
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText(english ? 'Machine 1' : 'ماكينة 1');
  await expect(results.nth(1)).toContainText(english ? 'Machine 2' : 'ماكينة 2');
  await expect(panel.getByRole('button', { name: english ? 'Seller website' : 'موقع البائع', exact: true })).toHaveCount(2);
  await expect(results.getByRole('button', { name: english ? 'Original source' : 'المصدر الأصلي', exact: true })).toHaveCount(0);
  const shop = panel.getByRole('button', { name: english ? 'Seller website' : 'موقع البائع', exact: true }).first();
  await shop.scrollIntoViewIfNeeded();
  await page.context().route('https://seller.example/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Isolated seller fixture</p>' }));
  const destination = page.waitForEvent('popup');
  await shop.click();
  const seller = await destination;
  expect(seller.url()).toBe('https://seller.example/machine');
  await seller.close();
  expect(network.searches.at(-1)).toEqual(expect.objectContaining({ p_kind: 'equipment', p_category: 'espresso_machine', p_methods: ['espresso'], p_terms: [] }));
  expect(network.providerCalls()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('seller websites stay usable when their documented prices have expired', async ({ page }) => {
  const network = await openAssistant(page, false, true);
  await ask(page, 'موقع بيع مكائن اسبرسو');
  const results = page.getByTestId('assistant-result');
  await expect(results).toHaveCount(2);
  await expect(results.first()).toContainText('لا يتوفر سعر حديث موثق');
  await expect(results.first().getByRole('button', { name: 'موقع البائع: seller.example', exact: true })).toBeVisible();
  await expect(results.first()).not.toContainText('300 USD');
  await expect(results.first()).not.toContainText('متوفر حسب آخر تحقق');
  expect(network.providerCalls()).toBe(0);
});

test('the reported coconut question recommends coffee by name with its source, not a sensory lesson', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 960 });
  const network = await openAssistant(page);
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, 'شنو احسن بن ايحاء جوز الهند');
  await expect(panel).toContainText('أقرب ترشيح لطلبك: بن مونتيبلانكو التجريبي');
  await expect(panel).toContainText('يطابق: جوز الهند');
  await expect(page.getByTestId('assistant-result')).toHaveCount(1);
  await expect(page.getByTestId('assistant-result')).toContainText('تخمير مشترك مع إضافات');
  await expect(panel.getByRole('button', { name: 'المصدر الأصلي', exact: true })).toBeVisible();
  await expect(panel).not.toContainText('Sensory lexicon');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'coffee', p_terms: expect.arrayContaining(['coconut', 'جوز الهند']) })]);
  await panel.getByRole('button', { name: 'اشرح الأول', exact: true }).click();
  await expect(panel).toContainText('تخمير مشترك مع إضافات');
  expect(network.searches).toHaveLength(1);
  expect(network.providerCalls()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reported Arabic cocoa, wine and whisky questions use the same catalog concepts as English', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1000 });
  const network = await openAssistant(page);
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, 'معالجات البن');
  await expect(panel).toContainText('لا يعني إضافة عسل');
  for (const [question, term, title] of [
    ['طلعلي بن بطعم الككاو', 'cocoa', 'بن الكاكاو التجريبي'],
    ['عطني بن نكته واين', 'wine', 'بن واين التجريبي'],
    ['i want beans wine', 'wine', 'بن واين التجريبي'],
  ]) {
    await ask(page, question);
    await expect(page.getByTestId('assistant-result')).toHaveCount(1);
    await expect(page.getByTestId('assistant-result')).toContainText(title);
    expect(network.searches.at(-1)).toEqual(expect.objectContaining({ p_kind: 'coffee', p_terms: expect.arrayContaining([term]) }));
    expect((network.searches.at(-1) as { p_terms: string[] }).p_terms).not.toContain('beans');
  }
  await ask(page, 'شنو بن ايحاء ويسكي');
  await expect(panel).toContainText('لم أجد بنًا منشورًا يطابق «ويسكي»');
  await expect(page.getByTestId('assistant-result')).toHaveCount(0);
  expect(network.searches).toHaveLength(4);
  expect(network.searches.at(-1)).toEqual(expect.objectContaining({ p_kind: 'coffee', p_terms: expect.arrayContaining(['whisky', 'whiskey', 'ويسكي']) }));
  expect(network.providerCalls()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Arabic conversation clarifies currency, compares and resolves references without provider requests', async ({ page }) => {
  const network = await openAssistant(page);
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, 'أبي ماكينة إسبريسو تحت ٤٨٠');
  await expect(panel).toContainText('حدد عملة الميزانية');
  expect(network.searches).toHaveLength(0);
  await panel.getByRole('button', { name: 'USD', exact: true }).click();
  await expect(page.getByTestId('assistant-result')).toHaveCount(2);
  await panel.getByRole('button', { name: 'قارن الأول والثاني', exact: true }).click();
  await expect(panel).toContainText('أقارن المواصفات المنشورة');
  await expect(panel).toContainText('غير مذكور في المصدر');
  await ask(page, 'اشرح الثاني');
  await expect(page.getByTestId('assistant-result')).toHaveCount(1);
  expect(network.searches).toHaveLength(1);
  expect(network.providerCalls()).toBe(0);
  await panel.getByRole('button', { name: 'محادثة جديدة', exact: true }).click();
  await ask(page, 'اشرح الثاني');
  await expect(panel).toContainText('ابحث عن الخيارات أولًا');
  await expect(page.getByTestId('assistant-result')).toHaveCount(0);
});
for (const width of [320, 800]) {
  test(`offline calculations keep context and distinguish espresso yield (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const network = await openAssistant(page, true);
    await setLanguage(page, 'en');
    await ask(page, 'Calculate 18 g at 1:16', true);
    const panel = page.getByTestId('coffee-assistant');
    await expect(panel).toContainText('288 g');
    await panel.getByRole('button', { name: 'Make it 20 g', exact: true }).click();
    await expect(panel).toContainText('320 g');
    await ask(page, 'Espresso 18 g 1:2', true);
    await expect(panel).toContainText('Target espresso beverage yield: 36 g');
    expect(network.searches).toHaveLength(0);
    expect(network.providerCalls()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('brewing guidance remains available when the catalog cannot be reached', async ({ page }) => {
  const network = await openAssistant(page, true);
  await ask(page, 'أبي ماكينة اسبريسو');
  const panel = page.getByTestId('coffee-assistant');
  await expect(panel).toContainText('تعذّر الوصول لبيانات الكتالوغ');
  await expect(page.getByLabel('سؤالك عن القهوة', { exact: true })).toHaveValue('أبي ماكينة اسبريسو');
  await ask(page, 'قهوتي حامضة');
  await expect(panel).toContainText('تستخدم إسبريسو أم V60');
  await panel.getByRole('button', { name: 'V60', exact: true }).click();
  await expect(panel).toContainText('أنعم قليلًا');
  await expect(panel.getByRole('button', { name: 'Barista Hustle — Coffee Compass', exact: true })).toBeVisible();
  expect(network.providerCalls()).toBe(0);
});
test('Kuwaiti roaster search expands the country code before retrieval and displays the result', async ({ page }) => {
  const network = await openAssistant(page);
  await ask(page, 'محامص بالكويت');
  await expect(page.getByTestId('assistant-result')).toContainText('ألتيتيود روسترز');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'roaster', p_terms: expect.arrayContaining(['kuwait', 'kw']) })]);
  expect(network.providerCalls()).toBe(0);
});
test('published spaced roaster names retain an explicit catalog search instead of returning every roaster', async ({ page }) => {
  const network = await openAssistant(page);
  await ask(page, 'محامص A R K');
  await expect(page.getByTestId('assistant-result')).toContainText('آرك روسترز');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'roaster', p_terms: expect.arrayContaining(['ark', 'a r k']) })]);
  expect(network.providerCalls()).toBe(0);
});
test('the singular Arabic roaster query finds Limu instead of answering a roasting lesson', async ({ page }) => {
  const network = await openAssistant(page);
  await ask(page, 'محمصة ليمو');
  await expect(page.getByTestId('assistant-result')).toContainText('محمصة ليمو');
  expect(network.searches).toEqual([expect.objectContaining({ p_kind: 'roaster', p_terms: expect.arrayContaining(['ليمو']) })]);
  expect(network.providerCalls()).toBe(0);
});
for (const english of [false, true]) test(`symptoms, water measurements and new lessons work offline (${english ? 'en' : 'ar'})`, async ({ page }) => {
  const network = await openAssistant(page, true);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'My V60 is sour after changing water' : 'قهوتي V60 حامضة بعد تغيير الماء', english);
  await expect(panel.getByRole('button', { name: 'Barista Hustle — Coffee Compass', exact: true })).toBeVisible();
  await ask(page, english ? 'dose 18 water 288 150 seconds' : 'جرعة 18 الماء 288 الوقت 150 ثانية', english);
  await expect(panel).toContainText('1:16');
  await ask(page, english ? 'What is cold brew?' : 'الكولد برو والاستخلاص البارد', english);
  await expect(panel.getByRole('button', { name: 'HARIO — Mizudashi', exact: true })).toBeVisible();
  await ask(page, english ? 'Tell me more' : 'اشرح أكثر', english);
  await expect(panel).toContainText(english ? 'Not every cold brew is a concentrate' : 'لا تفترض أن كل كولد برو مركز');
  expect(network.searches).toHaveLength(0);
  expect(network.providerCalls()).toBe(0);
});
for (const english of [false, true]) test(`a new brewer clears old measurements and immersion sources work offline (${english ? 'en' : 'ar'})`, async ({ page }) => {
  const network = await openAssistant(page, true);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'My espresso tastes sour' : 'قهوتي إسبريسو حامضة', english);
  await ask(page, 'dose 18 yield 36 time 30 seconds', english);
  await expect(panel).toContainText('1:2');
  await ask(page, english ? 'My V60 tastes sour' : 'قهوتي V60 حامضة', english);
  await expect(panel).not.toContainText('1:2');
  await ask(page, 'dose 20 water 320 time 180 seconds', english);
  await expect(panel).toContainText('1:16');
  await ask(page, english ? 'Explain French press immersion' : 'اشرح النقع والفرنش برس', english);
  await expect(panel.getByRole('button', { name: 'NCA — French press', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'HARIO — Switch with Partners Coffee', exact: true })).toBeVisible();
  expect(network.searches).toHaveLength(0);
  expect(network.providerCalls()).toBe(0);
});
test('a specific lesson replaces previous shopping results', async ({ page }) => {
  await openAssistant(page);
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, 'أبي ماكينة إسبريسو تحت 480 دولار');
  await expect(page.getByTestId('assistant-result')).toHaveCount(2);
  await ask(page, 'اشرح الماء');
  await expect(panel).toContainText('TDS وحده');
  await expect(page.getByTestId('assistant-result')).toHaveCount(0);
});
for (const english of [false, true]) test(`direct espresso flow complaints stay local (${english ? 'en' : 'ar'})`, async ({ page }) => {
  const network = await openAssistant(page, true);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'Espresso is fast, dose:18 yield:36, 30 seconds' : 'الإسبريسو سريع جرعة:18 الناتج:36 في 30 ثانية', english);
  await expect(panel).toContainText('1:2');
  await expect(panel).toContainText(english ? 'finer' : 'أنعم');
  await ask(page, english ? 'Espresso is too slow' : 'الإسبريسو بطيء', english);
  await expect(panel).toContainText(english ? 'coarser' : 'أخشن');
  expect(network.searches).toHaveLength(0);
  expect(network.providerCalls()).toBe(0);
});
for (const english of [false, true]) test(`colloquial weights and espresso flow coaching stay local (${english ? 'en' : 'ar'})`, async ({ page }) => {
  const network = await openAssistant(page, true);
  if (english) await setLanguage(page, 'en');
  const panel = page.getByTestId('coffee-assistant');
  await ask(page, english ? 'My espresso is sour dose: 18 yield: 36 time: 30 seconds' : 'الإسبريسو حامض جرعة ١٨ غرام خرج ٣٦ غرام في ٣٠ ثانية', english);
  await expect(panel).toContainText('1:2');
  await ask(page, english ? 'My espresso shot is fast' : 'استخلاص الإسبريسو سريع', english);
  await expect(panel).toContainText(english ? 'finer' : 'أنعم');
  await expect(panel.getByRole('button', { name: 'Flair — Dialing in espresso', exact: true })).toBeVisible();
  await ask(page, english ? 'My espresso shot is slow' : 'استخلاص الإسبريسو بطيء', english);
  await expect(panel).toContainText(english ? 'coarser' : 'أخشن');
  await ask(page, english ? 'yield: 36 ml' : 'الناتج: 36 مل', english);
  await expect(panel).not.toContainText('1:2');
  await expect(panel).toContainText(english ? 'milliliters' : 'الملليلتر');
  expect(network.searches).toHaveLength(0);
  expect(network.providerCalls()).toBe(0);
});

const newLanguages = [
  {locale:'ja',question:'xBloom の冷たいコーヒーレシピ、ココナッツとはちみつの風味',shop:'エスプレッソマシンを販売するサイト',send:'送信',cold:'冷たい'},
  {locale:'fr',question:'une recette froide pour ma machine xBloom avec des notes de noix de coco et miel',shop:'un site qui vend des machines espresso',send:'Envoyer',cold:'Froid'},
  {locale:'it',question:'una ricetta fredda per la macchina xBloom con note di cocco e miele',shop:'un sito per comprare una macchina espresso',send:'Invia',cold:'Freddo'},
  {locale:'es',question:'una receta fría para mi máquina xBloom con notas de coco y miel',shop:'un sitio que venda máquinas espresso',send:'Enviar',cold:'Frío'},
  {locale:'pt-BR',question:'uma receita gelada para minha máquina xBloom com notas de coco e mel',shop:'um site para comprar máquinas espresso',send:'Enviar',cold:'Gelado'},
  {locale:'zh-CN',question:'xBloom 冷饮配方 椰子和蜂蜜风味',shop:'买浓缩咖啡机的网站',send:'发送',cold:'冷饮'},
] as const;
for(const language of newLanguages) test(`localized cold recipe search retains original facts and question (${language.locale})`,async({page})=>{
  const network=await openAssistant(page);
  await setLanguage(page,language.locale);
  const panel=page.getByTestId('coffee-assistant');
  await panel.getByRole('textbox').fill(language.shop);
  await panel.getByRole('button',{name:language.send,exact:true}).click();
  await expect(panel.getByTestId('assistant-result')).toHaveCount(2);
  await expect(panel).not.toContainText('Portable hand-pump espresso maker');
  await expect(panel).not.toContainText('Manual lever');
  await expect(panel).not.toContainText('80 ml water');
  await expect(panel).toContainText('80');
  expect(network.searches.at(-1)).toMatchObject({p_kind:'equipment',p_category:'espresso_machine',p_terms:[]});
  await panel.getByRole('textbox').fill(language.question);
  await panel.getByRole('button',{name:language.send,exact:true}).click();
  await expect(panel.getByTestId('assistant-result')).toHaveCount(1);
  await expect(panel).toContainText(language.question);
  await expect(panel).toContainText(language.cold);
  await expect(panel).toContainText('15 g');await expect(panel).toContainText('150 ml');
  await expect(panel).toContainText('57');await expect(panel).toContainText('Original');
  await expect(panel).not.toContainText('Source brew settings; water is in ml.');
  await expect(panel).not.toContainText('unspecified');
  await expect(panel).toContainText('35 ml');await expect(panel).toContainText('92');await expect(panel).toContainText('19');
  await expect(panel).not.toContainText('No recipe matched every search term.');
  expect(network.searches.at(-1)).toMatchObject({p_methods:['xbloom'],p_serving_style:'cold',p_limit:60});
  expect(network.providerCalls()).toBe(0);
});

test('language changes re-render the existing answer without another request or changed quantities',async({page})=>{
  const network=await openAssistant(page);
  await setLanguage(page,'en');
  await ask(page,'Calculate 18 g at 1:16',true);
  const panel=page.getByTestId('coffee-assistant');
  await expect(panel).toContainText('Requested ratio calculation');
  await setLanguage(page,'ja');await expect(panel).toContainText('指定した比率の計算');
  await expect(panel).toContainText('18 g × 16 = 288 g');
  await setLanguage(page,'fr');await expect(panel).toContainText('Calcul du ratio demandé');
  await expect(panel).toContainText('18 g × 16 = 288 g');
  expect(network.searches).toHaveLength(0);expect(network.providerCalls()).toBe(0);
});

for(const language of newLanguages) test(`language persists and remains within the viewport (${language.locale})`,async({page})=>{
  await page.setViewportSize({width:320,height:844});
  await openAssistant(page);await setLanguage(page,language.locale);
  await expect(page.locator('html')).toHaveAttribute('lang',language.locale);
  await expect(page.locator('html')).toHaveAttribute('dir','ltr');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',language.locale);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
  await setLanguage(page,'ar');await expect(page.locator('html')).toHaveAttribute('dir','rtl');
});
