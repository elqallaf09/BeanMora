# Explainable recommendations v1

## Shipped surface

`/[locale]/recommendations`, reachable through primary desktop/mobile navigation.
Arabic and English messages live in `messages/recommendations/{ar,en}.json` and
are merged by `src/i18n/request.ts`. Six mobile entries use shrinkable cells
instead of the old 58px minimum; labels retain full accessible names.

This is a deterministic, read-only matching engine, not a trained model, a
probability of liking coffee, a live-stock verifier, or a grinder calibration tool.
No paid model API, new dependencies, database writes, migrations, or device sync
are introduced. It reads the existing catalog and the signed-in user's data.

## Inputs and rules

- Public, reviewed Phase 1 beans and reviewed Phase 2 products with available or
  low-stock status. Legacy beans explicitly have **unverified purchasable stock**.
  A matching available product suppresses its duplicate legacy bean card.
- Public recipes only. Never broaden into private, draft, or unlisted recipes.
- Own saved methods/flavors/roast, experience, gear, non-archived nonempty bean
  inventory, and latest actual brew attempts. All personal queries explicitly
  filter the current authenticated ID and use the existing cookie/anon client.
  Guests do not cause persistent personal-data queries.
- Equipment categories establish brew-method support. A grinder by itself does
  not imply espresso ownership. Exact equipment matches require every recorded
  requirement, including model IDs where specified. Different grinder models
  receive a warning, never invented equivalent grind numbers.
- English/Arabic documented flavor-family aliases are token matches, not
  arbitrary substring matches or generated tasting claims. Roast families map
  medium-light to light and medium-dark to dark; these are ranking heuristics.
- Personal ordering weights: method 30, gear method 25, flavor up to 24, roast 12,
  coffee inventory 10 / recipe inventory 20, exact equipment 12, beginner label 8,
  latest successful own attempt 15. No scores are displayed as confidence.
- Community evidence counts distinct brewers using their latest actual attempt;
  `saved_only` is excluded. Reviews must reference an actual attempt belonging
  to that reviewer within the same recipe's evidence set. No evidence means no
  positive boost. A community boost requires at least three positive distinct
  brewers and a positive-outcome share of at least 0.6; boost is capped at 10.
- Missing/future verification dates are unverified. >90 days is stale. Both are
  visibly qualified, never silently refreshed. Missing recipe quantities or
  equipment evidence are explicitly incomplete.

## Scope and failure handling

Queries fetch up to 300 recent candidates per catalog table plus an overfetch
sentinel. Explicit method filters are applied in SQL before these limits.
Personal evidence is capped at 200 records; community/equipment evidence at
1000. Reaching a cap is disclosed; these are not global catalog rankings.
Public evidence is restricted to the public recipe candidate IDs. Counts are
observed evidence, not claims about all historical reviews. Query failures
produce notices rather than fake data or a false empty-catalog assertion.
Database reads have eight-second abort signals. Personalized pages are dynamic,
not shared-cache entries, and marked noindex. The URL's method/flavor/roast
choices are allowlisted and temporary; they do not overwrite saved preferences.

## Verification on 2026-09-21

- `npm run test:recommendations`: **31 passing tests** using Node's test runner
  against the actual TypeScript engine, plus strict engine TypeScript checking.
  Fixtures exist only in the test script, never in production tables.
- Tests cover Arabic/English aliases, invalid query values, visibility gates,
  stock exclusions, legacy/product deduplication, method-before-limit behavior,
  gear/model differences, inventory matching, freshness boundaries/future dates,
  non-finite quantities, real-attempt-only evidence, distinct users, review
  ownership, deterministic order, no shared cache and translation-key parity.
- Live Supabase schema checks confirmed the selected fields and relations.
  Transactional `SET LOCAL ROLE anon` verification returned 49 readable reviewed
  beans, 55 public recipes, 0 reviewed available products, and 0 visible rows in
  each of user_preferences, user_equipment and user_bean_inventory. Rolled back.
- The live database had no recipe reviews or actual recipe attempts at inspection.
  This release therefore cannot honestly show community-backed recommendations
  until real users record outcomes. No catalog or user data was inserted.
- **Not executed here:** full Next.js build, existing Vitest suite, or browser E2E.
  The execution container could not resolve github.com to clone/install the full
  application. Engine tests and source checks are not a substitute for those
  release checks. Deployment success must be verified separately.

## Next work

Collect actual brew outcomes in the existing flow and complete reviewed product
imports. Then evaluate recommendation usefulness against real feedback before
changing weights or adding a learned model. Source-backed bag stock/prices and
sufficient community results are data requirements, not values to fabricate.
