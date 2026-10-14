# BeanMora maintenance — 2026-10-14

Started from main cabec278a6d14b9d78bc3b3f3544c81e8bb6c6b1 in an independent checkout and daily/2026-10-14-flow-and-catalog. No AGENTS.md was found. Rechecked push/admin access, default main, allow_auto_merge=false, protected:false and empty rulesets; settings unchanged. Reviewed #68's merged seller-intent/link fix and both successful main CI workflows. No open PR was present. Yesterday's final publication and continuation receipts are in #67; do not re-import or recount that batch.

## New engine/knowledge work

Reproduced four failures for short fast/slow espresso statements in Arabic and English. Added a bounded direct-flow intent with preserved labeled measurements and finer/coarser advice. Shopping and explicit recipes remain searches; no provider or model integration. Added 7 unit regressions including 3 negative intent cases, 2 bilingual browser cases, and a sourced Moka safety lesson (51 curriculum topics including 6 basics). Root/mobile core synchronized. Source: https://bialetti-cookware.zendesk.com/hc/en-us/articles/5416235346322-How-to-use-the-Moka-Express (opened 2026-10-14). This is curated knowledge and deterministic routing, not training a model.

## Committed data

3 recipes, 2 roasters, 9 bilingual steps, no gram pours or new public beans. Fresh counts 3457 → 3460 recipes and 92 → 94 roasters. Harenna, Saudi Arabia: https://harennaroastery.com/dbErwra; Al-Gharb, Portugal: https://www.al-gharb.coffee/recipes/moka-pot and https://www.al-gharb.coffee/. Milliliters, unknown serving style and unqualified source temperature are preserved without guessed grams/Celsius. The Moka guide has unknown weights. Untouched-record fingerprints pass preflight/commit/replay. See ../supabase/research/daily-2026-10-14/README.md.

## Validation and continuation

Public pre-release inspection reproduced two mapping bugs: manual source water volume disappeared from the recipe detail, and its publisher-provided Arabic author name was replaced by a poor transliteration. Two new data regressions failed before fixes and now pass (33 data checks total). Manual water_ml is validated and exposed as mL, retaining explicit root-value precedence; localized source creator names take precedence over generated names. Source ratio text is numeric-only and the V60 timing note includes 2:45. The reviewed batch was safely replayed with unchanged 3/2/9/0 counts, not counted as new additions again.

Local root unit suite: 375 passed, plus recommendation/outcome checks. Both TypeScript trees, root lint, Next production build, mobile core checks and three-platform export passed. CI must confirm all required final-head and merged-main gates, including new browser regressions and catalog provenance test; exact results and publication receipts will be recorded in the PR. No test or protection weakened.

Fresh RLS inventory: 94/94 public tables. Supabase advisor still has no leaked-password-disabled finding. Auth/ACL/secret/settings were not changed. Supabase changelog's latest relevant TLS deprecation remains 2026-10-12; no newly required integration change was found. Existing tooling security backports verified during npm ci; raw mobile audit must not be called clean without its policy result.

Actual public-web checks, anonymous assistant retrieval and new release status will be recorded in the PR. Device startup/navigation on physical iPhone/Android/Huawei, dedicated-account OAuth/recovery/media actions and TestFlight group availability remain outside verified coverage. Do not infer native performance or install availability from a successful web preview/export/build.
