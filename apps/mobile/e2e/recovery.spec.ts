import { test, expect, type Page, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';

// Network fixtures are confined to Playwright. Database ownership, inventory,
// concurrency and rollback behavior are checked in supabase/tests/roast_lab.sql.
const uid = '33333333-3333-4333-8333-333333333333';
const recipe = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'ice BOMBE Natural Jeed',
  title_ar: null,
  brew_method: 'xbloom',
  visibility: 'public',
  recipe_type: 'official_roaster',
  bean_id: null,
  flavor_notes: ['Chocolate'],
  is_incomplete_source: true,
  dose_grams: 18,
  water_grams: null,
  total_time_seconds: null,
  grinder_setting: '39',
  source_author_name: 'Jeed roastery',
  source_brew_parameters: {
    water_ml: 180,
    ratio: 10,
    grind_size: 39,
    rpm: 90,
    cup_type: 'OMNI',
    model: 'Original',
    pours: [
      {
        volume: 38,
        temperature: 95,
        flow_rate: 3.3,
        pause_seconds: 20,
        pattern_code: 1,
        vibration_before: 0,
        vibration_after: 1,
      },
      {
        volume: 80,
        temperature: 95,
        flow_rate: 3,
        pause_seconds: 10,
        pattern_code: 2,
        vibration_before: 0,
        vibration_after: 0,
      },
      {
        volume: 62,
        temperature: 93,
        flow_rate: 3,
        pause_seconds: 8,
        pattern_code: 1,
        vibration_before: 0,
        vibration_after: 0,
      },
    ],
  },
  steps: [1, 2, 3].map((n) => ({
    step_number: n,
    title: `Pour ${n}`,
    description: 'Water: duplicate source instructions.',
  })),
  equipment: [],
  sources: [
    {
      source_name: 'Jeed roastery',
      source_url: 'https://share-h5.xbloom.com/recipe?recipeId=isolated',
      last_verified_at: '2026-10-05T00:00:00Z',
    },
  ],
};
const equipment = Array.from({ length: 4 }, (_, i) => ({
  id: `55555555-5555-4555-8555-${String(i).padStart(12, '0')}`,
  name: `Isolated grinder ${i}`,
  category: 'grinder',
  requires_review: false,
  image_usage_status: 'placeholder_only',
  source_url: `https://manufacturer-fixture.test/model-${i}`,
  last_verified_at: '2026-10-05T00:00:00Z',
  suitable_brew_methods: [],
  specifications: {
    price: 799,
    internal_note: 'NOT_PRODUCT_CONTENT',
    catalog: {
      schema_version: 1,
      name_ar: `طاحونة الاختبار ${i}`,
      description_ar: 'مواصفات معزولة لاختبار المقارنة.',
      description_en: 'Isolated comparison fixture.',
      facts: {
        operation: ['كهربائي', 'Electric'],
        burr_type: ['مسطحة', 'Flat'],
        burr_diameter: [`${55 + i * 9} مم`, `${55 + i * 9} mm`],
        ...(i === 0 ? {} : { weight: [`${i} كغ`, `${i} kg`] }),
      },
    },
  },
}));
const roast = (id: string, title: string, owner = uid) => ({
  id,
  user_id: owner,
  green_coffee_id: '66666666-6666-4666-8666-666666666666',
  roaster_equipment_id: null,
  parent_roast_id: null,
  title,
  roast_date: '2026-10-05',
  updated_at: '2026-10-05T00:00:00Z',
  status: 'completed',
  visibility: 'public',
  green_weight_g: 500,
  roasted_weight_g: 415,
  total_time_seconds: 600,
  roast_level: 'light',
  target_roast_level: null,
  public_coffee: { name: 'بن أخضر معزول', origin: 'Ethiopia' },
  notes: null,
  events: [
    { event_type: 'charge', elapsed_seconds: 0, bean_temp_c: 180 },
    { event_type: 'dry_end', elapsed_seconds: 240, bean_temp_c: 155 },
    { event_type: 'first_crack_start', elapsed_seconds: 480, bean_temp_c: 205 },
    { event_type: 'drop', elapsed_seconds: 600, bean_temp_c: 215 },
  ],
  points: [],
  controls: [],
  tastings: [],
});
const publicRoasts = [
  roast(
    '77777777-7777-4777-8777-777777777777',
    'حمصة المجتمع الأولى',
    '88888888-8888-4888-8888-888888888888',
  ),
  roast(
    '99999999-9999-4999-8999-999999999999',
    'حمصة المجتمع الثانية',
    '88888888-8888-4888-8888-888888888888',
  ),
];
const basePost = {
  user_id: '88888888-8888-4888-8888-888888888888',
  recipe_id: null,
  roast_profile_id: null,
  roast: null,
  brew_log_id: null,
  bean_id: null,
  brew_method: null,
  dose_grams: null,
  water_grams: null,
  actual_time_seconds: null,
  outcome: null,
  content_language: 'ar',
  created_at: '2026-10-05T00:00:00Z',
};
const posts = [
  {
    ...basePost,
    id: 'post-ar',
    recipe_id: recipe.id,
    brew_log_id: 'brew-ar',
    brew_method: 'xbloom',
    dose_grams: 18,
    water_grams: 180,
    outcome: 'good',
    body: 'خففت الطحنة فصار الكوب أوضح.',
  },
  {
    ...basePost,
    id: 'post-en',
    content_language: 'en',
    body: 'Original member English text.',
  },
  {
    ...basePost,
    id: 'post-roast',
    roast_profile_id: publicRoasts[0].id,
    roast: publicRoasts[0],
    body: 'سجلت المراحل والحرارة الفعلية.',
  },
];
async function reply(
  route: Route,
  data: unknown,
  status = 200,
  count?: number,
) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    ...(count === undefined
      ? {}
      : {
          headers: {
            'content-range': `0-${Math.max(0, (data as unknown[]).length - 1)}/${count}`,
            'access-control-expose-headers': 'content-range',
          },
        }),
    body: JSON.stringify(data),
  });
}
async function start(page: Page, options: { posts?: boolean } = {}) {
  const requests: string[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    requests.push(path);
    if (path.endsWith('/rpc/search_public_recipes'))
      return reply(route, [recipe], 200, 1);
    if (path.endsWith('/recipes')) return reply(route, [recipe], 200, 1);
    if (path.endsWith('/equipment_models')) return reply(route, equipment);
    if (path.endsWith('/posts'))
      return reply(route, options.posts ? posts : []);
    if (path.endsWith('/profiles'))
      return reply(route, [
        { id: basePost.user_id, name: 'عضو معزول', country: 'KW' },
      ]);
    if (path.endsWith('/roast_profiles')) {
      const id = url.searchParams.get('id')?.slice(3);
      return reply(
        route,
        id ? publicRoasts.find((r) => r.id === id) : publicRoasts,
      );
    }
    return reply(route, []);
  });
  await page.goto('/');
  return requests;
}
async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

for (const width of [320, 768, 1536])
  test(`Arabic source recipe stays compact and retains all three pours at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1017 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await start(page);
    await openRecipeLibrary(page, 'ar');
    await page
      .getByRole('button', { name: 'مثلّج بومب طبيعي جيد', exact: true })
      .click();
    const detail = page.getByTestId('recipe-detail');
    await expect(detail.getByText('محمصة جيد', { exact: true })).toHaveCount(0); // Author is in the compact eyebrow.
    await expect(
      page.getByTestId('source-pour-plan').getByText(/^الصبة /),
    ).toHaveCount(3);
    await expect(page.getByTestId('source-pour-1')).toContainText('38 مل');
    await expect(page.getByTestId('source-pour-1')).toContainText('3.3 مل/ث');
    await expect(page.getByTestId('source-pour-3')).toContainText('93°C');
    await expect(page.getByTestId('recipe-instructions')).toHaveCount(0);
    await expect(
      detail.getByText(/Water:|Pour [123]|Jeed roastery|OMNI|Original/),
    ).toHaveCount(0);
    await expect(
      detail.getByRole('button', { name: 'ابدأ التحضير', exact: true }),
    ).toBeVisible();
    expect(await detail.evaluate((el) => el.scrollHeight)).toBeLessThan(
      width < 600 ? 1850 : 1450,
    );
    await page
      .getByRole('button', { name: 'عن الوصفة وإعدادات المصدر', exact: true })
      .click();
    await expect(
      detail.getByText('الجهاز في المصدر: الأصلي', { exact: true }),
    ).toBeVisible();
    await expect(detail.getByText(/الاهتزاز بعد الصبة: متوقف/)).toHaveCount(2);
    await expect(page.getByTestId('recipe-original-title')).toContainText(
      recipe.title,
    );
    await noPageOverflow(page);
    expect(errors).toEqual([]);
  });

for (const width of [320, 390, 1536])
  test(`Arabic equipment comparison supports two and three models with reviewed differences at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1017 });
    await start(page);
    await page
      .getByRole('button', { name: 'أدوات القهوة', exact: true })
      .first()
      .click();
    const card = (i: number) =>
      page.getByTestId('equipment-card-' + equipment[i].id);
    await card(0)
      .getByRole('button', { name: 'أضف للمقارنة', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'قارن (1/3)', exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel('ابحث عن أداة', { exact: true })
      .fill('Isolated grinder 1');
    await card(1)
      .getByRole('button', { name: 'أضف للمقارنة', exact: true })
      .click();
    await page.getByRole('button', { name: 'قارن (2/3)', exact: true }).click();
    const table = page.getByTestId('equipment-comparison');
    await expect(table.getByText('قطر التروس', { exact: true })).toBeVisible();
    await expect
      .poll(async () =>
        table.getByText('الموديل', { exact: true }).evaluate((el) => {
          const b = el.getBoundingClientRect();
          return b.left >= 0 && b.right <= innerWidth;
        }),
      )
      .toBe(true);
    await expect(
      table.getByText('غير منشور في البيانات الموثقة', { exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByText(/799|NOT_PRODUCT_CONTENT|Isolated grinder/),
    ).toHaveCount(0);
    await table
      .getByRole('button', { name: 'الفروق فقط', exact: true })
      .click();
    await expect(table.getByText('نوع التروس', { exact: true })).toHaveCount(0);
    await expect(table.getByText('قطر التروس', { exact: true })).toBeVisible();
    await noPageOverflow(page);
    await page
      .getByRole('button', { name: 'إغلاق المقارنة', exact: true })
      .click();
    await expect(table).toHaveCount(0);
    await page.getByLabel('ابحث عن أداة', { exact: true }).focus();
    await page.getByLabel('ابحث عن أداة', { exact: true }).fill('');
    await expect(page.getByLabel('ابحث عن أداة', { exact: true })).toHaveValue(
      '',
    );
    await card(2)
      .getByRole('button', { name: 'أضف للمقارنة', exact: true })
      .click();
    await expect(
      card(3).getByRole('button', { name: 'أضف للمقارنة', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'قارن (3/3)', exact: true }).click();
    await expect(table.getByRole('button', { name: /^إزالة:/ })).toHaveCount(3);
    if (width < 600) {
      await expect.poll(async () => {
        const box = await page.getByRole('button', { name: 'إغلاق المقارنة', exact: true }).boundingBox();
        return box!.y;
      }).toBeLessThan(80);
      const buttonRows: number[] = [];
      for (const button of await table.getByRole('button', { name: /^إزالة:/ }).all()) {
        const rect = await button.boundingBox();
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        buttonRows.push(rect!.y);
      }
      expect(Math.max(...buttonRows) - Math.min(...buttonRows)).toBeLessThan(30);
      await page.screenshot({ path: `test-results/comparison-${width}.png` });
    }
    await table
      .getByRole('button', { name: 'إزالة: طاحونة الاختبار 2', exact: true })
      .click();
    await expect(table.getByRole('button', { name: /^إزالة:/ })).toHaveCount(2);
    await table
      .getByRole('button', { name: 'تفاصيل: طاحونة الاختبار 0', exact: true })
      .click();
    await expect(page.getByTestId('equipment-detail-scroll')).toBeVisible();
    await expect(page.getByTestId('equipment-detail-scroll')).toContainText(
      '55 مم',
    );
  });

test('Arabic community preserves member languages, links measured roasts and reads no private green stock for a guest', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1017 });
  const requests = await start(page, { posts: true });
  await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await expect(page.getByTestId('community-composer')).toHaveCount(0);
  await expect(page.getByTestId('community-post-post-ar')).toContainText(
    'خففت الطحنة',
  );
  await expect(page.getByTestId('community-post-post-en')).toHaveCount(0);
  const hero = await page.getByTestId('community-hero').boundingBox();
  expect(hero!.height).toBeLessThan(300);
  await page.getByRole('button', { name: 'كل اللغات', exact: true }).click();
  await expect(page.getByTestId('community-post-post-en')).toContainText(
    'بالإنجليزية',
  );
  await expect(page.getByTestId('community-post-post-en')).toContainText(
    'Original member English text.',
  );
  await page.getByRole('button', { name: 'العربية فقط', exact: true }).click();
  await page.getByRole('button', { name: 'الحمصات', exact: true }).click();
  await expect(page.getByTestId('community-post-post-ar')).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'فتح الحمصة: حمصة المجتمع الأولى',
      exact: true,
    })
    .click();
  await expect(page.getByTestId('roast-lab')).toContainText('نسبة التطوير');
  await expect(page.getByTestId('roast-curve')).toBeVisible();
  await expect(
    page.getByTestId('roast-lab').getByText('17%', { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByTestId('roast-lab').getByText('20%', { exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'أضف للمقارنة', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'قارن: حمصة المجتمع الثانية',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'قارن الحمصات', exact: true }).click();
  await expect(page.getByTestId('roast-lab')).toContainText('مقارنة الحمصات');
  expect(requests.some((p) => /green_coffee/.test(p))).toBe(false);
  await noPageOverflow(page);
});

test('Arabic Roast Lab saves actual Arabic-number measurements, retries the same batch, forks without measurements and records tasting', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const user = {
    id: uid,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'fixture@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-05T00:00:00Z',
    identities: [],
    is_anonymous: false,
  };
  const encode = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  let green: any = null;
  let saved: any = null;
  const purchases: any[] = [],
    writes: any[] = [],
    tastings: any[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/token'))
      return reply(route, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'isolated_refresh_fixture',
        user,
      });
    if (path.endsWith('/user')) return reply(route, user);
    if (
      path.endsWith('/rpc/search_public_recipes') ||
      path.endsWith('/recipes')
    )
      return reply(route, [recipe], 200, 1);
    if (path.endsWith('/rpc/save_green_coffee')) {
      const { p_data } = route.request().postDataJSON();
      purchases.push(p_data);
      green = { ...p_data, user_id: uid };
      return reply(route, green.id);
    }
    if (path.endsWith('/green_coffees'))
      return reply(route, green ? [green] : []);
    if (path.endsWith('/green_coffee_balances'))
      return reply(
        route,
        green
          ? [{ green_coffee_id: green.id, remaining_grams: saved ? 500 : 1000 }]
          : [],
      );
    if (path.endsWith('/rpc/save_roast_profile')) {
      const { p_data } = route.request().postDataJSON();
      writes.push(p_data);
      if (writes.length === 1)
        return reply(route, { message: 'isolated temporary failure' }, 503);
      saved = {
        ...roast(p_data.id, p_data.title),
        ...p_data,
        user_id: uid,
        public_coffee: { name: green.name },
        updated_at: '2026-10-05T01:00:00Z',
        tastings: [],
      };
      return reply(route, saved.id);
    }
    if (path.endsWith('/rpc/save_roast_tasting')) {
      const data = route.request().postDataJSON();
      tastings.push(data);
      saved.tastings = [
        { id: 'tasting-isolated', tasted_on: '2026-10-05', ...data.p_data },
      ];
      return reply(route, 'tasting-isolated');
    }
    if (path.endsWith('/roast_profiles'))
      return reply(
        route,
        url.searchParams.has('id') ? saved : saved ? [saved] : [],
      );
    return reply(route, []);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'حسابي', exact: true }).click();
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(user.email);
  await page
    .getByLabel('كلمة المرور', { exact: true })
    .fill('isolated-fixture-password');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'تسجيل الخروج', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  await page
    .getByRole('button', { name: 'مختبر التحميص', exact: true })
    .click();
  for (const name of [
    'حمصاتي',
    'حمصات المجتمع',
    'ابدأ حمصة',
    'البن الأخضر',
    'معدات التحميص',
  ])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
      1,
    );
  await page.getByRole('button', { name: 'البن الأخضر', exact: true }).click();
  await page
    .getByRole('button', { name: 'إضافة بنّي الأخضر', exact: true })
    .click();
  await page
    .getByLabel('اسم البن الأخضر', { exact: true })
    .fill('محصول الاختبار');
  await page.getByLabel('بلد المنشأ', { exact: true }).fill('إثيوبيا');
  await page.getByLabel('كمية شراء لإضافتها (غ)', { exact: true }).fill('١٠٠٠');
  await page
    .getByRole('button', { name: 'حفظ البن الأخضر', exact: true })
    .click();
  await expect.poll(() => purchases.length).toBe(1);
  expect(purchases[0]).toMatchObject({
    name: 'محصول الاختبار',
    quantity_grams: '1000',
    create: true,
  });
  await page.getByRole('button', { name: 'ابدأ حمصة', exact: true }).click();
  await page.getByLabel('اسم الحمصة', { exact: true }).fill('محاولة فعلية');
  await page
    .getByRole('button', { name: 'محصول الاختبار · 1000 غ', exact: true })
    .click();
  await page.getByLabel('وزن البن الأخضر (غ)', { exact: true }).fill('٥٠٠');
  await page
    .getByRole('button', { name: 'حفظ الحمصة المكتملة', exact: true })
    .click();
  expect(writes).toHaveLength(0);
  await expect(
    page.getByText(
      'أدخل مدة الحمصة ووزنها بعد التحميص، على ألا يتجاوز وزن البن الأخضر.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel('الوزن بعد التحميص (غ)', { exact: true }).fill('٤١٥');
  for (const [name, time, temp] of [
    ['إدخال البن', '٠:٠٠', '١٨٠'],
    ['نهاية التجفيف', '٤:٠٠', '١٥٥'],
    ['بداية الفرقعة الأولى', '٨:٠٠', '٢٠٥'],
    ['إخراج البن', '١٠:٠٠', '٢١٥'],
  ]) {
    await page.getByLabel('وقت ' + name, { exact: true }).fill(time);
    await page
      .getByLabel('حرارة ' + name + ' (°C)', { exact: true })
      .fill(temp);
  }
  await page
    .getByLabel('إجمالي الوقت (دقائق:ثواني)', { exact: true })
    .fill('١٠:٠٠');
  await page
    .getByRole('button', {
      name: 'منحنى الحرارة وقراءات الماكينة',
      exact: true,
    })
    .click();
  await page
    .getByLabel('وقت القراءة (دقائق:ثواني)', { exact: true })
    .fill('٤:٠٠');
  await page.getByLabel('حرارة البن (°C)', { exact: true }).fill('١٥٥');
  await page.getByRole('button', { name: 'إضافة قراءة', exact: true }).click();
  await page.getByRole('button', { name: 'حمصة خاصة', exact: true }).click();
  await page
    .getByRole('button', { name: 'حفظ الحمصة المكتملة', exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(
    page.getByText('تعذّر حفظ البيانات. راجع الحقول وحاول مرة أخرى.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'حفظ الحمصة المكتملة', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'سجّل التذوق', exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(writes[1]).toMatchObject({
    green_weight_g: 500,
    roasted_weight_g: 415,
    total_time_seconds: 600,
    status: 'completed',
    visibility: 'private',
    language: 'ar',
    points: [
      {
        elapsed_seconds: 240,
        bean_temp_c: 155,
        environment_temp_c: null,
        ror: null,
      },
    ],
  });
  await page.getByRole('button', { name: 'سجّل التذوق', exact: true }).click();
  await page.getByLabel('الحموضة', { exact: true }).fill('٦');
  await page.getByLabel('الحلاوة', { exact: true }).fill('٨');
  await page.getByLabel('القوام', { exact: true }).fill('٧');
  await page
    .getByLabel('إيحاءات تذوقك (افصل بفاصلة)', { exact: true })
    .fill('خوخ، عسل');
  await page.getByRole('button', { name: 'حفظ التذوق', exact: true }).click();
  await expect.poll(() => tastings.length).toBe(1);
  expect(tastings[0].p_data).toMatchObject({
    acidity: 6,
    sweetness: 8,
    body: 7,
    flavor_notes: ['خوخ', 'عسل'],
    overall_score: null,
  });
  await page
    .getByRole('button', { name: 'نسخ الحمصة لمحاولة جديدة', exact: true })
    .click();
  await expect(
    page.getByLabel('الوزن بعد التحميص (غ)', { exact: true }),
  ).toHaveValue('');
  await expect(
    page.getByLabel('وقت بداية الفرقعة الأولى', { exact: true }),
  ).toHaveValue('');
  await expect(
    page.getByLabel('إجمالي الوقت (دقائق:ثواني)', { exact: true }),
  ).toHaveValue('');
  await page.getByLabel('اسم الحمصة', { exact: true }).fill('مسودة محفوظة');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.values(localStorage).some((v) => v.includes('مسودة محفوظة')),
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  await page
    .getByRole('button', { name: 'مختبر التحميص', exact: true })
    .click();
  await page.getByRole('button', { name: 'ابدأ حمصة', exact: true }).click();
  await page
    .getByRole('button', { name: 'استكمال المسودة', exact: true })
    .click();
  await expect(page.getByLabel('اسم الحمصة', { exact: true })).toHaveValue(
    'مسودة محفوظة',
  );
  await noPageOverflow(page);
  expect(errors).toEqual([]);
});
