-- BeanMora — 25: source/confidence/image-rights tracking on the live catalog
--               (beans, roasters, equipment_models).
--
-- Forward-only. Does not modify migrations 01-24.
--
-- CONTEXT
-- Migrations 12-17 already built a richer provenance model
-- (coffee_lots / roasted_products / product_sources / product_images with
-- strict image-rights states) but it was never wired into the app — every
-- page (Discover, bean detail, recipe creation, brew logs, inventory,
-- reviews, saved) still reads/writes the simpler Phase 1 tables
-- (beans / roasters / equipment_models). Re-pointing the whole app at the
-- Phase 2 model in one pass would touch a large number of already-working,
-- already-tested surfaces for no functional gain — the data these three
-- tables need (who said so, how sure are we, can we show the photo) can be
-- added to them directly instead. This migration does that, reusing the
-- exact vocabulary already established in migrations 13/14/17
-- (source_type / data_confidence / requires_review) so a moderator sees one
-- consistent provenance model everywhere, not two.
--
-- Every requires_review column here either is brand new (beans,
-- equipment_models — defaults to false, so nothing already published is
-- affected) or, for roasters, is explicitly backfilled to false for
-- pre-existing rows before the new enforcing policy goes live (see §1) —
-- nothing already visible on the site disappears when this ships. New
-- discovery-pipeline rows set requires_review = true explicitly.

-- ---------------------------------------------------------------------- --
-- 1. Roasters
-- ---------------------------------------------------------------------- --
--
-- IMPORTANT: migration 12 already added source_type / source_url /
-- source_name / last_verified_at / data_confidence / requires_review to
-- this table (default true for requires_review) but never wired a SELECT
-- policy to enforce it — "roasters are publicly readable" from migration 04
-- (`using (true)`) is still the live policy, so every roaster row, despite
-- defaulting to requires_review = true, has been publicly visible all
-- along. This section only adds the columns migration 12 didn't, backfills
-- requires_review = false on every row that predates this migration (so
-- nothing already on the site disappears), and only then turns on
-- enforcement — new discovery-pipeline rows set requires_review = true
-- explicitly and will correctly stay unlisted until approved.

alter table public.roasters
  add column if not exists logo_source_url text,
  add column if not exists logo_usage_status text not null default 'rights_confirmed' check (logo_usage_status in
    ('rights_confirmed', 'rights_unknown', 'placeholder_only', 'removal_requested')),
  add column if not exists discovered_at timestamptz not null default now(),
  add column if not exists discovery_run_id uuid;

comment on column public.roasters.logo_usage_status is
  'Mirrors product_images.image_usage_status (migration 13): logo_url is only ever a real asset once rights_confirmed. Existing rows default rights_confirmed since they were manually curated, not scraped.';

-- Backfill: every roaster that existed before this migration is treated as
-- already reviewed/live, regardless of migration 12's column default.
update public.roasters set requires_review = false where requires_review is distinct from false;

-- Reviewed roasters are public; pending discovery-pipeline rows are visible
-- to their discoverer's admin session only until approved. Mirrors the
-- roasted_products SELECT policy shape in migration 13. This REPLACES the
-- migration 04 policy, which never checked requires_review at all.
drop policy if exists "roasters are publicly readable" on public.roasters;
create policy "reviewed roasters are publicly readable"
  on public.roasters for select
  using (
    not requires_review
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

-- ---------------------------------------------------------------------- --
-- 2. Beans
-- ---------------------------------------------------------------------- --

alter table public.beans
  add column if not exists harvest_season text,
  add column if not exists acidity_level smallint check (acidity_level is null or acidity_level between 1 and 5),
  add column if not exists body_level smallint check (body_level is null or body_level between 1 and 5),
  add column if not exists sweetness_level smallint check (sweetness_level is null or sweetness_level between 1 and 5),
  add column if not exists bag_weight_grams int check (bag_weight_grams is null or bag_weight_grams > 0),
  add column if not exists source_type text check (source_type is null or source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted', 'inferred')),
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  add column if not exists requires_review boolean not null default false,
  add column if not exists discovered_at timestamptz not null default now(),
  add column if not exists discovery_run_id uuid;

create index if not exists beans_requires_review_idx on public.beans (requires_review) where requires_review;
create index if not exists beans_data_confidence_idx on public.beans (data_confidence);

comment on column public.beans.acidity_level is '1 (low) - 5 (high), cupping-style scale. Null when the source did not state it — never inferred.';
comment on column public.beans.body_level is '1 (light/tea-like) - 5 (heavy/syrupy). Null when unknown.';
comment on column public.beans.sweetness_level is '1 (low) - 5 (high). Null when unknown.';

drop policy if exists "published beans are publicly readable" on public.beans;
create policy "published beans are publicly readable"
  on public.beans for select
  using (
    (is_published and not requires_review)
    or auth.uid() = created_by
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

-- bean_images: same image-rights states as product_images (migration 13).
-- Existing rows default rights_confirmed (they were user-uploaded, not
-- scraped) so no currently-displayed photo disappears.
alter table public.bean_images
  add column if not exists image_source_url text,
  add column if not exists image_owner text,
  add column if not exists image_usage_status text not null default 'rights_confirmed' check (image_usage_status in
    ('rights_confirmed', 'rights_unknown', 'placeholder_only', 'removal_requested')),
  add column if not exists image_is_official boolean not null default false,
  add column if not exists image_last_verified_at timestamptz;

comment on column public.bean_images.image_usage_status is
  'The UI must only render `url` when this is rights_confirmed. Discovery-pipeline inserts that could not confirm rights use rights_unknown/placeholder_only and the app falls back to generated art instead.';

-- ---------------------------------------------------------------------- --
-- 3. Equipment
-- ---------------------------------------------------------------------- --

alter table public.equipment_models
  add column if not exists description text,
  add column if not exists specifications jsonb not null default '{}',
  add column if not exists official_url text,
  add column if not exists suitable_brew_methods text[] not null default '{}',
  add column if not exists image_source_url text,
  add column if not exists image_usage_status text not null default 'rights_confirmed' check (image_usage_status in
    ('rights_confirmed', 'rights_unknown', 'placeholder_only', 'removal_requested')),
  add column if not exists source_type text check (source_type is null or source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted', 'inferred')),
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  add column if not exists requires_review boolean not null default false,
  add column if not exists discovered_at timestamptz not null default now(),
  add column if not exists discovery_run_id uuid;

create index if not exists equipment_models_requires_review_idx on public.equipment_models (requires_review) where requires_review;

comment on column public.equipment_models.specifications is
  'Free-form key/value spec sheet (e.g. {"burr_type": "conical steel", "capacity_g": 40}) — shape varies by category, so jsonb rather than fixed columns.';

drop policy if exists "equipment models are publicly readable" on public.equipment_models;
create policy "reviewed equipment models are publicly readable"
  on public.equipment_models for select
  using (
    not requires_review
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

-- ---------------------------------------------------------------------- --
-- 4. Duplicate detection covers the newly-discoverable entity types too
-- ---------------------------------------------------------------------- --

alter table public.duplicate_candidates drop constraint if exists duplicate_candidates_entity_type_check;
alter table public.duplicate_candidates
  add constraint duplicate_candidates_entity_type_check check (entity_type in
    ('roaster', 'coffee_lot', 'roasted_product', 'bean', 'equipment_model', 'recipe'));

-- ---------------------------------------------------------------------- --
-- 5. Discovery run linkage
-- ---------------------------------------------------------------------- --
-- discovery_run_id above deliberately has no FK — it may point at either
-- research_jobs.id (bean/roaster/equipment discovery) or
-- ingestion_runs.id (recipe discovery, migration 23), and Postgres has no
-- "references one of two tables" constraint. The admin UI resolves it by
-- trying research_jobs first, then ingestion_runs.

comment on column public.roasters.discovery_run_id is
  'Points at research_jobs.id (or ingestion_runs.id for recipe-sourced rows). No FK: two possible parent tables.';
comment on column public.beans.discovery_run_id is
  'Points at research_jobs.id (or ingestion_runs.id for recipe-sourced rows). No FK: two possible parent tables.';
comment on column public.equipment_models.discovery_run_id is
  'Points at research_jobs.id. No FK: kept loose like the bean/roaster columns for consistency.';
