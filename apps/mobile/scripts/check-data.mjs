import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const temp = mkdtempSync(tmpdir() + '/beanmora-data-'); mkdirSync(temp + '/core');
for (const file of ['data.ts','guards.ts','sourceBrew.ts','manualBrew.ts','core/engine.ts']) {
  const source = readFileSync(new URL('src/' + file, root), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  writeFileSync(temp + '/' + file.replace('.ts','.mjs'), code);
}
const { loadData, mapRecipe } = await import(pathToFileURL(temp + '/data.mjs').href);
function database(tables) {
  return { from(name) { const q = { select(){return q;},eq(){return q;},in(){return q;},or(){return q;},order(){return q;},limit(){return q;},then(done){return Promise.resolve({data:tables[name]??[],error:null}).then(done);} }; return q; } };
}
const base={id:'bean',slug:'bean',name_en:'Real coffee',requires_review:false,is_published:true,roaster:{name_en:'Roaster',logo_url:'https://example.test/logo.png'},suitable_for_v60:true};
test('approved gallery photos are ordered and never replaced by roaster logos or unapproved assets',async()=>{
  const data=await loadData(database({beans:[{...base,image_url:'https://example.test/unapproved.png',image_usage_status:'rights_unknown',images:[{url:'https://example.test/second.jpg',position:2,image_usage_status:'rights_confirmed'},{url:'https://example.test/first.jpg',position:0,image_usage_status:'rights_confirmed'},{url:'https://example.test/removed.jpg',position:-1,image_usage_status:'removal_requested'}]}]}),'en',null);
  assert.equal(data.coffees[0].imageUrl,'https://example.test/first.jpg');
  assert.deepEqual(data.coffees[0].images,['https://example.test/first.jpg','https://example.test/second.jpg']);
  const empty=await loadData(database({beans:[base]}),'en',null);
  assert.equal(empty.coffees[0].imageUrl,null);
});
test('product origins come from the linked lot and unknown brew quantities stay unknown',async()=>{
  const data=await loadData(database({roasted_products:[{...base,id:'product',lot:{origin_country:'Bolivia',process:'natural'},status:'available'}],recipes:[{id:'recipe',title:'Recipe',brew_method:'xbloom',visibility:'public',dose_grams:18,water_grams:288,water_temp_c:92,total_time_seconds:150}]}),'en',null);
  assert.equal(data.coffees[0].origin,'Bolivia');assert.equal(data.coffees[0].process,'natural');
  assert.equal(data.recipes[0].temperature,92);assert.equal(data.recipes[0].dose,18);
  const empty=await loadData(database({recipes:[{id:'recipe',title:'Recipe',brew_method:'v60',visibility:'public',dose_grams:null,water_grams:null,water_temp_c:null,total_time_seconds:null}]}),'en',null);
  assert.equal(empty.recipes[0].dose,null);assert.equal(empty.recipes[0].temperature,null);
});
test('bounded recipe reads disclose truncation at 200 records',async()=>{
  const data=await loadData(database({recipes:Array.from({length:201},(_,i)=>({id:String(i),title:String(i),brew_method:'v60',visibility:'public'}))}),'en',null);
  assert.equal(data.recipes.length,200);assert.equal(data.limited,true);
});
test('coffee descriptions keep tasting information without catalog import implementation notes',async()=>{
  const data=await loadData(database({beans:[{...base,description_en:'Tasting notes: jasmine, honey. Altitude stated at 1600-1750 MASL (altitude_meters left null). Roast not mapped to roast_level. Pour over (V60) recommended.'}]}),'en',null);
  assert.equal(data.coffees[0].description,'Tasting notes: jasmine, honey. Pour over (V60) recommended.');
});
test('recipe steps use the chosen language and manual gram pours retain their units and times', () => {
  const row = { id: 'recipe', title: 'Recipe', brew_method: 'chemex', visibility: 'public', dose_grams: 25, water_grams: 400, steps: [{ step_number: 1, title: 'Bloom', title_ar: 'التزهير', description: 'Wet coffee', description_ar: 'بلّل البن' }], pours: [{ pour_number: 2, water_grams: '350', start_at_seconds: 30, is_bloom: false }, { pour_number: 1, water_grams: 50, start_at_seconds: 0, is_bloom: true }], source_brew_parameters: { manual: { scalable: true } } };
  assert.equal(mapRecipe(row, 'ar').steps[0].description, 'بلّل البن');
  assert.equal(mapRecipe(row, 'en').steps[0].description, 'Wet coffee');
  assert.deepEqual(mapRecipe(row, 'en').pours[0], { number: 1, grams: 50, at: 0, bloom: true });
  assert.equal(mapRecipe(row, 'ar').sourceBrew.manual.scalable, true);
});
