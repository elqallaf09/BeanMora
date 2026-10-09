-- Private messaging, reviewed coffee stories, and owned content management.
-- All additions preserve existing member data. No messages are publicly readable.
create table public.social_sanctions (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 strikes integer not null default 0 check(strikes>=0),
 banned_at timestamptz, reason text, updated_at timestamptz not null default now()
);
alter table public.social_sanctions enable row level security;
create policy "own sanctions or moderator review" on public.social_sanctions for select to authenticated
 using(user_id=(select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator')));
grant select on public.social_sanctions to authenticated;
grant all on public.social_sanctions to service_role;

create or replace function private.social_member_active(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=p_user and not coalesce(u.is_anonymous,true))
 and not exists(select 1 from public.social_sanctions s where s.user_id=p_user and s.banned_at is not null)
$$;
revoke all on function private.social_member_active(uuid) from public,anon;
grant execute on function private.social_member_active(uuid) to authenticated;

create table public.direct_message_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 audience text not null default 'everyone' check(audience in ('everyone','followers','off'))
);
alter table public.direct_message_preferences enable row level security;
create policy "own message preference" on public.direct_message_preferences for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and not (select private.is_guest()));
grant select,insert,update,delete on public.direct_message_preferences to authenticated;
grant all on public.direct_message_preferences to service_role;

-- The receiver's preferences and either member's block list are evaluated on
-- every send, including old conversations. Followers means accepted followers
-- of the receiver, not accounts the receiver follows.
create or replace function private.can_send_direct(p_sender uuid,p_receiver uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_sender=(select auth.uid()) and p_sender<>p_receiver
 and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
 and private.social_member_active(p_sender) and private.social_member_active(p_receiver)
 and not exists(select 1 from public.blocks b where (b.blocker_id=p_sender and b.blocked_id=p_receiver) or (b.blocker_id=p_receiver and b.blocked_id=p_sender))
 and case coalesce((select d.audience from public.direct_message_preferences d where d.user_id=p_receiver),'everyone')
  when 'everyone' then true when 'followers' then exists(select 1 from public.follows f where f.follower_id=p_sender and f.following_id=p_receiver and f.status='accepted') else false end
$$;
revoke all on function private.can_send_direct(uuid,uuid) from public,anon;
grant execute on function private.can_send_direct(uuid,uuid) to authenticated;
create or replace function public.can_direct_message(p_recipient uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select private.can_send_direct((select auth.uid()),p_recipient)
$$;
revoke all on function public.can_direct_message(uuid) from public,anon;
grant execute on function public.can_direct_message(uuid) to authenticated;

create table public.direct_conversations (
 id uuid primary key default gen_random_uuid(),
 user_a uuid not null references public.profiles(id) on delete cascade,
 user_b uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(user_a,user_b),constraint ordered_direct_members check(user_a<user_b)
);
create index direct_conversations_b_idx on public.direct_conversations(user_b);
alter table public.direct_conversations enable row level security;
create policy "participants read conversations" on public.direct_conversations for select to authenticated
 using((select auth.uid()) in (user_a,user_b) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "members start permitted conversations" on public.direct_conversations for insert to authenticated
 with check(private.can_send_direct((select auth.uid()),case when user_a=(select auth.uid()) then user_b else user_a end) and (select auth.uid()) in (user_a,user_b));
grant select,insert on public.direct_conversations to authenticated;
grant all on public.direct_conversations to service_role;
create or replace function public.start_direct_conversation(p_recipient uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a uuid:=least((select auth.uid()),p_recipient); b uuid:=greatest((select auth.uid()),p_recipient); result uuid;
begin
 if not coalesce(private.can_send_direct((select auth.uid()),p_recipient),false) then raise exception 'MESSAGES_CLOSED' using errcode='42501';end if;
 insert into public.direct_conversations(user_a,user_b) values(a,b) on conflict(user_a,user_b) do nothing;
 select id into result from public.direct_conversations where user_a=a and user_b=b;
 return result;
end $$;
revoke all on function public.start_direct_conversation(uuid) from public,anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- Only the audio verifier (service role) can register the actual container
-- duration. File identity prevents deleting/reuploading a longer file at the
-- same previously validated path. Neither client duration nor MIME is trusted.
create table private.direct_voice_checks (
 object_id uuid primary key references storage.objects(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 path text not null, duration_seconds numeric not null check(duration_seconds>0 and duration_seconds<=60),
 content_sha256 text not null, created_at timestamptz not null default now()
);
grant usage on schema private to service_role;
alter table private.direct_voice_checks enable row level security;
grant all on private.direct_voice_checks to service_role;
create or replace function public.record_direct_voice_check(p_owner uuid,p_path text,p_seconds numeric,p_sha256 text)
returns numeric language plpgsql security invoker set search_path='' as $$
declare object_id uuid;
begin
 if p_path not like p_owner::text||'/%' or length(p_sha256)<>64 then raise exception 'VOICE_PATH';end if;
 select id into object_id from storage.objects where bucket_id='direct-audio' and name=p_path;
 if not found then raise exception 'VOICE_FILE_MISSING';end if;
 insert into private.direct_voice_checks(object_id,user_id,path,duration_seconds,content_sha256) values(object_id,p_owner,p_path,p_seconds,p_sha256)
 on conflict(object_id) do update set duration_seconds=excluded.duration_seconds,content_sha256=excluded.content_sha256;
 return p_seconds;
end $$;
revoke all on function public.record_direct_voice_check(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.record_direct_voice_check(uuid,text,numeric,text) to service_role;
create or replace function private.valid_direct_voice(p_path text,p_seconds numeric)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.direct_voice_checks v join storage.objects o on o.id=v.object_id
 where v.user_id=(select auth.uid()) and v.path=p_path and o.bucket_id='direct-audio' and o.name=p_path and v.duration_seconds=p_seconds)
$$;
revoke all on function private.valid_direct_voice(text,numeric) from public,anon;
grant execute on function private.valid_direct_voice(text,numeric) to authenticated;

create table public.direct_messages (
 id uuid primary key, conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('text','post','audio')),
 body text check(length(body)<=3000),
 post_id uuid references public.posts(id) on delete set null,
 audio_path text, duration_seconds numeric,
 created_at timestamptz not null default now(),
 constraint direct_payload check(coalesce(
  (kind='text' and length(trim(body)) between 1 and 3000 and post_id is null and audio_path is null and duration_seconds is null)
  or (kind='post' and audio_path is null and duration_seconds is null)
  or (kind='audio' and body is null and post_id is null and audio_path like sender_id::text||'/'||conversation_id::text||'/%' and duration_seconds>0 and duration_seconds<=60),false))
);
create index direct_messages_thread_idx on public.direct_messages(conversation_id,created_at desc,id);
create index direct_messages_sender_idx on public.direct_messages(sender_id);
create index direct_messages_post_idx on public.direct_messages(post_id) where post_id is not null;
alter table public.direct_messages enable row level security;
create policy "participants read private messages" on public.direct_messages for select to authenticated
 using(exists(select 1 from public.direct_conversations c where c.id=conversation_id));
create policy "members send to allowed recipients" on public.direct_messages for insert to authenticated
 with check(sender_id=(select auth.uid()) and exists(select 1 from public.direct_conversations c where c.id=conversation_id and private.can_send_direct(sender_id,case when c.user_a=sender_id then c.user_b else c.user_a end))
 and (kind<>'post' or exists(select 1 from public.posts p where p.id=post_id and p.visibility='public' and not p.is_hidden))
 and (kind<>'audio' or private.valid_direct_voice(audio_path,duration_seconds)));
create policy "senders remove their own messages" on public.direct_messages for delete to authenticated using(sender_id=(select auth.uid()));
grant select,insert,delete on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('direct-audio','direct-audio',false,8388608,array['audio/mp4','audio/m4a','audio/webm','audio/wav','audio/ogg']) on conflict(id) do nothing;
create policy "members upload private voice" on storage.objects for insert to authenticated
 with check(bucket_id='direct-audio' and split_part(name,'/',1)=(select auth.uid())::text and private.social_member_active((select auth.uid()))
 and exists(select 1 from public.direct_conversations c where c.id::text=split_part(name,'/',2) and private.can_send_direct((select auth.uid()),case when c.user_a=(select auth.uid()) then c.user_b else c.user_a end)));
create policy "voice read by sender or exact message participants" on storage.objects for select to authenticated
 using(bucket_id='direct-audio' and (split_part(name,'/',1)=(select auth.uid())::text or exists(select 1 from public.direct_messages m where m.audio_path=name)));
create policy "owners remove private voice" on storage.objects for delete to authenticated
 using(bucket_id='direct-audio' and split_part(name,'/',1)=(select auth.uid())::text);

create table public.coffee_stories (
 id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
 media_path text not null unique, media_type text not null check(media_type in ('image','video')),
 category text not null check(category in ('coffee','brewing','equipment','coffee_corner')),
 caption text not null default '' check(length(caption)<=1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 rights_confirmed boolean not null check(rights_confirmed),
 created_at timestamptz not null default now(), expires_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, review_reason text,
 constraint owned_story_path check(media_path like user_id::text||'/%')
);
create index coffee_stories_author_idx on public.coffee_stories(user_id,created_at desc);
create index coffee_stories_feed_idx on public.coffee_stories(expires_at desc) where status='approved';
create index coffee_stories_review_idx on public.coffee_stories(created_at) where status='pending';
create index coffee_stories_reviewer_idx on public.coffee_stories(reviewed_by) where reviewed_by is not null;
alter table public.coffee_stories enable row level security;
create policy "reviewed stories follow privacy and expiry" on public.coffee_stories for select to anon,authenticated
 using((status='approved' and expires_at>now() and private.can_view_member(user_id)) or user_id=(select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "members submit coffee stories for review" on public.coffee_stories for insert to authenticated
 with check(user_id=(select auth.uid()) and private.social_member_active(user_id) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
 and status='pending' and expires_at is null and reviewed_by is null and reviewed_at is null and review_reason is null
 and exists(select 1 from storage.objects o where o.bucket_id='coffee-stories' and o.name=media_path));
create policy "owners remove stories" on public.coffee_stories for delete to authenticated using(user_id=(select auth.uid()));
grant select on public.coffee_stories to anon;
grant select,insert,delete on public.coffee_stories to authenticated;
grant all on public.coffee_stories to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('coffee-stories','coffee-stories',false,15728640,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do nothing;
create policy "members upload owned stories" on storage.objects for insert to authenticated
 with check(bucket_id='coffee-stories' and split_part(name,'/',1)=(select auth.uid())::text and private.social_member_active((select auth.uid())) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "stories sign only visible exact media" on storage.objects for select to anon,authenticated
 using(bucket_id='coffee-stories' and (split_part(name,'/',1)=(select auth.uid())::text or exists(select 1 from public.coffee_stories s where s.media_path=name)));
create policy "owners remove story media" on storage.objects for delete to authenticated using(bucket_id='coffee-stories' and split_part(name,'/',1)=(select auth.uid())::text);

-- Review is centralized, idempotent, and serialized per author. Rejection once
-- gives a warning; a second confirmed off-topic story suspends community writes
-- and direct messages. A report alone never warns or bans a user.
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
 return case when count_strikes>=2 then 'banned' else 'warned' end;
end $$;
revoke all on function private.review_coffee_story(uuid,boolean,text) from public,anon;
grant execute on function private.review_coffee_story(uuid,boolean,text) to authenticated;
create or replace function public.review_coffee_story(p_id uuid,p_approve boolean,p_reason text default '')
returns text language sql security invoker set search_path='' as $$select private.review_coffee_story(p_id,p_approve,p_reason)$$;
revoke all on function public.review_coffee_story(uuid,boolean,text) from public,anon;
grant execute on function public.review_coffee_story(uuid,boolean,text) to authenticated;
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in ('recipe','post','comment','user','story'));

-- All affected writes enforce suspension at the database, including old apps.
do $$ declare t text;begin
 foreach t in array array['posts','comments','post_likes','comment_likes','profile_photos','coffee_comments'] loop
  execute format('create policy "active community member inserts" on public.%I as restrictive for insert to authenticated with check(private.social_member_active((select auth.uid())))',t);
  execute format('create policy "active community member updates" on public.%I as restrictive for update to authenticated using(private.social_member_active((select auth.uid()))) with check(private.social_member_active((select auth.uid())))',t);
 end loop;
end $$;
create policy "active social uploads" on storage.objects as restrictive for insert to authenticated
 with check(bucket_id not in ('post-media','profile-gallery','coffee-stories','direct-audio') or private.social_member_active((select auth.uid())));

alter table public.profile_photos add column updated_at timestamptz not null default now();
create policy "owners edit photo caption and kind" on public.profile_photos for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.profile_photos to authenticated;
create or replace function private.guard_profile_photo_edit()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at then raise exception 'PHOTO_IDENTITY_IMMUTABLE';end if;
 if new.image_path is distinct from old.image_path and (new.image_path not like new.user_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='profile-gallery' and name=new.image_path)) then raise exception 'PHOTO_PATH_INVALID';end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.guard_profile_photo_edit() from public,anon,authenticated;
create trigger profile_photo_edit_guard before update on public.profile_photos for each row execute function private.guard_profile_photo_edit();

-- Media-only posts remain valid, without forcing an espresso tag or filler text.
alter table public.posts add column content_type text not null default 'topic' check(content_type in ('topic','image','video'));
alter table public.posts add column primary_media_path text;
alter table public.posts drop constraint posts_not_empty;
alter table public.posts add constraint posts_not_empty check(length(trim(coalesce(body,'')))>0 or recipe_id is not null or roast_profile_id is not null or primary_media_path is not null);
create or replace function public.save_community_post(p_id uuid,p_body text,p_language text,p_media_path text default null,p_media_type text default null,p_brew_id uuid default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner uuid:=(select auth.uid()); existing public.posts; b public.brew_logs;
begin
 if owner is null or not coalesce(private.social_member_active(owner),false) or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then raise exception 'MEMBER_REQUIRED' using errcode='42501';end if;
 if length(trim(coalesce(p_body,'')))>3000 then raise exception 'POST_LENGTH';end if;
 select * into existing from public.posts where id=p_id;
 if found and existing.user_id<>owner then raise exception 'POST_OWNER_REQUIRED' using errcode='42501';end if;
 if p_media_path is not null and (p_media_path not like owner::text||'/%' or p_media_type not in ('image','video') or not exists(select 1 from storage.objects where bucket_id='post-media' and name=p_media_path)) then raise exception 'POST_MEDIA_INVALID';end if;
 if p_brew_id is not null then
  select * into b from public.brew_logs where id=p_brew_id and user_id=owner;
  if not found then raise exception 'BREW_OWNER_REQUIRED';end if;
 end if;
 if existing.id is not null then
  -- Editing commentary/media preserves the genuine brew/roast facts.
  update public.posts set body=nullif(trim(p_body),''),content_language=p_language,
   primary_media_path=p_media_path,content_type=coalesce(p_media_type,'topic') where id=p_id and user_id=owner;
 else
  insert into public.posts(id,user_id,body,content_language,content_type,primary_media_path,visibility,recipe_id,brew_log_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome)
   values(p_id,owner,nullif(trim(p_body),''),p_language,coalesce(p_media_type,'topic'),p_media_path,'public',b.recipe_id,b.id,b.bean_id,b.brew_method,b.dose_grams,b.water_grams,b.actual_time_seconds,b.outcome_submission->>'outcome');
 end if;
 delete from public.post_media where post_id=p_id;
 if p_media_path is not null then insert into public.post_media(post_id,url,media_type) values(p_id,'storage://post-media/'||p_media_path,p_media_type);end if;
 return p_id;
end $$;
revoke all on function public.save_community_post(uuid,text,text,text,text,uuid) from public,anon;
grant execute on function public.save_community_post(uuid,text,text,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
