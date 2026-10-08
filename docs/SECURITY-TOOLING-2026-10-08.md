# BeanMora tooling security fixes — 2026-10-08

**Both reported flaws are fixed in the installed mobile build tools by reproducible source backports.** The two temporary risk exceptions have been removed (`security-audit-exceptions.json` is `[]`). No exception expiry was extended. These are locally validated fixes to the code actually used by Expo and Metro, not claims that upstream has released patched npm versions.

Initial investigation baseline: main `9a780d7fc0368e7c9337349d3269ed94ff93ff27` (PR #39), app 0.5.15, Expo 57.0.27, Next.js 15.5.27. Validation uses npm 11.19.1, local Node 24.19.0 and CI Node 22. Application source and SDK dependency versions are preserved. The mobile lock changes only its root `hasInstallScript` metadata for the automatic patch installer; registry versions, tarballs and integrity hashes remain honest and unchanged.

The 0.5.16 integration baseline was main `5d9484f3cdd817534bfa5f4abcaafb5526805920` (PR #42). Its new settings/theme, coffeeHO and catalog-assistant features, application source and two new Expo dependencies were retained. The single merge conflict in the lock's root metadata kept the release version **and** `hasInstallScript: true`.

Final integration target: main `7ed67b01a8357c4f95dc994861d058e2a43dc3e5` (PR #43), app **0.5.17**. The local coffee assistant, its shared core and new browser/unit tests are retained byte-for-byte from that main baseline. This release changes no installed dependency versions. Its lockfile conflict keeps version 0.5.17 with the automatic patch installer's root metadata; no application feature or release dependency is reverted.

## Actual dependency chains and code fixes

| Package and introducer | Reported flaw | Installed fix |
| --- | --- | --- |
| node-forge 1.4.0: expo 57.0.27 → @expo/cli 57.0.28 → node-forge; CLI → @expo/code-signing-certificates 0.0.6 → the same deduplicated forge | GHSA-86w9-cpqp-85rv / CVE-2026-85393: additional nested DigestAlgorithm children accepted by RSA PKCS#1 v1.5 verification | Require exactly the OID plus the optional NULL parameter, in addition to the existing outer DigestInfo checks. Reject extra algorithm children. Preserve valid algorithms, optional parameters and existing padding rules. |
| braces 3.0.3: expo 57.0.27 → @expo/metro 56.0.2 → metro-file-map 0.84.5 → micromatch 4.0.8 → braces; React Native's community CLI also reaches this Metro graph | GHSA-vfj7-8cjw-p6xm / CVE-2026-93687: stack exhaustion on deeply nested patterns/AST traversal | Mandatory depth limit 100 in the iterative parser and all three recursive walkers: compile, expand and stringify. Deep braces/parentheses and direct ASTs produce a controlled SyntaxError before exhausting the stack. |

The patches exactly backport library hunks from the following pinned upstream proposals, reviewed and tested in this change:

- [digitalbazaar/forge PR #1152](https://github.com/digitalbazaar/forge/pull/1152), commit `ceba34402e329f0365134f23fe19898756527d65`; BSD-3-Clause option, with copyright/license notice retained.
- [micromatch/braces PR #78](https://github.com/micromatch/braces/pull/78), commit `97308a01d091b211cf015314a2d0696da28a5392`; MIT, with copyright/license notice retained.

These proposals are open upstream, not maintainer-approved releases. Their exact code, origin, package versions, consumers and SHA-256 file hashes are committed under `apps/mobile/patches/`. No floating fork, prerelease SDK or artificial package version is used.

Both leaf packages are in npm's production-classified tree because Expo/React Native are application dependencies. Tooling status is established by source use and bundle evidence, not by `dev: true` or omitting development dependencies. Expo code-signing certificates **do perform RSA/certificate/CSR verification**, so that path needs the cryptographic fix. Metro imports micromatch; its brace compilation/expansion APIs resolve the patched braces copy. Normal micromatch file matching also uses picomatch, which must not be confused with the vulnerable braces recursion.

The three export source maps contain no forge/braces modules. This proves their absence from these JavaScript bundles, not safety of unpatched tools or successful signed IPA/APK builds. The separate Next.js tree has neither leaf package and audits cleanly; PR #39's Next upgrade did not itself fix the mobile tools.

## Installation and release gate

1. Mobile `npm ci` automatically runs `postinstall` to apply both source fixes. The installer validates lockfile locations/versions and actual CLI/code-signing/micromatch resolutions, checks every original file hash, applies exact hunks without fuzzy matching, then checks the patched hashes. All files are validated before writes; repeat installation is idempotent. Unknown source fails installation.
2. App start, iOS/Android/web/tunnel scripts, export and EAS post-install verify the installed patches. `npm ci --ignore-scripts` was explicitly tested: verification, the audit gate and `npm run export` all fail on the unpatched files. Modified bytes, new installed copies and a consumer resolving an unpatched nested copy also fail.
3. The audit still runs **`npm audit --include=dev --json`** across every severity, preserves npm diagnostics and prints the raw result. Before classifying a finding as locally patched, it verifies installed hashes/resolutions and reruns exploit and compatibility checks. The manifest alone cannot clear a finding.
4. Only the exact advisory URL/range and reviewed tooling nodes/immediate consumers can be classified as patched. New advisories, changed ranges, direct usage, additional nodes/consumers, critical findings, incomplete/unavailable audit data and failing tests block. Historical exception deadline/scope regression tests remain active even though the actual exception list is empty.
5. CI exports source maps for iOS, Android and web and blocks either tooling package entering a runtime bundle. Missing/malformed maps fail. Verification maps stay in ignored `dist/`; no source maps are published by this change.

The raw mobile audit still exits **1**, reporting **15 high affected-package entries for two underlying advisories** and zero other severity counts. npm checks upstream package versions, so it cannot recognize these installed source backports. The gate prints both advisories as **VERIFIED LOCAL SECURITY FIX; NPM VERSION FINDING REMAINS**, reports zero risk exceptions, and explicitly states that raw npm audit is not clean. No warnings are hidden and no unresolved-risk exception substitutes for a source fix.

## Compatibility and exploit evidence

The same regression assertions first failed on pristine upstream 1.4.0/3.0.3 code, then passed after patching:

- Forge: valid PKCS#1 padding with extra DigestAlgorithm children (with and without NULL parameters) is now rejected. The upstream low-exponent vector is also rejected. That vector isolates ASN.1 checks with the upstream padding-test option; our separate malformed-signature tests use the normal padded verifier.
- Forge compatibility: valid SHA-1/256/384/512 RSA signatures with and without optional NULL, wrong-hash rejection, RSA encryption/decryption and RSA-PSS pass. Real installed Expo certificate generation/PEM parsing/validation, CSR verification and manifest signing pass; a malformed certificate signature is rejected.
- Braces: 4,000 nested braces/parentheses are rejected by parse, compile, expand, stringify and the default API in child processes with a 512 KB stack. Direct AST depth 100 succeeds, 101 and 4,000 reject. Alternatives, ranges, escapes, parsed ASTs, nested patterns below the bound and micromatch consumers retain their behavior.
- The upstream suites ran against byte-identical patched library files: **forge 829 passed, 4 existing pending**, including the new upstream RSA regression; **braces 778 passed**, including its 14 new depth regressions. The forge tag's `describe.only` on JSBN was unfocused only in the scratch test clone to run the complete suite; no library code was changed beyond the committed security hunks. The isolated runner was Mocha 11.7.5; no test-runner dependencies were added to the app.

The mandatory braces depth bound is an intentional rejection of pathological patterns. It is not a guarantee that arbitrary hostile JavaScript getters, malformed foreign parent/queue structures or unlimited Cartesian expansion are safe; those are outside this recursion CVE backport. All existing application behavior checks remain active.

## Verification and reproduction

Initial 0.5.15 validation after a fresh normal mobile install: 36 security/backport/policy/export regression tests; mobile behavior suite (98 tests plus guide checks); web security regressions (9); web unit/recommendation/outcome suite (214); web/mobile typechecks; web lint; Xcode UUID compatibility; full audits; Expo version compatibility; Expo Doctor **21/21**; and all three source-map exports. Its iOS/Android/web maps had **903/901/549** sources and zero forge/braces modules.

The 0.5.16 integration passed the 36 security regressions, 98 mobile behavior tests, guide checks, typechecks/lint, full audit and Expo compatibility/Doctor checks after a clean install. Its web unit/recommendation/outcome suite had **221** tests, including the new assistant regressions; its mobile browser suite passed **93** scenarios. All three exports passed with **910/908/585** mapped sources, zero affected runtime modules, and the normal Next production build plus all 42 web browser scenarios passed in GitHub Actions.

The subsequent 0.5.17 integration preserves the same patched dependency graph and adds the release's local-assistant coverage. Local security regressions (36), mobile behavior (98 plus guide checks), web tests (**237**, including 16 new local-assistant tests) and both typechecks passed. The mobile browser suite now has **97** scenarios. Both complete GitHub workflows must pass again on this integrated head. Final export/browser/build results and run links are recorded on the PR; they are not inferred from either older release's checks.

A local Next production build uses the previous build's real font CSS/WOFF2 through Next's test-only cached-font response mechanism because the normal local environment cannot fetch Google Fonts. Application code is unchanged; this does not prove online font fetching. GitHub's production build continues to use normal online fonts.

From the web repository root:

```sh
npm ci
npm audit --audit-level=low
node scripts/test-security.mjs
npm test
npm run typecheck
npm run lint
npm run build
```

From `apps/mobile`, using the isolated preview/export fixture configuration (not native signing):

```sh
npm ci
npm ls braces node-forge
npm run verify:tooling-security
npm audit --include=dev --json
node --test scripts/tooling-security.test.mjs scripts/audit-policy.test.mjs scripts/check-exported-dependencies.test.mjs
node scripts/audit-dependencies.mjs
node scripts/check-tooling.cjs
npm run typecheck
npm test
npx expo install --check
npx expo-doctor@1.20.4
npm run export -- --source-maps
node scripts/check-exported-dependencies.mjs
npx playwright test --config=playwright.config.ts
```

Expect the raw mobile audit command to exit 1 for the unchanged published versions. The independently verified installed-code gate must pass with **two source fixes and zero risk exceptions**. JavaScript exports/browser previews are not physical-device tests, a signed native build, TestFlight upload or store publication.

## October 21 and remaining external work

The former deadline was **2026-10-21T00:00:00Z (03:00 Kuwait)**. Both exceptions were removed after source-level remediation on October 8; neither was extended. A regression confirms the real audit fixture can pass after that deadline only with independently verified backports and no risk exceptions. An expired exception left in the policy still blocks even when backports verify.

Published stable upgrades checked do not clear either advisory: forge 1.4.0, braces 3.0.3, current Expo/CLI 57.0.27/57.0.28 and micromatch 4.0.8 remain affected upstream. Code-signing-certificates 0.0.7 still uses forge ^1.4.0; Metro-file-map 0.87.1 still uses micromatch ^4.0.4 and is outside this SDK's graph. These unrelated upgrades were not forced.

The remaining external dependency is a compatible **published upstream fix** so version-based scanners can clear and the local backports can be retired. BeanMora maintainers own these backports until then. Before upgrading, verify upstream source/advisory coverage and parent compatibility, regenerate the lock with npm 11.19.1, remove only the superseded backport, and rerun the commands above. Do not change expected hashes merely to force an upgrade through. Merging this PR is necessary for these source fixes to apply to main; the report does not claim deployment or a native store release.

Primary evidence: [PR #37](https://github.com/elqallaf09/BeanMora/pull/37), [PR #39](https://github.com/elqallaf09/BeanMora/pull/39), [forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), the two pinned upstream PRs above, and live registry/dependency/audit output recorded during this task.
