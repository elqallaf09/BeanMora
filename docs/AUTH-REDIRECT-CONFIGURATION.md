# BeanMora hosted and native authentication

The deployed web application is `apps/mobile`, hosted at
`https://beanmora-mobile.expo.app/` by Expo Hosting. The repository's root
Next.js application and THE SFM deployment are not this application's web host.

## Required Supabase settings

For project `ubvzdglrwkkuaigmkjap`, set **Authentication → URL Configuration**:

- **Site URL:** `https://beanmora-mobile.expo.app/`
- **Redirect URLs:** retain other valid app/preview entries and include these exact URLs:
  - `https://beanmora-mobile.expo.app/` — canonical web callback.
  - `https://beanmora-mobile.expo.app` — compatibility with existing web releases.
  - `beanmora://auth` — installed iOS and Android PKCE callback.

The app constructs web callback URLs from the current page's origin, using a
trailing slash and omitting paths, query strings and fragments. Its PKCE verifier
is stored on that origin. A preview deployment therefore needs its own narrowly
scoped redirect allow-list entry; sending it to production would lose access to
the verifier. Native callbacks remain `beanmora://auth`.

The app explicitly supplies the redirect for Google/Apple sign-in, signup
confirmation, password reset, and email change. A `localhost` callback from the
hosted app still requires a server configuration correction; changing client
code cannot authorize a destination rejected by Supabase. On hosted callbacks,
the app removes auth codes and error/token parameters after processing, including
failed or cancelled sign-ins. Password recovery is determined by the verified
PKCE exchange result, not by a query-string `type` flag.

Run the read-only routing check from `apps/mobile`:

```sh
node scripts/check-auth-redirect.mjs \
  --project-url https://ubvzdglrwkkuaigmkjap.supabase.co \
  --web-url https://beanmora-mobile.expo.app/
```

The check submits deliberately invalid verification tokens. It sends no email,
creates no user/session, prints no credentials, and does not follow redirects.
It checks both web URL forms and the native callback. A pass establishes redirect
routing only; real Google login, confirmation mail and recovery must still be
verified on the deployed browser and installed app.

## Google name and consent screen

Configure **Google Auth Platform → Branding** on the Google Cloud project that
owns the OAuth client configured in this Supabase project:

- App name: `BeanMora`.
- App logo: BeanMora's existing approved logo.
- Home page: `https://beanmora-mobile.expo.app/`.
- Supply the application's actual published privacy/terms pages and support
  contact, and complete any brand verification Google requires.

The Google OAuth web client's authorized JavaScript origin is
`https://beanmora-mobile.expo.app`. Its authorized redirect URI remains
`https://ubvzdglrwkkuaigmkjap.supabase.co/auth/v1/callback`; the subsequent
Supabase-to-app redirect is configured separately above. A frontend button label
does not change Google's consent screen. Brand verification may take several
business days. Supabase also documents custom auth domains as another branding
option; this fix does not provision or purchase one.

## References

- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google login and consent branding](https://supabase.com/docs/guides/auth/social-login/auth-google)
