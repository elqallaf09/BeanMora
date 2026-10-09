# verify-direct-audio

Authenticated POST validates a private `owner/conversation/message.m4a|webm` upload before it can be attached to a direct message. It checks a non-anonymous user, conversation access, recipient preferences/blocks, ownership and download access, then measures actual AAC/Opus duration with a strict 60-second maximum. A service-only proof ties the result to the immutable Storage object and its hash. A client-supplied duration is insufficient.

Deploy with `verify_jwt: false`: the function validates the bearer token through `auth.getUser()` before file access. This permits the project's current JWT signing configuration without delegating authorization to the gateway. Supabase supplies the URL, anonymous key and service key; no additional paid provider or client-visible secret is required.

The shared duration tests cover AAC movie/media/sample timing, AAC frame counts, Opus packet duration and block timelines. Unknown formats, video-only tracks, malformed data and audio over the limit fail closed. The mobile recorder stops at 59.5 seconds to leave encoding margin. Test fixtures contain synthetic audio, not member recordings.
