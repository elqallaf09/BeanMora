# BeanMora — Development phases, MVP scope, roadmap

## Status: Phase 1 complete (this delivery)

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
