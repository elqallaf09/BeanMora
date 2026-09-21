import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const build = mkdtempSync(join(tmpdir(), 'beanmora-brew-'));
const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
execFileSync(tsc, ['--strict','--skipLibCheck','--moduleResolution','node','--target','ES2017','--lib','ESNext,DOM','--module','commonjs','--outDir',build,'src/lib/brewing/outcome.ts'], { stdio: 'inherit' });
const { parseOutcome, saveOutcome, outcomeError } = createRequire(import.meta.url)(join(build, 'outcome.js'));
process.on('exit', () => rmSync(build, { recursive: true, force: true }));
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const valid=()=>({recipe_id:id,bean_id:null,brew_method:'v60',dose_grams:18,water_grams:300,actual_time_seconds:165,outcome:'good',status:'brewed_as_written',share_with_community:false,next_grind_adjustment:null,taste_scores:{},brewed:true});
await test('accepts explicit private actual brew without invented ratings',()=>assert.deepEqual(parseOutcome(valid()),valid()));
for (const [key,value] of [['dose_grams',0],['dose_grams',-1],['dose_grams',Infinity],['dose_grams',NaN],['dose_grams','18'],['dose_grams',18.123],['water_grams',100000],['actual_time_seconds',0],['actual_time_seconds',1.5],['actual_time_seconds',604801],['outcome','saved'],['status','saved_only'],['brew_method','random'],['brewed',false],['share_with_community','true'],['recipe_id','bad-id'],['taste_scores',{acidity:6}],['taste_scores',{balance:0}],['taste_scores',{overall_rating:3.5}],['taste_scores',{secret:1}],['next_grind_adjustment','9E']]) {
  await test(`rejects ${key}=${String(value)}`,()=>assert.equal(parseOutcome({...valid(),[key]:value}),null));
}
await test('allows unknown actual time without substituting estimate',()=>assert.ok(parseOutcome({...valid(),actual_time_seconds:null})));
await test('quick-start cup cannot opt into public recipe evidence',()=>assert.equal(parseOutcome({...valid(),recipe_id:null,share_with_community:true}),null));
await test('quick-start private cup is valid',()=>assert.ok(parseOutcome({...valid(),recipe_id:null})));
await test('rejects forged user id',()=>assert.equal(parseOutcome({...valid(),user_id:id}),null));
await test('does not send invalid data',async()=>{let calls=0; const r=await saveOutcome({rpc(){calls++; throw Error();}},id,{...valid(),brewed:false}); assert.equal(r.ok,false);assert.equal(calls,0);});
await test('only exact confirmed request id is success',async()=>assert.deepEqual(await saveOutcome({rpc:async()=>({data:id,error:null})},id,valid()),{ok:true,id}));
await test('null data without error is NOT saved',async()=>assert.equal((await saveOutcome({rpc:async()=>({data:null,error:null})},id,valid())).ok,false));
await test('database error is NOT saved',async()=>assert.equal((await saveOutcome({rpc:async()=>({data:id,error:{message:'failed'}})},id,valid())).ok,false));
await test('thrown network error preserves retry path',async()=>assert.deepEqual(await saveOutcome({rpc:async()=>{throw Error('network');}},id,valid()),{ok:false,error:'retry'}));
await test('retry preserves same RPC name, id and payload',async()=>{const calls=[];const client={rpc:async(n,p)=>{calls.push([n,p]);return {data:calls.length>1?id:null,error:calls.length>1?null:{message:'network'}};}};await saveOutcome(client,id,valid());await saveOutcome(client,id,valid());assert.deepEqual(calls[0],calls[1]);});
await test('stable error mapping does not leak database text',()=>{assert.equal(outcomeError({message:'BREW_AUTH_REQUIRED'}),'auth');assert.equal(outcomeError({message:'BREW_REQUEST_CONFLICT'}),'conflict');assert.equal(outcomeError({code:'PGRST202'}),'unavailable');assert.equal(outcomeError({message:'secret database error'}),'retry');});
function keys(o,p=''){return Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v,p+k+'.'):[p+k]).sort();}
await test('Arabic and English translation key parity',()=>assert.deepEqual(keys(JSON.parse(readFileSync('messages/brewing/ar.json','utf8'))),keys(JSON.parse(readFileSync('messages/brewing/en.json','utf8')))));
await test('form captures data before disabling inputs/auth await',()=>{const s=readFileSync('src/components/coffee/brew-outcome-form.tsx','utf8'); assert.ok(s.indexOf('new FormData(event.currentTarget)')<s.indexOf('setBusy(true)')); assert.ok(s.includes('if (locked.current || saved) return')); assert.ok(!s.includes('defaultChecked'));});
await test('guided skipped time is never passed as measured duration',()=>{const s=readFileSync('src/app/[locale]/(app)/v60/brew/guided-brew-client.tsx','utf8');assert.ok(s.includes('!skipped && elapsed > 0 ? elapsed : null'));assert.ok(!s.includes('.from("brew_log_taste_scores")'));});

await test('community reads require consent, owner reads remain personal',()=>{const s=readFileSync('src/lib/recommendations/load.ts','utf8');const [own,shared]=s.split('async function publicEvidence');assert.ok(own.includes('.eq("user_id", user.id).not("brew_log_id", "is", null)'));assert.ok(shared.includes('.eq("share_with_community", true).not("brew_log_id", "is", null)'));});
