# Vampire Survivors — Build Planner

An interactive build planner for [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/), supporting the base game and all DLCs (Moonspell, Foscari, Emergency Meeting, Guns N' Gore, Ode to Castlevania, Emerald Diorama).

**[→ Open the planner](https://henriquemf.github.io/vs-build-planner)**

Fork of [Danmer/vs-build-planner](https://github.com/Danmer/vs-build-planner) with extended DLC5 and DLC6 support.

---

## Features

- **Build selection** — pick a character, weapons, passives, arcanas, and stage
- **Evolution chains** — see what items combine into evolutions, highlighted on selection
- **Impact analysis** — see which other items are affected by your current selection
- **Build sharing** — build is encoded in the URL hash, shareable via copy-paste
- **Character animations** — hover over a character card to play their walk animation
- **DLC toggles** — show/hide content per DLC (1 through 6) and Extra Content
- **Display options** — pixel mode, zoom, combination/impact labels, sorting

---

## Project Structure

```
vs-build-planner/
├── index.html          # Single-page app (Vue 3 + all CSS/logic inline)
├── data.js             # All game data: characters, weapons, evolutions, passives, arcanas, stages
├── icons.css           # Sprite icons as base64 PNG, one CSS class per item
├── img/
│   └── characters/     # Walk animation GIFs, one per character (e.g. leon.gif)
└── scripts/
    ├── setup.sh                  # Main setup script — run this first
    ├── extract-unity-icons.py    # Extracts DLC5/6 icons from Unity asset bundles (requires UnityPy)
    ├── build-data.js             # Parses legacy Electron game files into data.js / icons.css
    ├── build-images.js           # Generates character GIFs from legacy Electron sprite atlases
    ├── extract-dlc-icons.js      # Extracts DLC icons from legacy Electron version
    └── list-frames.js            # Debug utility — lists all sprite frame names from atlases
```

---

## Setup

> **Requires:** Vampire Survivors installed via Steam on macOS.  
> The scripts read directly from the game files — the game must be installed locally to regenerate assets.

### 1. Run the setup script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script auto-detects the game installation, checks for dependencies (ImageMagick, Python 3, UnityPy), and extracts DLC5/DLC6 sprite icons into `icons.css`.

If the game is in a non-standard path:

```bash
./scripts/setup.sh "/path/to/Vampire Survivors"
```

### 2. Generate character GIFs (base game + DLC1–4)

Requires the Electron game version files in `scripts/src/` (legacy):

```bash
node scripts/build-images.js
```

### 3. Open the planner

Open `index.html` directly in a browser or serve it with any static server:

```bash
npx live-server .
```

---

## Updating for new patches

### Base game / DLC1–4 (Electron version)

1. Copy the updated files into `scripts/src/` (see comment at top of `build-data.js` for the list)
2. Run `node scripts/build-data.js` to regenerate `data.js` and `icons.css`
3. Run `node scripts/build-images.js` to regenerate character GIFs

### DLC5 / DLC6 (Unity version)

1. Run `./scripts/setup.sh` — it re-runs the Unity extraction automatically
2. New icons are appended to `icons.css` (existing ones are skipped)
3. Character walk GIFs for new characters must be generated manually via `extract-unity-icons.py` logic or added individually

---

## Adding a new character or weapon manually

### 1. Add entry to `data.js`

```js
// Character
{ "id": "mychar", "name": "My Character", "emoji": ":question:", "dlc5": true,
  "itemIds": ["someweapon"], "description": "Starts with Some Weapon." }

// Weapon
{ "id": "myweapon", "name": "My Weapon", "emoji": ":question:", "dlc5": true,
  "description": "Does something." }

// Evolution
{ "id": "myevo", "name": "My Evolution", "emoji": ":question:", "dlc5": true,
  "itemIds": ["myweapon", "somepassive"], "description": "Evolved My Weapon." }
```

Valid DLC flags: `dlc1`, `dlc2`, `dlc3`, `dlc4`, `dlc5`, `dlc6`, `extra`.  
Characters also accept `special: true` to render with a distinct border.

### 2. Add CSS icon to `icons.css`

```css
.icon-mychar {
  background-image: url("data:image/png;base64,...");
  background-size: 3.2em 3.2em;   /* only for characters */
  background-position: left bottom; /* only for characters */
}
```

To extract the sprite from Unity bundles:

```python
import UnityPy, io, base64
env = UnityPy.load("path/to/bundle.bundle")
sprite = next(obj.read() for obj in env.objects if obj.type.name == 'Sprite' and obj.read().m_Name == 'MySprite_i01')
buf = io.BytesIO()
sprite.image.save(buf, format='PNG')
print(base64.b64encode(buf.getvalue()).decode())
```

### 3. Add walk GIF for characters

```python
from PIL import Image
frames = [sprites['MySprite_i01'].image, sprites['MySprite_i02'].image, ...]
frames[0].save('img/characters/mychar.gif',
    save_all=True, append_images=frames[1:], loop=0, duration=150, disposal=2)
```

---

## Architecture notes

- **No build step.** `index.html` is self-contained and served as-is. Vue 3 is loaded from CDN.
- **State in URL hash.** Selected item IDs are encoded in `location.hash`, making builds shareable via link.
- **Icons as base64.** All sprites are embedded as base64 in `icons.css` to avoid HTTP requests. The file is large (~570 lines) but loaded once and cached.
- **Dual sprite system for characters.** The static portrait (CSS class background-image) is shown by default. On hover, a walk animation GIF replaces it via `style.setProperty(..., 'important')`.
- **DLC5/6 asset extraction.** Uses [UnityPy](https://github.com/K0lb3/UnityPy) to read Unity asset bundles directly from the installed game.

---

## Dependencies

| Tool | Purpose | Required |
|---|---|---|
| [UnityPy](https://github.com/K0lb3/UnityPy) | Read Unity asset bundles (DLC5/6 icons) | For icon extraction |
| [ImageMagick](https://imagemagick.org) | Generate GIFs from sprite atlases | For GIF generation |
| Python 3 | Run extraction scripts | For DLC5/6 setup |
| Node.js | Run legacy build scripts | For base game setup |

Install Python dependencies:

```bash
pip install UnityPy
```

Install ImageMagick (macOS):

```bash
brew install imagemagick
```

---

## Known limitations

- Asset extraction requires the game installed locally — sprites cannot be redistributed due to copyright.
- DLC5/6 character GIFs are extracted from Unity bundles and may occasionally use wrong sprite sheets if a bundle groups multiple characters together. The `ITEM_MAP` in `extract-unity-icons.py` specifies explicit sprite names for known problem cases.
- Extra Content weapons (Chaos Rune, Glass Fandango, Santa Javelin, Gaze of Gaea and their evolutions) are not obtainable via normal progression and appear in a separate section.

---

## Credits

- Original planner: [Danmer/vs-build-planner](https://github.com/Danmer/vs-build-planner)
- Game: [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/) by poncle
- DLC5 — Ode to Castlevania, DLC6 — Emerald Diorama
