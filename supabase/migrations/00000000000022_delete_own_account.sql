-- BeanMora — 22: self-service account deletion RPC
--
-- Forward-only migration (does not modify migrations 01-21). The Settings
-- page needs a real, working "Delete account" action rather than a
-- decorative button. Supabase's anon/authenticated roles cannot delete
-- rows from auth.users directly (it isn't exposed to PostgREST at all), so
-- this SECURITY DEFINER function is the one narrow, safe bridge: it only
-- ever deletes the row matching the CALLER's own auth.uid(), never an
-- arbitrary id passed in as an argument — there is no id parameter at all,
-- specifically so this can never be misused to delete someone else's
-- account even if EXECUTE were ever granted more broadly than intended.
--
-- Deleting the auth.users row cascades to public.profiles (and from there,
-- through every other table's "on delete cascade" foreign key back to
-- profiles) — see migration 02's `profiles.id references auth.users(id)
-- on delete cascade` and the cascade chain built up through every later
-- migration. This one function therefore fully removes the account's data
-- without needing a second, separately-maintained cleanup path.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

comment on function public.delete_own_account is
  'Deletes the CALLING user''s own auth.users row (and everything that cascades from it via profiles.id). Takes no arguments by design — cannot target any account other than the caller''s.';

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
