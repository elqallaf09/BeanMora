# BeanMora 0.5.38 — account guidance and release tooling

The sign-in screen explains Google accounts before a password is entered and
offers **Set or reset password**. A Google-only account must use Google or
verify its email through recovery to establish a BeanMora password. Invalid
credentials remain generic; no account/provider lookup is exposed to guests.

Registration, recovery and account security share accurate password guidance:
at least eight characters, with an easy-to-remember phrase suggested. Length,
common/breached-password and character-policy errors stay distinct. The app
does not invent uppercase, digit or symbol requirements. Backend breached
password protection is unchanged, and no user password was changed. The
isolated browser regression sends a lowercase phrase with a space unchanged.
Six translation packs cover the new copy alongside Arabic and English.

Build-tool updates pin node-forge 1.4.2, glob 14.0.3 and modern minimatch 11.0.3.
The previous forge source patch is retired; signing/exploit tests remain.
deepmerge 4.3.1 has no upstream fixed release. An exact-hash backport of the
open upstream proposal rejects `__proto__` keys in sources and targets in
source/CJS/UMD entry points. Installed hashes, actual Expo consumer resolution,
malicious merges and ordinary merges are verified. It is not an upstream
approved release. See `apps/mobile/patches/README.md`.

The root lint tree still requires the callable minimatch 3.1.5 API. Advisory
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
describes amplification in `firstPhasePreProcess` with `optimizationLevel >= 2`;
the exact installed v3 source contains neither that option nor either
preprocessing phase. The audit gate verifies its version and source SHA-256,
runs the reported pattern family in a timed subprocess, and checks ordinary
matching. Only this exact advisory/range/node is classified as inapplicable.
Unverified source, other versions/nodes, new advisories and incomplete audits
fail. This does not claim that all possible hostile globs are safe. All modern
matcher copies are upgraded to 11.0.3. Raw npm findings remain printed; neither
root nor mobile raw audit should be described as clean.

Local verification includes mobile TypeScript, unit/domain and translation
checks, security regression/audit checks, all-platform Expo exports and
source-map exclusion of patched tooling from runtime. Root unit/security tests
and lint passed. Full browser and final CI results belong in the PR/release
receipt. Browser fixtures do not prove native device behavior or create real
accounts. EAS uses production configuration, not the isolated fixture export.

The 0.5.38 iOS workflow retains BeanMora's existing app/project identity, remote
build numbering and production environment, and submits only its own build ID.
Do not infer build/upload success from the source version or release branch.

## App Review evidence still required

Apple's October 24 review requests a physical-device recording beginning at
launch, covering registration/login/deletion and community reporting/blocking,
plus purpose, setup, services, regional behavior and relevant content rights.
The supplied recording demonstrates part of the flow on the previous build;
it omits launch and reporting/blocking. A privacy-redacted copy was prepared
outside this public repository. Do not present it as complete evidence from
0.5.38. Updated Apple Developer terms also require Account Holder acceptance.
Do not resubmit until the exact candidate has passed the requested device
checks and complete evidence is available. No credentials, private recordings
or legal acceptance are stored or performed by this commit.
