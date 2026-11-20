# Teal listening eligibility

Researched 2026-11-20 against official source, Git refs, release metadata, and package manifests. Local baseline is `7c2ce07f65d1697814ea5df854dd27a4038d0607`. No implementation changes.

## Finding

Teal's lexicon and Piper's implemented Spotify rule disagree. The local formula is a defensible interpretation of the lexicon, but it does **not** match released Piper. Neither source establishes a universal, executable Teal rule with a 120-second floor.

The [Teal lexicon at GitHub commit `455634384151580947f31b743b689fb8d6d2427e`](https://github.com/teal-fm/teal/blob/455634384151580947f31b743b689fb8d6d2427e/lexicons/fm.teal/feed/play.json) describes full-track listening below two minutes and half-duration listening with a four-minute cap. Its final "whichever is longest" clause is ambiguous. The same description exists in the directly cloned [Tangled snapshot `a033f8ee9625401d7c50663e44bb085899781d32`](https://tangled.org/teal.fm/teal/tree/a033f8ee9625401d7c50663e44bb085899781d32). The schema contains no listened-time field or validation that enforces this prose; duration itself is optional.

Local `threshold(d) = max(min(d,120), min(d/2,240))`, with `listened >= threshold`, means:

- Below 120 seconds, listen for the full duration.
- From 120 through 240 seconds, listen for 120 seconds.
- From 240 through 480 seconds, listen for half the duration.
- Above 480 seconds, listen for 240 seconds.

The 120-second plateau follows from this formula. It is an interpretation of the lexicon's longest-of wording, not a numeric rule independently confirmed by official tracking code. Reading the two-minute condition as an exclusive branch would instead give `d < 120 ? d : min(d/2,240)`. The prose alone does not settle that difference.

## Actual Piper source and releases

Both [Tangled Piper `f2af52b774dc1fb3476ae5b618624e50f90b975e`](https://tangled.org/teal.fm/piper/tree/f2af52b774dc1fb3476ae5b618624e50f90b975e) and [released Piper v0.2.1 Spotify code](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/spotify/spotify.go#L709-L729) compute `max(durationMs/2, 30000)` and require accumulated milliseconds to be **strictly greater**. There is no 120-second floor or 240-second cap. Integer division rounds half-duration down to a millisecond. The [threshold tests](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/spotify/spotify_test.go#L512-L583) explicitly cover the 30-second floor and rejection at the exact threshold.

I fetched and inspected every published tag's Spotify source, not just release notes. All four contain that same expression and strict comparison:

| Release | Pinned commit |
| --- | --- |
| [v0.1.0](https://github.com/teal-fm/piper/releases/tag/v0.1.0) | [`8dd3f7d613b77049c2ed4e7d965be1f046b1d05c`](https://github.com/teal-fm/piper/blob/8dd3f7d613b77049c2ed4e7d965be1f046b1d05c/service/spotify/spotify.go#L721-L729) |
| [v0.1.1](https://github.com/teal-fm/piper/releases/tag/v0.1.1) | [`d59be843bcf43be7ad4a1cc935cb392babab1134`](https://github.com/teal-fm/piper/blob/d59be843bcf43be7ad4a1cc935cb392babab1134/service/spotify/spotify.go#L721-L729) |
| [v0.2.0](https://github.com/teal-fm/piper/releases/tag/v0.2.0) | [`86c007c760eb4a14aafc28ec40f8163777933cfb`](https://github.com/teal-fm/piper/blob/86c007c760eb4a14aafc28ec40f8163777933cfb/service/spotify/spotify.go#L721-L729) |
| [v0.2.1](https://github.com/teal-fm/piper/releases/tag/v0.2.1), published November 12 | [`edf0963e5db13115d836c21144f02c0dc051ff5b`](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/spotify/spotify.go#L721-L729) |

Tangled advertises no tags and has older HEADs than GitHub. Treating its HEAD as the latest release would miss these releases, although their Spotify thresholds agree.

## Libraries and dependency versions

Piper implements eligibility in its own service. Its [v0.2.1 `go.mod`](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/go.mod) has no shared Teal threshold dependency. Its AT Protocol dependency is Indigo `v0.0.0-20251003000214-3259b215110e`; generated Teal types and lexicon JSON live in Piper itself. The npm manifest only declares Tailwind dependencies.

Teal's [`@teal/lexicons` manifest](https://github.com/teal-fm/teal/blob/455634384151580947f31b743b689fb8d6d2427e/packages/lexicons/package.json) is a workspace package without a package version. The [lockfile](https://github.com/teal-fm/teal/blob/455634384151580947f31b743b689fb8d6d2427e/pnpm-lock.yaml) resolves its dependencies to `@atproto/api@0.20.5`, `@atproto/lex-cli@0.5.7`, `@atproto/lexicon@0.7.1`, and `@atproto/xrpc-server@0.7.19`. These do not replace the service's explicit eligibility expression. The [npm registry lookup for `@teal/lexicons`](https://registry.npmjs.org/%40teal%2Flexicons) returned `Not found` on the research date. No published official threshold helper was identified in the inspected manifests. This is not a claim that every Teal-related third-party package was audited.

## Edge cases and concrete mismatches

Compared directly with the pinned Piper Spotify code, local thresholds differ for short tracks, tracks between two and four minutes, tracks over eight minutes, and exact-boundary acceptance. For example, local 90-, 180-, and 600-second tracks require 90, 120, and 240 seconds; Piper requires more than 45, 90, and 300 seconds respectively. A 240-second track needs at least 120 seconds locally and strictly more than 120 seconds in Piper. These are Piper compatibility mismatches, not proof that the local implementation violates a settled Teal specification.

- **Unknown duration:** Local `validSample` rejects nonfinite, zero, or negative duration before tracking. Calling `threshold(0)` alone returns zero, but that is not the accepted-sample path. The lexicon permits omitted duration without prescribing a fallback. Piper's Spotify expression gives a 30-second threshold at zero duration, but its repeat logic also resets `hasStamped` each poll because accumulated time is always at least zero. Do not copy this as a deliberate unknown-duration policy. Its [zero-duration test](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/spotify/spotify_test.go#L592-L612) only checks no initial stamp.
- **Short-track completion:** Local `advance` starts credited listening at zero on the first sample and drops the old state on a track change or detected loop. Missing the beginning or final sample can prevent a genuinely complete short play from qualifying. There is no completion-event allowance. Piper Spotify has no completion exception either; it subtracts duration and clears its stamp flag before checking eligibility, which also makes very short tracks problematic within a normal single play cycle.
- **Tolerance:** Local seek checks allow progress up to elapsed time plus 1.25 seconds and credit up to elapsed plus 0.25 seconds. Those are accumulation tolerances, not reductions to the eligibility threshold. Piper instead seeds up to 30 seconds from initial position and adds wall-clock poll deltas capped at 30 seconds, preserving paused state. Neither inspected source establishes an official end-of-track grace period. See [Piper state updates](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/spotify/spotify.go#L630-L729) and local [tracker.ts](/Users/jbhutch/Sites/teal-tidal/src/tracker.ts:8).
- **Provider differences:** Piper is not internally universal. Its [Apple Music conversion](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/applemusic/applemusic.go#L385-L415) assumes recent-history entries are full plays and stamps positive durations above 30 seconds. Its [Last.fm importer](https://github.com/teal-fm/piper/blob/edf0963e5db13115d836c21144f02c0dc051ff5b/service/lastfm/lastfm.go#L460-L480) marks already-scrobbled history as stamped rather than measuring listening again.

## Minimal recommendation

For the stated goal of following Teal's lexicon, retain the numeric formula pending an authoritative clarification. Change the comment's unconditional claim of matching Teal into an explicit statement that this implements the longest-of interpretation, including the 120-second plateau. Do not substitute Web Scrobbler rules or silently adopt Piper's contradictory provider-specific rule.

The concrete behavioral issue worth fixing separately is missed short-track completion. A verified end-of-track event or carefully bounded accounting could address it, but the inspected sources do not justify a particular grace period. If exact Piper Spotify compatibility becomes the explicit requirement, the minimal numeric change would instead be `max(d/2,30)` with strict `>` comparison, preserving the distinction from lexicon compliance.
