# Research Job: discover_roasters_kuwait — Wave 1

Status: **Pending Review** — nothing in this directory has been imported to
production. Per spec §23, all Phase 2 catalog data requires admin review
before it reaches `public.roasters` / `public.roasted_products`.

Run date: 2026-08-05
Stage reached: `discover_roasters` → `extract_data` (verified subset only)
Tool: WebSearch + direct WebFetch of each roaster's official site.

## Verified roasters (data_confidence = "verified")

These 3 were fetched directly from their official site today and the facts
below are taken from that page content — name, socials, and (for ORU/48
East) physical locations are directly attributable to
`roasters.json`. Each carries `source_url` + `last_verified_at`.

1. **ORU Roasters** — oruroasters.com
2. **48 East Coffee Roasters** — 48e.co
3. **Roots Roastery** — rootsroastery.net

## Discovered, not yet verified (data_confidence = "unverified")

Found via web search with a plausible official domain, but not yet fetched
and fact-checked. Listed so the next research pass doesn't rediscover them
from scratch — do not import until each is individually verified the same
way as the three above.

- Methods Academy and Roastery — methods.coffee
- Speak Coffee Roaster — speakcoffeeroaster.com
- Legacy Roastery — legacyroastery.com (site appears to be JS-rendered;
  needs a browser-based fetch, not a plain HTTP fetch, to verify)
- Air Roastery — airroastery.com
- Earth Roastery — kw.earthroastery.com

## Excluded

- **HAZE** (hazekw.com) — verified via direct fetch, but it's a multi-brand
  **retailer/marketplace** reselling beans from Saudi and international
  roasters, not a Kuwait-based roaster itself. Worth tracking separately as
  a `product_sources`/distributor reference later, not as a `roasters` row.

## Next steps for whoever runs the next research pass

1. Verify the 5 "discovered" roasters the same way (fetch official site,
   confirm name_ar/name_en, city, socials, shipping).
2. For each of the 3 verified roasters, do a second pass specifically on
   their product collection pages to populate `roasted_products` (this
   run only captured roaster-level facts, not their product catalog —
   that's a materially larger fetch budget).
3. Feed `roasters.json` below through the Admin Import preview
   (`data_import_jobs`) once `/admin/import` exists (Phase 2 UI, see
   docs/ROADMAP.md) rather than inserting directly.
