-- Run in a single rollback-only transaction; generated disposable identities.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
do $test$
declare
 actor uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); admin_user uuid:=gen_random_uuid();
 recipe uuid:=gen_random_uuid(); trusted uuid:=gen_random_uuid(); post uuid:=gen_random_uuid(); bean uuid:=gen_random_uuid();
 denied boolean; rows_changed integer; media_path text; statement text;
begin
 insert into auth.users(id,email,raw_user_meta_data,is_anonymous) values
 (actor,'audit-'||actor||'@example.invalid','{}',false),
 (other_user,'audit-'||other_user||'@example.invalid','{}',false),
 (admin_user,'audit-'||admin_user||'@example.invalid','{}',false);
 insert into public.user_roles(user_id,role) values(admin_user,'admin');
 insert into public.recipes(id,user_id,title,brew_method,visibility,recipe_type) values
 (trusted,actor,'Trusted fixture','v60','public','official_manufacturer');
 insert into public.recipe_steps(recipe_id,step_number,title) values(trusted,1,'Reviewed step');
 insert into public.posts(id,user_id,body,visibility) values(post,actor,'Private fixture','private');
 media_path:=actor::text||'/'||post::text||'/test.jpg';
 insert into public.post_media(post_id,url,media_type) values(post,'storage://post-media/'||media_path,'image');
 insert into storage.objects(bucket_id,name,owner_id) values('post-media',media_path,actor::text);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('request.jwt.claim.sub',actor::text,true);
 execute 'set local role authenticated';
 update public.profiles set bio='Permitted profile edit' where id=actor;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Own profile edit failed'; end if;
 foreach statement in array array[
   format('update public.profiles set is_verified=true where id=%L',actor),
   format('insert into public.recipes(user_id,title,brew_method,visibility,recipe_type) values(%L,''Forged'',''v60'',''public'',''official_manufacturer'')',actor),
   format('update public.recipes set title=''Tampered'' where id=%L',trusted),
   format('update public.recipe_steps set title=''Tampered'' where recipe_id=%L',trusted),
   format('insert into public.user_roles(user_id,role) values(%L,''admin'')',actor)
 ] loop
   denied:=false;
   begin execute statement; exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Trust protection failed: %',statement; end if;
 end loop;
 insert into public.recipes(id,user_id,title,brew_method,visibility,recipe_type)
 values(recipe,actor,'Ordinary fixture','v60','public','community');
 insert into public.recipe_steps(recipe_id,step_number,title) values(recipe,1,'Allowed step');
 update public.recipes set notes='Allowed edit' where id=recipe;
 insert into public.beans(id,created_by,slug,name_ar,name_en,is_published,requires_review,data_confidence)
 values(bean,actor,'audit-'||bean,'اختبار','Audit',true,false,'official');
 if not exists(select 1 from public.beans where id=bean and not is_published and requires_review and data_confidence='unverified') then raise exception 'Bean review bypass'; end if;
 if not exists(select 1 from storage.objects where bucket_id='post-media' and name=media_path) then raise exception 'Owner media blocked'; end if;
 update public.profiles set bio='Not allowed' where id=other_user;
 get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Other profile writable'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_user,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from storage.objects where bucket_id='post-media' and name=media_path) then raise exception 'Private media exposed'; end if;
 execute 'reset role';
 update public.posts set visibility='public' where id=post;
 execute 'set local role anon';
 if not exists(select 1 from storage.objects where bucket_id='post-media' and name=media_path) then raise exception 'Public media unavailable'; end if;
 execute 'reset role';
 update public.posts set is_hidden=true where id=post;
 execute 'set local role anon';
 if exists(select 1 from storage.objects where bucket_id='post-media' and name=media_path) then raise exception 'Hidden media exposed'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('request.jwt.claim.sub',admin_user::text,true);
 execute 'set local role authenticated';
 -- Profile policy intentionally restricts row ownership; verify the guard permits
 -- authorized trust changes to the administrator's own row.
 update public.profiles set is_verified=true where id=admin_user;
 insert into public.recipes(user_id,title,brew_method,visibility,recipe_type) values(admin_user,'Approved fixture','v60','public','official_manufacturer');
 execute 'reset role';
end $test$;
select 'PASS: trust columns, trusted child content, normal ownership, admin, media privacy/public/hidden' as verification;
rollback;
