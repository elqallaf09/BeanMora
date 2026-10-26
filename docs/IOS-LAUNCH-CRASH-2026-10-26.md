# iOS launch crash: 0.5.36 (26)

The supplied physical-device crash log records SIGTRAP / EXC_BREAKPOINT on the main thread at `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`, about 0.3 seconds after launch on iOS 27.0.1. This is UIKit rejecting the legacy application lifecycle, before React Native or authentication starts.

The production iOS profile selected the floating `latest` build image (Xcode 27). The app uses Expo SDK 57 without scene support enabled. Expo explicitly documents this combination as incompatible and recommends enabling scene support or using `auto` / `sdk-57`.

Set production iOS image to `sdk-57`, the supported Xcode 26.6 environment. This is the narrow compatibility fix; it preserves existing native lifecycle and OAuth callbacks while avoiding an unrelated SDK upgrade. Android configuration is unchanged. A future SDK upgrade must migrate scene lifecycle before selecting Xcode 27.

References:
- https://docs.expo.dev/build-reference/infrastructure/
- https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle

Validation: JSON parse and SDK/image compatibility reviewed against Expo documentation. TestFlight requires a newly compiled binary; a web or JS update cannot fix this crash. Physical-device launch must be confirmed with that new build; no local Xcode or simulator is available in this environment.
