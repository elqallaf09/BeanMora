# BeanMora mobile 0.5.12

The reported three-minute startup remains a device report, not a measured improvement claim. A controlled regression test reproduced a concrete startup dependency: an expired member session whose token refresh never responds blocks public catalog requests before the fetch timeout even starts.

## Changes

- Public coffee, recipe, equipment and roaster browsing uses a dedicated public client whose token callback never acquires the member session lock. Existing anonymous publication/review policies still apply. Account data, saves, history, reviews and writes continue using the authenticated client.
- Startup reads have a 12-second deadline around the complete query, including token acquisition and response decoding. Timed-out sections remain recoverable failures and preserve last-good public data.
- Reuse compiled Arabic name matchers and compute each coffee's display data and inferred flavors once per load instead of repeatedly during incremental loading.
- Includes 0.5.11 compact, virtualized equipment browsing with search/category/brand filters, 110 reviewed public models, corrected Aillio photographs and reduced empty-image cards; 0.5.10 signup/guest and responsive header improvements remain included.

## Verification

- The expired-session test failed before the change and passed after it while refresh remained deliberately stalled; coffee/equipment browsing and account navigation stayed available.
- Unit checks cover independent public/member clients, owner-scoped saved IDs, stuck-query deadlines, cache preservation and existing mapping/translation behavior.
- TypeScript and the mobile unit suites pass; isolated web, iOS and Android exports pass.
- Physical iPhone and tablet timing must be confirmed after installation. Browser fixtures and CPU throttling do not establish a native-device launch time.

Version: 0.5.12; Android 22; iOS 5. Building is separate from uploading to App Store Connect/TestFlight.
