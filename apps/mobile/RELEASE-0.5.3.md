# BeanMora 0.5.3 / Android versionCode 13

## Uploaded APK audit — 2026-10-05

- Uploaded package: `application-88711690-e13f-4997-ba83-e1c8c2e7646f.apk`.
- SHA256: `0b3e4661fc91d2f05667ce8d5b55d827f46120458a5ad13f0e145a3d44b09ee5`.
- ZIP integrity check passed. Android manifest and embedded Expo config both identify `com.beanmora.mobile`, version `0.5.2`, versionCode `12`.
- Minimum Android API 24; target API 36. Includes arm64-v8a, armeabi-v7a, x86 and x86_64 native libraries.
- Hermes bytecode decodes and contains the recipe search RPC, coffee sensory component and xBloom hub. The supplied build includes these features.
- Read-only requests with the public configuration recovered from the APK returned 3,173 public recipes. The exact mobile recipe search projection succeeded as a guest for every method checked below. No user account was created and no catalog or private data was changed.

| Library | Live recipe count |
| --- | ---: |
| All | 3,173 |
| xBloom | 3,048 |
| Moka pot | 3 |
| Cold brew | 2 |
| French press | 5 |
| April | 1 |
| OREA | 5 |

## Corrections

The five-item bottom navigation still includes the inventory-first Brew journey. The persistent library rail now exposes Recipe library and Coffee & taste directly. Choosing a brewing method on Home opens that method's recipes. Re-entering the full library resets its method, search and source filters, including when already on the recipes screen.

The xBloom hero image is outside the row's height measurement and explicitly fills its compact frame. This avoids percentage-height measurement against an auto-height native parent and overrides React Native Image's default intrinsic source dimensions. Copy determines the usable height; the image cannot force the hero to the source bitmap's size.

The coffee tasting section now remains visible near the product title. Alternate documented note formats, British spelling, quoted notes, Arabic labels and plain leading flavor lists are read without assigning numeric intensity. The same read-only snapshot of 214 public coffees exposes written notes for 158 coffees, compared with 130 under the previous reader: 28 recovered note sets. Remaining coffees without published notes have an explicit state. Source-backed numeric/qualitative sensory values retain their original provenance and scale.

## Validation and delivery

- Mobile TypeScript and the mobile unit/data checks pass.
- Expo Android, iOS and web exports pass using isolated test configuration.
- All 39 React Native Web browser checks pass, including direct navigation, filter reset, recovered written flavors, xBloom height, copy containment and tablet rotation in Arabic and English.
- These are source, bundling and React Native Web checks. No Android emulator or physical-device runtime test is available in this workspace.
- A signed replacement APK has **not** been built here. Exported Hermes bundles are not installable APK files. Build `main` in the existing Expo project using `apps/mobile`, Android, `preview`, Production environment. Verify release `0.5.3 (13)` before downloading. The older uploaded APK is unchanged.
