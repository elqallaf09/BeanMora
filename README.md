# BeanMora — Coffee Recipes & More · وصفات القهوة وأكثر

A bilingual (Arabic-default/RTL + English/LTR) specialty-coffee community
platform: beans & roasters, V60/Espresso/xBloom recipes, guided brewing,
gear tracking, and a coffee-focused community feed.

This repository is **Phase 1 (Foundation)** of the build — see
[`docs/ROADMAP.md`](docs/ROADMAP.md) for what's shipped vs. what's next,
and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) /
[`docs/DATABASE.md`](docs/DATABASE.md) /
[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) for the full design.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui-style
components (Radix primitives) · Supabase (Postgres, Auth, Storage, RLS) ·
next-intl (ar/en) · Vitest (unit) · Playwright (E2E) · PWA manifest.

## Getting started

```bash
npm install
cp .env.example .env.local   # already pre-filled with the linked project's
                              # URL — you still need to add the anon key
npm run dev
```

Open `http://localhost:3000` — it redirects to `/ar` (default locale).

### Environment variables

See `.env.example`. The publishable Supabase URL/anon key are safe to
commit-adjacent (`.env.local` is still gitignored); `SUPABASE_SERVICE_ROLE_KEY`
must never be set in anything that reaches the browser bundle and is only
read from trusted server contexts (Server Actions / Edge Functions), none of
which exist yet in Phase 1.

Get the anon key from the Supabase dashboard → Project Settings → API →
"anon public" key, for project `ubvzdglrwkkuaigmkjap`.

## Database

All schema lives in `supabase/migrations/*.sql` (38 tables, RLS on every
table, 6 storage buckets). Apply with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref ubvzdglrwkkuaigmkjap
npx supabase db push
```

Then load reference data (brew method lookup rows — not demo/sample data):

```bash
psql "$DATABASE_URL" -f supabase/seed/brew_methods.sql
```

Regenerate types after any schema change:

```bash
npx supabase gen types typescript --project-id ubvzdglrwkkuaigmkjap > src/lib/supabase/types.ts
```

Full RLS policy matrix: [`docs/DATABASE.md`](docs/DATABASE.md).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (Next.js flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E (builds + serves the app first) |

Run lint + typecheck + test before every merge.

## i18n & RTL

- Default locale is `ar`; `en` is available via the header language switch.
- All UI copy lives in `messages/ar.json` / `messages/en.json` — never
  hardcode strings in components.
- `dir="rtl"`/`dir="ltr"` is set on `<html>` per-locale in
  `src/app/[locale]/layout.tsx`. Use Tailwind logical properties
  (`ps-`, `pe-`, `ms-`, `me-`) for anything that should flip; see
  `docs/DESIGN-SYSTEM.md` for the full RTL ruleset.

## xBloom

BeanMora is an **independent platform**. There is no public xBloom API
today, so `src/lib/integrations/xbloom.ts` never calls an undocumented
endpoint and never asks for xBloom credentials. Direct sync is gated behind
`NEXT_PUBLIC_XBLOOM_DIRECT_SYNC_ENABLED=false` until an official
integration exists; the working fallback path is JSON export.

## Project structure

```
src/
  app/[locale]/            App Router pages (see docs/ARCHITECTURE.md §2)
    (auth)/                 login, signup, forgot/reset password, confirm
    (app)/                  authenticated shell: home, discover, beans,
                             recipes, v60, espresso, xbloom, brew, saved,
                             community, profile, settings, gear,
                             notifications, admin
    onboarding/
  components/
    ui/, layout/, shared/   see docs/ARCHITECTURE.md §4
  lib/
    supabase/                browser/server/middleware clients
    integrations/xbloom.ts
    recipe-calculations.ts   pure ratio/pour-sum/time math (unit-tested)
  i18n/                      next-intl routing/navigation/request config
messages/{ar,en}.json        central translation files
supabase/migrations/         schema + RLS (11 files, apply in order)
supabase/seed/                 reference data only, safe for any environment
docs/                         architecture, database/RLS, design system, roadmap
e2e/                          Playwright specs
```

## Deployment

Target is Vercel. Set the same environment variables from `.env.example` in
the Vercel project settings (including the real anon key and, once needed,
`SUPABASE_SERVICE_ROLE_KEY` as a server-only secret). No project-specific
`vercel.json` is required for Phase 1.
