# BeanMora 0.5.7 / Android 17

## Resulting behavior

The chosen Model 01 language control is a direct ivory/espresso عربي / EN
pill with a sliding selection, 44-point minimum touch targets, selected-state
accessibility and persisted language. Selecting the active language preserves
an open detail screen. The compact header fits phones from 320 px and tablets.
Press, screen and selection motion respects Reduce Motion; installed native
builds use the native animation driver without per-frame React renders.

Coffee cards become usable before recipe and account reads complete. Public
requests are deduplicated in memory for five minutes across locale/account
changes; account profiles and saves never enter that shared cache. Disk
serialization waits for idle time. Failed sections keep the last-good public
snapshot; a successful empty response clears old records. Foreground return
after five minutes triggers one catalog refresh; a brief return reuses data.

Coffee → Explore xBloom now binds the chosen coffee ID to a new optional
scoped RPC. Scope applies before server pagination and every method, source,
serving, model and text condition; unknown IDs return empty rather than the
whole library. Explicit navigation returns to the selected coffee. The
sixteen-argument global endpoint remains compatible with existing APKs.

The recipe library and Brew My Coffee combine Cold and Iced in a single
filter. Actual published cold/iced values remain distinct in recipe facts.
The header Search/home Explore present matching coffees and tasting notes,
related roasters, and recipes from the full server-paginated library. All
query words must match; punctuation never becomes PostgREST/SQL syntax.
Shared retrieval aliases cover 22 groups, including strawberry / فراولة /
فراوله, without manufacturing tasting notes.

## Applied database and content work

| Migration | Purpose |
| --- | --- |
| 20261006135630 | Finite completion of 2,875 unknown public serving classifications |
| 20261006142117 | Optional exact coffee scope and combined cold filter |
| 20261006142206 | Precompiled Arabic/English retrieval aliases |
| 20261006142442 | Three reviewed roasters and seven official cold guides |
| 20261006142545 | Public search documents maintained transactionally by source edits |

Only 46 completion decisions are explicit published serving evidence; 2,829
are preparation-based **suggestions**, labelled in cards/details. No source
quantities, brew temperatures, steps, notes or existing classified rows were
changed by that correction. The finite manifest and fingerprints are in
`supabase/research/serving-completion-2026-10-06/`.

The content batch adds Union Hand-Roasted Coffee, Stumptown Coffee Roasters
and Tim Wendelboe, plus seven cold/iced guides from their and Square Mile's
primary sites. Missing values stay missing and incomplete guides are labelled.
Source links, units/ranges and bilingual paraphrases are recorded in
`supabase/research/cold-expansion-2026-10-06/`.

The batch snapshot is 59 reviewed roasters, 3,182 public recipes, zero unknown
serving values and 145 combined cold/iced recipes. These are dated counts,
not a promise that later community additions cannot change them.

Search documents index only public recipes and published/reviewed coffee
facts. Anonymous/authenticated callers have SELECT only and a public-parent
RLS policy. Maintenance functions live in the private schema with a pinned
search path and no client EXECUTE grants. Recipe/source/coffee/flavor/product/
lot/roaster/public-profile edits refresh affected documents in the same
transaction; hiding a recipe removes its public document.

The same anon strawberry query returned 187 recipe IDs before/after the
index. EXPLAIN ANALYZE measured **2,299.254 → 42.516 ms**. This is an individual
SQL execution comparison, not app-startup, network or installed-device timing.
`supabase/tests/deep_search.sql` checks Arabic/English result identity,
combined serving counts, literal all-word matching, coffee scope and caller RLS.
`search_index_maintenance.sql` rolls back all temporary edits while proving
recipe/coffee/flavor/source refresh, removed facts, republishing and privileges.
Both passed against the live project.

Supabase advisors were reviewed. No maintenance function is client executable;
no new search-index-specific security/performance finding was reported.
Existing project-wide extension-placement and intentional public-policy
advisories remain outside this change; reference:
https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

## Validation and installation

Mobile and root typecheck/unit checks, root lint, 21/21 Expo Doctor checks,
Xcode tooling compatibility, and Android/iOS/web Metro exports pass using
isolated configuration. All 64 React Native Web browser tests pass, covering both languages, phone/tablet
widths, scoped xBloom pagination and navigation, unified serving filters, deep
search results, cache isolation, foreground automation, Reduce Motion, offline
recovery, saving and login return. Isolated Android prebuild passes with version
0.5.7 (17), backup disabled and the existing permission-removal directives.
These browser/bundle/prebuild checks do not establish physical-device behavior.

No signed native APK or physical Android/iOS execution was performed here.
The previously inspected APK is 0.5.5 (15) with Expo updates disabled. Server
search/data changes are immediate; the new language/flow/cache/motion needs
a fresh **0.5.7 (17)** APK.

Build manually in the existing Expo project: Build from GitHub → merged main
(or its exact release commit) → base directory `apps/mobile` → Android →
`preview` profile → Production environment → store submission off. Check the
finished build's version/commit and download its APK. The `production`
profile intentionally creates AAB for store distribution.
