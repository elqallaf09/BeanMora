-- BeanMora — 01: extensions & shared helpers
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy/typo-tolerant search
create extension if not exists "unaccent";       -- accent-insensitive search

-- Generic updated_at trigger reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Returns true if the current JWT belongs to a user with the given role in
-- user_roles. Used inside RLS policies. SECURITY DEFINER is required here
-- (and only here) so a policy can check role membership without granting
-- the caller direct SELECT on user_roles for other users' rows; the
-- function itself is narrow, has a fixed search_path, and returns a boolean
-- only — it does not leak row data.
create or replace function public.has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = target_role
  );
$$;

comment on function public.has_role is
  'RLS helper: true if the current auth.uid() holds target_role in user_roles. Never expose role checks via user_metadata.';
