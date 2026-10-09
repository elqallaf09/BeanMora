# BeanMora 0.5.24 — compact navigation, message actions and immediate stories

Source version 0.5.24 uses Android versionCode 35 and iOS buildNumber 17. EAS owns the remote build counters. Existing profile styling, bottom navigation and catalog photographs are retained.

## Requested changes

| Request | Result |
| --- | --- |
| 1. Account tabs | Equipment, coffee, recipes, posts and More fit on one compact row. Additional sections are expanded by default below that row. |
| 2. Private-message actions | Each message has an options menu. Senders can edit text/shared-post commentary or delete their message; recipients can block the other account. Audio can be deleted but cannot be edited. |
| 3. My messages | An accessible inbox icon opens messages from the top header on account and community screens. |
| 4. Confirm clearing/deletion | Equipment comparison selection, owned equipment, posts, post media and unsaved post/story drafts require confirmation. Cancel preserves the selection or draft. |
| 5. Story viewing/publication | Stories publish immediately for 24 hours from submission and open fullscreen with progress, tap/swipe navigation, pause and video playback. Confirmed off-topic content is removed and sends a warning; repetition suspends participation and messaging. |
| 6. My story | A circular camera icon with a small add badge replaces the text button. |
| 7. Oversized menus | Selection dialogs are bounded to 360 px; coffee shortcuts use a compact two-column menu bounded to 390 px. |
| 8. Coffee View all | Home coffee picks open the coffee catalog, preserving a coffee-only destination rather than global search results. |
| 9. Automatic picks | Coffee and equipment advance every three seconds with a fade/slide transition. Manual Other tools and Pause/Resume controls are removed. Rotation uses cached data, pauses in the background or during equipment focus/touch, and respects reduced motion. |
| 10. Method arrow | The compact dropdown trigger is alongside the method tabs on the same row. |
| 11. Expose library actions | All 11 former More items are available directly in the compact wrapping library navigation. |

## Database rollout

`20261009210146_immediate_stories_and_direct_message_editing.sql` is additive and has been applied to the BeanMora project. Message updates grant only the `body` column to authenticated members. RLS restricts updates to the sender's unexpired text/shared-post message; the server stamps `edited_at` without changing creation time, expiry, conversation, sender or media identity. Deletes verify the returned ID before removing local content. Voice-file removal follows a verified message deletion.

The story insert trigger publishes even submissions from older clients that still send `pending`. The server assigns creation/expiry and clears any forged review fields. Existing pending stories from active members are published for 24 hours. Reviewers can inspect unreviewed published stories and open story reports, including reports on previously approved stories. Approval never extends expiry. Only a confirmed moderator rejection issues a strike, and repeated review cannot duplicate that strike. A report alone cannot warn or suspend an account.

## Verification and delivery

Root lint, TypeScript, the 219-test unit suite, recommendation checks and brew-outcome checks pass. Mobile shared-core parity, behavior checks and TypeScript pass. Android, iOS and web exports compile successfully. Database role tests pass after rollout, including sender/recipient/guest boundaries, forbidden metadata edits, blank/expired/audio edits, immutable message expiry, immediate public stories, preserved story expiry during review, warnings and repeat suspension. Security advisors report no new notices or errors relative to the pre-migration baseline.

The 142 browser scenarios are validated across a broad run and targeted reruns after updating former More/pause-control assumptions. Coverage includes Arabic/English, light/dark appearance, narrow phone and tablet layouts, automatic cached rotation, compact direct navigation, media/draft cancellation, message editing failures, deletion and blocking, fullscreen story deletion, and actual video autoplay/pause/resume/end. These checks exercise React Native Web; they do not establish physical-device behavior. A new native build is required for installed applications to receive these UI changes. No signed APK or iOS archive is produced by the export checks.
