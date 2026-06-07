# New Assets Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate new bosses (Minotaur, Frost Guardian, Demon Slime), new enemies (Goblin, Orc, Ogre), and rabbit background decoration into the game; remove all trees from all regions.

**Architecture:** Frame-array animation pattern (consistent with existing codebase) — load individual PNGs as separate Phaser textures, wire into `_buildMultiAnim`, reference via `textureBase` in enemy/boss data.

**Tech Stack:** Phaser 3.60, ES modules, `src/scenes/PreloadScene.js`, `src/data/enemies.js`, `src/data/bosses.js`, `src/data/regions.js`, `src/scenes/GameScene.js`

---

## Asset Inventory

### New Bosses (individual PNG frames)

| Boss | textureBase | Path prefix | Animations | Frame counts |
|---|---|---|---|---|
| Minotaur | `mino` | `assest2/mino_v1.1_free/animations/` | idle, walk, attack | 16, 12, 16 |
| Frost Guardian | `frost` | `assest2/Frost_Guardian_FREE_v1.0/PNG files/` | idle, walk, attack, take_hit, death | 6, 10, 14, 7, 16 |
| Demon Slime | `dslime` | `assest2/boss_demon_slime_FREE_v1.0/individual sprites/` | idle, walk, attack, take_hit, death | 6, 12, 15, 5, 22 |

### New Enemies (individual PNG sequences)

| Enemy | textureBase | Path prefix | Animations | Frame counts |
|---|---|---|---|---|
| Goblin | `goblin` | `assest2/craftpix-064112-.../Goblin/PNG/PNG Sequences/` | Idle(18), Running(12), Slashing(12), Dying(15) |
| Orc | `orc_new` | `assest2/craftpix-064112-.../Orc/PNG/PNG Sequences/` | Idle(18), Running(12), Slashing(12), Dying(15) |
| Ogre | `ogre` | `assest2/craftpix-064112-.../Ogre/PNG/PNG Sequences/` | Idle(18), Running(12), Slashing(12), Dying(15) |

Filename pattern: `0_Goblin_Idle_000.png` → `0_Goblin_Idle_017.png` (zero-padded 3-digit, prefix `0_`).

### Rabbit Decoration (spritesheets)

| Asset | Key | File | Size |
|---|---|---|---|
| Brown Rabbit idle | `rabbit_idle` | `Updated Rabbit/Rabbit_Brown_Idle.png` | 512×512 |
| Brown Rabbit move | `rabbit_move` | `Updated Rabbit/Rabbit_Brown_Move.png` | 768×512 |
| Horned Rabbit idle | `rabbitH_idle` | `Updated Rabbit Horned/Rabbit_Horned_Idle.png` | 512×512 |

Frame sizes: assume 128×128 per frame (4 frames @ 512px wide, 6 frames @ 768px wide). Verify during implementation.

---

## Boss Assignments (regions.js + bosses.js)

| Region | Boss name | Old textureBase | New textureBase | Notes |
|---|---|---|---|---|
| 3 | Nagraj Kaliya | `orc2_boss` | `tree_boss` | Tree Boss sprite — already loaded |
| 4 | Pashana Daitya | `orc2_boss` | `mino` | Minotaur |
| 5 | Vayu Rakshasa | `tree_boss` | `frost` | Frost Guardian |
| 6 | Viyogasur | `slime_boss` | `dslime` | Demon Slime |

---

## Enemy Type Changes (enemies.js)

| Type key | Old textureBase | New textureBase | Scale | Regions used |
|---|---|---|---|---|
| `melee` | `orc` (THE PACK) | `goblin` | 0.8 | 0, 1, 2 |
| `ranged` | `archer` | `archer` (unchanged) | 1.0 | 1, 2, 3 |
| `flying` | `lancer` | `lancer` (unchanged) | 0.6 | 3, 4, 5, 6 |
| `elite` | `orc2` (THE PACK) | `ogre` | 1.0 | 2, 3, 4, 5, 6 |
| `orc` (NEW) | — | `orc_new` | 0.9 | 2, 3, 4 |

Old `orc` and `orc2` THE PACK textures stay loaded (still referenced by tree_boss animations indirectly via existing multi-anim builds — safe to leave in PreloadScene).

---

## Region Enemy Type Updates (regions.js)

| Region | Enemy types |
|---|---|
| 0 | `['melee']` (tutorial — goblin only) |
| 1 | `['melee']` |
| 2 | `['melee', 'ranged', 'orc']` |
| 3 | `['orc', 'ranged', 'flying']` |
| 4 | `['orc', 'elite', 'flying']` |
| 5 | `['ranged', 'elite', 'flying']` |
| 6 | `['melee', 'elite', 'flying']` |

---

## Tree Removal

In `GameScene.js`, in both `_buildDenseForest()` and `_buildRegionDecorations()`:
- Delete the entire tree Poisson-disk loop (the block that pushes to `this._treePositions`)
- Keep only the bush Poisson-disk loop
- `this._treePositions` will remain empty — occlusion system gracefully handles no trees

---

## Rabbit Decoration

Add a `_spawnRabbitDecoration()` method in `GameScene.js`, called from `create()` only for regions 0, 1, 2 (forest regions). Spawn 6–10 brown rabbits and 3–5 horned rabbits as `Phaser.GameObjects.Sprite` objects playing their idle animation on a loop. Place them randomly in the forest zone (x > 900), scale `2.5` to make them visible. They are purely visual — no physics, no interaction.

---

## Files Changed

| File | Change |
|---|---|
| `src/scenes/PreloadScene.js` | Load all new boss/enemy/rabbit frames; create `_buildMultiAnim` for each |
| `src/data/enemies.js` | Update `melee` and `elite` textureBase/scale; add `orc` type |
| `src/data/bosses.js` | Update `textureBase` for Nagraj Kaliya, Pashana Daitya, Vayu Rakshasa, Viyogasur |
| `src/data/regions.js` | Update `enemyTypes` per region |
| `src/scenes/GameScene.js` | Remove tree loops; add `_spawnRabbitDecoration()` |
