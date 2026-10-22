# MyOwnTV

Target: LG 49NANO816NA, firmware 04.64.00, webOS SDK 5.6.2 / Chromium 68.

- This is a standalone developer app, not an operating system replacement.
- No root, exploits, firmware flashes, factory menus, system-file edits, application removal, system-package disabling, Home interception, boot hooks, or always-on helper.
- Preserve all native TV capabilities and installed applications. The owner specifically permits disabling HbbTV, recommendations, ads, and personalization through ordinary settings. Preserve voice/ThinQ, AirPlay, mirroring, tuner, inputs, network, updates, settings, LG Content Store, and Developer Mode.
- Back up readable state before installation or a settings change. Keep each before value and screenshots in an immutable local change record. An inventory is not a firmware or app-data backup. Stop a change if its original value cannot be established.
- Credentials, TV addresses, MACs, serials, raw app inventories, screen captures, and backups belong in ignored `.local/`, `backup/`, or `shots/`. Never publish them.
- Runtime has no network requests, analytics, external fonts, framework, privileged permission, or bundled service. Bundle local assets and target Chrome 68. No optional chaining, CSS flex gap, backdrop filters, or unsupported CSS in output.
- Keep pure state/navigation in `src/domain`, webOS/browser implementations in `src/platform`, and view code in `src/ui`. Inject platform and storage dependencies; introduce interfaces only where implementations actually vary.
- `npm test`, `npm run package`, browser keyboard checks, and real-TV screenshots are required for a release. Report unverified physical-remote and playback checks honestly.
- Never re-pair or reset an existing connection without explaining the need. Pairing uses an unsigned, minimal user-approved permission manifest; do not impersonate LG or copy a signed test identity.
- Commit on `dev`. Preserve the repository's GPL-3.0 license and third-party asset notices.
