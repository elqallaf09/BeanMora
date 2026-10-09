# BeanMora 0.5.22 — member saves, Arabic discovery and equipment context

Source release with Android versionCode 33 and iOS buildNumber 15. EAS increments the native counters remotely. Updating source, database functions or Metro bundles does not update an installed app. A new signed Android APK / iOS archive is required; this workspace has no authenticated Expo build session and has not produced one.

## Resulting behavior

- Signed-in recipe saving writes to the account's `recipe_saves` and confirms the row before showing success. Duplicate retries use INSERT ... ON CONFLICT DO NOTHING, matching the existing owner policies without requiring an UPDATE grant. The same save appears in account favorites and the recipe shelf after reopening. Confirmed account saves removed on another device disappear after reloading; older device-only entries remain until explicitly removed. Guest saves stay on the device. Cache failures do not undo a confirmed server write.
- Equipment opinions remain writable when the optional rating aggregate fails. Review drafts remain on errors; an insert retry after a lost response recovers the existing opinion belonging to that member and model. Keyboard taps reach the action button on the equipment detail scroll view.
- The recipe search, brewing method, source, xBloom model and applied/draft discovery fields survive entering and leaving a recipe. This memory is scoped to the entry tab and selected coffee and clears when account identity changes. Pagination, scroll position and drafts across a full app restart are not persisted by this change.
- Search uses the same Arabic flavor dictionary as the displayed tasting notes, plus reviewed coffee-name spellings and catalog proper-name aliases. Server and local discovery both expand names and flavor notes while preserving every-word AND matching, literal punctuation, private-data exclusions and exact coffee IDs. Source facts are unchanged. Arabic aliases are retrieval labels, not additional botanical/origin assertions.
- My equipment and member collections show approved pictures of the exact catalog model or coffee. Bean rows can use an approved gallery or linked product cover when no direct approved cover exists. Missing/unapproved photographs remain explicitly unavailable. Private uploaded media still uses the existing owner/follower access rules.
- Equipment details add a collapsed practical usage guide in Arabic and English, with manufacturer links and verified video/manual destinations where available. Model instructions govern dosing, heat, compatible parts and cleaning. Generic guides are identified as such; this does not add an exact-model YouTube tutorial for every product.
- A brew result can save the exact grinder and brewing device, setting, roast level/date and zero/burr calibration. The new `record_configured_brew_v1` writes this context and the original outcome in one idempotent transaction. An identical retry returns the same cup; a changed payload/context with the same request ID is rejected. Members can compare their private recorded trials for each coffee with explicitly sourced recipe settings.
- Numeric manufacturer starting points are deliberately limited to documented models: Encore ESP, standard-axle Comandante C40 MK4 and Ode Gen 2 paired with Aiden. Dose, brewing method, volume and calibration limits are shown. These values are starting points, not tested settings for every named coffee. No number is converted between unrelated grinders, between xBloom Original/Studio or from original Opus to Opus 2.
- Capsules now list 101 reviewed examples in seven clearly separated systems, with Arabic names/search and a compact machine-system selector. Lists load twelve at a time. BLUE remains a sourced system with no unverified individual products. Stock, price and universal compatibility are not inferred.
- Zill Coffee Machine is added to the reviewed equipment catalog with eight manufacturer photographs, usage instructions and its dedicated Arabic-coffee capsules. Same-model color variants are labelled. The capsule listings retain the manufacturer's milk-derivative notice. The machine is not silently treated as Nespresso or a loose-coffee brewer.

## Applied data changes

Four canonical migrations are included in `supabase/migrations`:

1. `20261009123449_member_save_search_and_grinder_context.sql` expands the public search index, adds collection photographs and validates atomically saved grinder context.
2. `20261009130930_reviewed_zill_arabic_coffee_machine.sql` adds the reviewed Zill model and eight source-linked photographs.
3. `20261009132440_additional_flavor_spellings.sql` adds plural/spaced currant variants with a guarded function replacement.
4. `20261009150940_account_collection_photo_source.sql` adds an approved coffee gallery/product fallback while pairing the selected URL with its usage status and preserving collection privacy gates.

All four were applied to BeanMora. The public search index contains 3,451 documents. Administrative transactions tested real favorite insert/retry/delete, opinion writes, configured brew retries, invalid dates/models, forged context rejection and cross-owner/guest privacy. They rolled back their test writes; post-test counts matched the original brew logs, favorites and equipment reviews. Arabic versus English live queries returned identical counts for Gesha (299), Kenyan origin (129) and black tea (57).

Sources and replay notes are recorded in `supabase/research/member-fixes-2026-10-09/`, `capsules-2026-10-09/` and `zill-2026-10-09/`. Manufacturer photography remains at its publisher with `source_linked` provenance; it does not assert a redistribution licence. No generated substitute product images, new AI provider or paid service are introduced.

## Validation and limits

Root lint, TypeScript and all 201 Vitest tests, 31 recommendation checks, 37 brew-outcome checks and nine dependency/CSS regressions pass. Mobile TypeScript, behavior checks, shared-core parity and all 36 security regressions pass. Installed tooling backport verification and the mobile audit gate pass; raw npm audit continues to flag the two already verified backported packages and is not described as clean. All three platform exports compile with source maps and exclude the patched build-only dependencies.

Browser validation uses isolated account/catalog fixtures. The web build passes; 28 desktop/narrow Chromium smoke scenarios pass locally. Local WebKit is unavailable, and online Expo dependency metadata timed out at the workspace proxy; CI verifies these checks in its browser image. The complete mobile browser suite and remote checks are recorded in the release PR; interrupted local runs are not counted as a full-suite pass.

These checks do not establish physical-device behavior, working remote publisher images on every network, native camera permissions, mail delivery, or a signed release build. Select `main` after merge and the `preview` profile with the production public Supabase variables in Expo to build the new Android APK, following `apps/mobile/README.md`.
