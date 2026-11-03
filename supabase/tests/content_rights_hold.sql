-- Run after the migration. This test never commits publication or permission changes.
begin;
set local statement_timeout = '30s';
do $$ declare held_id uuid; before_row jsonb; begin
  if (select count(*) from private.content_rights_holds where active) <> 3957 then raise exception 'archive count'; end if;
  if (select count(*) from public.recipes where rights_suspended) <> 3474 then raise exception 'suspended recipe count'; end if;
  if exists(select 1 from public.beans where is_published and not requires_review and image_url is not null) then raise exception 'bean images remain'; end if;
  if exists(select 1 from public.equipment_models where not requires_review and (image_url is not null or specifications->'catalog'->'images' <> '[]'::jsonb)) then raise exception 'equipment images remain'; end if;
  if exists(select 1 from public.roasters where not requires_review and logo_url is not null) then raise exception 'roaster logos remain'; end if;
  if has_table_privilege('anon','private.content_rights_holds','select') or has_table_privilege('authenticated','private.content_rights_holds','select,insert,update,delete') then raise exception 'archive exposed'; end if;
  if exists(select 1 from pg_trigger where tgname='maintain_recipe_search_documents' and tgenabled='D') then raise exception 'index trigger left disabled'; end if;
  select record_id,original_values into held_id,before_row from private.content_rights_holds where table_name='recipes' limit 1;
  if exists(select 1 from public.recipes where id=held_id and to_jsonb(recipes)-array['rights_suspended','updated_at'] <> before_row-array['rights_suspended','updated_at']) then raise exception 'original recipe changed'; end if;
  update public.recipes set rights_suspended=false where id=held_id;
  if not (select rights_suspended from public.recipes where id=held_id) then raise exception 'reimport bypassed hold'; end if;
  begin
    update private.content_rights_holds set active=false where table_name='recipes' and record_id=held_id;
    raise exception 'release accepted without evidence';
  exception when check_violation then null; end;
end $$;
set local role anon;
do $$ begin
  if (select count(*) from public.recipes where visibility='public') <> 8 then raise exception 'unexpected guest recipe count'; end if;
  if exists(select 1 from public.recipes where rights_suspended) then raise exception 'guest reads held recipes'; end if;
  if exists(select 1 from public.recipe_search_documents d where not exists(select 1 from public.recipes r where r.id=d.recipe_id)) then raise exception 'orphaned visible search document'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.recipes where rights_suspended) then raise exception 'member reads held recipes'; end if;
end $$;
reset role;
-- Definer profile aggregation must obey the same hold for owners as for guests.
do $$ declare item record; d jsonb; section text; begin
  for item in select distinct p.id,p.username from public.profiles p join public.recipes r on r.user_id=p.id where r.rights_suspended and p.username is not null loop
    perform set_config('request.jwt.claim.sub',item.id::text,true);
    d:=public.get_member_profile(item.username);
    foreach section in array array['recipes','favorites'] loop
      if exists(select 1 from jsonb_array_elements(coalesce(d->section,'[]'::jsonb)) e join public.recipes r on r.id=(e->>'id')::uuid where r.rights_suspended) then raise exception 'profile collection exposes held recipe'; end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(coalesce(d->'comments','[]'::jsonb)) e join public.recipes r on r.id=(e->>'target_id')::uuid where e->>'kind'='recipe' and r.rights_suspended) then raise exception 'profile comment exposes held recipe'; end if;
  end loop;
  perform set_config('request.jwt.claim.sub','',true);
end $$;
-- Exercise the documented release path within this rolled-back transaction only.
do $$ declare held_id uuid; begin
  select record_id into held_id from private.content_rights_holds where table_name='recipes' limit 1;
  update private.content_rights_holds set active=false,evidence_reference='TEST ONLY - ROLLED BACK',reviewed_at=now() where table_name='recipes' and record_id=held_id;
  update public.recipes set rights_suspended=false where id=held_id;
  if (select rights_suspended from public.recipes where id=held_id) then raise exception 'reviewed release path failed'; end if;
end $$;
rollback;
