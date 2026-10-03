-- Fill missing model photos; preserve confirmed existing assets and removal requests.
create or replace function private.publish_reviewed_catalog_batch(p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
<<catalog_import>>
declare
  item jsonb; recipe_id uuid; author_id uuid; slug_text text; params jsonb;
  primary_url text; share_url text; official boolean; lo numeric; hi numeric;
  count_recipes int:=0; count_media int:=0; changed int; link text; pour jsonb; n int;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Administrative catalog replay only' using errcode='42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>200 then raise exception 'Expected a reviewed batch of at most 200 rows'; end if;
  select id into author_id from public.profiles where username='beanmora_official';
  for item in select value from jsonb_array_elements(p_rows) loop
    if item->>'kind' in ('beans','equipment') then
      if item->>'image_url' !~ '^https://' or item->>'source_url' !~ '^https://' or item->>'association' <> 'source_product_page' then raise exception 'Expected an attributed, checked source product photo'; end if;
      if item->>'kind'='beans' then
        update public.beans set image_url=item->>'image_url',image_source_url=item->>'source_url',image_usage_status='source_linked'
          where name_en=item->>'name' and source_url=item->>'source_url' and requires_review=false and is_published=true
          and coalesce(image_usage_status,'rights_unknown') not in ('removal_requested','rights_confirmed');
      else
        update public.equipment_models set image_url=item->>'image_url',image_source_url=item->>'source_url',image_usage_status='source_linked',source_url=item->>'source_url'
          where name=item->>'name' and requires_review=false and coalesce(image_usage_status,'rights_unknown') <> 'removal_requested'
          and (coalesce(image_usage_status,'rights_unknown') <> 'rights_confirmed' or image_url is null);
      end if;
      get diagnostics changed=row_count; count_media:=count_media+changed; continue;
    end if;
    if author_id is null then raise exception 'Existing BeanMora catalog attribution profile required'; end if;
    primary_url:=item->>'url'; share_url:=item->>'share_url';
    if primary_url !~ '^https://collective\.xbloom\.com/recipe/[0-9]+$' and primary_url !~ '^https://share-h5\.xbloom\.com/\?id=.+$' then raise exception 'Not a reviewed public xBloom sharing URL'; end if;
    if length(coalesce(item->>'title','')) not between 1 and 300 or jsonb_typeof(item->'pours') <> 'array' or jsonb_array_length(item->'pours') not between 1 and 50 then raise exception 'Missing public recipe title or pours'; end if;
    slug_text:=coalesce(item->>'slug','xbloom-collective-'||(item->>'external_id'));
    if slug_text !~ '^xbloom-(collective|shared)-[a-zA-Z0-9-]+$' then raise exception 'Invalid reviewed source identity'; end if;
    official:=coalesce((item->>'official')::boolean,false);
    params:=jsonb_strip_nulls(jsonb_build_object('water_ml',item->'water_ml','dose',item->'dose','ratio',item->'ratio','grind_size',item->'grind_size','rpm',item->'rpm','model',item->'model','source_model_code',item->'source_model_code','cup_type',item->'cup_type','source_tier',case when official then 'official' else 'community' end,'poured_water_ml',item->'poured_water_ml','pour_sum_matches_stated_water',item->'pour_sum_matches_stated_water','pours',item->'pours'));
    select min((value->>'temperature')::numeric),max((value->>'temperature')::numeric) into lo,hi from jsonb_array_elements(item->'pours') where (value->>'temperature')::numeric between 0 and 100;
    -- Collective displays published temperatures in Celsius. Missing or invalid readings remain unknown.
    if exists(select 1 from jsonb_array_elements(item->'pours') where value->>'temperature' is null or (value->>'temperature')::numeric not between 0 and 100) then lo:=null;hi:=null;end if;
    select r.id into recipe_id from public.recipes r where r.user_id=author_id and (r.slug=slug_text or exists(select 1 from public.recipe_sources s where s.recipe_id=r.id and s.source_url in (primary_url,share_url))) order by (r.slug=slug_text) desc,r.created_at limit 1;
    if recipe_id is null then
      insert into public.recipes (slug,user_id,title,brew_method,visibility,recipe_type,content_language)
      values(slug_text,author_id,item->>'title','xbloom','public',case when official then 'official_manufacturer' else 'community' end,'en') returning id into recipe_id;
    end if;
    update public.recipes set title=item->>'title',dose_grams=(item->>'dose')::numeric,water_grams=null,water_temp_c=case when lo=hi then lo else null end,
      water_temp_c_min=lo,water_temp_c_max=hi,grinder_setting=item->>'grind_size',source_author_name=nullif(item->>'author',''),
      source_origin_country=(select string_agg(value,' · ') from jsonb_array_elements_text(coalesce(item->'origin','[]'))),
      source_process=(select string_agg(value,' · ') from jsonb_array_elements_text(coalesce(item->'process','[]'))),
      source_varietal=(select string_agg(value,' · ') from jsonb_array_elements_text(coalesce(item->'varietal','[]'))),
      source_tasting_notes=(select string_agg(value,' · ') from jsonb_array_elements_text(coalesce(item->'flavors','[]'))),
      flavor_notes=array(select value from jsonb_array_elements_text(coalesce(item->'flavors','[]'))),source_stated_ratio=(item->>'ratio')::numeric,
      source_brew_parameters=params,pour_sum_validated=coalesce((item->>'pour_sum_matches_stated_water')::boolean,false),is_incomplete_source=true,
      recipe_type=case when official then 'official_manufacturer' else 'community' end,
      cover_image_url=case when item->>'image_url' ~ '^https://' then item->>'image_url' else cover_image_url end,
      notes=coalesce(notes,'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.'),
      notes_ar=coalesce(notes_ar,'إعدادات التحضير من المصدر؛ الماء بالملليلتر. افتح الرابط الأصلي لتعليمات الجهاز. وقت التحضير الكلي غير منشور.')
      where id=recipe_id and user_id=author_id;
    foreach link in array array[primary_url,share_url,item->>'directory_url'] loop
      if link is null or link !~ '^https://' then continue;end if;
      update public.recipe_sources set last_verified_at=(item->>'checked_at')::timestamptz where recipe_sources.recipe_id=catalog_import.recipe_id and source_url=link;
      insert into public.recipe_sources(recipe_id,source_type,source_url,source_name,last_verified_at,data_confidence)
        select recipe_id,case when official then 'official_website' else 'user_submitted' end,link,coalesce(nullif(item->>'author',''),'xBloom Recipe Hub'),(item->>'checked_at')::timestamptz,case when official then 'official' else 'community_submitted' end
        where not exists(select 1 from public.recipe_sources s where s.recipe_id=catalog_import.recipe_id and s.source_url=link);
    end loop;
    if not exists(select 1 from public.recipe_equipment e where e.recipe_id=catalog_import.recipe_id and e.category='xbloom') then insert into public.recipe_equipment(recipe_id,category) values(recipe_id,'xbloom');end if;
    if not exists(select 1 from public.recipe_steps s where s.recipe_id=catalog_import.recipe_id) then
      n:=0; for pour in select value from jsonb_array_elements(item->'pours') loop
        n:=n+1; insert into public.recipe_steps(recipe_id,step_number,title,description) values(recipe_id,n,'Pour '||n,'Water: '||coalesce(pour->>'volume','unspecified')||' ml; source temperature: '||coalesce(pour->>'temperature','unspecified')||'; flow: '||coalesce(pour->>'flow_rate','unspecified')||' ml/s; pause: '||coalesce(pour->>'pause_seconds','unspecified')||' s. Check the original link for pouring pattern.');
      end loop;
    end if;
    count_recipes:=count_recipes+1; recipe_id:=null;
  end loop;
  return jsonb_build_object('recipes',count_recipes,'media',count_media);
end $$;
revoke all on function private.publish_reviewed_catalog_batch(jsonb) from public,anon,authenticated;
grant execute on function private.publish_reviewed_catalog_batch(jsonb) to service_role;
comment on function private.publish_reviewed_catalog_batch(jsonb) is 'Admin replay of reviewed source facts; never callable from the native client. Source photos remain at publishers; no compatibility or image license claim.';
