-- Generated xBloom recipes saved to BeanMora's own xBloom account, keyed by a
-- hash of the recipe so each one is saved once. Written only by the
-- xbloom-share edge function (service role); no client access.
create table if not exists public.xbloom_shared_recipes (
  recipe_hash text primary key check (recipe_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  model text not null check (model in ('Studio', 'Original')),
  share_id text check (share_id is null or length(share_id) between 8 and 128),
  created_at timestamptz not null default now()
);
create index if not exists xbloom_shared_recipes_user_created_idx on public.xbloom_shared_recipes (user_id, created_at desc);
alter table public.xbloom_shared_recipes enable row level security;
revoke all on public.xbloom_shared_recipes from anon, authenticated;
