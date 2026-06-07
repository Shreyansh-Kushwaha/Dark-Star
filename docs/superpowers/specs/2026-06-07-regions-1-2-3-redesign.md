# Regions 1–3 Redesign + Menu Region Select
**Date:** 2026-06-07
**Status:** Approved

---

## Overview

Complete redesign of Regions 1, 2, and 3 to give each a distinct gameplay identity, rebalance boss placement so Region 3 carries the first real boss, and add a "Load Region" selector to the main menu for direct level access.

A universal tree-occlusion highlight system (ghost/X-ray style) is added across all regions that have large trees.

---

## Region 1 — Mahāvana, The Great Forest

### Layout
World split roughly 40/60: left 40% is a forest hermit camp (village), right 60% is dense Poisson-disk forest.

### Village half (x: 120–1280)
- Rough woodland camp: 3–4 huts, campfire, well — same fence/hut visual style as Region 0 but themed as a hermit outpost (darker palette, overgrown look)
- **3 NPCs:**
  - **Mahavana Hermit** (key NPC) — gives the main lore fragment; talking to him unlocks the exit portal
  - **Forest Scholar** — side quest: kill 5 forest spirits for a research item
  - **Lost Merchant** — flavour dialogue, hints about Region 2

### Forest half (x: 1280–3200)
- Dense Poisson-disk tree/bush placement (same algorithm as current `_buildDenseForest`)
- **6 enemies total, scattered — no spawner respawn:**
  - 2 solo melee enemies (easy, separated from each other)
  - 1 group of 3 melee enemies clustered near a large tree (first "ambush" feel)
  - 1 solo melee enemy near far end
- Enemies are weak (difficulty 0.5×)
- **Portal unlock condition:** talk to Mahavana Hermit (story gate, not combat)
- Ghost highlight active (characters fade to 40% alpha when behind a tree that occludes them)

### Region data changes
```
bossKey: null
difficulty: 0.5
enemySpawnMode: 'fixed'   // new field — no spawner timer, fixed positions
fixedEnemies: [
  { x: 1500, y: 800,  type: 'melee', group: false },
  { x: 1800, y: 1300, type: 'melee', group: false },
  { x: 2100, y: 700,  type: 'melee', group: true, count: 3 },  // cluster
  { x: 2600, y: 1100, type: 'melee', group: false },
]
portalUnlock: 'npc_talk:mahavana_hermit'
```

---

## Region 2 — Vrindavana, The Sacred Grove

### Layout
Full open forest — no village zone. Brighter green palette (0x5a8c3a). Trees and bushes across the whole map using standard decoration pass.

### Enemies
Scattered across the world in a mix of solo placements and small clusters to create tension:
- **Total: 12–15 enemies placed at world start, no respawn**
- Mix of types: melee (6), ranged (5), elite (2–3)
- Placement pattern:
  - Some singles guarding paths
  - 2–3 small clusters of 2–3 same-type enemies grouped tightly
  - Elites placed alone at choke points (near tree stands)
- Enemies placed at `fixedEnemies` positions (same new field as Region 1)

### NPCs
- **Vrindavana Sage** (near spawn) — main lore, side quest (kill 12 enemies)
- **Vrindavana Dancer** — pressure plate puzzle side quest

### Portal unlock condition
Portal unlocks automatically the moment `enemies.filter(e => e.alive).length === 0` AND at least one enemy has already been killed (guard against instant trigger on load). A toast notification reads "The grove is cleansed — the path opens."

### Region data changes
```
bossKey: null
difficulty: 1.4
enemySpawnMode: 'fixed'
portalUnlock: 'kill_all'
```

### Ghost highlight
Active — important since trees are large and numerous.

---

## Region 3 — Nāga Pātāl, The Serpent Realm

### Visual theme
- **No large trees.** Decoration: scattered boulders/rocks, snake den mounds (small oval Graphics shapes), glowing amber pools (small ellipses with 0xffaa22 fill at low alpha), small dry shrubs (bush sprites at 1.2–1.5× scale)
- Orange-brown ground palette unchanged (0x8b5a1a)

### Enemies
Scattered in a mix of groups and solo units:
- 2 spawner positions (respawning every 25 s) — melee+flying mix, ranged+flying mix
- Some fixed pre-placed enemies near entrance for immediate engagement
- Difficulty 1.8×

### NPCs
- **Naga Oracle** — main lore, side quest (collect 15 naga scale kills)
- **Naga Merchant** — flavour + side quest

### Boss
- **Nagraj Kaliya** — first full boss fight, 3-phase, posture bar
- Portal locked until boss defeated (existing `boss_killed` event flow)
- Ghost highlight not relevant (no large trees)

---

## Universal: Tree Occlusion Ghost Highlight

### How it works
In `GameScene.update()`, each frame:
1. Build a list of all tree sprite positions and approximate radii (from `_treePositions`)
2. For each player and enemy sprite:
   - Check if the sprite's centre falls within the trunk/canopy zone of any tree where `tree.y > sprite.y` (tree is in front of the sprite in y-sort order)
   - If overlapping: set `sprite.setAlpha(0.38)`
   - If not overlapping: restore alpha to `1.0` (or previous value if the sprite has its own alpha state)
3. Uses a simple circle-overlap check per tree (radius ≈ `scale × 28` px for craftpix trees)

### Performance
Tree list is built once in `_buildDenseForest` / `_buildRegionDecorations` into `this._treePositions` (already exists). Per-frame check is O(sprites × trees) — acceptable for ≤50 trees and ≤20 sprites.

### Implementation location
New private method `_updateOcclusionAlpha()` called from the main `update()` loop, enabled only in regions with `this._treePositions.length > 0`.

---

## Main Menu: Load Region Selector

### UI
New button on the main menu: **"LOAD REGION"** — same style as existing buttons, placed below the main play buttons.

Clicking opens an inline submenu (slides in below the button, no scene change) showing all 7 regions as selectable rows:

```
[ 0 — Gramavana · The Forest Village      ]
[ 1 — Mahāvana · The Great Forest         ]
[ 2 — Vrindavana · The Sacred Grove       ]
[ 3 — Nāga Pātāl · The Serpent Realm      ]
[ 4 — Deva Mandira · Temple of the Gods   ]
[ 5 — Swarga Seema · Edge of Heaven       ]
[ 6 — Viyoga Durga · Fortress of Separation ]
```

Clicking any row immediately starts `GameScene` at that `regionIndex`. No save data is used or written when loading directly.

### Implementation
- `_makeRegionSelect()` method in `MainMenuScene`
- Toggled by the "LOAD REGION" button (show/hide)
- Each row is a Zone + text, same interactive Zone pattern used for other buttons
- The submenu panel uses a `Phaser.GameObjects.Rectangle` background + scrollable text rows

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/regions.js` | Redesign regions 1, 2, 3 — add `enemySpawnMode`, `fixedEnemies`, `portalUnlock` fields |
| `src/data/quests.js` | Add dialogue for Forest Scholar, Lost Merchant; update Mahavana Hermit lines |
| `src/scenes/GameScene.js` | Handle `fixedEnemies` spawn mode; `kill_all` portal unlock; `_updateOcclusionAlpha()`; build serpent realm decoration for region 3 |
| `src/scenes/MainMenuScene.js` | Add "LOAD REGION" button + `_makeRegionSelect()` submenu |

---

## What Does NOT Change

- Region 0 (Gramavana) — unchanged
- Regions 4, 5, 6 — unchanged
- Boss configs for Nagraj Kaliya, Vanaraksha, Vanasur — unchanged (Vanaraksha/Vanasur boss fight removed from their region flow, bosses just won't be triggered since `bossKey: null` for regions 1 & 2)
- Networking, save system, audio — unchanged
