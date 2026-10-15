# BeanMora contact and report email

Date: 2026-10-15

## Temporary owner-approved inbox

`elqallaf09@gmail.com` is the public destination for support, technical issues,
content/user reports and privacy/account requests until an official inbox exists.
The user explicitly approved displaying this address. No Gmail password, SMTP
credential, paid email provider or new runtime dependency is required.

## User experience

- Settings > Contact us is available to signed-in users and guests.
- The same contact section appears within the privacy and terms documents.
- Four labeled actions open localized email drafts addressed only to this inbox.
- Users must review the draft and press Send in their email application. Opening
  a draft is NOT a delivery receipt, and the UI never says the message was sent.
- The address remains selectable if no email application can be opened.
- Reports ask for a username/content link or ID, reason and optional screenshot.
  Users are warned not to share passwords, verification codes or payment data.
- No account/session data, private messages, telemetry or attachments are added
  automatically. This does not add server forwarding of existing database reports.
- Arabic, English, Japanese, French, Italian, Spanish, Brazilian Portuguese and
  Simplified Chinese are included. The existing theme wrappers preserve dark mode.

## Single source and public support page

`apps/mobile/src/support-mail.ts` holds the inbox, topics and localized copy.
`node scripts/generate-support-page.mjs` generates `apps/mobile/public/support.html`
from that source without scripts or external assets. Generation runs in postinstall
and preexport, including builds that export directly after installing dependencies.
The generated file is ignored by git; it is not a second editable email source.

After a successful web deployment, verify `/support.html` on the actual BeanMora
Expo Hosting origin before entering it as the App Store Support URL. This source
change alone is not evidence that the page is live or App Store metadata was saved.

To change the inbox later, update SUPPORT_EMAIL and its recipient regression test,
regenerate/export the page and release updated native/web builds. Do not rename the
Apple app, Expo project or bundle ID for an email change.

## Verification and release boundary

Local Node 22 regression suite: 10 tests passed. It covers all 32 locale/topic
combinations, recipient/header safety, Unicode encoding, no-mail-app failures,
guests' settings access, legal-document access and all 40 generated page links.
The suite runs in the existing npm test pipeline. Full TypeScript, security,
Expo export and browser checks must also pass in repository CI before release.

No physical iPhone/Android email-client test or inbox-delivery test was performed.
No email was sent, App Store submission made, or production deployment performed
by the local test run. Already-built binaries do not acquire this source change;
they need a release containing this commit.
