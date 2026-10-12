# BeanMora 0.5.31

The local coffee expert now starts with fresh measurements when a brewer changes, and answers a new lesson instead of reusing unrelated equipment results. It includes a sourced immersion/French press lesson with both NCA and HARIO references and consistent Arabic publisher names. The independently verified catalog batch adds French press and Switch recipes plus Limu and Partners roasters.

Workflow: `apps/mobile/.eas/workflows/release-0.5.31.yml`. Follow the existing [release procedure](RELEASE-0.5.30.md#release-procedure): pass PR and merged-main checks, then fast-forward the precreated release branch to the exact reviewed merged SHA. The workflow uses the existing BeanMora production environment, destination guards and credentials; iOS submission uses the newly built ID. It does not buy services or change repository protections.

Publication receipts, web post-release checks, Apple processing and current TestFlight group access must be recorded in the PR after they occur. Source/configuration changes alone are not a release. See [today's audit and remaining Auth settings](DAILY-DEVELOPMENT-2026-10-12.md).
