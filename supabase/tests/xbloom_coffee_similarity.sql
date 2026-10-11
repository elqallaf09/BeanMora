-- Isolated, uncommitted fixtures. Exercise the same anon role as the app.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
do $test$
declare
  owner_id uuid:=gen_random_uuid(); target_id uuid:=gen_random_uuid();
  source_id uuid:=gen_random_uuid(); unknown_id uuid:=gen_random_uuid();
  private_bean_id uuid:=gen_random_uuid(); similar_id uuid:=gen_random_uuid();
  private_recipe_id uuid:=gen_random_uuid(); original_id uuid:=gen_random_uuid();
  exact_id uuid:=gen_random_uuid(); got record;
begin
  insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
    values(owner_id,'xbloom-test-'||owner_id||'@example.invalid','{}',false);
  insert into public.beans(id,slug,name_ar,name_en,is_published,requires_review,
    origin_country,process,roast_level,description_en) values
    (target_id,'xbloom-target-'||target_id,'بن اختبار','Target fixture',true,false,
      'Fixture origin '||target_id,'washed','light','Tasting notes (per Fixture Roaster): Plum, Mango, Citrus, Cashew, Tea.'),
    (source_id,'xbloom-source-'||source_id,'بن المصدر','Source fixture',true,false,
      'Fixture origin '||target_id,'washed','light',null),
    (unknown_id,'xbloom-unknown-'||unknown_id,'غير موثق','Unknown fixture',true,false,null,null,'light',null),
    (private_bean_id,'xbloom-hidden-'||private_bean_id,'بن مخفي','Hidden fixture',false,false,null,null,null,null);
  insert into public.recipes(id,user_id,title,brew_method,bean_id,visibility,flavor_notes,
    dose_grams,is_incomplete_source,source_brew_parameters) values
    (similar_id,owner_id,'Isolated similar xBloom', 'xbloom',source_id,'public',array['plum','mango','citrus','cashew','tea'],
      15,true,'{"model":"Studio","water_ml":240,"grind_size":50,"pour_sum_matches_stated_water":true}'),
    (private_recipe_id,owner_id,'Isolated private xBloom','xbloom',source_id,'private',array['plum','mango','citrus','cashew','tea'],
      15,false,'{"model":"Studio","water_ml":240,"grind_size":50}'),
    (original_id,owner_id,'Isolated Original xBloom','xbloom',source_id,'public',array['plum','mango','citrus','cashew','tea'],
      15,true,'{"model":"Original","water_ml":240,"grind_size":20}');
  execute 'set local role anon';
  select * into got from public.xbloom_matches_for_coffee(target_id,null,'Studio',1);
  if got.recipe_id is distinct from similar_id or got.match_kind<>'similar'
    or not got.same_origin or not got.same_process or not got.same_roast
    or cardinality(got.matching_notes)<>5 or got.device_model<>'Studio'
    then raise exception 'Similarity facts, source ml support or Studio filtering failed'; end if;
  if exists(select 1 from public.xbloom_matches_for_coffee(target_id,null,'Studio',6)
    where recipe_id in(private_recipe_id,original_id)) then raise exception 'Private or incompatible recipe exposed'; end if;
  select * into got from public.xbloom_matches_for_coffee(target_id,null,'Original',1);
  if got.recipe_id is distinct from original_id then raise exception 'Original filtering failed'; end if;
  if exists(select 1 from public.xbloom_matches_for_coffee(unknown_id,null,null,3))
    then raise exception 'Roast alone became an unsupported similarity claim'; end if;
  if exists(select 1 from public.xbloom_matches_for_coffee(private_bean_id,null,null,3))
    then raise exception 'Hidden target was readable by anon'; end if;
  if exists(select 1 from public.xbloom_matches_for_coffee(target_id,null,'unsupported',3))
    then raise exception 'Invalid device accepted'; end if;
  execute 'reset role';
  insert into public.recipes(id,user_id,title,brew_method,bean_id,visibility,source_brew_parameters)
    values(exact_id,owner_id,'Isolated exact xBloom','xbloom',target_id,'public','{"model":"Studio"}');
  execute 'set local role anon';
  select * into got from public.xbloom_matches_for_coffee(target_id,null,'Studio',3);
  if got.recipe_id is distinct from exact_id or got.match_kind<>'exact'
    or exists(select 1 from public.xbloom_matches_for_coffee(target_id,null,'Studio',3) where match_kind<>'exact')
    then raise exception 'Exact association did not take priority'; end if;
  if not exists(select 1 from public.coffee_similarity_terms('برقوق، مانجو، حمضيات، كاجو، شاي') where note='cashew')
    then raise exception 'Arabic tasting notes not recognized'; end if;
  execute 'reset role';
end $test$;
rollback;
