# Reviewed global roaster recipes — 4 October 2026

This release was **applied and verified on 4 October 2026** in BeanMora project `ubvzdglrwkkuaigmkjap`: **87 distinct, publicly sourced recipe records from 23 roasters in 11 documented operating countries, comprising 86 new records and one update of the existing Monarch recipe**. The research is a curated expansion, not an exhaustive census of the world's roasters. The raw regional datasets, primary-source evidence, photo checks and identity manifest are retained beside the compiled catalog.

| Region | Recipe records | Roasters | Named coffees | New coffee records with verified images |
| --- | ---: | ---: | ---: | ---: |
| Americas | 30 | 7 | 23 | 23 |
| Europe and Middle East | 29 | 10 | 30 | 27 |
| Asia Pacific | 28 | 6 | 31 | 27 |
| Total | **87** | **23** | **84** | **77** |

The importer reuses the exact existing **NOMAD Coffee, Friedhats Coffee Roasters and Archers Coffee** rows and creates 20 roasters. No reviewed coffee in this release exactly matched an existing coffee's resolved roaster, full name and product source URL. The 77 new images comprise **74 packaging images and 3 April product-artwork images**. Existing coffee images, image kinds, ownership and sensory profiles are never updated by this importer. Recipe covers are filled from their exact verified coffee image only when the existing cover is empty.

**57 records have incomplete source instructions, including all 49 espresso parameter specifications.** Their published dose, output, time or temperature remains useful, but bilingual steps that restate specifications are not represented as a complete source procedure. Unpublished numerical values stay absent. The remaining method distribution is V60 11, Origami 9, unspecified pour-over 9, Kalita Wave 3, French press 3, AeroPress 2 and Orea 1.

The serving distribution is 84 hot, 2 iced and 1 chilled. The Olympia Big Truck concentrate is brewed hot and then chilled; its method is `pour_over` and serving style is `cold`. It is not a cold-extraction recipe. Its coffee-only component is included; cocktail ingredients are not imported.

## Live application

The release executor completed 71 successful transactions: the original roaster-only transaction, eight matching coffee transactions, 61 additive-only recipe transactions and the final transaction correcting three existing espresso recipes. Read-only verification at **2026-10-04 16:33:46 UTC** confirmed the following against the exact catalog slugs and source URLs:

| Check | Verified result |
| --- | ---: |
| Expected recipes present, public and owned by the curator | 87 / 87 |
| Recipes with the expected official primary-source link | 87 / 87 |
| Resolved roaster IDs and shared-coffee name arrays | 87 / 87 |
| Recipes linked to coffee, with covers matching the verified selection | 78 / 78 |
| New published, reviewed coffees with the exact source-linked image | 77 / 77 |
| Packaging / product-artwork images | 74 / 3 |
| Coffees with a published numerical sensory profile | 2 |
| Imported espresso records incorrectly using input-water grams | 0 / 49 |
| Existing espresso corrections matching the reviewed output semantics | 3 / 3 |

The live Monarch recipe retains its original UUID and previous source link, and now has the intended coffee link and product-specific source. Detailed query results and query hashes are in `evidence/application-verification.json`. These checks read database content; they did not repeat the earlier image downloads or local SQL tests. Independent aggregate and anonymous search checks are recorded separately in `evidence/discovery-verification.json`.

The catalog's 11 operating countries normalize equivalent country codes and full country names. Creator operating countries and explicit recipe provenance remain separate fields; a named recipe creator does not automatically inherit a roaster's country.

## Files

- `regional/americas.json`, `regional/emea.json`, `regional/apac.json`: reviewed regional data, including source conflicts and exclusions.
- `evidence/`: primary-source facts, documented roaster operating countries, image decoding checks and contact sheets.
- `catalog.json`: compiled bilingual application data with canonical manual parameters and discovery metadata.
- `public-catalog-snapshot.json`: read-only public identity snapshot of project `ubvzdglrwkkuaigmkjap`; no profiles or credentials.
- `resolution-manifest.json`: exact identity decisions, proposed stable slugs, image decisions and recipe-to-coffee links.
- `espresso-corrections.json`: three narrow corrections independently reviewed against their official sources.
- `verify-import.sql`: read-only checks for the expected final rows and their units/provenance.
- `validation-report.json`: local validation results, runtime versions and the completed live application status.
- `evidence/application-verification.json`: the successful production read-only query results and applied-transaction record.

The compiler is `scripts/prepare-roaster-recipes.mjs`; its tests are `scripts/test-roaster-recipes.mjs`. Neither connects to a database. Production SQL was applied separately by the release executor; the application evidence distinguishes that execution from this agent's read-only verification.

## Reproduce and review

Run from the repository root with Node 22.16 or newer:

```sh
node scripts/prepare-roaster-recipes.mjs --check
node scripts/prepare-roaster-recipes.mjs --check \
  --catalog supabase/research/global-roasters/catalog.json \
  --manifest supabase/research/global-roasters/resolution-manifest.json
node scripts/prepare-roaster-recipes.mjs > /tmp/beanmora-global-roasters.sql
```

The default output is one SQL transaction. For tools with smaller input limits, generate ordered, independently idempotent transactions:

```sh
node scripts/prepare-roaster-recipes.mjs \
  --parts-directory /tmp/beanmora-global-roasters-parts \
  --max-bytes 20000
```

`index.json` in the output directory lists the file order, actual UTF-8 byte counts and SHA-256 hashes. The default maximum is 20,000 bytes, including SQL code and data; `--max-bytes` can lower it. The compiler measures each candidate part and refuses to emit a single record that exceeds the requested limit. The current additive-only release produces 71 parts, with a largest size of 19,893 bytes. Apply these files **sequentially**: roasters, coffee batches, recipe batches, then the three espresso corrections. Each part can be replayed. SQL omits empty recipe/coffee/roaster/correction sections; recipe parts resolve exact existing roasters and coffees instead of repeating creation code. Those dependencies must have been imported by the earlier parts. Empty pour loops and unused source-upgrade branches are omitted without removing ownership, public-visibility, source, bean-link or numeric guards. A failure in a later part does not roll back previously committed parts; the single-output form is available when whole-release atomicity is required. Generated SQL is an administrator-reviewed data import, never application client code.

Required schema changes precede the import:

1. `20261004115600_public_recipe_discovery.sql`.
2. `20261004121325_coffee_sensory_and_roaster_methods.sql`, providing the non-null sensory JSON and image-kind columns.
3. `20261004123350_roaster_brew_method_definitions.sql`, providing the new method codes and their allowed-code constraint.

The importer checks the curator username `beanmora_official` and all required brew-method records at runtime. It emits no DDL, grants, authentication changes or profile updates. Its target project is **BeanMora `ubvzdglrwkkuaigmkjap`**; the unrelated SFM project is outside this task.

## Identity and ownership rules

Roasters match only by the exact case/whitespace-normalized name and documented website domain. The `www` prefix is normalized for domains. Beans match only by the resolved roaster, full normalized coffee name and full product source URL; a trailing slash is normalized. Historical crop labels remain part of the name. There is no token-based, fuzzy, URL-only or cross-crop matching.

The manifest's existing IDs are checked again at execution. New slugs are deterministic. Ambiguous matches or a slug owned by a different identity fail. Public coffee reuse also requires a published, reviewed record. Existing roasters and coffees are reused without updating their fields, preserving concurrent photo repairs, source ownership and user contributions.

Recipe upserts require public visibility, the curator's ownership, the same brew method, the same source identity and a compatible existing bean link. A curator recipe that has become private is rejected, including the three corrections. A conflicting owner, source or bean link raises an error. Existing recipe IDs, retained step/pour IDs, outcome references, equipment links, media and unrelated metadata survive a replay. The importer preserves every existing step and pour row. If an existing step or pour number exceeds the incoming maximum, it raises an explicit review error before updating the recipe. Missing incoming positions are added and existing positions are updated without changing their IDs. No generated import contains a DELETE statement, including the single-transaction form.

The existing `onyx-monarch-kalita-wave` recipe keeps ID `b93e7d45-b98b-40e2-972b-3b3960672d28`. Its older `https://onyxcoffeelab.com/pages/help-me-brew` source and the current Monarch product page publish the same named 25 g / 400 g / 3:30 filter recipe and pour schedule. A narrow, reviewed source upgrade checks that ID and the old numeric values, preserves its old source link and retained instruction IDs, and adds the product-specific source and coffee association. Other source changes still fail.

No artificial difficulty is assigned to new recipes. Existing editorial difficulty is preserved. New suitability booleans record only a directly documented recipe with that exact method: `v60`, `espresso` or `xbloom`. A false value means this import did not establish that method; it is not a claim that the coffee cannot be brewed that way. Compound processing labels and nonstandard roast marketing terms remain in descriptions/source metadata instead of being forced into unsupported enum categories.

## Recipe and discovery semantics

`source_brew_parameters.discovery` holds bilingual creator, creator operating country, explicit recipe provenance, coffee origin/type/name, roaster, tasting descriptors, flavor families, serving style and evidence URLs. `creator_country` is the documented operating/base country, never inferred nationality. `recipe_country` is supplied only when the source states a recipe's geographic provenance. Coffee origin remains separate.

At SQL execution, `discovery.roaster_id` is set to the actual resolved UUID; it is never guessed in the offline JSON.

`applicable_coffee_names` and `applicable_coffee_names_ar` contain verified shared-coffee names, including the primary coffee. They support searching the second coffee without duplicating the recipe. Examples are 49th Parallel's three identical espresso guides, Toby's Broadway/Brunswick card, two Kurasu comparisons and Archers' two specified milk-coffee blends. Generic guides without named applicable coffees retain empty arrays.

Tasting descriptors are sourced text. Flavor families are editorial search groupings, not measured intensities. Only Archers Black Diamond and Bittersweet add new numerical sensory profiles in this batch, using their published denominator of 5. Their unreported body values remain absent. Unknown sensory values are not estimated from tasting words.

Manual amounts preserve their source units:

- Espresso `water_grams` and `water_ml` are always null. Output is `yield_grams`, `yield_min_grams`/`yield_max_grams`, or published volumetric `yield_min_ml`/`yield_max_ml`.
- Ranges use `dose_min_grams`/`dose_max_grams` and `time_min_seconds`/`time_max_seconds`; no artificial midpoint is inserted.
- Kurasu's iced recipe has 150 g brewing water and **65–70 g ice** separately (`ice_min_grams`, `ice_max_grams`). La Cabra's iced V60 has separate `ice_grams`.
- `bypass_water_grams`, `pressure_bar`, equipment/filter strings and the original temperature or ratio text are retained when published. Mixed-temperature pours retain their individual temperatures.
- Counter Culture and Square Mile have explicitly calculated output, flagged `yield_derived_from_ratio: true` with a derivation. The Equator correction uses the same flag. These values must be labelled calculated in the UI.
- Toby's six scalar outputs correspond to each card's explicitly marked **PEAK roast-age window**. `peak_age_min_days`, `peak_age_max_days`, `scalar_yield_basis` and `yield_by_roast_age` preserve every published window; do not describe the scalar as applying at every roast age.
- A missing bloom label is stored as an absent label in source provenance and does not create a bloom marker. Kurasu May's individual pour timestamps remain null, including its first pour.

## Images that remain unresolved

Seven named coffees do not create new public bean rows. Their recipes remain searchable through `source_coffee_name` and discovery metadata, with no fabricated product image:

| Roaster | Coffee | Reason |
| --- | --- | --- |
| Square Mile | Red Brick | Exact official image returned HTTP 403 during the check. |
| La Cabra | Sagastume Typica 2023 | Historical coffee; no verified product photo. |
| Five Elephant | PNG Keto Tapasi, 2022 competition coffee | Historical source; no verified product photo. |
| Kurasu | Brazil Inacio Urban | No verified image for that named lot. |
| Kurasu | Ethiopia Jigesa | No verified image for that named lot. |
| Kurasu | Kenya Kangocho AA | No verified image for that named lot. |
| Kurasu | Brazil João Hamilton | No verified image for that named lot. |

Verified coffee imagery supplies 78 recipe covers, confirmed by the live verification. `global_roasters_import.photo_url`, `photo_kind` and `photo_source_url` describe the exact source selection. The client should use its kind caption only when the displayed cover URL equals `photo_url`, because an existing nonempty cover is preserved.

The 87 recipes have 78 bean links and 9 null links: five primary coffee references without verified images, plus four intentionally generic recipes. Companion coffees from shared guides are discovery relationships rather than duplicate recipe rows. Image checks establish that the exact source-linked image was readable and visually classified on the review date; they do not transfer image copyright or promise permanent CDN availability.

## Three existing espresso corrections

The official-source review found beverage output stored as input water in three existing curator recipes:

| Existing slug | Correction |
| --- | --- |
| `crema-coffee-espresso` | Clear water; retain published 42 g target with 40–42 g output and 21–28 s time ranges; clear the former 28 s endpoint scalar. |
| `equator-espresso` | Clear water; 36 g calculated output from the published 18 g × 1:2 target; 25–30 s range and no endpoint scalar. |
| `flair-58-starter-espresso` | Clear water; 40 g output; preserve the 30 s target. |

Each correction checks the exact existing ID, curator, method, dose, source URL and old water/time values. A replay accepts only the exact already-applied values. Conflicting existing manual metadata fails. These updates do not replace steps or recipe IDs.

## Local validation

```sh
node --test scripts/test-roaster-recipes.mjs
```

The required SQL test resolves an installed `@electric-sql/pglite` package or an explicit `BEANMORA_PGLITE_MODULE` path. The prepared validation used PGlite 0.5.8 / PostgreSQL **18.3** in memory. These local tests are separate from the subsequent read-only verification of the production PostgreSQL **17** import. The SQL avoids PostgreSQL 18-only syntax.

Five passing tests cover source units and ranges, shared-recipe identity, exact coffee/crop matching, photo gates, unknown values, deliberately invalid inputs, initial application through the byte-bounded parts, full SQL replay twice and ordered partial replay. A transport test verifies every generated part is within its byte limit, every recipe/coffee appears exactly once in its creation phase, and unused mutation sections are absent. The database fixture retains 137 existing coffee media/profiles, 37 roasters, the correction steps, surviving recipe/step/pour/source IDs and five outcome references. Ownership conflicts and changed correction values roll back as expected. Extra historical step/pour fixtures are rejected and remain present after rollback; IDs for the six existing Monarch steps and six existing pours survive while the two missing steps are added. Runtime guards and the read-only post-import checks remain necessary when applying to the live schema.
