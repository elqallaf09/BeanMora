-- Forward hardening: historical anonymous follow rows must never unlock a private profile.
create or replace function private.can_view_member(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=p_user and (
  not p.is_private or (coalesce((select auth.jwt()->>'is_anonymous'),'true')='false' and exists(
   select 1 from public.follows f where f.following_id=p_user and f.follower_id=(select auth.uid()) and f.status='accepted'))))
$$;
revoke all on function private.can_view_member(uuid) from public;
grant execute on function private.can_view_member(uuid) to anon,authenticated;
