# BeanMora 0.5.41

Physical testing of 0.5.40 (36) on an iPhone 18 Pro Max running iOS 27.0.1 found that successful account deletion returned to the home screen but left its controls unresponsive. Going to the device home screen and back did not restore interaction; terminating and reopening BeanMora did. The account, profile and server sessions were confirmed removed. The recipe library remained at 3,483 entries.

The account deletion confirmation is a native modal inside the Settings sheet. This release dismisses the keyboard and confirmation dialog, and waits for the iOS `onDismiss` event, before clearing authentication and unmounting the account screen. Android and web do not wait for the iOS-only dismissal event. Failed server deletions retain the confirmation dialog and retry behavior.

Validation before the signed build:

- Mobile TypeScript and mobile regression checks passed.
- All 15 account browser tests passed, including Arabic/English deletion failures, retries, local cleanup, and opening login after deletion.
- Signed physical-device retesting remains required; browser tests do not establish that the native window issue is resolved.

The original physical session recording and native UI hierarchy are retained outside the public repository. This release does not change recipes, media rights decisions, the logo, or the login background. App Store resubmission remains pending completion of physical-device evidence.
