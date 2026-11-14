# Practical coffee help and mobile profile polish

The reported questions (“شلون اسوي اسبرسو”, La Marzocco first use, and dose/grind/less acidity) were incorrectly falling through to catalog search or a single grind article. Practical intent now selects reviewed lessons before catalog search, retains espresso context, and reads the current database text. Explicit recipe searches, buying advice, calculations and measured-shot coaching retain their existing routes.

Four authored Arabic/English lessons are seeded in `src/lib/coffee-practical-content.json` and mirrored into the mobile offline curriculum. They were also inserted directly into production `coffee_lessons` on 2026-11-14 at 22:14 UTC with `published`, `requires_review=false`; an `anon` read verified all four. Existing rows were not overwritten. Future editorial changes use the database and appear on the next question. Sources: La Marzocco brewing/grinder instructions and operating-manual directory, plus Barista Hustle's Espresso Compass. This remains a bounded expert system, not an unrestricted generative model.

The profile edit action now uses a compact, accessible button rather than the large profile-action pill. Arabic/English browser tests verify its 44–52 px height, maximum width and working edit/save flow.

All 144 reviewed equipment models now have original product-image mappings. The owner explicitly confirmed on 2026-11-14 that the equipment websites permit use and instructed restoration of all original images. The asset manifest records that owner confirmation as its permission basis, along with exact image/source URLs, response type, dimensions and verification date. It does not claim independent review of every site's licensing terms. Existing snapshots remain available for rollback; only equipment image fields are released, preserving holds on descriptions and facts. No replacement illustrations are included.

## Validation

- Root: 1,442 Vitest tests, recommendation and brewing outcome suites; TypeScript and ESLint passed.
- Mobile: complete unit/script suite, TypeScript, shared-core consistency and six translation packs passed.
- Expo export succeeded for web, iOS and Android.
- Seven browser regressions passed: database content refresh/offline behavior, reported Arabic/English questions, profile edit/save in Arabic/English, and Japanese account flow.
- Screenshots inspected at a 390 px mobile viewport. These are React Native Web checks, not physical iPhone verification.

Web deployment and an iOS build are required for interface/routing code. Lesson text is already delivered through the database and does not require a store update. Public App Store review is separate from TestFlight upload.
