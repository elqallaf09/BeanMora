-- Administrative test connection, no retained rows or real account changes.
begin;
set local statement_timeout='8s';
select set_config('test.member_owner',(select id::text from auth.users where not coalesce(is_anonymous,true) limit 1),true),
       set_config('test.member_request',gen_random_uuid()::text,true),
       set_config('test.member_recipe',(select id::text from public.recipes where visibility='public' limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.member_owner'),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$
declare uid uuid:=auth.uid(); req uuid:=current_setting('test.member_request')::uuid;
 p jsonb:=jsonb_build_object('recipe_id',null,'bean_id',null,'brew_method','v60','dose_grams',18,'water_grams',300,'actual_time_seconds',180,'outcome','good','status','brewed_as_written','share_with_community',false,'next_grind_adjustment',null,'taste_scores','{}'::jsonb,'brewed',true);
 c jsonb; n int;
begin
 if uid is null then raise exception 'Registered test owner required'; end if;
 c:=jsonb_build_object('grinder_model_id',(select id from public.equipment_models where name='Baratza Encore ESP' and not requires_review limit 1),'brewer_model_id',null,'roasted_product_id',null,'grind_setting','25','roast_level','light','roast_date','2026-10-01','calibration','Standard burrs; zero checked','taste_signal','balanced');
 perform public.record_configured_brew_v1(req,p,c);
 perform public.record_configured_brew_v1(req,p,c);
 select count(*) into n from public.brew_logs where id=req and user_id=uid and grinder_context=c and grind_setting='25' and taste_signal='balanced';
 if n<>1 then raise exception 'Configured cup not saved exactly once'; end if;
 begin perform public.record_configured_brew_v1(req,p,c||'{"grind_setting":"8"}'); raise exception 'Changed context retry accepted';
 exception when sqlstate '22023' then if sqlerrm<>'BREW_REQUEST_CONFLICT' then raise;end if;end;
 begin perform public.record_configured_brew_v1(gen_random_uuid(),p,c||'{"roast_date":"2026-02-30"}'); raise exception 'Invalid date accepted'; exception when sqlstate '22023' then null;end;
 begin perform public.record_configured_brew_v1(gen_random_uuid(),p,c||jsonb_build_object('grinder_model_id',gen_random_uuid())); raise exception 'Unknown grinder accepted'; exception when sqlstate '22023' then null;end;
 begin perform public.record_configured_brew_v1(gen_random_uuid(),p,c||'{"user_id":"forged"}'); raise exception 'Forged context accepted'; exception when sqlstate '22023' then null;end;
 insert into public.recipe_saves(user_id,recipe_id) values(uid,current_setting('test.member_recipe')::uuid) on conflict(recipe_id,user_id) do nothing;
 insert into public.recipe_saves(user_id,recipe_id) values(uid,current_setting('test.member_recipe')::uuid) on conflict(recipe_id,user_id) do nothing;
 select count(*) into n from public.recipe_saves where user_id=uid and recipe_id=current_setting('test.member_recipe')::uuid;
 if n<>1 then raise exception 'Favorite retry failed';end if;
 delete from public.recipe_saves where user_id=uid and recipe_id=current_setting('test.member_recipe')::uuid;
 if exists(select 1 from public.recipe_saves where user_id=uid and recipe_id=current_setting('test.member_recipe')::uuid) then raise exception 'Favorite removal failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','is_anonymous',false)::text,true);
 if exists(select 1 from public.brew_logs where id=req) then raise exception 'Grinder context leaked to another member';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','is_anonymous',true)::text,true);
 begin perform public.record_configured_brew_v1(gen_random_uuid(),p,c);raise exception 'Guest save accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Anonymous API requests do not carry the registered member's JWT claims.
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if has_function_privilege('anon','public.record_configured_brew_v1(uuid,jsonb,jsonb)','execute') then raise exception 'Anon RPC grant';end if;
 if exists(select 1 from public.brew_logs where id=current_setting('test.member_request')::uuid) then raise exception 'Anonymous grinder history leaked';end if;
end $$;
reset role;
rollback;
select 'PASS: configured cup, identical retry, conflicting context, date/model validation, favorites and owner privacy; all test writes rolled back' as result;
