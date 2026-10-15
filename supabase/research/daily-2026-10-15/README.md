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
