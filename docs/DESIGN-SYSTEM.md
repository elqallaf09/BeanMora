# BeanMora — Design system

## Brand

- Name: **BeanMora** — "Coffee Recipes & More" / "وصفات القهوة وأكثر"
- Personality: modern, vibrant, warm, professional, specialty-coffee-native,
  welcoming to beginners and pros. Explicitly **not** a dark/all-brown
  traditional coffee-shop look — teal is the interactive accent, not brown.

## Color tokens (`src/app/globals.css`, `@theme inline`)

| Token | Hex | Usage |
|---|---|---|
| `--color-espresso` | `#2B1812` | Headings, logo ink |
| `--color-roast-brown` | `#5A321E` | Secondary text on cream surfaces |
| `--color-caramel` | `#D38746` | Accent buttons, bean/coffee-related details |
| `--color-copper` | `#B85E2E` | Accent hover state |
| `--color-cream` | `#F8F0E4` | App background, muted surfaces |
| `--color-soft-white` | `#FFFDF9` | Card/base background |
| `--color-teal` | `#1FA7A0` | Primary buttons, links, active nav, focus ring |
| `--color-dark-text` | `#1C1714` | Body text |
| `--color-muted-text` | `#75675F` | Secondary text, placeholders |
| `--color-success` | `#2E9B69` | Success states |
| `--color-warning` | `#E7A83E` | Warning states |
| `--color-error` | `#D84C4C` | Error states, destructive actions |

BeanMora does not ship a fully black dark theme. `.theme-dark` (Settings →
Appearance) dims surfaces to warm dark-brown tones while keeping teal as the
interactive color — never pure black/gray.

## Typography

- Arabic: **IBM Plex Sans Arabic** (400/500/600/700), loaded via
  `next/font/google` as `--font-ibm-plex-arabic`.
- Latin: **Geist** (`--font-geist-sans`) for UI text, **Geist Mono** for
  numeric/timer displays.
- `html[dir="rtl"]` prefers the Arabic family first with Latin fallback (for
  embedded English brand/product names); `dir="ltr"` is the reverse.
- Numerals are always rendered as ASCII 0–9 in both locales — no
  Arabic-Indic digit substitution.

## RTL / LTR rules

- `<html dir="rtl">` for `ar`, `dir="ltr"` for `en`, set in
  `src/app/[locale]/layout.tsx` from the resolved locale.
- Use logical Tailwind utilities (`ps-`, `pe-`, `ms-`, `me-`, `start-`,
  `end-`) instead of `pl-`/`pr-`/`left-`/`right-` wherever direction should
  flip. A few call sites intentionally use `ltr:`/`rtl:` variants (e.g. the
  header search icon) where logical utilities alone aren't expressive
  enough.
- Icons that encode direction (chevrons, arrows) get `.icon-flip-rtl`;
  photos, avatars, and the logo are never flipped.

## Motion

- `prefers-reduced-motion: reduce` collapses all animation/transition
  durations to near-zero globally (see `globals.css`).
- Two brand keyframes ship in Phase 1: `animate-bloom` (pulsing circle, for
  V60 bloom-timer/loading use) and `animate-drop` (falling coffee drop, for
  loading states). Splash-screen bean→drop→steam→logo sequence and the
  guided-brew pour/cup-fill animations are built alongside the Guided Brew
  Mode in Phase 5, reusing these same keyframes rather than inventing new
  motion language.

## Logo system

`src/components/layout/logo.tsx` — a two-color monogram: a caramel bean
silhouette with an espresso-colored center crease drawn as a soft curve
(reads as a bean crease and an implied "B"), plus a small teal rising-steam
mark above it. Deliberately simple so it holds up at 16×16 (favicon).

Generated today: favicon (16–512px PNG set in `public/icons/`, source
`public/icons/icon.svg`), PWA manifest icons (`public/manifest.json`,
including a maskable variant), in-app header/sidebar/auth-layout usage.

Not yet produced (needs a dedicated visual-design pass, not code): full
horizontal/vertical lockups as standalone export files, dark/mono variants
as separate assets, and the animated splash-screen sequence as a shippable
Lottie/video asset. The monogram component is the source of truth these
would be derived from.

## Components

Base primitives follow shadcn/ui conventions (Radix + `class-variance-authority`
+ `tailwind-merge`) so the rest of the component library (Phase 3+) can
adopt shadcn's CLI/registry directly instead of hand-rolling. See
`ARCHITECTURE.md §4` for the current component inventory.
