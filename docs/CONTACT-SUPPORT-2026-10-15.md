# BeanMora contact and report email

Date: 2026-10-15

## Owner-approved app inbox

`Beanmora.app@gmail.com` is the public destination for support, technical issues,
content/user reports and privacy/account requests. The owner supplied this app
inbox after the initial temporary-address implementation. No Gmail password, SMTP
credential, paid email provider or new runtime dependency is required. This does
not change the owner's login address or configure outgoing authentication email.

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

## Compact public support page

`apps/mobile/src/support-mail.ts` holds the inbox, topics and localized contact copy.
`node scripts/generate-support-page.mjs` generates `apps/mobile/public/support.html`.
Generation runs in postinstall and preexport. The generated file is ignored by git;
edit the generator and shared contact source rather than the generated HTML.

The page displays one language panel, a small language selector, four contact tiles
in a two-column grid, a visible address with a copy button, and collapsed additional
instructions. Arabic uses RTL; the other supported languages use LTR. The page has
light and dark appearances and no external assets, fonts, tracking or network calls.
A build-time SHA-256 CSP permits only the exact inline script and stylesheet; no
unsafe-inline or unsafe-eval allowance is used. With JavaScript disabled, the Arabic
contact panel and all its email links remain visible and usable.

Language precedence: supported `?lang=` or legacy language hash, saved support-page
preference, supported browser language, then Arabic. A language change is immediate
and resets expanded instructions. Storage/history failures are nonfatal. Copying
uses the clipboard when available; on failure it selects the address and displays a
manual-copy instruction, never a false copied or sent message.

After a successful web deployment, verify `/support.html` on the actual BeanMora
Expo Hosting origin before entering it as the App Store Support URL. This source
change alone is not evidence that the page is live or App Store metadata was saved.

To change the inbox later, update SUPPORT_EMAIL and its recipient regression test,
regenerate/export the page and release updated native/web builds. Do not rename the
Apple app, Expo project or bundle ID for an email change.

## Verification and release boundary

Local Node 22.16.0 regression suite: 14 tests passed, 0 failed, 0 skipped. Coverage
includes all 32 locale/topic combinations, recipient/header safety, Unicode encoding,
no-mail-app failures, guest and legal contact entry points, all 40 generated mailto
links, absence of the retired address in the page, exact CSP hashes, compact markup,
language precedence, malformed URL input and blocked storage. The existing npm test
pipeline runs these tests; full application CI must pass separately before release.

Local Chromium rendered the exact HTML through Playwright set_content without CSP
bypass: 80 layout cases passed (8 languages x 2 appearances x 5 viewport widths:
320, 390, 430, 768, 1280). Tests verified one visible panel, correct direction, no
horizontal overflow, the new recipient, disclosure reset, mocked clipboard success
and failure, and the JavaScript-disabled fallback. No console/CSP errors or network
requests occurred. Local runtime policy blocked HTTP/file navigation, so hosted URL
navigation, actual browser persistence, Safari and physical devices need release QA.

No physical iPhone/Android email-client test or inbox-delivery test was performed.
No email was sent, App Store submission made, or production deployment performed
by the local test run. Already-built binaries do not acquire this source change;
they need a release containing this commit.
