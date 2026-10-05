# Catalog completeness, 5 October 2026

The production preflight found 214 published reviewed bean records, with 16 numeric sensory profiles. xBloom has 3,048 public recipes and 2,861 source cover URLs; the most recent community imports often have no cover. Numeric xBloom water is usually stored as `source_brew_parameters.water_ml`, with temperature and grind in the source program rather than the scalar recipe fields.

The application now reads source dose/grind/per-pour temperatures, preserves milliliters, displays only available facts, and uses a clearly labeled bundled brewing illustration for absent or failed xBloom covers. It does not assign arbitrary sensory scores or calculate an unsupported total brew time. The hub loads 12 recipes per page; other catalog views keep 30.

The same measurements are used in Brew My Coffee, which starts on a method with a linked recipe while respecting explicit method choices and the saved preferred recipe. The approved Oasis bag photograph is bundled as a lossless PNG, matched by its exact source URI, so the actual product photo remains visible when the external CDN fails. Other coffees' image URIs retain their normal behavior and source links.

`complete-oasis.sql` is an idempotent, guarded content repair. It removes stale internal Arabic review labels and completes the specialty Oasis Blend's translated description, three-country origin, two tasting notes and qualitative body/sweetness. It fills no numeric intensity, process, variety, roast level, current price, stock or device-specific recipe.

Source: Crossbridge's official coffee catalog archived at https://web.archive.org/web/20190705142405/https://crossbridgecoffee.com/coffees/ . The archived HTML was retained by the prior catalog-media review and its exact-product match is also documented in `../catalog-media-2026-10-04/evidence/rescue-source-evidence.json`. The specialty blend matches the existing three-country description and approved bag photograph. The adjacent four-country conventional blend was excluded.

The current official domain returned a parked redirect on 5 October 2026. Historical details therefore use the archived URL and are labeled historical in both languages. Current search indexing of https://crossbridgecoffee.com/coffeepics also retains the specialty blend's country/roaster listing, but ambiguous snippets were not used to assign process or tasting notes.

Bundled artwork: `apps/mobile/assets/brewing/filter-coffee.png`, created using the built-in image generation tool. Prompt: a warm premium editorial photograph of a clear cup of filter coffee, a cream flat-bottom dripper and glass server on pale limestone, with oak and muted teal in the background; no people, text, logos, commercial packaging or branded device. Its caption identifies it as illustrative brewing imagery, not the recipe author's product photo.
