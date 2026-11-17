-- Run after the metering migration. Read-only assertions against live grants.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.coffee_assistant_api_usage'::regclass) then
    raise exception 'Coffee API ledger must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.coffee_assistant_api_usage', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.coffee_assistant_api_usage', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'API usage ledger must not be exposed to clients';
  end if;
  if not has_table_privilege('service_role', 'public.coffee_assistant_api_usage', 'SELECT')
    or not has_table_privilege('service_role', 'public.coffee_assistant_api_usage', 'INSERT')
    or not has_table_privilege('service_role', 'public.coffee_assistant_api_usage', 'UPDATE')
    or has_table_privilege('service_role', 'public.coffee_assistant_api_usage', 'DELETE,TRUNCATE') then
    raise exception 'Unexpected API ledger service privileges';
  end if;
end;
$$;
