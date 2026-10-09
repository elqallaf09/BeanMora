-- Every message expires 24 hours after the server accepts it. Clients cannot
-- extend retention by supplying their own created_at/expires_at values.
alter table public.direct_messages add column expires_at timestamptz;
update public.direct_messages set expires_at=created_at+interval '24 hours';
alter table public.direct_messages alter column expires_at set not null;
alter table public.direct_messages alter column expires_at set default (now()+interval '24 hours');
create index direct_messages_expiry_idx on public.direct_messages(expires_at);
create or replace function private.set_direct_message_expiry()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.created_at:=now();new.expires_at:=new.created_at+interval '24 hours';return new;end $$;
revoke all on function private.set_direct_message_expiry() from public,anon,authenticated;
create trigger direct_message_expiry before insert on public.direct_messages for each row execute function private.set_direct_message_expiry();
drop policy "participants read private messages" on public.direct_messages;
create policy "participants read unexpired private messages" on public.direct_messages for select to authenticated
 using(expires_at>now() and exists(select 1 from public.direct_conversations c where c.id=conversation_id));
-- An unsent upload is readable by its owner for at most 24 hours; a sent upload
-- is readable only while an exact message remains visible to that participant.
drop policy "voice read by sender or exact message participants" on storage.objects;
create policy "unexpired voice by sender or exact participants" on storage.objects for select to authenticated
 using(bucket_id='direct-audio' and ((split_part(name,'/',1)=(select auth.uid())::text and created_at>now()-interval '24 hours') or exists(select 1 from public.direct_messages m where m.audio_path=name)));

-- Queue physical Storage deletion separately so API failures can be retried.
create table private.direct_audio_cleanup(path text primary key,enqueued_at timestamptz not null default now());
alter table private.direct_audio_cleanup enable row level security;
create policy "service maintains expired voice cleanup" on private.direct_audio_cleanup to service_role using(true) with check(true);
revoke all on private.direct_audio_cleanup from public,anon,authenticated;
grant all on private.direct_audio_cleanup to service_role;
create or replace function private.queue_deleted_direct_audio()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.audio_path is not null then insert into private.direct_audio_cleanup(path) values(old.audio_path) on conflict do nothing;end if;
 return old;
end $$;
revoke all on function private.queue_deleted_direct_audio() from public,anon,authenticated;
create trigger queue_deleted_direct_audio after delete on public.direct_messages for each row execute function private.queue_deleted_direct_audio();
create or replace function private.valid_direct_voice(p_path text,p_seconds numeric)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.direct_voice_checks v join storage.objects o on o.id=v.object_id
 where v.user_id=(select auth.uid()) and v.path=p_path and o.bucket_id='direct-audio' and o.name=p_path and v.duration_seconds=p_seconds
 and o.created_at>now()-interval '24 hours' and not exists(select 1 from private.direct_audio_cleanup q where q.path=p_path))
$$;
revoke all on function private.valid_direct_voice(text,numeric) from public,anon;
grant execute on function private.valid_direct_voice(text,numeric) to authenticated;
create or replace function public.purge_expired_direct_messages()
returns setof text language plpgsql security invoker set search_path='' as $$
begin
 delete from public.direct_messages where expires_at<=now();
 insert into private.direct_audio_cleanup(path)
 select o.name from storage.objects o where o.bucket_id='direct-audio' and o.created_at<=now()-interval '24 hours'
 and not exists(select 1 from public.direct_messages m where m.audio_path=o.name and m.expires_at>now()) on conflict do nothing;
 return query select q.path from private.direct_audio_cleanup q
 where not exists(select 1 from public.direct_messages m where m.audio_path=q.path and m.expires_at>now()) order by q.enqueued_at limit 200;
end $$;
revoke all on function public.purge_expired_direct_messages() from public,anon,authenticated;
grant execute on function public.purge_expired_direct_messages() to service_role;
create or replace function public.complete_direct_audio_cleanup(p_paths text[])
returns void language sql security invoker set search_path='' as $$
 delete from private.direct_audio_cleanup where path=any(p_paths)
 and not exists(select 1 from public.direct_messages m where m.audio_path=path and m.expires_at>now())
$$;
revoke all on function public.complete_direct_audio_cleanup(text[]) from public,anon,authenticated;
grant execute on function public.complete_direct_audio_cleanup(text[]) to service_role;
notify pgrst,'reload schema';
