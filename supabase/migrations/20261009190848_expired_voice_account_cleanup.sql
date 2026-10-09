-- Expired voice is intentionally invisible to members. Account deletion still
-- needs to remove its actual bytes, through an authenticated server action.
create or replace function public.expired_direct_audio_for_owner(p_owner uuid)
returns setof text language sql stable security invoker set search_path='' as $$
 select o.name from storage.objects o where o.bucket_id='direct-audio' and split_part(o.name,'/',1)=p_owner::text
 and o.created_at<=now()-interval '24 hours'
 and not exists(select 1 from public.direct_messages m where m.audio_path=o.name and m.expires_at>now())
 order by o.created_at limit 200
$$;
revoke all on function public.expired_direct_audio_for_owner(uuid) from public,anon,authenticated;
grant execute on function public.expired_direct_audio_for_owner(uuid) to service_role;
notify pgrst,'reload schema';
