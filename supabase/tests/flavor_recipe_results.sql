-- Read-only guest regression against the real derived catalog and public RPCs.
-- Compare recipe IDs, not counts; run after the reviewed flavor migration.
begin;
set local role anon;
do $tests$
declare canonical text; alias text; expected uuid[]; actual uuid[]; checked text[]:='{}';
begin
  for canonical,alias in select * from (values
    ('cola','كوكاكولا'),('cola','كوكوكولا'),('cola','coca cola'),('cola','cococola'),
    ('wine','واين'),('chocolate','ككاو'),('chocolate','شوكلاته'),('chocolate','جوكلت'),
    ('chocolate','cocoa'),('chocolate','cacao'),('coconut','جوز الهند'),('coconut','كوكونن'),
    ('tea','شاي'),('cashew','كاجو'),('sugar','سكر'),('cinnamon','دارسين'),('pear','كمثرى')
  ) aliases(canonical,alias) loop
    if public.recipe_discovery_query_normalize(canonical) is distinct from public.recipe_discovery_query_normalize(alias)
      then raise exception 'Query spellings differ: % / %',canonical,alias; end if;
    -- Once canonical queries are identical, each RPC receives identical tokens.
    -- Exercise the real catalog once per concept rather than repeat expensive
    -- nearby ranking for every spelling of that same concept.
    if canonical=any(checked) then continue; end if;
    checked:=array_append(checked,canonical);
    select array_agg(id order by id) into expected from public.search_public_recipes_v2(p_query=>canonical,p_method=>'xbloom',p_serving_style=>'cold_or_iced');
    select array_agg(id order by id) into actual from public.search_public_recipes_v2(p_query=>alias,p_method=>'xbloom',p_serving_style=>'cold_or_iced');
    if expected is distinct from actual then raise exception 'Cold xBloom IDs differ: % / %',canonical,alias; end if;

    select array_agg(id order by id) into expected from public.search_public_recipes(p_query=>canonical);
    select array_agg(id order by id) into actual from public.search_public_recipes(p_query=>alias);
    if expected is distinct from actual then raise exception 'Universal search IDs differ: % / %',canonical,alias; end if;

    select array_agg(id order by id) into expected from public.search_public_recipes_v2(p_flavor_note=>canonical,p_method=>'xbloom',p_serving_style=>'hot');
    select array_agg(id order by id) into actual from public.search_public_recipes_v2(p_flavor_note=>alias,p_method=>'xbloom',p_serving_style=>'hot');
    if expected is distinct from actual then raise exception 'Hot flavor-filter IDs differ: % / %',canonical,alias; end if;

    select array_agg(recipe_id order by recipe_id) into expected from public.search_public_recipe_near_matches(p_query=>canonical||' unknown_brand_fixture',p_method=>'xbloom',p_serving_style=>'cold_or_iced');
    select array_agg(recipe_id order by recipe_id) into actual from public.search_public_recipe_near_matches(p_query=>alias||' unknown_brand_fixture',p_method=>'xbloom',p_serving_style=>'cold_or_iced');
    if expected is distinct from actual then raise exception 'Explained near-match IDs differ: % / %',canonical,alias; end if;
    if exists(select 1 from public.search_public_recipes_v2(p_query=>alias||' unknown_brand_fixture'))
      then raise exception 'Literal unknown term lost: %',alias; end if;
  end loop;
  if exists(select 1 from public.search_public_recipes_v2(p_query=>'chocolate') where visibility<>'public')
    then raise exception 'Private recipe escaped guest RLS'; end if;
end $tests$;
rollback;
