# BeanMora — Product & Information Architecture

## 1. Product architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Client (PWA)                                                     │
│  Next.js 15 App Router · TypeScript · Tailwind v4 · shadcn/ui    │
│  next-intl (ar/en, RTL/LTR) · Server Components by default       │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ Server Components / Actions       │ Browser client
                ▼                                    ▼
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ Supabase (single project)    │        │ @supabase/ssr (anon key)     │
│  - Postgres + RLS on every    │◄──────►│  - Session cookie refresh    │
│    exposed table              │        │  - Realtime (notifications,  │
│  - Auth (email/pw + Google)   │        │    guided-brew presence –    │
│  - Storage (6 buckets, RLS)   │        │    Phase 5+)                 │
│  - Edge Functions (future:    │        │                               │
│    xBloom OAuth relay)        │        │                               │
└─────────────────────────────┘        └─────────────────────────────┘
                ▲
                │ service_role (server-only, never in browser bundle)
                │
┌─────────────────────────────┐
│ Admin actions / moderation    │
│  Server Actions using          │
│  user_roles + has_role() RLS   │
│  helper — never user_metadata  │
└─────────────────────────────┘

External, explicitly NOT integrated yet:
┌─────────────────────────────┐
│ xBloom (no public API today)  │  → src/lib/integrations/xbloom.ts
│  Fallback: export JSON/PDF/QR │    gates all direct-sync UI behind
│  Feature flag: DIRECT_SYNC=false  NEXT_PUBLIC_XBLOOM_DIRECT_SYNC_ENABLED
└─────────────────────────────┘
```

Deploy target: Vercel (Next.js) + Supabase (managed Postgres/Auth/Storage).
Local dev talks to the same hosted Supabase project via `.env.local`
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## 2. Information architecture / sitemap

```
/                              Public landing (locale switch, login/signup CTAs)
/[locale]/login                Auth
/[locale]/signup               Auth
/[locale]/forgot-password      Auth
/[locale]/reset-password       Auth
/[locale]/confirm              Auth (email OTP verification → onboarding)
/[locale]/onboarding           Post-signup, gated on session

/[locale]/home                 Authenticated shell (sidebar/bottom nav) ↓
/[locale]/discover
/[locale]/beans
/[locale]/beans/[slug]
/[locale]/roasters
/[locale]/roasters/[slug]
/[locale]/recipes
/[locale]/recipes/[id]
/[locale]/recipes/create
/[locale]/v60
/[locale]/espresso
/[locale]/xbloom
/[locale]/brew
/[locale]/saved
/[locale]/community
/[locale]/profile/[username]
/[locale]/settings
/[locale]/gear
/[locale]/notifications
/[locale]/admin                Role-gated (user_roles: admin | moderator)
```

Every route above exists today as a real Next.js route (see
`src/app/[locale]/`). Routes not yet carrying full feature logic render
through the shared `EmptyState` component with a phase note pointing to
`ROADMAP.md` — they are navigable, translated, and RTL-correct, not design
mocks.

## 3. Primary user flows

**Sign up → onboarding → first brew**
`/signup` → email confirmation (`/confirm`) → `/onboarding` (experience →
brew methods → flavors → roast, each skippable) → `/home` with
preferences saved to `user_preferences`.

**Create and brew a V60 recipe** (Phase 4–5 target)
`/v60` → `/recipes/create` (multi-step builder, ratio/time auto-calculated)
→ save as draft or publish → `/brew` guided timer → post-brew taste
feedback → `brew_logs` + `brew_log_taste_scores`.

**Discover → save → collection**
`/discover` filters → `/beans/[slug]` → save bean / view best V60 & Espresso
recipe for that bean → `/recipes/[id]` → save to a named collection
(`recipe_collections` + `recipe_collection_items`).

**xBloom recipe without direct sync**
`/xbloom` → recipe builder validates dose (5–18g) per device model →
`Save in BeanMora` / `Export JSON` / `Export PDF card` / `Generate QR` —
`Sync to xBloom` renders disabled with "official integration required"
(`XBLOOM_DIRECT_SYNC_ENABLED=false`).

**Moderation**
User reports content (`reports`) → moderator/admin (`user_roles`) reviews
in `/admin` → `moderation_actions` row recorded → content `is_hidden` set →
`audit_logs` entry.

## 4. Component inventory (Phase 1 baseline)

```
src/components/
  ui/            Button, Input, Label, Card (shadcn-style primitives)
  layout/        Header, Sidebar, BottomNav, LanguageSwitcher, Logo, nav-items
  shared/        LoadingState, EmptyState, ErrorState (used everywhere —
                 never render mock data instead of one of these)
  auth/          (form logic currently inlined per-page; extract to
                 shared hooks once a 3rd auth form repeats the pattern)
  onboarding/    (stepper currently inlined in onboarding/page.tsx)
```

Later phases add: `RecipeCard`, `BeanCard`, `RatingStars`, `BrewTimer`,
`PourVisualizer`, `RecipeStepEditor`, `EquipmentPicker`, `PostComposer`,
`CommentThread`, `NotificationItem`, `AdminDataTable` — each introduced in
the migration that ships its backing table (see `ROADMAP.md`).
