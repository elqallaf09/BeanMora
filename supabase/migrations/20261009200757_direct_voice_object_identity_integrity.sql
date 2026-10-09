-- Bind audio to the exact verified object, including download/save and
-- delete/reupload races. Removing that object also removes its message.
alter table public.direct_messages add column audio_object_id uuid references storage.objects(id) on delete cascade;
update public.direct_messages m set audio_object_id=o.id from storage.objects o
 where m.kind='audio' and o.bucket_id='direct-audio' and o.name=m.audio_path;
create index direct_messages_audio_object_idx on public.direct_messages(audio_object_id) where audio_object_id is not null;
create or replace function private.capture_direct_audio_object()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.audio_object_id:=null;
 if new.kind='audio' then
  select o.id into new.audio_object_id from storage.objects o join private.direct_voice_checks v on v.object_id=o.id
   where o.bucket_id='direct-audio' and o.name=new.audio_path and v.path=new.audio_path
   and v.user_id=new.sender_id and v.duration_seconds=new.duration_seconds for key share of o;
  if not found then raise exception 'VOICE_FILE_CHANGED' using errcode='42501';end if;
 end if;
 return new;
end $$;
revoke all on function private.capture_direct_audio_object() from public,anon,authenticated;
create trigger direct_audio_object_identity before insert on public.direct_messages for each row execute function private.capture_direct_audio_object();

create or replace function public.direct_audio_object_identity(p_owner uuid,p_path text)
returns uuid language sql stable security invoker set search_path='' as $$
 select o.id from storage.objects o where o.bucket_id='direct-audio' and o.name=p_path and p_path like p_owner::text||'/%'
$$;
revoke all on function public.direct_audio_object_identity(uuid,text) from public,anon,authenticated;
grant execute on function public.direct_audio_object_identity(uuid,text) to service_role;
-- Preserve the old service-only signature as a fail-closed compatibility stub.
create or replace function public.record_direct_voice_check(p_owner uuid,p_path text,p_seconds numeric,p_sha256 text)
returns numeric language plpgsql security invoker set search_path='' as $$
begin raise exception 'VOICE_OBJECT_IDENTITY_REQUIRED';end $$;
revoke all on function public.record_direct_voice_check(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.record_direct_voice_check(uuid,text,numeric,text) to service_role;
create function public.record_direct_voice_check(p_owner uuid,p_path text,p_seconds numeric,p_sha256 text,p_expected_object_id uuid)
returns numeric language plpgsql security invoker set search_path='' as $$
declare observed_id uuid;
begin
 if p_path not like p_owner::text||'/%' or length(p_sha256)<>64 then raise exception 'VOICE_PATH';end if;
 select id into observed_id from storage.objects where bucket_id='direct-audio' and name=p_path for key share;
 if not found or observed_id is distinct from p_expected_object_id or exists(select 1 from private.direct_audio_cleanup where path=p_path) then raise exception 'VOICE_FILE_CHANGED';end if;
 insert into private.direct_voice_checks(object_id,user_id,path,duration_seconds,content_sha256)
 values(observed_id,p_owner,p_path,p_seconds,p_sha256)
 on conflict(object_id) do update set duration_seconds=excluded.duration_seconds,content_sha256=excluded.content_sha256;
 return p_seconds;
end $$;
revoke all on function public.record_direct_voice_check(uuid,text,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.record_direct_voice_check(uuid,text,numeric,text,uuid) to service_role;

-- Existing uploads still produce a normal duplicate-object response on retry.
-- The key-share lock serializes this check against a concurrent deletion;
-- subsequent queries use a fresh snapshot after waiting for that deletion.
create or replace function private.direct_audio_path_available(p_path text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
begin
 if split_part(p_path,'/',1) is distinct from (select auth.uid())::text then return false;end if;
 perform 1 from storage.objects where bucket_id='direct-audio' and name=p_path for key share;
 if found then return true;end if;
 return not exists(select 1 from public.direct_messages where audio_path=p_path)
  and not exists(select 1 from private.direct_audio_cleanup where path=p_path);
end $$;
revoke all on function private.direct_audio_path_available(text) from public,anon;
grant execute on function private.direct_audio_path_available(text) to authenticated;
create policy "voice paths cannot replace referenced or queued objects" on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'direct-audio' or private.direct_audio_path_available(name));
-- A deleted path stays reserved through the maximum outstanding signed-URL
-- lifetime. This prevents an old capability from resolving to replacement bytes.
create or replace function public.complete_direct_audio_cleanup(p_paths text[])
returns void language sql security invoker set search_path='' as $$
 delete from private.direct_audio_cleanup where path=any(p_paths) and enqueued_at<=now()-interval '60 seconds'
 and not exists(select 1 from public.direct_messages m where m.audio_path=path and m.expires_at>now())
$$;
revoke all on function public.complete_direct_audio_cleanup(text[]) from public,anon,authenticated;
grant execute on function public.complete_direct_audio_cleanup(text[]) to service_role;
notify pgrst,'reload schema';
