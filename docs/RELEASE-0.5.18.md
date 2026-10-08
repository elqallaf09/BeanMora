# BeanMora 0.5.18 — account controls and coffeeHO timeline

The uploaded Android artifact was inspected as `com.beanmora.mobile`, version 0.5.17, versionCode 28. This release updates the source to 0.5.18; local Android versionCode 29 and iOS buildNumber 11 are preparation values. EAS continues to manage and increment the actual native build numbers remotely.

## Changes

- Dark mode now adapts Animated View/Text and ImageBackground surfaces at the native primitive boundary. Animated coffee cards previously kept their cream background while their text changed to pale dark-mode text. Product photographs remain untinted.
- Account shows one compact heading, a profile cover and avatar/initial, visible username editing, uniform collection controls, horizontally scrolling section buttons, and a separate account security panel. The selected section scrolls into view in either language, including when selected from a summary card. Tablet collection controls use four columns. The global library menu remains accessible from the compact More action without the full catalog shortcut grid.
- Names and usernames use the existing owner-checked profile update and unique username constraint. Direct username editing, validation, cancellation and confirmed-save feedback are visible. Privacy and collection sharing continue to use existing server policies.
- Email changes verify the signed-in user and, for password accounts, the current password. They request Supabase confirmation with the existing PKCE/native callback. The old email remains displayed while confirmation is pending; a server refresh confirms completion. No admin email override is used.
- Password changes validate matching fields, verify the current password and user identity, and support a server-required email reauthentication nonce. Recovery links remain available, including for Google/Apple accounts. Passwords remain transient component state and are cleared after success; they are never written to application storage.
- coffeeHO uses a compact header, inline composer, author avatars/handles, a connected timeline, comment/like/share controls and All/Following tabs. Following queries only accepted relationships and published, non-hidden posts. Guest following requires sign-in. Feed-side discovery panels are limited to wide layouts.
- Small-screen navigation labels have enough space at 320 px. Appearance and in-place language switching remain supported.

## Verification

- Mobile TypeScript, existing mobile behavior/unit suites and the 36 tooling-security/audit-policy/export regressions pass.
- iOS, Android and web JavaScript exports compile. Export source maps contain no node-forge/braces runtime modules.
- New isolated browser scenarios cover pending/confirmed email changes, incorrect current-password rejection, matching-password validation, reauthentication nonce completion, name/username changes, accepted-follow feed filtering, dark animated coffee cards and controls at 320/800/1536 px.
- The final 103-scenario browser run passed 102 scenarios. The remaining foreground-refresh scenario needed a mocked-clock frame flush before advancing time and rendering the refresh; it then passed three consecutive reruns. Account tests wait for the profile load before opening controls, and equipment-review navigation now uses Home to reach the catalog from the compact account page. Arabic preview screenshots use isolated sample accounts.
- Production public Auth settings were read: email sign-up is enabled, email auto-confirmation is disabled, Google is enabled and Apple remains disabled. Read-only database checks confirm the unique username index and existing owner-checked profile UPDATE policy. No production account was mutated and no real email was sent by the test suite.

Successful compilation/browser checks do not constitute a signed-device test or a new installable APK. Real mail delivery, both-inbox email-change behavior and installed Android/iOS callbacks still require device verification. No paid plan or infrastructure was added. A new signed native build must be installed to see this release; the uploaded 0.5.17 APK is unchanged.
