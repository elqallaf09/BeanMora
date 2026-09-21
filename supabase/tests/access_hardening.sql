-- Run with an admin database connection. Fixtures and every write roll back.
-- Never execute account deletion or admin-wide excerpt purging as a test.
begin;
set local statement_timeout='15s';
set local lock_timeout='3s';
create temp table security_fixture(admin_id uuid, member_id uuid, source_id uuid, pending_id uuid, approved_id uuid);
insert into security_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on security_fixture to authenticated, anon;
insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
select admin_id,admin_id::text||'@security-test.invalid',jsonb_build_object('username','st_'||substr(admin_id::text,1,8),'name','Security fixture'),false from security_fixture
union all select member_id,member_id::text||'@security-test.invalid',jsonb_build_object('username','st_'||substr(member_id::text,1,8),'name','Security fixture'),false from security_fixture;
insert into public.user_roles(user_id,role) select admin_id,'admin' from security_fixture;
insert into public.ingestion_sources(id,slug,name,access_mode,endpoint,is_enabled)
select source_id,'security-fixture-'||source_id::text,'Security test fixture','rss','https://example.invalid/security-fixture',false from security_fixture;
insert into public.ingestion_items(id,source_id,external_id,url,status,raw_excerpt)
select pending_id,source_id,pending_id::text,'https://example.invalid/pending','extracted','private review sentinel' from security_fixture
union all select approved_id,source_id,approved_id::text,'https://example.invalid/approved','approved','must not be purged by a member' from security_fixture;
do $$ begin
 if (select count(*) from public.profiles where id in (select admin_id from security_fixture union all select member_id from security_fixture)) <> 2 then raise exception 'signup trigger regression'; end if;
 if has_function_privilege('anon','public.delete_own_account()','EXECUTE') or has_function_privilege('anon','public.handle_new_user()','EXECUTE') or has_function_privilege('authenticated','public.handle_new_user()','EXECUTE') or has_function_privilege('anon','public.purge_reviewed_excerpts()','EXECUTE') then raise exception 'RPC permission regression'; end if;
 if not has_function_privilege('authenticated','public.delete_own_account()','EXECUTE') or not has_function_privilege('service_role','public.purge_reviewed_excerpts()','EXECUTE') then raise exception 'intended function access lost'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','is_anonymous',false)::text,true) from security_fixture;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.ingestion_review_queue) then raise exception 'member can read private queue'; end if;
 perform public.purge_reviewed_excerpts();
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.ingestion_items where id=(select approved_id from security_fixture) and raw_excerpt='must not be purged by a member') then raise exception 'member elevated maintenance write'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','is_anonymous',false)::text,true) from security_fixture;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.ingestion_review_queue where item_id=(select pending_id from security_fixture)) then raise exception 'admin queue access regression'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 begin perform 1 from public.ingestion_review_queue limit 1; raise exception 'anonymous queue access'; exception when insufficient_privilege then null; end;
 begin perform public.purge_reviewed_excerpts(); raise exception 'anonymous maintenance access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: signup trigger, anonymous RPC denial, member queue isolation, RLS-constrained maintenance, admin queue access, service-role maintenance permission' as verification;
rollback;
