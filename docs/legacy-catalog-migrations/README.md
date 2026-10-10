# Archived catalog drafts

These drafts were not applied to the connected database. Versions 30–33 were
already used there by different migrations, and version 33 occurred twice in
the repository. They are retained here instead of the active migration path.

The forward migration `20261009233408_audit_catalog_watch_and_report_contracts.sql`
restores their intended tables and invoker views against the actual schema,
preserves existing story notification types, isolates private member data and
claims alert delivery once before inserting its notification. Its filename
matches the connected project's migration history. No history was renamed or
repaired, and no historical price changes were backfilled.

The actual-role test is `supabase/tests/catalog_watch_and_report_contracts.sql`.
All its fixture changes roll back.
