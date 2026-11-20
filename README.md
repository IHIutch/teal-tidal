# Teal Tidal

A small TypeScript + atcute Chrome extension that tracks TIDAL web playback
and writes listens directly to your Bluesky account for teal.fm. No backend
or Last.fm account. This is an independent MVP.

## Try it

Requires Node.js 22.18+, 24.11+, or 26+, and Chrome / Chromium 120+.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `dist/`.
3. Open the extension and connect with your full Bluesky handle and a new
   [app password](https://bsky.app/settings/app-passwords).
4. Open or reload [TIDAL](https://tidal.com) and play a track.
5. Check the popup for playback progress, pending listens, and the last submission.

Reload TIDAL after updating the extension. **Disconnect** stops tracking and
clears pending listens. Already published listens remain in your account.

## How it works

`src/` contains the extension source and assets. `tsdown.config.ts` builds them
into `dist/`. The extension reads TIDAL's player once per second and counts
observed playback, excluding pauses, obvious seeks, and long sampling gaps.

Qualifying listens are saved locally, then submitted as `fm.teal.feed.play`
records. Failed submissions retry once a minute or with **Retry pending listens**.
Retries keep the same record ID to avoid duplicate records. One TIDAL tab is
tracked at a time; atcute handles session refresh and the account's PDS endpoint.

## Privacy and limits

- Published listening history is public. The app password is never saved;
  session tokens are stored locally and kept out of the TIDAL content script.
- TIDAL web player and Bluesky login only. No native Mac app or other PDS login UI.
- Tracks below two minutes need their entire duration credited. Missing their
  beginning or final sample can prevent submission. Browser throttling can also
  undercount listening time. This prototype does not guess missing playback.
- TIDAL's player layout and Teal's schema may change. Some older Teal viewers
  only read the legacy collection and may not show these records.
- Live TIDAL playback and live account publication still need a manual trial.

## Check

`npm run check` runs TypeScript checks, tests, and the build. Tests use player
fixtures and a mocked PDS; they do not publish to a real account.
