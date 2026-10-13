# Reviewed Gulf roasters and cold brew — 13 October 2026

Target: BeanMora `ubvzdglrwkkuaigmkjap`. Original pages opened on 2026-10-13:
- https://caffeinelab.me/ar/pages/about-us — Saudi specialty roastery identity.
- https://www.emiraticoffee.com/ — Dubai Al Quoz roastery and UAE locations.
- https://www.hario-usa.com/blogs/cold-brew-recipes-and-guides/blue-bottle-cold-brew-recipe — original manufacturer-hosted Blue Bottle recipe.

Actually imported **1 recipe / 2 new roasters / 4 steps / 1 water addition**; existing Blue Bottle identity reused. Post-import totals **3457 recipes / 90 roasters**. No bean, price, product photo or guessed coffee association added.

Cold recipe: 68 g / 750 g, coarse, room temperature, **up to 18 hours**. An upper time bound is not a fixed or minimum duration; numeric temperature and fixed time remain null. Original short bilingual summaries and dated source URLs are retained. Ratio is calculated, not source-stated. Blue Bottle's existing six-cup moka guide was excluded as a duplicate.

Reproduce: `node supabase/research/daily-2026-10-13/prepare.mjs`.
Validate: `node --test scripts/test-daily-catalog*.mjs`.

Existing-row fingerprints passed rollback preflight, committed import and post-import rollback replay. Replay stays 1/2/4/1. Anonymous-role assistant search, public Arabic/cold recipe filter and details verified source quantities and missing fields. No existing user/catalog/bean record changed. Final CI/merge/publication receipts belong to the daily PR and dated development record.
