import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const js = ts.transpileModule(readFileSync(new URL('../src/xbloomDraft.ts', import.meta.url),'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildXBloomDraft, compatibleXBloom } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const source = { id:'source', method:'xbloom', title:'Coffee', dose:15, sources:[{url:'https://example.com/recipe'}], discovery:{ servingStyle:'hot' }, sourceBrew:{model:'Studio',cup_type:'OMNI',dose:15,grind_size:55,pours:[{volume:45,temperature:93,flow_rate:3,pause_seconds:30},{volume:90,temperature:92,flow_rate:3,pause_seconds:10},{volume:90,temperature:91,flow_rate:3,pause_seconds:0}]} };
const prefs = { model:'Studio',cup:'Omni',serving:'hot',amount:'250',unit:'water',coffee:'My coffee',flavor:'' };
test('draft scales actual pours, preserves source settings and stays private', () => {
 const d=buildXBloomDraft(source,prefs,true);
 assert.equal(d.values.water,'250'); assert.equal(d.values.dose,'16.7'); assert.equal(d.values.visibility,'private');
 assert.ok(Math.abs(d.brew.pours.reduce((s,p)=>s+p.volume,0)-250)<.001);
 assert.deepEqual(d.brew.pours.map(p=>p.temperature),[93,92,91]); assert.equal(d.brew.grind_size,55);
 assert.equal(d.brew.adapted,true); assert.equal(d.brew.adapted_from_recipe_id,'source');
 assert.equal(d.values.source_url,'https://example.com/recipe');
});
test('machine, dripper, serving and incomplete recipes cannot silently cross over', () => {
 for(const override of [{model:'Original'},{cup:'xPod'},{serving:'cold_or_iced'}]) {
  assert.equal(compatibleXBloom(source,{...prefs,...override}),false);
  assert.throws(()=>buildXBloomDraft(source,{...prefs,...override},false));
 }
 assert.throws(()=>buildXBloomDraft({...source,sourceBrew:{...source.sourceBrew,pours:[]}},prefs,false));
 assert.throws(()=>buildXBloomDraft(source,{...prefs,amount:'900'},false));
 assert.throws(()=>buildXBloomDraft(source,{...prefs,amount:'NaN'},false));
});
test('dose input and Arabic numerals produce a coherent water total', () => {
 const d=buildXBloomDraft(source,{...prefs,unit:'dose',amount:'٢٠'},false);
 assert.equal(d.values.dose,'20'); assert.equal(d.values.water,'300');
 assert.equal(d.brew.pours.reduce((sum,p)=>sum+p.volume,0),300);
});
