# Release verification

Candidate: 0.1.0. Checked November 21, 2026.

- `npm run package`: TypeScript, all 15 tests, production build, required packaged
  assets, archive root layout, and SHA-256 generation passed.
- Built-worker integration test passed. It covers sign-in, local preview without
  sign-in, failed writes, persisted state across worker restart, same-record-ID
  retries, account-bound queues, credential isolation, and short-track transitions.
- Clean unpacked installation in Brave succeeded without manifest errors. The
  signed-out popup rendered and detected actual TIDAL metadata and playback.
- The existing connected installation retained its session after reload and
  published "Is U" by Overmono with the narrowed host permissions. Pending was zero.
- A complete 81-second "Alap" by Four Tet published at the next-track transition.
  Pending returned to zero. Playback was paused after the test.
- Store screenshot comes from the real connected extension, cropped to the
  extension content and resized to 1280×800. It contains no browser tabs or tokens.

Fresh app-password entry was previously verified live; this release check reused
the existing session. Auth/token-refresh and offline/restart paths were tested
with mocked responses, rather than intentionally interrupting the user's network
or closing their browser. This does not assert that every Chrome/Brave version,
TIDAL account, or background-throttling scenario has been exercised.

Store assets: `src/icons/icon-128.png`, `store/screenshot-listening.png`, and
`store/promo-tile.png`. Listing and reviewer instructions: `store/listing.md`.
No developer registration or Chrome Web Store submission has been performed.
