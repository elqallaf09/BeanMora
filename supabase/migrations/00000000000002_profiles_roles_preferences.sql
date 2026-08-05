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
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

-- Deliberately no SELECT policy for regular users on other people's roles.
-- A user may see their own role rows; admins may see all.
create policy "users see their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id or public.has_role('admin'));

create policy "only admins grant roles"
  on public.user_roles for insert
  with check (public.has_role('admin'));

create policy "only admins revoke roles"
  on public.user_roles for delete
  using (public.has_role('admin'));

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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
