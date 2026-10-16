// Authoring tool only. The shipped app reads JSON packs and never downloads a
// model or calls a translation provider. Review the generated packs before use.
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'..');
const runtime=process.env.BEANMORA_TRANSLATION_RUNTIME;
if(!runtime)throw new Error('Set BEANMORA_TRANSLATION_RUNTIME to the local Transformers.js module.');
const {pipeline,env}=await import(runtime);
env.cacheDir=process.env.BEANMORA_TRANSLATION_CACHE??'/tmp/beanmora-translations/cache';
const requested=process.argv.slice(2);
const supported=['ja','fr','it','es','pt-BR','zh-CN'];
if(!requested.length||requested.some(value=>!supported.includes(value)))throw new Error('Specify supported target locales.');
const messages=JSON.parse(readFileSync(path.join(root,'src/locales/source.json'),'utf8'));
const reviewed=JSON.parse(readFileSync(path.join(root,'src/locales/reviewed.json'),'utf8'));
const japanese={};
for(const name of ['localeText.ts','japaneseLabels.ts']){
 const source=ts.createSourceFile(name,readFileSync(path.join(root,'src',name),'utf8'),ts.ScriptTarget.Latest,true);
 function scan(node){if(ts.isPropertyAssignment(node)&&ts.isStringLiteralLike(node.name)&&ts.isStringLiteralLike(node.initializer)&&/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(node.initializer.text))japanese[node.name.text]=node.initializer.text;ts.forEachChild(node,scan);}scan(source);
}
const brands=/\b(?:BeanMora|xBloom|V60|AeroPress|Chemex|ORIGAMI|OREA|HARIO|Kalita|Google|Apple|JPEG|PNG|WebP|MP4|USD|KWD|SAR)\b|https:\/\/\S+|\d+(?:[.:–-]\d+)*(?:\s*°C)?/g;
let active=null,activeId=null;
try{
 for(const locale of requested){
  const romance=!['ja','zh-CN'].includes(locale);
  const id=romance?'Xenova/opus-mt-en-ROMANCE':'Xenova/m2m100_418M';
  const revision=romance?'9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd':'9c374f0b7aca709787cea97b047bfbbd1559d177';
  if(activeId!==id){if(active)await active.dispose();active=await pipeline('translation',id,{revision,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});activeId=id;}
  const destination=path.join(root,'src/locales',locale+'.json');
  let pack={};try{pack=JSON.parse(readFileSync(destination,'utf8'));}catch{}
  const prefix=romance?'>>'+(locale==='pt-BR'?'pt':locale)+'<< ':'';
  const options={src_lang:'en',tgt_lang:locale==='zh-CN'?'zh':locale,max_new_tokens:384,num_beams:1};
  async function infer(text){if(!/[A-Za-z]/.test(text))return text;const output=await active(prefix+text,options);return String(output[0]?.translation_text??'').trim();}
  let updated=0,fallbacks=0;
  for(const message of messages){
   const key=message.en;
   if(pack[key])continue;
   if(locale==='ja'&&japanese[key]){pack[key]=japanese[key];continue;}
   const protectedValues=[];
   const marked=key.replace(/\{\d+\}|\b(?:BeanMora|xBloom|V60|AeroPress|Chemex|ORIGAMI|OREA|HARIO|Kalita|Google|Apple|JPEG|PNG|WebP|MP4|USD|KWD|SAR)\b|https:\/\/\S+|\d+(?:[.:–-]\d+)*(?:\s*°C)?/g,value=>{const n=protectedValues.push(value)-1;return `{${n}}`;});
   let result=await infer(marked);
   result=result.replace(/\{\s*(\d+)\s*\}/g,'{$1}');
   const found=[...result.matchAll(/\{(\d+)\}/g)].map(x=>Number(x[1])).sort((a,b)=>a-b);
   if(!result||found.length!==protectedValues.length||found.some((n,i)=>n!==i)){
    // Translate literal fragments separately if a model drops a slot. Runtime
    // values, source numbers, units, URLs and brand names stay byte-for-byte.
    const pieces=marked.split(/(\{\d+\})/g);const translated=[];
    for(const piece of pieces){if(/^\{\d+\}$/.test(piece)){translated.push(piece);continue;}if(!piece.trim()){translated.push(piece);continue;}const text=await infer(piece.trim());translated.push((/^\s/.test(piece)?' ':'')+text+(/\s$/.test(piece)?' ':''));}
    result=translated.join('');fallbacks++;
   }
   result=result.replace(/\{(\d+)\}/g,(_,n)=>protectedValues[Number(n)]);
   if(locale==='pt-BR')result=result.replace(/\bficheiros?\b/gi,v=>v.toLowerCase()==='ficheiro'?'arquivo':'arquivos').replace(/\butilizadores?\b/gi,v=>v.toLowerCase()==='utilizador'?'usuário':'usuários').replace(/palavra-passe/gi,'senha').replace(/telemóvel/gi,'celular').replace(/ecrã/gi,'tela');
   pack[key]=result;updated++;
   if(updated%20===0){writeFileSync(destination,JSON.stringify(pack,null,2)+'\n');console.log(JSON.stringify({locale,complete:Object.keys(pack).length,total:messages.length,fallbacks}));}
  }
  pack=Object.fromEntries(messages.map(({en})=>[en,reviewed[locale]?.[en]??pack[en]]));
  writeFileSync(destination,JSON.stringify(pack,null,2)+'\n');console.log(JSON.stringify({locale,complete:Object.keys(pack).length,total:messages.length,fallbacks,done:true}));
 }
}finally{if(active)await active.dispose();}
