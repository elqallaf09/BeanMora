# BeanMora 0.5.10

Navigation no longer rebuilds multilingual coffee search documents or scans the recipe list for each coffee on every Shell render. Coffee filters are memoized; empty queries skip indexing; populated search documents use weak references shared between screens. Synonym normalization happens once. Recommendations run only when their screen is selected. Search results and publication filters remain unchanged.

Account creation has its own welcome copy, labeled email/password fields, password confirmation, an always available password visibility control, native autofill/keyboard navigation, validation before a network request, pending feedback and confirmation-mail notice. A full-width guest-browsing card sits above the form with a 76-point minimum target. Existing Google PKCE, Apple availability, login return and account deletion behavior are preserved.

Includes 0.5.9's compact tablet header/language switcher, scrolling home category rail and readable cards/navigation. Native versions: Android 20, iOS 3.

## Evidence

- TypeScript and all mobile module checks passed.
- Android/iOS/web exports passed using isolated test configuration.
- Account, OAuth, deletion, multilingual deep search and refresh regression checks passed. New signup checks cover invalid email, mismatched passwords, no premature request, confirmation notice and guest exit in Arabic/English.
- Reproduction fixture: 1,000 public coffees, Chromium at 4x CPU slowdown. The same account-navigation test measured 2362 / 808 / 875 ms before and 438 / 178 / 167 ms after. It includes pointer dispatch and visibility polling; these are controlled browser measurements, not an iPhone/iPad speed guarantee. The regression ceiling is 1 second.
- Physical iPhone/MetaPad verification remains required after installing the new build.

## Requested recipe sources

Published 264 new xBloom recipes and enriched source attribution for six existing recipes. The reviewed set contains 56 Roots recipes, 36 Black Knight recipes and 186 unique Recipe Drop recipes (eight shared between publishers). Four links with missing pour steps were excluded. The public catalog now contains 3,448 recipes; all 270 reviewed recipes have source links and steps. Reviewed facts and a bounded, repeatable data replay live in `supabase/research/xbloom-2026-10-07/`.
