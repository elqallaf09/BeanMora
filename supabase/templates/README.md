# BeanMora signup confirmation

`confirmation.html` and `confirmation-subject.txt` are the hosted Supabase
**Confirm sign up** template for project `ubvzdglrwkkuaigmkjap`.
Changing this repository alone does not update the hosted template.

Deploy the matching mobile web application and `/beanmora-auth-logo.png` at
`https://beanmora-mobile.expo.app/` **before** applying this template in
Supabase Authentication → Emails → Confirm sign up. Read back the saved
subject/body and preview after saving. Do not change the SMTP transport,
confirmation requirement, OAuth PKCE settings, or other email templates.

The logo is the existing app icon. Content follows signup metadata `language`
for all eight supported locales; absent/unsupported language falls back to
Arabic. The sender display name remains controlled by Supabase's mail transport;
this template does not configure a custom SMTP sender.

The fixed HTTPS link carries `TokenHash` in the fragment, never the query,
and the application removes it from browser history before showing the dialog.
The visitor must press **Confirm email** before `verifyOtp` consumes it. The
server must return both a session and an email-confirmed user before success is
shown. This works without the signup browser's PKCE verifier. OAuth and password
recovery continue using the existing PKCE flow. No URL-controlled redirect or
URL-controlled recovery mode is accepted.

Older, already-sent emails retain their original links. They cannot be rewritten.
A failed legacy PKCE exchange now explains the sign-in failure and opens the
login form; an unconfirmed-email response offers a resend action. Expired/used
proof and network failure have distinct messages. A new email supersedes the old
one according to Supabase's normal OTP behavior.

Observed incident: 2026-10-15 22:27 UTC, `/verify` returned 303 and `/token`
returned 400 with a code-challenge/verifier mismatch. The old application mapped
that error to a generic password/email message. No passwords or email tokens
were captured for diagnosis.

Validation uses isolated Auth responses and fresh browser contexts. It does not
send email to production users or claim physical iPhone/Gmail delivery testing.
