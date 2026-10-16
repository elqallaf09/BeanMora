-- The client knew these aliases, but the deployed recipe index omitted them.
-- Expand the existing literal source index so already-installed clients benefit.
-- Recipe facts, query constraints, serving/method filters and ACLs stay intact.
do $migration$
declare definition text; patched text;
begin
  definition:=pg_get_functiondef('public.recipe_discovery_search_text(text)'::regprocedure);
  if position('recipe_discovery_multilingual_text(p_value)' in definition)=0
    or position('result text:=original;' in definition)=0
    or position('coconut جوز الهند جوزالهند كوكونت كوكونوت كوكونات كوكونن' in definition)>0
    then raise exception 'Unexpected coconut search definition; review before applying'; end if;
  patched:=regexp_replace(definition,'return result;[[:space:]]*end',
    $aliases$if words && array['coconut','جوزالهند','كوكونت','كوكونوت','كوكونات','كوكونن']::text[]
      or original ~ '(^|[^[:alnum:]_])جوز[[:space:]]+الهند($|[^[:alnum:]_])'
    then result:=result||' coconut جوز الهند جوزالهند كوكونت كوكونوت كوكونات كوكونن'; end if;
 return result; end$aliases$);
  if patched=definition then raise exception 'Coconut search return anchor missing'; end if;
  execute patched;
end $migration$;

-- Normalize the complete phrase before AND tokenization: walnut + India are
-- unrelated facts, not a coconut match. Keep original source normalization.
create or replace function public.recipe_discovery_query_normalize(p_value text)
returns text language sql immutable parallel safe security invoker set search_path='' as $query$
  select regexp_replace(public.recipe_discovery_normalize(p_value),
    '(^|[^[:alnum:]_])(جوز[[:space:]]+الهند|جوزالهند|كوكونت|كوكونوت|كوكونات|كوكونن)($|[^[:alnum:]_])',
    '\1coconut\3', 'g');
$query$;
revoke all on function public.recipe_discovery_query_normalize(text) from public;
grant execute on function public.recipe_discovery_query_normalize(text) to anon,authenticated,service_role;

do $queries$
declare target regprocedure; definition text; patched text;
begin
  foreach target in array array[
    'public.recipe_discovery_matches(text,text)'::regprocedure,
    'public.search_public_recipes_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure,
    'public.search_public_recipe_near_matches(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,integer,integer)'::regprocedure
  ] loop
    definition:=pg_get_functiondef(target);
    patched:=regexp_replace(definition,
      'public.recipe_discovery_normalize\((left\(p_(query|value),[[:space:]]*160\)|value)\)',
      'public.recipe_discovery_query_normalize(\1)','g');
    if patched=definition then raise exception 'Query normalization anchor missing: %',target; end if;
    execute patched;
  end loop;
end $queries$;

-- Recompute only derived public search fields using the existing private helper.
select private.refresh_recipe_search_documents(null::uuid[]);

-- Abort the atomic migration if the real catalog does not preserve alias parity.
do $tests$
declare alias text; style text; method text; english_ids uuid[]; alias_ids uuid[];
begin
  foreach alias in array array['جوز الهند','جوزالهند','كوكونت','كوكونوت','كوكونات','كوكونن'] loop
    if not public.recipe_discovery_matches(public.recipe_discovery_search_text('Coconut beans'),alias)
      or not public.recipe_discovery_matches(public.recipe_discovery_search_text(alias),'coconut')
      then raise exception 'Coconut index alias missing: %',alias; end if;
    if public.recipe_discovery_matches(public.recipe_discovery_search_text('Chocolate beans'),alias)
      or public.recipe_discovery_matches(public.recipe_discovery_search_text('Walnut coffee from India'),alias)
      then raise exception 'Unrelated flavor matched coconut: %',alias; end if;
    foreach method in array array[null,'xbloom']::text[] loop
      foreach style in array array[null,'cold_or_iced','hot']::text[] loop
        select array_agg(id order by id) into english_ids from public.search_public_recipes_v2(p_query=>'coconut',p_method=>method,p_serving_style=>style);
        select array_agg(id order by id) into alias_ids from public.search_public_recipes_v2(p_query=>alias,p_method=>method,p_serving_style=>style);
        if english_ids is distinct from alias_ids then raise exception 'Coconut recipe IDs differ: %, %, %',alias,method,style; end if;
        if method='xbloom' and style='cold_or_iced' and coalesce(cardinality(english_ids),0)=0
          then raise exception 'Reported coconut xBloom recipes disappeared'; end if;
      end loop;
    end loop;
    select array_agg(id order by id) into english_ids from public.search_public_recipes_v2(p_flavor_note=>'coconut');
    select array_agg(id order by id) into alias_ids from public.search_public_recipes_v2(p_flavor_note=>alias);
    if english_ids is distinct from alias_ids then raise exception 'Coconut flavor filter differs: %',alias; end if;
    select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'coconut');
    select array_agg(id order by id) into alias_ids from public.search_public_recipes(p_query=>alias);
    if english_ids is distinct from alias_ids then raise exception 'Universal coconut search differs: %',alias; end if;
    if exists(select 1 from public.search_public_recipes_v2(p_query=>alias||' unknown_brand_fixture'))
      then raise exception 'Additional literal constraint dropped: %',alias; end if;
  end loop;
  if exists(select 1 from public.search_public_recipes_v2(p_query=>'coconut') where visibility<>'public')
    or has_function_privilege('anon','private.refresh_recipe_search_documents(uuid[])','EXECUTE')
    or has_table_privilege('anon','public.recipe_search_documents','UPDATE')
    then raise exception 'Search or maintenance escaped guest permissions'; end if;
end $tests$;
