-- BeanMora — 12 (Phase 2): countries, cities, roaster location/shipping,
--               and the additional roaster fields the GCC data model needs.
--
-- Every "trust" field pattern introduced here (source_type, source_url,
-- last_verified_at, data_confidence, requires_review) is reused by every
-- Phase 2 table below — see docs/DATABASE.md "Data provenance" section.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),  -- ISO 3166-1 alpha-2
  name_ar text not null,
  name_en text not null,
  currency_code text check (currency_code in ('KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'USD', 'EUR', 'GBP')),
  is_gcc boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.countries enable row level security;

create policy "countries are publicly readable"
  on public.countries for select
  using (true);

create policy "only admins write countries"
  on public.countries for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  created_at timestamptz not null default now(),
  unique (country_id, name_en)
);

create index cities_country_id_idx on public.cities (country_id);

alter table public.cities enable row level security;

create policy "cities are publicly readable"
  on public.cities for select
  using (true);

create policy "only admins write cities"
  on public.cities for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --
-- Roaster expansion: contact/social/verification fields the Phase 1
-- `roasters` table didn't have, plus the provenance columns every Phase 2
-- record carries.

alter table public.roasters
  add column if not exists city_id uuid references public.cities(id) on delete set null,
  add column if not exists instagram_url text,
  add column if not exists twitter_url text,
  add column if not exists tiktok_url text,
  add column if not exists whatsapp_number text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists has_physical_store boolean not null default false,
  add column if not exists ships_to_gcc boolean not null default false,
  add column if not exists source_type text check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor', 'roaster_submitted', 'user_submitted')),
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists data_confidence text not null default 'unverified' check (data_confidence in
    ('official', 'verified', 'community_submitted', 'suggested', 'unverified')),
  add column if not exists requires_review boolean not null default true;

comment on column public.roasters.is_verified is
  'Whether this roaster''s BeanMora account is claimed & verified (Roaster Portal) — distinct from data_confidence, which grades the roaster PROFILE DATA''s trustworthiness regardless of account claim status.';

create index roasters_city_id_idx on public.roasters (city_id);
create index roasters_data_confidence_idx on public.roasters (data_confidence);
create index roasters_requires_review_idx on public.roasters (requires_review) where requires_review;

-- ---------------------------------------------------------------------- --

create table public.roaster_locations (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  city_id uuid references public.cities(id) on delete set null,
  label text,                       -- e.g. "Main roastery", "Salmiya branch"
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_physical_store boolean not null default true,
  created_at timestamptz not null default now()
);

create index roaster_locations_roaster_id_idx on public.roaster_locations (roaster_id);

alter table public.roaster_locations enable row level security;

create policy "roaster locations are publicly readable"
  on public.roaster_locations for select
  using (true);

create policy "roaster owners or admins manage locations"
  on public.roaster_locations for all
  using (exists (
    select 1 from public.roasters r
    where r.id = roaster_id and (r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ))
  with check (exists (
    select 1 from public.roasters r
    where r.id = roaster_id and (r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

-- ---------------------------------------------------------------------- --

create table public.roaster_shipping_countries (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (roaster_id, country_id)
);

create index roaster_shipping_countries_roaster_id_idx on public.roaster_shipping_countries (roaster_id);

alter table public.roaster_shipping_countries enable row level security;

create policy "roaster shipping countries are publicly readable"
  on public.roaster_shipping_countries for select
  using (true);

create policy "roaster owners or admins manage shipping countries"
  on public.roaster_shipping_countries for all
  using (exists (
    select 1 from public.roasters r
    where r.id = roaster_id and (r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ))
  with check (exists (
    select 1 from public.roasters r
    where r.id = roaster_id and (r.owner_user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));
