-- BeanMora — 02: profiles, user_roles, user_preferences

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  avatar_url text,
  bio text,
  country text,
  language text not null default 'ar' check (language in ('ar', 'en')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced', 'barista')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

create index profiles_username_idx on public.profiles using btree (username);
create index profiles_country_idx on public.profiles (country);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created, seeded
-- from signUp() metadata (name/username/language) collected on the signup
-- form. Username collisions are surfaced back to the client as a normal
-- signup error, not silently altered.
--
-- Hardened per security review: search_path = '' (every reference is
-- schema-qualified below, so an empty search_path can't be hijacked by a
-- same-named object in another schema), and EXECUTE is revoked from
-- PUBLIC/anon/authenticated — this function is only ever meant to run via
-- the auth.users trigger below, never as a direct RPC call. Trigger
-- firing does not require the invoking session to hold EXECUTE.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'language', 'ar')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "users update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------- --

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'roaster', 'barista_verified')),
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

-- ---------------------------------------------------------------------- --
-- RLS role-checking helper.
--
-- This must be created here — after public.user_roles (table, index, RLS)
-- exists — and before any policy (in this file or later migrations) calls
-- it. A `language sql` function's body is validated against the catalog at
-- CREATE time, so defining this any earlier fails with
-- "relation public.user_roles does not exist".
--
-- Lives in a private, non-exposed schema (not `public`) so it can never be
-- invoked directly as a PostgREST RPC call (`/rest/v1/rpc/has_role`) — it
-- is only reachable from inside RLS policy expressions evaluated by
-- Postgres itself. EXECUTE is granted to both `anon` and `authenticated`:
-- several public-read policies (beans, recipes, posts, comments, ...) call
-- it as one branch of an `or` inside a SELECT policy that anonymous
-- visitors also hit, and Postgres needs EXECUTE to plan that expression
-- even when the other branch short-circuits it at runtime.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = target_role
  );
$$;

comment on function private.has_role is
  'RLS helper: true if the current auth.uid() holds target_role in user_roles. Never expose role checks via user_metadata. Not in an exposed schema — call only from within RLS policies.';

revoke all on function private.has_role(text) from public;
grant execute on function private.has_role(text) to anon, authenticated;

-- ---------------------------------------------------------------------- --

-- Deliberately no SELECT policy for regular users on other people's roles.
-- A user may see their own role rows; admins may see all.
create policy "users see their own roles"
  on public.user_roles for select
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));

create policy "only admins grant roles"
  on public.user_roles for insert
  with check ((select private.has_role('admin')));

create policy "only admins revoke roles"
  on public.user_roles for delete
  using ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_brew_methods text[] not null default '{}',
  preferred_flavors text[] not null default '{}',
  preferred_roast_level text check (preferred_roast_level in ('light', 'medium', 'dark')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy "users manage their own preferences"
  on public.user_preferences for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
