# Reviewed catalog — 11 October 2026

Target: BeanMora `ubvzdglrwkkuaigmkjap`. This is a finite content batch compiled with the existing `scripts/prepare-roaster-recipes.mjs` importer, not a schema migration.

Primary pages opened and reviewed on 2026-10-11:

- [A R K official story](https://www.ark.com.kw/pages/about): explicitly identifies its in-house A R K Roasters; Kuwait in the footer.
- [Altitude official site](https://altituderoasters.co/en/): identifies a roastery and its Shuwaikh, Kuwait address.
- [OREA V4 guides](https://www.orea.uk/guides-v4): EASY FOR TWO and DARA FOR TWO, with specified Narrow brewer bottoms and filters. The DARA family is attributed to DARA by OREA.
- [OREA V3 guides](https://www.orea.uk/guides-v3): THE WIDE. The general guidance explicitly identifies Comandante C40 as the click reference.

Added: 2 roasters, 3 manufacturer recipes, 18 bilingual steps and 12 incremental pours. No coffee lot, sensory note, recipe country, photo rights, price or business ownership is inferred. Roaster `is_verified` is not set: reviewed public data does not establish ownership verification.

The water headings are in ml, while the timed cumulative pours explicitly use g. Both are retained. Incremental g pours sum to the g water field; there is no conversion inferred from ml alone. Finish times stay ranges in manual metadata, never midpoint values. Ratios displayed by the app are calculated from weights and are not source-stated ratios. Clicks are specific to Comandante C40; scaling is disabled for these device-specific recipes.

The V3 THE ICE was excluded because its 18 g coffee, 160 g hot pours and 140 g ice repeat the existing V4 OG ICED proportions. No near-duplicate was added.

## Reproduce

`node supabase/research/daily-2026-10-11/prepare.mjs` regenerates `catalog.json` and `import.sql`.
`node --test scripts/test-daily-catalog.mjs` validates provenance, ranges, sums, date identity and the absence of invented roaster/coffee associations.

`verify-rollback.sql` is the generated importer wrapped with before/after fingerprints of existing recipes, roasters, steps, pours and sources (including recipes without slugs), plus a final count query and ROLLBACK. This was run successfully before the actual import and again after it to check replay without committing updates. Existing-row ownership/source guards are retained from the original importer.

The live import used the same fingerprint guard with COMMIT. Total catalog changed from 3451 to 3454 recipes and 82 to 84 roasters; 77 roasters are publicly reviewed. Anonymous-role checks confirmed the three recipes in hot/OREA/official filters, Arabic name search, assistant recipe retrieval, and both roasters in country/code-expanded assistant retrieval. No existing catalog row outside this batch changed during the guarded import.
