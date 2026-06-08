# Map Maker — Design Spec
**Date:** 2026-06-08  
**Status:** Approved

---

## Overview

A browser-based map editor served at `localhost:8080/map_editor.html`. Lets the developer browse all game sprite assets, place and arrange them on a 3200×2000 canvas (matching the game world size), save the scene as JSON for re-editing, and export a PNG that slots directly into `src/map/` as a region background image.

---

## Architecture

### Files changed

| File | Change |
|------|--------|
| `server/combined_server.js` | Add `GET /api/assets` route |
| `map_editor.html` | New file — the full editor (HTML + CSS + JS, self-contained) |

No other files change. The editor is only accessible while the game server is running (`npm start` from `server/`).

### Asset API endpoint

`GET /api/assets` — server walks four asset root directories at startup/request time:
- `THE PACK/`
- `Tiny Swords (Free Pack)/`
- `assest2/`
- `craftpix-net-168228-free-tree-pixel-art-asset-pack/`

**Frame detection rule:**
- A directory containing only **numbered PNG files** (e.g. `01.png`, `02.png`, `03.png`) → one animated sprite entry. The directory name is the animation name (e.g. "Idel", "ATTACK").
- A directory containing **sub-directories** that each hold numbered PNGs (e.g. `ORC/` with `Idel/`, `ATTACK/`, `Run/`, `dead/`) → each sub-directory becomes its own separate tray tile. The parent folder name is used as a prefix in the tray label ("ORC — Idel", "ORC — ATTACK", etc.).
- A **single PNG file** (not in a sequence) → one static sprite entry with `frames: ["filename.png"]`.
- A spritesheet PNG (single image, frames baked in) → treated as a static single-frame sprite.

**Response shape:**
```json
{
  "categories": [
    {
      "name": "Terrain",
      "groups": [
        {
          "name": "Trees",
          "sprites": [
            {
              "name": "Oak Tree",
              "dir": "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees",
              "frames": ["oak_tree.png"],
              "animated": false
            },
            {
              "name": "Tree Monster (idle)",
              "dir": "THE PACK/Monsters/Tree/ground Up",
              "frames": ["01.png", "02.png", "03.png", "04.png"],
              "animated": true
            }
          ]
        }
      ]
    }
  ]
}
```

### Categories and sub-groups

| Category | Sub-groups |
|----------|-----------|
| **Terrain** | Tileset, Bushes, Rocks, Rocks in Water, Clouds, Rubber Duck, Trees (craftpix) |
| **Buildings** | Black, Blue, Purple, Red, Yellow |
| **Monsters** | King Slime, ORC, ORC2, Slime, Slime 2, Tree Monster, Frost Guardian, Demon Slime, Minotaur, Goblin, Orc, Ogre, Rabbit |
| **Units** | Black, Blue, Purple, Red, Yellow (×5 unit types each) |
| **Resources** | Gold, Meat, Wood, Tools, Sheep |
| **FX** | Particle FX |

---

## Layout

**Bottom tray** layout: full-width canvas on top, collapsible asset tray along the bottom.

```
┌─────────────────────────────────────────────────────────┐
│ TOOLBAR: Open | Save JSON | Export PNG | BG | Zoom | ▶  │
├──────────────────────────────────────────┬──────────────┤
│                                          │  PROPERTIES  │
│              CANVAS (Konva)              │  X / Y       │
│              3200 × 2000 px              │  Scale       │
│              (CSS-scaled to fit)         │  Flip X      │
│                                          │  Animation ▼ │
│                                          │  [Delete]    │
├──────────────────────────────────────────┴──────────────┤
│ [Terrain] [Buildings] [Monsters] [Units] [Resources][FX]│
│ All · Tileset · Bushes · Rocks · Trees · Clouds         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  🔍 search...      │
│ │ 🌲 │ │ 🪨 │ │ 🌿 │ │ ☁️ │ │ 🦆 │                    │
│ └────┘ └────┘ └────┘ └────┘ └────┘                    │
└─────────────────────────────────────────────────────────┘
```

The right properties panel is only visible when a sprite is selected.

---

## Canvas (Konva.js)

**Library:** Konva.js loaded from CDN (no npm install needed).

### Layers (bottom → top)
1. **Background layer** — one `Konva.Rect` (solid color) or `Konva.Image` (imported PNG). Not selectable.
2. **Sprites layer** — all placed sprite objects.
3. **Selection layer** — bounding box and four corner resize handles for the currently selected sprite.

### Viewport
- Stage is 3200×2000 px. Konva's `stage.scale({x, y})` and `stage.position({x, y})` control zoom and pan.
- **Zoom:** scroll-wheel, 10%–200%, centered on cursor position (`stage.scale()` + offset adjustment to keep cursor anchor).
- **Pan:** Space+drag or middle-mouse drag.
- Zoom percentage shown in toolbar.

### Placing sprites
1. User clicks an asset tile in the bottom tray → editor enters **Place mode** (cursor becomes crosshair, selected tile highlighted in tray).
2. Click on canvas → a `Konva.Image` is created at that position using the sprite's first frame.
3. Animated sprites store `{ frames, currentFrame: 0 }` as custom data on the node.
4. Right-click or Escape cancels Place mode.

### Selecting and editing
- Click a sprite → yellow bounding box + 4 corner handles (drag to resize uniformly).
- Right panel shows: X, Y (editable number inputs), Scale (single value, uniform), Flip X (checkbox), Animation label (read-only, shows the animation folder name e.g. "Idel").
- Drag selected sprite to reposition.
- `Delete`/`Backspace` or the Delete button removes the selected sprite.

### Preview mode
- Toolbar `▶ Preview` button starts a `setInterval` at 120 ms.
- Each tick: increment `currentFrame` on every animated sprite node, update its `Konva.Image` source to the next frame PNG, redraw.
- Pressing `▶ Preview` again (becomes `⏹ Stop`) clears the interval.
- Preview mode disables canvas interaction (no click-to-place, no selection) to avoid accidents.

### Undo
- `Ctrl+Z` undoes the last destructive action: place, move (on mouseup), delete, scale.
- 20-step history stored as snapshots of the sprites-layer state (serialized JSON, same format as save file).

---

## Background

The toolbar provides two background controls:

- **Color swatch** — click opens a native `<input type="color">` picker. Updates background layer rect fill in real time. Default: `#2d5c28` (green, matching Gramavana).
- **🖼 Import button** — file picker (`<input type="file" accept="image/*">`). Loads the selected image as the background layer's `Konva.Image`, stretched to 3200×2000.

Either option can be used; the last-set state is what gets saved and exported.

---

## Save / Load (JSON)

### Save — `💾 Save JSON`
Downloads `map_editor_save.json` via a temporary `<a download>` link.

```json
{
  "version": 1,
  "background": {
    "type": "color",
    "value": "#4a7c3f"
  },
  "sprites": [
    {
      "id": "s_1749001234_0",
      "name": "ORC idle",
      "dir": "THE PACK/Monsters/ORC/Idel",
      "frames": ["01.png", "02.png", "03.png", "04.png"],
      "animation": "Idel",
      "x": 500,
      "y": 300,
      "scaleX": 1.5,
      "scaleY": 1.5,
      "flipX": false
    }
  ]
}
```

`id` is `s_<timestamp>_<index>` — unique within the file, used to correlate undo history.

### Load — `📂 Open`
File picker accepts `.json`. On load:
1. Parse and validate `version` field.
2. Clear current canvas.
3. Set background from `background` field.
4. For each sprite entry: fetch the image at `/THE PACK/Monsters/ORC/Idel/01.png` (first frame), create a `Konva.Image` at the saved position/scale, attach full frame list and animation name as node data.
5. Re-render.

If any image 404s during load, that sprite is skipped and a warning is shown in the toolbar area (non-blocking).

---

## PNG Export

`🖼️ Export PNG` uses:
```js
stage.toDataURL({
  mimeType: 'image/png',
  pixelRatio: 1,   // 1:1 = full 3200×2000 output
  x: 0, y: 0,
  width: 3200,
  height: 2000
})
```

This flattens all layers (background + sprites) into one PNG. The result is downloaded as `region_map.png` via a temporary `<a download>` link. The user then saves it into `src/map/` (e.g. `src/map/region 1.png`) and updates the region's `bgImage` path in `regions.js`.

Preview mode is stopped before export to ensure sprites are on their first frame (consistent output).

---

## Toolbar Summary

| Control | Action |
|---------|--------|
| 📂 Open | Load `.json` save file |
| 💾 Save JSON | Download current scene as `.json` |
| 🖼️ Export PNG | Download 3200×2000 PNG |
| Color swatch | Open color picker for background fill |
| 🖼 Import | Load PNG as background image |
| − / % / + | Zoom out / display / zoom in |
| ▶ Preview | Toggle animation playback |
| ✋ Pan | Tool: pan the canvas |
| 🖱 Select | Tool: select/move sprites |
| ✏️ Place | Tool: active when asset selected in tray |
| 🗑 Delete | Tool: click sprite to delete |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Delete` / `Backspace` | Delete selected sprite |
| `Escape` | Cancel Place mode / deselect |
| `Space` + drag | Pan canvas |
| Scroll wheel | Zoom |

---

## Out of Scope

- Multi-select (only one sprite selected at a time)
- Copy/paste sprites
- Grid snapping
- Redo (`Ctrl+Y`)
- Animation switching after placement (each placed sprite keeps the animation it was placed with)
- Layer reordering UI (later-placed sprites appear on top; this is intentional)
- Saving directly to `src/map/` (user manually moves the exported PNG)
- Any integration with `regions.js` — user updates that file manually
