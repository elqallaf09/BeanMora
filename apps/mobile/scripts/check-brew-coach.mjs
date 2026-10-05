import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source=readFileSync(new URL('../src/brewCoach.ts',import.meta.url),'utf8');
const dir=mkdtempSync(tmpdir()+'/beanmora-coach-');
writeFileSync(dir+'/coach.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {brewCoach}=await import(pathToFileURL(dir+'/coach.mjs').href);

test('taste coaching is conservative and changes one grind direction only',()=>{
  assert.equal(brewCoach('sharp_sour').grind,'finer');
  assert.equal(brewCoach('bitter_dry').grind,'coarser');
  assert.equal(brewCoach('balanced').grind,'same');
  assert.equal(brewCoach('thin_weak').grind,null);
  assert.equal(brewCoach('other').grind,null);
});
