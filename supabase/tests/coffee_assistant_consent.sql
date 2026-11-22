-- Exercise the migrated registry with transaction-only identities. No fixtures persist.
begin;
set local statement_timeout = '20s';
create temp table consent_fixture (owner_id uuid, other_id uuid, allowed uuid, withdrawn uuid);
insert into consent_fixture values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
grant select on consent_fixture to service_role;

do $tests$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.coffee_assistant_consents'::regclass) then
    raise exception 'Consent registry must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.coffee_assistant_consents', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.coffee_assistant_consents', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Clients must not read or manufacture server consent receipts';
  end if;
  if not has_table_privilege('service_role', 'public.coffee_assistant_consents', 'SELECT')
    or not has_table_privilege('service_role', 'public.coffee_assistant_consents', 'INSERT')
    or not has_table_privilege('service_role', 'public.coffee_assistant_consents', 'UPDATE')
    or has_table_privilege('service_role', 'public.coffee_assistant_consents', 'DELETE') then
    raise exception 'Consent service grants differ from the required minimum';
  end if;
end $tests$;

insert into auth.users (id, email, raw_user_meta_data, is_anonymous)
select owner_id, owner_id::text || '@consent-test.invalid', jsonb_build_object('username', 'ct_' || substr(owner_id::text, 1, 8)), false from consent_fixture
union all
select other_id, other_id::text || '@consent-test.invalid', jsonb_build_object('username', 'ct_' || substr(other_id::text, 1, 8)), false from consent_fixture;

set local role service_role;
insert into public.coffee_assistant_consents (user_id, policy, choice, generation, decided_at)
select owner_id, 'openai-v1', 'allow', allowed, now() from consent_fixture;
insert into public.coffee_assistant_consents (user_id, policy, choice, generation, decided_at)
select other_id, 'openai-v1', 'guide', withdrawn, now() from consent_fixture;
do $tests$
declare changed integer;
begin
  begin
    insert into public.coffee_assistant_consents (user_id, policy, choice, generation, decided_at)
    select owner_id, 'openai-v1', 'allow', allowed, now() from consent_fixture;
    raise exception 'An unset consent write replaced an existing receipt';
  exception when unique_violation then null; end;
  update public.coffee_assistant_consents set choice = 'guide', generation = f.withdrawn
  from consent_fixture f where user_id = f.owner_id and policy = 'openai-v1';
  update public.coffee_assistant_consents set choice = 'allow', generation = gen_random_uuid()
  from consent_fixture f where user_id = f.owner_id and policy = 'openai-v1' and generation = f.allowed;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'A stale allowance undid withdrawal'; end if;
  if (select count(*) from public.coffee_assistant_consents c join consent_fixture f on c.user_id in (f.owner_id, f.other_id) where choice = 'guide') <> 2 then
    raise exception 'Per-account consent decisions were not preserved';
  end if;
end $tests$;
reset role;

set local role anon;
do $tests$ begin
  begin
    perform 1 from public.coffee_assistant_consents;
    raise exception 'Anonymous API role read consent receipts';
  exception when insufficient_privilege then null; end;
end $tests$;
reset role;
set local role authenticated;
do $tests$ begin
  begin
    update public.coffee_assistant_consents set choice = 'allow';
    raise exception 'Authenticated API role forged consent';
  exception when insufficient_privilege then null; end;
end $tests$;
reset role;

delete from auth.users where id in (select owner_id from consent_fixture union all select other_id from consent_fixture);
do $tests$ begin
  if exists (select 1 from public.coffee_assistant_consents c join consent_fixture f on c.user_id in (f.owner_id, f.other_id)) then
    raise exception 'Account deletion retained consent receipts';
  end if;
end $tests$;
rollback;
select 'Consent registry grants, stale writes, isolation and deletion checks passed; fixtures rolled back' as result;
