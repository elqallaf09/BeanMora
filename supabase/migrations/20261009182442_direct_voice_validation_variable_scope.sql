-- Separate the PL/pgSQL variable from the conflict target column.
create or replace function public.record_direct_voice_check(p_owner uuid,p_path text,p_seconds numeric,p_sha256 text)
returns numeric language plpgsql security invoker set search_path='' as $$
declare voice_object uuid;
begin
 if p_path not like p_owner::text||'/%' or length(p_sha256)<>64 then raise exception 'VOICE_PATH';end if;
 select id into voice_object from storage.objects where bucket_id='direct-audio' and name=p_path;
 if not found then raise exception 'VOICE_FILE_MISSING';end if;
 insert into private.direct_voice_checks(object_id,user_id,path,duration_seconds,content_sha256) values(voice_object,p_owner,p_path,p_seconds,p_sha256)
 on conflict(object_id) do update set duration_seconds=excluded.duration_seconds,content_sha256=excluded.content_sha256;
 return p_seconds;
end $$;
notify pgrst,'reload schema';
