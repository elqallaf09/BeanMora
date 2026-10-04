# Manual brewing catalog — reviewed 2026-10-04

`recipes.json` holds 21 concise bilingual entries:5 AeroPress,4 Chemex,2 French press,2 Origami,5 Kalita Wave and 3 moka recipes/guides, with 109 instruction steps. It updates 16 existing slugs and adds 5 recipes. Sources were read on the review date. No beans, ratings, stock or community outcomes are generated.

Generate scoped content SQL with `node scripts/prepare-manual-recipes.mjs` from the repository root. The administrator replay resolves the existing `beanmora_official` curator and unique slugs rather than copying production UUIDs. Ownership or method conflicts abort. IDs and unrelated metadata are preserved. Only these entries and their source, step and pour records are touched; obsolete reviewed child instructions are removed. No schema, grants, RLS or user-result changes are made. Replay does not duplicate steps, pours or source links.

Primary source URLs are included per entry. `videos.json` records six direct YouTube links, publisher attribution and verification date. Equator AeroPress/Chemex and Stumptown French press videos were discovered in their own recipe page embeds. Kurasu Origami/Kalita and James Hoffmann moka links were retrieved from the publishers' YouTube listings. All six passed YouTube oEmbed title/channel lookup. These links open externally. General method videos are labelled separately from recipe videos because quantities may differ. Videos are not downloaded or republished.

Source distinctions retained in data and UI:

- Moka quantities depend on pot capacity. No universal scaling or fabricated Bialetti grams/minutes. Blue Bottle uses a dose range; Pact water stays in milliliters. Blue Bottle's medium heat and Bialetti's low heat remain distinct instructions.
- Coffee Collective uses water by litre, shown as 1000 ml, not measured 1000 g. Its 4-minute infusion and extra 30-second settling stage are not represented as a complete 4-minute brew.
- Tim Wendelboe gives a 60-second steep but no end-to-end time or numeric boiling temperature. Equator AeroPress describes a 2-minute steep, a 5-second stir and approximately 30-second press.
- Drop Coffee bloom mass/time ranges remain explicit. A gram plan uses published endpoints as a labelled example. The previous undocumented 45 g /25 s midpoint estimate is replaced.
- Equator Origami lists 360 g in equipment but 370 g in its pour schedule. The discrepancy is shown and `pour_sum_validated` remains false.
- Tay's ingredient list totals 174 g water, while dilution instructions target beverage weights of 110 and 154 g. Only the explicitly stated 55 and 50 g brewing additions are stored as pours; the unsupported fixed 69 g dilution is removed. Maru's actual 36 g dilution is labelled as post-press water.
- Chemex ranges and converted Fahrenheit temperatures are retained. Only source-supported smaller Chemex batches can be calculated; the app labels adaptation and keeps source timing as guidance.

Generated illustrations are bundled under `apps/mobile/assets/brewing`, with prompt provenance in that folder's README. They never replace approved SKU photography. A stopwatch measures elapsed time and catches up after suspension; saving an outcome still requires actual-brew confirmation and quantity review. Native background alarms and equipment control are not included.
