# AKHAND SUTRA — Game Design Document

> *The Unbroken Thread*

---

## Table of Contents

1. [Overview](#overview)
2. [Story & Lore](#story--lore)
3. [Characters](#characters)
4. [Game Flow](#game-flow)
5. [World & Regions](#world--regions)
6. [Combat Mechanics](#combat-mechanics)
7. [Amrit & Healing](#amrit--healing)
8. [XP & Leveling](#xp--leveling)
9. [Death Echo](#death-echo)
10. [Thread Shrines](#thread-shrines)
11. [Enemy System](#enemy-system)
12. [Boss System](#boss-system)
13. [Quest System](#quest-system)
14. [Codex](#codex)
15. [Props & Collision](#props--collision)
16. [Seamless Streaming](#seamless-streaming)
17. [UI & HUD](#ui--hud)
18. [Audio System](#audio-system)
19. [Save & Progression](#save--progression)
20. [Co-op & Networking](#co-op--networking)
21. [Quality Settings](#quality-settings)
22. [Code Structure](#code-structure)

---

## Overview

**Akhand Sutra: The Unbroken Thread** is a 1–2 player co-op action RPG built with **Phaser 3**. The game is rooted in Hindu/Sanskrit mythology and follows two warriors on a journey through 7 Acts (50+ authored regions) to defeat a demon who has severed the sacred thread binding all souls.

| Detail | Value |
|--------|-------|
| Engine | Phaser 3 |
| Players | 1–2 (solo or co-op) |
| Perspective | 2D top-down |
| Per-Region Size | 3200 × 2000 px |
| Viewport | 1280 × 720 px |
| Genre | Action RPG / Open World |
| Authored Regions | 50 (regions 0, 7–49) |
| Acts | 7 (Earth → Water → Fire → Wind → Underworld → Void → Secret) |

---

## Story & Lore

### The Premise

The **Akhand Sutra** (Unbroken Thread) is a sacred cosmic force that connects all living souls. **Viyogasur**, the Demon of Separation, has severed this thread — plunging the world into spiritual isolation, corruption, and chaos. But as the warriors travel deeper, a darker truth emerges: Viyogasur may not be a demon at all, but a name given to a god the pantheon wished to erase.

Two warriors answer the call:

- **Dhruva** — *"The Unmoving Star"* — a warrior who fights with elemental force; refuses to look away from inconvenient truths
- **Tara** — *"The Guiding Light"* — a monk who channels healing and lightning; quick, mobile, a force for restoration

Their journey takes them through 7 Acts, each corresponding to a classical element from Hindu cosmology. The real conspiracy is uncovered in fragments — environmental echoes, lore shards, NPC confessions — until the player confronts a choice about who the real villain is.

### The Elements

| Element | Sanskrit | Act |
|---------|----------|-----|
| Earth | Prithvi | Act I — The Mortal Vale |
| Water | Jal | Act II — The Drowned Reach |
| Fire | Agni | Act III — The Emberwastes |
| Wind | Vayu | Act IV — The Skyward Climb |
| Underworld | Patala | Act V — The Sunless Deep |
| Void | — | Act VI — The Severance |
| Soul | Ekatmadeva | Act VII — The Erased Path (secret) |

### Endings

Three endings based on player choice and lore collection:
- **Restore the Thread** — repair the Akhand Sutra as it was
- **Break the Thread** — sever it entirely, ending the cycle
- **Reweave the Thread** (true ending) — requires collecting all lore fragments and walking the Erased Path; rewrites the Sutra from Ekatmadeva's erased history

---

## Characters

### Dhruva (Player 1) — The Warrior

- **Color**: Purple
- **Playstyle**: Heavy, earth and fire-based, protective

| Stat | Value |
|------|-------|
| Base HP | 200 |
| Base Stamina | 100 |
| Light Attack Damage | 20 |
| Heavy Attack Damage | 45 |

**Abilities:**

| Key | Name | Stamina | Cooldown | Effect |
|-----|------|---------|----------|--------|
| Q | Prithvi Slam | 20 | 8s | AoE ground slam, 150px radius, 80 dmg |
| E | Agni Shield | 25 | 10s | 3s shield — halves incoming dmg, reflects 10 dmg to attackers |
| R | Agni Burst | 40 | 12s | 250px radius explosion, 120 dmg + knockback |

---

### Tara (Player 2) — The Monk

- **Color**: Blue
- **Playstyle**: Fast, mobile, healing and chain lightning

| Stat | Value |
|------|-------|
| Base HP | 200 |
| Base Stamina | 100 |
| Light Attack Damage | 20 |
| Heavy Attack Damage | 45 |

**Abilities:**

| Key | Name | Stamina | Cooldown | Effect |
|-----|------|---------|----------|--------|
| Q | Vayu Dash | 15 | 8s | Teleport up to 300px forward, hit enemies in 60px corridor for 50 dmg |
| E | Jal Mend | 30 | 10s | Heal both players for 60 HP + healing aura visual |
| R | Vayu Storm | 35 | 12s | Chain lightning — 70 dmg to nearest enemy + 2 nearby targets within 200px |

**Solo Mode AI**: When playing solo, Tara is AI-controlled. She follows P1 with basic pathfinding and auto-attacks nearby enemies.

---

### Shared Mechanics

**Dodge** (SHIFT key):
- Costs 25 stamina, 1 second cooldown, lasts 300ms
- Player becomes semi-transparent (0.6 alpha) during dodge
- Velocity becomes 2.8× normal in facing direction

**Perfect Dodge** (timing-based):
- If player dodges within 200ms of an incoming attack:
  - Triggers 500ms of slow-motion (time scale 0.25×)
  - Refunds 25 stamina in full
  - Next attack deals 1.5× damage
  - Shows "PERFECT DODGE!" toast

**Stamina Costs:**

| Action | Stamina Cost |
|--------|-------------|
| Light Attack | 12 |
| Heavy Attack | 25 |
| Dodge | 25 |
| Vayu Dash (Tara Q) | 15 |
| Prithvi Slam (Dhruva Q) | 20 |
| Agni Shield (Dhruva E) | 25 |
| Jal Mend (Tara E) | 30 |
| Vayu Storm (Tara R) | 35 |
| Agni Burst (Dhruva R) | 40 |

**Stamina Regeneration**: 18 per second when not dodging  
**Max Stamina**: 100 (upgradeable via level-up stat allocation)

**Downed State**:
- When HP reaches 0, player is downed (semi-transparent, cannot act)
- 12-second auto-revive timer
- Revives with 40% max HP
- If both players are downed simultaneously → Death flow (see below)

---

## Game Flow

### High-Level Loop

```
Main Menu
  → New Game
    → PrologueScene (7 narrative lines)
      → Region 0 (Gramavana, tutorial)
        → Open world: walk seamlessly between 50 authored regions
          → Defeat Viyogasur (Act VI finale)
            → GameEndingScene (choice)
              → Main Menu
```

### Per-Region Progression

1. Walk in from an adjacent region via seamless streaming (or spawn at save point)
2. Explore — talk to NPCs, fight enemies, collect lore fragments, find echo triggers
3. Visit **Thread Shrines** to heal, refill Amrit, set respawn point, and spend XP on level-ups
4. Complete the region's main objective to unlock gated portals (boss kill, NPC talk, etc.)
5. Walk onward — adjacent regions are pre-loaded and load seamlessly without a transition screen

### World Map (M key or TAB)

The **WorldMapScene** shows all 50 regions as thumbnail nodes on a pannable/zoomable canvas. Explored regions display a screenshot thumbnail; unexplored ones are dark. Edges between connected regions show the Akhand Sutra thread (gold if both explored, dim otherwise). The map reveals the 7-Act structure and optional branch paths. Fast travel to any previously-visited region is available from the map.

### Death Flow

1. Both players downed
2. Death Echo drops at P1's position (see [Death Echo](#death-echo))
3. Amrit refills to max
4. 1.2s delay → "YOU DIED" screen
5. Respawn at last Thread Shrine; if no shrine visited, spawn at region start
6. Player presses **R** to retry (respawn) or **ESC** for main menu

### Victory Flow (Final Boss)

1. Viyogasur killed
2. 1.5s delay → boss lore displayed
3. 6s delay → UIScene stops
4. **GameEndingScene** launches with 3-choice ending + epilogue
5. Save data cleared

---

## World & Regions

### World Structure — 7 Acts, 50 Regions

The world is an open graph of 50 authored regions. Regions stream seamlessly horizontally. The world map shows their layout across 7 acts.

| Act | Province | Element | Key Regions | Notes |
|----|----------|---------|-------------|-------|
| I | The Mortal Vale | Prithvi | 0, 7, 11, 12, 13, 14 | Tutorial + early spurs |
| II | The Drowned Reach | Jal | 15, 16, 9, 17, 18, 8 | Serpent boss at region 8 |
| III | The Emberwastes | Agni | 19, 20, 21, 22, 23, 24 | Stone boss at region 24 |
| IV | The Skyward Climb | Vayu | 25, 26, 27, 28, 29, 30 | Wind boss at region 30 |
| V | The Sunless Deep | Patala | 31, 32, 10, 33, 34 | Optional vertical branch |
| VI | The Severance | Void | 35, 36, 37, 38 | Final boss at region 37 |
| VII | The Erased Path | Ekatmadeva | 39, 40, 41, 48, 49 | Secret; requires 15 lore fragments |

Additional optional spur regions: 42 (Act I), 43 (Act II), 44 (Act III), 45 (Act IV), 46 (Act V), 47 (Act VI).

### Per-Region Dimensions

| Property | Value |
|----------|-------|
| World Width | 3200 px |
| World Height | 2000 px |
| Player Spawn | x ≈ 380, y = 1000 |
| Camera Smoothing | 0.1 spring follow |

### Narrative Regions (REGIONS[] metadata)

| # | Name | Subtitle | Boss | Difficulty |
|---|------|----------|------|------------|
| 0 | Gramavana | The Village of Ash and Memory | None | 0.4 |
| 1 | Mahāvana | The Great Forest | None | 0.5 |
| 2 | Vrindavana | The Sacred Grove | None | 1.4 |
| 3 | Nāga Pātāl | The Serpent Realm | Nagraj Kaliya | 1.8 |
| 4 | Deva Mandira | The Temple of the Gods | Pashana Daitya | 2.3 |
| 5 | Swarga Seema | The Edge of Heaven | Vayu Rakshasa | 2.8 |
| 6 | Viyoga Durga | Fortress of Separation | Viyogasur | 3.5 |

Regions 1–6 are legacy narrative descriptors. The actual gameplay chain uses authored map-editor regions (7–49).

### Map-Editor Region Format

Each region is a JSON file (`regions/region_N.json`) authored in the map editor. The format includes:

```json
{
  "regionName": "Ash Village",
  "regionSubtitle": "Gramavana",
  "version": 1,
  "background": { "type": "color", "value": "#2d5c28" },
  "sprites": [ ... ],        // placed props with position, dir, frames, scale, tint
  "noWalkZones": [ ... ],    // hand-drawn collision rectangles
  "enemies": [ ... ],        // fixed enemy placements
  "boss": null,
  "regionIndex": 0,
  "portals": { "back": {...}, "next": {...} }
}
```

### Echo Triggers

Regions contain **echo triggers** — invisible circular zones that display a narrative voice line when the player walks through them. These are not NPC dialogue; they're ambient environmental storytelling embedded directly in the region config.

```javascript
echoTriggers: [
  { id: 'echo_mahavana_voice', x: 1800, y: 950, r: 220,
    text: '⟨Voice in the Trees⟩ "They called me the problem because I refused to become their excuse."' }
]
```

### World Fragments

Lore shard objects placed in the world at specific coordinates. Walking into range shows a "EXAMINE [F]" prompt; interacting adds a fragment to the Codex and counts toward the 15-fragment gate for the Erased Path.

### Interactive Elements

**Thread Shrines**
- Glowing gold interactive object in each region
- On activation: heals both players fully, refills Amrit charges, sets respawn point, triggers level-up screen if XP threshold reached
- Only one shrine interaction per region visit (respawn, then re-enter to interact again)

**Pressure Plates**
- 2 per most regions
- Both players must stand on both plates simultaneously
- Reward: 35% HP heal; some linked to side quests

**Portals**
- **Back Portal** (blue, left side): returns to previous region in chain
- **Next Portal** (orange, right side): locked until region objective complete
- Some portals are gated by lore count (e.g., the Sixth Door at region 34 requires 15 lore fragments)
- Walking into a portal triggers seamless streaming — no fade/restart for adjacent regions

**Death Echo Orb** — see [Death Echo](#death-echo)

---

## Combat Mechanics

### Attack System

| Attack | Damage | Cooldown | Hitstop |
|--------|--------|----------|---------|
| Light Attack | 20 | 500ms | 60ms |
| Heavy Attack | 45 | 1200ms | 80ms |

**Hit Detection**:
- Range: 175px
- Arc: 130° (65° each side of facing direction)
- Point-blank (< 50px): Always hits regardless of arc

**Boss Melee**: Players must be within 215px to hit; triggers camera shake on hit

### Difficulty Scaling

Scales enemy HP, enemy damage, boss posture regen, and player ability power:

| Region | Multiplier |
|--------|-----------|
| 0 | 0.4 |
| 1 | 0.5 |
| 2 | 1.4 |
| 3 | 1.8 |
| 4 | 2.3 |
| 5 | 2.8 |
| 6 | 3.5 |

---

## Amrit & Healing

Amrit is the game's **healing flask** (analogous to Dark Souls' Estus).

| Property | Value |
|----------|-------|
| Default Charges | 4 |
| Heal Amount | 55% of max HP |
| Sip Lockout | 550ms (player is vulnerable while drinking) |
| Refill | Thread Shrine interaction, or on death |
| Key | Configurable (default: H / secondary button) |

Amrit charges are shown as pips in the HUD. Charges persist across region transitions but refill at shrines or on death.

---

## XP & Leveling

Every enemy kill grants XP. XP accumulates across regions and saves at portals.

### XP Thresholds

| Level | XP Needed |
|-------|-----------|
| 1→2 | 100 |
| 2→3 | 250 |
| 3→4 | 450 |
| 4→5 | 700 |
| 5→6 | 1000 |
| 6→7 | 1350 |
| 7→8 | 1750 |
| 8→9 | 2200 |
| 9→10 | 2700 |

### Level-Up Allocation

- Reaching a threshold does **not** auto-apply stats — the UI notifies "Level up available"
- Stats are allocated at the **Thread Shrine** (ShrineScene)
- Each level grants **5 points** to distribute; each point is **+5%** to a chosen stat
- Stats available: Max HP, Max Stamina, Ability Power

### Enemy XP Values (per kill)

| Tier | Examples | XP |
|------|----------|-----|
| T0 vermin | rat | 7 |
| T1 flyer | bat, slimem | 8–12 |
| T2 grunt | melee, goblin | 12–14 |
| T3 bruiser | orc | 17–20 |
| T4 elite | ogre, mimic | 28–32 |
| T5/6 boss-tier | mini-boss, faction leader | 54–80 |

---

## Death Echo

When both players are downed, a **Death Echo** is dropped at P1's last position before respawning.

- The echo appears as a glowing orb in the world
- It stores all XP the player had accumulated
- Walking into the echo within 70px reclaims the XP
- If the player dies again before reaching the echo, the echo's XP is lost permanently
- The echo persists across region boundaries (same region only); it is not saved

This creates risk/reward tension: rushing back to retrieve XP vs. playing cautiously in a hostile region.

---

## Thread Shrines

Thread Shrines are golden interactive objects placed in regions by the map editor.

**On activation:**
1. Both players are fully healed
2. Amrit charges refill to max
3. Current region is set as the respawn point (saved)
4. If level-up is available (XP threshold reached): the **ShrineScene** opens for stat allocation
5. A narrative line plays: *"You rest. The thread steadies — wounds close, Amrit replenished, your return point is set here."*

The shrine can only be activated once per visit. After respawning and re-entering a region, the shrine is active again.

---

## Enemy System

### Enemy Types (built-in roster)

**Melee — Forest Raksha / Goblin**

| Stat | Value |
|------|-------|
| HP | 80 |
| Speed | 120 |
| Damage | 15 |
| Attack Range | 60px |
| Attack CD | 1200ms |

Behavior: Roam idle → detect player → pursue → attack in melee range

---

**Ranged — Shadara Archer**

| Stat | Value |
|------|-------|
| HP | 55 |
| Speed | 90 |
| Damage | 12 |
| Attack Range | 350px (projectile) |
| Attack CD | 1800ms |

Behavior: Seeks cover near trees before firing arrows (speed 280, lifetime 2.5s)

---

**Flying — Vayu Bhuta / Lancer**

| Stat | Value |
|------|-------|
| HP | 65 |
| Speed | 135 |
| Damage | 18 |
| Attack Range | 80px |
| Attack CD | 1000ms |

Special: Fastest basic enemy; tint cyan

---

**Orc — Vana Raksha**

| Stat | Value |
|------|-------|
| HP | 130 |
| Speed | 105 |
| Damage | 22 |
| Attack Range | 65px |
| Attack CD | 1300ms |

---

**Elite — Mahavir Raksha / Ogre**

| Stat | Value |
|------|-------|
| HP | 200 |
| Speed | 90 |
| Damage | 32 |
| Attack Range | 75px |
| Attack CD | 1400ms |
| Shockwave CD | 6s |
| Shockwave Range | 140px |

---

**Bat — Vayu Pakshi**

| Stat | Value |
|------|-------|
| HP | 45 |
| Speed | 155 |
| Damage | 11 |
| Attack Range | 60px |
| Attack CD | 950ms |

---

**Rat — Kshetra Mooshak**

| Stat | Value |
|------|-------|
| HP | 30 |
| Speed | 170 |
| Damage | 8 |
| Attack Range | 42px |
| Attack CD | 850ms |

---

**Slime — Vikrit Kshira**

| Stat | Value |
|------|-------|
| HP | 55–75 |
| Speed | 75 |
| Damage | 10–14 |
| Attack Range | 48px |
| Attack CD | 1350ms |

---

**Mimic — Mayavi Peti**

| Stat | Value |
|------|-------|
| HP | 160 |
| Speed | 80 |
| Damage | 26 |
| Attack Range | 70px |
| Attack CD | 1600ms |

---

### Map-Editor Creatures

Regions authored in the map editor can place any approved entity from `docs/animations.json` as a creature. Each entity is classified by `entity_type` (boss/enemy/npc) and gets stats from `src/data/creatureStats.js`.

**Passive Wildlife** — animals with `passive: true` never attack; they wander and flee when the player approaches or hits them. Examples: deer, fox, hare, sheep, rabbit, bull.

**Combat creatures** — use the same AI state machine as the built-in enemy types. Faction leaders (Nordic, Aztec, Maya leaders; Giant Goblin, Viking Leader, Caveman Boss) serve as regional mini-bosses.

Map-editor creatures spawn with a directional facing seeded from their spawn position (co-op deterministic).

### Spawning System

Two modes per region:
1. **Fixed Enemies** — placed at specific positions; don't respawn once killed
2. **Spawners** — every 25 seconds, spawn a new enemy group (2–4 in non-tutorial regions)

**Max Active Enemies by Quality:**

| Quality | Max Enemies |
|---------|------------|
| Low | 8 |
| Medium | 12 |
| High | 18 |

---

## Boss System

### Boss Structure

Every named boss has:
- **3 Phases** triggered at HP thresholds: 100%, 50%, 30%
- **Posture bar** — fills as boss takes damage; when full, boss staggers for 2.2s
- **New attack patterns** unlocked each phase

### Posture Mechanic

- Posture fills at **0.4 × damage dealt** each hit
- Max posture: 100
- When full: boss enters **Stagger** for 2.2 seconds (fully vulnerable)
- After stagger: posture resets, boss resumes combat
- Posture regens over time (rate varies per boss)

### Phase Transitions

- Boss becomes invincible for 2.2 seconds
- Camera shakes (500ms, 0.018 intensity)
- White flash + "PHASE II" / "FINAL PHASE" text scales in
- Final phase: Boss sprite tinted red

### Boss Roster

**1. Nagraj Kaliya** — Region 3 / Act II Serpent Court

| Stat | Value |
|------|-------|
| HP | 2000 |
| Phase 1 | Bite, Venom Spit |
| Phase 2 | + Coil |
| Phase 3 | + Hydra Form |
| Posture Regen | 5/sec |
| Reward | Naga Scale |

**2. Pashana Daitya** — Region 4 / Act III

| Stat | Value |
|------|-------|
| HP | 2400 |
| Phase 1 | Smash, Shockwave |
| Phase 2 | + Stone Throw |
| Phase 3 | + Rock Storm |
| Reward | Temple Offering |

**3. Vayu Rakshasa** — Region 5 / Act IV

| Stat | Value |
|------|-------|
| HP | 2800 |
| Phase 1 | Wind Slash, Gust |
| Phase 2 | + Cyclone |
| Phase 3 | + Tornado |
| Posture Regen | 6/sec (highest) |
| Reward | Vayu Note |

**4. Viyogasur** — Region 6 / Act VI (Final Boss)

| Stat | Value |
|------|-------|
| HP | 4000 |
| Phase 1 | Void Slash, Despair Wave (5 spread) |
| Phase 2 | + Severance |
| Phase 3 | + Annihilation (12 projectiles) |
| Posture Regen | 4/sec |
| Reward | Akhand Fragment |
| Special | Triggers ending sequence on death |

---

## Quest System

### Structure

- **Main Quests** — Auto-triggered per region; complete by defeating the region boss
- **Side Quests** — Optional; unlocked by talking to NPCs; rewards items

Quest states: `not_started` → `active` → `completed`

Tracked data: active quests (Map), completed quests (Set), kill counts per enemy type (Map)

### Quest List by Region (narrative regions)

**Region 0 — Gramavana**
- Main: "The Village Elder's Warning" (talk to Elder Mahesh)
- Side 1: "Healing Herbs" — Kill 5 enemies → Healing Herb
- Side 2: "The Prithvi Shard" — Kill 8 enemies → Prithvi Shard (+20 Max HP)

**Region 1 — Mahāvana**
- Main: Defeat Vanaraksha
- Side 1: "The Hermit's Totem" — Kill 10 enemies → Forest Totem
- Side 2: "The Scholar's Specimen" — Kill 5 enemies → Spirit Fern
- Side 3: "The Merchant's Lost Goods" — Kill 3 enemies → Merchant's Coin

**Region 2 — Vrindavana**
- Main: Defeat Vanasur (all fixed enemies killed)
- Side 1: "The Sage's Blessing" — Kill 12 enemies → Ashram Blessing
- Side 2: "Water of Life" — Activate pressure plate → Water Blessing

**Region 3 — Nāga Pātāl**
- Main: Defeat Nagraj Kaliya
- Side 1: "The Naga Scale" — Kill 15 enemies → Naga Scale
- Side 2: "Tears of the Deep" — Kill 10 enemies → Jal Tear

**Region 4 — Deva Mandira**
- Main: Defeat Pashana Daitya
- Side 1: "Sacred Offering" — Kill 15 enemies → Temple Offering
- Side 2: "The Agni Ember" — Activate pressure plate → Agni Ember (+10% Ability Power)

**Region 5 — Swarga Seema**
- Main: Defeat Vayu Rakshasa
- Side 1: "The Apsara's Song" — Kill 18 enemies → Vayu Note
- Side 2: "Cloud Crystal" — Activate pressure plate → Cloud Crystal

**Region 6 — Viyoga Durga**
- Main: Defeat Viyogasur (triggers ending)
- No side quests

---

## Codex

The Codex is an in-game encyclopedia. It has three sections:

**Bestiary** — unlocked per enemy type when first encountered; shows stats, lore flavour text, and a kill count.

**Lore Fragments** — world fragments collected from the environment; narrative shards revealing the erased history of Ekatmadeva.

**Characters** — entries for Dhruva and Tara (always visible) and met NPCs (unlocked on first dialogue interaction).

The Codex is accessible from the pause menu. The lore fragment count feeds the portal gate at region 34 (15 fragments required to enter the Erased Path).

---

## Props & Collision

### Prop Classification

Every map-editor sprite is classified into one of three kinds that controls depth-sorting and collision:

| Kind | Sorting | Collision | Examples |
|------|---------|-----------|---------|
| `solid` | Y-sorted by base | Footprint collider at base | Trees, rocks, pillars, crates, braziers |
| `decor` | Y-sorted by base | None (walk through) | Bushes, reeds, shrubs, crystals |
| `ground` | Always under actors | None | Grass, flowers, shadow decals, puddles |

Classification is automatic, derived from the sprite's `name` field first, then its `dir` path. Unknown props default to `decor`.

### Footprint Collision

Solid props use image-alpha footprint data (from `src/data/propFootprints.js`) to create accurately-sized Arcade Physics static bodies at the prop's base. For example:
- Trees get a narrow trunk-width box at the base (player walks behind the canopy, blocked at the trunk)
- Rocks get a box covering most of the body

Footprint data is auto-generated by `tools/gen_prop_footprints.py`. The system maps source-image coordinates to world space via the sprite's anchor and scale.

### Depth Sorting

Solid and decor props are Y-sorted every frame against the player's Y position. Props with a higher Y than the player are drawn on top (player is "behind" them); props with lower Y are drawn below.

### No-Walk Zones

Hand-drawn rectangles in the map editor (`noWalkZones`) are loaded as static Arcade Physics bodies. These block both players and enemies. Streaming regions load/unload their no-walk zones with the region.

---

## Seamless Streaming

Adjacent regions in the horizontal chain are pre-loaded and unloaded invisibly as the player walks, creating a seamless open-world feel.

| Parameter | Value |
|-----------|-------|
| Trigger distance | 520px from the shared edge |
| Commit distance | 720px past the boundary |
| Sprites per frame | 100 (avoids frame hitch) |
| Fade-in duration | 350ms (streamed sprites fade in on appear) |

**How it works:**
1. When P1 reaches 520px from the right edge, the next region in the chain begins building (background, props, enemies, NPCs) in the adjacent horizontal slot
2. At 720px past the edge, the camera remaps and the old region is unloaded
3. The previous (leftward) region is simultaneously pre-built 520px from the left edge
4. Only one crossing can be in-flight at a time (`_streamBusy` flag)

The streaming chain includes region 0 and all authored regions (7–49), sorted by index. Legacy procedural regions 1–6 are excluded from the chain.

---

## UI & HUD

### Main Menu

- **Buttons**: PLAY SOLO, HOST CO-OP, JOIN CO-OP, LOAD REGION, WORLD MAP, QUALITY, FULLSCREEN
- If save exists: CONTINUE / NEW GAME buttons
- Region selector (0–6) for LOAD REGION
- Background: Procedural starfield, pixel mountains, scanline overlay

### In-Game HUD

**Top Bar:**
- Left: P1 (Dhruva) — name, HP bar (color-coded), stamina bar, Amrit pips
- Left-center: P2 (Tara) — same layout
- Center: Region name (gold serif)
- Bottom right: Control legend

**Ability Bar (bottom center):**
- 3 slots: Q / E / R
- Shows cooldown in seconds or "–" when ready
- Ability name floats up and fades on use

**Amrit Pips**: Row of small flasks showing remaining charges per player

**Dialogue Box (bottom, when talking to NPC):**
- 110px tall, gold top border
- NPC name + message text; `[F]` to close

**Quest Panel (U key, right side)**

**Inventory Panel (I key, center overlay)**

**Codex (C key or pause menu)**

**World Map (M key or TAB)**

### Boss Bar

Slides up from screen bottom when boss triggered:
- Boss name (gold serif, centered)
- HP bar: Red fill, dark brown delay ghost
- Posture bar: Orange, below HP bar
- "POSTURE BROKEN — VULNERABLE —" on stagger

### Death Echo Notification

When a Death Echo orb is present in the current region, a small prompt appears near the bottom of the screen guiding the player back to it.

### You Died Screen

- Black veil fades in (0.88 alpha)
- "YOU DIED" — 72px, blood red
- Options: Retry [R] / Main Menu [ESC]
- Triggers 1.2s after both players are downed

### Pause Menu (ESC)

- RESUME / WORLD MAP / MAIN MENU buttons
- Hints: M to mute, F11 for fullscreen

### Ending Screen (GameEndingScene)

- Starfield background
- "✦ AKHAND SUTRA ✦" gold title
- 3 choice buttons (based on endings unlocked)
- Epilogue text fades in after choice
- Stats: Lore Fragments collected, Quests Completed
- RETURN TO MENU button

---

## Audio System

All audio is **synthesized in real-time** using the Web Audio API. No pre-recorded files.

**Master Volume**: 0.4  
**Mute Toggle**: M key

### Sound Effects

| Event | Sound |
|-------|-------|
| Hit | Sawtooth 220Hz + white noise |
| Heavy Hit | Sawtooth 110Hz + noise + pitch sweep |
| Dodge | Two sine tones (600Hz, 900Hz) |
| Perfect Dodge | Three-tone sequence (880, 1100, 1320 Hz) |
| Ability | Square wave (440, 660 Hz) |
| Player Damage | Sawtooth 180Hz + noise |
| Enemy Death | Two sawtooth tones (200, 150 Hz) |
| Boss Phase | Ascending then descending sawtooth sequence |
| Portal | Six-oscillator sweep upward |
| Victory | Ascending then descending sine sequence |
| Interact | Single sine tone 700Hz |

### Ambient Audio

Each narrative region plays a background drone tone:

| Region | Frequency |
|--------|-----------|
| 0 | 60 Hz |
| 1 | 80 Hz |
| 2 | 55 Hz |
| 3 | 45 Hz |
| 4 | 70 Hz |
| 5 | 50 Hz |
| 6 | 40 Hz |

---

## Save & Progression

### Storage

- **Key**: `akhand_sutra_save` (localStorage)
- Cleared on game completion (Viyogasur defeated)

### Saved Data

| Field | Type | Description |
|-------|------|-------------|
| regionIndex | number | Last region visited |
| playerStats | object | maxHp, maxStamina, abilityPow |
| playerXP | number | Accumulated XP |
| amritCharges | number | Current Amrit charges |
| amritMax | number | Max Amrit capacity |
| pendingLevels | number | Level-ups not yet spent |
| completedQuests | string[] | Completed quest IDs |
| inventory | string[] | Collected item names |
| collectedLoreIds | string[] | Lore fragment IDs gathered |
| bossKills | string[] | Defeated boss keys |
| encounteredEnemyIds | string[] | Enemy types faced (Codex bestiary) |
| metNpcs | object[] | NPCs talked to (Codex) |

### Save Triggers

- **Portal use** — saves on entering next region
- **Thread Shrine** — saves current location as respawn, saves Amrit and XP

---

## Co-op & Networking

### Two-Player Modes

- **Play Solo**: Single player controls Dhruva; Tara is AI-controlled
- **Host Co-op**: Host game for P2 to join (4-letter room code)
- **Join Co-op**: Connect to host by entering the code

### Network Protocol

- Broadcasts player state at **8 Hz** (every 125ms)
- Payload: position, HP, stamina, facing direction, animation state
- **No server-side simulation** — server is a relay only
- **Fallback**: If remote peer disconnects, P2 reverts to AI follow behavior

### Tether System

If P2 is more than **360px** from P1, P2 is pulled toward P1 at 80px/sec.

---

## Quality Settings

Selectable from main menu; persists via localStorage (`akhand_quality`):

| Setting | Low | Medium (default) | High |
|---------|-----|---------|------|
| Shadows | Off | On | On |
| Occlusion (fade behind trees) | Off | Off | On |
| Max Active Enemies | 8 | 12 | 18 |
| Rabbit Decorations | 0 | 12 | 12 |

---

## Code Structure

```
game/
├── index.html                      # HTML entry point
├── map_editor.html                 # Standalone collaborative map editor
├── asset_viewer.html               # Asset browser
├── animation_reviewer.html         # Animation review tool
├── src/
│   ├── main.js                     # Phaser game config + scene order
│   ├── constants.js                # Speeds, damage, cooldowns, XP thresholds, items
│   ├── scenes/
│   │   ├── PreloadScene.js         # Asset loading + animation definitions
│   │   ├── MainMenuScene.js        # Main menu UI, region select, settings
│   │   ├── PrologueScene.js        # 7-line narrative intro
│   │   ├── GameScene.js            # Main gameplay loop (~3352 lines)
│   │   ├── UIScene.js              # In-game HUD overlay, boss bars, dialogue
│   │   ├── PauseScene.js           # Pause menu overlay
│   │   ├── WorldMapScene.js        # Pannable world map, fog-of-war, fast travel
│   │   ├── ShrineScene.js          # Level-up stat allocation at Thread Shrines
│   │   └── GameEndingScene.js      # 3-choice ending + epilogue
│   ├── entities/
│   │   ├── Player.js               # Character controller, combat, Amrit, dodge, XP
│   │   ├── Enemy.js                # AI state machine (idle/pursue/attack)
│   │   ├── Boss.js                 # Boss AI, phase transitions, stagger system
│   │   ├── NPC.js                  # NPCs, dialogue triggers
│   │   └── Projectile.js           # Projectiles from ranged units and bosses
│   ├── systems/
│   │   ├── AbilityManager.js       # Ability definitions + execution (6 abilities)
│   │   ├── AnimationLoader.js      # Generic runtime loader for boss + JSON entities
│   │   ├── AudioManager.js         # Synthesized SFX + ambient audio
│   │   ├── ExploredManager.js      # Fog-of-war: tracks visited regions (localStorage)
│   │   ├── LoreManager.js          # Fragment collection + true ending gate
│   │   ├── NetworkManager.js       # WebSocket co-op client
│   │   ├── QuestManager.js         # Quest state + kill tracking
│   │   ├── QualitySettings.js      # Low/med/high presets
│   │   └── SaveManager.js          # localStorage persistence
│   └── data/
│       ├── bossAssets.js           # Legacy boss animation family specs
│       ├── bosses.js               # 4+ boss configs with phase data
│       ├── codex.js                # Bestiary lore + character/NPC entries
│       ├── creatureStats.js        # Per-entity stats for map-editor creatures
│       ├── enemies.js              # 8 built-in enemy type definitions
│       ├── propFootprints.js       # Auto-generated collision footprints per asset
│       ├── propTypes.js            # Prop classification (solid/decor/ground)
│       ├── quests.js               # Quests, NPC dialogue, lore fragments
│       ├── regions.js              # 7 narrative region descriptors
│       └── worldMapLayout.js       # Node positions + act colours for WorldMapScene
├── regions/                        # 50 map-editor JSON files (region_0, 7–49)
├── server/
│   └── combined_server.js          # Node.js HTTP + WebSocket server (port 8080)
└── docs/
    ├── GAME_DESIGN_DOCUMENT.md     # This file
    ├── TECHNICAL_OVERVIEW.md
    ├── WORLD_MAP_DESIGN.md
    ├── ANIMATION_PIPELINE.md
    └── ASSETS.md
```

### Scene Order

1. `PreloadScene` — loads all assets; parses `docs/animations.json`
2. `MainMenuScene` — main menu, region/co-op selection
3. `PrologueScene` — first-time narrative intro (7 lines + title card)
4. `GameScene` — runs active region; `UIScene` as parallel overlay
5. `WorldMapScene` — overlay/full-screen; launched from menu or M key in-game
6. `ShrineScene` — overlay; launched from Thread Shrine when level-up pending
7. `PauseScene` — overlay; launched on ESC
8. `GameEndingScene` — final victory screen

---

*Akhand Sutra — The Unbroken Thread. Built with Phaser 3.*
