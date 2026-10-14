import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root=path.resolve(import.meta.dirname,'../src'), cache=new Map();
function moduleAt(file){
  if(!path.extname(file))file+='.ts';
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const require=name=>{assert.ok(name.startsWith('.'),'Only local locale modules belong in this test');return moduleAt(path.resolve(path.dirname(file),name));};
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+compiled+'\n})',{filename:file})(require,module,module.exports);
  return module.exports;
}
const {localeLabel,SUPPORTED_LOCALES,isLocale}=moduleAt(path.join(root,'localeText.ts'));
const {assistantInput}=moduleAt(path.join(root,'assistantInput.ts'));
const {createMessageTrace,tracedMessage}=moduleAt(path.join(root,'messageTrace.ts'));
const {assistantCatalogSummary,assistantCatalogFact,importedRecipeSummary}=moduleAt(path.join(root,'assistantCatalogText.ts'));
const {parseLocalAssistantQuery,converseLocally}=moduleAt(path.join(root,'core/local-coffee-assistant.ts'));
const {flavorDisplay}=moduleAt(path.join(root,'sensory.ts'));
const {matchesDeepSearch,canonicalSearchQuery}=moduleAt(path.join(root,'core/deepSearch.ts'));
const {flavorTranslations}=moduleAt(path.join(root,'core/flavor-vocabulary.ts'));
assert.equal(flavorDisplay('Honey','ja'),'はちみつ');
assert.equal(localeLabel('ja','عسلي','Honey'),'ハニープロセス');
assert.equal(flavorDisplay('Original member note','ja'),'Original member note');
const source=JSON.parse(fs.readFileSync(path.join(root,'locales/source.json'),'utf8'));
assert.deepEqual([...SUPPORTED_LOCALES],['ar','en','ja','fr','it','es','pt-BR','zh-CN']);
assert.equal(isLocale('pt'),false);assert.equal(isLocale('zh'),false);
const questions={
  ja:'xBloom の冷たいコーヒーレシピ、ココナッツとはちみつの風味',
  fr:'une recette froide pour ma machine xBloom avec des notes de noix de coco et miel',
  it:'una ricetta fredda per la macchina xBloom con note di cocco e miele',
  es:'una receta fría para mi máquina xBloom con notas de coco y miel',
  'pt-BR':'uma receita gelada para minha máquina xBloom com notas de coco e mel',
  'zh-CN':'xBloom 冷饮配方 椰子和蜂蜜风味',
};
const sellers={ja:'エスプレッソマシン販売サイト',fr:'un site qui vend des machines espresso',it:'un sito per comprare una macchina espresso',es:'quiero un sitio que venda cafeteras de espresso','pt-BR':'quero um site que vende máquinas de espresso','zh-CN':'买浓缩咖啡机的网站'};
const roasters={ja:'ブラジルのロースター',fr:'torréfacteurs au Brésil',it:'torrefazioni in Brasile',es:'tostadores en Brasil','pt-BR':'torrefações no Brasil','zh-CN':'巴西的烘焙商'};
for(const [locale,question] of Object.entries(questions)){
  // Inspect exactly the production pack. Reviewed authoring data must not mask
  // missing or incorrect shipped values.
  const pack=JSON.parse(fs.readFileSync(path.join(root,'locales',locale+'.json'),'utf8'));
  for(const {en}of source){
    assert.ok(pack[en]?.trim(),locale+' missing '+en);
    const slots=value=>[...value.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort();
    assert.deepEqual(slots(pack[en]),slots(en),locale+' changed placeholders in '+en);
    assert.ok(!/<unk>|\[UNK\]|(\S)\1{10}/u.test(pack[en]),locale+' contains a translation model artifact in '+en);
  }
  for(const brand of ['April','Kalita Wave','xBloom','Original'])assert.equal(localeLabel(locale,brand,brand),brand);
  const input=assistantInput(locale,question),query=parseLocalAssistantQuery(input);
  assert.equal(query.kind,'recipe',locale+' '+input);assert.equal(query.servingStyle,'cold');assert.deepEqual(query.methods,['xbloom']);
  assert.ok(query.noteTerms.includes('coconut'),locale+' '+JSON.stringify(query)+' '+input);assert.ok(query.noteTerms.includes('honey'),locale+' '+input);
  assert.deepEqual([...query.terms].sort(),['coconut','honey'],locale+' retained foreign filler as search terms');
  const trace=createMessageTrace('locale-test');
  const userTitle=trace.value('اسم مستخدم','Save');
  const message=trace.label('حساب النسبة المطلوبة','Requested ratio calculation');
  const captured=trace.snapshot(message+': 18 g × 16 = 288 g\n'+userTitle);
  const answer=tracedMessage(captured,captured.answer,locale);
  assert.ok(!answer.includes('__bm_'));assert.ok(!answer.includes('Requested ratio calculation'));assert.ok(answer.endsWith('Save'));assert.ok(answer.includes('18 g × 16 = 288 g'));
  const summary=assistantCatalogSummary(locale,null,importedRecipeSummary);
  assert.notEqual(summary,importedRecipeSummary,locale+' must translate the importer notice');
  assert.ok(summary.includes('ml'));
  assert.equal(assistantCatalogSummary(locale,null,'Original publisher prose: Save / unspecified'),'Original publisher prose: Save / unspecified');
  const machineSummary='Portable hand-pump espresso maker with an unpressurised basket; does not heat water.';
  assert.notEqual(assistantCatalogSummary(locale,null,machineSummary),machineSummary);
  assert.equal(assistantCatalogFact(locale,'material','Original alloy name'),'Original alloy name');
  assert.equal(assistantCatalogFact(locale,'temperature',92),'92');
  assert.ok(assistantCatalogFact(locale,'capacity','80 ml water').includes('80'));
  assert.ok(assistantCatalogFact(locale,'capacity','80 ml water').includes('ml'));
  assert.ok(!assistantCatalogFact(locale,'capacity','80 ml water').includes('water'));
  assert.notEqual(assistantCatalogFact(locale,'operation',['ذراع يدوي','Manual lever']),'Manual lever');
  assert.equal(assistantCatalogFact(locale,'heats_water','No'),pack['No']);
  const sourcePour='Water: 35 ml; source temperature: 92; flow: unspecified ml/s; pause: 19 s. Check the original link for pouring pattern.';
  const pour=localeLabel(locale,'الماء: 35 مل · حرارة المصدر: 92 · التدفق: غير منشور · التوقف: 19 ث. راجع نمط الصب في رابط المصدر.',sourcePour);
  assert.ok(!pour.includes('unspecified'),locale+' must translate the importer missing-value sentinel');
  for(const value of ['35','92','19','ml/s'])assert.ok(pour.includes(value),locale+' changed source pour fact '+value);
  const publisherTrace=createMessageTrace('publisher-title');
  const publisherTitle=publisherTrace.value('اسم منشور','unspecified');
  assert.equal(tracedMessage(publisherTrace.snapshot(publisherTitle),publisherTitle,locale),'unspecified');
  const dynamic=localeLabel(locale,'الصبة 57','Pour 57');assert.ok(dynamic.includes('57'));assert.notEqual(dynamic,'Pour 57');
  const result=await converseLocally(input,'en',[],{search:async()=>({documents:[],rates:[]}),translate:trace.label,translateValue:trace.value});
  assert.equal(result.query.kind,'recipe');assert.equal(result.query.servingStyle,'cold');
  const seller=parseLocalAssistantQuery(assistantInput(locale,sellers[locale]));
  assert.equal(seller.kind,'equipment',locale+' seller intent');assert.equal(seller.category,'espresso_machine');assert.equal(seller.purchaseIntent,true);assert.deepEqual(seller.terms,[]);
  const roaster=parseLocalAssistantQuery(assistantInput(locale,roasters[locale]));assert.equal(roaster.kind,'roaster',locale+' roaster intent');assert.deepEqual(roaster.terms,['brazil']);
  for(const flavor of Object.keys(flavorTranslations)) {
    const word=pack[flavor];assert.ok(word,locale+' missing flavor '+flavor);
    assert.ok(matchesDeepSearch(flavor,word),locale+' cannot search displayed flavor '+flavor+' / '+word);
  }
  assert.ok(matchesDeepSearch('Coconut honey Colombia',localeLabel(locale,'جوز الهند','coconut')+' '+localeLabel(locale,'عسل','honey')));
  assert.ok(!matchesDeepSearch('Coconut Colombia',localeLabel(locale,'جوز الهند','coconut')+' '+localeLabel(locale,'عسل','honey')),locale+' must preserve all search terms');
  assert.equal(canonicalSearchQuery(localeLabel(locale,'فراولة','strawberry')),'strawberry');
}
const decimalQuestion=assistantInput('fr','calcule 18,5 grammes à 1:16,5');
const decimal=await converseLocally(decimalQuestion,'en',[],{search:async()=>{throw new Error('Arithmetic must stay offline');}});
assert.equal(decimal.calculation.dose,18.5);assert.equal(decimal.calculation.ratio,16.5);assert.ok(decimal.answer.includes('305.25 g'));
console.log(`All ${source.length} registered messages covered in six packs; placeholders, brands, quantities and multilingual recipe intent preserved.`);
