# BeanMora 0.5.23 — approved social account profile

Implements the user's selected account mockup 01 with the existing mockup 7 underline navigation. Source version 0.5.23 uses Android versionCode 34 and iOS buildNumber 16; EAS manages the remote build counters.

## Resulting behavior

- A small vector wave cover replaces the oversized profile card. The avatar overlaps the cover, the name and username stay together, and editing uses a compact outlined button. The cover adapts to light/dark appearance without downloading an image.
- Followers and following are inline links. Four collection summaries share one strip instead of separate large statistic cards. Counts come from the existing visible collection response; no example counts or products are added to a real account.
- Equipment, coffee and recipes use equal-width underline tabs. Favorites, comments, brew/corner photographs, followers and following remain available in the compact More selector. Choosing a summary or follower count activates its section directly. The More selector has a distinct accessible label from the app's general More menu.
- Approved equipment and coffee photographs appear in compact cards on phones. On tablets, equipment photos are larger and the first existing coffee bag appears alongside equipment, with a link to the full coffee section. Photograph approval rules, signed private-media access and model-specific missing-image handling remain in place. The coffee preview shows only fields supplied by the account API, without invented bag weights or origin labels.
- Equipment details, inventory management, bag management, recipe creation, profile/avatar editing and accepted follow requests retain their existing actions. The Add equipment action opens the existing equipment manager, where the catalog addition flow is available. There is no new equipment-write path.
- The duplicate account heading, email block, settings action and release footer are removed from the profile. Email, security, sign-out, account deletion and version information remain in Settings. The existing header settings button and centered coffeeHO navigation are retained.

## Verification

Mobile TypeScript, shared-core parity and the mobile behavior checks pass. Account-focused browser checks cover authentication, username and avatar updates, privacy/follow requests, gallery uploads, saved favorites, account-owned photos and collection actions. Four added account scenarios check Arabic/English layouts at 320, 800 and 1536 pixels, light/dark appearance, actual fixture images, compact edit actions, all four navigation triggers, extra-section selection and the centered coffeeHO destination. Fixture assets and sessions are isolated from real member accounts. Language-switch test setup waits for the closing Settings modal host to unmount and release its focus trap, rather than only waiting for its contents to disappear. The deterministic search test retains real clicking, focused typing, debounce boundaries and stale-response assertions. Complete CI results are recorded in the release PR.

No database migration, new provider, paid service, or replacement catalog photography is required. These browser checks do not establish physical-device behavior or produce a signed APK/iOS archive. An installed app requires a new native build to receive this design.
