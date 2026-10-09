-- Restrict table privileges as well as rows; project default grants include
-- TRUNCATE, which RLS does not guard. Public clients receive only needed verbs.
revoke all on public.social_sanctions,public.direct_message_preferences,public.direct_conversations,public.direct_messages,public.coffee_stories from anon,authenticated;
grant select on public.social_sanctions to authenticated;
grant select,insert,update,delete on public.direct_message_preferences to authenticated;
grant select,insert on public.direct_conversations to authenticated;
grant select,insert,delete on public.direct_messages to authenticated;
grant select on public.coffee_stories to anon;
grant select,insert,delete on public.coffee_stories to authenticated;
revoke all on private.direct_voice_checks from anon,authenticated;
create policy "server voice validation only" on private.direct_voice_checks for all to service_role using(true) with check(true);

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in ('like','comment','follow','recipe_save','reply','new_recipe_from_followed','verification_approved','xbloom_sync_status','saved_recipe_updated','story_warning','community_suspended'));
alter table public.notifications drop constraint notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check check(entity_type in ('recipe','post','comment','profile','xbloom_sync_job','story'));

create or replace function private.review_coffee_story(p_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare item public.coffee_stories; count_strikes integer;
begin
 if (select auth.uid()) is null or not ((select private.has_role('admin')) or (select private.has_role('moderator'))) then raise exception 'MODERATOR_REQUIRED' using errcode='42501';end if;
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
