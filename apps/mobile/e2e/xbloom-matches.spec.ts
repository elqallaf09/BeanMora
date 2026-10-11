import { test, expect, type Page } from '@playwright/test';
import { setLanguage } from './settings';
const beanId='22222222-2222-4222-8222-222222222222';
const studioId='11111111-1111-4111-8111-111111111111';
const originalId='33333333-3333-4333-8333-333333333333';
const bean={id:beanId,slug:'isolated-xbloom-coffee',name_ar:'بن الترشيح المعزول',name_en:'Isolated matching coffee',
  requires_review:false,is_published:true,suitable_for_v60:true,suitable_for_xbloom:true,suitable_for_espresso:false,
  roast_level:'light',origin_country:'Indonesia',process:'washed',roaster:null,
  description_en:'Tasting notes (per Fixture Roaster): Plum, Mango, Citrus, Chinese tea, Cashew nuts.'};
const recipe=(id:string,model:string)=>({id,title:`Isolated ${model} profile`,title_ar:`وصفة ${model} المعزولة`,
  brew_method:'xbloom',visibility:'public',bean_id:null,roasted_product_id:null,flavor_notes:['Tea','Citrus'],steps:[],equipment:[],
  dose_grams:15,water_grams:null,is_incomplete_source:true,source_coffee_name:'Different source coffee',source_origin_country:'Indonesia',
  source_brew_parameters:{model,dose:15,water_ml:240,grind_size:model==='Studio'?50:20,pours:[{volume:240,temperature:92}]}});
const studio=recipe(studioId,'Studio'), original=recipe(originalId,'Original');
const match=(id=studioId,model='Studio',kind='similar')=>({recipe_id:id,match_kind:kind,score:44,
  matching_notes:['tea'],matching_families:['fruity','tea'],same_origin:true,same_process:false,same_roast:false,device_model:model});
async function fixtures(page:Page,mode:'similar'|'exact'|'empty'|'error'='similar'){
  let fail=mode==='error';
  await page.route('https://mobilefixture.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path.endsWith('/rpc/xbloom_matches_for_coffee')){
      const params=request.postDataJSON();
      expect(params.p_bean_id).toBe(beanId);expect(params.p_product_id).toBeUndefined();
      expect(params.p_limit).toBe(3);
      if(fail){fail=false;return route.fulfill({status:400,contentType:'application/json',body:'{"message":"isolated failure"}'});}
      const data=mode==='empty'?[]:params.p_model==='Original'?[match(originalId,'Original')]:[match(studioId,'Studio',mode==='exact'?'exact':'similar')];
      return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    }
    const data=path.endsWith('/beans')?[bean]:path.endsWith('/recipes')?[studio,original]
      :path.endsWith('/rpc/recipes_for_coffee')?[]:[];
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
}
async function openCoffee(page:Page){
  await page.goto('/');
  await page.getByRole('button',{name:bean.name_ar,exact:true}).click();
  await expect(page.getByRole('heading',{name:bean.name_ar})).toBeVisible();
}
test('320 px: automatic similar recipe explains its provenance, keeps source ml and follows language changes in place',async({page})=>{
  await page.setViewportSize({width:320,height:960});await fixtures(page);await openCoffee(page);
  const notice=page.getByTestId('xbloom-similar-recipe');
  await expect(notice).toContainText('نفس بلد المنشأ');
  await expect(notice).toContainText('شاي');
  await expect(notice).toContainText('Studio');
  await expect(notice).not.toContainText('نفس المعالجة');
  await expect(page.getByText('240 ml',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ابدأ التحضير مع xBloom',exact:true}).click();
  await expect(page.getByTestId('recipe-detail')).toBeVisible();
  await expect(notice).toContainText(bean.name_ar);
  await setLanguage(page,'en');
  await expect(page.getByTestId('recipe-detail')).toBeVisible();
  await expect(notice).toContainText(bean.name_en);
  await expect(notice).toContainText('similar coffee');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('device choice reloads matching settings for Original and keeps the selected coffee',async({page})=>{
  await fixtures(page);await openCoffee(page);
  await expect(page.getByTestId('xbloom-similar-recipe')).toContainText('Studio');
  await page.getByRole('button',{name:'جهاز xBloom: كل أجهزة xBloom',exact:true}).click();
  await page.getByRole('button',{name:'الأصلي',exact:true}).click();
  await expect(page.getByTestId('xbloom-similar-recipe')).toContainText('Original');
  await page.getByRole('button',{name:'ابدأ التحضير مع xBloom',exact:true}).click();
  await expect(page.getByRole('heading',{name:original.title_ar,exact:true})).toBeVisible();
});
test('an exact association remains an exact recipe with no similarity notice',async({page})=>{
  await fixtures(page,'exact');await openCoffee(page);
  await expect(page.getByText('وصفة xBloom لهذا البن',{exact:true})).toBeVisible();
  await expect(page.getByTestId('xbloom-similar-recipe')).toHaveCount(0);
});
test('missing evidence shows a clear empty state; a failed lookup supports retry',async({page})=>{
  await fixtures(page,'empty');await openCoffee(page);
  await expect(page.getByTestId('coffee-browse-recipes')).toContainText('معلومات كافية');
  await expect(page.getByTestId('xbloom-similar-recipe')).toHaveCount(0);
});
test('failed matching never displays a recommendation until retry succeeds',async({page})=>{
  await fixtures(page,'error');await openCoffee(page);
  await expect(page.getByTestId('coffee-browse-recipes')).toContainText('تعذّر تحميل');
  await expect(page.getByTestId('xbloom-similar-recipe')).toHaveCount(0);
  await page.getByTestId('coffee-browse-recipes').getByRole('button',{name:'إعادة المحاولة',exact:true}).click();
  await expect(page.getByTestId('xbloom-similar-recipe')).toContainText('نفس بلد المنشأ');
});
