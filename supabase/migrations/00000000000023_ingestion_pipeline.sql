-- BeanMora — 23: recipe ingestion pipeline.
--
-- Forward-only. Does not touch migrations 01-22.
--
-- PURPOSE
-- Continuously grow the structured recipe library from trusted public
-- sources, on a schedule, without ever republishing anyone else's
-- copyrighted expression.
--
-- LEGAL MODEL (this is the important part, and it constrains the schema)
-- Brew *parameters* are facts — "18g in, 36g out, 93C, 9 bar, 28s" is not
-- copyrightable subject matter, and a database of facts assembled with our
-- own selection and arrangement is ours to hold. The *expression* around
-- those facts is not ours: tasting-note prose, the author's writing, their
-- photography and video are all protected, and attribution does not create
-- a licence. So:
--
--   * We store extracted PARAMETERS in structured columns.
--   * We store a short excerpt ONLY for moderator review (see
--     raw_excerpt below) and never render it publicly.
--   * We store the canonical URL, author and publisher so every ingested
--     recipe links back to, and credits, its source.
--   * We never copy images or video. `source_image_url` holds a remote URL
--     for the review queue only; nothing is downloaded into our storage.
--
-- ACCESS MODEL
-- Only official APIs, published RSS/Atom feeds, and robots.txt-permitted
-- fetches. `ingestion_sources.access_mode` records which applies, and the
-- fetcher refuses to run a source whose mode it cannot satisfy. Nothing
-- here scrapes a platform whose terms prohibit it.
--
-- PUBLICATION MODEL
-- Nothing auto-publishes. Every extracted recipe lands in a review queue
-- and a human moderator approves it before it becomes a real row in
-- public.recipes.

-- ---------------------------------------------------------------------- --
-- 1. Sources
-- ---------------------------------------------------------------------- --

create table public.ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,

  -- How we are permitted to read this source. The fetcher hard-fails on a
  -- mode it has no compliant client for, rather than falling back to
  -- scraping.
  access_mode text not null check (access_mode in (
    'rss',            -- published feed, intended for syndication
    'youtube_api',    -- YouTube Data API v3
    'reddit_api',     -- Reddit OAuth API
    'x_api',          -- X API (paid tier)
    'sitemap',        -- robots.txt-permitted crawl of a public sitemap
    'partner_feed'    -- roaster/partner supplied feed, by agreement
  )),

  -- Feed / API endpoint. For *_api modes this is the channel, subreddit or
  -- account handle rather than a URL.
  endpoint text not null,
  site_url text,

  publisher text,
  country text,
  language text not null default 'en' check (language in ('en', 'ar')),

  -- Politeness. min_interval_seconds is enforced per-source by the fetcher
  -- on top of the global schedule.
  min_interval_seconds int not null default 10800 check (min_interval_seconds >= 60),
  robots_checked_at timestamptz,
  robots_allows boolean,

  -- Editorial trust. Feeds a recipe's initial data_confidence.
  trust_tier text not null default 'community' check (trust_tier in (
    'official',      -- the roaster/brand's own feed
    'editorial',     -- established publication
    'community'      -- forum, aggregator
  )),

  is_enabled boolean not null default true,
  -- Set false where credentials are not yet configured. The scheduler skips
  -- these without erroring, so connectors can ship dormant.
  is_configured boolean not null default true,

  last_run_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures int not null default 0,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingestion_sources_enabled_idx
  on public.ingestion_sources (is_enabled, is_configured) where is_enabled;
create index ingestion_sources_access_mode_idx on public.ingestion_sources (access_mode);

create trigger ingestion_sources_set_updated_at
  before update on public.ingestion_sources
  for each row execute function public.set_updated_at();

alter table public.ingestion_sources enable row level security;

-- Source registry is operational metadata, not user content: admins only.
create policy "only admins manage ingestion sources"
  on public.ingestion_sources for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

comment on table public.ingestion_sources is
  'Registry of permitted recipe sources. access_mode records the legal basis for reading each one (official API, published feed, or robots-permitted crawl); the fetcher refuses any source it cannot read compliantly.';

-- ---------------------------------------------------------------------- --
-- 2. Fetch runs — one row per source per scheduled execution
-- ---------------------------------------------------------------------- --

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ingestion_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed', 'skipped')),

  items_seen int not null default 0,
  items_new int not null default 0,
  items_extracted int not null default 0,
  items_duplicate int not null default 0,

  -- HTTP conditional-request state, so repeat runs are cheap and polite.
  http_etag text,
  http_last_modified text,

  error_message text
);

create index ingestion_runs_source_idx on public.ingestion_runs (source_id, started_at desc);
create index ingestion_runs_status_idx on public.ingestion_runs (status);

alter table public.ingestion_runs enable row level security;

create policy "only admins read ingestion runs"
  on public.ingestion_runs for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --
-- 3. Raw items — one row per discovered document
-- ---------------------------------------------------------------------- --

create table public.ingestion_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ingestion_sources(id) on delete cascade,
  run_id uuid references public.ingestion_runs(id) on delete set null,

  -- Canonical identity. external_id is the feed GUID / video id / post id.
  external_id text not null,
  url text not null,

  title text,
  author_name text,
  author_url text,
  published_at timestamptz,

  -- Remote media URL kept for the review queue only. Never downloaded,
  -- never re-served, never copied into Supabase Storage.
  source_image_url text,

  -- A SHORT excerpt, retained solely so a moderator can sanity-check the
  -- extraction against the original. Capped at 500 chars by the check
  -- below, never rendered on any public surface. Cleared once the item is
  -- approved or rejected (see purge_reviewed_excerpts()).
  raw_excerpt text check (raw_excerpt is null or char_length(raw_excerpt) <= 500),

  -- Content hash over the normalised parameter set, used for dedupe.
  content_hash text,

  status text not null default 'discovered' check (status in (
    'discovered',    -- fetched, not yet parsed
    'extracted',     -- parameters pulled out, awaiting review
    'no_recipe',     -- parsed, contained no usable brew parameters
    'duplicate',     -- matched an existing recipe
    'approved',      -- moderator accepted; linked to a real recipe
    'rejected'       -- moderator declined
  )),

  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source_id, external_id)
);

create index ingestion_items_status_idx on public.ingestion_items (status, discovered_at desc);
create index ingestion_items_hash_idx on public.ingestion_items (content_hash) where content_hash is not null;
create index ingestion_items_source_idx on public.ingestion_items (source_id, discovered_at desc);

create trigger ingestion_items_set_updated_at
  before update on public.ingestion_items
  for each row execute function public.set_updated_at();

alter table public.ingestion_items enable row level security;

create policy "only admins manage ingestion items"
  on public.ingestion_items for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

comment on column public.ingestion_items.raw_excerpt is
  'Moderator-only excerpt (<=500 chars) for verifying extraction against the original. Never rendered publicly; cleared on approve/reject.';
comment on column public.ingestion_items.source_image_url is
  'Remote URL only, for the review queue. Media is never downloaded or re-served — we have no licence to republish it.';

-- ---------------------------------------------------------------------- --
-- 4. Extracted parameters — the actual facts
-- ---------------------------------------------------------------------- --

create table public.ingestion_extractions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ingestion_items(id) on delete cascade,

  brew_method text references public.brew_methods(code),

  -- Coffee
  dose_grams numeric(6, 2) check (dose_grams is null or dose_grams > 0),
  -- Filter: water in. Espresso: liquid out (yield).
  water_grams numeric(7, 2) check (water_grams is null or water_grams > 0),
  yield_grams numeric(7, 2) check (yield_grams is null or yield_grams > 0),
  ratio numeric(6, 2),
  water_temp_c numeric(4, 1) check (water_temp_c is null or water_temp_c between 0 and 100),

  -- Grind
  grinder_name text,
  grind_setting text,

  -- Equipment
  brewer_name text,
  filter_type text,

  -- Time
  bloom_seconds int check (bloom_seconds is null or bloom_seconds >= 0),
  total_time_seconds int check (total_time_seconds is null or total_time_seconds > 0),

  -- Espresso pressure profile, as an ordered array of
  -- {bar, seconds, label} objects.
  pressure_profile jsonb,

  -- Pour schedule, as ordered {at_seconds, water_grams, is_bloom} objects.
  pour_schedule jsonb,

  -- Extraction measurements, where the source published them.
  tds numeric(4, 2) check (tds is null or tds between 0 and 30),
  extraction_yield numeric(4, 2) check (extraction_yield is null or extraction_yield between 0 and 40),

  -- Provenance of the coffee itself, where stated.
  bean_name text,
  roaster_name text,
  origin_country text,
  origin_region text,
  process text,
  varietal text,
  roast_level text,

  -- Which fields the parser actually found, and how sure it is. Drives the
  -- review queue's sort order — high-confidence complete extractions first.
  extracted_fields text[] not null default '{}',
  confidence numeric(3, 2) not null default 0 check (confidence between 0 and 1),

  -- Resolved links, filled by the entity-matching pass.
  matched_bean_id uuid references public.beans(id) on delete set null,
  matched_roaster_id uuid references public.roasters(id) on delete set null,

  -- Set once a moderator approves and the recipe is created.
  created_recipe_id uuid references public.recipes(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (item_id)
);

create index ingestion_extractions_confidence_idx on public.ingestion_extractions (confidence desc);
create index ingestion_extractions_method_idx on public.ingestion_extractions (brew_method);
create index ingestion_extractions_recipe_idx on public.ingestion_extractions (created_recipe_id)
  where created_recipe_id is not null;

create trigger ingestion_extractions_set_updated_at
  before update on public.ingestion_extractions
  for each row execute function public.set_updated_at();

alter table public.ingestion_extractions enable row level security;

create policy "only admins manage extractions"
  on public.ingestion_extractions for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --
-- 5. Review decisions — an audit trail of who approved what
-- ---------------------------------------------------------------------- --

create table public.ingestion_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ingestion_items(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected', 'merged')),
  -- Set when decision = 'merged': the existing recipe this was folded into.
  merged_into_recipe_id uuid references public.recipes(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index ingestion_reviews_item_idx on public.ingestion_reviews (item_id);

alter table public.ingestion_reviews enable row level security;

create policy "only admins and moderators review ingestion"
  on public.ingestion_reviews for all
  using ((select private.has_role('admin')) or (select private.has_role('moderator')))
  with check ((select private.has_role('admin')) or (select private.has_role('moderator')));

-- ---------------------------------------------------------------------- --
-- 6. Excerpt retention
-- ---------------------------------------------------------------------- --

-- Excerpts exist only to support the review decision. Once that decision is
-- made they serve no purpose and holding third-party text indefinitely is
-- exactly what we do not want, so they are cleared on resolution.
create or replace function public.purge_reviewed_excerpts()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ingestion_items
     set raw_excerpt = null
   where raw_excerpt is not null
     and status in ('approved', 'rejected', 'duplicate', 'no_recipe');
$$;

revoke all on function public.purge_reviewed_excerpts() from public;
grant execute on function public.purge_reviewed_excerpts() to service_role;

comment on function public.purge_reviewed_excerpts is
  'Clears retained source excerpts once an item has been resolved. Run after each ingestion cycle so third-party text is never held longer than the review requires.';

-- ---------------------------------------------------------------------- --
-- 7. Review queue view
-- ---------------------------------------------------------------------- --

create or replace view public.ingestion_review_queue as
  select
    i.id              as item_id,
    i.url,
    i.title,
    i.author_name,
    i.author_url,
    i.published_at,
    i.source_image_url,
    i.raw_excerpt,
    i.status,
    i.discovered_at,
    s.name            as source_name,
    s.publisher,
    s.trust_tier,
    s.access_mode,
    e.id              as extraction_id,
    e.brew_method,
    e.dose_grams,
    e.water_grams,
    e.yield_grams,
    e.ratio,
    e.water_temp_c,
    e.grinder_name,
    e.grind_setting,
    e.brewer_name,
    e.bloom_seconds,
    e.total_time_seconds,
    e.pressure_profile,
    e.pour_schedule,
    e.tds,
    e.extraction_yield,
    e.bean_name,
    e.roaster_name,
    e.origin_country,
    e.process,
    e.varietal,
    e.roast_level,
    e.extracted_fields,
    e.confidence,
    e.matched_bean_id,
    e.matched_roaster_id
  from public.ingestion_items i
  join public.ingestion_sources s on s.id = i.source_id
  left join public.ingestion_extractions e on e.item_id = i.id
  where i.status = 'extracted';

comment on view public.ingestion_review_queue is
  'Flattened queue of extracted-but-unreviewed items for the admin UI. Inherits RLS from its base tables (admin/moderator only).';
