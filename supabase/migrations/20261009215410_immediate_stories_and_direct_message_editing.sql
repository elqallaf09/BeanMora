-- Only a sender can edit commentary, and editing never extends the lifetime.
alter table public.direct_messages add column edited_at timestamptz;
create or replace function private.set_direct_message_expiry()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.created_at:=now();new.expires_at:=new.created_at+interval '24 hours';new.edited_at:=null;return new;end $$;
grant update(body) on public.direct_messages to authenticated;
create policy "senders edit unexpired commentary" on public.direct_messages for update to authenticated
 using(sender_id=(select auth.uid()) and expires_at>now() and kind in ('text','post')
  and private.social_member_active((select auth.uid()))
  and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
  and exists(select 1 from public.direct_conversations c where c.id=conversation_id))
 with check(sender_id=(select auth.uid()) and expires_at>now() and kind in ('text','post')
  and private.social_member_active((select auth.uid()))
  and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
  and exists(select 1 from public.direct_conversations c where c.id=conversation_id));
create or replace function private.guard_direct_message_edit()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and (
  new.id is distinct from old.id or new.conversation_id is distinct from old.conversation_id
  or new.sender_id is distinct from old.sender_id or new.kind is distinct from old.kind
  or new.post_id is distinct from old.post_id or new.audio_path is distinct from old.audio_path
  or new.duration_seconds is distinct from old.duration_seconds
  or new.audio_object_id is distinct from old.audio_object_id
  or new.created_at is distinct from old.created_at or new.expires_at is distinct from old.expires_at
 ) then raise exception 'MESSAGE_IDENTITY_IMMUTABLE' using errcode='42501';end if;
 if new.body is distinct from old.body then
  new.body:=nullif(trim(new.body),'');new.edited_at:=now();
 else new.edited_at:=old.edited_at;end if;
 return new;
end $$;
revoke all on function private.guard_direct_message_edit() from public,anon,authenticated;
create trigger guard_direct_message_edit before update on public.direct_messages
 for each row execute function private.guard_direct_message_edit();

-- Publish on submission, including older clients. Server owns all timestamps
-- and review fields; authors cannot pretend a moderator checked their story.
alter table public.coffee_stories alter column status set default 'approved';
create or replace function private.publish_coffee_story()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.created_at:=now();new.expires_at:=new.created_at+interval '24 hours';new.status:='approved';
 new.reviewed_by:=null;new.reviewed_at:=null;new.review_reason:=null;
 return new;
end $$;
revoke all on function private.publish_coffee_story() from public,anon,authenticated;
create trigger publish_coffee_story before insert on public.coffee_stories
 for each row execute function private.publish_coffee_story();
drop policy "members submit coffee stories for review" on public.coffee_stories;
create policy "members publish owned coffee stories" on public.coffee_stories for insert to authenticated
 with check(user_id=(select auth.uid()) and private.social_member_active(user_id)
 and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
 and status='approved' and expires_at=created_at+interval '24 hours'
 and reviewed_by is null and reviewed_at is null and review_reason is null
 and private.owns_social_media('coffee-stories',media_path));
update public.coffee_stories set status='approved',created_at=now(),expires_at=now()+interval '24 hours'
 where status='pending' and private.social_member_active(user_id);
create index coffee_stories_unreviewed_idx on public.coffee_stories(created_at)
 where status='approved' and reviewed_at is null;
create policy "story reviewers read story reports" on public.reports for select to authenticated
 using(target_type='story' and (select private.can_review_coffee_stories()));

-- Review now happens after publication. Confirming a violation removes the
-- story and notifies its author. Reports alone cannot warn or ban someone.
create or replace function private.review_coffee_story(p_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare item public.coffee_stories; count_strikes integer;
begin
 if not coalesce((select private.can_review_coffee_stories()),false) then raise exception 'MODERATOR_REQUIRED' using errcode='42501';end if;
 select * into item from public.coffee_stories where id=p_id;
 if not found then raise exception 'STORY_NOT_FOUND';end if;
 perform 1 from public.profiles where id=item.user_id for update;
 select * into item from public.coffee_stories where id=p_id for update;
 if not found then raise exception 'STORY_NOT_FOUND';end if;
 if item.status='rejected' then return 'rejected';end if;
 if p_approve then
  if not private.social_member_active(item.user_id) then raise exception 'MEMBER_SUSPENDED';end if;
  update public.coffee_stories set status='approved',expires_at=coalesce(expires_at,created_at+interval '24 hours'),
   reviewed_by=(select auth.uid()),reviewed_at=now(),review_reason=null where id=p_id;
  update public.reports set status='dismissed',reviewed_by=(select auth.uid()),reviewed_at=now()
   where target_type='story' and target_id=p_id and status='open';
  return 'approved';
 end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'REVIEW_REASON_REQUIRED';end if;
 update public.coffee_stories set status='rejected',reviewed_by=(select auth.uid()),reviewed_at=now(),review_reason=left(trim(p_reason),1000) where id=p_id;
 update public.reports set status='actioned',reviewed_by=(select auth.uid()),reviewed_at=now()
  where target_type='story' and target_id=p_id and status='open';
 insert into public.social_sanctions(user_id,strikes,reason) values(item.user_id,1,left(trim(p_reason),1000))
 on conflict(user_id) do update set strikes=public.social_sanctions.strikes+1,reason=excluded.reason,updated_at=now() returning strikes into count_strikes;
 if count_strikes>=2 then
  update public.social_sanctions set banned_at=coalesce(banned_at,now()) where user_id=item.user_id;
  update public.coffee_stories set status='rejected',review_reason='Community suspension after repeated off-topic content' where user_id=item.user_id and status='approved';
 end if;
 insert into public.notifications(user_id,actor_id,type,entity_type,entity_id) values(item.user_id,(select auth.uid()),
  case when count_strikes>=2 then 'community_suspended' else 'story_warning' end,'story',p_id);
 return case when count_strikes>=2 then 'banned' else 'warned' end;
end $$;
notify pgrst,'reload schema';
