# Complete coffee personalities, 5 October 2026

Sixteen public coffees now have source-backed tasting notes, acidity, sweetness and body. Before this repair, none of the 214 public reviewed coffees had all four documented in the mobile sensory model. The catalog still contains 214 coffees; the other coffees retain their available notes and attributes.

The review fetched 194 unique official source URLs already associated with the catalog. 179 returned bounded HTML and 15 failed. Successful fetches are evidence of accessibility, not proof of product identity. Redirected category/home pages, general educational text, other products, customer opinions and regional generalizations were excluded from the accepted profiles. Existing archived sources were retained without silently replacing their historical facts with a current product.

## Accepted records

| Coffee | Acidity | Sweetness | Body | Source form |
| --- | --- | --- | --- | --- |
| 49th Parallel Old School Espresso | Low | Highlighted by the medium-dark roast | Full | Product description |
| Bahrain Roastery AppleWood Reserve | Crisp | Subtle | Smooth | Product description |
| Black Knight Excelso | Soft and balanced | Clear | Full and creamy | Exact product metadata |
| Coffee Supreme South Blend | Mellow | Delicate with milk | Smooth | Product description; milk context retained |
| Counter Culture Big Trouble | Low | Sweet flavors | Medium | Product description and exact product metadata |
| Julith Colombia Finca Zarza Papayo | Bright | Maraschino-cherry character | Full and silky | Exact lot description |
| Julith Kotowa Silvia Marina 26-4320 | Vibrant citrus | Ripe nectarine | Syrupy | Exact lot description |
| Julith Janson Geisha 26-178 | Lively citrus | Pronounced, honey finish | Almost weightless and silky | Exact lot description |
| Roastado Brazil Classic | Balanced | Natural | Medium to heavy | Product description |
| Roastado Colombia Decaf | Gentle | Delicate | Light and silky | Product description |
| Roastado Ethiopia Guji Filter | Balanced | Fruity | Smooth, medium | Product description |
| THE BARN Atlas | 3/5 | 4/5 | 4/5 | Published five-block scales |
| THE BARN Elemental | 2/5 | 4/5 | 4/5 | Published five-block scales |
| THE BARN Genesis | 3/5 | 4/5 | 4/5 | Published five-block scales |
| Verve Sermon | Balanced | Deep, berry character | Full | Exact product metadata and description |
| Workshop Pillar | Low | Complex | Full | Current seasonal blend description |

`profiles.json` records the exact bean ID/slug, source URL, check time, HTML SHA-256, evidence form, accepted traits, translations, notes and original values needed for the guarded update. Source URLs are also exposed in the app. All qualitative attributes remain text. The three numeric profiles count `.blocks > .block.filled` against all five `.block` elements inside the corresponding official `.metafield-block`; their original scale is preserved.

Verve's exact Sermon image metadata confirms its three notes. Black Knight's full product metadata remains available even though its visible description is abbreviated. Workshop's current main product description supplies the current notes; its older metadata and previous catalog notes were not mixed into the revised seasonal profile. AppleWood is explicitly wood-smoked; its sensory description is not a claim of unflavored coffee or of health benefits.

Ozone's Cup of Excellence quality scores are not intensity scores and were not mapped into acidity/body bars. 48East's third English metric is Aroma despite some Arabic Body labels, so it remains excluded from Body. Flavor words, roast level, processing, origin and generic educational statements were never used to manufacture missing intensities.

Oasis Blend retains its two historically documented notes, full body and sweet-citrus descriptor from the archived official Crossbridge catalog. Acidity remains undocumented. The full personality card therefore stays pending for Oasis; its available facts remain visible. The earlier exact-product evidence is in `../catalog-completeness-2026-10-05/`.

## Application and verification

`apply.sql` is a content repair, not a schema migration. It locks each targeted public bean and its existing flavor rows, accepts either the inspected starting state or the exact final state, and aborts atomically if a record changed. It updates only the 16 reviewed sensory profiles/descriptions and the notes that differ. Existing notes with identical values keep their rows. It creates no scores, origins, processing facts, roast dates, stock or prices.

The complete transaction passed a rollback-only dry run. The committed repair was checked against all 16 exact expected profiles, translations and note sets; there were no mismatches. Replaying the repair succeeded without changing the final values. An anonymous Supabase JS read using the current mobile parser independently confirmed the public view:

| Public catalog result | Count |
| --- | ---: |
| Published reviewed coffees | 214 |
| Complete personalities | 16 |
| Profiles with at least one source-backed attribute | 33 |
| Coffees with published tasting notes after description recovery | 160 |
| Coffees with stored flavor-note rows | 89 |

`source-checks.json` stores compact fetch results and hashes, not raw HTML. `verification.json` records the anonymous verification at 2026-10-05T19:41:42.637Z. The mobile card and the Complete personality directory filter share the same completeness rule. Partial records use Roaster tasting notes, have no placeholder bars, identify what remains to be documented and retain their source links.

Validation covers TypeScript, the mobile unit/data checks, isolated browser journeys at Arabic 320/768 pixels and English 1536 pixels, tablet rotation, genuine zero scores, exact publisher scales, descriptive traits, missing notes/attributes, Arabic flavor search and navigation reset. Android/iOS/web Metro exports succeeded. These checks are not a signed APK build or a physical Android-device test.
