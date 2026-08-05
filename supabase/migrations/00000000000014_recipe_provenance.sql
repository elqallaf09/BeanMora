-- BeanMora — 14 (Phase 2): recipe provenance & the "unlisted" privacy tier.
--
-- Phase 1's `recipes.visibility` only had draft/public/private. Spec §12
-- asks for a third tier — Unlisted (viewable by direct link only, not
-- listed/searchable). Postgres lets us widen a CHECK constraint safely
-- (existing rows still satisfy it), so this is additive, not destructive.

alter table public.recipes drop constraint if exists recipes_visibility_check;
alter table public.recipes
  add constraint recipes_visibility_check check (visibility in ('draft', 'public', 'unlisted', 'private'));

alter table public.recipes
  add column if not exists recipe_type text not null default 'personal' check (recipe_type in
    ('official_roaster', 'verified_barista', 'community', 'personal', 'beanmora_suggested')),
  add column if not exists roasted_product_id uuid references public.roasted_products(id) on delete set null,
  add column if not exists pour_sum_validated boolean not null default false,
  add column if not exists is_incomplete_source boolean not null default false,
  add column if not exists forked_from_recipe_id uuid references public.recipes(id) on delete set null;

create index recipes_roasted_product_id_idx on public.recipes (roasted_product_id);
create index recipes_recipe_type_idx on public.recipes (recipe_type);

comment on column public.recipes.recipe_type is
  'Spec §4/§5-7 recipe classification shown to users so a BeanMora-suggested starting point is never presented as an official/confirmed recipe.';
comment on column public.recipes.is_incomplete_source is
  'Set true when a recipe was captured from a source that did not publish every field (e.g. bag card missing water temp). The UI must show "Incomplete source recipe" and never invent the missing value.';

-- Widened SELECT policy for the new "unlisted" tier: visible via direct
-- link (i.e. to anyone who queries it by id, same as before) but the
-- listing/discovery queries built in Phase 3+ must filter
-- visibility = 'public' explicitly rather than relying on this policy to
-- hide unlisted recipes from browsing — RLS controls row access, not
-- whether a recipe appears in a "browse all" query result set.
drop policy if exists "public recipes are readable by everyone" on public.recipes;
create policy "public and unlisted recipes are readable by everyone"
  on public.recipes for select
  using (
    visibility in ('public', 'unlisted')
    or (select auth.uid()) = user_id
    or (select private.has_role('admin'))
  );

-- ---------------------------------------------------------------------- --

-- Where a recipe's content actually came from — separate from
-- recipe_type (which is the user-facing classification) so a single
-- recipe can cite multiple corroborating sources (e.g. the bag card AND
-- the roaster's Instagram).
create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  source_type text not null check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted', 'beanmora_generated')),
  source_url text,
  source_name text,
  last_verified_at timestamptz,
  data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  created_at timestamptz not null default now()
);

create index recipe_sources_recipe_id_idx on public.recipe_sources (recipe_id);

alter table public.recipe_sources enable row level security;

create policy "recipe sources follow parent recipe visibility"
  on public.recipe_sources for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility in ('public', 'unlisted') or r.user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

create policy "recipe owners manage recipe sources"
  on public.recipe_sources for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------- --

-- Human sign-off that a recipe_type claim (e.g. "Official Roaster Recipe")
-- is actually correct — a moderator/admin action, logged for audit.
create table public.recipe_verifications (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  verified_by uuid not null references public.profiles(id) on delete set null,
  claimed_recipe_type text not null check (claimed_recipe_type in
    ('official_roaster', 'verified_barista', 'community', 'personal', 'beanmora_suggested')),
  verdict text not null check (verdict in ('confirmed', 'downgraded', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index recipe_verifications_recipe_id_idx on public.recipe_verifications (recipe_id);

alter table public.recipe_verifications enable row level security;

create policy "only admins and moderators see recipe verifications"
  on public.recipe_verifications for select
  using ((select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "only admins and moderators write recipe verifications"
  on public.recipe_verifications for insert
  with check ((select private.has_role('admin')) or (select private.has_role('moderator')));
