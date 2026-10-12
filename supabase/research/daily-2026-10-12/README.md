# Reviewed catalog — 12 October 2026

Target: BeanMora `ubvzdglrwkkuaigmkjap`. Two hot recipes and two new roasters; reuse Blue Bottle's existing identity. No coffee lot or image import.

Original sources reviewed on 2026-10-12:

- https://limukw.com/ — Kuwaiti roastery identity.
- https://www.partnerscoffee.com/pages/our-story — Brooklyn roastery; recipe author association independently stated by HARIO.
- https://bluebottlecoffee.com/us/eng/brew-guides/french-press — French press quantities, Fahrenheit range and timed plunge.
- https://www.hario-usa.com/blogs/recipes-and-more-from-friends/v60-switch-recipe-with-partners-coffee — Cary Wong, Partners, valve stages and cumulative pours. Missing numerical temperature stays unknown.

`input.json` contains short original summaries and translations; no publisher text or photos are republished. `public-catalog-snapshot.json` records the reviewed public identities before import. `prepare.mjs` invokes the existing compiler and adds fingerprints guarding untouched catalog rows. It emits `catalog.json`, `import.sql` and `verify-rollback.sql`.

Reproduce: `node supabase/research/daily-2026-10-12/prepare.mjs`.
Validate: `node --test scripts/test-daily-catalog*.mjs`.

Live transaction and replay verified **2 recipes / 2 new roasters / 9 steps / 4 pours**, with unchanged outside-batch fingerprints and all beans intact. Post-import total: **3456 recipes / 88 roasters**. Anonymous assistant and catalog reads verified public access and source metadata. See the dated development log for UI verification, security context and publication limits.
