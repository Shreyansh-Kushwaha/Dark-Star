# Asset Catalog

_Generated 2026-06-17 by `tools/catalog_assets.py` — summary view of [`assets.json`](assets.json). Regenerate both with `python3 tools/catalog_assets.py`._

## Totals

| Metric | Count |
|---|--:|
| Packs | 61 |
| Single images | 6812 |
| Spritesheet strips/grids | 1152 |
| Frame-sequence animations | 1092 |
| Tilesets | 164 |

## How assets are classified

- **`image`** — single still sprite / texture
- **`spritesheet`** — one PNG that is an animation strip or grid; frames_guess = long_side / short_side
- **`animation_frames`** — a folder of numbered frames collapsed into one entry (frame_count, frame_size)
- **`tileset`** — large image inside a tiles/tileset folder
- **`unreadable`** — file present but PIL could not decode dimensions

## Notes

- External 'New folder', 'New folder 2', 'New folder 3' are the upstream copies of the project's THE PACK/Tiny Swords, assest2, and assets3 packs respectively.
- assest4 'map_objects'/'next2' are subsets of the craftpix Fields/Village tilesets in external 'New folder 4'.
- Spritesheet frame counts are heuristic guesses from aspect ratio; verify against the pack's own grid before slicing.
- Engine note (from assets5/SOURCES.md): warrior visible body ~100px, so 16px-grid packs need 4-6x and 32px packs 2-3x nearest-neighbour upscaling.

## Packs

### `standalone packs` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| craftpix-net-168228-free-tree-pixel-art-asset-pack | environment/props | 1 | 0 | 6 (70) | 0 | CraftPix.net | CraftPix free license |
| cropped | misc | 6 | 0 | 0 | 0 | this project | project-owned |
| map | map | 1 | 0 | 0 | 0 | this project | project-owned |
| THE PACK | enemy | 4 | 0 | 17 (118) | 0 | pixel_ankousse (instagram) | Free & commercial, credit appreciated |
| Tiny Swords (Free Pack) | mega-pack | 62 | 231 | 25 (116) | 1 | Pixel Frog (itch.io) | CC0 / free |

- **craftpix-net-168228-free-tree-pixel-art-asset-pack** — Free pixel-art tree pack (multiple tree types & sizes). _(aux: 1 doc, 1 photoshop source, 2 text)_
- **cropped** — Manually cropped sprites pulled out of source packs for in-game use.
- **map** — Pre-rendered region background image used by the game scenes.
- **THE PACK** — Monsters: Slime, Slime2, King Slime, Orc, Orc2, Tree. Each split into numbered frame folders (Idle/Run/Attack/Dead). _(aux: 1 photoshop source, 1 text)_
- **Tiny Swords (Free Pack)** — Tiny Swords: colored unit factions (warrior/archer/pawn/monk/lancer), buildings, terrain tileset, decorations, resources, particle FX, UI. _(aux: 18 aseprite source)_

### `assest2` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| boss_demon_slime_FREE_v1.0 | boss | 1 | 0 | 5 (60) | 0 | LuizMelo (itch.io) | Free for commercial use |
| craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites | enemy | 30 | 0 | 54 (630) | 0 | CraftPix.net | CraftPix free license (credit, no resale) |
| Frost_Guardian_FREE_v1.0 | boss | 1 | 0 | 5 (53) | 0 | LuizMelo (itch.io) | Free for commercial use |
| mino_v1.1_free | boss/enemy | 4 | 0 | 4 (46) | 0 | LuizMelo (itch.io) | Free for commercial use |
| Monster Pack (Free) | enemy | 5 | 0 | 0 | 0 | itch.io free pack | Free |

- **boss_demon_slime_FREE_v1.0** — Demon Slime boss. Per-action spritesheets, individual frame folders (idle/walk/cleave/take_hit/death), aseprite sources, GIFs. _(aux: 1 aseprite source, 5 gif preview)_
- **craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites** — Chibi Orc / Ogre / Goblin. PNG full-anim spritesheets + PNG Sequences (frame-by-frame) + EPS/AI vector + Unity packages. _(aux: 8 text, 3 unity package, 42 vector source)_
- **Frost_Guardian_FREE_v1.0** — Frost Guardian boss. Per-action PNG frame folders (idle/atk/walk/death/take_hit) + GIF samples. _(aux: 1 aseprite source, 5 gif preview)_
- **mino_v1.1_free** — Minotaur boss. Per-action horizontal spritesheets + split frame folders (idle/walk/atk) + GIF previews + healthbar UI. _(aux: 1 aseprite source, 3 gif preview)_
- **Monster Pack (Free)** — Small critters (rabbit / horned rabbit variants) provided as animation spritesheets. _(aux: 3 gif preview)_

### `assest4` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| map_objects | environment/props | 0 | 0 | 16 (99) | 0 | CraftPix.net (Free Fields tileset) | CraftPix free license |
| next2 | environment/props | 0 | 0 | 10 (54) | 0 | CraftPix.net (Free Village tileset) | CraftPix free license |

- **map_objects** — Top-down field map objects: grass, fence, stone, decor, flowers, bushes, camp, shadows, pointers + animated flag & campfire.
- **next2** — Top-down village objects: stone, box, decor, tent, house, grass, shadows.

### `assets3` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| food | item/icon | 3 | 3 | 0 | 0 | the_steam_gamer (Fiverr) | Free |
| monsters | enemy | 2 | 21 | 1 (2) | 0 | LuizMelo 'Monsters Creatures Fantasy' | Free for commercial use |
| vfx | vfx | 0 | 0 | 26 (205) | 0 | various (itch.io VFX packs) | Free |

- **food** — Food item sprites used as pickups / consumable icons.
- **monsters** — Bat / slime / mimic / rat. Per-action horizontal spritesheet strips (idle/run/attack/hurt/death).
- **vfx** — Curated skill/spell VFX strips: fireball, frost, lightning, smoke, green, yellow.

### `assets5` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| 0x72_dungeon_tileset_ii | tileset/characters | 90 | 12 | 70 (273) | 1 | 0x72 | CC0 |
| cainos_pixel_art_top_down | tileset/props | 9 | 0 | 0 | 3 | Cainos | CC0 |
| dungeon_crawl_32x32_cc0 | mega-pack/tiles | 4552 | 0 | 301 (1477) | 0 | Dungeon Crawl Stone Soup team | CC0 |
| kenney_fantasy-ui-borders | ui | 2 | 0 | 12 (280) | 0 | Kenney | CC0 |
| kenney_roguelike-characters | characters | 4 | 0 | 0 | 0 | Kenney | CC0 |
| kenney_roguelike-rpg-pack | tileset | 3 | 0 | 1 (2) | 0 | Kenney | CC0 |
| mystic_woods | tileset/characters | 12 | 9 | 3 (14) | 1 | Game Endeavor | NON-COMMERCIAL ONLY (free version) |
| ninja_adventure_pack | mega-pack | 1197 | 445 | 103 (257) | 16 | Pixel-Boy & AAA | CC0 |
| shikashi_fantasy_icons | ui/icons | 10 | 0 | 1 (7) | 0 | Shikashi | Free commercial (credit appreciated; some CC-BY 3.0 game-icons.net) |

- **0x72_dungeon_tileset_ii** — 16px dungeon tileset II: walls/floors, animated wall fountains, spikes, chests, small heroes & monsters.
- **cainos_pixel_art_top_down** — Clean 32px top-down grass/stone tiles, ruin pillars & walls, props, wood structures. _(aux: 1 text, 1 unity package)_
- **dungeon_crawl_32x32_cc0** — ~6000 individual 32px PNGs: statues, altars, floors (lava/ice/desert), demons, undead, gems, bones, items, effects. _(aux: 2 text)_
- **kenney_fantasy-ui-borders** — 282 PNG panel/dialog/button borders (gold, stone, wood themes). _(aux: 1 text)_
- **kenney_roguelike-characters** — 450 16px character variation spritesheet (NPC variety). _(aux: 2 text)_
- **kenney_roguelike-rpg-pack** — 1700+ tile spritesheet (16px grid): snow & desert terrain, interiors, props. _(aux: 2 text, 2 tiled map)_
- **mystic_woods** — Painterly 16px forest/village tiles, animated player & slime. Style reference / non-commercial only. _(aux: 2 text)_
- **ninja_adventure_pack** — Ninja Adventure: 95 NPC chars (4-dir walk), 66 monsters, 20 bosses, 27 animals, 140 items, multiple tilesets, FX, UI, music & SFX. _(aux: 188 audio, 1 font, 128 gif preview, 2 text; 188 audio files)_
- **shikashi_fantasy_icons** — 245 32px item/skill icons: potions, gems, weapons, status effects. _(aux: 1 text)_

### `assets6` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| animal | creature | 31 | 4 | 0 | 14 | itch.io free pack | See license.txt |
| animal 2 | creature | 52 | 10 | 0 | 52 | itch.io free pack | See license.txt |
| enemy | enemy/boss | 1 | 26 | 2 (6) | 0 | itch.io free packs | See license.txt |
| enemy 2 | boss | 204 | 3 | 75 (1002) | 0 | itch.io free packs | See license.txt |
| enemy 3 | boss | 30 | 0 | 54 (630) | 0 | CraftPix-style | See license.txt |
| enemy 4 | boss | 204 | 3 | 75 (1002) | 0 | itch.io free packs | See license.txt |
| minotaur | boss | 1 | 15 | 0 | 0 | itch.io free pack | See license.txt |
| slime | enemy | 60 | 57 | 0 | 42 | itch.io free pack | See license.txt |

- **animal** — Animal sprites — PNG anims + PSD/Aseprite/Tiled sources. _(aux: 64 aseprite source, 1 doc, 8 photoshop source, 2 text, 1 tiled map)_
- **animal 2** — Second animal set — PNG anims + PSD/Aseprite/Tiled sources. _(aux: 104 aseprite source, 104 photoshop source, 2 text, 1 tiled map)_
- **enemy** — Skeleton, Plent (plant), Fire Spirit enemies with PSD sources + PNG animations. _(aux: 1 doc, 3 photoshop source, 2 text)_
- **enemy 2** — Faction leader bosses: Maya / Nordic / Aztec leaders (PNG animations). _(aux: 1 text)_
- **enemy 3** — Seer enemies (Seer_1/2/3) with PNG animations + TXT info. _(aux: 7 text, 3 unity package, 42 vector source)_
- **enemy 4** — Viking Leader, Caveman Boss, Giant Goblin (PNG animations). _(aux: 1 text, 150 vector source)_
- **minotaur** — Minotaur boss variants (Minotaur_1/2/3) with PSD + PNG animations. _(aux: 1 doc, 3 photoshop source, 2 text)_
- **slime** — Slime enemy — PNG anims + PSD/Aseprite/Tiled sources. _(aux: 72 aseprite source, 1 doc, 18 photoshop source, 2 text, 3 tiled map)_

### `assets_custom` — project

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| anim | vfx | 2 | 6 | 0 | 0 | this project (gen_*.py) | project-owned |
| props | props | 70 | 3 | 0 | 0 | this project (gen_props*.py) | project-owned |
| rocks_basalt | props | 0 | 0 | 1 (4) | 0 | this project (gen_*.py) | project-owned |
| rocks_sand | props | 0 | 0 | 1 (4) | 0 | this project (gen_*.py) | project-owned |
| rocks_void | props | 0 | 0 | 1 (4) | 0 | this project (gen_*.py) | project-owned |
| structures | props | 5 | 0 | 0 | 0 | this project (gen_*.py) | project-owned |

- **anim** — Custom animated effect frames.
- **props** — Custom-generated region prop sprites.
- **rocks_basalt** — Custom basalt rock sprites.
- **rocks_sand** — Custom sandstone/desert rock sprites.
- **rocks_void** — Custom void-biome rock sprites.
- **structures** — Custom structure / building sprites.

### `standalone packs` — external

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| craftpix-net-168228-free-tree-pixel-art-asset-pack | environment/props | 1 | 0 | 6 (70) | 0 | CraftPix.net | CraftPix free license |

- **craftpix-net-168228-free-tree-pixel-art-asset-pack** — Free pixel-art tree pack (multiple tree types & sizes). _(aux: 1 doc, 1 photoshop source, 2 text)_

### `New folder` — external

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| THE PACK | enemy | 4 | 0 | 17 (118) | 0 | pixel_ankousse (instagram) | Free & commercial, credit appreciated |
| Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc | characters | 12 | 25 | 4 (10) | 0 | LurkerGames (itch.io) | Free |
| Tiny Swords (Free Pack) | mega-pack | 62 | 231 | 25 (116) | 1 | Pixel Frog (itch.io) | CC0 / free |

- **THE PACK** — Monsters: Slime, Slime2, King Slime, Orc, Orc2, Tree. Each split into numbered frame folders (Idle/Run/Attack/Dead). _(aux: 1 photoshop source, 1 text)_
- **Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc** — 100x100 Soldier & Orc characters with full anim sets, shadows, split-effects, arrow projectiles + Aseprite sources. _(aux: 2 aseprite source)_
- **Tiny Swords (Free Pack)** — Tiny Swords: colored unit factions (warrior/archer/pawn/monk/lancer), buildings, terrain tileset, decorations, resources, particle FX, UI. _(aux: 18 aseprite source)_

### `New folder 2` — external

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| boss_demon_slime_FREE_v1.0 | boss | 1 | 0 | 5 (60) | 0 | LuizMelo (itch.io) | Free for commercial use |
| craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites | enemy | 30 | 0 | 54 (630) | 0 | CraftPix.net | CraftPix free license (credit, no resale) |
| Frost_Guardian_FREE_v1.0 | boss | 1 | 0 | 5 (53) | 0 | LuizMelo (itch.io) | Free for commercial use |
| mino_v1.1_free | boss/enemy | 4 | 0 | 4 (46) | 0 | LuizMelo (itch.io) | Free for commercial use |
| Monster Pack (Free) | enemy | 5 | 0 | 0 | 0 | itch.io free pack | Free |

- **boss_demon_slime_FREE_v1.0** — Demon Slime boss. Per-action spritesheets, individual frame folders (idle/walk/cleave/take_hit/death), aseprite sources, GIFs. _(aux: 1 aseprite source, 5 gif preview)_
- **craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites** — Chibi Orc / Ogre / Goblin. PNG full-anim spritesheets + PNG Sequences (frame-by-frame) + EPS/AI vector + Unity packages. _(aux: 8 text, 3 unity package, 42 vector source)_
- **Frost_Guardian_FREE_v1.0** — Frost Guardian boss. Per-action PNG frame folders (idle/atk/walk/death/take_hit) + GIF samples. _(aux: 1 aseprite source, 5 gif preview)_
- **mino_v1.1_free** — Minotaur boss. Per-action horizontal spritesheets + split frame folders (idle/walk/atk) + GIF previews + healthbar UI. _(aux: 1 aseprite source, 3 gif preview)_
- **Monster Pack (Free)** — Small critters (rabbit / horned rabbit variants) provided as animation spritesheets. _(aux: 3 gif preview)_

### `New folder 3` — external

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| blue lightning | vfx | 2 | 4 | 6 (29) | 0 | itch.io VFX pack | Free |
| food | item/icon | 1 | 0 | 9 (30) | 0 | the_steam_gamer (Fiverr) | Free |
| Food assets | item/icon | 10 | 6 | 3 (14) | 0 | the_steam_gamer (Fiverr) | Free |
| frost skill | vfx | 3 | 0 | 3 (34) | 0 | itch.io VFX pack | Free |
| green attack | vfx | 1 | 4 | 5 (49) | 0 | itch.io VFX pack | Free |
| Monsters Creatures Fantasy 2 | enemy | 3 | 22 | 1 (2) | 0 | LuizMelo (itch.io) | Free for commercial use |
| red fireball attack | vfx | 0 | 5 | 5 (35) | 0 | itch.io VFX pack | Free |
| white smoke | vfx | 0 | 4 | 4 (27) | 0 | itch.io VFX pack | Free |
| yellow power | vfx | 0 | 3 | 3 (31) | 0 | itch.io VFX pack | Free |

- **blue lightning** — Blue lightning skill VFX (multiple variants VFX1-6) as spritesheets + frame folders. _(aux: 6 gif preview, 6 photoshop source)_
- **food** — Food item sprites used as pickups / consumable icons. _(aux: 1 photoshop source)_
- **Food assets** — Food items: GIF + PNG + spritesheets + 32x32 'pizza eaten' frames. _(aux: 3 gif preview, 1 text)_
- **frost skill** — Frost/ice skill VFX (VFX1-3) as spritesheets + frame folders. _(aux: 3 gif preview, 6 photoshop source)_
- **green attack** — Green attack skill VFX (VFX1-5) as spritesheets + frame folders. _(aux: 5 gif preview, 6 photoshop source)_
- **Monsters Creatures Fantasy 2** — Rat / Bat / Mimic / Slime — per-action horizontal spritesheet strips.
- **red fireball attack** — Red fireball skill VFX (VFX1-3) as spritesheets + frame folders. _(aux: 5 gif preview, 5 photoshop source)_
- **white smoke** — White smoke / dust skill VFX (VFX1-4) as spritesheets + frame folders. _(aux: 4 gif preview, 4 photoshop source)_
- **yellow power** — Yellow power/holy skill VFX (VFX1-3) as spritesheets + frame folders. _(aux: 3 gif preview, 3 photoshop source)_

### `New folder 4` — external

| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |
|---|---|--:|--:|--:|--:|---|---|
| Attacks | vfx/projectile | 6 | 0 | 6 (52) | 0 | itch.io / CraftPix-style pack | See license.txt |
| craftpix-net-305231-free-tower-defense-2d-vector-tileset | environment/tileset | 4 | 0 | 21 (329) | 15 | CraftPix.net | CraftPix free license |
| craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense | environment/tileset | 1 | 0 | 12 (182) | 4 | CraftPix.net | CraftPix free license |
| craftpix-net-665131-free-fields-tileset-pixel-art-for-tower-defense | environment/tileset | 1 | 0 | 17 (163) | 3 | CraftPix.net | CraftPix free license |
| craftpix-net-734372-free-poison-swamp-game-tileset-and-environment-pack | environment/tileset | 1 | 0 | 8 (81) | 11 | CraftPix.net | CraftPix free license |

- **Attacks** — Spell/projectile FX: Fire & Water Arrow/Ball/Spell animations + skill icons (PNG + EPS). _(aux: 6 gif preview, 1 text, 9 vector source)_
- **craftpix-net-305231-free-tower-defense-2d-vector-tileset** — Tower-defense vector tileset: 4 game backgrounds + tile TAILS (PNG + Tiled TMX/TSX maps). _(aux: 2 text, 4 tiled map)_
- **craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense** — Top-down village pixel tileset: tiles, objects, animated objects + PSD sources. _(aux: 1 doc, 4 photoshop source, 1 text)_
- **craftpix-net-665131-free-fields-tileset-pixel-art-for-tower-defense** — Pixel-art fields tileset (tower defense): ground tiles + objects + animated objects + PSD sources. _(aux: 1 doc, 3 photoshop source, 1 text)_
- **craftpix-net-734372-free-poison-swamp-game-tileset-and-environment-pack** — Poison-swamp tileset & environment pack (PNG + EPS/AI vector sources). _(aux: 1 text, 94 vector source)_
