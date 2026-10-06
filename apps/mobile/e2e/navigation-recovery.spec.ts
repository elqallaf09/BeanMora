import { test, expect } from '@playwright/test';

// Isolated API fixtures; no production writes, accounts or credentials.
const bean = {
  id:'12121212-1212-4212-8212-121212121212', slug:'written-flavors',
  name_ar:'بن بإيحاءات مكتوبة', name_en:'Coffee with written tasting notes',
  description_en:'Flavour notes: orange, caramel, apple.', flavors:[],
  requires_review:false, is_published:true, suitable_for_v60:true,
  source_url:'https://source-fixture.test/coffee', roaster:{name_ar:'محمصة التجربة',name_en:'Fixture roaster'},
};
const recipes = ['xbloom','moka_pot','cold_brew','french_press','april','orea'].map((method,i)=>({
  id:'34343434-3434-4434-8434-'+String(i).padStart(12,'0'),
  title:`Published ${method} recipe`,title_ar:`وصفة ${method} المنشورة`,
  brew_method:method, visibility:'public', dose_grams:15,water_grams:250,
  flavor_notes:['citrus'],steps:[],equipment:[],sources:[],
}));

for (const {width,height,locale} of [
  {width:320,height:900,locale:'ar'},
  {width:1024,height:1366,locale:'ar'},
  {width:1536,height:864,locale:'en'},
] as const) test(`${locale} ${width}: recipes, written flavors and compact xBloom stay accessible`,async({page},testInfo)=>{
  await page.setViewportSize({width,height});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const url=new URL(route.request().url());let data:unknown[]=[];
    if(url.pathname.endsWith('/beans')) data=[bean];
    if(url.pathname.endsWith('/recipes')) data=recipes;
    if(url.pathname.endsWith('/rpc/search_public_recipes')){
      const params=route.request().postDataJSON();
      data=recipes.filter(r=>!params.p_method||r.brew_method===params.p_method);
    }
    return route.fulfill({status:200,contentType:'application/json',
      headers:{'content-range':data.length?`0-${data.length-1}/${data.length}`:'*/0','access-control-expose-headers':'content-range'},body:JSON.stringify(data)});
  });
  await page.goto('/');
  if(locale==='en'){
    await page.getByRole('button',{name:'English',exact:true}).click();
  }
  const home=locale==='ar'?'الرئيسية':'Home';
  const library=locale==='ar'?'مكتبة الوصفات':'Recipe library';
  await page.getByRole('button',{name:library,exact:true}).click();
  for(const recipe of recipes) await expect(page.getByRole('button',{name:locale==='ar'?recipe.title_ar:recipe.title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:home,exact:true}).click();
  await page.getByRole('button',{name:locale==='ar'?'موكا بوت':'Moka pot',exact:true}).click();
  await expect(page.getByRole('heading',{name:library,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:locale==='ar'?recipes[1].title_ar:recipes[1].title,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:locale==='ar'?recipes[0].title_ar:recipes[0].title,exact:true})).toHaveCount(0);
  // The persistent library entry clears a stale method filter.
  await page.getByRole('button',{name:library,exact:true}).click();
  await expect(page.getByRole('button',{name:locale==='ar'?recipes[4].title_ar:recipes[4].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:locale==='ar'?'البن والإيحاءات':'Coffee & taste',exact:true}).click();
  await page.getByRole('button',{name:locale==='ar'?bean.name_ar:bean.name_en,exact:true}).click();
  const notes=page.getByTestId('coffee-flavor-notes');
  for(const note of locale==='ar'?['برتقال','كراميل','تفاح']:['orange','caramel','apple']) await expect(notes).toContainText(note);
  await expect(page.getByTestId('coffee-sensory').getByLabel(locale==='ar'?/^الحموضة:/:/^Acidity:/)).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath(`flavors-${locale}-${width}.png`)});
  await page.getByRole('button',{name:locale==='ar'?'رجوع':'Back',exact:true}).click();
  await page.getByRole('button',{name:'xBloom',exact:true}).first().click();
  const hero=page.getByTestId('xbloom-hero');
  await expect(hero).toBeVisible();
  const box=await hero.boundingBox();
  expect(box!.height).toBeLessThan(330);
  const heading=page.getByRole('heading',{name:locale==='ar'?'وصفات xBloom':'xBloom recipes',exact:true});
  await expect(heading).toBeVisible();
  expect((await heading.boundingBox())!.y).toBeLessThan(height);
  const children=await hero.evaluate(element=>{
    const outer=element.getBoundingClientRect();
    return Array.from(element.querySelectorAll('[role="heading"],[role="button"]')).every(child=>{
      const b=child.getBoundingClientRect();return b.top>=outer.top-1&&b.bottom<=outer.bottom+1&&b.left>=outer.left-1&&b.right<=outer.right+1;
    });
  });
  expect(children).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`xbloom-${locale}-${width}.png`)});
  // Resize the mounted hub to catch layout regressions when a tablet rotates.
  await page.setViewportSize({width:height,height:width});
  await expect(hero).toBeVisible();await expect.poll(async () => (await hero.boundingBox())?.height ?? Infinity).toBeLessThan(330);
  expect(errors).toEqual([]);
});
