# Device verification — 0.1.1

Target observed on 22 October 2026: LG 49NANO816NA, firmware 04.64.00, SDK 5.6.2, Chromium 68.0.3440.106. The device was identified before installation; its address, certificates, inventories, screenshots and pairing material remain private.

## Checks completed

- 17 automated tests: preferences and preservation of corrupt originals, navigation edges, native-key passthrough, public launch adapter, hostile IPK archives, SSH target matching and update-backup freshness.
- Desktop Edge: keyboard navigation, app library, favorite editing/order and persistence, reduced motion, 720p scaling, no external requests and no page errors. A separate modern-browser `file:` smoke check passed.
- Actual TV: the final app viewport renders at 1920×1080 with the stylesheet, all six dock tiles, three native controls and stable focus. The app's resource log is empty. D-pad movement and opening the app library were captured.
- All six dock buttons invoked the public launch bridge, and the paired foreground API confirmed YouTube, Prime Video, Spotify, LG Channels, Rakuten TV and Klani IM. A first LG Channels check timed out at ten seconds; it appeared afterward and passed a subsequent thirty-second check. This measures opening the apps, not playback or faster streaming-app startup.
- Actual TV settings-panel navigation and the Next wallpaper control were exercised using paired remote buttons. Before/after app-viewport captures show Lake Louise changing to Lofoten.
- `restore.ps1` closed MyOwnTV successfully and the TV accepted the native LG Home launch request. The foreground API did not report LG Home afterward; it can report the app under the native overlay. Visible native Home is therefore a physical check, not a claimed screenshot verification. MyOwnTV was reopened afterward.
- Installation uses only the official Developer Mode route. The final IPK is 2,848,018 bytes, SHA-256 `928aacd4516b5dbc7957633a4424dfc83f3feaaf4acf14e6fe0535700aa6aeb9`. This exact byte sequence was validated, retained privately and installed. Do not substitute a new package build merely because its version matches: archive timestamps may change its hash.
- Previous app packages, own-app preferences and readable-state snapshots were retained before updates. Every deployment record has an empty system-change list.
- The owner reports that physical remote behavior appears to work. They identified a missing return path from live TV; native LG Quick Access instructions were added. Actual shortcut registration is an owner check, not yet claimed as verified.

The first installed build exposed an opaque local-file-origin CSP difference in the TV browser: `'self'` alone blocked its bundled stylesheet and script. An actual-TV render assertion failed before the fix, and the Web Inspector log identified the blocked resources. Explicitly allowing local `file:` resources fixed the original reproduction. Modern desktop file-origin tests did not reproduce this bug and are not presented as that regression test. The actual-TV assertion remains the relevant check.

## Limits and outstanding checks

Whole-screen compositor screenshots and native privacy-settings export are denied by the permitted TV interfaces. The saved PNGs show **MyOwnTV's actual app viewport**, not LG menus, streaming playback or the entire compositor. No capture-permission workaround was used.

No native privacy toggle or system package has been changed. Ads/personalization, recommendations and HbbTV still require photographs of their original menu values, one-at-a-time changes and after photographs. A launcher's lack of network requests does not prove the TV or streaming apps stopped communicating.

Signed-in playback/DRM, physical Home/Back/Input/Settings and held-volume behavior, AirPlay/Screen Share from a phone, and Quick Access from live TV require physical testing. All original app IDs remain in the inventory, but that is not proof of every native feature working. Developer Mode session renewal remains necessary.

The release is a device-tested developer preview of the standalone launcher. It is not a claim that privacy hardening or whole-TV recovery is complete. See [safety and restore](safety-and-restore.md) and the [privacy plan](privacy-plan.md).
