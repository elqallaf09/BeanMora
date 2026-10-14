import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Route } from '@playwright/test';
import { setLanguage } from './settings';

const languages = [
  { locale: 'ar', strawberry: 'فراولة', compound: 'فراولة ياسمين', country: 'اليابان' },
  { locale: 'en', strawberry: 'strawberry', compound: 'strawberry jasmine', country: 'Japan' },
  { locale: 'ja', strawberry: 'いちご', compound: 'いちごとジャスミン', country: '日本' },
  { locale: 'fr', strawberry: 'fraise', compound: 'fraise jasmin', country: 'Japon' },
  { locale: 'it', strawberry: 'fragola', compound: 'fragola gelsomino', country: 'Giappone' },
  { locale: 'es', strawberry: 'fresa', compound: 'fresa jazmín', country: 'Japón' },
  { locale: 'pt-BR', strawberry: 'morango', compound: 'morango jasmim', country: 'Japão' },
  { locale: 'zh-CN', strawberry: '草莓', compound: '草莓和茉莉', country: '日本' },
] as const;
const bean = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'strawberry-coffee', name_ar: 'بن الفراولة التجريبي', name_en: 'Strawberry fixture coffee', description_en: 'Strawberry and jasmine', flavors: [{ flavor: 'strawberry' }, { flavor: 'jasmine' }], is_published: true, requires_review: false };
const reply = (route: Route, data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
const arabic: Record<string, string> = { 'Search everything': 'البحث الشامل', 'Open account': 'فتح حسابي', 'Create account': 'إنشاء حساب', Country: 'الدولة', 'Search countries': 'ابحث عن الدولة', Username: 'اسم المستخدم', Email: 'البريد الإلكتروني', Password: 'كلمة المرور', 'Confirm password': 'تأكيد كلمة المرور', 'Phone number': 'رقم الهاتف' };
Object.assign(arabic, { 'Recipe name': 'اسم الوصفة', 'Coffee dose (g)': 'جرعة البن (غرام)', 'Water or beverage weight (g)': 'كمية الماء أو المشروب (غرام)', 'Brew steps — one step per line': 'خطوات التحضير — كل خطوة في سطر', Save: 'حفظ' });
const member = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'member@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: { username: 'locale_member' }, identities: [], created_at: '2026-01-01T00:00:00Z' };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: member.id, role: 'authenticated', is_anonymous: false, exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_fixture_signature`;

for (const language of languages) {
  const pack: Record<string, string> = language.locale === 'ar' || language.locale === 'en' ? {} : JSON.parse(readFileSync(resolve(process.cwd(), 'src/locales', language.locale + '.json'), 'utf8'));
  const label = (key: string) => language.locale === 'ar' ? arabic[key] : pack[key] ?? key;

  test(`native writing and compound catalog search preserve all required terms (${language.locale})`, async ({ page }, info) => {
    const queries: string[] = [];
    await page.route('https://mobilefixture.supabase.co/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/rpc/search_public_recipes')) queries.push(route.request().postDataJSON().p_query);
      return reply(route, path.endsWith('/beans') ? [bean] : []);
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'البحث', exact: true }).click();
    if (language.locale !== 'ar') await setLanguage(page, language.locale);
    const field = page.getByLabel(label('Search everything'), { exact: true });
    const results = page.getByTestId('universal-search-results');
    const coffee = results.getByRole('button', { name: language.locale === 'ar' ? bean.name_ar : bean.name_en, exact: true });
    await field.fill(language.strawberry);
    await expect(field).toHaveValue(language.strawberry);
    await expect(coffee).toBeVisible();
    await expect.poll(() => queries.at(-1)).toBe(language.locale === 'ar' ? language.strawberry : 'strawberry');
    await field.fill(language.compound.normalize('NFD'));
    await expect(field).toHaveValue(language.compound.normalize('NFD'));
    await expect(coffee).toBeVisible();
    await expect.poll(() => queries.at(-1)).toBe(language.locale === 'ar' ? language.compound : 'strawberry jasmine');
    await field.fill(language.strawberry + ' unknown_brand_fixture');
    await expect(coffee).toHaveCount(0);
    await expect.poll(() => queries.at(-1)).toBe((language.locale === 'ar' ? language.strawberry : 'strawberry') + ' unknown_brand_fixture');
    await field.fill(language.strawberry);
    await expect(coffee).toBeVisible();
    await page.screenshot({ path: info.outputPath(`search-${language.locale}.png`), animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test(`localized signup country search and numeric input retain correct metadata (${language.locale})`, async ({ page }) => {
    let metadata: Record<string, unknown> | undefined;
    await page.route('https://mobilefixture.supabase.co/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/signup')) {
        metadata = route.request().postDataJSON().data;
        return reply(route, { user: { id: '99999999-9999-4999-8999-999999999999', email: 'locale@example.test' }, session: null });
      }
      return reply(route, path.endsWith('/settings') ? { external: { google: true, apple: false } } : []);
    });
    await page.goto('/');
    if (language.locale !== 'ar') await setLanguage(page, language.locale);
    await page.getByRole('button', { name: label('Open account'), exact: true }).click();
    await page.getByRole('button', { name: label('Create account'), exact: true }).first().click();
    await page.getByRole('button', { name: label('Country'), exact: true }).click();
    await page.getByLabel(label('Search countries'), { exact: true }).fill(language.country.normalize('NFD'));
    await page.getByRole('button', { name: language.country, exact: true }).click();
    // Other supported languages remain searchable without changing the screen.
    await page.getByRole('button', { name: label('Country'), exact: true }).click();
    await page.getByLabel(label('Search countries'), { exact: true }).fill('Giappone');
    await page.getByRole('button', { name: language.country, exact: true }).click();
    const username = 'locale_' + language.locale.toLowerCase().replace('-', '_');
    await page.getByLabel(label('Username'), { exact: true }).fill(username);
    await page.getByLabel(label('Email'), { exact: true }).fill('locale@example.test');
    await page.getByLabel(label('Password'), { exact: true }).fill('fixture_password');
    await page.getByLabel(label('Confirm password'), { exact: true }).fill('fixture_password');
    await page.getByLabel(label('Phone number'), { exact: true }).fill('００８１ ９０-１２３４-５６７８');
    await page.getByRole('button', { name: label('Create account'), exact: true }).last().click();
    await expect.poll(() => metadata).toEqual({ name: username, username, country: 'JP', phone: '+819012345678', language: language.locale });
  });

  test(`native recipe prose and localized decimal measurements reach the same private submission (${language.locale})`, async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    await page.route('https://mobilefixture.supabase.co/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/token')) return reply(route, { access_token: token, refresh_token: 'isolated_refresh', token_type: 'bearer', expires_in: 3600, user: member });
      if (path.endsWith('/user')) return reply(route, member);
      if (path.endsWith('/rpc/submit_member_recipe')) {
        const body = route.request().postDataJSON(); payload = body.p_payload;
        return reply(route, body.p_id);
      }
      return reply(route, []);
    });
    await page.goto('/'); await setLanguage(page, 'en');
    await page.getByRole('button', { name: 'Open account', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(member.email);
    await page.getByLabel('Password', { exact: true }).fill('fixture_password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByTestId('account-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByTestId('library-navigation').getByRole('button', { name: 'Add recipe', exact: true }).click();
    if (language.locale !== 'en') await setLanguage(page, language.locale);
    const name = language.compound.normalize('NFD');
    const steps = [name + ' · 40 g', name + ' · 256 g'];
    await page.getByLabel(label('Recipe name'), { exact: true }).fill(name);
    await page.getByLabel(label('Coffee dose (g)'), { exact: true }).fill(['fr','it','es','pt-BR'].includes(language.locale) ? '18,5' : '１８．５');
    await page.getByLabel(label('Water or beverage weight (g)'), { exact: true }).fill('２９６');
    await page.getByLabel(label('Brew steps — one step per line'), { exact: true }).fill(steps.join('\n'));
    await page.getByRole('button', { name: label('Save'), exact: true }).click();
    await expect.poll(() => payload).toMatchObject({ locale: language.locale, name, dose: '18.5', water: '296', steps, visibility: 'private' });
  });
}
