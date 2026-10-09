-- A dedicated story reviewer can approve/reject coffee stories, without broad
-- admin/moderator access to recipes, member accounts, or direct messages.
create table private.coffee_story_reviewers (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table private.coffee_story_reviewers enable row level security;
revoke all on private.coffee_story_reviewers from public,anon,authenticated;
grant all on private.coffee_story_reviewers to service_role;
create policy "server configures story reviewers" on private.coffee_story_reviewers for all to service_role using(true) with check(true);
create or replace function private.can_review_coffee_stories()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
 and exists(select 1 from auth.users where id=(select auth.uid()) and not coalesce(is_anonymous,true))
 and ((select private.has_role('admin')) or (select private.has_role('moderator')) or exists(select 1 from private.coffee_story_reviewers where user_id=(select auth.uid())))
$$;
revoke all on function private.can_review_coffee_stories() from public;
grant execute on function private.can_review_coffee_stories() to anon,authenticated;
create or replace function public.can_review_coffee_stories()
returns boolean language sql stable security invoker set search_path='' as $$select private.can_review_coffee_stories()$$;
revoke all on function public.can_review_coffee_stories() from public,anon;
grant execute on function public.can_review_coffee_stories() to authenticated;
alter policy "reviewed stories follow privacy and expiry" on public.coffee_stories
 using((status='approved' and expires_at>now() and private.can_view_member(user_id)) or user_id=(select auth.uid()) or (select private.can_review_coffee_stories()));
alter policy "own sanctions or moderator review" on public.social_sanctions
 using(user_id=(select auth.uid()) or (select private.can_review_coffee_stories()));

create or replace function private.review_coffee_story(p_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare item public.coffee_stories; count_strikes integer;
begin
 if not coalesce((select private.can_review_coffee_stories()),false) then raise exception 'MODERATOR_REQUIRED' using errcode='42501';end if;
 select * into item from public.coffee_stories where id=p_id;
 if not found then raise exception 'STORY_NOT_FOUND';end if;
 perform 1 from public.profiles where id=item.user_id for update;
 select * into item from public.coffee_stories where id=p_id for update;
 if item.status<>'pending' then return item.status;end if;
 if p_approve then
  if not private.social_member_active(item.user_id) then raise exception 'MEMBER_SUSPENDED';end if;
  update public.coffee_stories set status='approved',expires_at=now()+interval '24 hours',reviewed_by=(select auth.uid()),reviewed_at=now(),review_reason=null where id=p_id;
  return 'approved';
 end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'REVIEW_REASON_REQUIRED';end if;
 update public.coffee_stories set status='rejected',reviewed_by=(select auth.uid()),reviewed_at=now(),review_reason=left(trim(p_reason),1000) where id=p_id;
 insert into public.social_sanctions(user_id,strikes,reason) values(item.user_id,1,left(trim(p_reason),1000))
 on conflict(user_id) do update set strikes=public.social_sanctions.strikes+1,reason=excluded.reason,updated_at=now() returning strikes into count_strikes;
 if count_strikes>=2 then
  update public.social_sanctions set banned_at=coalesce(banned_at,now()) where user_id=item.user_id;
  update public.coffee_stories set status='rejected',review_reason='Community suspension after repeated off-topic content' where user_id=item.user_id and status='approved';
 end if;
 insert into public.notifications(user_id,actor_id,type,entity_type,entity_id) values(item.user_id,(select auth.uid()),case when count_strikes>=2 then 'community_suspended' else 'story_warning' end,'story',p_id);
 return case when count_strikes>=2 then 'banned' else 'warned' end;
end $$;
notify pgrst,'reload schema';
