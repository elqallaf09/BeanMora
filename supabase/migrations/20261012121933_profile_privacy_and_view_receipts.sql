-- Independent list privacy and owner-only, unique member view records.
alter table public.profiles add column hide_followers boolean not null default false;
alter table public.profiles add column hide_following boolean not null default false;

create or replace function private.can_view_follow_list(p_user uuid, p_direction text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_user=(select auth.uid()),false) or (
  private.can_view_member(p_user) and exists(select 1 from public.profiles p where p.id=p_user and
   case p_direction when 'followers' then not p.hide_followers when 'following' then not p.hide_following else false end))
$$;
revoke all on function private.can_view_follow_list(uuid,text) from public;
grant execute on function private.can_view_follow_list(uuid,text) to anon,authenticated;

-- Preserve the permissive base SELECT and enforce privacy with a restrictive
-- policy, including raw REST queries and the following-feed query.
drop policy "follow graph respects private accounts" on public.follows;
create policy "follow graph respects private accounts" on public.follows as restrictive
for select to anon,authenticated using (
 follower_id=(select auth.uid()) or following_id=(select auth.uid()) or
 (status='accepted' and private.can_view_follow_list(follower_id,'following') and private.can_view_follow_list(following_id,'followers'))
);

-- Extend the audited profile projection without losing country/media rules.
do $profile$
declare definition text:=pg_get_functiondef('public.get_member_profile(text)'::regprocedure);
begin
 if strpos(definition,$old$'follower_count',(select count(*)$old$)=0 or
    strpos(definition,$old$'following_count',(select count(*)$old$)=0 or
    strpos(definition,$old$'followers',coalesce$old$)=0 or
    strpos(definition,$old$'following',coalesce$old$)=0 then raise exception 'PROFILE_FOLLOW_PROJECTION_DRIFT';end if;
 definition:=replace(definition,$old$'share_collection',case when own then p.share_collection else null end$old$,
  $new$'hide_followers',case when own then p.hide_followers else null end,'hide_following',case when own then p.hide_following else null end,'share_collection',case when own then p.share_collection else null end$new$);
 definition:=replace(definition,$old$'follower_count',(select count(*) from public.follows f where f.following_id=p.id and f.status='accepted')$old$,
  $new$'can_view_followers',coalesce(private.can_view_follow_list(p.id,'followers'),false),'follower_count',case when private.can_view_follow_list(p.id,'followers') then (select count(*) from public.follows f where f.following_id=p.id and f.status='accepted') else null end$new$);
 definition:=replace(definition,$old$'following_count',(select count(*) from public.follows f where f.follower_id=p.id and f.status='accepted')$old$,
  $new$'can_view_following',coalesce(private.can_view_follow_list(p.id,'following'),false),'following_count',case when private.can_view_follow_list(p.id,'following') then (select count(*) from public.follows f where f.follower_id=p.id and f.status='accepted') else null end$new$);
 definition:=replace(definition,$old$from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='accepted'$old$,
  $new$from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='accepted' and private.can_view_follow_list(p.id,'followers') and (viewer=f.follower_id or own or private.can_view_follow_list(f.follower_id,'following'))$new$);
 definition:=replace(definition,$old$from public.follows f join public.profiles pr on pr.id=f.following_id where f.follower_id=p.id and f.status='accepted'$old$,
  $new$from public.follows f join public.profiles pr on pr.id=f.following_id where f.follower_id=p.id and f.status='accepted' and private.can_view_follow_list(p.id,'following') and (viewer=f.following_id or own or private.can_view_follow_list(f.following_id,'followers'))$new$);
 execute definition;
end $profile$;

create table public.profile_visits (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 visitor_id uuid not null references public.profiles(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 primary key(profile_id,visitor_id),check(profile_id<>visitor_id)
);
create index profile_visits_recent_idx on public.profile_visits(profile_id,viewed_at desc);
create index profile_visits_visitor_idx on public.profile_visits(visitor_id);
alter table public.profile_visits enable row level security;
create policy "owners read their recent profile visitors" on public.profile_visits
for select to authenticated using(profile_id=(select auth.uid()) and viewed_at>now()-interval '30 days');
revoke all on public.profile_visits from anon,authenticated;
grant select on public.profile_visits to authenticated;
grant all on public.profile_visits to service_role;

create table public.coffee_story_views (
 story_id uuid not null references public.coffee_stories(id) on delete cascade,
 viewer_id uuid not null references public.profiles(id) on delete cascade,
 viewed_at timestamptz not null default now(),primary key(story_id,viewer_id)
);
create index coffee_story_views_recent_idx on public.coffee_story_views(story_id,viewed_at desc);
create index coffee_story_views_viewer_idx on public.coffee_story_views(viewer_id);
alter table public.coffee_story_views enable row level security;
create policy "only story owners read viewers" on public.coffee_story_views
for select to authenticated using(exists(select 1 from public.coffee_stories s where s.id=story_id and s.user_id=(select auth.uid())));
revoke all on public.coffee_story_views from anon,authenticated;
grant select on public.coffee_story_views to authenticated;
grant all on public.coffee_story_views to service_role;

-- Definers are limited to private write helpers because viewers must not have
-- INSERT/UPDATE permissions on analytics tables. Both derive auth.uid(), check
-- the actual Auth member, privacy, expiry, blocks, and assign server time.
create or replace function private.record_profile_visit(p_profile_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare viewer uuid:=(select auth.uid());
begin
 if viewer is null or viewer=p_profile_id or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' or
    not private.social_member_active(viewer) or not private.can_view_member(p_profile_id) or
    not exists(select 1 from auth.users u where u.id=p_profile_id and not coalesce(u.is_anonymous,true)) or
    exists(select 1 from public.blocks b where (b.blocker_id=viewer and b.blocked_id=p_profile_id) or (b.blocker_id=p_profile_id and b.blocked_id=viewer)) then return false;end if;
 insert into public.profile_visits(profile_id,visitor_id) values(p_profile_id,viewer)
 on conflict(profile_id,visitor_id) do update set viewed_at=now();
 return true;
end $$;
revoke all on function private.record_profile_visit(uuid) from public,anon;
grant execute on function private.record_profile_visit(uuid) to authenticated;
create or replace function public.record_profile_visit(p_profile_id uuid)
returns boolean language sql security invoker set search_path='' as $$ select private.record_profile_visit(p_profile_id) $$;
revoke all on function public.record_profile_visit(uuid) from public,anon;
grant execute on function public.record_profile_visit(uuid) to authenticated;

create or replace function private.record_coffee_story_view(p_story_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare viewer uuid:=(select auth.uid()); author uuid;
begin
 if viewer is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' or not private.social_member_active(viewer) then return false;end if;
 select s.user_id into author from public.coffee_stories s where s.id=p_story_id and s.status='approved' and s.expires_at>now();
 if author is null or author=viewer or not private.can_view_member(author) or
    exists(select 1 from public.blocks b where (b.blocker_id=viewer and b.blocked_id=author) or (b.blocker_id=author and b.blocked_id=viewer)) then return false;end if;
 insert into public.coffee_story_views(story_id,viewer_id) values(p_story_id,viewer) on conflict(story_id,viewer_id) do nothing;
 return true;
end $$;
revoke all on function private.record_coffee_story_view(uuid) from public,anon;
grant execute on function private.record_coffee_story_view(uuid) to authenticated;
create or replace function public.record_coffee_story_view(p_story_id uuid)
returns boolean language sql security invoker set search_path='' as $$ select private.record_coffee_story_view(p_story_id) $$;
revoke all on function public.record_coffee_story_view(uuid) from public,anon;
grant execute on function public.record_coffee_story_view(uuid) to authenticated;

notify pgrst,'reload schema';
