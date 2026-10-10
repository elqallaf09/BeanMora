import { expect, test, type Page } from '@playwright/test';
import { setLanguage } from './settings';
const id='abababab-abab-4bab-abab-abababababab';
async function fixture(page: Page) {
  const searches: unknown[]=[];
  await page.route('https://photos.example/**', route => route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220"><rect x="85" y="20" width="130" height="170" fill="#167c80"/></svg>'}));
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/rpc/search_coffee_assistant')) searches.push(route.request().postDataJSON());
    const data=path.endsWith('/equipment_models') ? [{id,name:'Verified machine',category:'espresso_machine',requires_review:false,source_url:'https://manufacturer.example/model',image_url:'https://photos.example/old.jpg',image_usage_status:'source_linked',specifications:{catalog:{schema_version:1,name_ar:'ماكينة موثقة',images:[
      {url:'https://photos.example/front.jpg',source_url:'https://manufacturer.example/model',usage_status:'source_linked',alt_ar:'الموديل من الأمام',alt_en:'Model front'},
      {url:'https://photos.example/side.jpg',source_url:'https://manufacturer.example/model',usage_status:'source_linked',alt_ar:'الموديل من الجانب',alt_en:'Model side'},
      {url:'https://photos.example/unreviewed.jpg',source_url:'https://manufacturer.example/model',usage_status:'unreviewed'},
    ]}}}] : [];
    return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':data.length?'0-0/1':'*/0','access-control-expose-headers':'content-range'},body:JSON.stringify(data)});
  }); return searches;
}
for(const locale of ['ar','en'] as const) test(`${locale}: mockup 7 menu, centered community, offline lessons, roast guide and model gallery`, async({page},info)=>{
  const ar=locale==='ar';await page.setViewportSize({width:ar?320:800,height:1000});const searches=await fixture(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');if(!ar)await setLanguage(page,'en');
  const nav=page.getByTestId('library-navigation');await expect(nav.getByRole('button')).toHaveCount(15);
  await nav.getByRole('button',{name:ar?'البن والإيحاءات':'Coffee & taste',exact:true}).click();
  const box=await nav.getByRole('button',{name:ar?'البن والإيحاءات':'Coffee & taste',exact:true}).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(ar?320:800);
  for(const name of ar?['البن','الوصفات','كل البن','شخصية البن مكتملة']:['Beans','Recipes','All coffees','Complete personality'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
  const community=await page.getByRole('button',{name:'coffeeHO',exact:true}).boundingBox();expect(community!.x+community!.width/2).toBeCloseTo((ar?320:800)/2,0);
  await page.getByRole('button',{name:ar?'الإعدادات':'Settings',exact:true}).first().click();const settings=page.getByTestId('settings-screen');await settings.getByRole('button',{name:ar?'ليلي':'Dark',exact:true}).click();await expect(settings.getByRole('button',{name:ar?'ليلي':'Dark',exact:true})).toHaveAttribute('aria-pressed','true');await settings.screenshot({path:info.outputPath('settings-mock7.png')});await settings.getByRole('button',{name:ar?'تم':'Done',exact:true}).click();
  await page.getByRole('button',{name:ar?'خبير القهوة':'Coffee expert',exact:true}).click();
  await page.getByRole('button',{name:ar?'مكتبة المعرفة':'Knowledge library',exact:true}).click();
  await page.getByLabel(ar?'ابحث في القائمة':'Search this list',{exact:true}).fill(ar?'PID':'PID');
  await page.getByRole('button',{name:ar?'PID والثبات الحراري':'PID and temperature stability',exact:true}).click();
  const expert=page.getByTestId('coffee-assistant');await expect(expert).toContainText(ar?'حساس':'sensor');
  await expert.getByRole('button',{name:ar?'اشرح أكثر':'Tell me more',exact:true}).click();await expect(expert).toContainText(ar?'إزاحة الحساس':'sensor offsets');expect(searches).toEqual([]);
  await page.getByRole('button',{name:ar?'الرئيسية':'Home',exact:true}).click();
  await page.getByRole('button',{name:ar?'مختبر التحميص':'Roast Lab',exact:true}).click();const roast=page.getByTestId('roast-guide');await expect(roast.getByTestId('roast-levels-image')).toBeVisible();
  await page.getByTestId('roast-level-tabs').getByRole('button',{name:ar?'أخضر':'Green',exact:true}).click();await expect(roast).toContainText(ar?'حبة خام':'Raw seed');await page.getByTestId('roast-level-tabs').getByRole('button',{name:ar?'بني غامق':'Dark brown',exact:true}).click();await expect(roast).toContainText(ar?'الفرقعة الثانية':'second crack');
  await roast.getByRole('button',{name:ar?'دليل التحميص الكامل':'Complete roasting study',exact:true}).click();await roast.getByRole('button',{name:ar?'RoR ومنحنى التحميص':'RoR and the roast curve',exact:true}).click();await expect(roast).toContainText(ar?'لكل دقيقة':'per minute');await roast.screenshot({path:info.outputPath('roast-study.png')});
  await page.getByRole('button',{name:ar?'أدوات القهوة':'Equipment',exact:true}).click();await page.getByRole('button',{name:ar?'ماكينة موثقة':'Verified machine',exact:true}).click();const gallery=page.getByTestId('equipment-gallery');await expect(gallery.getByRole('button',{name:new RegExp(ar?'صورة \\d من 2':'Photo \\d of 2')})).toHaveCount(2);
  await gallery.getByRole('button',{name:new RegExp(ar?'صورة 2 من 2':'Photo 2 of 2')}).click();await expect(gallery.locator('img').first()).toHaveAttribute('src','https://photos.example/side.jpg');await gallery.getByRole('button',{name:ar?'تكبير صورة المعدّة':'Enlarge equipment photo',exact:true}).click();await expect(page.getByRole('button',{name:ar?'إغلاق الصورة':'Close photo',exact:true})).toBeVisible();await page.getByRole('button',{name:ar?'إغلاق الصورة':'Close photo',exact:true}).click();await gallery.screenshot({path:info.outputPath('equipment-gallery.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
