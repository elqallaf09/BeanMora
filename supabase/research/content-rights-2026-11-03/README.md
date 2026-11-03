# Reversible content review, 3 November 2026

## Current owner decision: restore the recipe library

The owner subsequently explicitly requested all recipes be restored because they are the core product. Migration `20261103194742_restore_recipe_library_keep_media_review.sql` restores all 3,474 publisher recipes immediately while keeping only their cover photographs under the reversible media hold. Their ingredients, steps, source links, search results, saves and history remain available. This publication decision is **not** evidence of third-party licensing. Recipe rights review and any App Review response must state that it remains pending. Never describe the publisher recipe library as suspended after this restoration.

Legacy saved recipes remain readable in the next client build; unreviewed cached cover images are suppressed without deleting the saved snapshot. The original hold implementation below records the earlier decision and is superseded only for recipe publication.


The owner authorized replacement and temporary suspension of external content lacking permission, without permanent deletion. The owner separately confirmed commercial rights to the BeanMora identity/design reference. Logo and login-background bytes are unchanged.

## Publication changes

- Preserve 3,474 publisher recipes, their children, IDs, saves and history; hide them through restrictive parent-row access rules. Preserve the pre-hold recipe values in a private archive.
- Preserve snapshots of 245 public beans, 142 equipment records and 96 roasters. Replace external photos/logos and publisher prose with existing BeanMora artwork or neutral original descriptions. Names, factual identifiers and primary references remain. Two Option-O equipment entries added since the initial audit were reviewed and included before application.
- Publish eight independently authored BeanMora starting guides. They are not manufacturer programs or physically tested recipes. Ingredients and quantities are starting points, with explicit adjustment guidance.
- Remove the four Zill photo links from runtime capsule data. Preserve the Crossbridge photograph in the owner's private `BeanMora-held-assets.zip` archive, outside the mobile assets and current public repository. Its original SHA-256 is `99b763324da581cd20726d8f123596b429a039c4716be3918e6202e4105957e0`. Git history is retained. Git history retains the original source links.
- Display external media only when `rights_confirmed` includes a nonempty reviewed permission reference. A source URL alone never qualifies. Private user-uploaded media retains its existing ownership/storage controls.
- Ignore pre-review public catalog caches. Preserve old saved recipe snapshots on the device while hiding them until refreshed. Preserve private personal recipes.

The private `content_rights_holds` table is inaccessible to app roles. Active holds reapply replacement fields on reimport/update. Routine members cannot create permission references or change the asset associated with an existing reference. No publisher-import cron/job was active in the project or repository at review time. Do not restart external imports without completing permission review.

## Restoring an individual record

Use the maintenance connection, after checking a licence/document covers the exact content, commercial app distribution, and applicable attribution. Record its real document reference and review date on the corresponding archive entry and set `active=false`. Then restore only reviewed fields from `original_values` in the same transaction; keep unrelated later edits. For a recipe, clear `rights_suspended` only after its text/program is approved. For a photo, set confirmed status and the exact permission reference; recipe, bean and roaster fields use `*_permission_ref`, equipment gallery entries use `permission_ref`. Recheck guest/member reads and the rendered screen. Keep the archive for history. Never bulk-release from a source URL or use the test-only reference in production.

## Verification

`supabase/tests/content_rights_hold.sql` checks archive counts, hidden public content, read permissions, reimport resistance and the reversible release path, and rolls everything back. Client regressions cover source-linked imagery, image-specific evidence, held recipes, old caches and preserved saved references. Native simulator evidence is supplementary; it does not satisfy Apple's request for physical iPhone/iPad validation.
