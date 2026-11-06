> 6 November 2026: Expo 57.0.32 / @expo/config 57.0.11 removes deepmerge entirely. Its backport is retired, with original evidence retained in `deepmerge/retired-manifest.json`. Verification rejects any reintroduced deepmerge lock entry. Only the braces backport remains active. The earlier notes below document the retained patch history.

# Reviewed security backports (2026-11-01)

The upstream npm releases still contain the two reported flaws. Keep their real
versions and registry integrity in the lock; apply these narrowly scoped source
fixes after installation instead of claiming a nonexistent patched release.

| Package | Fix | Pinned upstream source | License |
| --- | --- | --- | --- |
| deepmerge 4.3.1 | Reject `__proto__` in both merge loops, including null-prototype and nested targets, CVE-2026-93753 | [PR #274](https://github.com/TehShrike/deepmerge/pull/274), `c5ad573121574db1c625b0aabcc6114ed7df6c5a` | MIT |
| braces 3.0.3 | Bound parser nesting and compile/expand/stringify recursion to AST depth 100, CVE-2026-93687 | [PR #78](https://github.com/micromatch/braces/pull/78), `97308a01d091b211cf015314a2d0696da28a5392` | MIT |

These are project-reviewed backports of open upstream proposals, not upstream
releases or approvals. The library changes follow the pinned commits. The deepmerge change is also applied
to its published CJS and UMD builds, which are the actual runtime entry points. License notices are retained in each package directory. The retained forge regression vector is attributed in its fixture source and retains its BSD license.

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

The obsolete node-forge backport was retired after upgrading to the upstream
1.4.2 release. Its exploit/signing regression tests remain active. glob 14.0.3 and
minimatch 11.0.3 are pinned to fix the October 30 advisories. deepmerge has no
patched npm release; the audit gate still reports its raw findings and verifies
installed hashes, consumer resolution, exploit rejection and ordinary config merges.
