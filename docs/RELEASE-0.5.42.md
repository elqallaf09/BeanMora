# BeanMora 0.5.42

The native community feed had no direct report controls for posts or comments. Members can now open the content's options to submit a reason to the existing moderation queue or confirm a block. Guests are asked to sign in. Own content retains its existing edit/delete controls.

Reports retain a single id during retries and verify a committed write after an uncertain response. Blocking is confirmed by reading the member's own block record; blocked authors' posts and comments are removed immediately and excluded when the feed reloads. Unblocking remains available in Settings. Public recipes are unchanged.

This candidate also includes the 0.5.41 fix for an iOS modal left above the home screen after account deletion. Build 37 was uploaded to TestFlight and installed on a physical iPad, but the complete account/report/block retest was not completed. Do not describe earlier videos as completed validation of this candidate.

Validation: mobile TypeScript, the mobile regression suite (including 3,214 registered messages in six translation packs), and all 20 community browser tests passed. New cases cover a failed report and a committed-but-lost response, Arabic comment targets on a tablet viewport, guest sign-in gating, block cancellation, and hidden content after reload. The earlier 15 account browser tests passed for the retained deletion fix.

Final signed-build tests and physical-device videos must be completed before App Review resubmission. No external publisher images, recipes, logo, or login background are changed by this release.
