# BeanMora — Development phases, MVP scope, roadmap

## Status: Phase 1 complete, Phase 2 (GCC data foundation) delivered in this pass

Phase 2 was a separate, later spec ("BeanMora — Phase 2: GCC Coffee Beans,
Recipes & Community Data") layered on top of Phase 1's app skeleton — it is
not the same as the "Phase 2 — Profiles & Gear" step in the original 8-phase
plan below (that step is still pending; see the phase list further down,
which is unchanged from the original spec numbering). This section
summarizes what the GCC-data-foundation pass added.

**Schema (done):** migrations 12–17 — GCC geography (`countries`, `cities`,
roaster locations/shipping), the Coffee-Lot/Roasted-Product split with full
price/availability/source/image history, recipe provenance + verification,
bean/recipe reviews split from confirmed brew attempts with a computed
Recipe Score, personal bean inventory + brew-log adjustment history, and the
full admin pipeline (import jobs, research jobs, duplicate candidates,
roaster claims, correction requests). 62 tables total, RLS on every one,
verified with a static forward-reference checker (no live Postgres available
in this environment) — see `docs/DATABASE.md` §6.

**Real research (done, Wave 1 only):** `supabase/research/kuwait/` — 3
independently verified Kuwait specialty roasters (ORU Roasters, 48 East
Coffee Roasters, Roots Roastery) with real source URLs and
`last_verified_at` timestamps, plus 5 discovered-but-unverified roasters
flagged `data_confidence: "unverified"` pending independent fetch
verification. Nothing was written to the live database — the anon key has
still not been provided, so this data exists only as reviewable JSON, not as
rows an admin has approved through the import-preview flow described in
§6.5. Waves 2–4 (Saudi Arabia, UAE, then Qatar/Bahrain/Oman) are not started.

**UI (triaged, partial by design):** given the size of the full Phase 2 spec
(28 sections), UI effort was deliberately focused on the highest-value new
surfaces rather than attempting full coverage in one pass: a real roaster
detail page with data-confidence/verification badges, a "My Beans" inventory
page with client-computed freshness alerts, and admin-gated stub pages for
the research and import queues. Not built yet: the product detail page
(coffee-lot + roasted-product view with prices/availability/images), the
review-vs-attempt submission flow, GCC search/filter facets, multi-currency
display, the roaster portal, and the admin import preview UI itself (the
`data_import_jobs`/`data_import_rows` tables and governance rules exist;
the screen that renders a diff and asks an admin to approve it does not).

**Duplicate detection (done):** `src/lib/duplicate-detection.ts` — pure,
unit-tested (12 tests) similarity scoring for coffee lots and roasted
products, feeding `suggestAction()` (`merge` / `needs_review` /
`keep_separate`). Suggestions only — nothing in the codebase executes a
merge automatically, per the explicit requirement.

**Historical note:** several items originally listed here as missing have since shipped, including GCC roaster seed coverage, GCC catalog filters, product discovery/detail, and product price/availability history UI. Use the 2026-09-21 implementation snapshot above as the authoritative current status.

## Current implementation snapshot — 2026-09-21

The repository has moved materially beyond the older status notes below. The following surfaces are now present in the application and should be treated as the baseline for future work:

- Profiles, settings, gear CRUD, My Beans inventory, bean and equipment detail pages.
- Discover search across beans, roasters, recipes, and equipment with real database-backed filtering.
- GCC roaster seed coverage for Kuwait, Saudi Arabia, UAE, Qatar, Bahrain, and Oman (migrations 26–27), plus catalog provenance and equipment/recipe seed migrations through 29.
- V60 guided brewing, Espresso dial-in, recipe creation/detail, saved content, community feed/detail/actions, notifications, xBloom hub, and admin ingestion/research surfaces.
- Phase 2 roasted-product discovery at `/products`, with GCC country/currency filtering.
- Roasted-product detail pages with Coffee Lot provenance, source/confidence metadata, price history, and availability history.
- Anonymous guest access controls and localized OAuth callback are implemented.

### Highest-priority remaining work

1. **Admin import preview and approval workflow** — turn the existing `data_import_jobs` / `data_import_rows` model into a complete review UI with row-level validation, conflict/duplicate presentation, and explicit approval. No automatic publishing.
2. **Catalog depth and freshness** — continuously expand reviewed roaster/products across all GCC countries and surface stale-data warnings based on `last_verified_at`.
3. **Price intelligence** — normalized price-per-100g comparison, price history trends, and cross-roaster comparison while preserving original currency/source evidence. Currency conversion must carry rate source and timestamp rather than silently rewriting source prices.
4. **Roaster portal** — claim/verification flow, owned product management, locations/shipping, corrections, and provenance-aware edits.
5. **Quality/release hardening** — run migrations against the linked Supabase project, generate strict DB types, broaden Playwright coverage, accessibility review, Core Web Vitals/performance budget, and production monitoring.
6. **Community completion** — finish moderation and notification-generation paths and verify guest restrictions across every newly interactive action.
7. **xBloom** — keep direct sync disabled until an official supported integration exists; continue improving safe export/fallback workflows.

## Status: Phase 1 complete (original 8-phase plan, below)

- Next.js 15 (App Router) + TypeScript + Tailwind v4, pinned dependency
  versions with `package-lock.json` committed.
- i18n: `ar` (default) / `en`, full RTL/LTR, central `messages/{ar,en}.json`
  — no hardcoded UI strings in components.
- Design tokens matching the BeanMora brand palette; light/warm theme by
  default, optional dimmed (not black) alternate theme.
- Supabase project wired (`ubvzdglrwkkuaigmkjap`): browser client, server
  client, middleware session refresh, typed query surface (loosened types
  until `supabase gen types` is run post-migration).
- Auth: login, signup, forgot/reset password, email confirmation, Google
  OAuth button — all real Supabase Auth calls, not stubs.
- Onboarding: experience → brew methods → flavors → roast, each step
  skippable, writes to `user_preferences` / `profiles`.
- App shell: header (search, add-recipe, notifications, language switch),
  desktop sidebar, mobile bottom nav, all i18n- and RTL-aware.
- Home: real Supabase query against `recipes`, with explicit
  Loading/Empty/Error states — no mock data.
- Every sitemap route from the spec exists and is navigable, localized, and
  wrapped in the authenticated shell (or public shell for auth routes).
- Full database schema: 38 tables across 11 migrations, RLS enabled and
  policied on every table and on `storage.objects`, 6 storage buckets with
  size/MIME limits.
- `src/lib/integrations/xbloom.ts`: typed provider interface, feature flag
  `XBLOOM_DIRECT_SYNC_ENABLED` (false), every "connected" method throws
  rather than faking success; JSON export is the one real working path
  today.
- PWA manifest + generated icon set + favicon.
- `npm run build`, `npx tsc --noEmit`, and `next lint` all pass clean.

## Remaining phases (spec §40, unchanged)

**Phase 2 — Profiles & Gear**
Full profile page (bio, equipment, stats, badges), settings page (language,
theme, account deletion, session management), `/gear` CRUD against
`user_equipment`, avatar upload to the `avatars` bucket.

**Phase 3 — Beans & Roasters**
`/discover` and `/beans` search + the full filter set (origin, process,
roast, flavor, roast date, "fits my gear"), full-text search
(`pg_trgm`/`unaccent`, already enabled in migration 01), bean/roaster
detail pages, admin CRUD + CSV import for beans/roasters/equipment.

**Phase 4 — Recipes**
Multi-step V60/Espresso recipe builder with live ratio/time calculation and
pour-sum validation, recipe detail page, rating UI, save/collections UI
(tables already exist), recipe versioning on edit ("copy and tweak").

**Phase 5 — Guided Brewing**
V60 guided brew timer (bloom → pours → done, wake-lock, optional
sound/vibration), Espresso dial-in assistant (rule-based, per spec §15 —
no ML claims), brew log capture + taste feedback form wired to
`brew_logs`/`brew_log_taste_scores`.

**Phase 6 — xBloom**
`/xbloom` hub, device management (`xbloom_devices`), recipe builder with
dose/model validation, the fallback action set (save/copy/export
JSON+PDF/QR) fully wired through `xbloomIntegration.exportRecipe()`. Direct
sync stays behind the feature flag until an official API/partnership
exists — `xbloom_sync_jobs` / `integration_connections` are ready for that
day but unused until then.

**Phase 7 — Community**
Post composer + feed (`posts`/`post_media`), likes/comments/follow UI,
notifications UI (table exists; needs the server-side triggers that insert
rows — see migration 09 comment), moderation queue.

**Phase 8 — Admin & Quality**
Full `/admin` dashboard (users, content, reports, stats, translation
management), accessibility pass, Playwright E2E suite (`e2e/` scaffolded
in Phase 1, specs added per feature as it ships), performance budget
(Lighthouse 90+).

## MVP scope

The minimum releasable product is Phases 1–5: auth/onboarding, beans
browsing, V60 + Espresso recipe creation and rating, guided V60 brewing,
and brew logging. Phases 6–8 (xBloom, community, admin) can ship
incrementally after MVP without blocking launch, since the schema and
integration boundaries for all three already exist.

## Explicit non-negotiables carried into every phase

No mock/fake data in production. No claim of an official xBloom
partnership or working direct sync until one exists. No `service_role` key
in client code. No RLS bypass. No hardcoded UI copy outside
`messages/*.json`.
