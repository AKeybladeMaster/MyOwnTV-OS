# Owner-approved privacy plan

The owner authorizes disabling ads/personalization, recommendations, and HbbTV while retaining voice/ThinQ, AirPlay, wireless display, the tuner, inputs, updates, native settings, LG Content Store, Developer Mode, and every installed app.

No system package will be disabled or removed. Android's `pm disable-user` has no supported counterpart in this Developer Mode sandbox. No package is judged disposable from its name.

The candidates below are ordinary settings. Wording and menu placement vary with firmware, region and menu language; inspect the actual menu before changing anything. The TV uses Italian UI. No key is written by guessing an internal setting name.

| Setting to inspect | Intended value | Effect / preservation rule |
|---|---|---|
| General → Additional Settings → Home Settings → Home Promotion | Off | Reduce LG Home promotional tiles; leave native Home available |
| Home Settings → Content Recommendation, if present | Off | Turn off LG content recommendations |
| General → Additional Settings → Live Plus, if present | Off | Opt out of LG content recognition / personalization |
| General → Additional Settings → Advertisement → Limit AD Tracking, if present | On | Limit ad personalization; do not reset the ad ID, since that cannot restore the original identifier |
| Channels → HbbTV | Off | Owner explicitly does not use interactive red-button TV |
| Optional ad/recommendation agreements, if independently revocable | Decline only if the TV clearly identifies their scope | Keep essential platform, store, voice and streaming agreements; do not bulk-revoke terms |

Some entries may not exist on this firmware. No claim is made that these controls stop all LG telemetry or third-party app advertising. LG Channels and Rakuten may serve ads as part of the content. Preserving cloud voice features also preserves their necessary cloud communication. There is no DNS blocklist enabled: broad LG-domain blocking can break the store, app licensing, updates, AirPlay/ThinQ, and streaming. Do not change region or DNS as an implicit substitute.

For each actual change: capture the menu with its original value, write the original value and exact path in a private change record, change one toggle, capture it again, then check the preserved feature. If the TV refuses screenshots and the original value cannot otherwise be recorded, wait for owner-provided menu photographs. Do not claim a setting was changed without that evidence.

As of the initial baseline, paired `tv/executeOneShot` returns `401 insufficient permissions`; Developer Mode also denies compositor capture. The sandbox denies system-settings access; SSAP can read supported picture settings, while the `option` privacy category returns an application error. These are access limits, not evidence that the TV has no privacy controls. App-only screenshots through the installed app's Web Inspector are a separate, supported verification route.
