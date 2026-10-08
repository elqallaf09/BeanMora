# BeanMora 0.5.19 — coffee discovery, expert and profile photos

The uploaded Android package is version 0.5.18, versionCode 29. Source is now prepared for 0.5.19, with local Android versionCode 30 and iOS buildNumber 12; EAS still increments native build numbers remotely. A new native build must be installed to receive these interface changes.

## Changes

- Brew my coffee lets members and guests choose any published catalog coffee through a searchable menu, while keeping members' owned bags and saved preferences. All 15 supported brew methods are available. Recipes remain scoped to the selected coffee; when an exact recipe is absent, a sourced general guide is clearly labelled. xBloom profiles are never substituted as general guides.
- Equipment type, equipment brand and roaster country now open compact menus. Long menus support search; existing search, comparison, reset and catalog caching remain available.
- Home recommendations use actual catalog models and source photos, interleave equipment categories and change every 18 seconds. Users can pause or advance the selection. Rotation pauses when the app is in the background, a card has focus, or reduced motion is enabled. Selecting a card opens that model's details.
- Home coffee picks favor available product photos. A missing image shows a neutral unavailable state rather than an unrelated bag. Seventeen original product photos were reviewed against primary product pages and restored with an idempotent, source-matched migration. The live published bean catalog now has photos for 221 of 234 entries; the remaining 13 have no verified available source photo. The review evidence is in `supabase/research/coffee-photos-2026-10-09/reviewed.json`.
- coffeeHO keeps the All/Following timeline and removes oversized suggestion and marketing panels. Wide layouts show a small 238 × 164 advertising placeholder on the left and one account-discovery action. The empty Following timeline explains the absence of posts briefly. Following continues to show only accepted follows and public posts.
- Coffee assistant is now Coffee expert / خبير القهوة. Six bilingual, source-linked educational topics cover water, storage, processing, blooming, resting and roast levels. These complement existing brew coaching, ratios, catalog search and price comparisons. New conversations show four concise starter questions; results are limited to three initially, earlier answers are collapsed, and the question composer stays visible below the conversation.
- Account supports choosing, previewing, cancelling and saving a profile photo beside the name and handle. JPG/PNG/WebP uploads are signature-checked and limited to 5 MB. Immutable owner-folder uploads use the existing `avatars` bucket and profile ownership policies; writes require the same authenticated owner before upload and profile update, and retries keep the same object path. The username, authenticated email/password controls and dark-mode fixes from 0.5.18 remain available.

## Verification

- Root TypeScript and lint pass; 180 Vitest tests, recommendation checks and 37 brew-outcome regressions pass.
- Mobile TypeScript, behavior suites, shared-core parity and 36 tooling-security/audit-policy/export regressions pass.
- Android, iOS and web JavaScript exports compile with source maps. Runtime exports contain no patched Node build-tool dependencies.
- The 107-scenario browser run passed 100 scenarios; seven scenarios used removed labels, the former guest login gate or the previous home-pick selection. Those scenarios were updated to exercise the new controls and passed in a 22-scenario rerun. Isolated browser coverage includes coffee switching and all methods, sourced general guides, image rendering, rotating/paused recommendations and model details, menu filters, avatar preview/cancel/save/reload, account authentication controls, and bilingual layouts from 320 to 1536 px. Additional Arabic expert previews verify that the composer remains visible at 320/800/1536 px. Test data does not mutate production accounts or send real email.

Browser previews and compiled exports do not represent a signed-device test or a downloadable APK. Avatar selection/cropping and installed native behavior still need verification in the next Android/iOS build. The advertising space is a layout placeholder; no campaign or tracking service was added.
