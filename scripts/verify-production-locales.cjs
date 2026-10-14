'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect, request } = require('../apps/mobile/node_modules/@playwright/test');
const BASE = 'https://beanmora-mobile.expo.app/';
const BACKEND = 'https://ubvzdglrwkkuaigmkjap.supabase.co';
const names = { ar:'العربية', en:'English', ja:'日本語', fr:'Français', it:'Italiano', es:'Español', 'pt-BR':'Português (Brasil)', 'zh-CN':'简体中文' };
const arLabels = { Search:'البحث', 'Search everything':'البحث الشامل', Home:'الرئيسية', 'Coffee expert':'خبير القهوة', Send:'إرسال', 'New conversation':'محادثة جديدة' };
const languages = [
 {locale:'ar',berry:'فراولة',shop:'موقع بيع مكائن اسبرسو',cold:'طلعلي وصفة قهوه باردة حق مكينة اكسبلوم لي بن ايحاءة جوز الهند وعسل'},
 {locale:'en',berry:'strawberry',shop:'A website selling espresso machines',cold:'Find a cold recipe for my xBloom machine with coconut and honey notes'},
 {locale:'ja',berry:'いちご',shop:'エスプレッソマシンを販売するサイト',cold:'xBloom の冷たいコーヒーレシピ、ココナッツとはちみつの風味'},
 {locale:'fr',berry:'fraise',shop:'un site qui vend des machines espresso',cold:'une recette froide pour ma machine xBloom avec des notes de noix de coco et miel'},
 {locale:'it',berry:'fragola',shop:'un sito per comprare una macchina espresso',cold:'una ricetta fredda per la macchina xBloom con note di cocco e miele'},
 {locale:'es',berry:'fresa',shop:'un sitio que venda máquinas espresso',cold:'una receta fría para mi máquina xBloom con notas de coco y miel'},
 {locale:'pt-BR',berry:'morango',shop:'um site para comprar máquinas espresso',cold:'uma receita gelada para minha máquina xBloom com notas de coco e mel'},
 {locale:'zh-CN',berry:'草莓',shop:'买浓缩咖啡机的网站',cold:'xBloom 冷饮配方 椰子和蜂蜜风味'}
];
const allowedReads = new Set(['search_public_recipes','search_public_recipes_v2','search_coffee_assistant','search_coffee_assistant_recipes']);
const report = { version:'0.5.35', sourceBundle:null, languages:[] };
const save = () => fs.writeFileSync('live-verification.json', JSON.stringify(report,null,2));
async function releasedBundle() {
 const client = await request.newContext();
 try {
  for (let i=0;i<24;i++) {
   const htmlResponse=await client.get(BASE);
   assert.equal(htmlResponse.status(),200,'Production document status');
   const html=await htmlResponse.text();
   const match=html.match(/<script[^>]*src="([^"]+)"/);
   assert.ok(match,'Production script link');
   const url=new URL(match[1],BASE);
   assert.equal(url.origin,new URL(BASE).origin,'Same-origin production script');
   assert.ok(url.pathname.startsWith('/_expo/static/js/web/'));
   const response=await client.get(url.href);
   assert.equal(response.status(),200,'Production script status');
   const text=(await response.text()).replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
   if(text.includes('次の一杯を見つける')&&text.includes('出典の抽出設定です。')&&text.includes('湯沸かし機能')) {
    report.sourceBundle=url.href;save();console.log('Verified final 0.5.35 production bundle: '+url.href);return;
   }
   console.log('Waiting for the checked 0.5.35 source to reach production ('+(i+1)+').');
   await new Promise(resolve=>setTimeout(resolve,15000));
  }
  throw new Error('Final checked production source did not arrive within six minutes.');
 } finally { await client.dispose(); }
}
async function setLanguage(page,locale) {
 await page.getByRole('button',{name:/^(الإعدادات|Settings|設定|Paramètres|Impostazioni|Configuración|Configurações|设置)$/,exact:true}).first().click();
 const panel=page.getByTestId('settings-screen');
 await panel.getByRole('button',{name:names[locale],exact:true}).click();
 await expect(panel).toContainText('0.5.35');
 await panel.getByTestId('settings-done').click();
 await expect(panel).toHaveCount(0);
 await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',locale);
}
async function rpc(page,name,predicate,action) {
 const pending=page.waitForResponse(response=>{
  if(!response.url().startsWith(BACKEND+'/rest/v1/rpc/'+name)||response.request().method()!=='POST')return false;
  return predicate(response.request().postDataJSON());
 },{timeout:45000});
 await action();const response=await pending;
 assert.ok([200,206].includes(response.status()),'Public read RPC '+name+' status '+response.status());
 // PostgREST returns 206 for successful ranged results with a requested count.
 if(response.status()===206)assert.ok(response.headers()['content-range'],'Partial result has its range header');
 const data=await response.json();assert.ok(Array.isArray(data),'Public read rows');
 return {payload:response.request().postDataJSON(),rows:data.length,status:response.status()};
}
async function completeQuestion(panel,question) {
 // A textarea's value can match getByText while a request is pending. Waiting
 // for the value to clear verifies that the completed turn was committed.
 await expect(panel.getByRole('textbox')).toHaveValue('',{timeout:45000});
 await expect(panel).toContainText(question);
}
(async()=>{
 await releasedBundle();
 const browser=await chromium.launch({headless:true});
 try {
  for(const language of languages) {
   const locale=language.locale;console.log('Checking production locale: '+locale);
   const pack=['ar','en'].includes(locale)?{}:JSON.parse(fs.readFileSync(path.join(__dirname,'../apps/mobile/src/locales',locale+'.json'),'utf8'));
   const label=key=>locale==='ar'?arLabels[key]:pack[key]||key;
   const context=await browser.newContext({viewport:{width:390,height:844},locale});
   const page=await context.newPage();
   const blockedWrites=[];let versionSeen=false;let providerCalls=0;
   await page.route('**/*',async route=>{
    const req=route.request(),url=req.url();
    if(/openai|anthropic|generativelanguage|functions\/v1\/coffee-assistant/.test(url)){providerCalls++;return route.abort();}
    if(!url.startsWith(BACKEND))return route.continue();
    const pathname=new URL(url).pathname;
    const read=['GET','HEAD','OPTIONS'].includes(req.method())||pathname.startsWith('/rest/v1/rpc/')&&allowedReads.has(pathname.split('/').at(-1));
    if(!read){blockedWrites.push({method:req.method(),path:pathname});return route.abort();}
    if((req.headers()['x-client-info']||'').includes('beanmora-mobile/0.5.35'))versionSeen=true;
    return route.continue();
   });
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
   await setLanguage(page,locale);
   await page.reload({waitUntil:'domcontentloaded'});
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   await page.getByRole('button',{name:label('Search'),exact:true}).click();
   const field=page.getByLabel(label('Search everything'),{exact:true});
   const search=await rpc(page,'search_public_recipes',p=>p.p_query===(locale==='ar'?language.berry:'strawberry'),()=>field.fill(language.berry.normalize('NFD')));
   assert.ok(search.rows>0,'Published native strawberry search returns results');
   await expect(field).toHaveValue(language.berry.normalize('NFD'));
   const literal=await rpc(page,'search_public_recipes',p=>p.p_query&&p.p_query.includes('unknown_brand_release_check'),()=>field.fill(language.berry+' unknown_brand_release_check'));
   assert.equal(literal.rows,0,'Unknown required query term stays literal');
   await page.getByRole('button',{name:label('Home'),exact:true}).click();
   await page.getByRole('button',{name:label('Coffee expert'),exact:true}).click();
   const panel=page.getByTestId('coffee-assistant');
   const shop=await rpc(page,'search_coffee_assistant',p=>p.p_kind==='equipment'&&p.p_category==='espresso_machine',async()=>{
    await panel.getByRole('textbox').fill(language.shop);await panel.getByRole('button',{name:label('Send'),exact:true}).click();
   });
   await completeQuestion(panel,language.shop);
   assert.ok(shop.rows>0,'Public espresso-machine seller rows exist');
   await expect(panel.getByTestId('assistant-result').first()).toBeVisible();
   if(!['ar','en'].includes(locale)){
    await expect(panel).not.toContainText('Portable hand-pump espresso maker');
    await expect(panel).not.toContainText('Manual lever');
    await expect(panel).not.toContainText('80 ml water');
   }
   const cold=await rpc(page,'search_coffee_assistant_recipes',p=>p.p_serving_style==='cold'&&p.p_methods&&p.p_methods.includes('xbloom'),async()=>{
    await panel.getByRole('textbox').fill(language.cold);await panel.getByRole('button',{name:label('Send'),exact:true}).click();
   });
   await completeQuestion(panel,language.cold);
   assert.ok(cold.payload.p_terms.includes('coconut')&&cold.payload.p_terms.includes('honey'),'Both requested notes stay bound');
   const text=await panel.innerText();
   assert.ok(/\d+(?:\.\d+)? ml/.test(text),'Published source water keeps ml');
   assert.ok(/\d+(?:\.\d+)? g/.test(text),'Published coffee mass keeps g');
   if(!['ar','en'].includes(locale)){
    await expect(panel).not.toContainText('Source brew settings; water is in ml.');
    await expect(panel).not.toContainText('unspecified');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile viewport fits');
   assert.ok(versionSeen,'Correct production client version header');
   assert.deepEqual(blockedWrites,[],'All application verification requests are public reads');
   assert.equal(providerCalls,0,'Assistant stays local to the published catalog');
   const result={locale,languagePersisted:true,nativePublishedRows:search.rows,searchStatus:search.status,literalRows:literal.rows,sellerRows:shop.rows,coldRows:cold.rows,sourceQuantitiesPreserved:true,translatedCatalogCopy:true,publicReadsOnly:true};
   report.languages.push(result);save();console.log(JSON.stringify(result));
   await context.close();
  }
  assert.equal(report.languages.length,8);
  console.log('PASS: all eight production languages, native queries, literal constraints, seller intent, cold xBloom intent, catalog notices and original quantities.');
 } finally {await browser.close();}
})().catch(error=>{report.failure=error.message;save();console.error(error.stack);process.exitCode=1;});
