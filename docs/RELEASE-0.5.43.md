# BeanMora 0.5.43 — coffee expert

This release configuration prepares a new iOS build for the coffee expert changes. A source change, passing check, or exported bundle does not update an installed iPhone app. Publication and TestFlight availability require separate receipts below.

## Release destination

- Expo: `elqallaf09/beanmora-mobile`, project `a3785113-b993-49fa-9986-e3dc96d63115`.
- Supabase: `ubvzdglrwkkuaigmkjap`.
- iOS bundle: `com.beanmora.mobile`; App Store Connect app: `6819935215`.
- Source version: `0.5.43` in app configuration, package metadata, and lockfile.
- Build profile and environment: `production`; EAS manages build numbers remotely with `autoIncrement: true`.

The `.eas/workflows/ios-0.5.43.yml` workflow accepts a manual run or a push to the exact branch `release/ios-coffee-expert-2026-11-19`. It checks the app identity, source version, build profile, and production configuration; installs the pinned npm resolver; verifies installed security backports; enforces the existing full dependency audit; and runs mobile TypeScript and regression checks. Submission depends on the new iOS build and uses that exact build ID. It uploads to App Store Connect/TestFlight without submitting an App Review release.

## Checked-commit delivery

1. Create the dedicated iOS release branch at an existing ancestor commit that does not contain this workflow. This setup does not establish a build or deployment.
2. Require both GitHub quality workflows on the final pull request head, merge, and then require both workflows on the exact merged commit. EAS does not wait for GitHub checks on its own.
3. Fast-forward the dedicated iOS branch to that checked merged commit with `force: false`. Do not trigger older release branches or reuse an older archive.
4. Observe the actual Expo run. Verify its source commit, app version, build profile, platform, bundle identifier, and incremented native build number. Record the run URL, build ID, and submission result.
5. Verify Apple processing and TestFlight group availability for that exact build. Test launch, sign-in, a pressure question using `bar / بار`, a normal coffee question, and AI-to-local fallback on the installed build. Do not count browser fixtures as physical-device validation.

Web publishing remains a separate workflow and receipt. It must use the same checked release source and the production Expo/Supabase destination. A web deployment does not update a previously installed iOS app.

## Status

This document records preparation only. It does not claim that a build was queued, an archive was uploaded, the web was published, or TestFlight/device validation succeeded. Record those receipts after the corresponding actions complete.

The server pilot settings and OpenAI billing configuration are independent of the client release; publishing this workflow does not activate the pilot or verify any credit grant.
