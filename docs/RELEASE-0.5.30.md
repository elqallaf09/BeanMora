# BeanMora 0.5.30 — phone navigation and reliable catalog refresh

## User-visible changes

- All 14 library destinations remain directly accessible in a compact grid, with
  four columns on phones and at least 44 px touch targets. Short visible labels
  retain their full accessible names. The phone brand header is 56 px high.
- Library navigation scrolls with recipe, search and coffee pages. It no longer
  occupies a fixed block above those lists. The connection notice uses an inline
  retry action.
- General recipe search includes every public source and every xBloom model.
  The official/community, Studio/Original and website/source filters are removed,
  including remembered restrictions and requests for nearby matches. Method,
  serving, coffee, origin and taste criteria still work, including the bilingual
  combined search and explained nearby results introduced in 0.5.29.
- Existing source links and recorded device settings remain part of each recipe.

## Catalog diagnosis and fix

The five production public catalog reads completed successfully during the
investigation. The previous refresh handler called `requestIdleCallback` after
receiving fresh data without checking browser support. On a browser lacking that
API, the resulting exception entered the network-error handler and displayed a
stale-data warning after a successful fetch.

Cache writes now use supported idle scheduling or a timer fallback. Write errors
do not become connection errors. Failure of optional xBloom profile enrichment
does not mark successful general catalog reads as offline.

The observed public snapshot was 2,180,511 UTF-8 bytes, above the existing
1,500,000-byte persistence limit. Instead of saving nothing, the encoder now saves
a bounded subset of complete records with source, recipe settings and translations
intact. It retains the server total and marks partial snapshots. Failed sections,
late disk restoration and staged coffee previews preserve this marker; a complete
successful live response clears it. Offline partial data is explicitly labelled
as a partial saved copy. Private account data is not included in this cache.

## Authentication: code and remaining service configuration

All sign-in, signup, password-recovery and email-change callbacks use a common
origin-preserving URL builder. Web uses the current origin plus `/`; installed
apps continue to use `beanmora://auth`. PKCE and verified recovery intent are
preserved. Completed and failed web callbacks remove auth parameters from the
address bar without overwriting a page navigated to during the exchange.

The live redirect probe returned HTTP 303 to `http://localhost:3000/` for both
forms of the Expo production web origin. The native callback was accepted. This
is a service configuration issue; a client release cannot correct the Supabase
allow-list. See [the exact URL and Google Branding settings](AUTH-REDIRECT-CONFIGURATION.md)
and the credential-free `apps/mobile/scripts/check-auth-redirect.mjs` probe.

Google's account-chooser application identity must be configured and, where
required, verified in the owning Google Auth Platform project. No Google branding
or Supabase Auth setting change is implied by this release.

## Release procedure

`apps/mobile/.eas/workflows/release-0.5.30.yml` uses the existing Expo GitHub
integration with base directory `apps/mobile`. Its only GitHub trigger is the
exact release branch `release-0.5.30`; pushes to `main`, unrelated branches or
tags do not trigger it. The existing manual web workflow and explicit-build-ID
submission workflow remain separate.

1. Validate the new workflow from `apps/mobile`:
   `npx --yes eas-cli@24.12.1 workflow:validate .eas/workflows/release-0.5.30.yml`.
2. Create `release-0.5.30` at existing pre-release commit `bfaf13c`, which has no
   release workflow. Branch creation alone is not evidence of an EAS trigger or
   deployment.
3. Pass the release PR's existing quality checks, merge, then wait for both
   GitHub quality workflows to pass on the final merged SHA.
4. Fast-forward `release-0.5.30` from that pre-release commit to the same checked
   merged SHA using the authenticated GitHub reference update with `force: false`.
   This publishes the checked commit without a new artificial commit. EAS does
   not wait for separate GitHub Actions checks itself. Observe the actual EAS
   event and run before reporting that the release has started; a successful
   reference update alone does not prove deployment.
5. Verify each job. Web publishes to the production Expo Hosting
   URL while iOS builds with the production profile and `latest` native image.
   Submission runs only after the new iOS build succeeds and uses that exact
   build ID. Both deploy/build jobs check the BeanMora destination and public
   configuration before installation, set npm 11.19.1, and verify installed
   security backports. Existing production credentials and remote build counters
   are reused.
6. Record the run, web deployment and native build IDs. Check the released web
   version and behavior; verify Apple processing and TestFlight availability
   separately. Complete the Supabase URL and Google Branding settings above,
   then verify sign-in and recovery on the deployed browser and installed app.

The workflow is prepared configuration, not evidence that 0.5.30 has been
published. No release branch, deployment, native build or submission is created by
adding these files.

Official references: [workflow triggers and job dependencies](https://docs.expo.dev/eas/workflows/syntax/),
[build, deploy and submit jobs](https://docs.expo.dev/eas/workflows/pre-packaged-jobs/),
[GitHub native build prerequisites](https://docs.expo.dev/build/building-from-github/),
[GitHub API publishing through a reference update](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database),
and [workflow validation](https://docs.expo.dev/eas/workflows/troubleshooting/).

## Verification and release status

Local YAML and structural validation passed for the exact release branch, unchanged web
job, matching iOS destination/security hooks, build-to-submit dependency and
0.5.30 app version. The EAS CLI 24.12.1 `workflow:validate` command was attempted
but required an Expo login before validating the file. Its authenticated schema
check remains pending; no login or token was created for this step.

Root and mobile unit suites, TypeScript, root lint, installed security-backport
integrity and three-platform Expo export passed before the final upstream merge.
The final combined source must pass the existing GitHub quality and mobile
workflows before release. Browser regressions cover compact controls, unrestricted
source/model search, missing idle APIs, storage failure, offline recovery,
optional profile failure, PKCE callbacks and failed-callback cleanup.

Production Auth URL configuration, Google brand verification, actual web
deployment and TestFlight availability must each be verified separately. A
successful bundle or Apple upload alone is not evidence of tester availability.
