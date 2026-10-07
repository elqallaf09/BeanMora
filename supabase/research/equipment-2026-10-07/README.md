# Reviewed equipment expansion — 7 October 2026

The public catalog grew from 66 to 110 entries: 40 new models/tools and four existing unpublished records reviewed and published (Mahlkönig X54, Fellow Aiden, Varia VS3 and Cafelat Robot). Six other unpublished records remain hidden. No colors or retailer listings were counted as separate models. Rocket Giotto/Mozzafiato R and V variants remain one family entry each, with their pump differences stated explicitly.

`reviewed.json` contains manually reviewed bilingual summaries, model-specific manufacturer sources, specifications and image provenance. All 44 source images were downloaded and decoded during review. Six broken Profitec hero URLs were replaced with working product-gallery images; the MOVE phone/app image and the X-Ultra page's unrelated social image were excluded. Two existing Aillio photos were corrected using the matching manufacturer's product pages. Manufacturer-linked images are marked `source_linked`, not licensed or rights-confirmed. Existing rights-confirmed/removal-requested states are preserved.

The replay also links 34 existing catalog entries to their correct brands, including grouping AeroPress models together. All 110 public models now have a brand; 97 have an image URL. Missing legacy photos remain honest unavailable states. No member reviews, ratings, prices, schema, access policies or user records are modified.

Run `python3 replay.py` to emit a transaction ending in ROLLBACK. Inspect its SQL before execution. `python3 replay.py --commit` emits the same bounded DML ending in COMMIT. IDs are stable; identity conflicts fail; reruns update the same records rather than inserting duplicates. A transaction lock serializes replays.

Validation: rollback rehearsal and committed result both reported 110 public models, zero public models without brands, and 97 public models with image URLs. An anonymous REST read using the mobile projection verified all 110 visible records and brand joins.
