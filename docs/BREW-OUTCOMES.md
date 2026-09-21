# Brew outcomes and recommendation feedback

## Delivered

A bilingual reusable outcome form on `/[locale]/recipes/[id]/record` and at the end of V60 guided brewing. Recipe pages expose a record-result action. Explicit result and actual-brew confirmation are required. Recipe amounts are editable starting values; taste ratings, measured time and next-grind notes are optional, with no positive defaults. Skipping a timer step blanks measured time instead of storing a simulated duration. Quick-start cups without a recipe are not attributed to recipe evidence.

`record_brew_outcome_v1` atomically saves a private brew log, optional taste scores and a linked recipe attempt. It is SECURITY INVOKER, requires a permanent authenticated identity, validates fields/recipe access/method/bean ownership relationships and preserves existing RLS. A per-user/request transaction lock plus the brew-log primary key, payload comparison and unique attempt-per-log index make identical retries idempotent. A changed payload cannot overwrite the prior cup. Client controls capture FormData before async work/disable, block double submission and keep the same request and payload for retry. Success is shown only after the RPC returns the exact request ID.

Attempts are private by default via a restrictive consent policy. Opting in shares account/recipe/outcome/modification status/time, not detailed taste scores or next-grind notes. Only public recipes can be shared. Public recommendation evidence explicitly requires share_with_community=true and a linked log, including when the current viewer owns the attempt. Own private attempts still affect the owner's latest-success personalization. These are self-reported brews, not hardware-verified events or trained-model feedback.

## Database rollout

Applied to BeanMora through the connected migration API:
- 20260921200439_brew_outcome_atomic_save
- 20260921200614_brew_outcome_numeric_json_consistency

Version filenames were taken from the live migration history, not invented. The local Supabase CLI and outbound network were unavailable. No old migrations were edited, no history was repaired, and no old brew log was converted into an invented successful attempt. Apply the two forward migrations before deploying these app changes to another environment.

## Verification

37 Node/TypeScript tests passed for validation, RPC success/error/retry handling, translation parity, consent separation and source-level UI guards. Strict ES2017 TypeScript compilation passed for the outcome module. Changed local TS/TSX syntax checks passed. This is not a full application typecheck.

The transactional SQL test in supabase/tests/brew_outcomes.sql passed against the connected database with real authenticated/anonymous RLS roles: atomic saves, one log/attempt for identical retries, payload conflict rejection, private cross-user isolation, opt-in public visibility, guest denial, invalid/forged input rejection, private-recipe restrictions, optional ratings, quick-start isolation and rollback when a test-only downstream policy rejects the attempt. All fixtures and the test policy rolled back; verification found 0 test accounts, 0 test policies, 0 attempts and the original 1 brew log.

Full Next.js build, existing Vitest suite, actual browser interaction and production deployment are not verified by those tests. The container cannot resolve github.com; the connected Vercel team currently lists thesfm only, not a BeanMora project. A clean PR merge is not a successful deployment.

Supabase security advisors also reported existing issues outside this feature: ingestion_review_queue is a definer view, several legacy definer functions are executable by anon, and leaked-password protection is disabled. Do not interpret this targeted RLS test as a clean platform-wide security audit. Prioritize those independently before a public launch. Relevant guidance: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view and https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .

## Remaining

Verify the full application build/browser and deployment; add an owned outcome-history editor and sharing withdrawal UI; complete reviewed product imports. Do not silently backfill community votes or infer grind calibration from outcome labels.
