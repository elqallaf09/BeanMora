// Generate the server supplement from the same reviewed vocabulary as web/mobile.
// Keep historical migrations immutable; generate a new migration when aliases change.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
const repo = path.resolve(import.meta.dirname, '../../..');
const module = { exports: {} };
vm.runInThisContext('(function(module,exports){'+ts.transpileModule(fs.readFileSync(path.join(repo,'src/lib/search/flavor-vocabulary.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText+'})')(module,module.exports);
const { flavorSearchVocabulary: flavors, flavorRetrievalEquivalents: equivalents } = module.exports;
const quote = value => "'"+value.replaceAll("'","''")+"'";
// Match the deployed SQL normalizer, retaining both its Arabic spelling and the
// client's NFKD spelling (ئ, for example). This fixes old generated SQL drift.
const normalize = value => value.toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[ـًٌٍَُِّْٰ]/g,'').replace(/\s+/g,' ').trim();
const normalizedGroup = group => [...new Set(group.flatMap(alias => [normalize(alias),normalize(alias.normalize('NFKD').replace(/\p{M}/gu,''))]))];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replaceAll(' ','[[:space:]]+');
const pattern = aliases => '(^|[^[:alnum:]_])('+[...aliases].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?=$|[^[:alnum:]_])';
const queryGroups = ['coconut','cola','wine'].map(term => flavors.find(group=>group[0]===term)).concat(equivalents);
function queryForm(value) {
  for (const group of queryGroups) {
    const aliases = normalizedGroup(group).sort((a,b)=>b.length-a.length)
      .map(alias=>alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    value=value.replace(new RegExp('(?<![\\p{L}\\p{N}_])('+aliases.join('|')+')(?![\\p{L}\\p{N}_])','gu'),group[0]);
  }
  return value;
}
const groups = [...flavors,...equivalents].map(normalizedGroup);
const branches = groups.map(aliases => {
  const words = aliases.filter(alias => /^[\p{L}\p{N}_]+$/u.test(alias));
  const phrases = aliases.filter(alias => !words.includes(alias));
  // PostgreSQL caches only a bounded set of compiled regexes. Cheap literal
  // anchors prevent every source field from compiling the entire phrase list.
  const anchors = [...new Set(phrases.map(alias => alias.split(/[^\p{L}\p{N}_]+/u).filter(Boolean)[0]))];
  const conditions = [words.length ? 'words && array['+words.map(quote).join(',')+']::text[]' : '', phrases.length ? '(case when words && array['+anchors.map(quote).join(',')+']::text[] then original ~ '+quote(pattern(phrases))+' else false end)' : ''].filter(Boolean);
  // Include canonical query forms for compounds too (e.g. cacao nibs), while
  // only the literal source aliases above can activate this branch.
  const output = [...new Set([...aliases,...aliases.map(queryForm)])];
  return '  if '+conditions.join(' or ')+' then result:=result||'+quote(' '+output.join(' '))+'; end if;';
}).join('\n');
const queryBranches = queryGroups.map(group => '  result:=regexp_replace(result,'+quote(pattern(normalizedGroup(group)))+','+quote('\\1'+group[0])+",'g');").join('\n');
const tests = `-- Full bilingual dictionary parity, under guest permissions. No production fixtures required.
begin;
set local role anon;
do $tests$
declare aliases jsonb; canonical text; alias text; source text;
begin
  for aliases in select value from jsonb_array_elements(${quote(JSON.stringify([...flavors,...equivalents]))}::jsonb) loop
    canonical:=aliases->>0;
    for alias in select value from jsonb_array_elements_text(aliases) loop
      if not public.recipe_discovery_matches(public.recipe_discovery_search_text(canonical),alias)
        or not public.recipe_discovery_matches(public.recipe_discovery_search_text(alias),canonical)
        then raise exception 'Flavor alias differs: % / %',canonical,alias; end if;
      if public.recipe_discovery_matches(public.recipe_discovery_search_text(canonical),alias||' unknown_brand_fixture')
        then raise exception 'Unknown constraint dropped: %',alias; end if;
    end loop;
  end loop;
  for source,alias in select * from (values
    ('Chocolate coconut','كوكاكولا'),('Chocolate','cola'),('Winegum','واين'),
    ('Walnut coffee from India','جوز الهند'),('White wine','red wine'),
    ('White chocolate','dark chocolate'),('Cola','كوكاكولا فراولة'),('Cola', $literal$كوكاكولا %') OR true --$literal$)
  ) cases(source,alias) loop
    if public.recipe_discovery_matches(public.recipe_discovery_search_text(source),alias)
      then raise exception 'Unrelated source matched: % / %',source,alias; end if;
  end loop;
  if not public.recipe_discovery_matches(public.recipe_discovery_search_text('Cola wine'),'كوكاكولا واين')
    or not public.recipe_discovery_matches(public.recipe_discovery_search_text('Cola cola'),'كوكاكولا كوكوكولا')
    then raise exception 'Adjacent aliases were not normalized'; end if;
  if has_function_privilege('anon','private.refresh_recipe_search_documents(uuid[])','EXECUTE')
    or has_table_privilege('anon','public.recipe_search_documents','UPDATE')
    then raise exception 'Guest can mutate the derived index'; end if;
end $tests$;
rollback;
`;
const sql = `-- Generated by apps/mobile/scripts/prepare-flavor-search-sql.mjs.
-- Reviewed literal aliases only. Recipe facts and visibility policies are unchanged.
-- Bound the one-time atomic rebuild separately from ordinary API request limits.
set local statement_timeout='10min';
create or replace function public.recipe_discovery_flavor_aliases(p_value text)
returns text language plpgsql immutable parallel safe security invoker set search_path='' as $flavors$
declare original text:=public.recipe_discovery_normalize(p_value);
  words text[]:=regexp_split_to_array(original,'[^[:alnum:]_]+'); result text:='';
begin
${branches}
  return result;
end $flavors$;
revoke all on function public.recipe_discovery_flavor_aliases(text) from public;
grant execute on function public.recipe_discovery_flavor_aliases(text) to anon,authenticated,service_role;

create or replace function public.recipe_discovery_query_normalize(p_value text)
returns text language plpgsql immutable parallel safe security invoker set search_path='' as $query$
declare result text:=public.recipe_discovery_normalize(p_value);
begin
${queryBranches}
  return result;
end $query$;
revoke all on function public.recipe_discovery_query_normalize(text) from public;
grant execute on function public.recipe_discovery_query_normalize(text) to anon,authenticated,service_role;

-- Literal partial searches remain supported, but cola/wine require word boundaries:
-- chocolate contains the substring cola; winegum is a separate published note.
create or replace function public.recipe_discovery_token_matches(p_index text,p_token text)
returns boolean language sql immutable parallel safe security invoker set search_path='' as $token$
  select case when p_token in ('cola','wine') then
    coalesce(p_index,'') ~ ('(^|[^[:alnum:]_])'||p_token||'($|[^[:alnum:]_])')
    else strpos(coalesce(p_index,''),p_token)>0 end;
$token$;
revoke all on function public.recipe_discovery_token_matches(text,text) from public;
grant execute on function public.recipe_discovery_token_matches(text,text) to anon,authenticated,service_role;

create or replace function public.recipe_discovery_matches(p_index text,p_value text)
returns boolean language sql immutable security invoker set search_path='' as $matches$
  select not exists (
    select 1 from regexp_split_to_table(public.recipe_discovery_query_normalize(left(p_value,160)),'[[:space:],،;؛]+') term
    where term<>'' and not public.recipe_discovery_token_matches(p_index,term)
  );
$matches$;

do $patch$
declare definition text; patched text;
begin
  definition:=pg_get_functiondef('public.recipe_discovery_search_text(text)'::regprocedure);
  if position('recipe_discovery_multilingual_text(p_value)' in definition)=0
    or position('recipe_discovery_flavor_aliases' in definition)>0
    then raise exception 'Unexpected search index definition'; end if;
  -- Use the original source plus foreign canonical words, never recursively expand
  -- the already-enlarged index (which would confuse distinct compound notes).
  patched:=regexp_replace(definition,'return result;[[:space:]]*end',
    'return result||public.recipe_discovery_flavor_aliases(original); end');
  if patched=definition then raise exception 'Search index return anchor missing'; end if;
  execute patched;

  definition:=pg_get_functiondef('public.search_public_recipes_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure);
  patched:=replace(definition,'strpos(terms.search_text, query.term) = 0','not public.recipe_discovery_token_matches(terms.search_text, query.term)');
  if patched=definition then raise exception 'Exact search token anchor missing'; end if;
  execute patched;

  definition:=pg_get_functiondef('public.search_public_recipe_near_matches(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,integer,integer)'::regprocedure);
  patched:=replace(definition,'strpos(coalesce(case q.field','not public.recipe_discovery_token_matches(coalesce(case q.field');
  patched:=replace(patched,$anchor$end,''),token)=0)$anchor$,$replacement$end,''),token))$replacement$);
  if patched=definition or position('token)=0' in patched)>0
    then raise exception 'Near-match token anchor missing'; end if;
  execute patched;
end $patch$;

-- Fast, fixture-independent assertions before the atomic index rebuild.
${tests.slice(tests.indexOf('do $tests$'),tests.indexOf('rollback;'))}
-- Existing private maintenance helper: recompute only derived public search fields.
select private.refresh_recipe_search_documents(null::uuid[]);
`;
const destination = process.argv.find(arg=>arg.endsWith('_reviewed_flavor_search_aliases.sql'))
  ?? fs.readdirSync(path.join(repo,'supabase/migrations')).filter(name=>name.endsWith('_reviewed_flavor_search_aliases.sql')).sort().at(-1);
if(!destination) throw new Error('Create a migration with the Supabase CLI first.');
const migration = path.isAbsolute(destination) ? destination : destination.includes('/') ? path.resolve(repo,destination) : path.join(repo,'supabase/migrations',destination);
const regression = path.join(repo,'supabase/tests/reviewed_flavor_search.sql');
// The full-index migration above is immutable once deployed. A small follow-up
// canonicalizes every reviewed query alias so partial English matches cannot
// make Arabic/English result sets differ (e.g. tea inside "teaspoon").
const queryAliases = {};
for(const group of [...flavors,...equivalents]) for(const alias of normalizedGroup(group)) queryAliases[alias]=normalize(group[0]);
const queryPhrases = Object.keys(queryAliases).filter(alias=>!/^[\p{L}\p{N}_]+$/u.test(alias)).sort((a,b)=>b.length-a.length);
const tokenizer = '((?<![[:alnum:]_])(?:'+queryPhrases.map(escape).join('|')+')(?=$|[^[:alnum:]_])|[[:alnum:]_]+|[^[:alnum:]_])';
const querySql = `-- Generated by apps/mobile/scripts/prepare-flavor-search-sql.mjs.
-- Consume longest phrases once, preserving every unknown word and punctuation.
-- Source notes remain untouched; this operates only on retrieval queries.
create or replace function public.recipe_discovery_query_normalize(p_value text)
returns text language plpgsql immutable parallel safe security invoker set search_path='' as $query$
declare aliases constant jsonb:=${quote(JSON.stringify(queryAliases))}::jsonb;
begin
  return (select coalesce(string_agg(coalesce(aliases->>(part[1]),part[1]),'' order by ordinal),'')
    from regexp_matches(public.recipe_discovery_normalize(p_value),${quote(tokenizer)},'g') with ordinality as pieces(part,ordinal));
end $query$;
revoke all on function public.recipe_discovery_query_normalize(text) from public;
grant execute on function public.recipe_discovery_query_normalize(text) to anon,authenticated,service_role;

${tests.slice(tests.indexOf('do $tests$'),tests.indexOf('rollback;'))}
`;
const queryMigration = fs.readdirSync(path.join(repo,'supabase/migrations')).filter(name=>name.endsWith('_canonical_flavor_queries.sql')).sort().at(-1);
if(!queryMigration) throw new Error('Create canonical_flavor_queries with the Supabase CLI first.');
const refreshName = process.argv.find(arg=>arg.endsWith('_refresh_reviewed_flavor_aliases.sql'))
  ?? fs.readdirSync(path.join(repo,'supabase/migrations')).filter(name=>name.endsWith('_refresh_reviewed_flavor_aliases.sql')).sort().at(-1);
const refreshPath = refreshName && (path.isAbsolute(refreshName) ? refreshName : refreshName.includes('/') ? path.resolve(repo,refreshName) : path.join(repo,'supabase/migrations',refreshName));
// Subsequent vocabulary revisions replace only the pure helpers. The first
// migration's one-time function patches must never run again or be rewritten.
const refreshSql = sql.slice(0,sql.indexOf('create or replace function public.recipe_discovery_query_normalize'))
  + querySql + '\nselect private.refresh_recipe_search_documents(null::uuid[]);\n';
const outputs = refreshPath ? [[refreshPath,refreshSql],[regression,tests]]
  : [[migration,sql],[regression,tests],[path.join(repo,'supabase/migrations',queryMigration),querySql]];
if(refreshPath && !process.argv.includes('--check') && fs.statSync(refreshPath).size > 0)
  throw new Error('Create a new empty refresh_reviewed_flavor_aliases migration; existing migrations are immutable.');
for(const [file,content] of outputs) {
  if(process.argv.includes('--check')) {
    if(fs.readFileSync(file,'utf8')!==content) throw new Error('Reviewed flavor SQL drift: '+file);
  } else fs.writeFileSync(file,content);
}
console.log(`${flavors.length} flavor groups share client/server aliases; SQL ${process.argv.includes('--check')?'verified':'generated'}.`);
