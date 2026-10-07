# BeanMora 0.5.15 — catalog, language and member contributions

Date: 2026-10-07. iOS build 9; Android versionCode 25.

## Member profiles and community extension

Implemented in web and native source: searchable registered-member directory, public username routes, equipment/coffee/recipes/account favorites/comments, follower and following lists, private accounts with owner-approved follow requests, and extraction/coffee-corner photos. Community navigation uses the application brand. Existing device-only recipe saves remain distinct from the new account favorites.

Equipment, coffee and favorites are shared only after the owner enables collection sharing. Private account contents require an accepted follower or the owner; name and username remain searchable. Gallery media stays in a private bucket and is signed only after authorization. Directory pages load 24 members at a time; profile sections currently show the latest 100 entries. Manual/automatic equipment details use available reviewed catalog facts.

The base social migration `20261007145444_member_profiles_privacy_and_gallery.sql` was applied. The forward migration `20261007152000_require_member_for_private_profile_access.sql` is NOT confirmed applied: it prevents historical anonymous follow rows from unlocking private profiles. The rollback-only `supabase/tests/member-social.sql` is NOT confirmed passing. Its first run exposed a test-variable ambiguity, which was fixed; subsequent Supabase connector calls stalled and were aborted. Do not release or merge this extension until the forward migration and database privacy tests complete successfully.

Local focused native browser tests passed for username search, pending private follow requests, hidden collections, owner-bound privacy updates, request approval and coffee-corner image upload. Web/native typechecks and lint passed. These fixture tests do not establish live database authorization correctness. No new IPA, APK, TestFlight submission or store publication is claimed by this extension.

## Requested behavior

1. Switching language preserves the selected coffee, equipment or recipe and the native detail/back stack. Web switching retains the entity path, query and fragment. Bilingual cached entities use a new cache version so older payloads do not retain stale language.
2. Registered members can submit recipes or coffee with a selected photo, HTTPS source/product/roaster links and the relevant detailed fields. Supabase anonymous sessions cannot create either, including recipe drafts. Private recipes appear under My submitted recipes. Coffee submissions appear in the owner's bags immediately and remain unpublished pending review.
3. Arabic names use shared reviewed mappings with a proper-name fallback. Public recipe steps and missing bean descriptions now have Arabic text; equipment facts use one bilingual label set. Member-authored text remains in the language the member supplied.
4. Uploaded images are owner-scoped in the private `member-media` bucket, limited to JPEG/PNG/WebP and 5 MiB. Public reads require an exact link from an eligible visible parent. Canonical references are signed only for authorized reads. Missing/broken coffee images use the existing BeanMora illustration, visibly identified as illustrative in native UI; recipes retain method artwork/fallbacks.
5. My Bags and My Equipment have confirmed soft removal that preserves brew history. Native removal supports undo; errors retain the item. Writes bind owner and row ID and require confirmation of an affected row.
6. A bilingual capsule directory distinguishes Original, Vertuo, classic Dolce Gusto, Lavazza A Modo Mio, Lavazza BLUE and illy iperEspresso. Links go to official stores. Compatibility and delivery-region caveats are explicit; no current stock or price is invented.
7. Navigation, brewing-method controls and inventory filters wrap at narrow widths. Secondary actions are under More. Minimum control sizes remain usable; content carousels are separate from navigation controls.
8. Recipe discovery searches bound database search documents, including coffee and roaster fields. Related matching coffee/roasters are visible alongside recipes. Added Rawi/Rawee and Jebla/Jabla Arabic/English aliases and source-backed Rawi Alba and Jebla Romario records. No numeric recipe was invented for either roaster: an absent published matching recipe remains clearly absent.

## Database changes

Applied to the connected BeanMora project, with migration timestamps matching the server:

- `20261007134908_member_catalog_contributions.sql`
- `20261007135207_catalog_locale_and_kuwait_roasters.sql`
- `20261007141245_complete_arabic_bean_descriptions.sql`

Both submission RPCs run as invoker, use the authenticated owner, commit related rows atomically and retry with one stable UUID. Image upload retries keep the same image/path. Server validation and RLS remain authoritative. The restrictive insert policies reject anonymous sessions even through direct REST calls.

Rollback-only SQL tests cover anonymous rejection, member success, cross-owner isolation, invalid URLs, atomic failure, idempotency, private/public media and owner-scoped inventory removal. `member_contributions.sql` and the updated `guest_access_control.sql` passed. No real user was deleted or used as a fixture.

Final data checks: zero public recipe steps with missing Arabic title/description, zero populated public recipe notes missing Arabic, and zero published reviewed English bean descriptions missing Arabic.

## Verification

Local checks: web unit/recommendation/outcome suite (214 tests), security regressions (9), lint/typecheck, native typecheck/behavior suite, Next production build and iOS/Android/Web Expo exports. New browser scenarios verify in-place translation, 320 px layout, anonymous submission guard, member image upload, retry without duplication, inventory failure/removal/undo and web entity/query/fragment preservation. Existing native navigation/search tests were updated for the intentional More menu and revised related-roaster caption.

Final full browser counts and release build status are established by the PR's GitHub Actions jobs and EAS build, not by this source file. Local WebKit could not launch because host libraries were missing; CI installs its own browser dependencies. A local Expo online compatibility check timed out at the proxy; the CI gate remains enabled.

## Official research sources

Verified 2026-10-07; order availability and delivery depend on the destination shown by each store:

- https://rawicoffee.com/shop/
- https://rawicoffee.com/shop/القهوة/حبوب-القهوة/ألبا-250-جرام/
- https://jeblacoffeeroasters.com/ar
- https://jeblacoffeeroasters.com/ar/products/روماريو-برازيل?variant=51064934301970
- https://www.nespresso.com/kw/en/coffee-capsules/original
- https://www.nespresso.com/kw/en/coffee-capsules/vertuo
- https://www.nespresso.com/kw/en/faqs
- https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks
- https://www.dolcegusto-me.com/ndg_mena_en/faqs-en
- https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio
- https://www.lavazza.com/en/coffee-capsules-pods/blue
- https://www.illy.com/en-us/eshop/coffee/iperespresso-espresso-capsules/iperespresso-coffee-capsules-classico-lungo-medium-roast/8845ST

## Release and operational limits

A successful bundle or EAS build is not a TestFlight upload, App Store publication or a physical-device test. Android builds remain subject to the existing EAS quota; no billing upgrade is authorized or performed. Existing account/provider tasks from 0.5.14 (Apple provider, leaked-password protection, actual mail/device verification) and the two expiring upstream build-tool advisory exceptions remain open. Do not broaden or extend those exceptions to make a gate pass. The new image-picker plugin requests selected-photo access; camera and microphone permissions are disabled.

Keep the new database ownership policies and private media bucket when rolling back presentation code. Do not make media public to work around a rendering failure. Archived inventory retains history and can be restored by the owner.
