-- Avoid planner recursion between Story INSERT checks and Storage SELECT
-- policies. This helper exposes only the caller's exact owned object existence.
create or replace function private.owns_social_media(p_bucket text,p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select p_bucket in ('coffee-stories','post-media','profile-gallery','direct-audio')
 and split_part(p_path,'/',1)=(select auth.uid())::text
 and exists(select 1 from storage.objects o where o.bucket_id=p_bucket and o.name=p_path and o.owner_id=(select auth.uid())::text)
$$;
revoke all on function private.owns_social_media(text,text) from public,anon;
grant execute on function private.owns_social_media(text,text) to authenticated;
alter policy "members submit coffee stories for review" on public.coffee_stories
 with check(user_id=(select auth.uid()) and private.social_member_active(user_id) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
 and status='pending' and expires_at is null and reviewed_by is null and reviewed_at is null and review_reason is null
 and private.owns_social_media('coffee-stories',media_path));
notify pgrst,'reload schema';
