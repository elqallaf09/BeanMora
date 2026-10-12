-- Additive RPC: keep installed clients working while filtering before the top-six limit.
create or replace function public.recipes_for_coffee_label_v2(
 p_origin text default null,p_variety text default null,p_process text default null,p_roast text default null,
 p_notes text default null,p_method text default 'xbloom',p_model text default null,
 p_bean_id uuid default null,p_product_id uuid default null,p_limit integer default 6,p_serving text default null)
returns table(recipe_id uuid,match_kind text,score integer,matching_notes text[],matching_families text[],
 same_origin boolean,same_process boolean,same_roast boolean,same_variety boolean,device_model text)
language sql stable security invoker set search_path='' set statement_timeout='5s'
as $matches$
 with wanted as materialized (
  select public.coffee_label_fact_keys(p_origin,'origin') as origins,
   public.coffee_label_fact_keys(p_variety,'variety') as varieties,
   public.coffee_label_fact_keys(p_process,'process') as processes,
   public.coffee_label_fact_keys(p_roast,'roast') as roasts,
   coalesce((select array_agg(distinct n.note) from public.coffee_similarity_terms(left(p_notes,1000)) n),'{}'::text[]) as notes,
   coalesce((select array_agg(distinct n.family) from public.coffee_similarity_terms(left(p_notes,1000)) n where n.family<>'other'),'{}'::text[]) as families
 ), exact_ids as materialized (
  select r.id from public.recipes_for_coffee(p_bean_id,p_product_id) r
  where r.visibility='public' and r.brew_method=p_method
 ), candidates as materialized (
  select r.id,r.title,r.source_coffee_name,r.updated_at,e.id is not null as exact,
   d.label_origins as origin_keys,d.label_varieties as variety_keys,d.label_processes as process_keys,
   d.label_roasts as roast_keys,d.label_notes as note_keys,d.label_families as family_keys,
   coalesce(nullif(r.source_origin_country,''),nullif(b.origin_country,''),nullif(l.origin_country,''),r.source_brew_parameters->'discovery'->>'coffee_origin') as origin,
   coalesce(nullif(r.source_varietal,''),nullif(b.varietal,''),nullif(l.varietal,''),r.source_brew_parameters->'discovery'->>'coffee_type') as variety,
   coalesce(nullif(b.process,''),nullif(l.process,''),r.source_brew_parameters->'discovery'->>'coffee_process',r.source_brew_parameters->'discovery'->>'process') as process,
   coalesce(nullif(p.roast_level,''),nullif(b.roast_level,''),r.source_brew_parameters->'discovery'->>'roast_level') as roast,
   case lower(coalesce(nullif(r.source_brew_parameters->>'model',''),xp.device_model))
    when 'studio' then 'Studio' when 'xbloom_studio' then 'Studio'
    when 'original' then 'Original' when 'xbloom_original' then 'Original' end as model,
   coalesce(d.flavor_note,concat_ws(' ',array_to_string(r.flavor_notes,' '),r.source_tasting_notes)) as notes,
   coalesce(d.serving_style,r.serving_style) as serving,
   coalesce(r.dose_grams,xp.dose_grams,case when r.source_brew_parameters->>'dose' ~ '^[0-9]+(\.[0-9]+)?$' then (r.source_brew_parameters->>'dose')::numeric end)>0
   and coalesce(r.water_grams,xp.water_grams,case when r.source_brew_parameters->>'water_ml' ~ '^[0-9]+(\.[0-9]+)?$' then (r.source_brew_parameters->>'water_ml')::numeric end)>0
   and (p_method<>'xbloom' or nullif(coalesce(nullif(r.grinder_setting,''),nullif(xp.grind_setting,''),r.source_brew_parameters->>'grind_size'),'') is not null)
   and coalesce(r.source_brew_parameters->>'pour_sum_matches_stated_water','true')<>'false' as usable
  from public.recipes r
  left join exact_ids e on e.id=r.id
  left join public.recipe_search_documents d on d.recipe_id=r.id
  left join public.roasted_products p on p.id=r.roasted_product_id and not p.requires_review
  left join public.beans b on b.id=coalesce(r.bean_id,p.legacy_bean_id) and b.is_published and not b.requires_review
  left join public.coffee_lots l on l.id=p.coffee_lot_id and not l.requires_review
  left join lateral (select x.device_model,x.dose_grams,x.water_grams,x.grind_setting from public.xbloom_recipe_profiles x
   where x.recipe_id=r.id and x.compatibility_status='compatible' and (p_model is null or p_model='all' or x.device_model=p_model)
   order by x.device_model limit 1) xp on true
  where r.visibility='public' and r.brew_method=p_method
 ), facts as materialized (
  select c.*,
   c.origin_keys && w.origins as origin_match,
   c.variety_keys && w.varieties as variety_match,
   c.process_keys && w.processes as process_match,
   c.roast_keys && w.roasts as roast_match,
   coalesce((select array_agg(n.note order by n.note) from unnest(c.note_keys) n(note) where n.note=any(w.notes)),'{}'::text[]) as note_matches,
   coalesce((select array_agg(distinct n.family order by n.family) from unnest(c.family_keys) n(family) where n.family=any(w.families) and n.family<>'other'),'{}'::text[]) as family_matches
  from candidates c cross join wanted w
  where (p_method<>'xbloom' or p_model is null or p_model='all' or c.model=p_model)
   and (p_method<>'xbloom' or p_model is null or p_model in ('all','Studio','Original'))
   and (p_serving is null or p_serving='' or c.serving=p_serving
    or (p_serving='cold_or_iced' and c.serving in ('cold','iced')))
 ), ranked as (
  select f.*,least(5,cardinality(f.note_matches))*12+least(3,cardinality(f.family_matches))*5
   +case when f.origin_match then 22 else 0 end+case when f.variety_match then 10 else 0 end
   +case when f.process_match then 12 else 0 end+case when f.roast_match then 8 else 0 end as similarity_score
  from facts f where f.exact or (f.usable and (f.origin_match or f.variety_match or cardinality(f.note_matches)>0 or cardinality(f.family_matches)>0))
 ), selected as (
  select * from ranked r where r.exact or not exists(select 1 from facts f where f.exact)
 ), distinct_sources as (
  select distinct on (public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,''),coalesce(s.serving,'')) s.*
  from selected s order by public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,''),coalesce(s.serving,''),s.exact desc,s.similarity_score desc,s.updated_at desc,s.id
 )
 select s.id,case when s.exact then 'exact' else 'similar' end,s.similarity_score,s.note_matches,s.family_matches,
  s.origin_match,s.process_match,s.roast_match,s.variety_match,s.model
 from distinct_sources s order by s.exact desc,s.similarity_score desc,
  s.updated_at desc,s.id
 limit greatest(1,least(coalesce(p_limit,6),6));
$matches$;

revoke all on function public.recipes_for_coffee_label_v2(text,text,text,text,text,text,text,uuid,uuid,integer,text) from public;
grant execute on function public.recipes_for_coffee_label_v2(text,text,text,text,text,text,text,uuid,uuid,integer,text) to anon,authenticated;
comment on function public.recipes_for_coffee_label_v2(text,text,text,text,text,text,text,uuid,uuid,integer,text) is 'Serving is applied before ranking and limiting. Cold includes cold/iced when requested. Published public recipes only; weights are not confidence percentages. v1 remains compatible with installed clients.';
