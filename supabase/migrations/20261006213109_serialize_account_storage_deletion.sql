-- Serialize authenticated Storage requests with the deletion RPC's user lock.
-- A file insert must not pass its existence check while deletion is committing.
create or replace function private.account_active_for_storage()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from auth.users where id = (select auth.uid()) for key share;
  return found;
end;
$$;
revoke all on function private.account_active_for_storage() from public, anon;
grant execute on function private.account_active_for_storage() to authenticated;

alter policy "storage writes require an existing account" on storage.objects
using ((select private.account_active_for_storage()))
with check ((select private.account_active_for_storage()));
