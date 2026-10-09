# BeanMora 0.5.23 — social profile, 24-hour messages and coffee stories

Source version 0.5.23 uses Android versionCode 34 and iOS buildNumber 16; EAS manages the remote build counters. This release retains the selected account mockup 01 and mockup 7 underline navigation.

## Profile and posts

- The ivory/teal wave cover, overlapping avatar, compact Edit action, horizontal collection summaries and actual equipment/coffee photographs adapt to light/dark appearance and narrow screens. Equipment, coffee, recipes and posts are the four main tabs; additional sections remain under More. Security, sign-out and account deletion stay in Settings. coffeeHO remains centered in the bottom navigation.
- The owner can load all their posts, including private posts, through pagination. Visitors receive only accessible public posts. Authors can edit and delete their posts. Editing text preserves existing photographs and linked brew/roast facts unless the author explicitly replaces or removes the media.
- A post can be a topic, photo or video. Brewing is optional; there is no fixed Espresso label. A linked brewing method is shown only when supplied by the actual post/recipe.
- Extraction and coffee-corner photographs support caption/section editing, photo replacement and confirmed deletion. Upload/save failures keep the draft available for retry.

## Direct messages and sharing

- Recipient preferences are Everyone, accepted Followers or Off. Every new send rechecks both members' blocks, the recipient preference and active membership. Changing a preference does not remove unexpired conversation history.
- Text, shared posts and voice messages expire exactly 24 hours after the server records the send. Clients cannot choose or extend this timestamp. Database policies hide expired messages immediately, and the open conversation removes them as the deadline passes. Voice links are short-lived and bounded by the remaining message lifetime.
- An active Cron job runs every five minutes to delete expired message rows and their private voice files through the Storage API. A private queue supports retries; physical deletion can lag by the scheduling interval or a service outage. Unsent voice uploads also expire after 24 hours. Account deletion first removes the authenticated owner's expired voice files.
- Recording stops at 59.5 seconds to leave encoding margin below the strict 60-second server limit. Audio is previewed and sent explicitly; backgrounding or leaving the recorder stops it. The server checks actual AAC/Opus tracks, sample/packet timing and object identity before permitting attachment. Forged duration claims and unsupported/non-audio files are rejected. Failed sends reuse their message ID to avoid duplicates.
- Sharing offers a DM recipient or the device share sheet. External links use the installed app's `beanmora://post/<uuid>` route and preserve access checks. There is no invented public web domain. Deleted or inaccessible posts show an unavailable state.

## Coffee stories

Photo/video stories require a coffee, brewing, equipment or coffee-corner topic and an ownership confirmation. Camera capture and media preview are available. New stories remain pending until an authorized human reviewer approves them; approved stories are publicly visible for 24 hours from approval. The author can see review history and delete their stories.

Settings exposes the review queue only to the dedicated reviewer capability. A confirmed off-topic rejection creates the first warning notification; a second confirmed rejection suspends community participation and messaging. Reports alone do not trigger a ban. Review decisions are idempotent. No paid classifier or automatic image understanding is claimed.

## Backend rollout

Nine additive migrations introduce protected conversations, preferences, messages, stories, moderation and owned-media updates, plus expiry and cleanup. The `verify-direct-audio` and `purge-direct-messages` Edge Functions validate their own authenticated requests before acting. Their gateway JWT setting is disabled intentionally because authorization is implemented inside each function. No server key is shipped to the app.

The cleanup schedule uses a narrowly scoped random token held in Vault and the project URL configured for that environment. The internal `net` schema is not exposed through the Data API. Database role tests cover participants, strangers, anonymous sessions, followers, blocks, disabled messages, expiry, forged voice metadata, owned media, warnings and suspensions. Test transactions roll back; no fixture accounts remain. Unauthenticated function calls return 401, and scheduled cleanup calls returned 200 during verification.

## Validation and delivery limits

Root lint, TypeScript and the 219-test root suite pass. Mobile shared-core parity, behavior checks, TypeScript, dependency checks, all three Expo exports and runtime bundle audits pass. The 135-test browser suite includes 12 social scenarios covering failed-save retries, post and gallery editing/deletion, sharing, preferences, expiry, recording, owner review, pagination, Arabic and dark mode.

Synthetic AAC/Opus files exercise actual encoded durations, including rejection above 60 seconds. WebM video playback is tested in Chromium; the CI Chromium build has no H.264 decoder, so MP4 coverage verifies upload and either playback or a clear unsupported-codec state. Browser checks do not establish physical-device behavior. No signed APK or iOS archive is produced by these checks; installed apps require a new native build for the audio/video modules and this release.
