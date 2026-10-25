# Native sign-in fails before opening Google

The reported Android app is 0.5.36 (43). At 18:36 Kuwait on October 25,
read-only Auth/edge logs show four successful native `/settings` requests and
no `/authorize` request. This places the observed failure before the Google
authorization request, rather than establishing a rejected Google credential.

`getAuthRedirect()` evaluated `window.location.href` as an argument before
checking the platform in `authRedirectForPlatform()`. React Native initializes
`window` as the global object, without a browser `location`. The argument
evaluation therefore throws `Cannot read properties of undefined (reading
'href')`. The social-sign-in catch displayed the generic update-app message.
The same helper is also used for signup and password recovery.

Return the native `beanmora://auth` redirect before reading any browser
location. Web still derives the redirect from its own origin and retains the
existing invalid-origin checks. No provider, credential, PKCE, session-storage
or Supabase configuration changes are required for this correction.

The new runtime regression loads the actual platform wrapper as well as its
shared helper. It failed on unmodified main with the exact TypeError and
passed after the fix. It covers Android and iOS with React Native's window
shape, an absent window and a location getter that must never be called;
production/preview/local web origins; and rejected invalid web origins.
It is included in `npm test` so exports and browser-only tests cannot silently
miss this native branch again.

These controlled tests do not establish a completed physical-device Google
sign-in. Installed native binaries need a new build to receive this change.
