-- Extend member submissions to the same eight supported language tags.
-- Keep member/ownership validation, source fields and existing privileges.
CREATE OR REPLACE FUNCTION public.submit_member_bean(p_id uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    case when p_payload->>'locale'<>'ar' then trim(p_payload->>'name') else '' end,p_payload->>'origin',nullif(p_payload->>'region',''),
    nullif(p_payload->>'farm',''),nullif(p_payload->>'variety',''),nullif(p_payload->>'process',''),nullif(p_payload->>'roast',''),
    nullif(p_payload->>'altitude','')::int,weight_value,nullif(p_payload->>'roast_date','')::date,
    case when p_payload->>'locale'='ar' then p_payload->>'description' end,
    case when p_payload->>'locale'<>'ar' then p_payload->>'description' end,'user_submitted',p_payload->>'roaster_name',
    nullif(p_payload->>'source_url',''),nullif(p_payload->>'roaster_url',''),image_ref,'packaging',
    case when image_ref is not null then 'rights_confirmed' else 'rights_unknown' end,true,false,'unverified');
  for flavor in select trim(value) from jsonb_array_elements_text(coalesce(p_payload->'flavors','[]'::jsonb)) loop
    if length(flavor) not between 1 and 100 then raise exception 'INVALID_FLAVOR'; end if;
    insert into public.bean_flavor_notes(bean_id,flavor) values(p_id,flavor) on conflict do nothing;
  end loop;
  insert into public.user_bean_inventory(user_id,legacy_bean_id,original_weight_grams,remaining_weight_grams,roast_date)
  values(owner_id,p_id,weight_value,weight_value,nullif(p_payload->>'roast_date','')::date);
  return p_id;
end $function$;

CREATE OR REPLACE FUNCTION private.validate_member_submission(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare k text; v text;
begin
  if (select auth.uid()) is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then
    raise exception 'MEMBER_SIGN_IN_REQUIRED' using errcode='42501';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>30000 then
    raise exception 'INVALID_SUBMISSION' using errcode='22023';
  end if;
  if length(trim(coalesce(p->>'name',''))) not between 2 and 180
    or p->>'locale' not in ('ar','en','ja','fr','it','es','pt-BR','zh-CN') or p->>'locale' is null then
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
end $function$;
