# Reviewed sources — 2026-10-15

Prepared, NOT counted as imported: 1 Kalita recipe, 2 Kuwait roasters, 5 bilingual steps, 0 beans/photos/prices/gram pours. Fresh read-only baseline was 3461 recipes / 94 roasters; do not reuse yesterday's totals. Compiler output is not a production import receipt.

- Tahnah Roastery / محمصة طحنة: https://tahnah.com/ and https://tahnah.com/branches. Original branch page explicitly identifies Kuwait. No product preparation recipe was inferred from shop listings.
- Hazan Roastery / محمصة هزن: https://hazan-roastery.com/pages/about-us and https://hazan-roastery.com/. Original site identifies Shuwaikh, Kuwait. Its displayed Arabic spelling varies; the main product/navigation spelling هزن is used. No unsupported image rights or shipping claims imported.
- Kalita USA: https://kalitausa.com/blogs/news/brew-like-a-pro-the-kalita-pour-over-method-for-exceptional-coffee. 20 g coffee / 320 g water, 60 g bloom with 30–45 s wait, incremental circular pours. Source 2–3 minute range stays a range; total_time_seconds is NULL. Source 195–205 degrees does not name the unit, so Celsius stays NULL. Serving style remains unknown, and unspecified pour increments are not fabricated.

All sources opened 2026-10-15. Drop Coffee's Kalita source was already represented by three existing records and was excluded to avoid another duplicate. April's old recipe URLs were unavailable; no stale cached recipe was imported. Qaf was researched but not selected because this batch prioritizes two newly verified Kuwait roasters.

## Narrow existing-step correction

https://harennaroastery.com/dbErwra was reopened and still states 90° without naming a unit. The existing imported Harenna espresso step incorrectly says 90°C even though metadata preserves unknown Celsius. Its original input and generated October 14 artifacts are corrected in this branch to prevent reintroducing the error. `correct-harenna-temperature.sql` targets only the known public, official-importer-owned step, verifies exact old/new prose and original source/import identity, and fingerprints all other steps. It must pass rollback preflight, committed update and readback before claiming the production record is corrected.

The Supabase rollback-preflight tool call did not return a result and was interrupted. No successful preflight/import/correction receipt exists for this run. Do not repeat an uncertain write without first reading current state. The attempted correction preflight ends with ROLLBACK; no COMMIT was requested in that call. Production additions and corrections are **not verified**. This is not evidence of an application or database outage.

## Continue safely

Recheck current main/PR/CI and the live database, confirm no duplicate new roasters/source recipe, complete the guarded preflights, apply only reviewed DML to ubvzdglrwkkuaigmkjap, then verify counts, content, anonymous search and assistant retrieval. Keep this change unmerged/unpublished until those receipts and final browser checks are available. Never touch SFM or change account security/permissions to work around the interruption.


## Completion verified 2026-10-16

The previous pending-production notes above describe the interrupted October 15 run. The owner authorized merging and publishing the remaining BeanMora work on October 16. Fresh readback found no Tahnah/Hazan roasters or Kalita source duplicate and confirmed the old Harenna prose. The four original source pages were reopened and their facts still matched.

Both guarded SQL scripts passed rollback preflight, then committed successfully to BeanMora `ubvzdglrwkkuaigmkjap` with 15-second statement and 3-second lock limits. Their fingerprints verified that unrelated catalog records/steps were unchanged. Added exactly 1 recipe, 2 roasters and 5 bilingual steps; no beans, images, prices or gram-pour records were added. The Harenna step now preserves 90° without assuming Celsius.

Independent post-commit readback as the anonymous application role found Kalita `50276ca0-c75d-4b66-ba19-1b5c2a193fb2`, 20 g / 320 g, five steps, NULL Celsius and scalar time, and the published 120–180-second range. Both `search_public_recipes` and `search_coffee_assistant_recipes` returned that exact recipe. Both Kuwait roasters were visible. Anonymous totals at verification: 3462 recipes and 96 roasters (the administrative preflight count included 103 roasters before adding two; do not confuse total and public visibility).

Merged current main into the feature branch and retained all Gulf water/ice browser regressions alongside the two source-yield cases. Mobile TypeScript, shared-core consistency, two targeted catalog tests and whitespace checks passed locally. Full root/mobile CI and post-merge release checks remain required; merge/deployment receipts are recorded in PR #72. No security policy, user account or credential was changed.
