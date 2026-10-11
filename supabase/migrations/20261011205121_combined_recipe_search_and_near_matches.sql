-- Keep exact AND filters first. Near matches are a separate, explained result.
create or replace function public.recipe_discovery_matches(p_index text, p_value text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select not exists (
  select 1 from regexp_split_to_table(public.recipe_discovery_normalize(left(p_value,160)), '[[:space:],،;؛]+') term
  where term<>'' and strpos(coalesce(p_index,''),term)=0
 );
$$;
revoke all on function public.recipe_discovery_matches(text,text) from public;
grant execute on function public.recipe_discovery_matches(text,text) to anon,authenticated,service_role;

create or replace function public.recipe_discovery_family_matches(p_notes text,p_family text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select exists(select 1 from (values
  ('chocolate',array['chocolate','cocoa','cacao','شوكولاتة','شوكولاته','كاكاو']::text[]),
  ('nutty',array['nutty','nuts','hazelnut','almond','peanut','مكسرات','بندق','لوز','سوداني']::text[]),
  ('fruity',array['fruity','fruit','berry','berries','strawberry','blueberry','فواكه','فراولة','توت']::text[]),
  ('citrus',array['citrus','lemon','orange','grapefruit','حمضيات','ليمون','برتقال']::text[]),
  ('floral',array['floral','jasmine','rose','زهور','ياسمين','ورد']::text[]),
  ('caramel',array['caramel','toffee','كراميل','توفي']::text[]),
  ('spice',array['spice','spicy','cinnamon','cardamom','توابل','قرفة','هيل']::text[])
 ) f(name,aliases) cross join lateral unnest(f.aliases) a(value)
 where f.name=p_family and public.recipe_discovery_normalize(a.value)=any(regexp_split_to_array(coalesce(p_notes,''),'[^[:alnum:]]+')));
$$;
revoke all on function public.recipe_discovery_family_matches(text,text) from public;
grant execute on function public.recipe_discovery_family_matches(text,text) to anon,authenticated,service_role;

do $patch$
declare definition text; patched text; field text; parameter text;
begin
 definition:=pg_get_functiondef('public.recipe_discovery_search_text(text)'::regprocedure);
 patched:=regexp_replace(definition,'return result;[[:space:]]*end',
  $alias$if words && array['peanut','peanuts']::text[] or strpos(original,'فول سوداني')>0 or strpos(original,'الفول السوداني')>0 then result:=result||' peanut peanuts فول سوداني الفول السوداني'; end if;
 return result; end$alias$);
 if patched=definition then raise exception 'SEARCH_ALIAS_DEFINITION_DRIFT'; end if;
 execute patched;
 definition:=pg_get_functiondef('private.refresh_recipe_search_documents(uuid[])'::regprocedure);
 -- Apply the existing bilingual vocabulary independently inside each field.
 foreach field in array array['recipe_name','creator_name','creator_country','recipe_country','coffee_name','roaster_name','source_name'] loop
  definition:=regexp_replace(definition,'public.recipe_discovery_normalize\((concat_ws\([^\n]+) as '||field,
   'public.recipe_discovery_search_text(\1 as '||field);
 end loop;
 execute definition;
 definition:=pg_get_functiondef('public.search_public_recipes_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure);
 patched:=definition;
 foreach field in array array['recipe_name','creator_name','creator_country','recipe_country','coffee_name','coffee_type','coffee_origin','roaster_name','source_name','flavor_note'] loop
  parameter:=case field when 'flavor_note' then 'p_flavor_note' else 'p_'||field end;
  patched:=replace(patched,'strpos(terms.'||field||', public.recipe_discovery_normalize(left('||parameter||', 160))) > 0',
   'public.recipe_discovery_matches(terms.'||field||', '||parameter||')');
 end loop;
 patched:=replace(patched,'''[[:space:]]+''','''[[:space:],،;؛]+''');
 if patched=definition then raise exception 'SEARCH_FILTER_DEFINITION_DRIFT'; end if;
 execute patched;
 perform private.refresh_recipe_search_documents();
end $patch$;

create or replace function public.search_public_recipe_near_matches(
 p_query text default null,p_method text default null,p_source text default null,p_model text default null,
 p_flavor_note text default null,p_flavor_family text default null,p_creator_name text default null,
 p_creator_country text default null,p_recipe_country text default null,p_recipe_name text default null,
 p_serving_style text default null,p_coffee_type text default null,p_coffee_name text default null,
 p_coffee_origin text default null,p_roaster_name text default null,p_source_name text default null,
 p_bean_id uuid default null,p_product_id uuid default null,p_limit integer default 30,p_offset integer default 0
) returns table(recipe_id uuid,matched jsonb,missing jsonb,match_count integer,criteria_count integer,total_count bigint)
language plpgsql stable security invoker set search_path='' as $function$
declare coffee_ids uuid[];
begin
 if p_bean_id is not null and p_product_id is not null then
  raise exception 'Choose one exact coffee scope' using errcode='22023';
 end if;
 if p_bean_id is not null or p_product_id is not null then
  select coalesce(array_agg(s.id),'{}'::uuid[]) into coffee_ids from public.recipes_for_coffee(p_bean_id,p_product_id) s;
 end if;
 return query
 with criteria(field,value) as materialized (
  select f.field,btrim(left(f.value,160)) from (values
   ('flavorFamily',p_flavor_family),('creatorName',p_creator_name),('creatorCountry',p_creator_country),
   ('recipeCountry',p_recipe_country),('recipeName',p_recipe_name),('coffeeType',p_coffee_type),
   ('coffeeName',p_coffee_name),('coffeeOrigin',p_coffee_origin),('roasterName',p_roaster_name),('sourceName',p_source_name)
  ) f(field,value) where nullif(btrim(f.value),'') is not null
  union all select 'flavorNote',btrim(note) from regexp_split_to_table(left(p_flavor_note,160),'[,،;؛]+') note where btrim(note)<>''
  union all select 'query',term from regexp_split_to_table(public.recipe_discovery_normalize(left(p_query,160)),'[[:space:],،;؛]+') term where term<>''
 ), candidates as (
  select r.id,r.updated_at,d.* from public.recipes r join public.recipe_search_documents d on d.recipe_id=r.id
  where r.visibility='public' and (coffee_ids is null or r.id=any(coffee_ids))
   and (nullif(btrim(p_method),'') is null or r.brew_method=p_method)
   and (nullif(btrim(p_source),'') is null or p_source='all'
    or (p_source='official' and r.recipe_type in ('official_manufacturer','official_roaster','verified_barista'))
    or (p_source='community' and r.recipe_type='community'))
   and (p_method is distinct from 'xbloom' or nullif(btrim(p_model),'') is null or p_model='all' or r.source_brew_parameters->>'model'=p_model)
   and (nullif(btrim(p_serving_style),'') is null or
    coalesce(nullif(r.serving_style,'unknown'),r.source_brew_parameters->'discovery'->>'serving_style')
      =any(case when p_serving_style='cold_or_iced' then array['cold','iced'] else array[p_serving_style] end))
 ), scored as (
  select c.id,c.updated_at,x.matched,x.missing,x.matches,x.requested from candidates c
  cross join lateral (
   select coalesce(jsonb_agg(jsonb_build_object('field',f.field,'value',f.value) order by f.field,f.value) filter(where f.ok),'[]'::jsonb) as matched,
    coalesce(jsonb_agg(jsonb_build_object('field',f.field,'value',f.value) order by f.field,f.value) filter(where not f.ok),'[]'::jsonb) as missing,
    count(*) filter(where f.ok)::integer as matches,count(*)::integer as requested
   from (select q.field,q.value,case when q.field='flavorFamily' then public.recipe_discovery_family_matches(c.flavor_note,q.value)
    else public.recipe_discovery_matches(case q.field
     when 'query' then c.search_text when 'flavorNote' then c.flavor_note when 'creatorName' then c.creator_name
     when 'creatorCountry' then c.creator_country when 'recipeCountry' then c.recipe_country when 'recipeName' then c.recipe_name
     when 'coffeeType' then c.coffee_type when 'coffeeName' then c.coffee_name when 'coffeeOrigin' then c.coffee_origin
     when 'roasterName' then c.roaster_name when 'sourceName' then c.source_name end,q.value) end as ok from criteria q) f
  ) x where x.matches>0 and x.matches<x.requested
 ) select s.id,s.matched,s.missing,s.matches,s.requested,count(*) over() from scored s
 order by s.matches desc,s.updated_at desc,s.id
 limit greatest(1,least(coalesce(p_limit,30),30)) offset greatest(0,least(coalesce(p_offset,0),10000));
end $function$;
revoke all on function public.search_public_recipe_near_matches(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,integer,integer) from public;
grant execute on function public.search_public_recipe_near_matches(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,integer,integer) to anon,authenticated,service_role;
