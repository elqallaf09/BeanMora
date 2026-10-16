# BeanMora maintenance — 2026-10-15

Independent worktree/branch daily/2026-10-15-knowledge-catalog from main 75b2cd3cf8334140afc6aef84f35a9c649d0b7af. No AGENTS.md found. Push/admin permissions, main default, allow_auto_merge=false, empty rulesets were rechecked without changes. Reviewed #70/#71, their successful main CI and eight-locale production verifier. Preserve their new multilingual UI/search and Expo SDK patches; the latest web is 0.5.35, not yesterday's 0.5.34. No new native binary was inferred from those web-only releases.

## Implemented locally

Recipe explanations omitted explicit espresso yield and source time/temperature caveats. A range regression failed before the fix. The engine now reads bounded, positive scalar/range grams and milliliters separately, never using boiler water as yield or deriving a mass ratio from mL. It preserves published time notes/ranges, source ratio text, calculated-yield disclosures/scopes and temperature-unit caveats. Nine new unit cases cover Arabic/English, numeric time and invalid/incomplete/reversed/calculated yields; two isolated browser cases were added. Existing labels and all six added locale packs are reused; arbitrary source prose retains its original language per #71's policy. Shared mobile core synchronized. This is deterministic fact-grounding improvement, not model training or paid AI.

Reopened Harenna's original product page and confirmed a prose-only imported step incorrectly assumed 90°C, despite unknown-unit metadata. Corrected offline input/generated October 14 artifacts and added a provenance assertion. Prepared an identity-guarded narrow production step correction, not a migration. Production correction remains unverified; do not claim applied.

Prepared 1 source-backed Kalita manufacturer guide and 2 Kuwait roasters (Tahnah/Hazan) through the existing compiler, with 5 bilingual steps and no new beans/photos/prices. No new source record is counted as added until production import/verification succeeds. See supabase/research/daily-2026-10-15/README.md for sources, exclusions and exact limits.

## Read-only verification and interruption

Supabase project list freshly identifies BeanMora ubvzdglrwkkuaigmkjap as healthy. Snapshot: 3461 recipes, 94 roasters; RLS 94/94 public tables. Security advisor contains no leaked-password-disabled finding; this is not a new direct Auth-settings verification. No Auth/ACL/secrets change. Current changelog adds .NET OpenTelemetry on October 14 (not this TS app); previously documented November 10 TLS deprecation remains relevant. Official upsert docs were read before preparing DML. Initial metadata queries used incorrect column/view names; they failed read-only and were corrected after schema/function introspection. These are inspection errors, not app defects.

The rollback-preflight connector call did not return a result and was interrupted. No successful production import or correction receipt was received; no COMMIT was requested. Local state and prepared SQL were preserved. Do not infer a database outage from this tool failure, and do not retry uncertain writes without reading current state.

Local root tests: 851 unit cases, 31 recommendation cases and 37 brew-outcome cases passed, as did both TypeScript trees, root lint, mobile unit/data/core checks and all 3095 registered locale messages. Six catalog-provenance cases passed. PR CI/build/browser receipts are recorded in the associated PR after they complete. This branch is not a published release. No merge, public deployment, new APK/TestFlight or physical-device performance is claimed. Continue database readback/guarded preflight, final browser/source-fact checks and existing physical-device/dedicated-account/tester-group gaps next run rather than recounting October 14 records.


## Completion verified 2026-10-16

The previous pending-production notes above describe the interrupted October 15 run. The owner authorized merging and publishing the remaining BeanMora work on October 16. Fresh readback found no Tahnah/Hazan roasters or Kalita source duplicate and confirmed the old Harenna prose. The four original source pages were reopened and their facts still matched.

Both guarded SQL scripts passed rollback preflight, then committed successfully to BeanMora `ubvzdglrwkkuaigmkjap` with 15-second statement and 3-second lock limits. Their fingerprints verified that unrelated catalog records/steps were unchanged. Added exactly 1 recipe, 2 roasters and 5 bilingual steps; no beans, images, prices or gram-pour records were added. The Harenna step now preserves 90° without assuming Celsius.

Independent post-commit readback as the anonymous application role found Kalita `50276ca0-c75d-4b66-ba19-1b5c2a193fb2`, 20 g / 320 g, five steps, NULL Celsius and scalar time, and the published 120–180-second range. Both `search_public_recipes` and `search_coffee_assistant_recipes` returned that exact recipe. Both Kuwait roasters were visible. Anonymous totals at verification: 3462 recipes and 96 roasters (the administrative preflight count included 103 roasters before adding two; do not confuse total and public visibility).

Merged current main into the feature branch and retained all Gulf water/ice browser regressions alongside the two source-yield cases. Mobile TypeScript, shared-core consistency, two targeted catalog tests and whitespace checks passed locally. Full root/mobile CI and post-merge release checks remain required; merge/deployment receipts are recorded in PR #72. No security policy, user account or credential was changed.
