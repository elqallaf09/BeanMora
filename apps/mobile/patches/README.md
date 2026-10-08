# Reviewed security backports (2026-10-08)

The upstream npm releases still contain the two reported flaws. Keep their real
versions and registry integrity in the lock; apply these narrowly scoped source
fixes after installation instead of claiming a nonexistent patched release.

| Package | Fix | Pinned upstream source | License |
| --- | --- | --- | --- |
| node-forge 1.4.0 | Validate nested DigestAlgorithm element count in RSA PKCS#1 v1.5 verification, CVE-2026-85393 | [PR #1152](https://github.com/digitalbazaar/forge/pull/1152), `ceba34402e329f0365134f23fe19898756527d65` | BSD-3-Clause |
| braces 3.0.3 | Bound parser nesting and compile/expand/stringify recursion to AST depth 100, CVE-2026-93687 | [PR #78](https://github.com/micromatch/braces/pull/78), `97308a01d091b211cf015314a2d0696da28a5392` | MIT |

These are project-reviewed backports of open upstream proposals, not upstream
releases or approvals. The patch hunks are unmodified library changes from the
pinned commits. License notices are retained in each package directory. The
forge regression vector is attributed to the same PR and BSD license.

`npm ci` runs `postinstall`. Application start/export and EAS post-install hooks
verify the installed patches. The installer checks package versions, lockfile
locations and real consumers' resolutions, then checks SHA-256 before and after
each exact hunk. Changed or unknown source aborts; fuzzy patching is forbidden.
Reapplying already verified patches is safe. Disabling scripts leaves vulnerable
code and causes the verification/audit/export gates to fail.

The audit gate checks installed hashes **and** exploit regressions, valid RSA,
Expo signing and glob compatibility before classifying either exact advisory as
locally patched. npm's raw version-based warnings/counts remain visible. A new
advisory, changed range, critical finding, new consumer/node, missing patch or
failing regression blocks the gate. `security-audit-exceptions.json` is empty:
these backports do not extend the former October 21 risk exceptions.

Braces rejects nesting beyond the mandatory limit with a controlled SyntaxError.
Normal patterns below the bound are preserved. This fix addresses recursive
nesting exhaustion; it does not promise unlimited Cartesian expansion, arbitrary
hostile JavaScript getters or malformed foreign parent/queue objects are safe.

When upstream publishes compatible fixes, update the relevant parents/locks,
verify installed source and behavior, remove the corresponding manifest/hunks,
and repeat all mobile checks. Do not edit expected hashes merely to pass an
upgrade. See [the verification report](../../../docs/SECURITY-TOOLING-2026-10-08.md).
