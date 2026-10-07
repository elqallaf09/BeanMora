-- No existing account is deleted by this migration. The RPC acts only on its caller.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'ACCOUNT_SIGN_IN_REQUIRED' using errcode = '42501';
  end if;
  perform 1 from auth.users where id = caller for update;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = '42501';
  end if;

  -- SQL must never remove Storage metadata directly: the Storage API also
  -- removes the underlying bytes. Clients complete this first; a failure here
  -- rolls back all database work and leaves the account available for retry.
  if exists (select 1 from storage.objects where owner_id = caller::text
      or split_part(name, '/', 1) = caller::text) then
    raise exception 'ACCOUNT_MEDIA_REMAINING';
  end if;

  -- This historical non-cascading reference otherwise blocks a grantor's deletion.
  update public.user_roles set granted_by = null where granted_by = caller;
  -- Snapshots and actor notifications must not retain this user's content.
  delete from public.recipe_versions where created_by = caller
    or snapshot->>'user_id' = caller::text;
  delete from public.notifications where actor_id = caller;
  delete from public.audit_logs where actor_id = caller
    or (target_type in ('user', 'profile') and target_id = caller);
  -- Delete these first: green_coffees has a RESTRICT reference from roasts.
  delete from public.roast_profiles where user_id = caller;
  -- Account, identities, sessions and refresh tokens, profile, preferences,
  -- inventory, recipes/steps/media, brews, reviews, posts, follows and all
  -- other user-owned rows follow their existing cascading foreign keys.
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
comment on function public.delete_own_account() is
  'Self-service account deletion after Storage API cleanup; only the authenticated caller, with no target-id argument.';

-- A JWT can outlive its auth user. Prevent it from uploading new personal
-- files after deletion, while preserving public file reads for guests.
create policy "storage writes require an existing account"
on storage.objects as restrictive for all to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid())))
with check (exists (select 1 from public.profiles where id = (select auth.uid())));
