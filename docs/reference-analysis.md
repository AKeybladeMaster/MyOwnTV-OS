# Reference repository analysis

Audit date: 22 October 2026. The references were cloned before this branch was created. Their commands were examined as source; none were executed against this LG.

| Reference | Pinned commit | Tracked files | Text lines |
|---|---|---:|---:|
| [Gathin23/cleanyourtv](https://github.com/Gathin23/cleanyourtv) | `22dc48fe21b1618f9b2fae448d991271d1d7277e` | 804 | 64,984 |
| [mihirgupta0900/tv-home](https://github.com/mihirgupta0900/tv-home) | `19803542cd335e0b2643dfa73c18c38051354ffa` | 32 | 1,419 |

`reference-inventory.json` inventories and SHA-256 hashes every tracked file, including resources, tests, examples, translations, and binary assets. The figures are text-line counts, not claims of line-by-line human review. Runtime, deployment, disabling, recovery, input, configuration, wallpaper, navigation, permissions, and licensing paths received focused source review. Unrelated Android add-ons, device-specific lists, artwork, and translations were assessed by inventory and platform dependencies, not individually validated on hardware.

## cleanyourtv

The project is an Android TV/Google TV launcher and a collection of ADB administration tools. The launcher is Java, Gradle, Android SDK 34, minimum Android API 26; it uses RecyclerView and AndroidX spring animation. `MainActivity` coordinates the screen (3,115 lines). `AppAdapter` (771 lines) handles artwork, tiles, launch intents, and focus effects. `Config` reads XML defaults and validated JSON overlays. Smaller modules cover dock slots, physical grid edges, input routes, saved order, library visibility, wallpaper decoding/rotation, motion, and optional content cards. Module cards and theme providers add extension points but also extra permissions and validation obligations.

The ADB tools discover devices, authenticate, execute shell commands, capture Android screenshots, transfer APKs, and manage themes. The disabling scripts parse package lists, reject malformed names and core Android packages, protect the current Home owner, check input hardware dependencies, and guard against deleting setup-wizard-owned Wi-Fi. `recovery.py` records original enabled/disabled/absent states, the original Home handler, and animation scales before applying changes; its record is atomically written and retains the first baseline across retries. The current restore path improves substantially on simply enabling everything. Its fallback when a baseline is missing is less exact and is not appropriate for this project.

The privacy audit separates firmware-nominated owners and recorded activity from name-only guesses. A microphone permission or a package name does not prove recording or telemetry. The safety notes describe real failures from disabling core services, input software, setup-wizard network ownership, and factory menus. The Home handover and accessibility helpers are specifically Android mechanisms; they can affect remote key repeat and require physical-remote checks. The showcase links separate webOS ports; these do not make the Android code compatible with webOS 5.

The repository includes 233 text files (mostly model-specific lists), 64 Python files, 126 Java files, separate add-ons, test suites, theme photographs, typefaces, and translations. Tested Android package lists cannot establish safety for LG packages. Names such as `ad`, `acr`, or `overlay` in this TV's inventory are evidence of identity only, never permission to disable them.

## tv-home

This is a smaller Android implementation: one 850-line `MainActivity`, framework views, no AndroidX, and a bare Android SDK build script. It provides a clock, app-colored title glow, dock, app grid, explicit D-pad targets, TV input selection, two-image wallpaper crossfades, off-thread decoding, and refresh on return from other apps. Twelve local Commons photographs rotate every ten minutes. Pausing stops the wallpaper callback, an important low-power behavior to retain.

`tools/tv.py` uses `adb-shell`, handles RSA keys, executes shell/batch commands, pulls screenshots, and pushes APKs through base64 with an MD5 check. Paths are interpolated into shell strings; this approach should not become a general privileged execution interface. The disable script calls `pm disable-user`; the restore script enables the entire list and fixed Google Home/setup packages rather than replaying an exact baseline. The install script changes Android's Home handler, disables the stock launcher and setup wizard, grants location, and force-stops settings. Those operations are both platform-specific and outside this project's safe scope. The build assumes macOS/Homebrew and Android API 30+, so it cannot build an LG `.ipk`.

## Decisions carried into MyOwnTV

| Reference idea | webOS implementation |
|---|---|
| Offline nature wallpaper, calm dock, clear focus | Bundled local photographs, CSS transforms, deterministic navigation |
| Favorites and complete app library | Stable webOS app IDs verified from the paired TV; local preference storage |
| Refresh installed apps | Explicit PC inventory sync; no unauthorized system-app enumeration in the sandbox |
| Lifecycle-aware timers | Stop wallpaper and clock timers when the document is hidden |
| Exact original-state recovery | Immutable local snapshots and before/after setting records; no guessed defaults |
| Protected TV functions | Keep every native package and native Home/Settings/input behavior |
| Android default launcher replacement | Separate `.ipk` opened like an ordinary app; native Home remains native |
| ADB package disabling | Unavailable on webOS; use ordinary, owner-approved privacy settings only |
| Android screenshot command | Paired LG screenshot endpoint if permitted, or app-only Web Inspector capture |
| Android app store | Keep LG Content Store; Android APKs/Google Play are incompatible |

## Architecture and licensing

Use deep modules with small interfaces: preference validation and navigation remain pure; browser and webOS adapters satisfy the same launch/exit interface; UI coordinates those modules. There is no framework or abstraction layer for hypothetical backends. Scaling means adding app records, assets, tests, or a platform adapter without expanding a single activity into thousands of lines. This applies SOLID through focused responsibilities, dependency injection, substitutable adapters, and small interfaces.

Both reference codebases are MIT. This existing repository is GPL-3.0 and retains that license. MyOwnTV runtime code is a new webOS implementation, not compiled or translated Android code. Reused Commons photographs retain their individual CC BY-SA licenses and attribution, independent of the code license. The reference source code and fonts are not included in the TV bundle.

## Verified platform constraints

- [LG Developer Mode](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app): same-network SSH as `prisoner` on port 9922; `.ipk` apps are removed when Developer Mode expires and is disabled. Keep the session renewed through LG's app.
- [LG web engine matrix](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine): webOS 5 uses Chromium 68. Targeting a modern desktop browser alone is insufficient.
- [Application Manager](https://webostv.developer.lge.com/develop/references/application-manager): public `launch` opens an installed app by its webOS ID. It does not change the default Home handler.
- [Official CLI installation](https://webostv.developer.lge.com/develop/tools/cli-installation): use `@webos-tools/cli`, not Android platform tools.
- On this specific TV the Developer Mode jail denies `listApps`, `listLaunchPoints`, system settings, and whole-screen capture on the public Luna interface. Paired SSAP can read the app and input inventory. No privilege workaround is used.

No benchmark from either Android reference establishes RAM savings, speed, or privacy on this LG. Performance and screenshot results must be measured here and recorded separately. A readable-state snapshot is not a firmware image, a login-data backup, or a guarantee against hardware/firmware faults.
