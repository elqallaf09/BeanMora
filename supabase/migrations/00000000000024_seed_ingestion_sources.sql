-- BeanMora — 24: seed the ingestion source registry.
--
-- Forward-only. Does not modify migrations 01-23.
--
-- Mirrors src/lib/ingestion/sources.ts. That file remains the source of
-- truth for the fetchers; this migration exists so the DB has matching rows
-- for run bookkeeping (last_run_at, etag, failure counts) which live only in
-- the database.
--
-- IDEMPOTENT BY DESIGN. Every insert is `on conflict (slug) do update` and
-- deliberately updates ONLY descriptive columns — never is_enabled,
-- last_run_at, last_success_at or consecutive_failures. Re-running this
-- migration (or applying it to an environment that has already been
-- ingesting) must not re-enable a source an operator switched off, and must
-- not erase run history.
--
-- Three states a seeded source can be in:
--   is_enabled = true,  is_configured = true   → runs on the next cycle
--   is_enabled = true,  is_configured = false  → dormant, needs an API key
--   is_enabled = false                          → parked, needs a partner
--                                                 agreement before use

-- ---------------------------------------------------------------------- --
-- 1. Editorial publications — published feeds, live immediately
-- ---------------------------------------------------------------------- --

insert into public.ingestion_sources
  (slug, name, access_mode, endpoint, site_url, publisher, language, trust_tier,
   min_interval_seconds, is_enabled, is_configured, notes)
values
  ('sprudge', 'Sprudge', 'rss',
   'https://sprudge.com/feed', 'https://sprudge.com', 'Sprudge Media Network',
   'en', 'editorial', 10800, true, true,
   'Specialty coffee news and competition coverage.'),

  ('perfect-daily-grind', 'Perfect Daily Grind', 'rss',
   'https://perfectdailygrind.com/feed/', 'https://perfectdailygrind.com', 'Perfect Daily Grind',
   'en', 'editorial', 10800, true, true,
   null),

  ('coffee-chronicler', 'The Coffee Chronicler', 'rss',
   'https://coffeechronicler.com/feed/', 'https://coffeechronicler.com', 'The Coffee Chronicler',
   'en', 'editorial', 10800, true, true,
   'Frequently publishes explicit brew recipes with full parameters — historically the highest-yield feed.'),

  ('european-coffee-trip', 'European Coffee Trip', 'rss',
   'https://europeancoffeetrip.com/feed/', 'https://europeancoffeetrip.com', 'European Coffee Trip',
   'en', 'editorial', 10800, true, true,
   null),

  ('barista-hustle', 'Barista Hustle', 'rss',
   'https://www.baristahustle.com/blog/feed/', 'https://www.baristahustle.com', 'Barista Hustle',
   'en', 'editorial', 10800, true, true,
   'Most of their material is paywalled course content. Only the public blog feed is read.')
on conflict (slug) do update set
  name       = excluded.name,
  endpoint   = excluded.endpoint,
  site_url   = excluded.site_url,
  publisher  = excluded.publisher,
  trust_tier = excluded.trust_tier,
  notes      = excluded.notes;
  -- Intentionally NOT updated: is_enabled, is_configured, last_run_at,
  -- last_success_at, consecutive_failures, robots_* — those are operational
  -- state owned by the running system, not by this migration.

-- ---------------------------------------------------------------------- --
-- 2. Roasters — parked pending partner agreement
--
-- These publish genuinely useful per-lot recipes, but a roaster's blog is
-- their marketing copy and their photography. We register them so the
-- relationship is visible in the admin UI, and leave them DISABLED until
-- someone has actually agreed. Flipping is_enabled is a deliberate act.
-- ---------------------------------------------------------------------- --

insert into public.ingestion_sources
  (slug, name, access_mode, endpoint, site_url, publisher, country, language,
   trust_tier, min_interval_seconds, is_enabled, is_configured, notes)
values
  ('onyx-coffee-lab', 'Onyx Coffee Lab', 'partner_feed',
   'https://onyxcoffeelab.com/blogs/news.atom', 'https://onyxcoffeelab.com', 'Onyx Coffee Lab',
   'United States', 'en', 'official', 21600, false, true,
   'Publishes per-lot brew recipes. DISABLED pending partner agreement.'),

  ('sey-coffee', 'Sey Coffee', 'partner_feed',
   'https://www.seycoffee.com/blogs/news.atom', 'https://www.seycoffee.com', 'Sey Coffee',
   'United States', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.'),

  ('coffee-collective', 'The Coffee Collective', 'partner_feed',
   'https://coffeecollective.dk/feed/', 'https://coffeecollective.dk', 'The Coffee Collective',
   'Denmark', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.'),

  ('la-cabra', 'La Cabra', 'partner_feed',
   'https://lacabra.dk/blogs/journal.atom', 'https://lacabra.dk', 'La Cabra',
   'Denmark', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.'),

  ('april-coffee', 'April Coffee Roasters', 'partner_feed',
   'https://aprilcoffeeroasters.com/blogs/news.atom', 'https://aprilcoffeeroasters.com', 'April Coffee Roasters',
   'Denmark', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.')
on conflict (slug) do update set
  name       = excluded.name,
  endpoint   = excluded.endpoint,
  site_url   = excluded.site_url,
  publisher  = excluded.publisher,
  country    = excluded.country,
  trust_tier = excluded.trust_tier,
  notes      = excluded.notes;

-- ---------------------------------------------------------------------- --
-- 3. Equipment manufacturers — official brew guides, same gating
-- ---------------------------------------------------------------------- --

insert into public.ingestion_sources
  (slug, name, access_mode, endpoint, site_url, publisher, country, language,
   trust_tier, min_interval_seconds, is_enabled, is_configured, notes)
values
  ('fellow', 'Fellow', 'partner_feed',
   'https://fellowproducts.com/blogs/brew-guides.atom', 'https://fellowproducts.com', 'Fellow',
   'United States', 'en', 'official', 21600, false, true,
   'Official brew guides. DISABLED pending partner agreement.'),

  ('cafec', 'CAFEC', 'partner_feed',
   'https://cafec-jp.com/feed/', 'https://cafec-jp.com', 'Sanyo Sangyo / CAFEC',
   'Japan', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.'),

  ('orea', 'OREA Brewing', 'partner_feed',
   'https://oreabrewing.com/blogs/news.atom', 'https://oreabrewing.com', 'OREA',
   'United Kingdom', 'en', 'official', 21600, false, true,
   'DISABLED pending partner agreement.')
on conflict (slug) do update set
  name       = excluded.name,
  endpoint   = excluded.endpoint,
  site_url   = excluded.site_url,
  publisher  = excluded.publisher,
  country    = excluded.country,
  trust_tier = excluded.trust_tier,
  notes      = excluded.notes;

-- ---------------------------------------------------------------------- --
-- 4. Credential-gated connectors — enabled but not configured
--
-- is_enabled = true, is_configured = false: the operator WANTS these to run,
-- they simply cannot until a key exists. The scheduler reports them as
-- "skipped: dormant" rather than failing, so they never trip the
-- consecutive-failure backoff. Set is_configured = true once the matching
-- secret is set on the Edge Function (see the UPDATE statements at the
-- bottom of this file for ready-to-run commands).
-- ---------------------------------------------------------------------- --

insert into public.ingestion_sources
  (slug, name, access_mode, endpoint, site_url, publisher, language,
   trust_tier, min_interval_seconds, is_enabled, is_configured, notes)
values
  ('yt-james-hoffmann', 'James Hoffmann (YouTube)', 'youtube_api',
   'UCMb0O2CdPBNi-QqPk5T3gsQ', 'https://www.youtube.com/@jameshoffmann', 'James Hoffmann',
   'en', 'editorial', 10800, true, false,
   'Needs YOUTUBE_API_KEY. Reads title + description only; video is never copied or re-hosted.'),

  ('yt-lance-hedrick', 'Lance Hedrick (YouTube)', 'youtube_api',
   'UCSMBH8gO_o0zvbYCcqbQNHg', 'https://www.youtube.com/@LanceHedrick', 'Lance Hedrick',
   'en', 'editorial', 10800, true, false,
   'Needs YOUTUBE_API_KEY.'),

  ('r-coffee', 'r/Coffee', 'reddit_api',
   'Coffee', 'https://www.reddit.com/r/Coffee/', 'Reddit',
   'en', 'community', 10800, true, false,
   'Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET. User-posted images are never retained.'),

  ('r-espresso', 'r/espresso', 'reddit_api',
   'espresso', 'https://www.reddit.com/r/espresso/', 'Reddit',
   'en', 'community', 10800, true, false,
   'Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.'),

  ('r-pourover', 'r/pourover', 'reddit_api',
   'pourover', 'https://www.reddit.com/r/pourover/', 'Reddit',
   'en', 'community', 10800, true, false,
   'Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.'),

  ('x-coffee-recipes', 'X — coffee recipe search', 'x_api',
   '(v60 OR aeropress OR espresso) (recipe OR dose OR ratio) -is:retweet lang:en',
   'https://x.com', 'X', 'en', 'community', 10800, true, false,
   'Needs X_API_BEARER_TOKEN on a paid tier permitting recent-search.')
on conflict (slug) do update set
  name       = excluded.name,
  endpoint   = excluded.endpoint,
  site_url   = excluded.site_url,
  publisher  = excluded.publisher,
  trust_tier = excluded.trust_tier,
  notes      = excluded.notes;

-- ---------------------------------------------------------------------- --
-- 5. Operator runbook
-- ---------------------------------------------------------------------- --

comment on column public.ingestion_sources.is_configured is
  'False means the source needs credentials that are not set yet. The scheduler reports these as "skipped: dormant" and they never count as failures. Flip to true after setting the matching Edge Function secret.';

-- Ready-to-run, after setting the corresponding secret:
--
--   supabase secrets set YOUTUBE_API_KEY=...
--     update public.ingestion_sources set is_configured = true
--      where access_mode = 'youtube_api';
--
--   supabase secrets set REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=...
--     update public.ingestion_sources set is_configured = true
--      where access_mode = 'reddit_api';
--
--   supabase secrets set X_API_BEARER_TOKEN=...
--     update public.ingestion_sources set is_configured = true
--      where access_mode = 'x_api';
--
-- After a partner agreement is signed:
--     update public.ingestion_sources set is_enabled = true
--      where slug = 'onyx-coffee-lab';
