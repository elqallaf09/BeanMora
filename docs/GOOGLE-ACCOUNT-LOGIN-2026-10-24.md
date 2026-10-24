# BeanMora Google account sign-in

On October 24, the reported Arabic sign-in screen displayed a generic email,
password, confirmation and connection error. Read-only Supabase Auth logs for
the screenshot's time window show three password-grant rejections with
`invalid_credentials`. The service was reachable. The user confirmed that the
account was created with Google; this does not establish whether a separate
BeanMora password has since been set.

PR #93 already contains the Android browser-visibility and system-browser
fallback fix. Its initial head was checked but remained unmerged. This follow-up
keeps that fix and tells users rejected by password sign-in to use **Continue
with Google** when they created the account with Google. It does not query
account existence, change credentials, disable confirmation or bypass PKCE.
Serialized Auth responses also retain their `error_code` classification when
the SDK `code` field is absent. The guidance is translated in all eight locales.

The regression scenario rejects the password attempt, verifies the guidance,
then completes a mocked Google PKCE exchange and shows the signed-in account,
in Arabic on a tablet-sized viewport and English on a phone-sized viewport.
Native tests cover Android browser discovery, missing browsers, the exact PKCE
URL, cancellation and fallback errors. These are controlled tests, not a real
Google account or physical Huawei device test.

The prepared `release-0.5.36.yml` workflow can publish the web client and create
an Android APK from the existing preview profile using BeanMora's existing Expo
and Supabase destinations. `release-0.5.36` was created at the original PR head,
before the workflow file existed. Advancing that branch starts a release; leave
it there until publication is explicitly authorized and the final source checks
pass. Remote EAS numbering is authoritative. A JavaScript export is not an APK.

Automatic approval review blocked starting Google authentication in the cloud
browser and opening the Expo account dashboard because explicit authorization
for those account/release operations was missing. No attempt was made to bypass
that rejection. No real Google sign-in, web deployment or native build is claimed.

## Required dependency repairs

The first follow-up CI run was blocked by newly reported dependency advisories.
The release candidate pins Zod 4.6.6 in both dependency trees, updates the web
form resolver to 5.9.2 and distinguishes signup input from transformed output
types. Expo's actual plugin and MCP command schemas are exercised with its Zod
override. Next.js and its ESLint configuration are patched to 15.5.28, Vitest/UI
to 4.1.12 and Vite to 8.3.3. The root dependency audit then reports zero
vulnerabilities. The mobile policy gate passes with the existing verified
node-forge tooling backport and zero risk exceptions; its raw audit still
reports the upstream version-based finding and its dependency ancestors.

Local verification includes the full mobile suite and TypeScript checks,
26 isolated auth/account/browser scenarios, eight-language message coverage,
Android manifest introspection and fresh exports for all three platforms after
the Zod override. The root passed 1,370 unit cases plus recommendation and brew
outcome checks during validation. Final checks on the patched dependency set
and the exact uploaded commit are recorded on PR #93; do not infer successful
CI or publication from these prepared files.
