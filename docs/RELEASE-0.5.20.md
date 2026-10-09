# BeanMora 0.5.20 - compact settings and a general coffeeHO timeline

Prepared source release. Local Android versionCode is 31 and iOS buildNumber is 13; EAS increments native build numbers remotely. A new installed build is required for these changes to appear on a device.

## Changes

- My account contains the member profile, collections, photo/username editing and a Settings entry point. Email/password controls, sign-out and permanent account deletion are now available only inside Settings, including when Settings is opened from another screen.
- Settings uses one compact appearance/language card and one account card. The three appearance options and two languages use equal-width controls; redundant guidance and the outdated release paragraph are removed. Closing Settings unmounts the account forms so password fields are not retained between openings. Guest settings omit authenticated account actions.
- Existing verified email changes, current-password validation, password reauthentication and account deletion safeguards are preserved. Deletion retains typed confirmation, recoverable errors and owner-scoped device cleanup. Its confirmation can scroll on a small screen. Sign-out errors remain visible and can be retried.
- coffeeHO displays public posts in chronological order across languages and content types. Category, language and popularity selectors are removed. The All/Following distinction, accepted-follow filtering, public visibility checks, linked recipes/roasts and compact advertising space remain available.
- Every post has visible Like and Comment labels with counts. Members can open an inline multiline comment composer; guests can read comments and use a sign-in action to participate. Each post keeps its own draft when switching comment panels. Failed comment submissions retain the draft and show an error on the same post. Failed likes roll back their optimistic state. In-flight guards prevent duplicate interaction requests; unlikes remove only the current member's like.
- Twelve numbered menu design mockups are delivered separately for the user's selection. The final menu implementation will use their chosen layout.

## Verification

- Mobile TypeScript, behavior suites and shared-core parity pass.
- Android, iOS and web exports compile with source maps; exported dependency checks pass for all three platforms.
- Forty-one focused browser scenarios pass, including verified email/password changes inside Settings, bilingual deletion/recovery, appearance persistence, guest settings, retrying failed sign-out, liking/unliking, comment retry/draft preservation and persistence after reload. Arabic layouts are checked at 320, 800 and 1536 px.
- The full 111-scenario browser run passed 106 scenarios; five older scenarios still used the former account-page sign-out button as a sign-in assertion. They were updated to assert the authenticated account screen and all five pass in a focused rerun.
- The twelve mockups are rendered with the app's Arabic fonts and assets. The PDF contains twelve full-size pages with matching numbered bookmarks; all pages are rendered and visually reviewed.

Browser tests use isolated fixture accounts and endpoints. They do not send real confirmation email or mutate production account data. Exported JavaScript and browser previews are not a signed APK or a physical-device test.
