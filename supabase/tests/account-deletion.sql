-- Rollback-only integration test. Generated disposable users; no real account
-- is selected, deleted, emailed or signed in. Run as postgres in one request.
begin;
do $test$
declare
  owner uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  own_recipe uuid := gen_random_uuid();
  other_recipe uuid := gen_random_uuid();
  bean uuid := gen_random_uuid();
  green uuid := gen_random_uuid();
  roast uuid := gen_random_uuid();
  sid uuid := gen_random_uuid();
  source_id uuid := gen_random_uuid();
  item_id uuid := gen_random_uuid();
  grant_id uuid := gen_random_uuid();
  rejected boolean := false;
begin
  if has_function_privilege('anon', 'public.delete_own_account()', 'execute') then
    raise exception 'Anonymous account deletion must be denied';
  end if;
  if not has_function_privilege('authenticated', 'public.delete_own_account()', 'execute') then
    raise exception 'Authenticated account deletion must be available';
  end if;

  insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
    values(owner,'delete-fixture-'||owner||'@example.invalid','{}',false),
          (other_user,'keep-fixture-'||other_user||'@example.invalid','{}',false);
  insert into auth.identities(user_id,provider_id,provider,identity_data)
    values(owner,owner::text,'google',jsonb_build_object('sub',owner::text));
  insert into auth.sessions(id,user_id) values(sid,owner);
  insert into auth.refresh_tokens(id,token,user_id,session_id)
    values(-abs((random()*1000000000000000)::bigint),gen_random_uuid()::text,owner::text,sid);
  insert into public.user_preferences(user_id,preferred_flavors) values(owner,array['strawberry']);
  insert into public.user_roles(id,user_id,role,granted_by) values(grant_id,other_user,'barista_verified',owner);
  insert into public.recipes(id,user_id,slug,title,brew_method,visibility)
    values(own_recipe,owner,'delete-fixture-'||own_recipe,'Disposable own recipe','v60','public'),
          (other_recipe,other_user,'keep-fixture-'||other_recipe,'Disposable unrelated recipe','v60','public');
  insert into public.recipe_steps(recipe_id,step_number,title) values(own_recipe,1,'Disposable step');
  insert into public.recipe_versions(recipe_id,version_number,snapshot,created_by)
    values(other_recipe,1,jsonb_build_object('user_id',owner),owner);
  insert into public.recipe_saves(recipe_id,user_id) values(other_recipe,owner);
  insert into public.beans(id,slug,name_ar,name_en,created_by)
    values(bean,'fixture-'||bean,'بن تجريبي','Disposable catalog bean',owner);
  insert into public.user_bean_inventory(user_id,preferred_recipe_id,legacy_bean_id) values(owner,own_recipe,bean);
  insert into public.brew_logs(user_id,recipe_id) values(owner,own_recipe);
  insert into public.posts(user_id,body) values(owner,'Disposable post');
  insert into public.notifications(user_id,actor_id,type) values(other_user,owner,'follow');
  insert into public.audit_logs(actor_id,action) values(owner,'disposable fixture');
  insert into public.moderation_actions(moderator_id,target_type,target_id,action)
    values(owner,'recipe',other_recipe,'verify');
  insert into public.recipe_verifications(recipe_id,verified_by,claimed_recipe_type,verdict)
    values(other_recipe,owner,'community','confirmed');
  insert into public.data_import_jobs(created_by,source_type,target_table) values(owner,'json','recipes');
  insert into public.research_jobs(created_by,job_key) values(owner,'fixture-'||owner);
  insert into public.ingestion_sources(id,slug,name,access_mode,endpoint)
    values(source_id,'fixture-'||source_id,'Disposable source','rss','https://example.invalid/feed');
  insert into public.ingestion_items(id,source_id,external_id,url)
    values(item_id,source_id,gen_random_uuid()::text,'https://example.invalid/recipe');
  insert into public.ingestion_reviews(item_id,reviewer_id,decision) values(item_id,owner,'approved');
  insert into public.green_coffees(id,user_id,name) values(green,owner,'Disposable green coffee');
  insert into public.roast_profiles(id,user_id,green_coffee_id) values(roast,owner,green);
  insert into public.roast_events(roast_id,event_type,elapsed_seconds) values(roast,'charge',0);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',owner::text,true);
  -- Synthetic metadata exists only inside this savepoint. There are no bytes
  -- in Storage, and raising P9001 rolls back its insert rather than deleting it.
  begin
    insert into storage.objects(bucket_id,name,owner_id) values('avatars',owner||'/fixture.webp',owner::text);
    begin
      perform public.delete_own_account();
    exception when others then
      if sqlerrm <> 'ACCOUNT_MEDIA_REMAINING' then raise; end if;
      rejected := true;
    end;
    if not rejected or not exists(select 1 from auth.users where id=owner) then
      raise exception 'Media must block deletion and preserve the account';
    end if;
    raise exception 'Roll back synthetic Storage row' using errcode='P9001';
  exception when sqlstate 'P9001' then null;
  end;

  execute 'set local role authenticated';
  perform public.delete_own_account();
  execute 'reset role';

  if exists(select 1 from auth.users where id=owner)
    or exists(select 1 from auth.identities where user_id=owner)
    or exists(select 1 from auth.sessions where user_id=owner)
    or exists(select 1 from auth.refresh_tokens where user_id=owner::text)
    or exists(select 1 from public.profiles where id=owner)
    or exists(select 1 from public.user_preferences where user_id=owner)
    or exists(select 1 from public.recipes where id=own_recipe)
    or exists(select 1 from public.recipe_steps where recipe_id=own_recipe)
    or exists(select 1 from public.recipe_saves where user_id=owner)
    or exists(select 1 from public.recipe_versions where created_by=owner)
    or exists(select 1 from public.user_bean_inventory where user_id=owner)
    or exists(select 1 from public.brew_logs where user_id=owner)
    or exists(select 1 from public.posts where user_id=owner)
    or exists(select 1 from public.notifications where actor_id=owner)
    or exists(select 1 from public.audit_logs where actor_id=owner)
    or exists(select 1 from public.moderation_actions where moderator_id=owner)
    or exists(select 1 from public.recipe_verifications where verified_by=owner)
    or exists(select 1 from public.ingestion_reviews where reviewer_id=owner)
    or exists(select 1 from public.data_import_jobs where created_by=owner)
    or exists(select 1 from public.research_jobs where created_by=owner)
    or exists(select 1 from public.green_coffees where id=green)
    or exists(select 1 from public.roast_profiles where id=roast)
    or exists(select 1 from public.roast_events where roast_id=roast)
    or exists(select 1 from public.recipe_search_documents where recipe_id=own_recipe)
  then raise exception 'Owned records or sessions survived account deletion'; end if;
  if not exists(select 1 from auth.users where id=other_user)
    or not exists(select 1 from public.recipes where id=other_recipe)
    or not exists(select 1 from public.user_roles where id=grant_id and granted_by is null)
  then raise exception 'Unrelated account, recipe or granted role was modified'; end if;

  execute 'set local role authenticated';
  rejected := false;
  begin
    insert into storage.objects(bucket_id,name,owner_id) values('avatars',owner||'/after-deletion.webp',owner::text);
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'A deleted account JWT could upload new files'; end if;
  execute 'reset role';

  rejected := false;
  begin
    perform public.delete_own_account();
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'A deleted identity was accepted'; end if;
end;
$test$;
rollback;
select 'PASS: rollback-only account deletion, media guard, JWT storage denial and unrelated-account isolation' as result;
