# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Akhand Sutra run smoothly on low-end laptops by reducing GPU draw calls, throttling per-frame CPU work, capping enemies, and adding a Low/Medium/High quality settings menu.

**Architecture:** A new `QualitySettings` singleton reads from `localStorage` at boot and exposes flags (`shadows`, `occlusion`, `maxEnemies`, `rabbits`) consumed by entities and scenes at creation time. Static forest decorations are baked into a single `RenderTexture` per region (200 draw calls → 1). Per-frame update loops are throttled with frame counters.

**Tech Stack:** Phaser 3 (WebGL/Canvas), vanilla ES modules, `localStorage` for persistence.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/systems/QualitySettings.js` | **Create** | Singleton — localStorage persistence, level flags |
| `src/main.js` | Modify | Load QualitySettings at boot; add `render.powerPreference` + `batchSize` |
| `src/entities/Enemy.js` | Modify | Skip shadow on Low; throttle `setDepth` |
| `src/entities/Player.js` | Modify | Skip shadow on Low |
| `src/scenes/GameScene.js` | Modify | Enemy cap; viewport culling; frame throttles; RT baking; rabbit quality guard |
| `src/scenes/MainMenuScene.js` | Modify | Quality cycle button |

---

## Task 1: QualitySettings singleton

**Files:**
- Create: `src/systems/QualitySettings.js`

- [ ] **Step 1: Create the file**

```js
const LEVELS = ['low', 'medium', 'high'];
const PRESETS = {
  low:    { shadows: false, occlusion: false, maxEnemies: 8,  rabbits: 0  },
  medium: { shadows: true,  occlusion: false, maxEnemies: 12, rabbits: 12 },
  high:   { shadows: true,  occlusion: true,  maxEnemies: 18, rabbits: 12 },
};
const STORAGE_KEY = 'akhand_quality';

export const QualitySettings = {
  level: 'medium',
  shadows: true,
  occlusion: false,
  maxEnemies: 12,
  rabbits: 12,

  load() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this._apply(LEVELS.includes(saved) ? saved : 'medium');
  },

  cycle() {
    const next = LEVELS[(LEVELS.indexOf(this.level) + 1) % LEVELS.length];
    this._apply(next);
    localStorage.setItem(STORAGE_KEY, this.level);
    return this.level;
  },

  _apply(level) {
    this.level = level;
    Object.assign(this, PRESETS[level]);
  },
};
```

- [ ] **Step 2: Verify the file exists**

```bash
ls /workspaces/codespaces-blank/game/src/systems/QualitySettings.js
```
Expected: file listed with no error.

- [ ] **Step 3: Commit**

```bash
cd /workspaces/codespaces-blank/game
git add src/systems/QualitySettings.js
git commit -m "feat: add QualitySettings singleton with localStorage persistence"
```

---

## Task 2: Phaser config hardening + boot-time load

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Read the current file**

Read `src/main.js` — it's 37 lines, already in context above.

- [ ] **Step 2: Apply changes**

Add the `QualitySettings` import and boot call, and add the `render` block to the Phaser config. The full file becomes:

```js
import { PreloadScene }     from './scenes/PreloadScene.js';
import { MainMenuScene }    from './scenes/MainMenuScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { UIScene }          from './scenes/UIScene.js';
import { PauseScene }       from './scenes/PauseScene.js';
import { GameEndingScene }  from './scenes/GameEndingScene.js';
import { GAME_W, GAME_H }   from './constants.js';
import { QualitySettings }  from './systems/QualitySettings.js';

QualitySettings.load();

const config = {
  type: Phaser.AUTO,
  width:  GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0a0a',
  parent: document.body,
  pixelArt: true,
  roundPixels: true,
  render: {
    powerPreference: 'high-performance',
    batchSize: 4096,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    GameScene,
    UIScene,
    PauseScene,
    GameEndingScene,
  ],
};

const game = new Phaser.Game(config);

// Expose for debugging
window.__game = game;
```

- [ ] **Step 3: Verify**

Open the game in browser (`index.html`). Open DevTools → Console. Should see no errors. Run:
```js
window.__game.renderer.config.batchSize
```
Expected: `4096`

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add powerPreference high-performance and batchSize 4096 to Phaser config"
```

---

## Task 3: Enemy.js — shadow skip + setDepth throttle

**Files:**
- Modify: `src/entities/Enemy.js`

- [ ] **Step 1: Add QualitySettings import**

At line 1 of `src/entities/Enemy.js`, add the import after the existing import:

```js
import { ENEMY_TYPES } from '../data/enemies.js';
import { QualitySettings } from '../systems/QualitySettings.js';
```

- [ ] **Step 2: Skip shadow on Low quality**

In the constructor, find this block (around line 40):

```js
// Shadow
const shadow = scene.add.ellipse(0, this.sprite.displayHeight * 0.35, 30 * (cfg.scale || 1), 10, 0x000000, 0.25);
this.addAt(shadow, 0);
```

Replace with:

```js
// Shadow
if (QualitySettings.shadows) {
  const shadow = scene.add.ellipse(0, this.sprite.displayHeight * 0.35, 30 * (cfg.scale || 1), 10, 0x000000, 0.25);
  this.addAt(shadow, 0);
}
```

- [ ] **Step 3: Add _lastDepthY to constructor**

In the constructor, after `this._coverTree = null;` (around line 26), add:

```js
this._lastDepthY = y;
```

- [ ] **Step 4: Throttle setDepth in update()**

In the `update()` method, find:

```js
this.setDepth(this.y);
```

Replace with:

```js
if (Math.abs(this.y - this._lastDepthY) > 1) {
  this.setDepth(this.y);
  this._lastDepthY = this.y;
}
```

- [ ] **Step 5: Verify**

Open the game, start a region. Enemies should still appear. On Low quality (set via `localStorage.setItem('akhand_quality','low')` in DevTools console, then reload), enemy shadow ellipses should be gone.

- [ ] **Step 6: Commit**

```bash
git add src/entities/Enemy.js
git commit -m "perf: skip enemy shadow on Low quality; throttle setDepth to only fire on y change"
```

---

## Task 4: Player.js — shadow skip

**Files:**
- Modify: `src/entities/Player.js`

- [ ] **Step 1: Add QualitySettings import**

Find the existing imports at the top of `src/entities/Player.js` (lines 1–8). Add after them:

```js
import { QualitySettings } from '../systems/QualitySettings.js';
```

- [ ] **Step 2: Wrap shadow creation**

In the constructor, find this block (around line 58):

```js
// Shadow
const shadow = scene.add.ellipse(0, 16, 40, 12, 0x000000, 0.3);
this.add(shadow);
this.addAt(shadow, 0);
```

Replace with:

```js
// Shadow
if (QualitySettings.shadows) {
  const shadow = scene.add.ellipse(0, 16, 40, 12, 0x000000, 0.3);
  this.add(shadow);
  this.addAt(shadow, 0);
}
```

- [ ] **Step 3: Verify**

On Low quality, player shadow ellipse is absent. On Medium/High, present.

- [ ] **Step 4: Commit**

```bash
git add src/entities/Player.js
git commit -m "perf: skip player shadow ellipse on Low quality"
```

---

## Task 5: GameScene.js — enemy cap + viewport culling

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add QualitySettings import**

At the top of `src/scenes/GameScene.js`, the existing imports end at line 13 (`import { NetworkManager }`). Add:

```js
import { QualitySettings } from '../systems/QualitySettings.js';
```

- [ ] **Step 2: Add enemy cap to _spawnEnemyGroup**

Find `_spawnEnemyGroup(pos, region)` (around line 313). Add a cap check as the first statement:

```js
_spawnEnemyGroup(pos, region) {
  if (this.enemies.length >= QualitySettings.maxEnemies) return;
  const types = region.enemyTypes || ['melee'];
  // ... rest unchanged ...
```

- [ ] **Step 3: Add viewport culling to the enemy update loop**

In `update(time, delta)`, find the enemy loop (around line 808):

```js
// ── Enemies ───────────────────────────────────────────────────
for (let i = this.enemies.length - 1; i >= 0; i--) {
  const e = this.enemies[i];
  if (!e || !e.active) { this.enemies.splice(i, 1); continue; }
  e.update(time, delta, this.players, this._treePositions);
}
```

Replace with:

```js
// ── Enemies ───────────────────────────────────────────────────
const cam = this.cameras.main;
const camCX = cam.scrollX + GAME_W / 2;
const camCY = cam.scrollY + GAME_H / 2;
for (let i = this.enemies.length - 1; i >= 0; i--) {
  const e = this.enemies[i];
  if (!e || !e.active) { this.enemies.splice(i, 1); continue; }
  const dx = e.x - camCX, dy = e.y - camCY;
  if (dx * dx + dy * dy > 640000) continue;
  e.update(time, delta, this.players, this._treePositions);
}
```

*(640000 = 800² — enemies more than 800px from camera centre skip their AI update.)*

- [ ] **Step 4: Verify**

Start a region. Enemies still spawn and attack. Spawning stops once the cap is reached (set quality to Low via DevTools → max 8 enemies). Moving the camera far away and back should not affect enemy count.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "perf: add enemy spawn cap per quality level and viewport culling for enemy AI updates"
```

---

## Task 6: GameScene.js — per-frame throttling

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Initialise throttle counters in create()**

In the `create()` method, find the block where flags are initialised (around line 163, after `this._paused = false`). Add two counters:

```js
this._uiThrottleCounter = 0;
this._slowTickCounter   = 0;
```

- [ ] **Step 2: Rewrite the update() tail**

Find the bottom section of `update()` (lines 839–871). Replace the three calls and the UI emit with the throttled version:

**Remove these lines:**

```js
    // ── Tree occlusion ghost highlight ────────────────────────────
    this._updateOcclusionAlpha();

    // ── Pressure plates ───────────────────────────────────────────
    this._checkPressurePlates();

    // ── Portals ───────────────────────────────────────────────────
    this._checkPortals();
```

and at the bottom:

```js
    // ── Network broadcast ─────────────────────────────────────────
    this._netTimer += delta;
    if (this._netTimer >= NET_INTERVAL) {
      this._netTimer = 0;
      this._netBroadcast();
    }

    // ── UI update ─────────────────────────────────────────────────
    this.events.emit('update_ui', {
      players: this.players,
      boss: this._boss?.alive ? this._boss : null,
    });
```

**Replace with:**

```js
    // ── Throttle counters ─────────────────────────────────────────
    this._uiThrottleCounter++;
    this._slowTickCounter++;

    // ── Tree occlusion (High quality only, every frame) ───────────
    if (QualitySettings.occlusion) this._updateOcclusionAlpha();

    // ── Slow tick: portals + pressure plates (every 8 frames) ─────
    if (this._slowTickCounter % 8 === 0) {
      this._checkPressurePlates();
      this._checkPortals();
    }

    // ── Network broadcast (only when connected) ───────────────────
    if (this.network?.connected) {
      this._netTimer += delta;
      if (this._netTimer >= NET_INTERVAL) {
        this._netTimer = 0;
        this._netBroadcast();
      }
    }

    // ── UI update (every 2 frames) ────────────────────────────────
    if (this._uiThrottleCounter % 2 === 0) {
      this.events.emit('update_ui', {
        players: this.players,
        boss: this._boss?.alive ? this._boss : null,
      });
    }
```

- [ ] **Step 3: Verify**

Game runs. HP bars still update during combat. Portals and pressure plates still work. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "perf: throttle UI event to every 2 frames, portals/plates to every 8 frames, guard net timer"
```

---

## Task 7: GameScene.js — rabbit quality guard

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add early return in _spawnRabbitDecoration**

Find `_spawnRabbitDecoration(regionIndex)` (around line 621). Add an early return as the second statement (after the regionIndex > 2 check):

```js
_spawnRabbitDecoration(regionIndex) {
  if (regionIndex > 2) return;
  if (QualitySettings.rabbits === 0) return;
  const forestX = 900;
  // ... rest unchanged ...
```

- [ ] **Step 2: Verify**

On Low quality, no rabbit sprites in forest regions. On Medium/High, rabbits appear as before.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "perf: skip rabbit decorations on Low quality"
```

---

## Task 8: GameScene.js — bake static decorations to RenderTexture

This is the biggest GPU win. Three forest-building methods are changed to bake their images into a single `RenderTexture` instead of keeping 110–200 individual image game objects.

**Files:**
- Modify: `src/scenes/GameScene.js`

### Sub-task 8a: _buildDenseForest

- [ ] **Step 1: Replace the image-creation loop in _buildDenseForest**

Find `_buildDenseForest(region)` (around line 412). The current loop is:

```js
    for (const pt of points) {
      const wx = pt.x + forestX;
      const r  = Math.random();
      let key, scale;
      if (r < 0.20) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.60) {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
      }
      this.add.image(wx, pt.y, key).setScale(scale).setDepth(1);
    }
```

Replace with:

```js
    const rt = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(1);
    rt.beginDraw();
    for (const pt of points) {
      const wx = pt.x + forestX;
      const r  = Math.random();
      let key, scale;
      if (r < 0.20) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.60) {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
      }
      const img = this.make.image({ x: wx, y: pt.y, key, add: false });
      img.setScale(scale);
      rt.batchDraw(img, 0, 0);
    }
    rt.endDraw();
```

### Sub-task 8b: _buildSacredGroveTrees

- [ ] **Step 2: Replace the image-creation loop in _buildSacredGroveTrees**

Find `_buildSacredGroveTrees(region)` (around line 484). The current loop is:

```js
    for (const pt of points) {
      const r = Math.random();
      let key, scale, tint = null;
      if (r < 0.35) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.80) {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x336622;
      }
      const img = this.add.image(pt.x, pt.y, key).setScale(scale).setDepth(1);
      if (tint !== null) img.setTint(tint);
    }
```

Replace with:

```js
    const rt = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(1);
    rt.beginDraw();
    for (const pt of points) {
      const r = Math.random();
      let key, scale, tint = null;
      if (r < 0.35) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.80) {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x336622;
      }
      const img = this.make.image({ x: pt.x, y: pt.y, key, add: false });
      img.setScale(scale);
      if (tint !== null) img.setTint(tint);
      rt.batchDraw(img, 0, 0);
    }
    rt.endDraw();
```

### Sub-task 8c: _buildSerpentRealm (dead trees only)

- [ ] **Step 3: Replace the dead-tree loop in _buildSerpentRealm**

In `_buildSerpentRealm(region)` (around line 600), find the final loop over `deadPts`:

```js
    const deadPts = poissonDisk(WORLD_W, WORLD_H, 80, 110, deadExcl, 9012);
    for (const pt of deadPts) {
      const r = Math.random();
      let key, scale, tint;
      if (r < 0.55) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
        tint  = 0x7a4422;
      } else if (r < 0.85) {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
        tint  = 0x4a2800;
      } else {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x2a1200;
      }
      this.add.image(pt.x, pt.y, key).setScale(scale).setDepth(1).setTint(tint);
    }
```

Replace with:

```js
    const deadPts = poissonDisk(WORLD_W, WORLD_H, 80, 110, deadExcl, 9012);
    const rtDead = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(1);
    rtDead.beginDraw();
    for (const pt of deadPts) {
      const r = Math.random();
      let key, scale, tint;
      if (r < 0.55) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
        tint  = 0x7a4422;
      } else if (r < 0.85) {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
        tint  = 0x4a2800;
      } else {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x2a1200;
      }
      const img = this.make.image({ x: pt.x, y: pt.y, key, add: false });
      img.setScale(scale);
      img.setTint(tint);
      rtDead.batchDraw(img, 0, 0);
    }
    rtDead.endDraw();
```

- [ ] **Step 4: Verify**

Load regions 1, 2, and 3 in the game. Trees and stumps should visually look identical to before (same positions, same scales). Open Chrome DevTools → Performance tab → record 5 seconds of gameplay in a forest region. Compare frame time before/after — should see meaningful reduction.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "perf: bake forest tree decorations into RenderTexture — 200 draw calls to 1 per region"
```

---

## Task 9: MainMenuScene.js — quality cycle button

**Files:**
- Modify: `src/scenes/MainMenuScene.js`

- [ ] **Step 1: Add QualitySettings import**

At the top of `src/scenes/MainMenuScene.js`, after the existing imports:

```js
import { GAME_W, GAME_H, REGION_NAMES } from '../constants.js';
import { SaveManager } from '../systems/SaveManager.js';
import { QualitySettings } from '../systems/QualitySettings.js';
```

- [ ] **Step 2: Add quality button in _drawButtons()**

In `_drawButtons()`, after the last `_makeButton` call (the `LOAD REGION` button at y=420) and before the `this._regionSelectPanel = null` line, add:

```js
    this._qualityBtn = this._makeButton(cx, 480, this._qualityLabel(), () => this._cycleQuality(),
      { bg: 0x0c1428, border: 0x2244aa, text: '#88aaff', w: 200 });
```

Then add two helper methods to the class (before the closing brace of the class, after `update() {}`):

```js
  _qualityLabel() {
    return `>  QUALITY: ${QualitySettings.level.toUpperCase()}`;
  }

  _cycleQuality() {
    QualitySettings.cycle();
    this._qualityBtn.txt.setText(this._qualityLabel());
  }
```

- [ ] **Step 3: Verify**

Open the main menu. A `>  QUALITY: MEDIUM` button appears below `LOAD REGION`. Clicking it cycles through LOW → HIGH → MEDIUM (and wraps). Refreshing the page preserves the setting. Starting the game and returning shows the correct level.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MainMenuScene.js
git commit -m "feat: add quality cycle button (Low/Medium/High) to main menu"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** QualitySettings ✓ | Phaser config ✓ | Shadow skip (Enemy + Player) ✓ | setDepth throttle ✓ | Enemy cap ✓ | Viewport culling ✓ | update_ui throttle ✓ | portal/plates slow tick ✓ | net guard ✓ | rabbit quality ✓ | RT baking (3 methods) ✓ | Quality button ✓
- [x] **No placeholders:** All tasks contain complete code
- [x] **Type consistency:** `QualitySettings.maxEnemies`, `QualitySettings.shadows`, `QualitySettings.rabbits`, `QualitySettings.occlusion` used consistently across tasks; `rt.beginDraw()`/`rt.batchDraw()`/`rt.endDraw()` used consistently in Task 8
- [x] **Import paths:** `'../systems/QualitySettings.js'` for entities/scenes; `'./systems/QualitySettings.js'` for main.js
