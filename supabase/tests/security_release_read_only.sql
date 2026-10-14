-- Authorization checks with unknown IDs. No production rows are inserted.
begin;
set local role anon;
do $tests$
begin
  if exists(select 1 from public.recipes where visibility<>'public') then raise exception 'Guest sees private recipes'; end if;
  if has_table_privilege('anon','public.direct_messages','SELECT') then raise exception 'Guest can read private messages'; end if;
  if has_function_privilege('anon','public.delete_own_account()','EXECUTE')
    or has_function_privilege('anon','public.moderate_equipment_review(uuid,boolean,text)','EXECUTE')
    or has_function_privilege('anon','private.refresh_recipe_search_documents(uuid[])','EXECUTE')
    or has_table_privilege('anon','public.recipe_search_documents','UPDATE') then raise exception 'Privileged guest grant'; end if;
  if public.get_member_profile('__unknown_security_profile_20261014__') is not null then raise exception 'Unknown identity returned profile data'; end if;
  if exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname in ('unaccent','pg_trgm') and n.nspname<>'extensions') then raise exception 'Extension RPCs remain exposed'; end if;
  if has_schema_privilege('anon','extensions','CREATE') or has_schema_privilege('authenticated','extensions','CREATE') then raise exception 'Client can replace extension objects'; end if;
end $tests$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $tests$
begin
  begin
    perform public.moderate_equipment_review('00000000-0000-4000-8000-000000000002',true,'Read-only authorization check');
    raise exception 'Non-moderator entered privileged mutation';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.user_roles where role in ('admin','moderator')) then raise exception 'Unknown user can read privileged roles'; end if;
end $tests$;
rollback;
