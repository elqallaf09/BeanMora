-- Exercise the real catalog/RPC/index path that client-only dictionary tests miss.
-- Read-only under guest RLS; compare recipe IDs, not only result counts.
begin;
set local role anon;
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
rollback;
