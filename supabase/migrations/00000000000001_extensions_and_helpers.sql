-- BeanMora — 01: extensions & shared helpers
-- Safe to re-run: every statement is idempotent.
--
-- Role-checking helpers live in migration 02, immediately after the
-- user_roles table they query — not here. A SECURITY DEFINER function
-- using `language sql` is validated against the catalog at CREATE time,
-- so defining it before its target table exists fails the whole migration
-- (see docs/DATABASE.md changelog). Keep this file limited to things that
-- have no dependency on tables created later.

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy/typo-tolerant search
create extension if not exists "unaccent";       -- accent-insensitive search

-- Generic updated_at trigger reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
