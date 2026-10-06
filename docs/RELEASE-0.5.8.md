# BeanMora 0.5.8 / Android 18

Signed-in users can permanently delete their account and associated data from
My account → Delete account and data. The bilingual confirmation requires
حذف / DELETE, explains irreversibility, disables competing actions during the
request, and reports failures without claiming success. Signing in itself
does not erase any data.

Storage cleanup walks the authenticated user's own folder in all six upload
buckets, including nested folders and pagination. Files are removed through
the Storage API before the caller-only database RPC; the RPC refuses deletion
while owned files remain. Storage removal can precede a later failure, which
is explained in both clients. Account identity is rechecked before the RPC.
No privileged key or arbitrary target user ID is exposed in either client.

Account deletion removes sessions/refresh tokens and cascaded profile,
preferences, equipment, inventory, recipes and steps, brew history, reviews,
posts, saves, follows and Roast Lab data. Additional actor records, recipe
snapshots and grantor references are cleaned up to avoid historical
NOT NULL/SET NULL conflicts. Shared catalog facts detach their ownership
through existing SET NULL references. A restrictive Storage policy prevents
a JWT belonging to an already-deleted account from uploading new files.
Storage requests take a shared lock on the caller's auth row, so they cannot
race past the deletion transaction's exclusive lock and create an orphan file.

Mobile also clears the deleted user's saved recipe shelf and roast draft,
invalidates public snapshots and closes the local session. Guest/other-user
shelves and language preferences are preserved. Web deletion uses the same
Storage/database workflow and now displays failures.

Google now has a labelled full-width sign-in button, account selection and
PKCE. Native callbacks accept only beanmora://auth, coalesce duplicate code
exchanges, allow retry after a failed exchange and surface query/fragment
provider errors. An unconfigured Apple provider is hidden rather than
showing a button that cannot work.

## Live configuration

On 2026-10-06 the project's Google provider was already enabled, but the
redirect allow list was empty and Site URL was http://localhost:3000.
The exact native redirect **beanmora://auth** was saved in the allow list.
The live authorization endpoint also reached Google’s official account chooser
with the native redirect and minimal email/profile scopes. No real account
was signed into the app during that configuration check.
No OAuth secret, scope, user account or Site URL was changed. Apple remains
disabled pending Apple Developer renewal and its provider credentials.

Applied forward-only migrations:

- 20261006211410_mobile_account_deletion
- 20261006212147_account_deletion_actor_cleanup
- 20261006213109_serialize_account_storage_deletion

## Verification and remaining release work

The account workflow is covered by 19 unit cases, bilingual isolated browser
tests for confirmation/cancellation/failure/retry/local cleanup, a Google
PKCE sign-in round trip, and a disabled-provider case. The rollback-only
`supabase/tests/account-deletion.sql` creates generated disposable accounts
and proves database cascades, actor cleanup, media blocking, expired-identity
Storage denial and unrelated-account isolation. It leaves no fixture account
or catalog record behind. Typechecks, lint, mobile checks and Metro exports
cover the changed code; Expo Doctor passes 21/21.

App Store acceptance is not established by Google or account deletion alone.
Before iOS submission: renew Apple Developer, configure an equivalent
privacy-preserving login (normally Sign in with Apple), implement Apple token
revocation for that provider's account-deletion flow, verify actual iPhone
sign-in/deletion and privacy-policy links, and produce a signed EAS build.
There is no signed iOS build or physical-device authentication test from this
environment. Installed Android users need the new 0.5.8 (18) APK.
