---
title: Privacy policy
---

# Teal Tidal privacy policy

Effective November 21, 2026.

Teal Tidal is an independent browser extension that reads playback from the TIDAL
web player and, when you connect an account, publishes qualifying listens to your
AT Protocol personal data server for services such as teal.fm. It is not affiliated
with TIDAL, Bluesky, or teal.fm.

## Data the extension handles

On TIDAL player pages, the extension reads track titles, artists, album names when
available, track identifiers and URLs, duration, playback position, and whether
playback is active. It uses these details to count listening time. It does not
read your TIDAL password, payment details, cookies, or unrelated browsing history.

Local preview works without connecting an account. Current playback state is
stored in this browser. Nothing is published by the extension until you connect.

To connect a Bluesky-hosted account, you provide a handle and app password. The
extension sends these directly over HTTPS to Bluesky's authentication service at
bsky.social. The app password is not saved to extension storage. The returned
account identity and access/refresh tokens are stored in local extension storage,
restricted to trusted extension contexts, so the extension can publish and refresh
its session. Session responses can also include account email and confirmation
metadata; these remain in the locally stored session and are not added to listens.

## Publishing and recipients

When connected, the extension sends qualifying listens directly to the account's
Bluesky-hosted personal data server under host.bsky.network. A listen contains the
track title, artists, album when available, track duration, playback start time,
TIDAL track URL, music service URL, and extension identifier/version.

**Published listening history is public.** Teal, AT Protocol relays, and other
applications or people can read, index, and retain these records. Publishing does
not depend on visiting teal.fm. Your account and server provider's own privacy
terms also apply. TIDAL continues to receive the requests you make while using
its player independently of this extension.

The extension has no developer-operated collection server, advertising, analytics,
or tracking SDK. The developer does not sell or use your information for advertising.
Opening external links, including this policy, contacts the destination website;
GitHub hosts the project and this policy under its own privacy terms.

## Local storage, retries, and control

Pending listens are saved locally before sending and retried while the extension
is running. They remain until successfully sent or cleared. The extension also
stores current playback state, a submission count, and the last submitted title.
It uses local extension storage, not Chrome sync storage.

Disconnecting clears the locally stored session and pending listens and attempts
to invalidate that session with your provider. Local preview can continue reading
TIDAL playback. To stop all extension activity, disable or uninstall the extension.
Uninstalling removes the browser-managed extension storage. You can revoke the
dedicated app password in your provider's settings.

Disconnecting or uninstalling does not delete published records. Delete those
through a compatible AT Protocol client or your provider. Copies already retained
by other services may remain available under their policies.

## Limited use and contact

The extension's use of user data complies with the Chrome Web Store User Data
Policy, including its Limited Use requirements. Data is used only for the disclosed
listening detection, account connection, publication, and retry functionality.

For questions or privacy concerns, open an issue at
[IHIutch/teal-tidal](https://github.com/IHIutch/teal-tidal/issues).
Changes to this policy will appear here with an updated effective date.
