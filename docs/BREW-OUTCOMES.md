# Brew outcomes and recommendation feedback

## Delivered

A bilingual reusable outcome form on `/[locale]/recipes/[id]/record` and at the end of V60 guided brewing. Recipe pages expose a record-result action. Explicit result and actual-brew confirmation are required. Recipe amounts are editable starting values; taste ratings, measured time and next-grind notes are optional, with no positive defaults. Skipping a timer step blanks measured time instead of storing a simulated duration. Quick-start cups without a recipe are not attributed to recipe evidence.

`record_brew_outcome_v1` atomically saves a private brew log, optional taste scores and a linked recipe attempt. It is SECURITY INVOKER, requires a permanent authenticated identity, validates fields and the accessible recipe/method/bean relationship, and preserves RLS. A per-user/request transaction lock, log primary key, payload comparison and unique attempt-per-log index make identical retries idempotent. A changed payload cannot overwrite the prior cup. Client controls capture FormData before async work/disable, block double submission and keep the same request and payload for retry. Success is shown only after the RPC returns the exact request ID.

Attempts are private by default through a restrictive consent policy. Opting in shares account/recipe/outcome/modification status/time, not detailed taste scores or next-grind notes. Only public recipes can be shared. Public recommendation evidence explicitly requires `share_with_community=true` and a linked log, including when the current viewer owns the attempt. Own private attempts still affect the owner's latest-success personalization. These are self-reported brews, not hardware-verified events or trained-model feedback.

## Database rollout

Applied to the connected BeanMora database:
- `20260921200439_brew_outcome_atomic_save`
- `20260921200614_brew_outcome_numeric_json_consistency`

Migration filenames reflect the versions returned by the connected migration API. No old migration was changed or repaired, and no historical brew log was converted into an invented successful attempt. Apply these forward migrations before deploying the application changes to another environment.

## Verification actually completed

GitHub Actions run **35651289146**, job **106504062745**, tested code commit **6ffd49c1fd42a97b55541feafe97bba6ad4093ba** on 2026-09-21:

- `npm ci`: passed after repairing the previously incomplete package lock. Existing package versions were not upgraded; the temporary branch-only repair workflow was removed.
- Existing Vitest suite: **94/94 passed** across seven test files.
- Recommendation engine: **31/31 passed**.
- Brew outcomes: **37/37 passed**. The additional standalone workflow step repeats these tests; it is not another 37 distinct tests. Total distinct tests: **162**.
- Full application `tsc --noEmit`: passed.
- Full `next build`: passed, including compilation, lint/type checking and route generation. No lint or type check was disabled.
- Build blockers found in the legacy catalog/admin/watch pages were repaired by preserving inferred query types and normalizing to-one relations. Existing watch preference controls remain available.

Canonical run: https://github.com/elqallaf09/BeanMora/actions/runs/35651289146
The subsequent documentation-only commit does not change the code tested by this run.

The transactional test in `supabase/tests/brew_outcomes.sql` passed against the connected database using actual authenticated/anonymous RLS roles: atomic saves, one log/attempt for identical retries, payload conflict rejection, private cross-user isolation, opt-in public visibility, guest denial, invalid/forged input rejection, private-recipe restrictions, optional ratings, quick-start isolation and rollback when a test-only downstream policy rejects the attempt. Fixtures and the test policy rolled back; checks found zero test accounts, zero test policies, zero attempts and the original single brew log.

An additional rolled-back numeric test verified that JSON 4.0/165.0 behave like integer 4/165, identical retries remain idempotent, and fractional ratings/seconds are rejected. No synthetic user outcomes or catalog rows were retained.

## Release limits and next priorities

Browser E2E and live deployment have not been verified. The connected Vercel team lists thesfm but not a BeanMora project; no unrelated project was modified. A successful production build is not proof of a deployed application.

Dependency audit and Supabase security advisors reported separate existing findings. A passing functional build and this targeted RLS test are not a clean platform-wide security audit. Prioritize dependency/security hardening and real browser/deployment checks before a public launch.

An owned outcome-history editor, withdrawal-of-sharing controls and reviewed product imports remain next work. Do not silently backfill community votes or infer grinder calibration from outcome labels.
