-- Real RLS checks using transaction-only identities and reviews. No fixtures persist.
begin;
set local statement_timeout = '20s';
create temp table gear_fixture (owner_id uuid, other_id uuid, moderator_id uuid, model_id uuid, review_id uuid);
insert into gear_fixture select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), id, gen_random_uuid()
  from public.equipment_models where not requires_review order by id limit 1;
grant select on gear_fixture to authenticated, anon;
insert into auth.users (id, email, raw_user_meta_data, is_anonymous)
select owner_id, owner_id::text || '@gear-test.invalid', jsonb_build_object('username', 'gt_' || substr(owner_id::text, 1, 8)), false from gear_fixture
union all select other_id, other_id::text || '@gear-test.invalid', jsonb_build_object('username', 'gt_' || substr(other_id::text, 1, 8)), false from gear_fixture
union all select moderator_id, moderator_id::text || '@gear-test.invalid', jsonb_build_object('username', 'gt_' || substr(moderator_id::text, 1, 8)), false from gear_fixture;
insert into public.user_roles (user_id, role) select moderator_id, 'moderator' from gear_fixture;
select set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated', 'is_anonymous', false)::text, true) from gear_fixture;
set local role authenticated;
insert into public.equipment_reviews (equipment_model_id, user_id, rating, review_text, experience)
select model_id, owner_id, 4, 'Transaction-only equipment test review', 'used' from gear_fixture;
do $$ begin
  begin insert into public.equipment_reviews (equipment_model_id, user_id, rating, review_text, experience)
    select model_id, other_id, 4, 'Forged identity test review', 'used' from gear_fixture;
    raise exception 'forged identity was accepted'; exception when insufficient_privilege then null; end;
  begin update public.equipment_reviews set status = 'hidden' where user_id = (select owner_id from gear_fixture);
    raise exception 'member changed moderation status'; exception when insufficient_privilege then null; end;
  begin perform public.moderate_equipment_review((select id from public.equipment_reviews where user_id = (select owner_id from gear_fixture)), true, 'member must not moderate');
    raise exception 'member moderated a review'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub', other_id, 'role', 'authenticated', 'is_anonymous', false)::text, true) from gear_fixture;
set local role authenticated;
do $$ declare n int; begin
  update public.equipment_reviews set rating = 1 where user_id = (select owner_id from gear_fixture);
  get diagnostics n = row_count; if n <> 0 then raise exception 'cross-user edit accepted'; end if;
  delete from public.equipment_reviews where user_id = (select owner_id from gear_fixture);
  get diagnostics n = row_count; if n <> 0 then raise exception 'cross-user delete accepted'; end if;
end $$;
reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub', other_id, 'role', 'authenticated', 'is_anonymous', true)::text, true) from gear_fixture;
set local role authenticated;
do $$ begin
  begin insert into public.equipment_reviews (equipment_model_id, user_id, rating, review_text, experience)
    select model_id, other_id, 4, 'Anonymous-account review must fail', 'used' from gear_fixture;
    raise exception 'guest write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub', moderator_id, 'role', 'authenticated', 'is_anonymous', false)::text, true) from gear_fixture;
set local role authenticated;
select public.moderate_equipment_review(id, true, 'Transaction-only moderation test') from public.equipment_reviews where user_id = (select owner_id from gear_fixture);
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists (select 1 from public.equipment_reviews where user_id = (select owner_id from gear_fixture)) then raise exception 'hidden review leaked'; end if;
  if has_function_privilege('anon', 'public.moderate_equipment_review(uuid,boolean,text)', 'EXECUTE') then raise exception 'anonymous moderation RPC grant'; end if;
end $$;
reset role;
rollback;
select 'Equipment review RLS checks passed; every fixture rolled back' as result;
