# Safety, snapshots, and restore

MyOwnTV is an ordinary web app installed alongside LG's apps. It cannot replace the TV firmware. The native Home button, settings, wireless display, inputs, updater, and installed apps are left enabled. There is no root, factory menu, boot hook, background watcher, Home interception, service installation, system package operation, or Android command.

## Before a change

Run `npm run tv -- backup` after pairing. Snapshots are written to `.local/backups/<timestamp>/`. The manifest hashes every saved inventory file and records the verified model, firmware and pinned TV certificate. A snapshot that cannot read an installed-app inventory cannot authorize installation. No snapshot is silently overwritten. `.local/latest-backup.json` points to the newest complete snapshot.

These snapshots contain readable app IDs/metadata, launch points, inputs, model, firmware, and any settings explicitly readable through LG's permitted interface. Unavailable fields are listed in the manifest. They do **not** back up firmware, protected system files, paid apps, passwords, app login data, all settings, or a partition image. Developer Mode cannot provide such a backup without privileges. Keep `.local` on your own computer and do not upload it.

Before a privacy toggle, record its displayed original value and exact menu path with a photograph/screenshot. The [privacy plan](privacy-plan.md) specifies the permitted choices. Unknown or inaccessible settings stay unchanged. Reset AD ID, region changes and broad agreement revocation are excluded because exact restoration or feature preservation is uncertain.

## Return to LG Home

On the TV, press the physical **Home** button. It has always remained LG's Home button. MyOwnTV's Back button also delegates to LG's `platformBack` when at the main screen. No uninstall is needed.

On the PC, run:

```powershell
.\restore.ps1
```

The script verifies the local snapshot against the paired TV, closes only `io.github.akeyblademaster.myowntv` if installed, then opens native LG Home. It removes nothing and rewrites no system setting. If remote access is unavailable, use the physical Home button. Restoring does not require a reboot or a firmware change.

This initial implementation never changes system settings programmatically. If privacy toggles were later changed manually, restore each **recorded original value** in its actual native menu and photograph the result. The script deliberately does not guess defaults or replay blind remote-key sequences. Do not describe its launcher rollback as automatic recovery of manual privacy changes.

## Installation and updates

`build-and-install.ps1` runs tests, packages and inspects the IPK, saves a snapshot, verifies identity, records the pending deployment, and installs only this app. The IPK is inspected for its app identity, unprivileged web type, archive paths, install scripts, services and unsafe file types. The release SHA-256 must match. Existing system packages are never touched.

The initial installer refuses replacement if MyOwnTV already exists. To update, open MyOwnTV and run `.\build-and-install.ps1 -Update`. It takes a fresh baseline and exports only the launcher's preferences through its own Web Inspector. Installation requires a prior successful deployment for this TV, its retained and validated IPK, and a matching preference export newer than the baseline and less than ten minutes old. Missing evidence stops the update. Both package versions and preferences are retained privately. `.local/packages/` retains installed IPKs keyed by checksum. This is a developer application; LG may remove developer applications when Developer Mode expires and is disabled. Use the official Developer Mode app's **EXTEND** control before expiry. Turning Developer Mode off can remove developer apps; it is not a way to keep this launcher installed.

For access from live TV, use LG's native Quick Access rather than replacing the Home handler. Hold 0 to review assignments. With MyOwnTV visible, hold an unused number from 1–8 and confirm. To undo this shortcut, use the native Quick Access editor and restore its recorded prior assignment; do not overwrite an existing shortcut without recording it.

## Verification limits

An injected remote button proves software behavior, not the physical remote. Verify Home, Back, Input, Settings, volume, dedicated app buttons and held-volume repeat on the real remote. Opening an app does not prove signed-in playback or DRM functionality. Test real playback in each streaming app and test AirPlay/mirroring from a phone. Empty or denied screenshots do not prove a display fault. Never bypass DRM or a capture permission to obtain them.

No software workflow can promise zero risk or recover from every proprietary-firmware or hardware failure. This workflow reduces the scope of change to a removable developer app and inspectable ordinary settings, with a native escape path that is never disabled.
