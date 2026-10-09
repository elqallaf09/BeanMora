# Reviewed equipment galleries — 9 October 2026

109 of the 126 reviewed models have 383 verified gallery photos (two to four per model). Each photo links to its manufacturer product page and is marked `source_linked`, not `rights_confirmed`. No third-party image bytes are committed.

Review checked product, model, capacity and variant identifiers, decoded the fetched image, then visually reviewed contact sheets. Color variants of the same model are included. Video covers, unrelated promotional graphics and mixed-model comparisons were removed. The audit JSON lists every URL and the 17 models deferred because only one matching photo was verified or the current manufacturer page describes another model. Existing approved covers remain available for those models.

The data update only changes `specifications.catalog.images` and `gallery_verified_at`. Reviewed facts, source metadata, covers and unpublished rows are preserved. Reapplying the migration is idempotent; it matches both UUID and exact model name and only updates reviewed schema-version-1 catalogs. Gallery rendering rejects unreviewed entries, unsafe URLs and entries without provenance.
