-- Disposable users and data: the entire test transaction rolls back.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
do $test$
<<member_test>>
declare owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); guest_id uuid:=gen_random_uuid();
 bean_id uuid:=gen_random_uuid(); recipe_id uuid:=gen_random_uuid(); bad_id uuid:=gen_random_uuid();
 image_id uuid:=gen_random_uuid(); path text; denied boolean; count_changed int; payload jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data,is_anonymous) values
 (owner_id,'member-test-'||owner_id||'@example.invalid','{}',false),
 (other_id,'member-test-'||other_id||'@example.invalid','{}',false),
 (guest_id,'member-test-'||guest_id||'@example.invalid','{}',true);
 path:=owner_id||'/'||image_id||'.jpg';
 insert into storage.objects(bucket_id,name,owner_id) values('member-media',path,owner_id::text);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 execute 'set local role authenticated';
 payload:=jsonb_build_object('locale','ar','name','بن للاختبار','origin','Brazil','roaster_name','محمصة اختبار','weight','250','flavors',jsonb_build_array('chocolate'),'image_path',path,'source_url','https://example.invalid/coffee','roaster_url','https://example.invalid');
 perform public.submit_member_bean(bean_id,payload);
 perform public.submit_member_bean(bean_id,payload);
 if not exists(select 1 from public.beans where id=bean_id and created_by=owner_id and requires_review and not is_published and data_confidence='unverified') then raise exception 'Bean ownership/review failed'; end if;
 if (select count(*) from public.user_bean_inventory where legacy_bean_id=member_test.bean_id)<>1 then raise exception 'Retry duplicated bag'; end if;
 payload:=jsonb_build_object('locale','ar','name','وصفة اختبار','method','v60','dose','15','water','250','steps',jsonb_build_array('صب الماء','انتظر التصريف'),'visibility','private','image_path',path,'source_url','https://example.invalid/recipe');
 perform public.submit_member_recipe(recipe_id,payload);
 perform public.submit_member_recipe(recipe_id,payload);
 if (select count(*) from public.recipe_steps s where s.recipe_id=member_test.recipe_id)<>2 then raise exception 'Retry duplicated steps'; end if;
 if not exists(select 1 from storage.objects where bucket_id='member-media' and name=path) then raise exception 'Owner image denied'; end if;
 denied:=false;
 begin perform public.submit_member_recipe(bad_id,payload||'{"steps":["valid","x"]}'::jsonb); exception when invalid_parameter_value then denied:=true; end;
 if not denied or exists(select 1 from public.recipes where id=bad_id) then raise exception 'Failed step did not roll back recipe'; end if;
 denied:=false;
 begin perform public.submit_member_recipe(bad_id,payload||'{"source_url":"javascript:alert(1)"}'::jsonb); exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'Unsafe URL accepted'; end if;
 update public.user_bean_inventory set archived_at=now() where legacy_bean_id=member_test.bean_id and user_id=owner_id;
 get diagnostics count_changed=row_count;
 if count_changed<>1 then raise exception 'Own bag removal failed'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('request.jwt.claim.sub',other_id::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.beans where id=bean_id) or exists(select 1 from public.recipes where id=recipe_id) or exists(select 1 from storage.objects where bucket_id='member-media' and name=path) then raise exception 'Private contribution exposed'; end if;
 denied:=false;
 begin perform public.submit_member_recipe(bad_id,payload); exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'Other owner image accepted'; end if;
 update public.user_bean_inventory set archived_at=null where legacy_bean_id=member_test.bean_id;
 get diagnostics count_changed=row_count;
 if count_changed<>0 then raise exception 'Other account bag writable'; end if;
 execute 'reset role';
 update public.recipes set visibility='public' where id=recipe_id;
 execute 'set local role anon';
 if not exists(select 1 from storage.objects where bucket_id='member-media' and name=path) then raise exception 'Public recipe image denied'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guest_id,'role','authenticated','is_anonymous',true)::text,true);
 perform set_config('request.jwt.claim.sub',guest_id::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.submit_member_recipe(bad_id,payload); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anonymous member RPC accepted'; end if;
 denied:=false;
 begin insert into public.recipes(user_id,title,brew_method,visibility) values(guest_id,'Guest test','v60','private'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anonymous direct insertion bypass'; end if;
 execute 'reset role';
end $test$;
select 'PASS: members, anonymous/direct rejection, private/public media, other-owner isolation, atomic steps, idempotent retries, HTTPS links, own bag removal' as verification;
rollback;
