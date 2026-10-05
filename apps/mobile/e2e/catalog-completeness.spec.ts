import { test, expect } from '@playwright/test';

const bean = {
  id:'77777777-7777-4777-8777-777777777773',slug:'isolated-coffee',name_en:'Isolated blend',name_ar:'خلطة التجربة',
  requires_review:false,is_published:true,suitable_for_xbloom:true,suitable_for_v60:true,
  source_url:'https://source-fixture.test/coffee',roaster:{name_en:'Fixture roaster',name_ar:'محمصة التجربة'},
  flavors:[{flavor:'Sweet citrus'},{flavor:'Cocoa'}],sensory_profile:{source_url:'https://source-fixture.test/coffee',body_description:'Full-bodied',body_description_ar:'ممتلئ'},
};
const recipes=Array.from({length:15},(_,i)=>({
  id:'88888888-8888-4888-8888-'+String(i).padStart(12,'0'),title:`Complete source program ${i}`,title_ar:`وصفة المصدر ${i}`,
  brew_method:'xbloom',visibility:'public',recipe_type:'community',bean_id:null,roasted_product_id:null,
  dose_grams:null,water_grams:null,water_temp_c:null,total_time_seconds:null,
  cover_image_url:i===1?'https://broken-photo.test/cover.jpg':null,
  source_brew_parameters:{dose:15,water_ml:225,grind_size:60,model:'Original',pours:[{volume:50,temperature:88},{volume:70,temperature:87},{volume:75,temperature:87},{volume:30,temperature:85}]},
  sources:[{source_url:'https://source-fixture.test/recipe/'+i,source_name:'Recipe publisher'}],steps:[],equipment:[],
}));

for (const width of [320,1536]) test(`xBloom covers, source facts, short pagination and honest sensory at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1024});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://broken-photo.test/**',r=>r.abort());
  const pages:number[]=[];
  await page.route('https://mobilefixture.supabase.co/**',async route=>{
    const url=new URL(route.request().url());let data:unknown[]=[];
    if(url.pathname.endsWith('/beans')) data=[bean];
    if(url.pathname.endsWith('/rpc/search_public_recipes')){
      const limit=Number(url.searchParams.get('limit'));expect(limit).toBe(12);
      const offset=Number(url.searchParams.get('offset')||0);pages.push(offset);data=recipes.slice(offset,offset+limit);
      return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':`${offset}-${offset+data.length-1}/${recipes.length}`,'access-control-expose-headers':'content-range'},body:JSON.stringify(data)});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'xBloom',exact:true}).first().click();
  await expect(page.getByTestId('xbloom-hero-photo')).toBeVisible();
  const first=page.getByRole('button',{name:recipes[0].title_ar,exact:true});
  await expect(first).toContainText('15 g');await expect(first).toContainText('225 ml');
  await expect(first).toContainText('85–88°C');await expect(first).toContainText('60');
  await expect(first.getByTestId('method-photo-xbloom')).toBeVisible();
  await expect(page.getByRole('button',{name:recipes[1].title_ar,exact:true}).getByTestId('method-photo-xbloom')).toBeVisible();
  await expect(page.getByRole('button',{name:recipes[12].title_ar,exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`xbloom-${width}.png`)});
  await page.getByRole('button',{name:'المزيد من الوصفات',exact:true}).click();
  await expect(page.getByRole('button',{name:recipes[14].title_ar,exact:true})).toBeVisible();
  expect(pages).toEqual([0,12]);
  await page.getByRole('button',{name:'الرئيسية',exact:true}).click();
  await page.getByRole('button',{name:bean.name_ar,exact:true}).click();
  const sensory=page.getByTestId('coffee-sensory');await expect(sensory).toContainText('ممتلئ');
  await expect(sensory).toContainText('حمضيات حلوة');await expect(sensory).toContainText('كاكاو');
  await expect(sensory.getByText('غير محددة',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'استكشف وصفات xBloom',exact:true})).toBeEnabled();
  await expect(page.getByText('—',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'استكشف وصفات xBloom',exact:true}).click();
  await expect(page.getByTestId('xbloom-hero')).toBeVisible();expect(errors).toEqual([]);
});

test('a sourced general starter is usable and remains clearly separated from an exact coffee recipe',async({page})=>{
  const guide={...recipes[0],id:'99999999-9999-4999-8999-999999999999',title:'General V60 guide',title_ar:'دليل V60 العام',brew_method:'v60',recipe_type:'official_manufacturer',dose_grams:15,water_grams:250,water_temp_c:92,total_time_seconds:180,source_brew_parameters:{},steps:[{step_number:1,title:'Bloom',title_ar:'التزهير',description:'Follow the published guide'}]};
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const url=new URL(route.request().url());
    const rows=url.pathname.endsWith('/beans')?[{...bean,suitable_for_xbloom:false}]:url.pathname.endsWith('/recipes')&&url.searchParams.get('source_coffee_name')==='is.null'?[guide]:[];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)});
  });
  await page.goto('/');await page.getByRole('button',{name:bean.name_ar,exact:true}).click();
  await expect(page.getByRole('heading',{name:'وصفة بداية عامة',exact:true})).toBeVisible();
  await expect(page.getByTestId('coffee-general-recipe')).toContainText('دليل عام');
  await expect(page.getByText('250 g',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ابدأ التحضير مع V60',exact:true}).click();
  await expect(page.getByTestId('recipe-detail')).toContainText(guide.title_ar);
});

test('an owned bag keeps the xBloom source water unit and present facts in Brew my coffee',async({page})=>{
  const user={id:'33333333-3333-4333-8333-333333333333',aud:'authenticated',role:'authenticated',email:'bag-fixture@example.test',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-09-01T00:00:00Z',identities:[],is_anonymous:false};
  const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.isolated_test_signature`;
  const recipe={...recipes[0],bean_id:bean.id};
  const bag={id:'66666666-6666-4666-8666-666666666666',user_id:user.id,legacy_bean_id:bean.id,roasted_product_id:null,remaining_weight_grams:250,last_grind_setting:null,preferred_recipe_id:null,opened_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z'};
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const path=new URL(route.request().url()).pathname;let data:unknown=[];
    if(path.endsWith('/token'))data={access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'isolated_refresh_fixture',user};
    else if(path.endsWith('/user'))data=user;
    else if(path.endsWith('/beans'))data=[bean];
    else if(path.endsWith('/recipes'))data=[recipe];
    else if(path.endsWith('/user_bean_inventory'))data=[bag];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'تغيير اللغة، العربية',exact:true}).click();
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.getByRole('button',{name:'Account',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill(user.email);
  await page.getByLabel('Password',{exact:true}).fill('isolated-fixture-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Brew',exact:true}).click();
  const facts=page.getByTestId('bag-brew-facts');
  await expect(facts).toContainText('15 g');await expect(facts).toContainText('225 ml');
  await expect(facts).toContainText('85–88°C');await expect(facts).toContainText('60');
  await expect(facts.getByText('225 g',{exact:true})).toHaveCount(0);
  await expect(facts.getByText('—',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'V60',exact:true}).click();
  await expect(page.getByText('No exact recipe matches these choices',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'xBloom',exact:true}).last().click();
  await expect(facts).toContainText('225 ml');
  await page.getByRole('button',{name:'Start this recipe',exact:true}).click();
  await expect(page.getByTestId('recipe-detail')).toContainText(recipe.title);
});

test('the approved Oasis bag photo decodes locally when its source CDN is unreachable',async({page})=>{
  const photo='https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1593350415515-UAU8BG9WMUYTUTU2LK6P/image-asset.jpeg';
  const oasis={...bean,slug:'crossbridge-oasis-blend',name_ar:'أوايسس بليند',image_url:photo,image_kind:'packaging',image_usage_status:'source_linked'};
  let remotePhotoRequests=0;
  await page.route(photo,route=>{remotePhotoRequests++;return route.abort();});
  await page.route('https://mobilefixture.supabase.co/**',route=>{
    const path=new URL(route.request().url()).pathname;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/beans')?[oasis]:[])});
  });
  await page.goto('/');await page.getByRole('button',{name:oasis.name_ar,exact:true}).click();
  const image=page.getByTestId('coffee-product-photo');
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(element=>Array.from(element.querySelectorAll('img')).some(img=>img.complete&&img.naturalWidth===640&&img.naturalHeight===640))).toBe(true);
  await expect(page.getByTestId('coffee-photo-unavailable')).toHaveCount(0);
  expect(remotePhotoRequests).toBe(0);
});
