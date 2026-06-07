# Performance Optimization — Design Spec
**Date:** 2026-06-07  
**Goal:** Make the game run smoothly on low-end laptops (integrated GPU, weak CPU) via transparent engine optimizations and a player-facing quality settings menu.

---

## 1. Quality Settings System

### QualitySettings singleton (`src/systems/QualitySettings.js`)
- Reads/writes `localStorage` key `akhand_quality`
- Default: `'medium'` when no saved value
- Exposes `level: 'low' | 'medium' | 'high'` and derived flags

| Flag | Low | Medium | High |
|---|---|---|---|
| `shadows` | false | true | true |
| `occlusion` | false | false | true |
| `maxEnemies` | 8 | 12 | 18 |
| `rabbits` | 0 | 12 | 12 |

### Quality cycle button in MainMenuScene
- Single button styled to match existing buttons, placed below current button stack
- Label: `>  QUALITY: MEDIUM` (reflects current level)
- Click cycles Low → Medium → High → Low and saves to localStorage immediately
- No separate screen; no restart required (settings apply at next scene load, which happens on every region transition)

---

## 2. Phaser Config Hardening (`src/main.js`)

Add to the Phaser config object:
```js
render: {
  powerPreference: 'high-performance',  // use discrete GPU on dual-GPU machines
  batchSize: 4096,                       // larger WebGL sprite batch before flush
},
```
Zero gameplay impact, zero risk.

---

## 3. Static Decoration Batching (`src/scenes/GameScene.js`)

### Problem
Forest regions (Mahāvana region 1, Vrindavana region 2, Serpent Realm region 3) each spawn 110–200 individual `add.image()` objects for trees/stumps/shrubs. All 25 tree PNGs are separate textures (not a texture atlas), so each image = a separate GPU texture bind + draw call per frame. This is the primary GPU bottleneck on integrated graphics.

### Fix: Bake to RenderTexture
After placing all decoration images, draw them all onto a single `RenderTexture` (3200×2000), then destroy the individual image objects.

**Result:** 200 draw calls → 1 draw call per frame for every forest region.

**VRAM cost:** ~25 MB. Acceptable — modern integrated GPUs have 4–8 GB shared memory. Phaser only rasterizes the camera viewport portion (~1280×720) each frame, so GPU cost is viewport-scale not world-scale.

**Depth:** All forest trees already use `setDepth(1)`. The RT is placed at depth 1 — correctly behind players/enemies. No depth-sorting is broken.

**Scope:** Applies to `_buildDenseForest`, `_buildSacredGroveTrees`, `_buildSerpentRealm`. Non-forest regions (0, 4, 5, 6) have only ~30 decorations with `setDepth(y)` depth-sorting — left as individual images since count is small and depth-sorting requires it.

### Fix: Bake world background Graphics
`_setupWorld` creates a `Graphics` object covering the full 3200×2000 world. Phaser re-executes Graphics draw commands every frame via the render pipeline. After drawing, snapshot to a RenderTexture and destroy the Graphics object — converting repeated command execution to a single texture draw.

---

## 4. Per-Frame CPU Optimizations (`src/scenes/GameScene.js`)

### 4a. Throttle `update_ui` event
- Current: emitted every frame (60×/sec); UIScene redraws all bars on each call
- Fix: emit every 2 frames via a `_uiThrottleCounter` increment in `update()`
- Saves ~50% of UI redraw work with no perceptible lag (bars still update at 30Hz)

### 4b. Enemy viewport culling
- Any enemy whose distance from camera centre exceeds 800px skips its full `update()` call
- Enemy still exists, still has physics body — just idles until in range
- Automatically re-enters update cycle when player approaches
- Camera centre derived from `this.cameras.main.scrollX/Y + GAME_W/2, GAME_H/2`

### 4c. Enemy hard cap
- `_spawnEnemyGroup` checks `this.enemies.length >= QualitySettings.maxEnemies` before spawning
- Spawner timer still fires but silently skips if at cap
- Prevents unbounded enemy accumulation across 25-second spawn intervals

### 4d. `setDepth` throttling
- Enemy and player `update()` currently calls `setDepth(this.y)` every frame
- Replace with: only call when `Math.abs(this.y - this._lastDepthY) > 1`, then update `_lastDepthY`
- Saves ~20 method calls/frame, eliminates redundant scene graph dirty-marking

### 4e. Throttle portal + pressure plate checks
- `_checkPortals` and `_checkPressurePlates` run distance math every frame
- Changed to every 8 frames; `_slowTickCounter` is incremented in `update()` alongside `_uiThrottleCounter`
- Imperceptible to players — these are stationary zones, not fast-moving targets

### 4f. Network timer guard
- `_netTimer` increment moved inside the `this.network?.connected` branch
- Skips timer arithmetic entirely in solo play

---

## 5. Low Quality Visual Changes

### Shadow ellipses (Player + Enemy)
- Both constructors check `QualitySettings.shadows` before creating the shadow `Ellipse` game object
- On Low: ellipse not added to Container — zero runtime cost, creation-time skip only
- On Medium/High: no change

### Rabbits
- `_spawnRabbitDecoration` checks `QualitySettings.rabbits`
- On Low (rabbits=0): returns immediately — 0 sprites, 0 tweens, 0 timers created
- On Medium/High: current behavior (up to 12 rabbits)

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/systems/QualitySettings.js` | New — singleton with localStorage persistence |
| `src/main.js` | Add `render.powerPreference` + `render.batchSize` |
| `src/scenes/MainMenuScene.js` | Add quality cycle button |
| `src/scenes/GameScene.js` | RT baking, throttling, culling, enemy cap |
| `src/entities/Enemy.js` | Shadow skip, `setDepth` throttle |
| `src/entities/Player.js` | Shadow skip |

---

## 7. Out of Scope

- Texture atlas packing (would require rebuild pipeline)
- WebWorker-based AI (Phaser physics not thread-safe)
- Mobile/touch support
- Hot-switching quality without scene restart
