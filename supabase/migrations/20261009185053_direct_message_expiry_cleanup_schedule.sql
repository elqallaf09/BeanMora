-- Independent, limited cleanup token generated on the database server. The
-- project URL is environment configuration in Vault, not a checked-in secret.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
revoke all on schema net from public,anon,authenticated;
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all sequences in schema net from public,anon,authenticated;
revoke all on all functions in schema net from public,anon,authenticated;
revoke all on vault.secrets,vault.decrypted_secrets from public,anon,authenticated;
do $$begin
 if not exists(select 1 from vault.secrets where name='beanmora_direct_cleanup_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'beanmora_direct_cleanup_token','Limited authorization for expired direct-message cleanup');
 end if;
end $$;
create or replace function private.authorize_direct_cleanup(p_token text)
returns boolean language sql stable security definer set search_path='' as $$
 select length(p_token)=64 and exists(select 1 from vault.decrypted_secrets v where v.name='beanmora_direct_cleanup_token'
 and extensions.digest(p_token,'sha256')=extensions.digest(v.decrypted_secret,'sha256'))
$$;
revoke all on function private.authorize_direct_cleanup(text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.authorize_direct_cleanup(text) to service_role;
create or replace function public.authorize_direct_cleanup(p_token text)
returns boolean language sql stable security invoker set search_path='' as $$select private.authorize_direct_cleanup(p_token)$$;
revoke all on function public.authorize_direct_cleanup(text) from public,anon,authenticated;
grant execute on function public.authorize_direct_cleanup(text) to service_role;
create or replace function private.enqueue_direct_cleanup()
returns bigint language plpgsql security definer set search_path='' as $$
declare target text; token text;
begin
 select decrypted_secret into target from vault.decrypted_secrets where name='beanmora_project_url';
 select decrypted_secret into token from vault.decrypted_secrets where name='beanmora_direct_cleanup_token';
 if target is null or target !~ '^https://[a-z0-9]+\.supabase\.co$' or token is null then raise exception 'DIRECT_CLEANUP_CONFIGURATION';end if;
 return net.http_post(url:=target||'/functions/v1/purge-direct-messages',body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),timeout_milliseconds:=10000);
end $$;
revoke all on function private.enqueue_direct_cleanup() from public,anon,authenticated;
grant execute on function private.enqueue_direct_cleanup() to service_role;
select cron.schedule('beanmora-direct-expiry-cleanup','*/5 * * * *','select private.enqueue_direct_cleanup();');
notify pgrst,'reload schema';
