-- Isolated Auth / profile fixtures; every change rolls back.
begin;
create temporary table account_fixture as select gen_random_uuid() as owner, gen_random_uuid() as other_user, gen_random_uuid() as guest;
grant select on account_fixture to anon,authenticated;
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)
 select owner, owner::text||'@account-fixture.example.test',false,jsonb_build_object('username','ja_'||substr(replace(owner::text,'-',''),1,16),'name','Japanese fixture','language','ja','country','jp','phone','+819012345678') from account_fixture;
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)
 select other_user, other_user::text||'@account-fixture.example.test',false,jsonb_build_object('username','other_'||substr(replace(other_user::text,'-',''),1,16),'language','en') from account_fixture;
insert into auth.users(id,is_anonymous,raw_user_meta_data)
 select guest,true,'{}'::jsonb from account_fixture;
do $$
declare actor uuid:=(select owner from account_fixture); result jsonb;
begin
 if not exists(select 1 from public.profiles where id=actor and country='JP' and language='ja') then raise exception 'SIGNUP_METADATA_NOT_SAVED';end if;
 if not exists(select 1 from public.profiles where id=(select guest from account_fixture) and username like 'guest_%') then raise exception 'GUEST_SIGNUP_REGRESSION';end if;
 if has_function_privilege('anon','private.sync_account_country()','EXECUTE') or has_function_privilege('authenticated','public.handle_new_user()','EXECUTE') then raise exception 'TRIGGER_RPC_EXPOSED';end if;
 update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('country','KW','phone','+96550000000') where id=actor;
 if (select country from public.profiles where id=actor)<>'KW' then raise exception 'COUNTRY_CHANGE_NOT_SYNCED';end if;
 begin
  update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('country','ZZ') where id=actor;
  raise exception 'INVALID_COUNTRY_ACCEPTED';
 exception when invalid_parameter_value then null;end;
 begin
  update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('phone','50000000') where id=actor;
  raise exception 'INVALID_PHONE_ACCEPTED';
 exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claims', jsonb_build_object('sub',(select owner from account_fixture),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$
declare actor uuid:=(select owner from account_fixture); affected integer;
begin
 update public.profiles set bio='Coffee and brewing in Japan' where id=actor;
 if (select bio from public.profiles where id=actor)<>'Coffee and brewing in Japan' then raise exception 'BIO_NOT_SAVED';end if;
 update public.profiles set bio='Forbidden edit',country='JP' where id=(select other_user from account_fixture);
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'OTHER_PROFILE_EDITED';end if;
 begin
  perform raw_user_meta_data from auth.users where id=(select other_user from account_fixture);
  raise exception 'PRIVATE_CONTACT_READABLE';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$
declare result jsonb;
begin
 select public.get_member_profile(p.username) into result from public.profiles p where p.id=(select owner from account_fixture);
 if result->'profile'->>'country'<>'KW' or result->'profile'->>'bio'<>'Coffee and brewing in Japan' then raise exception 'PUBLIC_PROFILE_COUNTRY_BIO_MISSING';end if;
 if result::text like '%+96550000000%' or result::text like '%account-fixture.example.test%' or result->'profile' ? 'phone' or result->'profile' ? 'email' or result->'profile' ? 'user_metadata' then raise exception 'CONTACT_DATA_LEAKED';end if;
 begin
  perform raw_user_meta_data from auth.users;
  raise exception 'ANON_AUTH_CONTACT_READABLE';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: signup metadata, Japanese locale, country synchronization, bio ownership and private contact' as result;
rollback;
