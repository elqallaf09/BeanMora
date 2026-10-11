-- Public-catalog, read-only regressions using the anonymous caller's RLS.
begin;
set local role anon;
do $$
declare arabic_ids uuid[]; english_ids uuid[]; source_id uuid; scoped_id uuid; row record; previous integer:=999; seen uuid[]:='{}';
begin
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace
  and proname in ('search_public_recipe_near_matches','recipe_discovery_matches','recipe_discovery_family_matches') and prosecdef)
 then raise exception 'Search helpers must honor invoker RLS'; end if;
 select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_query=>'كولومبيا');
 select array_agg(id order by id) into english_ids from public.search_public_recipes(p_query=>'Colombia');
 if arabic_ids is distinct from english_ids or coalesce(cardinality(arabic_ids),0)=0 then raise exception 'Colombia bilingual search lost results'; end if;
 select array_agg(id order by id) into arabic_ids from public.search_public_recipes(p_flavor_note=>'كرز، شوكولاتة');
 select array_agg(id order by id) into english_ids from public.search_public_recipes(p_flavor_note=>'Chocolate; cherry');
 if arabic_ids is distinct from english_ids or coalesce(cardinality(arabic_ids),0)=0 then raise exception 'Notes must combine independently of language, separators or order'; end if;
 if public.recipe_discovery_matches('cherry chocolate','cherry missing_note_81f3') then raise exception 'Exact notes must all match'; end if;
 if public.recipe_discovery_matches('anything','%') or public.recipe_discovery_matches('anything','_' ) then raise exception 'Wildcards must stay literal'; end if;
 if exists(select 1 from public.search_public_recipes(p_coffee_origin=>'كولومبيا',p_flavor_note=>'كرز، شوكولاتة',p_roaster_name=>'missing_roaster_81f3')) then raise exception 'Exact criteria were relaxed'; end if;
 for row in select * from public.search_public_recipe_near_matches(p_coffee_origin=>'كولومبيا',p_flavor_note=>'كرز، شوكولاتة',p_roaster_name=>'missing_roaster_81f3',p_method=>'xbloom',p_model=>'Studio',p_source=>'official',p_limit=>6) loop
  if row.match_count=0 or row.match_count>=row.criteria_count or row.match_count>previous then raise exception 'Invalid explained partial ranking'; end if;
  previous:=row.match_count; seen:=array_append(seen,row.recipe_id);
  if not row.missing @> '[{"field":"roasterName","value":"missing_roaster_81f3"}]'::jsonb then raise exception 'Unmatched roaster was mislabeled'; end if;
  if jsonb_array_length(row.matched)<>row.match_count or jsonb_array_length(row.missing)+row.match_count<>row.criteria_count then raise exception 'Incomplete match explanation'; end if;
  if not exists(select 1 from public.recipes r where r.id=row.recipe_id and r.visibility='public' and r.brew_method='xbloom'
   and r.source_brew_parameters->>'model'='Studio' and r.recipe_type in ('official_manufacturer','official_roaster','verified_barista')) then raise exception 'Partial results escaped fixed choices or RLS'; end if;
 end loop;
 if cardinality(seen)=0 then raise exception 'Expected real nearby recipes'; end if;
 if exists(select 1 from public.search_public_recipe_near_matches(p_query=>'missing_recipe_81f3',p_roaster_name=>'missing_roaster_81f3')) then raise exception 'Zero-evidence result was invented'; end if;
 if exists(select 1 from public.search_public_recipe_near_matches(p_query=>'%''),visibility.eq.private',p_coffee_origin=>'missing_origin_81f3')) then raise exception 'Input became an expression'; end if;
 select bean_id into scoped_id from public.recipes where visibility='public' and bean_id is not null order by id limit 1;
 if scoped_id is not null and exists(select 1 from public.search_public_recipe_near_matches(p_bean_id=>scoped_id,p_query=>'coffee missing_recipe_81f3') n
  where not exists(select 1 from public.recipes_for_coffee(p_bean_id=>scoped_id) r where r.id=n.recipe_id)) then raise exception 'Partial results escaped the exact coffee'; end if;
 if exists(select 1 from public.search_public_recipe_near_matches(p_bean_id=>'00000000-0000-0000-0000-000000000000',p_coffee_origin=>'كولومبيا',p_roaster_name=>'missing_roaster_81f3')) then raise exception 'Unknown coffee widened globally'; end if;
 begin
  perform public.search_public_recipe_near_matches(p_bean_id=>'00000000-0000-0000-0000-000000000000',p_product_id=>'00000000-0000-0000-0000-000000000001');
  raise exception 'Ambiguous coffee scope accepted';
 exception when invalid_parameter_value then null; end;
end $$;
rollback;
