# Launcher design

The screen is a quiet view over real landscapes, with the six requested apps in one large dock. An empty middle gives the photographs space. The focused app name and the dock form the primary hierarchy. TV controls stay in the upper right, the clock in the upper left. Down opens the library; Back returns to the dock and then exits normally. Native Home always returns to LG.

Palette: ink `#080c11`, deep water `#173842`, cloud `#f4f7f8`, mist `#b8c7cc`, focus `#ffffff`, clear blue `#a8d7ee`. Photographs provide the changing color. There are no running blurs or decorative glow animations.

Typeface: LG's system sans-serif on TV, system sans-serif in preview. Thin clock at 88px, app title at 56px, controls at 24px, labels at 25px at a 1920×1080 design size. Type and targets scale together; 5% safe margins protect overscan. App tiles use their names, simple original marks, and familiar brand colors.

```
  Good evening                            Inputs  Screen Share  Settings
  20:46
  Thursday, 22 October

                       landscape

  YouTube
  [ YouTube ][ Prime ][ Spotify ][ LG Channels ][ Rakuten ][ Klani IM ]
  Down for all apps                                      Lake Louise
```

The first draft was checked against the brief: Apple TV-like tiles and a dark dock are deliberate requirements, while dashboard cards, feature slogans, online feeds, a web-style hero, and dense status displays add nothing to a television home app. They are omitted. Focus moves with short transform/opacity transitions; reduced motion disables those transitions and crossfades. Wallpaper rotation defaults to ten minutes and pauses outside the app.
