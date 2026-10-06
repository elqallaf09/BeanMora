-- Read-only full-catalog regression under the anonymous caller's RLS.
begin;
set local role anon;
do $$
declare expected bigint; actual bigint; target uuid; original_ids uuid[]; arabic_ids uuid[]; english_ids uuid[];
begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('search_public_recipes','search_public_recipes_v2','recipe_discovery_search_text') and p.prosecdef)
    then raise exception 'Discovery must honor caller RLS'; end if;
  select count(*) into expected from public.recipes where visibility='public' and serving_style in ('cold','iced');
  select count(*) into actual from public.search_public_recipes(p_serving_style=>'cold_or_iced');
  if actual<>expected then raise exception 'Combined serving category lost or added recipes'; end if;
  select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_query=>'بارد',p_serving_style=>'cold_or_iced');
  select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'مثلّج',p_serving_style=>'cold_or_iced');
  if arabic_ids is distinct from english_ids or cardinality(arabic_ids)<>expected then raise exception 'Cold and iced words must discover the same category'; end if;
  select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_query=>'فراولة');
  select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'strawberry');
  if arabic_ids is distinct from english_ids or coalesce(cardinality(arabic_ids),0)=0 then raise exception 'Arabic strawberry synonyms lost results'; end if;
  select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_flavor_note=>'فراوله');
  select array_agg(id order by id) into english_ids from public.search_public_recipes(p_flavor_note=>'strawberry');
  if arabic_ids is distinct from english_ids or coalesce(cardinality(arabic_ids),0)=0 then raise exception 'Flavor-only synonyms lost results'; end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'فراولة impossible_fixture_6bd71')) then raise exception 'Search words must all match'; end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'%'') OR true --'))
    or exists(select 1 from public.search_public_recipes(p_serving_style=>'cold_or_iced),visibility.eq.private'))
    then raise exception 'Input must remain literal'; end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'فراولة') where visibility<>'public') then raise exception 'Private recipe leaked'; end if;
  for target in select id from public.beans where is_published=true and requires_review=false order by id limit 8 loop
    select array_agg(id order by id) into original_ids from public.recipes_for_coffee(p_bean_id=>target);
    select array_agg(id order by id) into arabic_ids from public.search_public_recipes_v2(p_bean_id=>target);
    if original_ids is distinct from arabic_ids then raise exception 'Exact coffee scope lost or added recipes'; end if;
    if exists(select 1 from public.search_public_recipes_v2(p_bean_id=>target,p_serving_style=>'cold_or_iced') r
      where not (r.id=any(coalesce(original_ids,'{}'::uuid[])))) then raise exception 'Serving selection escaped coffee scope'; end if;
  end loop;
  if exists(select 1 from public.search_public_recipes_v2(p_bean_id=>'00000000-0000-0000-0000-000000000000'))
    then raise exception 'Unknown coffee must return empty, never global recipes'; end if;
  begin
    perform public.search_public_recipes_v2(p_bean_id=>'00000000-0000-0000-0000-000000000000',p_product_id=>'00000000-0000-0000-0000-000000000001');
    raise exception 'Ambiguous coffee scope accepted';
  exception when invalid_parameter_value then null; end;
end $$;
rollback;
