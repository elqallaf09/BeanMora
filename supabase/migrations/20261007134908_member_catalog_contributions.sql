-- Member submissions remain owned and reviewable; no trusted publication flags
-- or arbitrary owner IDs are accepted from clients. Both RPCs are invoker-only.
alter table public.beans add column if not exists roaster_website_url text;
alter table public.user_equipment add column if not exists archived_at timestamptz;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('member-media','member-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy "members upload their contribution images" on storage.objects for insert to authenticated
with check (bucket_id='member-media' and split_part(name,'/',1)=(select auth.uid())::text
  and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "members remove their contribution images" on storage.objects for delete to authenticated
using (bucket_id='member-media' and split_part(name,'/',1)=(select auth.uid())::text);
create policy "member images follow their linked parent" on storage.objects for select to anon,authenticated
using (bucket_id='member-media' and (
  split_part(name,'/',1)=(select auth.uid())::text or (select private.has_role('admin'))
  or exists(select 1 from public.recipes r where r.user_id::text=split_part(name,'/',1)
    and r.visibility='public' and r.cover_image_url='storage://member-media/'||name)
  or exists(select 1 from public.beans b where b.created_by::text=split_part(name,'/',1)
    and b.is_published and not b.requires_review and b.image_url='storage://member-media/'||name)
));

create or replace function private.member_submission_image(p_path text)
returns text language plpgsql stable security invoker set search_path='' as $$
begin
  if coalesce(p_path,'')='' then return null; end if;
  if p_path !~ ('^'||(select auth.uid())::text||'/[a-zA-Z0-9-]+\.(jpg|png|webp)$')
    or not exists(select 1 from storage.objects where bucket_id='member-media' and name=p_path) then
    raise exception 'INVALID_SUBMISSION_IMAGE' using errcode='22023';
  end if;
  return 'storage://member-media/'||p_path;
end $$;
revoke all on function private.member_submission_image(text) from public,anon;
grant execute on function private.member_submission_image(text) to authenticated;

create or replace function private.validate_member_submission(p jsonb)
returns void language plpgsql stable security invoker set search_path='' as $$
declare k text; v text;
begin
  if (select auth.uid()) is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then
    raise exception 'MEMBER_SIGN_IN_REQUIRED' using errcode='42501';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>30000 then
    raise exception 'INVALID_SUBMISSION' using errcode='22023';
  end if;
  if length(trim(coalesce(p->>'name',''))) not between 2 and 180
    or p->>'locale' not in ('ar','en') or p->>'locale' is null then
    raise exception 'INVALID_SUBMISSION_NAME' using errcode='22023';
  end if;
  if length(coalesce(p->>'description',''))>5000 then raise exception 'INVALID_DESCRIPTION' using errcode='22023'; end if;
  foreach k in array array['roaster_name','coffee_name','region','farm','variety','grind'] loop
    if length(coalesce(p->>k,''))>500 then raise exception 'INVALID_FIELD_LENGTH' using errcode='22023'; end if;
  end loop;
  foreach k in array array['source_url','roaster_url'] loop
    v:=nullif(trim(p->>k),'');
    if v is not null and (length(v)>2048 or v !~ '^https://[^/@?#[:space:]\\]+([/?#][^[:space:]\\]*)?$') then
      raise exception 'INVALID_SUBMISSION_LINK' using errcode='22023';
    end if;
  end loop;
end $$;
revoke all on function private.validate_member_submission(jsonb) from public,anon;
grant execute on function private.validate_member_submission(jsonb) to authenticated;

create or replace function public.submit_member_recipe(p_id uuid,p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=(select auth.uid()); image_ref text; step jsonb; pos int:=0; visibility_value text; method_value text;
begin
  perform private.validate_member_submission(p_payload);
  if exists(select 1 from public.recipes where id=p_id and user_id=owner_id) then return p_id; end if;
  visibility_value:=coalesce(p_payload->>'visibility','private');
  method_value:=p_payload->>'method';
  if visibility_value not in ('public','private','draft') or not exists(select 1 from public.brew_methods where code=method_value)
    or jsonb_typeof(p_payload->'steps') is distinct from 'array'
    or jsonb_array_length(p_payload->'steps') not between 1 and 30 then
    raise exception 'INVALID_RECIPE_DETAILS' using errcode='22023';
  end if;
  if nullif(p_payload->>'dose','') is null or (p_payload->>'dose')::numeric not between 0.01 and 100000
    or nullif(p_payload->>'water','') is null or (p_payload->>'water')::numeric not between 0.01 and 100000
    or (nullif(p_payload->>'seconds','') is not null and (p_payload->>'seconds')::int not between 1 and 86400) then
    raise exception 'INVALID_RECIPE_AMOUNTS' using errcode='22023';
  end if;
  image_ref:=private.member_submission_image(p_payload->>'image_path');
  insert into public.recipes(id,user_id,title,title_ar,brew_method,recipe_type,visibility,content_language,
    dose_grams,water_grams,water_temp_c,total_time_seconds,grinder_setting,notes,notes_ar,cover_image_url,cover_image_path,
    source_roaster_name,source_coffee_name,bean_id)
  values(p_id,owner_id,trim(p_payload->>'name'),case when p_payload->>'locale'='ar' then trim(p_payload->>'name') end,
    method_value,case when visibility_value='public' then 'community' else 'personal' end,visibility_value,p_payload->>'locale',
    nullif(p_payload->>'dose','')::numeric,nullif(p_payload->>'water','')::numeric,nullif(p_payload->>'temperature','')::numeric,
    nullif(p_payload->>'seconds','')::int,nullif(p_payload->>'grind',''),nullif(p_payload->>'description',''),
    case when p_payload->>'locale'='ar' then nullif(p_payload->>'description','') end,image_ref,nullif(p_payload->>'image_path',''),
    nullif(p_payload->>'roaster_name',''),nullif(p_payload->>'coffee_name',''),nullif(p_payload->>'bean_id','')::uuid);
  for step in select value from jsonb_array_elements(p_payload->'steps') loop
    pos:=pos+1;
    if jsonb_typeof(step) is distinct from 'string' or length(trim(step#>>'{}')) not between 2 and 2000 then
      raise exception 'INVALID_RECIPE_STEP' using errcode='22023';
    end if;
    insert into public.recipe_steps(recipe_id,step_number,title,title_ar,description,description_ar)
    values(p_id,pos,case when p_payload->>'locale'='ar' then 'الخطوة ' else 'Step ' end||pos,
      case when p_payload->>'locale'='ar' then 'الخطوة '||pos end,trim(step#>>'{}'),
      case when p_payload->>'locale'='ar' then trim(step#>>'{}') end);
  end loop;
  if nullif(p_payload->>'source_url','') is not null then
    insert into public.recipe_sources(recipe_id,source_type,source_url,source_name,data_confidence)
    values(p_id,'user_submitted',p_payload->>'source_url',coalesce(nullif(p_payload->>'roaster_name',''),'Member source'),'community_submitted');
  end if;
  return p_id;
end $$;
revoke all on function public.submit_member_recipe(uuid,jsonb) from public,anon;
grant execute on function public.submit_member_recipe(uuid,jsonb) to authenticated;

create or replace function public.submit_member_bean(p_id uuid,p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=(select auth.uid()); image_ref text; flavor text; weight_value int;
begin
  perform private.validate_member_submission(p_payload);
  if exists(select 1 from public.beans where id=p_id and created_by=owner_id) then return p_id; end if;
  if length(trim(coalesce(p_payload->>'origin',''))) not between 2 and 120
    or length(trim(coalesce(p_payload->>'roaster_name',''))) not between 2 and 180 then
    raise exception 'INVALID_BEAN_DETAILS' using errcode='22023';
  end if;
  image_ref:=private.member_submission_image(p_payload->>'image_path');
  weight_value:=nullif(p_payload->>'weight','')::int;
  if weight_value is not null and weight_value not between 1 and 100000 then raise exception 'INVALID_WEIGHT'; end if;
  insert into public.beans(id,slug,created_by,name_ar,name_en,origin_country,origin_region,farm,varietal,process,roast_level,
    altitude_meters,bag_weight_grams,roast_date,description_ar,description_en,source_type,source_name,source_url,
    roaster_website_url,image_url,image_kind,image_usage_status,requires_review,is_published,data_confidence)
  values(p_id,'member-'||p_id,owner_id,case when p_payload->>'locale'='ar' then trim(p_payload->>'name') else '' end,
    case when p_payload->>'locale'='en' then trim(p_payload->>'name') else '' end,p_payload->>'origin',nullif(p_payload->>'region',''),
    nullif(p_payload->>'farm',''),nullif(p_payload->>'variety',''),nullif(p_payload->>'process',''),nullif(p_payload->>'roast',''),
    nullif(p_payload->>'altitude','')::int,weight_value,nullif(p_payload->>'roast_date','')::date,
    case when p_payload->>'locale'='ar' then p_payload->>'description' end,
    case when p_payload->>'locale'='en' then p_payload->>'description' end,'user_submitted',p_payload->>'roaster_name',
    nullif(p_payload->>'source_url',''),nullif(p_payload->>'roaster_url',''),image_ref,'packaging',
    case when image_ref is not null then 'rights_confirmed' else 'rights_unknown' end,true,false,'unverified');
  for flavor in select trim(value) from jsonb_array_elements_text(coalesce(p_payload->'flavors','[]'::jsonb)) loop
    if length(flavor) not between 1 and 100 then raise exception 'INVALID_FLAVOR'; end if;
    insert into public.bean_flavor_notes(bean_id,flavor) values(p_id,flavor) on conflict do nothing;
  end loop;
  insert into public.user_bean_inventory(user_id,legacy_bean_id,original_weight_grams,remaining_weight_grams,roast_date)
  values(owner_id,p_id,weight_value,weight_value,nullif(p_payload->>'roast_date','')::date);
  return p_id;
end $$;
revoke all on function public.submit_member_bean(uuid,jsonb) from public,anon;
grant execute on function public.submit_member_bean(uuid,jsonb) to authenticated;

-- Anonymous Supabase sessions are authenticated-role tokens, not members.
create policy "only members create beans" on public.beans as restrictive for insert to authenticated
with check (coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "only members create recipes" on public.recipes as restrictive for insert to authenticated
with check (coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
