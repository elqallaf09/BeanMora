import { test,expect } from '@playwright/test';
import { openRecipeLibrary } from './navigation';
import { setLanguage } from './settings';
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
const rows=ids.map((id,i)=>({id,title:`Nearby recipe ${i+1}`,title_ar:`وصفة قريبة ${i+1}`,visibility:'public',brew_method:'xbloom',recipe_type:i?'community':'official_roaster',
 bean_id:null,roasted_product_id:null,flavor_notes:['cherry'],source_origin_country:'Colombia',source_varietal:'Castillo',serving_style:'hot',
 dose_grams:15,water_grams:250,steps:[],sources:[{source_url:'https://publisher.example/recipe/'+id,source_name:'Fixture publisher'}],equipment:[],
 source_brew_parameters:{model:i?'Original':'Studio',dose:15,water_ml:250,grind_size:i?20:50,pours:[{volume:250,temperature:92}]}}));
for(const locale of ['ar','en'] as const) test(`${locale}: combined filters show explained nearby recipes only after exact search is empty`,async({page})=>{
 await page.setViewportSize({width:320,height:1100});const calls:Record<string,unknown>[]=[];
 await page.route('https://mobilefixture.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;let data:unknown[]=[],total=0;
  if(path.endsWith('/rpc/search_public_recipes')) {
   const args=route.request().postDataJSON();calls.push(args);
   data=args.p_roaster_name?[]:[rows[0]];total=data.length;
  } else if(path.endsWith('/rpc/search_public_recipe_near_matches')) {
   const args=route.request().postDataJSON();calls.push(args);
   data=[{recipe_id:ids[0],matched:[{field:'coffeeOrigin',value:'كولومبيا'},{field:'coffeeType',value:'كاستيلو'},{field:'flavorNote',value:'كرز'}],missing:[{field:'roasterName',value:'ضحي'}],total_count:2},
    {recipe_id:ids[1],matched:[{field:'coffeeOrigin',value:'كولومبيا'}],missing:[{field:'coffeeType',value:'كاستيلو'},{field:'flavorNote',value:'كرز'},{field:'roasterName',value:'ضحي'}],total_count:2}];total=2;
  } else if(path.endsWith('/recipes')) {data=[...rows].reverse();total=2;}
  await route.fulfill({contentType:'application/json',headers:{'content-range':total?`0-${total-1}/${total}`:'*/0'},body:JSON.stringify(data)});
 });
 await page.goto('/');if(locale==='en')await setLanguage(page,'en');await openRecipeLibrary(page,locale);
 const ar=locale==='ar';
 await page.getByRole('button',{name:'xBloom',exact:true}).click();
 for(const name of ar?['كل المصادر','رسمي','مجتمعي','كل الموديلات','ستوديو','الأصلي']:['All sources','Official','Community','All models','Studio','Original'])
  await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:ar?'تصفية الوصفات':'Filter recipes',exact:true}).click();
 const panel=page.getByTestId('recipe-discovery-filters');
 await expect(panel.getByLabel(ar?'الموقع أو المصدر':'Website or source',{exact:true})).toHaveCount(0);
 for(const [label,value] of [[ar?'بلد زراعة البن':'Coffee growing origin','كولومبيا'],[ar?'نوع البن أو سلالته':'Coffee type or variety','كاستيلو'],
  [ar?'الشركة أو المحمصة':'Company or roaster','ضحي'],[ar?'إيحاء محدد':'Specific tasting note','كرز']]) await panel.getByLabel(label,{exact:true}).fill(value);
 await panel.getByRole('button',{name:ar?'ساخن':'Hot',exact:true}).click();
 await panel.getByRole('button',{name:ar?'تطبيق التصفية':'Apply filters',exact:true}).click();
 await expect(page.getByTestId('recipe-near-matches')).toBeVisible();
 await expect(page.getByTestId('recipe-active-filters')).toContainText('ضحي');
 const reasons=page.getByTestId('recipe-near-match-reasons');
 await expect(reasons).toHaveCount(2);
 await expect(reasons.first()).toContainText(ar?'لم يطابق أو غير موثق: المحمصة: ضحي':'Unmatched or undocumented: Roaster: ضحي');
 expect(calls.at(-1)).toMatchObject({p_coffee_origin:'كولومبيا',p_coffee_type:'كاستيلو',p_roaster_name:'ضحي',p_method:'xbloom',p_model:null,p_source:null,p_source_name:null,p_serving_style:'hot'});
 await expect(reasons.first()).toContainText((ar?'السلالة: ':'Variety: ')+'كاستيلو');
 await expect(reasons.last()).toContainText(ar?'لم يطابق أو غير موثق: السلالة: كاستيلو':'Unmatched or undocumented: Variety: كاستيلو');
 await expect(page.getByTestId('recipe-active-filters')).not.toContainText(ar?'المصدر':'Source');
 await page.getByRole('button',{name:ar?rows[1].title_ar:rows[1].title,exact:true}).click();
 await expect(page.getByTestId('recipe-source-facts').getByText('20',{exact:true})).toBeVisible();
 await expect(page.getByTestId('source-pour-plan')).toContainText(ar?'250 مل':'250 ml');
 await page.getByRole('button',{name:ar?'عن الوصفة وإعدادات المصدر':'Recipe and source details',exact:true}).click();
 await expect(page.getByTestId('recipe-detail').getByText(ar?'الجهاز في المصدر: الأصلي':'Source machine: Original',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:ar?'رجوع':'Back',exact:true}).click();
 await expect(page.getByTestId('recipe-near-matches')).toBeVisible();
 await page.getByRole('button',{name:ar?'إزالة المحمصة: ضحي':'Remove Roaster: ضحي',exact:true}).click();
 await expect(page.getByTestId('recipe-near-matches')).not.toBeVisible();
 await expect(page.getByRole('button',{name:ar?rows[0].title_ar:rows[0].title,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
