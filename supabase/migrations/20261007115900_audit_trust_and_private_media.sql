-- Audit S-02/S-03: RLS controls rows; triggers protect privileged columns.
-- SECURITY INVOKER preserves the actual database role. Trusted maintenance and
-- admin-only definers keep working; JWT user_metadata is never consulted.
create or replace function private.guard_trust_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  field text;
  protected text[];
  previous jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  incoming jsonb := to_jsonb(new);
begin
  if current_user not in ('anon','authenticated') or (select private.has_role('admin')) then return new; end if;
  if tg_table_name = 'profiles' then
    if (tg_op = 'INSERT' and new.is_verified) or
       (tg_op = 'UPDATE' and new.is_verified is distinct from old.is_verified) then
      raise exception 'PROFILE_VERIFICATION_ADMIN_REQUIRED' using errcode='42501';
    end if;
  elsif tg_table_name = 'recipes' then
    if new.recipe_type not in ('personal','community') or
       (tg_op = 'UPDATE' and old.recipe_type not in ('personal','community')) then
      raise exception 'RECIPE_VERIFICATION_ADMIN_REQUIRED' using errcode='42501';
    end if;
  elsif tg_table_name = 'posts' then
    if not (select private.has_role('moderator')) and
       ((tg_op='INSERT' and new.is_hidden) or (tg_op='UPDATE' and new.is_hidden is distinct from old.is_hidden)) then
      raise exception 'POST_MODERATION_ROLE_REQUIRED' using errcode='42501';
    end if;
  else
    protected := array['is_verified','verified_by','last_verified_at','data_confidence','requires_review','source_type'];
    if tg_op='UPDATE' then
      foreach field in array protected loop
        if incoming -> field is distinct from previous -> field then
          raise exception 'CATALOG_REVIEW_ADMIN_REQUIRED' using errcode='42501';
        end if;
      end loop;
    end if;
    if tg_table_name='beans' then
      -- User contributions always re-enter review. Never publish them merely
      -- because the historical column default was true.
      new.is_published := false;
      new.requires_review := true;
      new.data_confidence := 'unverified';
      new.last_verified_at := null;
      new.source_type := 'user_submitted';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_trust_fields() from public,anon,authenticated;
create trigger guard_profile_trust before insert or update on public.profiles for each row execute function private.guard_trust_fields();
create trigger guard_recipe_trust before insert or update on public.recipes for each row execute function private.guard_trust_fields();
create trigger guard_roaster_trust before insert or update on public.roasters for each row execute function private.guard_trust_fields();
create trigger guard_bean_trust before insert or update on public.beans for each row execute function private.guard_trust_fields();
create trigger guard_post_moderation before insert or update on public.posts for each row execute function private.guard_trust_fields();

-- A trusted recipe's steps/sources must not be replaceable underneath its badge.
create or replace function private.guard_verified_recipe_children()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') and not (select private.has_role('admin')) then
    if tg_table_name='recipe_sources' and tg_op<>'DELETE' then
      if new.source_type not in ('user_submitted','roaster_submitted')
        or new.data_confidence not in ('unverified','community_submitted')
        or new.last_verified_at is not null then
        raise exception 'SOURCE_VERIFICATION_ADMIN_REQUIRED' using errcode='42501';
      end if;
    end if;
    if exists(select 1 from public.recipes r where r.id in (
      case when tg_op <> 'DELETE' then new.recipe_id end,
      case when tg_op <> 'INSERT' then old.recipe_id end
    ) and r.recipe_type not in ('personal','community')) then
      raise exception 'RECIPE_VERIFICATION_ADMIN_REQUIRED' using errcode='42501';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.guard_verified_recipe_children() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['recipe_steps','recipe_pours','recipe_equipment','recipe_images','recipe_sources','recipe_versions','xbloom_recipe_profiles'] loop
    execute format('create trigger guard_verified_recipe_content before insert or update or delete on public.%I for each row execute function private.guard_verified_recipe_children()',t);
  end loop;
end $$;

-- Audit S-07. No objects existed at audit time. Keep media private and authorize
-- public reads only when the owner linked this exact path to public content.
update storage.buckets set public=false where id in ('post-media','recipe-videos','recipe-images');
create or replace function private.can_read_content_media(bucket text, object_name text)
returns boolean language sql stable security invoker set search_path = '' as $$
 select
   (split_part(object_name,'/',1) = (select auth.uid())::text)
   or (select private.has_role('admin'))
   or (bucket='post-media' and exists (
     select 1 from public.post_media m join public.posts p on p.id=m.post_id
     where p.user_id::text=split_part(object_name,'/',1)
       and p.visibility='public' and not p.is_hidden
       and (m.url=object_name or m.url='storage://' || bucket || '/' || object_name
         or split_part(m.url,'/storage/v1/object/public/' || bucket || '/',2)=object_name)
   ))
   or (bucket in ('recipe-videos','recipe-images') and exists (
     select 1 from public.recipes r
     where r.user_id::text=split_part(object_name,'/',1)
       and r.visibility in ('public','unlisted')
       and ((bucket='recipe-videos' and (r.video_url=object_name or r.video_url='storage://' || bucket || '/' || object_name
         or split_part(r.video_url,'/storage/v1/object/public/' || bucket || '/',2)=object_name))
       or (bucket='recipe-images' and (r.cover_image_path=object_name
         or exists(select 1 from public.recipe_images i where i.recipe_id=r.id and
           (i.url=object_name or i.url='storage://' || bucket || '/' || object_name
            or split_part(i.url,'/storage/v1/object/public/' || bucket || '/',2)=object_name)))))
   ));
$$;
revoke all on function private.can_read_content_media(text,text) from public;
grant execute on function private.can_read_content_media(text,text) to anon,authenticated;
-- Restrictive policy also constrains any existing permissive policy; ownership
-- write policies remain in place for upload, replacement and account deletion.
create policy "content media follows parent visibility" on storage.objects
 as restrictive for select to anon,authenticated
 using (bucket_id not in ('post-media','recipe-videos','recipe-images')
   or private.can_read_content_media(bucket_id,name));
create policy "read authorized content media" on storage.objects
 for select to anon,authenticated
 using (bucket_id in ('post-media','recipe-videos','recipe-images')
   and private.can_read_content_media(bucket_id,name));

-- These child tables previously exposed metadata of unpublished beans.
create policy "bean image visibility follows parent" on public.bean_images
 as restrictive for select to anon,authenticated
 using (exists(select 1 from public.beans b where b.id=bean_id));
create policy "bean flavors visibility follows parent" on public.bean_flavor_notes
 as restrictive for select to anon,authenticated
 using (exists(select 1 from public.beans b where b.id=bean_id));
