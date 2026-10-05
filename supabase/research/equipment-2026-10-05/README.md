# Manufacturer equipment review — 2026-10-05

The public native equipment directory grows from 33 to 66 models. Existing IDs
are retained; new IDs are database generated. `before.json` captures the previous
public records; `catalog.json` contains bilingual model facts and official
source URLs, fetch dates, document titles and SHA-256 hashes. `image-checks.json`
checks all 56 model-specific manufacturer image links. Generic or ambiguous
photos are omitted.

`curate.py SOURCE_FETCH_DIRECTORY BEFORE_CATALOG_JSON` assembles reviewed facts.
`build_sql.py` produces `apply.sql`, the applied, transactional catalog DML.
Presentation uses the versioned `specifications.catalog` namespace; arbitrary
legacy JSON and stale prices are not comparison facts. Empty fields are shown
as unpublished, and comparison does not invent a winner.

Version boundaries reviewed include Acaia Pearl S PS003/PS004 vs Lunar 2021,
Fellow Stagg EKG vs Pro, Flair 58 vs 58 Plus, Aillio Bullet R2 vs R2 Pro and
Sculptor 078S vs 078 Turbo. J-Max uses the manufacturer's clicked 8.8 μm setting,
with its supporting J-Ultra comparison retained. Conflicting source capacities,
temperatures and ambiguous material claims are either described as conflicts or
omitted. C2 and Kalita retain their legacy identities with no new exact-model
specification or verification claim from a generic brand homepage.

All 66 source fetches returned HTTP 200. Availability, retail price, private
reviews and shopping rankings were not inserted into the catalog.
