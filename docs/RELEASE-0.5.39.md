# BeanMora 0.5.39 — capsules, xBloom and community publishing

This iOS candidate includes merged changes #105 and #106, together with the
account guidance and earlier fixes already present in 0.5.38.

- Capsule cards show the product image or a labelled capsule illustration.
- xBloom discovery accepts coffee text or a bag photo and brewing preferences.
  Compatible source recipes can be adapted into private drafts. Changes still
  need to be transferred to the device manually; source links open the original.
- Recipe actions use the teal primary style; missing images are distinguished
  from image-loading failures and filtered counts from the full library count.
- Community publishing removes the redundant confirmation checkbox and new-post
  brew attachment selector, preserving existing references in edited posts.
- Story topics and photo/video controls are clearer, including narrow Arabic
  layouts in both themes. Reporting, blocking and moderation remain available.

## Release process and evidence

Source versions are aligned at 0.5.39. The existing BeanMora app identity,
production environment, sdk-57 build image and remote auto-incremented build
numbering are retained. The manual ios-0.5.39 workflow verifies app identity and
configuration, runs the mobile checks, builds iOS and uploads that exact build
ID to App Store Connect. It does not submit the app for public review.

The first release browser run exposed two Settings animation races: deletion
and password tests clicked mounted controls before the modal finished opening.
Both tests now use the existing presentation check shared with language tests.
They still require one click and retain all password/deletion assertions. No
account behavior or security requirement is changed by this test adjustment.

Run the workflow against the exact merged commit after the complete GitHub
quality and mobile checks pass. Record build, upload and Apple processing
receipts separately; source changes alone do not prove any of these outcomes.

## App Review preparation

Apple requested a physical-device recording beginning at app launch and showing
registration, sign-in, deletion of a disposable account, reporting and blocking.
The older supplementary recording does not establish those checks on 0.5.39.
Capture the new candidate and verify iPhone/iPad behavior before resubmission.

In the existing App Store Connect app (6819935215), select the processed candidate
and verify saved version metadata, review notes, screenshots, privacy/support
links and the outstanding reviewer questions. Content-rights claims must match
the owner's actual permissions. Any required Apple Developer agreement must be
accepted by the account holder. Store credentials and private recordings outside
the public repository. Build/upload success is not App Review approval.
