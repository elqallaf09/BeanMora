-- BeanMora — 19: bean_saves, roaster_saves
--
-- Forward-only migration (does not modify migrations 01-18). The Phase 1
-- schema shipped `recipe_saves` (migration 06) but never a matching table
-- for bookmarking a bean or a roaster directly — needed for the product
-- rebuild's BeanCard / RoasterCard save buttons and the Saved page's
-- "Saved beans" / "Saved roasters" sections. Mirrors recipe_saves exactly:
-- a private, owner-only bookmark row, one per (item, user).
--
-- Guests: deliberately NOT restricted here, consistent with migration 18's
-- own review notes for recipe_saves/recipe_collections — these are
-- private, owner-only tables with no public-visibility branch in their
-- SELECT policy, so there is nothing for a guest session to leak into by
-- saving a bean or roaster during a session that may later be lost.

create table public.bean_saves (
  id uuid primary key default gen_random_uuid(),
  bean_id uuid not null references public.beans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (bean_id, user_id)
);

create index bean_saves_user_id_idx on public.bean_saves (user_id);
create index bean_saves_bean_id_idx on public.bean_saves (bean_id);

alter table public.bean_saves enable row level security;

create policy "users see their own bean saves"
  on public.bean_saves for select
  using ((select auth.uid()) = user_id);

create policy "users create their own bean saves"
  on public.bean_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete their own bean saves"
  on public.bean_saves for delete
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------- --

create table public.roaster_saves (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (roaster_id, user_id)
);

create index roaster_saves_user_id_idx on public.roaster_saves (user_id);
create index roaster_saves_roaster_id_idx on public.roaster_saves (roaster_id);

alter table public.roaster_saves enable row level security;

create policy "users see their own roaster saves"
  on public.roaster_saves for select
  using ((select auth.uid()) = user_id);

create policy "users create their own roaster saves"
  on public.roaster_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete their own roaster saves"
  on public.roaster_saves for delete
  using ((select auth.uid()) = user_id);
