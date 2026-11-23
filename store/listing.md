# Chrome Web Store listing

Name: Teal Tidal

Summary: Track TIDAL web player listens and publish them directly to your account for teal.fm.

Category: Entertainment

Language: English

## Description

Keep your TIDAL listening history in your own AT Protocol account.

Teal Tidal detects tracks in the TIDAL web player and publishes qualifying listens
as public records for teal.fm and compatible apps. It works with Chrome and Brave
and connects to Bluesky-hosted accounts using a dedicated app password.

- Preview playback detection and track metadata before connecting an account.
- Track titles, artists, albums when available, and time spent listening.
- Save pending listens locally and retry failed submissions.
- Disconnect and clear pending listens from the popup.

Published listens are public. The app password is not saved; session tokens stay
in local extension storage. No developer-operated collection server, ads, or analytics.

This beta supports the TIDAL web player, not the native TIDAL app. Reload an already
open TIDAL page after installing. Missing playback samples or background throttling
can prevent some listens from qualifying. A published record may take time to
appear in a compatible viewer. OAuth and custom-provider login are not included.

Independent software, not affiliated with TIDAL, Bluesky, or teal.fm.

## Links

- Homepage: https://github.com/IHIutch/teal-tidal
- Privacy: https://github.com/IHIutch/teal-tidal/blob/main/docs/privacy.md
- Support: https://github.com/IHIutch/teal-tidal/issues

These links require repository access during the private beta. Publish a publicly
accessible policy before a Chrome Web Store submission.

## Privacy practices fields

Single purpose: Detect qualifying listens in the TIDAL web player and publish them
to the user's connected AT Protocol account for teal.fm and compatible viewers.

Permissions:

- storage: Keep account sessions, current playback state, submission status, and
  pending listens locally across popup closure and extension restarts.
- alarms: Retry pending submissions once a minute while the browser is running.
- bsky.social: Authenticate with the user's app password and refresh/revoke sessions.
- *.host.bsky.network: Write listens to the user's Bluesky-hosted personal data server.
- TIDAL content-script matches: Read player metadata and playback state only on
  the declared TIDAL domains to detect qualifying listens.

Data handling disclosures to select and explain in the dashboard:

- Authentication information: app password during sign-in and locally stored session tokens.
- Personally identifiable information: account handle/DID and email metadata returned with sessions.
- Web history / website content / user activity, as applicable to the dashboard's
  definitions: TIDAL track URLs, titles, artists, albums, playback state and timing.

Disclose that qualifying listening history is sent to the user's PDS and becomes
public. Local-only storage and direct-to-provider transmission are still data
handling and should not be described as "no data collected."

No remote code: All executable JavaScript and CSS are packaged with the extension.

## Reviewer instructions

1. Install and open the extension. No account is needed to inspect the popup or
   local preview. Open a signed-in TIDAL web player tab and reload it.
2. Play a track. The popup should show title, artists, duration, metadata payload,
   and increasing listening time. Pause to stop crediting playback.
3. To test publication, use a dedicated Bluesky-hosted test account and create an
   app password with direct-message access off. Connect from the popup. Do not
   reuse a personal password. Reviewer credentials are not included in this repo.
4. Listen to a track for the displayed threshold. Verify submitted increases and
   pending returns to zero. Records are public in fm.teal.feed.play on that account's PDS.
5. Disconnect to clear the session and pending listens. Already published records
   remain. Revoke the dedicated app password after testing.

TIDAL playback requires the reviewer's TIDAL account/access. A dedicated test
account may need to be supplied privately in the dashboard at submission time;
never publish credentials in the listing, repository, or release.
