# Third-party notices

MyOwnTV's new code uses this repository's existing GPL-3.0 license. The Android reference code and fonts are not bundled. Their architecture and safety workflow informed this new webOS implementation. See `docs/reference-analysis.md` for exact revisions and review coverage.

Photographs have separate CC BY-SA licenses and notices in `WALLPAPER-CREDITS.md`. The photographic collection is independent of the application code. App names are their respective owners' trademarks, used to identify installed applications. The geometric shortcut marks and MyOwnTV mountain icon are original project artwork; they are not official app logos. This project is not affiliated with LG, Apple, or the streaming providers.

LG's `@webos-tools/cli` (Apache-2.0) packages and installs the app on the development computer. esbuild (MIT) bundles the JavaScript. Playwright (Apache-2.0) verifies the browser UI. ssh2 (MIT) and ws (MIT) are PC tooling dependencies. None of these packages or their transitive dependencies are included as runtime libraries in the IPK. `package-lock.json` pins the PC toolchain. The shipped JavaScript is the project's own bundled source and static configuration.
