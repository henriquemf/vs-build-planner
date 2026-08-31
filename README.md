# Vampire Survivors — Build Planner

An interactive build planner for [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/), covering the base game and every DLC through *Legacy of the Bloodmoon*.

**[→ Open the planner](https://henriquemf.github.io/vs-build-planner)**

Fork of [Danmer/vs-build-planner](https://github.com/Danmer/vs-build-planner), extended with DLC 5–8.

---

## Features

- **Build selection** — pick a character, weapons, passives, arcanas and a stage
- **Evolution chains** — see what combines into what, highlighted as you hover
- **Impact analysis** — see which items your current selection helps or hurts
- **Build sharing** — the build lives in the URL hash, so a link is a build
- **Character animations** — hover a character card to play its walk cycle
- **DLC toggles** — show or hide each DLC's content
- **Display options** — pixel mode, zoom, combination/impact labels, sorting

---

## Project structure

```
vs-build-planner/
├── index.html               markup only — no inline CSS or JS
├── css/
│   ├── app.css              layout and theme
│   └── icons.css            one `.icon-<id>` rule per item
├── data/                    game data, one file per collection, each appending to window.vs
│   ├── characters.js  weapons.js  evolutions.js  counterparts.js
│   ├── passives.js  powerups.js  arcanas.js  pickups.js  structures.js  stages.js
│   ├── impacts.js           which stats/items each item benefits from
│   └── character-gifs.js    generated list of the walk animations that exist
├── js/                      application, loaded in dependency order
│   ├── util.js              DLC flags, roman numerals, button feedback
│   ├── config.js            display settings, persisted to localStorage
│   ├── catalog.js           indexes data/ into `items` + `itemsById` + derived fields
│   ├── selection.js         the build: selected ids, derived slots, hash sync
│   ├── impacts.js           derives the impact graph from data/impacts.js
│   ├── highlight.js         hover highlighting
│   ├── share.js             reset / copy link / copy emojis / copy + save image
│   ├── portraits.js         character walk-animation swapping
│   ├── components.js        BuildSlot, ObjectTile, ImpactStrip, CombinationList,
│   │                        CollapsibleSection, ToggleButton
│   └── app.js               wires it together and mounts Vue
├── img/
│   ├── characters/          walk animations, one .gif per character
│   ├── icons/               sprites too large to inline in css/icons.css
│   └── logos/               footer links
└── scripts/
    ├── build-data.js        parses the legacy Electron game files into data/ + css/icons.css
    ├── build-images.js      generates character GIFs from the sprite atlases
    ├── build-gif-manifest.js  regenerates data/character-gifs.js
    └── lib/emit.js          writes the data/ + css/ + img/icons/ layout
```

### Architecture notes

- **No build step.** Everything is served as-is; Vue 3 comes from a CDN — the *production*
  build, which is 146 KB against 516 KB for the development one. It still ships the
  template compiler, which is what lets the components below be plain strings. Open
  `index.html` through any static server (`npx live-server .`) or just double-click it.
- **Components.** The repeated markup lives in `js/components.js` and is registered
  globally. `config`, `itemsById` and `impactsById` reach them through provide/inject
  rather than a prop chain.
- **Plain scripts, not modules.** Each file in `js/` is an IIFE that hangs one factory off
  `window.VSP`, and `index.html` lists them in dependency order. That keeps the page
  working from `file://`, which ES modules would break. Every tag is `defer`, so the
  browser downloads them in parallel and still runs them in order.
- **State in the URL.** Selected ids are encoded in `location.hash` — that is the whole
  persistence layer for a build. Ids that no longer exist are ignored, so an old link
  degrades instead of breaking.
- **Icons.** Sprites under ~3 KB are inlined into `css/icons.css` as data URIs; anything
  larger (stage cards, boss portraits) is a file in `img/icons/`, which keeps the
  render-blocking stylesheet small.
- **Debugging.** `window.vsp` exposes `config`, `catalog`, `selection` and `impactsById`
  from the browser console.

---

## Adding content by hand

Most updates are just data. Add the entry to the right file in `data/`:

```js
// data/characters.js
{ "id": "mychar", "name": "My Character", "emoji": ":question:", "dlc8": true,
  "itemIds": ["someweapon"], "description": "Starts with Some Weapon." }

// data/weapons.js
{ "id": "myweapon", "name": "My Weapon", "emoji": ":question:", "dlc8": true,
  "description": "Does something.", "rarity": 80 }

// data/evolutions.js  — itemIds is the full recipe: base weapon + required passive
{ "id": "myevo", "name": "My Evolution", "emoji": ":question:", "dlc8": true,
  "itemIds": ["myweapon", "somepassive"], "description": "Evolved My Weapon." }
```

Valid DLC flags are `dlc1` … `dlc8`, plus `extra: true` for content outside normal
progression and `special: true` to render a distinct border.

An item with no sprite still renders — it gets a dashed “?” placeholder — so data can land
before the artwork does.

### Adding the sprite

Add one rule to `css/icons.css`:

```css
.icon-myweapon { background-image: url("data:image/png;base64,…"); }
```

Characters also carry an explicit size so pixel art renders at a constant 10px per em:

```css
.icon-mychar { background-image: url("data:image/png;base64,…"); background-size: 3.2em 3.2em; background-position: left bottom; }
```

Keep that under `6em` in either direction — that is the size of the character slot, and a
larger sprite gets clipped. For anything over ~3 KB, save the PNG to `img/icons/` and
point at it instead: `url("../img/icons/myweapon.png")`.

### Adding a walk animation

Drop `img/characters/<id>.gif` in place, then:

```bash
node scripts/build-gif-manifest.js
```

Only the characters listed in `data/character-gifs.js` are preloaded or hovered, so
skipping this step means the animation is simply never shown.

### Supporting a new DLC

1. Add the flag to `VSP.DLC_FLAGS` in [js/util.js](js/util.js)
2. Add a `.dlcN` background colour to [css/app.css](css/app.css)

The toggle button, the filtering and the tile colouring all follow from those two.

---

## Regenerating from the game files

> Requires Vampire Survivors installed locally, plus ImageMagick on `PATH`. The extraction
> scripts read the game's own files — sprites are not redistributable.

```bash
node scripts/build-data.js      # -> scripts/dst/data/, scripts/dst/css/, scripts/dst/img/icons/
node scripts/build-images.js    # -> character GIFs
```

Both need `scripts/src/` populated with the game's own files.

`build-data.js` targets the legacy Electron build of the game. Content from DLC 5 onward
was added by hand from the [wiki](https://vampire.survivors.wiki/), which is the practical
route for new patches.

---

## Known limitations

- Newly added items have no entry in `data/impacts.js`, so they show no impact markers and
  do not take part in “sort by impacts”.
- 104 of the 228 characters have no walk animation yet.
- The page reports to the upstream author's Yandex.Metrika counter (inherited from the
  original project).

---

## Credits

- Original planner: [Danmer/vs-build-planner](https://github.com/Danmer/vs-build-planner)
- Game: [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/) by poncle
