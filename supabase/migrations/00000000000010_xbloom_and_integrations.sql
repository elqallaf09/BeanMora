-- BeanMora — 10: xbloom_devices, xbloom_recipe_profiles, xbloom_sync_jobs,
--               integration_connections, audit_logs
--
-- These tables exist so the schema is ready the day an official xBloom API
-- or partnership appears — see src/lib/integrations/xbloom.ts. Until then,
-- xbloom_sync_jobs / integration_connections stay empty; the app never
-- writes a "synced" row without a real integration behind it.

create table public.xbloom_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  model text not null check (model in ('xbloom_studio', 'xbloom_original')),
  nickname text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index xbloom_devices_user_id_idx on public.xbloom_devices (user_id);
create unique index xbloom_devices_one_default_per_user
  on public.xbloom_devices (user_id)
  where is_default;

alter table public.xbloom_devices enable row level security;

create policy "users manage their own xbloom devices"
  on public.xbloom_devices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------- --

create table public.xbloom_recipe_profiles (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  device_model text not null check (device_model in ('xbloom_studio', 'xbloom_original')),
  dose_grams numeric(4, 1) not null check (dose_grams between 5 and 18),
  water_grams numeric(6, 1) not null check (water_grams > 0),
  grind_setting text,
  water_temp_c numeric(4, 1) check (water_temp_c between 0 and 100),
  pours jsonb not null default '[]',
  compatibility_status text not null default 'compatible'
    check (compatibility_status in ('compatible', 'needs_review', 'incompatible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id)
);

create trigger xbloom_recipe_profiles_set_updated_at
  before update on public.xbloom_recipe_profiles
  for each row execute function public.set_updated_at();

alter table public.xbloom_recipe_profiles enable row level security;

create policy "xbloom recipe profiles follow parent recipe visibility"
  on public.xbloom_recipe_profiles for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or public.has_role('admin'))
  ));

create policy "recipe owners manage their xbloom profile"
  on public.xbloom_recipe_profiles for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

create table public.xbloom_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'synced', 'failed', 'needs_reconnect')),
  attempted_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index xbloom_sync_jobs_user_id_idx on public.xbloom_sync_jobs (user_id);
create index xbloom_sync_jobs_status_idx on public.xbloom_sync_jobs (status);

alter table public.xbloom_sync_jobs enable row level security;

create policy "users see their own sync jobs"
  on public.xbloom_sync_jobs for select
  using (auth.uid() = user_id);

-- No client-side INSERT/UPDATE policy: sync jobs are only ever written by
-- a trusted server context (Edge Function / Server Action) once an official
-- xBloom integration exists, using the service role which bypasses RLS.

-- ---------------------------------------------------------------------- --

-- Generic OAuth-style connection store for future third-party integrations
-- (xBloom, and Google is handled by Supabase Auth directly so isn't stored
-- here). Tokens are only ever written/read server-side.
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('xbloom')),
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'needs_reconnect')),
  encrypted_access_token text,
  encrypted_refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger integration_connections_set_updated_at
  before update on public.integration_connections
  for each row execute function public.set_updated_at();

alter table public.integration_connections enable row level security;

-- Deliberately no policies granted to `authenticated`/`anon` at all: this
-- table is server-only (service_role bypasses RLS). A user should never be
-- able to SELECT their own encrypted tokens from the browser. Expose
-- connection *status* to the client via a dedicated RPC/view later if
-- needed, not by relaxing this table's RLS.

-- ---------------------------------------------------------------------- --

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "only admins read audit logs"
  on public.audit_logs for select
  using (public.has_role('admin'));

-- Writes happen via SECURITY DEFINER functions / service role only; no
-- client-side insert policy so audit trails can't be forged by the client.
