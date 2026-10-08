# BeanMora build-tool security exceptions — 2026-10-08

Baseline: main `9a780d7fc0368e7c9337349d3269ed94ff93ff27` (PR #39), app 0.5.15, Expo 57.0.27, Next.js 15.5.27. Both package trees were installed from the committed locks with `npm ci`, using npm 11.19.1. The local runtime is Node 24.19.0; CI uses Node 22.

## Actual findings

**Neither upstream vulnerability is fixed.** Full mobile `npm audit --include=dev --json` exits 1: 15 high-severity affected-package entries, representing two underlying advisories; zero info/low/moderate/critical findings. The historical count of 16 from 0.5.14 is not a current finding count. A change in propagated package counts does not prove a fix.

| Installed vulnerable package | Actual introducers after clean installation | Advisory |
| --- | --- | --- |
| node-forge 1.4.0 | expo 57.0.27 → @expo/cli 57.0.28 → node-forge; the same CLI → @expo/code-signing-certificates 0.0.6 → node-forge (deduplicated) | GHSA-86w9-cpqp-85rv, affected <=1.4.0 |
| braces 3.0.3 | expo 57.0.27 → @expo/metro 56.0.2 → metro-file-map 0.84.5 → micromatch 4.0.8 → braces; React Native's community CLI also reaches the same Metro tree | GHSA-vfj7-8cjw-p6xm, affected <=3.0.3 |

The two leaf packages are installed in the **production-classified npm tree** because Expo/React Native are app dependencies. Calling them tooling dependencies is based on source usage and exported bundle evidence, not `dev: true` labels or an assumption that `--omit=dev` removes them.

- Metro file watchers call micromatch with repository file paths/globs (`metro-file-map/src/watchers/common.js`). The risk is stack exhaustion from deeply nested patterns.
- Expo CLI's iOS signing utility parses certificates with forge. `@expo/code-signing-certificates/build/main.js` also calls `certificate.verify`, public-key verification and CSR verification. Signing tooling is exposed to the cryptographic verifier; it is not accurate to say forge verification is unused everywhere.
- The iOS, Android and web export source maps contain no node-forge/braces modules. This supports absence from these JavaScript runtime bundles; it does not make the installed build tools safe or certify a signed IPA/APK.
- The separate Next.js tree has neither package and `npm audit --audit-level=low` reports zero vulnerabilities. PR #39 fixed the Next.js advisories, not these two mobile exceptions.

## Available upgrades and decision

Registry queries and the upstream advisories were rechecked for this task:

| Package | Published stable version checked | Can it remove the finding? |
| --- | --- | --- |
| node-forge | 1.4.0 | No; this is the installed affected version. Upstream fix PR #1152 is still open. |
| braces | 3.0.3 | No; this is the installed affected version. Issue #70 remains open. |
| expo / @expo/cli | 57.0.27 / 57.0.28 | Already installed, still bring forge and Metro. Expo's `next` tag is outside the stable SDK used by this release. |
| @expo/code-signing-certificates | 0.0.7 | Still depends on node-forge ^1.4.0. It is outside the CLI's ^0.0.6 range and does not fix this advisory. |
| micromatch | 4.0.8 | Already installed; depends on braces ^3.0.3. |
| metro-file-map | 0.87.1 | Still depends on micromatch ^4.0.4 and is outside the installed Metro 0.84.5 graph. |

No dependency version or lock was changed: none of the checked stable upgrades removes either finding. An unrelated Metro/SDK upgrade, an unmerged cryptographic patch, or an unreviewed fork is not evidence of a safe compatible remediation. A maintainer-supported drop-in replacement was not identified. Preserve the current SDK until a fix can be installed and tested.

## Changes made to the release gates

1. Audit all dependencies, explicitly including development tools, and report raw severity counts. New findings at any severity block; critical findings can never be excepted.
2. Retain the exact advisory URL/range but narrow each exception to its reviewed installed node and immediate consumers. Direct use of either package, new installed nodes or additional consumers blocks the gate.
3. Validate exception metadata, duplicates and expiry. Expired exceptions fail even if an advisory disappears; unused exceptions must be removed after verifying the fix. Missing/incomplete audit data and unresolved advisory paths fail closed.
4. State explicitly that a gate passed **with temporary exceptions and unresolved vulnerabilities**. Preserve npm diagnostics rather than suppressing them.
5. Check all three exported source maps in CI and fail if either excepted package enters a runtime bundle. Missing or malformed maps also fail. Source maps are verification output in ignored `dist/`; this change does not publish them or change the normal app export script.
6. Add regression coverage for the deadline, changed advisory identities/ranges, critical/new low findings, scope changes, cycles, unavailable data and runtime inclusion on all platforms.

## Deadline and remaining action

Expiry is unchanged: **2026-10-21T00:00:00Z (03:00 Kuwait time)**. No exception was added, broadened or extended. Both remain open until a real fix or reviewed compatible replacement is verified.

Before the deadline, recheck the registry plus forge PR #1152 and braces issue #70. Install a published fix through compatible parent versions or a narrowly reviewed override, regenerate locks with npm 11.19.1, and repeat the commands below. Confirm both the installed dependency tree and raw full audit; remove only the resolved exception. Do not reinterpret a passing exception gate as a clean audit.

Until then, accept only trusted repository/build/signing inputs and keep development servers private. At expiry the release gate must block while a finding remains; do not extend the date solely to release. If an upstream patch is still unavailable, a separately reviewed backport/replacement is the remaining engineering work, not a claimed completion here.

## Verification

Completed locally: clean web/mobile installs, web audit (zero), mobile raw audit (15 high entries / two unresolved advisories), the narrowed exception gate, 9 policy and 3 export-gate regression tests, 9 existing web security regressions, 214 web unit/recommendation/outcome tests, mobile behavior suite, web/native typechecks, web lint, Xcode UUID compatibility, Expo dependency compatibility, Expo Doctor **21/21**, and iOS/Android/web exports with source maps. The maps have 903/901/549 source entries respectively, with zero affected package modules.

All 89 React Native Web browser scenarios passed against the isolated fixture. A second local Next production build passed using the previous build's real font CSS/WOFF2 files through Next's test-only font response mechanism, with no application source change. The first normal local build failed because this environment could not fetch Google Fonts. Further web browser results and final GitHub checks are recorded in the pull request; this cached-font build is not evidence of successful online font fetching. CI continues to run the normal production build with online fonts.

Reproduction (web repository root):

```sh
npm ci
npm audit --audit-level=low
node scripts/test-security.mjs
npm test
npm run typecheck
npm run lint
npm run build
```

Reproduction (`apps/mobile`, isolated fixture configuration for preview/export, not signing):

```sh
npm ci
npm ls braces node-forge
npm audit --include=dev --json
node --test scripts/audit-policy.test.mjs scripts/check-exported-dependencies.test.mjs
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

The raw mobile audit is expected to exit 1 while these advisories remain. JavaScript exports and browser preview are not physical-device tests, a signed native build, a TestFlight upload or store publication.

## Primary sources

- https://github.com/elqallaf09/BeanMora/pull/37
- https://github.com/elqallaf09/BeanMora/blob/main/docs/RELEASE-0.5.15.md
- https://github.com/elqallaf09/BeanMora/pull/39
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/digitalbazaar/forge/pull/1152
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/micromatch/braces/issues/70
- Registry checks: `npm view <package> version dependencies dist-tags --json`, including `expo@57` and `@expo/cli@57` version lists. These were live registry observations, not versions inferred from old release notes.
