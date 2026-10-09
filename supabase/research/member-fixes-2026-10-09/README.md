# Member saves, Arabic retrieval and grinder context — 2026-10-09

Canonical SQL lives in migrations, rather than a second divergent copy of the same function definitions. Apply the four migrations listed in `docs/RELEASE-0.5.22.md` in timestamp order. Search-document refresh can take several seconds on the existing catalog.

## Diagnosis and contract

`recipe_saves` permits owner INSERT/SELECT/DELETE and deliberately has no UPDATE policy. A merge-duplicate upsert therefore fails on a repeat favorite. The client now uses ignore-duplicate upsert and reads the owner row to confirm persistence. The mobile shelf previously saved only a local snapshot even for members; explicit new member saves now use the same account collection as the profile. Cached confirmed server saves follow remote removals; older device-only snapshots are retained separately by their missing cloud marker.

Equipment review INSERT/UPDATE grants were already present. An optional failed rating-summary read disabled the opinion form, and keyboard taps could be consumed by the outer scroll view. The form handles those reads independently, permits explicit writes and can recover its own committed row after a duplicate insert retry. Neither fix weakens review owner policies.

The existing search index expanded only a small alias set, while UI flavor labels had a wider dictionary. The shared `src/lib/search/flavor-vocabulary.ts`, `coffee-name-aliases.ts` and `catalog-names.ts` now supply local retrieval labels and the migration's explicit alias groups. `private.refresh_recipe_search_documents` keeps its existing eligible-public-source joins and trigger contract. All query terms remain literal AND conditions.

Grinder context is an eight-key bounded JSON object. `record_configured_brew_v1` is SECURITY INVOKER with an empty search path and authenticated-only EXECUTE. It rejects anonymous identities, validates reviewed grinder/brewer UUIDs and product identity, and holds the original request's advisory transaction lock while recording the cup and its context. Another member cannot read the first member's history. Context is not a public claim that a particular setting has been experimentally established for every grinder/coffee pairing.

## Verified numeric references

- [Baratza Encore ESP manual, page 4](https://assets.breville.com/ZCG495/manual-encoreesp-v1-0-en-010923.pdf): espresso 15 for an 18 g medium-roast dose; AeroPress 22, V60 25, automatic drip 28, Chemex 30 and French press 32. These points do not apply to a non-ESP Encore.
- [Comandante FAQ](https://comandantegrinder.co.uk/pages/frequently-asked-questions): standard C40 axle, zero-based clicks; espresso 7–13, filter 18–35, French press 28–35. Red Clix has a different adjustment scale.
- [Fellow Aiden grinder guide](https://help.fellowproducts.com/hc/en-us/articles/29101533994267-How-should-I-dial-in-my-grinder-when-brewing-with-Aiden-Getting-Started-With-Aiden-Pt-3): Ode Gen 2 settings 5⅓ / 8 / 10 for stated volume ranges 150–450 / 451–750 / 751–1,500 mL. Selection uses the actual batch volume, not an invented grams-to-milliliters conversion. The original-Opus table is not reused for Opus 2.
- [Nespresso tutorials linked by the manufacturer](https://www.youtube.com/channel/UCdrsm2O-1i3zl5K0lVOEC2A/playlists?shelf_id=6&sort=dd&view=50): users choose their actual supported model; a guessed per-model video is not substituted.

## Verification

Run root `npm test`, `npm run typecheck`, `npm run lint`; then mobile `npm run sync:core`, `npm test`, `npm run typecheck`, platform exports with source maps and Playwright. `supabase/tests/configured_brew_and_member_saves.sql` uses a test transaction and ROLLBACK; run it only through an administrative database connection. Anonymous checks clear the member JWT claims before switching SQL role, matching an actual anonymous API request. It never prints account identity or retains synthetic favorites/cups.

Live checks found 3,451 indexed recipes and identical Arabic/English counts for Gesha (299), Kenya coffee origin (129), and black tea (57). The atomic brew regression, exact retry/conflict validation and owner/guest exclusions passed. Test writes were rolled back and the pre/post counts agreed.
