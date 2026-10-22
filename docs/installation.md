# Install MyOwnTV on an LG TV

## 1. Developer Mode on the TV — do this first

Use [LG's official Developer Mode guide](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app) as the authority for the account, app and pairing screens.

Reuse Developer Mode if already enabled and keep valid connections. Before changing Dev Mode Status, Key Server or a Quick Access assignment, photograph the displayed original state and menu path and retain a private change record on the computer (for example under ignored `.local/`). Photograph the result afterward. These prerequisite photos do not require remote access; they establish the baseline before pairing is possible. Do not toggle an existing working setup just to repeat this guide.

1. Connect the TV and computer to the same LAN. Wired Ethernet is fine; guest Wi-Fi or client isolation may prevent access.
2. Create an LG Developer account on LG's developer website. On the TV, find **Developer Mode** in LG Apps / LG Content Store and install it.
3. Open Developer Mode and sign in **on the TV**. Keep the account password out of this repository and agent conversations.
4. Enable **Dev Mode Status** and allow the TV to reboot. Reopen the app afterward.
5. Note the TV IP address privately. Enable **Key Server** when retrieving its SSH key in step 3 below; enter the displayed, case-sensitive pairing phrase into the local CLI prompt.
6. Check **Remain Session** regularly and use **EXTEND** with the TV online before expiry. LG documents that developer apps are removed when Developer Mode is disabled. Developer Mode is temporary; this installation does not replace that session mechanism.

Leave Clear Cache Data alone; it is unnecessary for installation. MyOwnTV stays an ordinary app alongside LG Home. No rooting, firmware flashing, ADB, USB firmware file or Android APK is involved.

## 2. Prepare the computer and source

Use Git, Node.js 22+ and npm. The examples use PowerShell on Windows. Linux/macOS can use the same npm/node commands; replace the PowerShell wrapper with the explicit commands below. Browser tests use Edge on Windows; other systems need `npx playwright install chromium` (Linux may need `--with-deps`).

```powershell
git clone https://github.com/AKeybladeMaster/MyOwnTV-OS.git
cd MyOwnTV-OS
git switch main
npm ci
```

For an existing checkout, preserve local work and use `git pull --ff-only`; do not reset or clean it. Read `AGENTS.md`, [toolchain notes](toolchain.md) and [safety and restore](safety-and-restore.md).

The verified hardware is **49NANO816NA / firmware 04.64.00 / SDK 5.6.2**, using Chromium 68. Compatibility with every LG TV is not established. `config/target.json` deliberately guards the verified model/firmware. For another LG, first read its real identity, assess its web engine and public API compatibility, then deliberately adapt that configuration locally. Do not remove identity checks merely to get past a failure, and do not copy another owner's connection files.

## 3. Connect using LG's official CLI

The pinned `@webos-tools/cli` is installed by `npm ci`. In the following commands replace `YOUR_TV_IP` with your TV's address; it is a placeholder, not a literal address. Use an unused alias, or reuse an existing correctly configured alias. The repository defaults to `myown-lg` in `config/target.json`.

If using another alias, set `config/target.json`'s `aresDevice` to that alias and substitute it for `myown-lg` in every CLI command below. The guarded tools use that configuration rather than the CLI's default device.

```powershell
npx ares-setup-device --list
npx ares-setup-device -a myown-lg -i host=YOUR_TV_IP -i port=9922 -i username=prisoner
npx ares-novacom -d myown-lg --getkey
npx ares-device -d myown-lg --system-info
```

Enable Key Server before `--getkey`. Supply the TV's temporary phrase at the interactive prompt; do not put it in a command, committed file or screenshot. The CLI stores the key in your user profile. No SSH password or LG account password is required in these commands. Verify the displayed identity against the physical TV, especially when multiple LG devices are present.

MyOwnTV's backup/inventory tools also use LG's paired remote interface:

```powershell
npm run tv -- pair --host YOUR_TV_IP
npm run tv -- inventory
```

Accept the connection prompt on the intended TV. The tool verifies the configured model and pins its certificate. An existing pairing is preserved rather than overwritten. A certificate mismatch requires investigating identity, not disabling pinning. Raw inventory output may reveal personal app choices; keep it local.

## 4. Configure the shortcuts for this TV

`config/apps.json` contains IDs verified on the original TV, not a universal LG catalog. Compare them with the new TV's inventory. Ask its owner which installed apps belong in the dock, then edit names, IDs and `favorite` flags locally. The dock supports one to seven favorites. Keep native shortcuts only when their IDs exist on that TV; avoid factory/test apps. The launcher uses existing apps; it does not install streaming providers or enumerate new store installs automatically.

LG Content Store is the compatible original store. Google Play and Android APKs are incompatible with webOS. Preserve Developer Mode and all native functions. Installing this launcher alone does not alter LG's privacy toggles or remove streaming-service ads.

Changing favorites in the running app's Settings needs no source edit. When adapting the source catalog/defaults for another owner, also review `tests/domain.test.mjs`, `tests/browser-flow.mjs` and `tests/file-origin.mjs`: their owner-requirement fixtures use the original app IDs, order and six-tile default. Update affected fixtures to the newly confirmed catalog and preferences, preserving validation and navigation coverage; do not skip failing tests or remove safety assertions to force installation.

## 5. Generate the TV package

```powershell
npm test
npm run package
npm run test:browser
npm run test:file
```

| Generated path | Purpose | Send to TV? |
|---|---|---|
| `dist/` | Bundled HTML, CSS, JavaScript, metadata, icons, photos and notices | No; input to packaging |
| `out/io.github.akeyblademaster.myowntv_<version>_all.ipk` | Installable webOS app archive | **Yes, via the installer** |
| `out/release-manifest.json` | Package identity, size and SHA-256 used by the guarded installer | Keep on PC |
| `out/SHA256SUMS.txt` | Package checksum for verification | Keep on PC |
| `out/*NOTICES*`, `out/*CREDITS*` | Third-party attribution, also bundled inside the app | Keep with distribution |
| `.local/` | Private pairing, readable backups, retained IPKs, deployment records and app captures | Never publish or copy wholesale to TV |

The package version comes from `config/appinfo.json`; keep it consistent with `package.json` and the lockfile when changing versions. `npm run package` builds the app, invokes LG's packager and inspects the resulting archive for identity, safe paths and absence of services/install scripts. The full app is inside the IPK; no separate wallpaper, JavaScript or configuration upload is necessary. Do not copy `node_modules` to the TV. Rebuilding may change archive timestamps and SHA-256 even for the same version.

Optional preview: `npm run preview`, then open `http://127.0.0.1:4173`. Desktop success does not prove TV compatibility.

## 6. Snapshot, install and verify

After the checks above, use the exact generated package:

```powershell
npm run tv -- backup
npm run tv -- install
```

Alternatively, on Windows, `.\build-and-install.ps1` runs tests, rebuilds/packages, takes a fresh baseline and installs. `-BuildOnly` avoids TV access. Choose one path; do not install twice. The tools verify the live SSH alias and paired TV, validate the package checksum, retain its bytes, record deployment and install only `io.github.akeyblademaster.myowntv`.

The snapshot is a readable-state inventory, **not** firmware, app login data or a complete settings backup. Missing private settings and denied native screenshots are explicitly recorded. Keep the previous package and `.local` securely on your own computer.

Wait until MyOwnTV is visibly open, then capture its actual viewport using a unique name:

```powershell
node tools/inspect-app.mjs --name first-install --assert-rendered
```

Inspect the saved PNG in `.local/shots/`. This captures only this app through Developer Mode Web Inspector, not the TV compositor or native menus. If the helper says the app is not foreground, wait for startup and retry with a new name. If denied, report the limit and use a physical photo; do not bypass permissions.

Test arrows/OK, every dock app, actual signed-in playback, Home/Back, Input/Settings, held volume, live TV and mirroring/AirPlay. An app foreground ID proves opening, not playback or DRM. Compare with native behavior before installation.

For a direct return from live TV, hold **0** to inspect LG Quick Access assignments. With MyOwnTV open, hold an unused **1–8** and confirm registration; hold it again from live TV to test. Do not overwrite an existing shortcut. MyOwnTV also appears in LG Home's app row. Home remains LG Home; automatic boot/default-launcher replacement is not implemented.

## 7. Updates and recovery

For an existing installation managed by this checkout, keep the retained previous IPK and private records, open MyOwnTV and run:

```powershell
.\build-and-install.ps1 -Update
```

Without PowerShell, run the build/check commands, then `npm run tv -- backup`, `node tools/inspect-app.mjs --name before-update-20261022-160000 --assert-rendered --export-preferences`, and `npm run tv -- install --update`. Replace the example timestamp with a unique lowercase capture name. The preference export must follow the baseline and be less than ten minutes old. Missing deployment history or a prior IPK stops replacement; an unmanaged existing install requires deliberate recovery planning rather than bypassing the guard.

Press physical Home to leave the launcher. From the paired checkout, `.\restore.ps1` (or `npm run tv -- restore`) closes MyOwnTV and requests LG Home without removing packages. LG's Home overlay may not appear as the foreground app ID; verify it visually. This is a return-to-native-Home script, not firmware restoration or automatic rollback of manually changed privacy settings.

For privacy changes, use the [separate plan](privacy-plan.md), record actual original values and before/after menu photographs, and change only choices authorized by that TV's owner. The original owner's permissions do not apply to another household. No native privacy changes are included in the installation.

## Troubleshooting

- **Connection refused:** confirm IP, LAN reachability, Developer Mode session and Key Server for key retrieval. Use SSH 9922, not ADB. Do not factory-reset the TV.
- **Identity mismatch:** check the physical TV and alias/configuration. Do not weaken the checks.
- **Already installed:** use the guarded update procedure with retained history; do not uninstall to bypass it.
- **Missing shortcut:** verify the installed app ID, update the catalog and rebuild. A store installation alone does not update this static catalog.
- **App disappeared:** check Developer Mode status/session. Follow LG's guide to enable it again, then restore the developer app from a retained IPK using a reviewed installation path; app preferences may have been removed.
- **Blank UI:** capture the app viewport/resource diagnostics (`--diagnose`), preserve logs privately, and check Chromium compatibility. The historical local-file CSP fix is recorded in [verification](verification.md).
