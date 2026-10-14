// Authoring only: extend the reviewed deployed function without changing its
// existing aliases, privileges or public-only index refresh behavior.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
const repo=path.resolve(import.meta.dirname,'../../..');
const snapshot=process.argv[2],destination=process.argv[3];
if(!snapshot||!destination)throw new Error('Provide the reviewed function snapshot and migration destination.');
const {definition}=JSON.parse(fs.readFileSync(snapshot,'utf8'));
const declaration='declare original text:=public.recipe_discovery_normalize(p_value);';
if(!definition.startsWith('CREATE OR REPLACE FUNCTION public.recipe_discovery_search_text(')||!definition.includes(declaration))throw new Error('Unexpected deployed search function.');
const module={exports:{}};
vm.runInThisContext('(function(module,exports){'+ts.transpileModule(fs.readFileSync(path.join(repo,'src/lib/search/multilingual-vocabulary.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText+'})')(module,module.exports);
const groups=module.exports.multilingualSearchVocabulary;
const aliases=groups.flatMap(([canonical,...words])=>words.filter(word=>word.toLowerCase()!==canonical.toLowerCase()&&!/\p{Script=Arabic}/u.test(word)).map(word=>[
  canonical,word.normalize('NFKC').toLowerCase(),/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)?'cjk':word.includes(' ')?'phrase':'word',
]));
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const wordAliases={},phraseAliases={},countryAliases={};
const countries=new Set(module.exports.multilingualCountryTerms);
for(const [canonical,alias,kind] of aliases){
  if(countries.has(canonical))countryAliases[alias]=' '+canonical;
  if(kind==='cjk')continue;
  if(/^[\p{L}\p{N}_]+$/u.test(alias)){
    wordAliases[alias]??=' '+canonical;
  }else{
    const first=alias.split(/[^\p{L}\p{N}_]+/u).filter(Boolean)[0];
    if(!first)throw new Error('Alias has no literal anchor.');
    const pattern='(^|[^[:alnum:]_])'+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^[:alnum:]_])';
    (phraseAliases[first]??=[]).push([pattern,' '+canonical]);
  }
}
const branches=aliases.filter(([, ,kind])=>kind==='cjk').map(([canonical,alias])=>
  '    if strpos(original,'+quote(alias)+')>0 then result:=result||'+quote(' '+canonical)+'; end if;'
).join('\n');
// Exact dictionary lookups scale with the source's words. Only phrases anchored
// by an existing word use a small literal regex; avoid PostgreSQL regex limits.
const helper=`-- Recognize foreign published source text without adding translated prose or facts.
create or replace function public.recipe_discovery_multilingual_text(p_value text)
returns text language plpgsql immutable security invoker set search_path='' as $locale_aliases$
declare original text:=lower(normalize(coalesce(p_value,''),NFKC));
  words text[]:=regexp_split_to_array(original,'[^[:alnum:]_]+'); result text:='';
  word_aliases constant jsonb:=${quote(JSON.stringify(wordAliases))}::jsonb;
  phrase_aliases constant jsonb:=${quote(JSON.stringify(phraseAliases))}::jsonb;
  country_aliases constant jsonb:=${quote(JSON.stringify(countryAliases))}::jsonb;
  word text; phrase jsonb;
begin
  if country_aliases ? btrim(original) then return country_aliases->>btrim(original); end if;
  foreach word in array words loop
    result:=result||coalesce(word_aliases->>word,'');
    for phrase in select value from jsonb_array_elements(coalesce(phrase_aliases->word,'[]'::jsonb)) loop
      if original ~ (phrase->>0) then result:=result||(phrase->>1); end if;
    end loop;
  end loop;
  if original ~ '[ぁ-ヿ㐀-鿿]' then
${branches}
  end if;
  return result;
end $locale_aliases$;
revoke all on function public.recipe_discovery_multilingual_text(text) from public;
grant execute on function public.recipe_discovery_multilingual_text(text) to anon,authenticated,service_role;

`;
const extended=definition.replace(declaration,"declare original text:=public.recipe_discovery_normalize(coalesce(p_value,'')||public.recipe_discovery_multilingual_text(p_value));");
fs.writeFileSync(destination,helper+extended.trimEnd()+';\n\n-- Rebuild public derived search documents with the private maintenance function.\n-- No member facts or recipe settings change; client roles cannot run maintenance.\nselect private.refresh_recipe_search_documents(null::uuid[]);\n');
console.log(`${aliases.length} reviewed foreign aliases prepared for recipe retrieval.`);
