begin;
set local role anon;
do $$
declare arabic_ids uuid[]; english_ids uuid[];
begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('recipes_for_coffee_label','coffee_label_fact_keys') and p.prosecdef)
    then raise exception 'Label retrieval must honor caller RLS'; end if;
  select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_query=>'كاستيلو');
  select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'Castillo');
  if arabic_ids is distinct from english_ids or cardinality(arabic_ids)=0 then raise exception 'Arabic Castillo search lost results'; end if;
  select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_query=>'برازيل');
  select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'Brazil');
  if arabic_ids is distinct from english_ids or cardinality(arabic_ids)=0 then raise exception 'Brazil spellings must agree'; end if;
  select array_agg(recipe_id order by recipe_id) into arabic_ids from public.recipes_for_coffee_label(p_origin=>'برازيل',p_variety=>'كاستيلو',p_notes=>'شوكولاتة، كراميل',p_model=>'Studio');
  select array_agg(recipe_id order by recipe_id) into english_ids from public.recipes_for_coffee_label(p_origin=>'Brazil',p_variety=>'Castillo',p_notes=>'Chocolate, Caramel',p_model=>'Studio');
  if arabic_ids is distinct from english_ids or cardinality(arabic_ids)=0 then raise exception 'Bilingual label matching must agree'; end if;
  if exists(select 1 from public.recipes_for_coffee_label(p_origin=>'Brazil',p_notes=>'Chocolate',p_model=>'Studio') m
    join public.recipes r on r.id=m.recipe_id where r.visibility<>'public' or r.brew_method<>'xbloom' or m.device_model<>'Studio')
    then raise exception 'Label recommendation escaped public method/model scope'; end if;
  if exists(select 1 from public.recipes_for_coffee_label())
    or exists(select 1 from public.recipes_for_coffee_label(p_process=>'washed',p_roast=>'light'))
    or exists(select 1 from public.recipes_for_coffee_label(p_origin=>'unknown_fixture_moon',p_notes=>'%'' OR true --'))
    then raise exception 'Missing or arbitrary label text must not manufacture a recommendation'; end if;
  if exists(select 1 from public.recipes_for_coffee_label(p_notes=>'Chocolate',p_method=>'v60',p_model=>'Studio') m
    join public.recipes r on r.id=m.recipe_id where r.brew_method<>'v60') then raise exception 'Method scope mismatch'; end if;
  if exists(select 1 from public.recipes_for_coffee_label(p_origin=>'Brazil',p_model=>'invalid')) then raise exception 'Unknown model accepted'; end if;
end $$;
rollback;
