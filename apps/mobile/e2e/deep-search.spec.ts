import { setLanguage } from './settings';
import { test, expect, type Route } from '@playwright/test';

const bean = {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug:'strawberry-bean',name_ar:'بن الفراولة',name_en:'Strawberry coffee',description_en:'Strawberries and jasmine',requires_review:false,is_published:true,roaster_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', suitable_for_v60:true,suitable_for_xbloom:true,flavors:[{flavor:'strawberry'}],roaster:{name_ar:'محمصة التجربة',name_en:'Test roaster'}};
const roaster = {id:bean.roaster_id,slug:'test-roaster',name_ar:'محمصة التجربة',name_en:'Test roaster',country:'GB',requires_review:false};
const recipe = (index:number, style='iced') => ({id:`bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12,'0')}`, title:`Scoped recipe ${index}`,title_ar:`وصفة البن ${index}`,visibility:'public',brew_method:'xbloom',recipe_type:'official_roaster',bean_id:bean.id,serving_style:style,dose_grams:18,water_grams:288,flavor_notes:[],source_tasting_notes:index===12?'strawberries':null,source_brew_parameters:{discovery:{serving_style:style}},steps:[],sources:[],equipment:[]});
const rows=Array.from({length:13},(_,i)=>recipe(i,i%2?'cold':'iced'));
async function reply(route:Route,data:unknown,total?:number) {
  await route.fulfill({status:200,contentType:'application/json',headers:total===undefined?{}:{'content-range':Array.isArray(data)&&data.length?`0-${data.length-1}/${total}`:`*/${total}`,'access-control-expose-headers':'content-range'},body:JSON.stringify(data)});
}

for (const locale of ['ar','en'] as const) test(`coffee xBloom exploration keeps the exact coffee through serving filters and pagination (${locale})`,async({page})=>{
  const calls:any[]=[];
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const url=new URL(route.request().url());const path=url.pathname;
    if(path.endsWith('/rpc/search_public_recipes_v2')) {
      const args=route.request().postDataJSON(); calls.push(args);
      expect(args.p_bean_id).toBe(bean.id);expect(args.p_product_id).toBeUndefined();expect(args.p_method).toBe('xbloom');
      const matching=rows.filter(r=>!args.p_query||r.source_tasting_notes==='strawberries');
      const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??12);
      return reply(route,matching.slice(offset,offset+limit),matching.length);
    }
    // The coffee detail has no prefetched xBloom match and offers exploration.
    if(path.endsWith('/rpc/recipes_for_coffee'))return reply(route,[],0);
    return reply(route,path.endsWith('/beans')?[bean]:path.endsWith('/roasters')?[roaster]:[]);
  });
  await page.goto('/');if(locale==='en')await setLanguage(page, 'en');
  await page.getByRole('button',{name:locale==='ar'?bean.name_ar:bean.name_en,exact:true}).first().click();
  await page.getByRole('button',{name:'xBloom',exact:true}).click();
  await page.getByRole('button',{name:locale==='ar'?'استكشف وصفات xBloom':'Explore xBloom recipes',exact:true}).click();
  await expect(page.getByTestId('recipe-coffee-context')).toContainText(locale==='ar'?bean.name_ar:bean.name_en);
  await page.getByRole('button',{name:locale==='ar'?'تقديم: بارد ومثلّج':'Serving: Cold & iced',exact:true}).click();
  await expect.poll(()=>calls.at(-1)?.p_serving_style).toBe('cold_or_iced');
  await page.getByRole('button',{name:locale==='ar'?'المزيد من الوصفات':'More recipes',exact:true}).click();
  await expect(page.getByRole('button',{name:locale==='ar'?'وصفة البن 12':'Scoped recipe 12',exact:true})).toBeVisible();
  await page.getByLabel(locale==='ar'?'ابحث عن وصفة':'Find a recipe',{exact:true}).fill(locale==='ar'?'فراولة':'strawberry');
  await expect.poll(()=>calls.at(-1)?.p_query).toBe(locale==='ar'?'فراولة':'strawberry');
  expect(calls.every(c=>c.p_bean_id===bean.id)).toBe(true);
  await page.getByRole('button',{name:locale==='ar'?'وصفة البن 12':'Scoped recipe 12',exact:true}).click();
  await page.getByRole('button',{name:locale==='ar'?'رجوع':'Back',exact:true}).click();
  await expect(page.getByTestId('recipe-coffee-context')).toBeVisible();
  await page.getByRole('button',{name:locale==='ar'?'رجوع إلى البن':'Back to coffee',exact:true}).click();
  await expect(page.getByRole('heading',{name:locale==='ar'?bean.name_ar:bean.name_en,exact:true})).toBeVisible();
});

test('universal Arabic strawberry search finds coffee notes, matching roasters and source tasting notes',async({page},info)=>{
  const queries:string[]=[];
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/rpc/search_public_recipes')) {
      const args=route.request().postDataJSON();queries.push(args.p_query);
      return reply(route,args.p_query?[rows[12]]:rows,args.p_query?1:13);
    }
    return reply(route,path.endsWith('/beans')?[bean]:path.endsWith('/roasters')?[roaster]:[]);
  });
  await page.goto('/');await page.getByRole('button',{name:'البحث',exact:true}).click();
  await page.getByLabel('البحث الشامل',{exact:true}).fill('فراولة');
  await expect.poll(()=>queries.at(-1)).toBe('فراولة');
  const results=page.getByTestId('universal-search-results');
  await expect(results.getByRole('button',{name:bean.name_ar,exact:true})).toBeVisible();
  await expect(results.getByRole('button',{name:roaster.name_ar,exact:true})).toBeVisible();
  await expect(results.getByText('لديها بن يطابق بحثك',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'وصفة البن 12',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('universal-strawberry.png'),fullPage:true});
  await page.getByRole('button',{name:'عرض كل نتائج البن',exact:true}).click();
  await expect(page.getByLabel('ابحث عن البن والإيحاءات',{exact:true})).toHaveValue('فراولة');
  await expect(page.getByRole('button',{name:bean.name_ar,exact:true})).toBeVisible();
});

test('foreground automation refreshes once after five minutes and reuses the catalog on a brief return',async({page})=>{
  await page.clock.install();let reads=0;
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(['beans','roasted_products','recipes','xbloom_recipe_profiles'].some(t=>path.endsWith('/'+t))) reads++;
    return reply(route,path.endsWith('/beans')?[bean]:[]);
  });
  await page.goto('/');await expect.poll(()=>reads).toBe(5);
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('beanmora-public-catalog-v2:')).length)).toBe(1);
  const visibility=async(state:string)=>page.evaluate(state=>{Object.defineProperty(document,'visibilityState',{value:state,configurable:true});document.dispatchEvent(new Event('visibilitychange'));},state);
  await visibility('hidden');await visibility('visible');expect(reads).toBe(5);
  await visibility('hidden');await page.clock.fastForward(300_001);await visibility('visible');
  await expect.poll(()=>reads).toBe(10);
  await visibility('hidden');await visibility('visible');expect(reads).toBe(10);
});

test('language selection in settings follows reduced motion and fits a small screen',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:740});
  await page.route('https://mobilefixture.supabase.co/**',route=>reply(route,[]));
  await page.goto('/');
  await page.getByRole('button', { name: 'الإعدادات', exact: true }).click();
  const panel = page.getByTestId('settings-screen');
  await panel.getByRole('button', { name: 'English', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'العربية', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await panel.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'العربية', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'تم', exact: true }).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
