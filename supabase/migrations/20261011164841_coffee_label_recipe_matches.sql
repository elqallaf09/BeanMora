-- Canonical literal facts for explainable bag-to-recipe retrieval.
create or replace function public.coffee_label_fact_keys(p_text text,p_kind text)
returns text[] language sql immutable parallel safe security invoker set search_path=''
as $keys$
 with words as (select ' '||regexp_replace(public.recipe_discovery_normalize(left(p_text,1000)),'[^[:alnum:]]+',' ','g')||' ' as text)
 select coalesce(array_agg(distinct v.key),'{}'::text[]) from words cross join (values
 ('origin','brazil',array['brazil','brasil','brazilian','البرازيل','برازيل','برازيلي']::text[]),
 ('origin','colombia',array['colombia','colombian','كولومبيا','كولومبي']::text[]),
 ('origin','ethiopia',array['ethiopia','ethiopian','اثيوبيا','اثيوبي']::text[]),
 ('origin','indonesia',array['indonesia','indonesian','اندونيسيا']::text[]),
 ('origin','kenya',array['kenya','kenyan','كينيا']::text[]),
 ('origin','yemen',array['yemen','yemeni','اليمن','يمن']::text[]),
 ('origin','panama',array['panama','بنما']::text[]),
 ('origin','guatemala',array['guatemala','غواتيمالا']::text[]),
 ('origin','peru',array['peru','بيرو']::text[]),
 ('origin','rwanda',array['rwanda','رواندا']::text[]),
 ('origin','uganda',array['uganda','اوغندا']::text[]),
 ('origin','india',array['india','الهند']::text[]),
 ('origin','mexico',array['mexico','المكسيك','مكسيك']::text[]),
 ('origin','ecuador',array['ecuador','الاكوادور','اكوادور']::text[]),
 ('origin','bolivia',array['bolivia','بوليفيا']::text[]),
 ('origin','honduras',array['honduras','هندوراس']::text[]),
 ('origin','nicaragua',array['nicaragua','نيكاراغوا']::text[]),
 ('origin','burundi',array['burundi','بوروندي']::text[]),
 ('origin','costa rica',array['costa rica','كوستاريكا','كوستا ريكا']::text[]),
 ('origin','el salvador',array['el salvador','salvador','السلفادور','سلفادور']::text[]),
 ('origin','china',array['china','الصين']::text[]),
 ('origin','thailand',array['thailand','تايلند','تايلاند']::text[]),
 ('variety','castillo',array['castillo','كاستيلو','كاستيو','كاستييو']::text[]),
 ('variety','caturra',array['caturra','كاتورا']::text[]),
 ('variety','catuai',array['catuai','كاتواي','كاتوي']::text[]),
 ('variety','bourbon',array['bourbon','بوربون']::text[]),
 ('variety','typica',array['typica','تيبيكا']::text[]),
 ('variety','gesha',array['gesha','geisha','غيشا','جيشا','قيشا','قيشه']::text[]),
 ('variety','pacamara',array['pacamara','باكامارا','باكمارا']::text[]),
 ('variety','sidra',array['sidra','سيدرا']::text[]),
 ('variety','wush wush',array['wush wush','wushwush','وش وش','ووش ووش']::text[]),
 ('variety','heirloom',array['heirloom','هيرلوم','سلالات محليه']::text[]),
 ('variety','sl28',array['sl28','sl 28','اس ال 28']::text[]),
 ('variety','sl34',array['sl34','sl 34','اس ال 34']::text[]),
 ('variety','maracaturra',array['maracaturra','ماراكاتورا']::text[]),
 ('variety','java',array['java','جاوا']::text[]),
 ('variety','catimor',array['catimor','كاتيمور']::text[]),
 ('variety','sarchimor',array['sarchimor','سارتشيمور']::text[]),
 ('process','washed',array['washed','fully washed','مغسول','مغسوله']::text[]),
 ('process','natural',array['natural','dry processed','طبيعي','مجفف']::text[]),
 ('process','honey',array['honey','honey processed','عسليه','عسلي']::text[]),
 ('process','anaerobic',array['anaerobic','لاهوايي','لاهواييه']::text[]),
 ('process','wet hulled',array['wet hulled','giling basah','تقشير رطب']::text[]),
 ('roast','light',array['light','light roast','فاتح','فاتحه']::text[]),
 ('roast','medium',array['medium','medium roast','متوسط','متوسطه']::text[]),
 ('roast','dark',array['dark','dark roast','داكن','غامق','داكنه']::text[])
 ) v(kind,key,aliases)
 where v.kind=p_kind and exists(select 1 from unnest(v.aliases) a(term) where strpos(words.text,' '||a.term||' ')>0);
$keys$;
revoke all on function public.coffee_label_fact_keys(text,text) from public;
grant execute on function public.coffee_label_fact_keys(text,text) to anon,authenticated;

create or replace function public.recipes_for_coffee_label(
 p_origin text default null,p_variety text default null,p_process text default null,p_roast text default null,
 p_notes text default null,p_method text default 'xbloom',p_model text default null,
 p_bean_id uuid default null,p_product_id uuid default null,p_limit integer default 3)
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
   public.coffee_label_fact_keys(c.origin,'origin') && w.origins as origin_match,
   public.coffee_label_fact_keys(c.variety,'variety') && w.varieties as variety_match,
   public.coffee_label_fact_keys(c.process,'process') && w.processes as process_match,
   public.coffee_label_fact_keys(c.roast,'roast') && w.roasts as roast_match,
   coalesce((select array_agg(n.note order by n.note) from public.coffee_similarity_terms(c.notes) n where n.note=any(w.notes)),'{}'::text[]) as note_matches,
   coalesce((select array_agg(distinct n.family order by n.family) from public.coffee_similarity_terms(c.notes) n where n.family=any(w.families) and n.family<>'other'),'{}'::text[]) as family_matches
  from candidates c cross join wanted w
  where (p_method<>'xbloom' or p_model is null or p_model='all' or c.model=p_model)
   and (p_method<>'xbloom' or p_model is null or p_model in ('all','Studio','Original'))
 ), ranked as (
  select f.*,least(5,cardinality(f.note_matches))*12+least(3,cardinality(f.family_matches))*5
   +case when f.origin_match then 22 else 0 end+case when f.variety_match then 10 else 0 end
   +case when f.process_match then 12 else 0 end+case when f.roast_match then 8 else 0 end as similarity_score
  from facts f where f.exact or (f.usable and (f.origin_match or f.variety_match or cardinality(f.note_matches)>0 or cardinality(f.family_matches)>0))
 ), selected as (
  select * from ranked r where r.exact or not exists(select 1 from facts f where f.exact)
 ), distinct_sources as (
  select distinct on (public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,'')) s.*
  from selected s order by public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,''),s.exact desc,s.similarity_score desc,s.updated_at desc,s.id
 )
 select s.id,case when s.exact then 'exact' else 'similar' end,s.similarity_score,s.note_matches,s.family_matches,
  s.origin_match,s.process_match,s.roast_match,s.variety_match,s.model
 from distinct_sources s order by s.exact desc,s.similarity_score desc,
  case when s.serving='hot' then 0 when s.serving is null then 1 else 2 end,s.updated_at desc,s.id
 limit greatest(1,least(coalesce(p_limit,3),6));
$matches$;
revoke all on function public.recipes_for_coffee_label(text,text,text,text,text,text,text,uuid,uuid,integer) from public;
grant execute on function public.recipes_for_coffee_label(text,text,text,text,text,text,text,uuid,uuid,integer) to anon,authenticated;
comment on function public.recipes_for_coffee_label(text,text,text,text,text,text,text,uuid,uuid,integer) is
 'Free explainable recipe retrieval from user-confirmed bag text. Public source recipes retain original parameters; scores are ranking weights, never probabilities.';
