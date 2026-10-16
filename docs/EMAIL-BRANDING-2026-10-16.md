# BeanMora confirmation email branding

The confirmation email follows the owner's selected cream, copper and teal
reference: the existing BeanMora emblem, a warm coffee photograph, a readable
confirmation heading, a live teal confirmation button and a compact help footer.
Text remains selectable HTML when remote images are blocked. The real app inbox
is `beanmora.app@gmail.com`; the reference's illustrative domain and social
accounts are not published as working destinations.

The eight existing account-language branches are retained, with Arabic as the
fallback. The fixed application origin and `TokenHash` fragment link continue to
use the existing explicit-click, cross-browser confirmation flow. No email proof,
user identity, or credential is placed in an image URL or support link.

## Photograph provenance

`apps/mobile/public/beanmora-auth-coffee-v1.jpg` is a decorative generated image,
not a product or coffee-origin claim. It was generated with the built-in image
tool from the owner's chosen email reference, then exported to JPEG without
changing its geometry (2172 × 724, approximately 151 KiB).

Final prompt: recreate only the selected banner's warm photograph, with a beige
ceramic cappuccino and leaf latte art, saucer, sunlit wooden table, scattered
coffee beans, cream background and a softly blurred green plant on the right;
wide 3:1 composition, cup fully visible in the right center, and no text, logos,
email interface, borders or watermark.

The photo is served from an immutable revision of the existing public repository.
This requires no new public bucket, storage policies, SMTP credentials, paid
provider, application dependency or app binary. The existing app emblem is served from the same immutable revision without
altering it. A future web export also includes the photograph.

## Verification

The focused authentication tests cover confirmed user/session verification,
single-use handling, retry after network failure, rejected foreign callback
origins/types, and localized error reasons. The live read-only redirect probe
checks both web URL forms and the installed app callback using invalid tokens;
it does not send mail or create a user. Template checks cover all eight locale
branches and fixed confirmation links.

- All 1,397 root-project unit, recommendation and brew-outcome tests passed.
- All three live redirect targets passed with HTTP 303 and the expected origin.
- Both immutable public image URLs returned HTTP 200 with the expected image
  MIME types; the photograph's downloaded SHA-256 matched the repository file.
- The new production template was saved through the Supabase dashboard, then
  reloaded and copied back from the editor. Its complete text exactly matched
  the repository template, with eight dynamic token placeholders and no fixture
  token. The existing email subject was retained.
- [Arabic body preview](assets/confirmation-email-preview.jpg) shows the heading
  and live HTML button in the dashboard. The dashboard preview did not display
  remote images in this session; their availability was checked independently.
  This is a preview, not evidence of a newly delivered email. No email was sent
  and no production user was created for this design change.

Changing the Google account's sender photo is a separate account operation.
The email body cannot change that account photo. This change does not modify
Google account settings or promise inbox placement.
