-- BeanMora — 17 (Phase 2): import system, research jobs, duplicate
--               detection, roaster claims, correction requests.
--
-- Every table here is admin/moderator-only per spec §27 ("الإدارة فقط
-- تراجع Imports وResearch Jobs") except roaster_claims (a roaster/user
-- files their own claim) and data_correction_requests (any authenticated
-- user can report a factual error — the "أبلغ عن معلومة غير صحيحة" button).

create table public.data_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete set null,
  source_type text not null check (source_type in ('csv', 'excel', 'json', 'manual', 'official_source')),
  target_table text not null check (target_table in
    ('roasters', 'coffee_lots', 'roasted_products', 'recipes', 'countries', 'cities')),
  file_name text,
  status text not null default 'pending' check (status in
    ('pending', 'previewing', 'approved', 'rejected', 'completed', 'failed')),
  total_rows int not null default 0,
  new_rows int not null default 0,
  duplicate_rows int not null default 0,
  missing_field_rows int not null default 0,
  invalid_image_rows int not null default 0,
  broken_link_rows int not null default 0,
  conflict_rows int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index data_import_jobs_status_idx on public.data_import_jobs (status);

alter table public.data_import_jobs enable row level security;

create policy "only admins see import jobs"
  on public.data_import_jobs for select
  using ((select private.has_role('admin')));

create policy "only admins manage import jobs"
  on public.data_import_jobs for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.data_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.data_import_jobs(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  status text not null default 'new' check (status in
    ('new', 'duplicate', 'missing_fields', 'invalid_image', 'broken_link', 'conflict', 'approved', 'rejected')),
  issues text[] not null default '{}',
  matched_existing_id uuid,
  created_at timestamptz not null default now()
);

create index data_import_rows_job_id_idx on public.data_import_rows (import_job_id);
create index data_import_rows_status_idx on public.data_import_rows (status);

alter table public.data_import_rows enable row level security;

create policy "only admins see import rows"
  on public.data_import_rows for select
  using ((select private.has_role('admin')));

create policy "only admins manage import rows"
  on public.data_import_rows for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,             -- e.g. "discover_roasters_kuwait"
  country_code text references public.countries(code),
  stage text not null default 'discover_roasters' check (stage in
    ('discover_roasters', 'review_roasters', 'discover_products', 'extract_data',
     'verify_links', 'review_images', 'discover_recipes', 'detect_duplicates',
     'human_review', 'publish')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  roasters_found int not null default 0,
  products_found int not null default 0,
  recipes_found int not null default 0,
  errors_count int not null default 0,
  pending_records int not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index research_jobs_status_idx on public.research_jobs (status);
create index research_jobs_country_code_idx on public.research_jobs (country_code);

create trigger research_jobs_set_updated_at
  before update on public.research_jobs
  for each row execute function public.set_updated_at();

alter table public.research_jobs enable row level security;

create policy "only admins see research jobs"
  on public.research_jobs for select
  using ((select private.has_role('admin')));

create policy "only admins manage research jobs"
  on public.research_jobs for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  research_job_id uuid not null references public.research_jobs(id) on delete cascade,
  url text not null,
  source_type text not null check (source_type in
    ('official_website', 'official_store', 'verified_social', 'official_product_page',
     'approved_distributor')),
  fetched_at timestamptz not null default now(),
  http_status int,
  notes text
);

create index research_sources_job_id_idx on public.research_sources (research_job_id);

alter table public.research_sources enable row level security;

create policy "only admins see research sources"
  on public.research_sources for select
  using ((select private.has_role('admin')));

create policy "only admins manage research sources"
  on public.research_sources for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

-- Suggests possible duplicates for a human to resolve — never merges
-- automatically (spec §20).
create table public.duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('roaster', 'coffee_lot', 'roasted_product')),
  entity_id_a uuid not null,
  entity_id_b uuid not null,
  similarity_score numeric(4, 3) check (similarity_score between 0 and 1),
  suggested_action text not null default 'needs_review' check (suggested_action in
    ('merge', 'keep_separate', 'needs_review')),
  status text not null default 'pending' check (status in ('pending', 'confirmed_merge', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint duplicate_candidates_distinct_entities check (entity_id_a <> entity_id_b),
  unique (entity_type, entity_id_a, entity_id_b)
);

create index duplicate_candidates_status_idx on public.duplicate_candidates (status);
create index duplicate_candidates_entity_type_idx on public.duplicate_candidates (entity_type);

alter table public.duplicate_candidates enable row level security;

create policy "only admins see duplicate candidates"
  on public.duplicate_candidates for select
  using ((select private.has_role('admin')));

create policy "only admins manage duplicate candidates"
  on public.duplicate_candidates for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.roaster_claims (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  claimed_by uuid not null references public.profiles(id) on delete cascade,
  evidence_url text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index roaster_claims_roaster_id_idx on public.roaster_claims (roaster_id);
create index roaster_claims_status_idx on public.roaster_claims (status);

alter table public.roaster_claims enable row level security;

create policy "claimants see their own claims; admins see all"
  on public.roaster_claims for select
  using ((select auth.uid()) = claimed_by or (select private.has_role('admin')));

create policy "authenticated users file a roaster claim"
  on public.roaster_claims for insert
  to authenticated
  with check ((select auth.uid()) = claimed_by);

create policy "only admins review roaster claims"
  on public.roaster_claims for update
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

-- Powers the "أبلغ عن معلومة غير صحيحة" (report incorrect info) button on
-- roaster/product/recipe pages — a lightweight, field-level correction
-- suggestion, distinct from the heavier `reports` table (migration 09,
-- for community moderation/abuse).
create table public.data_correction_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('roaster', 'coffee_lot', 'roasted_product', 'recipe')),
  entity_id uuid not null,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  field_name text,
  current_value text,
  suggested_value text,
  reason text,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index data_correction_requests_entity_idx on public.data_correction_requests (entity_type, entity_id);
create index data_correction_requests_status_idx on public.data_correction_requests (status);

alter table public.data_correction_requests enable row level security;

create policy "reporters see their own correction requests; admins see all"
  on public.data_correction_requests for select
  using ((select auth.uid()) = reported_by or (select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "authenticated users file correction requests"
  on public.data_correction_requests for insert
  to authenticated
  with check ((select auth.uid()) = reported_by);

create policy "only admins and moderators review correction requests"
  on public.data_correction_requests for update
  using ((select private.has_role('admin')) or (select private.has_role('moderator')))
  with check ((select private.has_role('admin')) or (select private.has_role('moderator')));
