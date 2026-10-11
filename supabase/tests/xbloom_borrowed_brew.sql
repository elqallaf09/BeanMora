begin;
set local statement_timeout='15s';
do $test$
declare
  uid uuid:=gen_random_uuid(); bid uuid:=gen_random_uuid();
  roaster_id uuid:=gen_random_uuid(); product_id uuid:=gen_random_uuid();
  request_id uuid:=gen_random_uuid(); payload jsonb; context jsonb; denied boolean:=false;
begin
  insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
    values(uid,'xbloom-brew-'||uid||'@example.invalid','{}',false);
  insert into public.beans(id,slug,name_ar,name_en,is_published,requires_review)
    values(bid,'xbloom-brew-bean-'||bid,'بن اختبار','Brew fixture',true,false);
  insert into public.roasters(id,slug,name_ar,name_en)
    values(roaster_id,'xbloom-brew-roaster-'||roaster_id,'محمصة اختبار','Fixture roaster');
  insert into public.roasted_products(id,slug,roaster_id,legacy_bean_id,name_ar,name_en,source_type,source_url,requires_review)
    values(product_id,'xbloom-brew-product-'||product_id,roaster_id,bid,'كيس اختبار','Fixture bag','official_product_page','https://example.invalid/fixture',false);
  payload:=jsonb_build_object('recipe_id',null,'bean_id',bid,'brew_method','xbloom','dose_grams',15,'water_grams',240,
    'actual_time_seconds',null,'outcome','good','status','brewed_with_modifications','share_with_community',false,
    'next_grind_adjustment',null,'taste_scores','{}'::jsonb,'brewed',true);
  context:=jsonb_build_object('grinder_model_id',null,'brewer_model_id',null,'roasted_product_id',product_id,
    'grind_setting','35','roast_level','light','roast_date',null,'calibration','Borrowed source profile','taste_signal','balanced');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',uid::text,true);
  execute 'set local role authenticated';
  if public.record_configured_brew_v1(request_id,payload,context)<>request_id
    or public.record_configured_brew_v1(request_id,payload,context)<>request_id then raise exception 'Standalone product brew or retry failed'; end if;
  if not exists(select 1 from public.brew_logs b where b.id=request_id and b.bean_id=bid
    and b.recipe_id is null and b.grinder_context->>'roasted_product_id'=product_id::text)
    then raise exception 'Selected product/bean context not preserved'; end if;
  if exists(select 1 from public.recipe_attempts where brew_log_id=request_id)
    then raise exception 'Borrowed profile created source-recipe evidence'; end if;
  begin
    perform public.record_configured_brew_v1(gen_random_uuid(),jsonb_set(payload,'{bean_id}','null'),context);
  exception when sqlstate '22023' then denied:=true;
  end;
  if not denied then raise exception 'Mismatched canonical product bean accepted'; end if;
  execute 'reset role';
end $test$;
rollback;
