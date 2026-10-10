# BeanMora 0.5.26 — compact catalogs and simpler profiles

Source version 0.5.26 uses Android versionCode 37 and iOS buildNumber 19. EAS manages remote build counters.

## Changes

- Profile follower/following counts remain actionable at the top; the duplicate lower tabs and Add/Edit bio shortcut are removed. The existing profile editor still saves and expands long bios.
- Eight reviewed roasting machines expand the catalog to eleven. Roast Lab uses two, three or four compact photo cards per row, searchable by model or brand. Guests can browse the public catalog; adding equipment still requires sign-in. The custom machine form is collapsed.
- The roasting guide illustration is centered and bounded to 112 px on phones or 144 px on larger screens. The longer learning exercise is collapsed.
- Saved coffees opens its saved list with clean filters and never mounts a general equipment/brewing guide when the method changes.
- The For you page and navigation entry are removed. Older web links redirect to catalog discovery. Saved brew results return to the coffee bag workflow.
- Capsule products use a responsive compact grid, with twelve initially visible and a Show more control. Compatibility explanations are collapsed and filters remain usable.
- Coffee expert starts with suggestions and a nearby question form. The title panel and knowledge-library menu are removed; offline lessons, follow-ups and ratio calculations remain available through questions.
- Equipment and recipe addition actions share the platform teal primary button treatment in profiles and management screens.

The web profile, capsule layout and navigation reflect the applicable changes. Catalog sources and insert-only replay instructions are in `supabase/research/roasting-equipment-2026-10-10/README.md`.

## Verification and delivery

Arabic and English browser scenarios cover 320, 390, 800 and 1280 px layouts, including dark mode, adjacent catalog cards, filters, saved coffee isolation, retained profile editing and offline expert replies. Native bundle exports and browser previews validate source behavior; they are not physical-device tests or signed application archives.

Root lint, TypeScript, 225 unit tests, 31 recommendation checks and 37 brew-outcome checks pass. The production Next.js build completes. Mobile TypeScript, shared-core parity and behavioral checks pass; Android, iOS and web bundles compile and their dependency maps pass the runtime tooling exclusion check.

The complete mobile browser run passed 146 scenarios; three assertions still expected the removed capsule explanation heading or expert tagline. Those assertions now exercise the capsule filter and retained question form, and all ten affected-page scenarios pass in the rerun. All 28 desktop/narrow Chromium web smoke scenarios pass, including removal of For you navigation and localized legacy redirects. Local WebKit scenarios could not launch because that browser is absent and its download failed; CI's preinstalled browser image remains the required Safari preview check.

Installed applications require a new APK or iOS/TestFlight build from this release commit. Updating GitHub or exporting Metro bundles does not replace an installed application.
