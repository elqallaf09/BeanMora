import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const temp = mkdtempSync(tmpdir() + '/beanmora-xbloom-matches-');
mkdirSync(temp + '/core');
after(() => rmSync(temp, { recursive: true, force: true }));
writeFileSync(temp + '/client.mjs', 'export const publicSupabase = null;\n');
for (const file of ['xbloomMatching.ts','useXBloomMatches.ts','data.ts','guards.ts','sourceBrew.ts','manualBrew.ts',
  'sensory.ts','localizedContent.ts','foreignTitles.ts','copy.ts','localeText.ts','japaneseLabels.ts','recipeDiscovery.ts',
  'core/engine.ts','core/content-media.ts','core/flavor-vocabulary.ts','core/catalog-names.ts','core/catalog-foreign-titles.ts',
  'core/outcome.ts','core/grinder-context.ts','coffeeLabel.ts','coffeeLabelMatches.ts','coffeeOcr.ts',
  'core/deepSearch.ts','core/coffee-name-aliases.ts','core/coffee-label-vocabulary.ts']) {
  const source = readFileSync(new URL('../src/' + file, import.meta.url),'utf8');
  const output = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
    .replace(/from (["'])(\.\/[^"']+)\1/g,"from '$2.mjs'")
    .replace(/from 'react'/g,`from '${pathToFileURL(require.resolve('react')).href}'`);
  writeFileSync(temp + '/' + file.replace('.ts','.mjs'),output);
}
const { readXBloomMatches, attachXBloomMatches, xbloomMatchParams, coffeeBrewIds } = await import(pathToFileURL(temp+'/xbloomMatching.mjs').href);
const { loadXBloomMatches } = await import(pathToFileURL(temp+'/useXBloomMatches.mjs').href);
const { mapCoffee, mapRecipe } = await import(pathToFileURL(temp+'/data.mjs').href);
const { parseGrinderContext, emptyGrinderContext } = await import(pathToFileURL(temp+'/core/grinder-context.mjs').href);
const { parseOutcome } = await import(pathToFileURL(temp+'/core/outcome.mjs').href);
const { readCoffeeLabel, hasCoffeeLabelFacts } = await import(pathToFileURL(temp+'/coffeeLabel.mjs').href);
const { coffeeLabelMatchParams, loadCoffeeLabelMatches } = await import(pathToFileURL(temp+'/coffeeLabelMatches.mjs').href);
const { readCoffeeOcrEvent } = await import(pathToFileURL(temp+'/coffeeOcr.mjs').href);
const BEAN = '22222222-2222-4222-8222-222222222222';
const RECIPE = '11111111-1111-4111-8111-111111111111';
const SOURCE_BEAN = '33333333-3333-4333-8333-333333333333';
const rawCoffee = {id:BEAN,slug:'isolated',name_en:'Frinsa fixture',name_ar:'بن اختبار',requires_review:false,is_published:true,
  suitable_for_v60:true,suitable_for_xbloom:true,roast_level:'light',origin_country:'Indonesia',process:'washed',roaster:null,
  description_en:'Tasting notes (per Test Roaster): Plum, Dried mango, Citrus, Chinese tea, Cashew nuts. Fully washed.',
  description_ar:'الإيحاءات بحسب محمصة الاختبار: برقوق ومانجو وحمضيات. المعالجة مغسولة.'};
const coffee = mapCoffee(rawCoffee,'bean',false);
const rawRecipe = {id:RECIPE,title:'Source profile',title_ar:'وصفة المصدر',brew_method:'xbloom',visibility:'public',bean_id:SOURCE_BEAN,
  roasted_product_id:null,flavor_notes:['tea'],steps:[],equipment:[],source_brew_parameters:{dose:15,water_ml:240,grind_size:50,model:'Studio'},
  source_coffee_name:'Source coffee',source_origin_country:'Indonesia'};
const match = {recipe_id:RECIPE,match_kind:'similar',score:44,matching_notes:['tea'],matching_families:['tea','fruity'],
  same_origin:true,same_process:false,same_roast:false,device_model:'Studio'};
const db = fetch => createClient('https://xbloomfixture.supabase.co','sb_publishable_isolated_xbloom_fixture',
  {auth:{persistSession:false,autoRefreshToken:false},global:{fetch}});
const json = value => new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});

test('bag text extracts stated bilingual facts, leaves missing taste blank and rejects ambiguous growing origins',()=>{
  const label = readCoffeeLabel('Coffee: Test estate\nOrigin: Brazil\nVariety: Castillo\nProcessing: Natural\nRoast: Light\nNotes: Chocolate, Caramel, Hazelnut');
  assert.deepEqual(label,{name:'Test estate',origin:'Brazil',variety:'Castillo',process:'natural',roast:'light',notes:'Chocolate, Caramel, Hazelnut'});
  const ar = readCoffeeLabel('اسم البن: بن تجربة\nالمنشأ: برازيل\nالسلالة: كاستيلو\nالمعالجة: مغسول\nالتحميص: فاتح\nالإيحاءات: شوكولاتة، كراميل');
  assert.equal(ar.origin,'Brazil'); assert.equal(ar.variety,'Castillo'); assert.equal(ar.notes,'شوكولاتة، كراميل');
  assert.equal(readCoffeeLabel('Roasted in Brazil\nCoffee: Untold estate').origin,'');
  assert.equal(readCoffeeLabel('Origin: Brazil and Colombia').origin,'');
  assert.equal(readCoffeeLabel('Origin: Brazil').notes,'');
  assert.equal(readCoffeeLabel('Origin: Indonesia\nWest Java\nCoffee: Frinsa estate').variety,'');
  assert.equal(readCoffeeLabel('Origin: Colombia\nCastillo').variety,'Castillo');
  assert.equal(hasCoffeeLabelFacts(readCoffeeLabel('Roast: Light')) ,false);
});
test('OCR bridge rejects other jobs and untrusted messages, preserves bounded visible text',()=>{
  assert.equal(readCoffeeOcrEvent({channel:'other',type:'result',id:'a',text:'Brazil'},'a'),null);
  assert.equal(readCoffeeOcrEvent({channel:'beanmora-coffee-ocr',type:'result',id:'old',text:'Brazil'},'a'),null);
  assert.deepEqual(readCoffeeOcrEvent({channel:'beanmora-coffee-ocr',type:'result',id:'a',text:'Brazil'},'a'),{type:'result',text:'Brazil'});
});
test('label ranking parameters are literal and never guess a catalog ID from a name or scope V60 by xBloom model',()=>{
  const label={name:'Brazil Castillo',origin:"Brazil %') OR true --",variety:'كاستيلو',process:'natural',roast:'light',notes:'Chocolate'};
  const params=coffeeLabelMatchParams(label,'v60','Studio');
  assert.equal(params.p_origin,label.origin); assert.equal(params.p_variety,'كاستيلو');
  assert.equal(params.p_bean_id,null); assert.equal(params.p_product_id,null); assert.equal(params.p_model,null);
});
test('photo recommendation retains published source measurements and unknown coffee brews cannot become evidence for the source bean',async()=>{
  const label=readCoffeeLabel('Origin: Indonesia\nNotes: Tea, Citrus');
  const result=await loadCoffeeLabelMatches(db(async(input,init)=>{
    const url=new URL(String(input));
    if(url.pathname.endsWith('/rpc/recipes_for_coffee_label')){
      const params=JSON.parse(init.body); assert.equal(params.p_bean_id,null);
      return json([{...match,same_variety:false}]);
    }
    return json(url.pathname.endsWith('/recipes')?[rawRecipe]:[]);
  }),label,'xbloom','Studio','en',new AbortController().signal);
  assert.equal(result[0].dose,15); assert.equal(result[0].water,240); assert.equal(result[0].waterUnit,'ml');
  assert.deepEqual(coffeeBrewIds(result[0]),{recipeId:null,beanId:null,productId:null});
  assert.equal(result[0].labelMatch.label.origin,'Indonesia');
});

test('parenthesized publisher notes are recovered while unstated sensory intensities remain unknown',()=>{
  assert.deepEqual(coffee.flavors,['Plum','Dried mango','Citrus','Chinese tea','Cashew nuts']);
  assert.equal(coffee.sensory.acidity,undefined);
  const arabic = mapCoffee({...rawCoffee,description_en:null},'bean',true);
  assert.deepEqual(arabic.flavors,['برقوق ومانجو وحمضيات']);
});
test('canonical IDs and model stay bound RPC parameters without translated names or legacy-ID scope widening',()=>{
  assert.deepEqual(xbloomMatchParams(coffee,'Studio'),{p_bean_id:BEAN,p_model:'Studio',p_limit:3});
  assert.deepEqual(xbloomMatchParams({...coffee,kind:'product'},'all'),{p_product_id:BEAN,p_model:null,p_limit:3});
});
test('source recipe IDs and metadata survive, target context stays separate, and private/non-xBloom rows are rejected',()=>{
  const recipe = mapRecipe(rawRecipe,'en');
  const [selected] = attachXBloomMatches(coffee,[match],[recipe]);
  assert.equal(selected.beanId,SOURCE_BEAN);
  assert.equal(selected.discovery.coffeeName,'Source coffee');
  assert.equal(selected.coffeeMatch.coffee.id,BEAN);
  assert.equal(recipe.coffeeMatch,undefined);
  assert.deepEqual(attachXBloomMatches(coffee,[match],[{...recipe,public:false}]),[]);
  assert.deepEqual(attachXBloomMatches(coffee,[match],[{...recipe,method:'v60'}]),[]);
});
test('borrowed profiles log the selected bean/product without misattributing evidence to the source recipe',()=>{
  const recipe = mapRecipe(rawRecipe,'en');
  const [selected] = attachXBloomMatches(coffee,[match],[recipe]);
  assert.deepEqual(coffeeBrewIds(selected),{recipeId:null,beanId:BEAN,productId:null});
  assert.deepEqual(coffeeBrewIds(recipe),{recipeId:RECIPE,beanId:SOURCE_BEAN,productId:null});
  const [product] = attachXBloomMatches({...coffee,kind:'product',beanId:BEAN},[match],[recipe]);
  assert.deepEqual(coffeeBrewIds(product),{recipeId:null,beanId:BEAN,productId:BEAN});
  assert.ok(parseGrinderContext({...emptyGrinderContext(),calibration:'Based on xBloom source recipe '+RECIPE}));
  assert.ok(parseOutcome({recipe_id:null,bean_id:BEAN,brew_method:'xbloom',dose_grams:15,water_grams:240,actual_time_seconds:null,
    outcome:'good',status:'brewed_with_modifications',share_with_community:false,next_grind_adjustment:null,taste_scores:{},brewed:true}));
});
test('malformed match responses fail explicitly; scores do not accept a string confidence percentage',()=>{
  assert.throws(()=>readXBloomMatches(null));
  for (const change of [{recipe_id:'invalid'},{match_kind:'official'},{score:'95%'},{device_model:'wrong'}])
    assert.throws(()=>readXBloomMatches([{...match,...change}]));
  assert.deepEqual(readXBloomMatches([{...match,same_process:null}])[0].matching_notes,['tea']);
});
test('loads at most the ranked IDs, public xBloom details, compatible profiles, source ml and cancellation signal',async()=>{
  const requests = [];
  const controller = new AbortController();
  const database = db(async (input,init)=>{
    const url = new URL(input); requests.push({url,init});
    return json(url.pathname.endsWith('/rpc/xbloom_matches_for_coffee')?[match]:url.pathname.endsWith('/recipes')?[rawRecipe]:[]);
  });
  const result = await loadXBloomMatches(database,coffee,'Studio','en',controller.signal);
  assert.equal(result.matches[0].recipe_id,RECIPE);
  assert.equal(result.recipes[0].water,240);
  assert.equal(result.recipes[0].waterUnit,'ml');
  assert.deepEqual(JSON.parse(requests[0].init.body),{p_bean_id:BEAN,p_model:'Studio',p_limit:3});
  const detail = requests.find(r=>r.url.pathname.endsWith('/recipes'));
  assert.equal(detail.url.searchParams.get('visibility'),'eq.public');
  assert.equal(detail.url.searchParams.get('brew_method'),'eq.xbloom');
  assert.equal(detail.url.searchParams.get('id'),'in.('+RECIPE+')');
  assert.ok(requests.every(r=>r.init.signal===controller.signal));
});
test('empty match data makes no detail request and lookup failures never become a guessed recommendation',async()=>{
  let count=0;
  assert.deepEqual(await loadXBloomMatches(db(async()=>{count++;return json([]);}),coffee,'all','en',new AbortController().signal),{matches:[],recipes:[]});
  assert.equal(count,1);
  await assert.rejects(loadXBloomMatches(db(async()=>new Response('{"message":"unavailable"}',{status:400})),coffee,'all','en',new AbortController().signal));
});
