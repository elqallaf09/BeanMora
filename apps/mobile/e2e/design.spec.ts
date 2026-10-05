import { test, expect, type Route } from '@playwright/test';

// Independent network-fixture contract; production SQL is tested separately.
// Search text is JSON data, never a PostgREST expression.
type DiscoveryFixture = Record<string, any>;
function discoveryPage(route: Route, fixtures: DiscoveryFixture[], coffees: DiscoveryFixture[] = []) {
  expect(route.request().method()).toBe('POST');
  const url = new URL(route.request().url());
  expect(url.searchParams.has('or')).toBe(false);
  const params = route.request().postDataJSON() as Record<string, string | null>;
  const normalize = (value: unknown): string => String(value ?? '').toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[ـًٌٍَُِّْٰ]/g, '').replace(/\s+/g, ' ').trim();
  const join = (...values: unknown[]) => normalize(values.flat(Infinity).filter(value => value != null).join(' '));
  const aliases: Record<string, string[]> = {
    chocolate: ['chocolate', 'cocoa', 'cacao', 'شوكولاتة', 'شوكولاته', 'كاكاو'],
    nutty: ['nutty', 'nuts', 'hazelnut', 'almond', 'مكسرات', 'بندق', 'لوز'],
    fruity: ['fruity', 'fruit', 'berry', 'berries', 'strawberry', 'blueberry', 'فواكه', 'فراولة', 'توت'],
    citrus: ['citrus', 'lemon', 'orange', 'grapefruit', 'حمضيات', 'ليمون', 'برتقال'],
    floral: ['floral', 'jasmine', 'rose', 'زهور', 'ياسمين', 'ورد'],
    caramel: ['caramel', 'toffee', 'كراميل', 'توفي'],
    spice: ['spice', 'spicy', 'cinnamon', 'cardamom', 'توابل', 'قرفة', 'هيل'],
  };
  const items = fixtures.filter(row => {
    if (row.visibility !== 'public') return false;
    if (params.p_method && row.brew_method !== params.p_method) return false;
    if (params.p_source && params.p_source !== 'all' &&
      !(params.p_source === 'official' ? ['official_manufacturer', 'official_roaster', 'verified_barista'].includes(row.recipe_type) : params.p_source === 'community' && row.recipe_type === 'community')) return false;
    if (params.p_method === 'xbloom' && params.p_model && params.p_model !== 'all' && row.source_brew_parameters?.model !== params.p_model) return false;
    const metadata = row.source_brew_parameters?.discovery ?? {};
    const coffee = coffees.find(item => item.id === row.bean_id && item.requires_review === false && item.is_published === true);
    const style = [row.serving_style, metadata.serving_style].find(value => ['hot', 'iced', 'cold'].includes(value)) ?? '';
    if (params.p_serving_style && style !== params.p_serving_style) return false;
    const terms: Record<string, string> = {
      p_recipe_name: join(row.title, row.title_ar),
      p_creator_name: join(row.source_author_name, metadata.creator_name, metadata.creator_name_ar),
      p_creator_country: join(metadata.creator_country, metadata.creator_country_ar),
      p_recipe_country: join(metadata.recipe_country, metadata.recipe_country_ar),
      p_coffee_type: join(row.source_varietal, coffee?.varietal, metadata.coffee_type, metadata.coffee_type_ar),
      p_coffee_name: join(row.source_coffee_name, coffee?.name_en, coffee?.name_ar, metadata.coffee_name, metadata.coffee_name_ar),
      p_coffee_origin: join(row.source_origin_country, coffee?.origin_country, metadata.coffee_origin, metadata.coffee_origin_ar),
      p_roaster_name: join(row.source_roaster_name, coffee?.roaster?.name_en, coffee?.roaster?.name_ar, metadata.roaster_name, metadata.roaster_name_ar),
      p_source_name: join(row.sources?.flatMap((source: DiscoveryFixture) => [source.source_name, source.source_url]), metadata.source_urls),
      p_flavor_note: join(row.flavor_notes, row.source_tasting_notes, coffee?.flavors?.map((flavor: DiscoveryFixture) => flavor.flavor), metadata.flavor_notes, metadata.flavor_notes_ar, metadata.flavor_families),
    };
    if (Object.entries(terms).some(([key, text]) => params[key] && !text.includes(normalize(params[key])))) return false;
    if (params.p_flavor_family) {
      const words = terms.p_flavor_note.split(/[^\p{L}\p{N}]+/u);
      if (!(aliases[params.p_flavor_family] ?? []).some(alias => words.includes(normalize(alias)))) return false;
    }
    const text = join(Object.values(terms), style, style === 'hot' ? 'ساخن حار' : style === 'iced' ? 'مثلج' : style === 'cold' ? 'بارد' : '');
    return normalize(params.p_query).split(' ').filter(Boolean).every(term => text.includes(term));
  }).sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')) || a.id.localeCompare(b.id));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  expect(Number.isInteger(offset) && offset >= 0).toBe(true);
  expect(Number.isInteger(limit) && limit > 0).toBe(true);
  const data = items.slice(offset, offset + limit);
  const headers = {
    'content-range': data.length ? `${offset}-${offset + data.length - 1}/${items.length}` : `*/${items.length}`,
    'access-control-expose-headers': 'content-range',
  };
  return { data, headers, offset, limit, total: items.length, params };
}

function replyCoffeeRecipes(route: Route, fixtures: DiscoveryFixture[]) {
  expect(route.request().method()).toBe('POST');
  const params = route.request().postDataJSON() as { p_bean_id?: string; p_product_id?: string };
  expect(Object.keys(params)).toHaveLength(1);
  expect(Boolean(params.p_bean_id) !== Boolean(params.p_product_id)).toBe(true);
  const target = params.p_bean_id ?? params.p_product_id!;
  expect(target).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const url = new URL(route.request().url());
  const items = fixtures.filter(row => row.visibility === 'public' &&
    (params.p_bean_id ? row.bean_id === target : row.roasted_product_id === target))
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')) || a.id.localeCompare(b.id));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const data = items.slice(offset, offset + limit);
  return route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'content-range': data.length ? `${offset}-${offset + data.length - 1}/${items.length}` : `*/${items.length}`, 'access-control-expose-headers': 'content-range' },
    body: JSON.stringify(data),
  });
}

function replyDiscovery(route: Route, fixtures: DiscoveryFixture[], coffees: DiscoveryFixture[] = []) {
  const result = discoveryPage(route, fixtures, coffees);
  return route.fulfill({ status: 200, contentType: 'application/json', headers: result.headers, body: JSON.stringify(result.data) });
}

const beans = Array.from({ length: 8 }, (_, i) => ({
  id: '22222222-2222-4222-8222-'+String(i).padStart(12,'0'), slug:'design-'+i,
  name_ar:'قهوة الاختبار '+(i+1),name_en:'Design coffee '+(i+1),
  requires_review:false,is_published:true,suitable_for_v60:true,suitable_for_xbloom:true,suitable_for_espresso:true,
  roast_level:'light',origin_country:['Colombia','Ethiopia','Bolivia','Guatemala'][i%4],process:'natural',
  roaster:{name_ar:'محمصة الاختبار',name_en:'Test roaster'},flavors:[{flavor:'chocolate'}],
  images:[{url:'https://photo-fixture.test/coffee.jpg',position:0,image_usage_status:'rights_confirmed'}],
}));
const recipe={id:'11111111-1111-4111-8111-111111111111',title:'Design brew',title_ar:'وصفة اختبار التصميم',brew_method:'xbloom',visibility:'public',bean_id:beans[0].id,roasted_product_id:null,flavor_notes:['chocolate'],dose_grams:18,water_grams:288,water_temp_c:92,total_time_seconds:150,steps:[],equipment:[]};
for(const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1536,height:1024}]) {
  test('reference layout, complete scroll and detail at '+viewport.width,async({page})=>{
    await page.setViewportSize(viewport);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://mobilefixture.supabase.co/**',route=>{
      const path=new URL(route.request().url()).pathname;
      if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, [recipe], beans);
      if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, [recipe]);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/beans')?beans:path.endsWith('/recipes')?[recipe]:path.endsWith('/equipment_models')?[{id:'44444444-4444-4444-8444-444444444444',name:'Isolated scale model',category:'scale',requires_review:false,source_url:null,specifications:{catalog:{schema_version:1,name_ar:'ميزان اختبار معزول'}}}]:[])});
    });
    // A failed source image must be an explicit unavailable state, not a different product.
    await page.route('https://photo-fixture.test/**',route=>route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'اكتشف عالم القهوة.'})).toBeVisible();
    await expect(page.getByRole('button',{name:beans[0].name_ar,exact:true})).toBeVisible();
    await expect(page.getByTestId('coffee-photo-unavailable').first()).toBeVisible();
    const card=await page.getByRole('button',{name:beans[0].name_ar,exact:true}).boundingBox();
    expect(card!.width).toBeGreaterThan(120);
    expect(card!.height).toBeGreaterThan(100);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const home=page.getByTestId('home-scroll');
    await home.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await expect(page.getByRole('button',{name:'ميزان القهوة',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'ميزان القهوة',exact:true}).click();
    await expect(page.getByText('ميزان اختبار معزول',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'الرئيسية',exact:true}).click();
    await page.getByTestId('home-scroll').evaluate(el=>{el.scrollTop=0;});
    await page.getByRole('button',{name:beans[0].name_ar,exact:true}).click();
    await expect(page.getByRole('heading',{name:beans[0].name_ar})).toBeVisible();
    await expect(page.getByText('18 g',{exact:true})).toBeVisible();
    await expect(page.getByText('288 g',{exact:true})).toBeVisible();
    await expect(page.getByText('92°C',{exact:true})).toBeVisible();
    await expect(page.getByText('2:30',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'ابدأ التحضير مع xBloom',exact:true}).click();
    await expect(page.getByRole('heading',{name:recipe.title_ar})).toBeVisible();
    await page.getByRole('button',{name:'رجوع',exact:true}).click();
    await expect(page.getByRole('heading',{name:beans[0].name_ar})).toBeVisible();
    await page.getByRole('button',{name:'رجوع',exact:true}).click();
    await page.getByRole('button',{name:'حسابي',exact:true}).click();
    await expect(page.getByRole('heading',{name:'مرحباً بك مجدداً'})).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Apple',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Google',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
