# Teal Tidal

A small Chrome / Chromium extension that tracks TIDAL web player listens and
writes them directly to your AT Protocol account for teal.fm. Built with
TypeScript and [atcute](https://atproto.com/sdks).

No Last.fm account, API subscription, local server, or hosted backend.
This is an independent prototype, not an official TIDAL or teal.fm product.

## Install

Requires Node.js 22.18+, 24.11+, or 26+ to build, and Chrome / Chromium 120+ to run.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this repository's `dist` directory.
3. Open the extension and enter your full Bluesky handle and a new
   [app password](https://bsky.app/settings/app-passwords). Do not use your main password.
4. Click **Connect & start tracking**. This enables automatic publication of
   qualifying listens. Published listening history is public.
5. Open or reload [TIDAL's web player](https://listen.tidal.com) and start listening.
6. Check the popup for the detected track, listening progress, pending count,
   and last submitted title.

Reload TIDAL whenever you reload or update the extension. Keep the same `dist`
directory when updating an unpacked extension so the browser retains its identity
and stored session.

For a non-Bluesky PDS, open **Use another personal data server** and supply the
HTTPS origin used to sign in. atcute reads the account's PDS endpoint from the
login response's DID document and manages session refresh.

## What it does

- Reads track ID, title, artists, album, playback position, and duration from
  TIDAL's footer once per second.
- Credits observed playback progress. Paused time, obvious seeks, and sample gaps
  longer than six seconds do not count.
- Uses Teal's listening threshold: the whole track below two minutes; otherwise
  at least two minutes, increasing to half the track, capped at four minutes.
- Writes `fm.teal.feed.play` records using `@atcute/client` and
  `@atcute/password-session`. IDs use `@atcute/tid`.
- Saves qualifying listens before submission. Retries reuse the same record key
  with `putRecord`, so a lost response does not create another record.
- Retries failed writes with backoff, on the next playback update or a one-minute
  browser alarm. The popup also has a manual retry button.
- Follows one TIDAL tab at a time. A paused, closed, or stale player releases it.

The schema is based on the current upstream
[play lexicon](https://github.com/teal-fm/teal/blob/main/lexicons/fm.teal/feed/play.json)
and [artist definitions](https://github.com/teal-fm/teal/blob/main/lexicons/fm.teal/feed/defs.json).
It does not dual-write to the old `fm.teal.alpha.feed.play` collection. Older
teal viewers may not display current records. Successful PDS publication does
not guarantee when a particular viewer will index them.

## Privacy and permissions

- The app password is used once for login, cleared from the form, and never
  persisted. Access and refresh tokens live in `chrome.storage.local`, restricted
  to trusted extension contexts. Content scripts cannot read that storage.
- Browser storage is not an encrypted vault. Disconnect removes local session
  tokens and pending listens and attempts to invalidate the server session.
  If offline, revoke the app password on your PDS to terminate its access.
- Tracking stops when disconnected or switched off. Turning tracking off also
  pauses submission of pending listens; turning it on resumes retrying.
- There is no analytics, audio recording, page-context script, or remote code.
  Requests go to your login server and PDS. Browser sync is not used.
- The extension requests HTTPS access because AT Protocol accounts can live on
  arbitrary PDS domains. Its content script only runs on the TIDAL web player.
- The local queue has a 1,000-listen limit. At capacity it stops adding listens
  and shows an error. Disconnect deliberately discards pending listens; already
  published records remain in your PDS. Submitted totals and the last submitted
  title remain locally after disconnect.

App-password login keeps this unpacked MVP small. An extension intended for
general distribution should use AT Protocol OAuth with scoped collection access.

## Verification

```sh
npm run check
```

Checks strict TypeScript types, playback and metadata fixtures, retry behavior,
account isolation, atcute requests and token refresh, and an extension message-flow
test with mocked Chrome APIs and a mocked PDS. Then builds the production bundle.
No test publishes to a real account.

Bundling uses the [tsdown](https://tsdown.dev/) CLI and `tsdown.config.ts`.
All extension source and assets live in `src/`. The background worker and popup
use ESM; the content script uses IIFE. Runtime dependencies are bundled, and
tsdown copies the manifest, HTML, CSS, and MIT notices into `dist/`.

## MVP limitations

- TIDAL web player only. No native TIDAL Mac app, Safari, or Firefox build yet.
- Live authenticated TIDAL playback and live PDS publication still need a manual
  smoke test. The fixture uses Web Scrobbler's current TIDAL selectors; TIDAL can
  change those selectors or serve another player layout.
- Metadata missing from the player is not guessed. Missing title, artists,
  duration, position, or track ID means that playback is ignored.
- Tracking starts when the extension first observes the track, not retroactively.
  Very short tracks can be undercounted when the footer switches tracks before
  the final second is sampled. Browser sleep and timer throttling can also
  undercount. The prototype favors avoiding invented listening time.
- Repeats are detected by a near-end-to-start transition. Seeking to the start
  from near the end can look like a repeat. Separate extensions or devices are
  not deduplicated against each other.
- No artwork fetching, MusicBrainz lookup, import, or editing of published listens.
- Teal's record schema is not final and may change.

## Source map

- `src/tidal.ts`: TIDAL footer reader.
- `src/tracker.ts`: pure playback accounting and record mapping.
- `src/atproto.ts`: atcute login and publication.
- `src/queue.ts`: account-bound delivery and retry backoff.
- `src/background.ts`: messages, durable state, scheduling, and account isolation.
- `src/popup.ts`, `src/popup.html`, `src/popup.css`: setup and tracking status.
- `src/manifest.json`: browser extension manifest.
- `tsdown.config.ts`: entry points, bundle formats, and copied assets.

MIT licensed. TIDAL selectors are adapted from Web Scrobbler with attribution in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), copied into `dist/`.
The bundled atcute packages use 0BSD, which does not require retaining notices.
