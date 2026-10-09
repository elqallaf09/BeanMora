# BeanMora 0.5.25 — profile bio, country identity and initial Japanese

Source version 0.5.25 uses Android versionCode 36 and iOS buildNumber 18. EAS manages remote build counters.

## Changes

- Profile headers expose Add/Edit bio directly. The existing 2,000-character editor includes a counter, and long mobile bios can expand or collapse.
- Email signup collects country, username, email, password and international phone number. Username availability is checked before signup; database uniqueness remains authoritative. Arabic, Persian and fullwidth phone digits normalize to international form. Existing login, OAuth and anonymous access continue to work.
- The selected country's flag appears immediately beside the username on mobile and web profiles. Settings can change country and private phone; mobile refreshes the profile after a confirmed save. Countries are selected explicitly from 249 ISO regions, with searchable Arabic/English/Japanese names. Existing accounts without a valid selected country show no guessed flag.
- Japanese is available in mobile Settings and survives restart. Initial translations cover primary navigation, home, signup, settings, profile and core brewing copy. Catalog, community and knowledge content retain their source language, using the existing English fallback where needed; the Japanese settings note explains this initial scope. Legal documents currently remain Arabic/English. The Next.js web routes remain Arabic/English.

Phone numbers stay in the owner's Auth metadata, never public profile columns, member RPC projections or directory results. Phone collection does not establish number verification or enable SMS sign-in. Settings confirm both the saved contact and public country, preserve failed inputs for retry, and only refresh the flag after confirmed persistence.

## Database rollout

`20261009230336_profile_country_and_japanese_signup.sql` is applied to the BeanMora project and matches its migration history. It permits the Japanese locale, validates changed country/phone metadata, seeds signup countries, and mirrors country changes to the owning profile. Unrelated metadata updates do not overwrite country; unchanged legacy metadata does not block existing accounts. Trigger functions cannot be invoked as public client RPCs. The existing member-profile allowlist adds only country and preserves its privacy rules.

The isolated database tests roll back all fixtures. Signup metadata, Japanese locale, country synchronization, bio ownership, private-contact boundaries, guest access, access hardening, member-profile privacy and community behavior pass. Security advisors show no new notices against the pre-rollout baseline.

## Verification and delivery

Root lint, TypeScript, 225 unit tests, recommendation and brew-outcome checks pass. Mobile TypeScript, shared-core parity and behavior checks pass. Android, iOS and web exports compile. Eleven targeted browser scenarios pass for signup, validation, persistence, country-flag updates, bio editing, private contact, connection failure/retry and existing authentication flows. The 28 local Chromium web smoke scenarios pass, including narrow screens and public profile flags; local WebKit lacks host libraries and is covered by the configured CI browser image.

CI enforces the complete mobile browser suite and all three web smoke projects before merge. Browser checks exercise web previews, not physical devices. Installed applications require a new native build; these source/export checks do not produce a signed APK or iOS archive.
