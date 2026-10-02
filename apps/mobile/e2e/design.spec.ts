import { test, expect } from '@playwright/test';
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
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/beans')?beans:path.endsWith('/recipes')?[recipe]:path.endsWith('/equipment_models')?[{name:'Isolated scale model',source_url:null}]:[])});
    });
    // Prove a broken official image produces a bundled image, rather than an empty card.
    await page.route('https://photo-fixture.test/**',route=>route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'اكتشف عالم القهوة.'})).toBeVisible();
    await expect(page.getByRole('button',{name:beans[0].name_ar,exact:true})).toBeVisible();
    const card=await page.getByRole('button',{name:beans[0].name_ar,exact:true}).boundingBox();
    expect(card!.width).toBeGreaterThan(120);
    expect(card!.height).toBeGreaterThan(100);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const home=page.getByTestId('home-scroll');
    await home.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await expect(page.getByRole('button',{name:'ميزان القهوة',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'ميزان القهوة',exact:true}).click();
    await expect(page.getByText('Isolated scale model',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'إغلاق',exact:true}).click();
    await home.evaluate(el=>{el.scrollTop=0;});
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
