# Akhand Sutra — project guide

A browser action-RPG built on **Phaser 3** (loaded from CDN). Pure ES modules, no
bundler. Souls-like combat (light/heavy/dodge/abilities), region-based world,
optional 2-player LAN co-op.

## Run it

```bash
node server/combined_server.js      # serves the game + dev APIs on :8080
# open http://localhost:8080
```

`server/combined_server.js` is a dev-only static server **plus** a few JSON APIs
(`/api/animations`, `/api/regions`, `/api/npc-dialogue`, asset manifest) **and** a
WebSocket relay for co-op rooms. The game expects these endpoints, so a plain
static file host won't fully work (animation-pipeline creatures and editor regions
won't load).

## Runtime layout (`src/`)

- `main.js` — Phaser config + scene registry (entry from `index.html`).
- `scenes/` — `PreloadScene` (assets/anims) → `MainMenuScene` → `PrologueScene` →
  `GameScene` (the big one) with `UIScene` overlay; plus `PauseScene`,
  `WorldMapScene`, `ShrineScene`, `GameEndingScene`.
- `entities/` — `Player`, `Enemy`, `Boss`, `NPC`.
- `systems/` — `AbilityManager`, `AudioManager` (procedural WebAudio, no files),
  `AnimationLoader`, `SaveManager` (localStorage), `QuestManager`, `NetworkManager`,
  `QualitySettings`.
- `data/` — regions, quests, enemies, bosses, creature stats, codex, prop tables.
- `constants.js` — tuning values, XP curve, item defs.

### Two region systems (don't confuse them)
- `src/data/regions.js` `REGIONS[]` holds only indices **0–6** (the legacy hand-authored
  regions). `GameScene` reads these directly.
- The larger world (regions 7+) is authored in `map_editor.html`, saved as
  `regions/region_N.json`, and loaded at runtime via `/api/regions`.

### Animation pipeline
Approved animations live in `docs/animations.json` (built from
`animation_reviewer.html` → server export). `AnimationLoader` merges them with the
hand-tuned boss families in `data/bossAssets.js` into one registry.

## Scene lifecycle gotcha
`GameScene` uses `scene.restart()` for region transitions, and its `events` emitter
**persists** across restart. Any `this.events.on(...)` (GameScene) or `gs.events.on(...)`
(UIScene) must be removed on `shutdown` or it stacks a duplicate every transition
(duplicated XP/loot/UI). Both scenes register handlers from a table and `off()` them
in an `events.once('shutdown', …)`.

## Dev tools (not shipped by `index.html`)
- `map_editor.html` — region/level editor (talks to the server APIs).
- `animation_reviewer.html`, `asset_viewer.html` — asset/animation review.
- Root `gen_region*.py` / `gen_*.py` — one-shot asset/region generators.
- `tools/*.mjs` — Playwright smoke/combat/boss-load regression harnesses (run against
  the :8080 server).

## Assets
Multiple raw asset packs (`assets3/5/6`, `assest2/4`, `Tiny Swords…`, `THE PACK`, …)
are committed as source; only a fraction is referenced at runtime — the rest feed the
map-editor catalog. **Do not delete asset folders.**
