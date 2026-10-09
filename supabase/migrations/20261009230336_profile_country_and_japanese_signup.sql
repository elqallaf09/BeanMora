-- Optional additive signup fields keep existing accounts, OAuth and guest access working.
-- Country is public profile data; phone stays only in the owner's Auth metadata.
alter table public.profiles drop constraint profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('ar','en','ja'));
alter table public.posts drop constraint posts_content_language_check;
alter table public.posts add constraint posts_content_language_check check (content_language in ('ar','en','ja'));
alter table public.comments drop constraint comments_content_language_check;
alter table public.comments add constraint comments_content_language_check check (content_language in ('ar','en','ja'));
alter table public.recipes drop constraint recipes_content_language_check;
alter table public.recipes add constraint recipes_content_language_check check (content_language in ('ar','en','ja'));

create or replace function private.valid_account_country(p_country text)
returns boolean language sql immutable strict security invoker set search_path='' as $$
 select p_country = any(array['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW']::text[])
$$;
revoke all on function private.valid_account_country(text) from public;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.valid_account_country(text) to anon,authenticated,supabase_auth_admin;

create or replace function private.validate_account_metadata()
returns trigger language plpgsql security invoker set search_path='' as $$
declare country_code text; contact_phone text;
begin
 if new.raw_user_meta_data ? 'country' and (tg_op='INSERT' or new.raw_user_meta_data->>'country' is distinct from old.raw_user_meta_data->>'country') then
  country_code:=upper(trim(coalesce(new.raw_user_meta_data->>'country','')));
  if country_code<>'' and not private.valid_account_country(country_code) then raise exception 'ACCOUNT_COUNTRY' using errcode='22023';end if;
  new.raw_user_meta_data:=jsonb_set(new.raw_user_meta_data,'{country}',to_jsonb(country_code));
 end if;
 if new.raw_user_meta_data ? 'phone' and (tg_op='INSERT' or new.raw_user_meta_data->>'phone' is distinct from old.raw_user_meta_data->>'phone') then
  contact_phone:=trim(coalesce(new.raw_user_meta_data->>'phone',''));
  if contact_phone<>'' and contact_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'ACCOUNT_PHONE' using errcode='22023';end if;
  new.raw_user_meta_data:=jsonb_set(new.raw_user_meta_data,'{phone}',to_jsonb(contact_phone));
 end if;
 return new;
end $$;
revoke all on function private.validate_account_metadata() from public,anon,authenticated;
create trigger validate_beanmora_account_metadata before insert or update of raw_user_meta_data on auth.users for each row execute function private.validate_account_metadata();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name,username,language,country) values(
  new.id,
  case when coalesce(new.is_anonymous,false) then 'Guest' else coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(split_part(new.email,'@',1),''),'Member') end,
  case when coalesce(new.is_anonymous,false) then 'guest_'||substr(new.id::text,1,8) else coalesce(nullif(lower(trim(new.raw_user_meta_data->>'username')),''),'user_'||substr(new.id::text,1,8)) end,
  case when new.raw_user_meta_data->>'language' in ('ar','en','ja') then new.raw_user_meta_data->>'language' else 'ar' end,
  nullif(new.raw_user_meta_data->>'country','')
 );
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

-- Auth owns the row identity; never trust user metadata for ownership or roles.
-- A definer is necessary because the Auth service does not own public profile rows.
create or replace function private.sync_account_country()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data->>'country' is not distinct from old.raw_user_meta_data->>'country' then return new;end if;
 if new.raw_user_meta_data ? 'country' and (coalesce(new.raw_user_meta_data->>'country','')='' or private.valid_account_country(new.raw_user_meta_data->>'country')) then
  update public.profiles set country=nullif(new.raw_user_meta_data->>'country','') where id=new.id;
 elsif not (new.raw_user_meta_data ? 'country') and old.raw_user_meta_data ? 'country' then
  update public.profiles set country=null where id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.sync_account_country() from public,anon,authenticated;
create trigger sync_beanmora_account_country after update of raw_user_meta_data on auth.users for each row execute function private.sync_account_country();

create or replace function private.validate_profile_country()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.country is not null and (tg_op='INSERT' or new.country is distinct from old.country) then
  new.country:=upper(trim(new.country));
  if not private.valid_account_country(new.country) then raise exception 'ACCOUNT_COUNTRY' using errcode='22023';end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_profile_country() from public,anon,authenticated;
create trigger validate_beanmora_profile_country before insert or update of country on public.profiles for each row execute function private.validate_profile_country();

-- Extend the existing audited allowlist. Do not project email, phone or Auth metadata.
do $profile$
declare definition text:=pg_get_functiondef('public.get_member_profile(text)'::regprocedure);
begin
 if strpos(definition,$old$'bio',p.bio,'is_private',p.is_private$old$)=0 then raise exception 'PROFILE_COUNTRY_PROJECTION_DRIFT';end if;
 definition:=replace(definition,$old$'bio',p.bio,'is_private',p.is_private$old$,$new$'bio',p.bio,'country',p.country,'is_private',p.is_private$new$);
 execute definition;
end $profile$;
notify pgrst,'reload schema';
