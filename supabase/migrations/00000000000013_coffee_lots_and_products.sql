-- BeanMora — 13 (Phase 2): coffee_lots, roasted_products, and the
--               price/availability/source/image history tables that keep
--               a GCC product catalog accurate over time.
--
-- Deliberate split (spec §20): a Coffee Lot is what grew on a farm in a
-- season; a Roasted Product is one roaster's specific bag of it. Two
-- roasters can sell product from the same lot — that is not a duplicate.
-- Nothing here auto-merges look-alike lots; see duplicate_candidates in
-- migration 17.

create table public.coffee_lots (
  id uuid primary key default gen_random_uuid(),
  origin_country text not null,
  origin_region text,
  farm text,
  producer text,
  varietal text,
  process text check (process in
    ('washed', 'natural', 'honey', 'anaerobic', 'wet_hulled', 'other')),
  altitude_min_meters int check (altitude_min_meters is null or altitude_min_meters between 0 and 3000),
  altitude_max_meters int check (altitude_max_meters is null or altitude_max_meters between 0 and 3000),
  harvest_season text,                 -- free text: "2024/2025", "Fall 2024", etc.
  notes text,
  source_type text check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted', 'inferred')),
  source_url text,
  source_name text,
  last_verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  requires_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint altitude_range_valid check (
    altitude_min_meters is null or altitude_max_meters is null or altitude_min_meters <= altitude_max_meters
  )
);

create index coffee_lots_origin_idx on public.coffee_lots (origin_country, origin_region);
create index coffee_lots_lookup_idx on public.coffee_lots (origin_country, farm, varietal, process);

create trigger coffee_lots_set_updated_at
  before update on public.coffee_lots
  for each row execute function public.set_updated_at();

alter table public.coffee_lots enable row level security;

create policy "coffee lots are publicly readable"
  on public.coffee_lots for select
  using (true);

create policy "authenticated users submit coffee lots"
  on public.coffee_lots for insert
  to authenticated
  with check (true);

create policy "admins manage coffee lots"
  on public.coffee_lots for update
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admins delete coffee lots"
  on public.coffee_lots for delete
  using ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.roasted_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  coffee_lot_id uuid references public.coffee_lots(id) on delete set null,
  -- Bridges to the Phase 1 `beans` table so existing recipes / recipe_ratings
  -- (which reference beans.id) keep working while the catalog migrates onto
  -- the richer lot/product model. Nullable — most Phase 2 products won't
  -- have a Phase 1 bean row.
  legacy_bean_id uuid references public.beans(id) on delete set null,
  name_ar text,
  name_en text,
  original_language text not null default 'en' check (original_language in ('ar', 'en')),
  short_description text,              -- original BeanMora summary, not copied verbatim from source
  roast_level text check (roast_level in ('light', 'medium_light', 'medium', 'medium_dark', 'dark')),
  roast_date date,
  origin_type text check (origin_type in ('single_origin', 'blend')),
  flavor_notes_on_bag text[] not null default '{}',
  suitable_for_filter boolean not null default false,
  suitable_for_espresso boolean not null default false,
  suitable_for_v60 boolean not null default false,
  suitable_for_xbloom boolean not null default false,
  suitable_for_milk boolean not null default false,
  weight_grams int check (weight_grams is null or weight_grams > 0),
  purchase_url text,
  status text not null default 'unknown' check (status in
    ('available', 'low_stock', 'sold_out', 'seasonal', 'archived', 'unknown')),
  -- Provenance — required for every Phase 2 product, per spec §19.
  source_type text not null check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted')),
  source_url text not null,
  source_name text,
  last_verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  requires_review boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roasted_products_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index roasted_products_roaster_id_idx on public.roasted_products (roaster_id);
create index roasted_products_coffee_lot_id_idx on public.roasted_products (coffee_lot_id);
create index roasted_products_status_idx on public.roasted_products (status);
create index roasted_products_roast_level_idx on public.roasted_products (roast_level);
create index roasted_products_requires_review_idx on public.roasted_products (requires_review) where requires_review;
create index roasted_products_search_idx
  on public.roasted_products
  using gin (
    (
      lower(
        coalesce(name_ar, '') || ' ' ||
        coalesce(name_en, '')
      )
    ) gin_trgm_ops
  );

create trigger roasted_products_set_updated_at
  before update on public.roasted_products
  for each row execute function public.set_updated_at();

alter table public.roasted_products enable row level security;

-- Published/reviewed products are public; pending/unreviewed submissions
-- are visible to their submitter and admins only (mirrors §21's
-- "Pending Review" workflow).
create policy "reviewed roasted products are publicly readable"
  on public.roasted_products for select
  using (
    not requires_review
    or created_by = (select auth.uid())
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

create policy "authenticated users submit roasted products"
  on public.roasted_products for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "submitters, roaster owners, or admins edit roasted products"
  on public.roasted_products for update
  using (
    created_by = (select auth.uid())
    or (select private.has_role('admin'))
    or exists (select 1 from public.roasters r where r.id = roaster_id and r.owner_user_id = (select auth.uid()))
  )
  with check (
    created_by = (select auth.uid())
    or (select private.has_role('admin'))
    or exists (select 1 from public.roasters r where r.id = roaster_id and r.owner_user_id = (select auth.uid()))
  );

create policy "admins delete roasted products"
  on public.roasted_products for delete
  using ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --
-- History tables: product_prices / product_availability are append-only
-- logs so the monitoring system (spec §18) can show a timeline, while
-- roasted_products.status above holds the current value for fast reads.

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  price numeric(10, 3) not null check (price >= 0),
  currency text not null check (currency in ('KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR')),
  source_url text,
  recorded_at timestamptz not null default now()
);

create index product_prices_product_id_idx on public.product_prices (roasted_product_id, recorded_at desc);

alter table public.product_prices enable row level security;

create policy "product prices are publicly readable"
  on public.product_prices for select
  using (true);

create policy "submitters, roaster owners, or admins record prices"
  on public.product_prices for insert
  with check (exists (
    select 1 from public.roasted_products p
    left join public.roasters r on r.id = p.roaster_id
    where p.id = roasted_product_id
      and (p.created_by = (select auth.uid()) or r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

-- ---------------------------------------------------------------------- --

create table public.product_availability (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  status text not null check (status in
    ('available', 'low_stock', 'sold_out', 'seasonal', 'archived', 'unknown')),
  note text,
  source_url text,
  recorded_at timestamptz not null default now()
);

create index product_availability_product_id_idx on public.product_availability (roasted_product_id, recorded_at desc);

alter table public.product_availability enable row level security;

create policy "product availability history is publicly readable"
  on public.product_availability for select
  using (true);

create policy "submitters, roaster owners, or admins record availability"
  on public.product_availability for insert
  with check (exists (
    select 1 from public.roasted_products p
    left join public.roasters r on r.id = p.roaster_id
    where p.id = roasted_product_id
      and (p.created_by = (select auth.uid()) or r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

-- ---------------------------------------------------------------------- --

create table public.product_sources (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  source_type text not null check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted')),
  source_url text not null,
  source_name text,
  fetched_at timestamptz not null default now()
);

create index product_sources_product_id_idx on public.product_sources (roasted_product_id);

alter table public.product_sources enable row level security;

create policy "product sources are publicly readable"
  on public.product_sources for select
  using (true);

create policy "submitters, roaster owners, or admins record sources"
  on public.product_sources for insert
  with check (exists (
    select 1 from public.roasted_products p
    left join public.roasters r on r.id = p.roaster_id
    where p.id = roasted_product_id
      and (p.created_by = (select auth.uid()) or r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

-- ---------------------------------------------------------------------- --
-- Image rights tracking (spec §3). `storage_path` is only ever populated
-- once `image_usage_status = 'rights_confirmed'` — until then the app must
-- render a clear placeholder, never an invented bag photo.

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  storage_path text,                   -- Supabase Storage path once rights are confirmed
  image_source_url text not null,
  image_owner text not null,
  image_usage_status text not null default 'rights_unknown' check (image_usage_status in
    ('rights_confirmed', 'rights_unknown', 'placeholder_only', 'removal_requested')),
  image_is_official boolean not null default false,
  image_last_verified_at timestamptz,
  position int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_storage_requires_rights check (
    storage_path is null or image_usage_status = 'rights_confirmed'
  )
);

create index product_images_product_id_idx on public.product_images (roasted_product_id);
create unique index product_images_one_primary_per_product
  on public.product_images (roasted_product_id)
  where is_primary;

alter table public.product_images enable row level security;

create policy "product images are publicly readable"
  on public.product_images for select
  using (true);

create policy "submitters, roaster owners, or admins manage product images"
  on public.product_images for all
  using (exists (
    select 1 from public.roasted_products p
    left join public.roasters r on r.id = p.roaster_id
    where p.id = roasted_product_id
      and (p.created_by = (select auth.uid()) or r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ))
  with check (exists (
    select 1 from public.roasted_products p
    left join public.roasters r on r.id = p.roaster_id
    where p.id = roasted_product_id
      and (p.created_by = (select auth.uid()) or r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));
