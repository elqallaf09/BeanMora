-- Exercise the deployed RPCs and RLS with temporary identities. Nothing persists.
begin;
set local statement_timeout='25s';
create temp table roast_fixture(owner_id uuid,other_id uuid,green_id uuid,other_green uuid,roast_id uuid,public_id uuid,other_roast uuid,other_machine uuid,purchase_id uuid);
insert into roast_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on roast_fixture to authenticated,anon;
insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
select owner_id,owner_id::text||'@roast-test.invalid',jsonb_build_object('username','rt_'||substr(owner_id::text,1,8)),false from roast_fixture
union all select other_id,other_id::text||'@roast-test.invalid',jsonb_build_object('username','rt_'||substr(other_id::text,1,8)),false from roast_fixture;
insert into public.green_coffees(id,user_id,name,supplier) select other_green,other_id,'Private foreign green coffee','Private supplier' from roast_fixture;
insert into public.user_equipment(id,user_id,category,custom_name) select other_machine,other_id,'roaster','Private foreign roaster' from roast_fixture;
insert into public.roast_profiles(id,user_id,green_coffee_id,title,green_weight_g) select other_roast,other_id,other_green,'Private foreign roast',200 from roast_fixture;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','is_anonymous',false)::text,true) from roast_fixture;
set local role authenticated;
do $$ declare f record; p jsonb; n integer; begin
  select * into f from roast_fixture;
  p:=jsonb_build_object('id',f.green_id,'create',true,'name','Transactional test green','origin_country','Yemen','process','natural','supplier','Private stock supplier','quantity_grams',1000,'transaction_id',f.purchase_id);
  perform public.save_green_coffee(p);
  perform public.save_green_coffee(p);
  if (select remaining_grams from public.green_coffee_balances where green_coffee_id=f.green_id)<>1000 then raise exception 'purchase retry doubled the stock'; end if;
  p:=jsonb_build_object('id',f.roast_id,'green_coffee_id',f.green_id,'title','Transactional private roast','green_weight_g',500,'roasted_weight_g',415,'total_time_seconds',600,'status','completed','visibility','private',
    'events','[{"event_type":"charge","elapsed_seconds":0,"bean_temp_c":185},{"event_type":"dry_end","elapsed_seconds":240,"bean_temp_c":155},{"event_type":"first_crack_start","elapsed_seconds":480,"bean_temp_c":195},{"event_type":"drop","elapsed_seconds":600,"bean_temp_c":207}]'::jsonb,
    'points','[{"elapsed_seconds":0,"bean_temp_c":185},{"elapsed_seconds":90,"bean_temp_c":80},{"elapsed_seconds":480,"bean_temp_c":195},{"elapsed_seconds":600,"bean_temp_c":207}]'::jsonb,
    'controls','[{"elapsed_seconds":0,"control_type":"power","value":75,"unit":"%"},{"elapsed_seconds":480,"control_type":"airflow","value":80,"unit":"%"}]'::jsonb);
  perform public.save_roast_profile(p);
  perform public.save_roast_profile(p);
  if (select remaining_grams from public.green_coffee_balances where green_coffee_id=f.green_id)<>500 then raise exception 'roast retry doubled consumption'; end if;
  if (select count(*) from public.green_inventory_transactions where roast_id=f.roast_id)<>1 then raise exception 'retry added a duplicate ledger entry'; end if;
  if not exists(select 1 from public.roast_profile_metrics where roast_id=f.roast_id and weight_loss_percent=17 and development_ratio_percent=20 and drying_seconds=240 and maillard_seconds=240 and development_seconds=120) then raise exception 'actual roast metrics were incorrect'; end if;
  if exists(select 1 from public.posts where roast_profile_id=f.roast_id) then raise exception 'private roast created a community post'; end if;
  begin perform public.save_roast_profile(p||'{"green_weight_g":2000}'::jsonb); raise exception 'overspent stock'; exception when raise_exception then if sqlerrm<>'ROAST_INVENTORY' then raise; end if; end;
  begin perform public.save_roast_profile(p||'{"total_time_seconds":610}'::jsonb); raise exception 'conflicting drop and total accepted'; exception when raise_exception then if sqlerrm<>'ROAST_ORDER' then raise; end if; end;
  begin perform public.save_roast_profile(p||jsonb_build_object('expected_updated_at',now()-interval '1 minute')); raise exception 'stale edit accepted'; exception when raise_exception then if sqlerrm<>'ROAST_STALE' then raise; end if; end;
  begin perform public.save_roast_profile(p||'{"green_weight_g":600,"points":[{"elapsed_seconds":20,"bean_temp_c":900}]}'::jsonb); raise exception 'invalid measured point accepted'; exception when check_violation then null; end;
  if (select remaining_grams from public.green_coffee_balances where green_coffee_id=f.green_id)<>500 or (select green_weight_g from public.roast_profiles where id=f.roast_id)<>500 or (select count(*) from public.roast_curve_points where roast_id=f.roast_id)<>4 then raise exception 'failed child write did not roll back profile, stock and curve'; end if;
  begin perform public.save_roast_profile(p||jsonb_build_object('green_coffee_id',f.other_green)); raise exception 'foreign green accepted'; exception when raise_exception then if sqlerrm<>'ROAST_OWNER' then raise; end if; end;
  begin perform public.save_roast_profile(p||jsonb_build_object('roaster_equipment_id',f.other_machine)); raise exception 'foreign machine accepted'; exception when raise_exception then if sqlerrm<>'ROAST_MACHINE' then raise; end if; end;
  begin perform public.save_roast_profile(p||jsonb_build_object('parent_roast_id',f.other_roast)); raise exception 'private foreign parent accepted'; exception when raise_exception then if sqlerrm<>'ROAST_PARENT' then raise; end if; end;
  begin insert into public.roast_profiles(user_id,green_coffee_id,title,green_weight_g) values(f.owner_id,f.other_green,'Forged direct green reference',100); raise exception 'direct foreign green reference accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.roast_profiles(user_id,green_coffee_id,roaster_equipment_id,title,green_weight_g) values(f.owner_id,f.green_id,f.other_machine,'Forged direct machine reference',100); raise exception 'direct foreign machine reference accepted'; exception when insufficient_privilege then null; end;
  perform public.save_roast_profile(p||'{"green_weight_g":600}'::jsonb);
  perform public.save_roast_profile(p||'{"green_weight_g":600}'::jsonb);
  if (select remaining_grams from public.green_coffee_balances where green_coffee_id=f.green_id)<>400 then raise exception 'roast revision did not replace consumption'; end if;
  perform public.save_roast_profile(p||jsonb_build_object('id',f.public_id,'title','Transactional public roast','green_weight_g',100,'roasted_weight_g',83,'visibility','public','language','ar'));
  perform public.save_roast_profile(p||jsonb_build_object('id',f.public_id,'title','Transactional public roast','green_weight_g',100,'roasted_weight_g',83,'visibility','public','language','ar'));
  if (select count(*) from public.posts where roast_profile_id=f.public_id)<>1 then raise exception 'publishing retry duplicated a post'; end if;
  if (select remaining_grams from public.green_coffee_balances where green_coffee_id=f.green_id)<>300 then raise exception 'second roast stock incorrect'; end if;
  perform public.save_roast_tasting(f.public_id,'{"rest_days":5,"acidity":7,"sweetness":8,"body":6,"overall_score":86.5,"flavor_notes":["ليمون","عسل"]}'::jsonb);
  if not exists(select 1 from public.roast_tastings where roast_id=f.public_id and acidity=7 and overall_score=86.5) then raise exception 'actual tasting was lost'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated','is_anonymous',false)::text,true) from roast_fixture;
set local role authenticated;
do $$ declare f record; n integer; begin
  select * into f from roast_fixture;
  if exists(select 1 from public.green_coffees where id=f.green_id) or exists(select 1 from public.green_coffee_balances where green_coffee_id=f.green_id) or exists(select 1 from public.roast_profiles where id=f.roast_id) then raise exception 'private owner records leaked to another member'; end if;
  update public.roast_profiles set title='Foreign overwrite' where id=f.public_id;get diagnostics n=row_count;if n<>0 then raise exception 'cross-user update accepted'; end if;
  delete from public.roast_events where roast_id=f.public_id;get diagnostics n=row_count;if n<>0 then raise exception 'cross-user event delete accepted'; end if;
  begin perform public.save_roast_tasting(f.public_id,'{"acidity":1}'::jsonb);raise exception 'foreign tasting accepted';exception when raise_exception then if sqlerrm<>'ROAST_OWNER' then raise;end if;end;
  begin insert into public.posts(user_id,roast_profile_id,body,visibility) values(f.other_id,f.public_id,'Forged roast post','public');raise exception 'foreign roast post accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated','is_anonymous',true)::text,true) from roast_fixture;
set local role authenticated;
do $$ begin
  begin perform public.save_green_coffee('{"name":"Guest green","quantity_grams":100}'::jsonb);raise exception 'guest wrote green stock';exception when raise_exception then if sqlerrm<>'ROAST_LOGIN' then raise;end if;end;
  begin perform public.save_roast_profile('{}'::jsonb);raise exception 'guest wrote a roast';exception when raise_exception then if sqlerrm<>'ROAST_LOGIN' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare f record; begin
  select * into f from roast_fixture;
  if exists(select 1 from public.green_coffees where id=f.green_id) or exists(select 1 from public.roast_profiles where id=f.roast_id) then raise exception 'private data leaked to anonymous reader';end if;
  if not exists(select 1 from public.roast_profiles where id=f.public_id and public_coffee->>'name'='Transactional test green') or (select count(*) from public.roast_events where roast_id=f.public_id)<>4 or (select count(*) from public.roast_tastings where roast_id=f.public_id)<>1 then raise exception 'published roast, stages or tasting not readable';end if;
  if exists(select 1 from public.roast_profiles where id=f.public_id and public_coffee ? 'supplier') then raise exception 'public snapshot contains private supplier';end if;
  if has_function_privilege('anon','public.save_green_coffee(jsonb)','EXECUTE') or has_function_privilege('anon','public.save_roast_profile(jsonb)','EXECUTE') then raise exception 'anonymous write RPC grant';end if;
end $$;
reset role;
-- Revoke a published roast: both its post and nested measurements become private.
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','is_anonymous',false)::text,true) from roast_fixture;
set local role authenticated;
update public.roast_profiles set visibility='private',published_at=null where id=(select public_id from roast_fixture);
update public.posts set visibility='private' where roast_profile_id=(select public_id from roast_fixture);
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin if exists(select 1 from public.posts where roast_profile_id=(select public_id from roast_fixture)) or exists(select 1 from public.roast_events where roast_id=(select public_id from roast_fixture)) then raise exception 'unpublished post or measurements remain visible';end if;end $$;
reset role;
rollback;
select 'Roast Lab stock, retry, rollback, publication and RLS checks passed; fixtures rolled back' as result;
