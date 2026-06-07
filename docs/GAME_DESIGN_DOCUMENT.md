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
7. [Enemy System](#enemy-system)
8. [Boss System](#boss-system)
9. [Quest System](#quest-system)
10. [UI & HUD](#ui--hud)
11. [Audio System](#audio-system)
12. [Save & Progression](#save--progression)
13. [Co-op & Networking](#co-op--networking)
14. [Quality Settings](#quality-settings)
15. [Code Structure](#code-structure)

---

## Overview

**Akhand Sutra: The Unbroken Thread** is a 2-player co-op action RPG built with **Phaser 3**. The game is rooted in Hindu/Sanskrit mythology and follows two warriors on a journey through 7 regions to defeat a demon who has severed the sacred thread binding all souls.

| Detail | Value |
|--------|-------|
| Engine | Phaser 3 |
| Players | 1–2 (solo or co-op) |
| Perspective | 2D top-down |
| World Size | 3200 × 2000 px |
| Viewport | 1280 × 720 px |
| Genre | Action RPG |

---

## Story & Lore

### The Premise

The **Akhand Sutra** (Unbroken Thread) is a sacred cosmic force that connects all living souls. **Viyogasur**, the Demon of Separation, has severed this thread — plunging the world into spiritual isolation, corruption, and chaos.

Two warriors answer the call:

- **Dhruva** — a warrior who fights with elemental force
- **Tara** — a monk who channels healing and lightning

Their journey takes them through 7 regions, each guarded by a demon corrupted by Viyogasur's power. Only by defeating all demons and confronting Viyogasur himself can the Akhand Sutra be restored.

### The Elements

Each region is tied to a classical element from Hindu cosmology:

| Element | Sanskrit | Region |
|---------|----------|--------|
| Earth | Prithvi | Vrindavana |
| Water | Jal | Nāga Pātāl |
| Fire | Agni | Deva Mandira |
| Wind | Vayu | Swarga Seema |
| Void | — | Viyoga Durga |

### The Ending

Upon defeating Viyogasur, the Akhand Sutra is restored. A narrative ending sequence plays, recounting Dhruva and Tara's journey. The game displays collected lore fragments and completed quests, then clears the save and returns to the main menu.

Final title card: **"The Unbroken Thread — Restored"**

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

**Stamina Regeneration**: 18 per second when not dodging

**Downed State**:
- When HP reaches 0, player is downed (semi-transparent, cannot act)
- 12-second auto-revive timer
- Revives with 40% max HP
- If both players are downed simultaneously → Game Over

---

## Game Flow

### High-Level Loop

```
Main Menu
  → New Game / Load Region
    → Region 0 (Tutorial)
      → Region 1 → Region 2 → ... → Region 6
        → Defeat Viyogasur
          → Ending Sequence
            → Main Menu
```

### Per-Region Progression

1. Spawn at the left side of the region (~x:380, y:1000)
2. Explore the region — talk to NPCs, fight enemies
3. Unlock the **Next Portal** by completing the region's main objective (boss kill or all enemies killed)
4. (Optional) Complete side quests for items and lore
5. Walk into the **Next Portal** → save progress → load next region

### Region Unlock Conditions

| Region | Unlock Condition |
|--------|-----------------|
| 0 — Gramavana | Talk to Elder Mahesh |
| 1 — Mahāvana | Talk to Hermit Veda (NPC) |
| 2 — Vrindavana | Kill all fixed enemies |
| 3 — Nāga Pātāl | Defeat Nagraj Kaliya (boss) |
| 4 — Deva Mandira | Defeat Pashana Daitya (boss) |
| 5 — Swarga Seema | Defeat Vayu Rakshasa (boss) |
| 6 — Viyoga Durga | Defeat Viyogasur (boss) → triggers ending |

### Boss Encounter Trigger

- Boss arena is in the far-right section of the region (x ≈ 2800)
- When players enter the boss zone, the boss intro sequence plays:
  - Camera pans to boss
  - Full-screen dark overlay fades in
  - Boss name slides in (gold serif text, expanding decorative lines)
  - Boss HP/posture bars slide up from the bottom
- After intro, combat begins

### Defeat Flow

1. Both players downed
2. 1.2s delay
3. "YOU DIED" screen fades in
4. Player presses **R** to retry (restart region) or **ESC** for main menu

### Victory Flow (Final Boss)

1. Viyogasur killed
2. 1.5s delay → boss lore displayed
3. 6s delay → UIScene stops
4. **GameEndingScene** launches:
   - Starfield background
   - "✦ AKHAND SUTRA ✦" title
   - 10-line story text fades in over 4s
   - Stats: Lore Fragments collected, Quests Completed
   - RETURN TO MENU button
5. Save data cleared

---

## World & Regions

### World Dimensions

| Property | Value |
|----------|-------|
| World Width | 3200 px |
| World Height | 2000 px |
| Player Spawn | x ≈ 380, y = 1000 |
| Boss Position | x ≈ 2800, y = 1000 |
| Camera Smoothing | 0.1 spring follow |

### Region Overview

| # | Name | Sanskrit | Boss | Difficulty | Theme |
|---|------|----------|------|------------|-------|
| 0 | Gramavana | The Forest Village | None | 0.4 | Tutorial; village + forest |
| 1 | Mahāvana | The Great Forest | Vanaraksha | 0.5 | Dense dark forest |
| 2 | Vrindavana | The Sacred Grove | Vanasur | 1.4 | Sacred grove, Prithvi element |
| 3 | Nāga Pātāl | The Serpent Realm | Nagraj Kaliya | 1.8 | Serpent lore, Jal element |
| 4 | Deva Mandira | Temple of the Gods | Pashana Daitya | 2.3 | Temple, Agni element |
| 5 | Swarga Seema | Edge of Heaven | Vayu Rakshasa | 2.8 | Heavenly realm, Vayu element |
| 6 | Viyoga Durga | Fortress of Separation | Viyogasur | 3.5 | Void, darkness, final fortress |

### Region Details

**Region 0 — Gramavana (Tutorial)**
- Village zone with NPCs: Elder Mahesh, village healer, village child, villagers
- No boss
- Sacred pressure plates that heal both players when stood on simultaneously
- Teaches: movement, light attack, heavy attack, dodge, abilities, NPCs, quests

**Region 1 — Mahāvana**
- Dense dark forest with 6 fixed enemies
- Boss: Vanaraksha (corrupted forest guardian, green tint)
- NPCs: Hermit Veda (unlocks portal), traveling scholar, merchant
- Terrain: Dense tree decorations

**Region 2 — Vrindavana**
- Sacred bright-green grove; 13 fixed enemies (melee, ranged, elite mix)
- Boss: Vanasur (demon consuming the sacred groves, brown tint)
- NPCs: Sage and Dancer
- Unlock: Kill all fixed enemies

**Region 3 — Nāga Pātāl**
- Serpent underworld: mounds, amber pools, petrified dead trees
- Boss: Nagraj Kaliya (serpent king with multiple heads)
- Enemy mix: Spawners + fixed enemies
- Terrain: 110 decorations — mounds, amber pools, dead trees

**Region 4 — Deva Mandira**
- Warm golden/amber temple aesthetic
- Boss: Pashana Daitya (stone demon)
- NPCs: Priest and Guardian
- Limited decorations (30 per region type)

**Region 5 — Swarga Seema**
- Pale sky-blue heavenly atmosphere; 12 cloud decorations
- Boss: Vayu Rakshasa (wind demon, cyan tint)
- NPCs: Apsara guide and Deva warrior
- Highest enemy speed in the game

**Region 6 — Viyoga Durga**
- Black-purple void; dark screen overlay (0.35 alpha)
- Boss: Viyogasur (final boss, 4000 HP)
- NPC: Voice in the Void (sole NPC)
- No side quests

### Decorations & Ambiance

**Trees**: Poisson disk-sampled placement; scale 0.60–1.0; tinted per region  
**Rabbits**: 8 brown + 4 horned; regions 0–2 only; idle 1.5–4s then wander  
**Clouds**: 12 decorations in Region 5  
**Village Zones**: Colored NPC huts with gates; Regions 0 and 1

### Interactive Elements

**Pressure Plates**
- 2 per most regions
- Appear as brown circles with gold border, labeled `[STEP]`
- Both players must stand on both plates simultaneously
- Reward: 35% HP heal to both players
- Some linked to side quests

**Portals**
- **Back Portal** (blue, left side): Always unlocked, returns to previous region
- **Next Portal** (orange, right side): Locked until region objective complete
- Interact: Walk into portal → fade transition → save → load next region

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

### Stamina System

| Action | Stamina Cost |
|--------|-------------|
| Dodge | 25 |
| Vayu Dash (Tara Q) | 15 |
| Prithvi Slam (Dhruva Q) | 20 |
| Agni Shield (Dhruva E) | 25 |
| Jal Mend (Tara E) | 30 |
| Vayu Storm (Tara R) | 35 |
| Agni Burst (Dhruva R) | 40 |

Regen rate: **18/sec** (when not dodging)  
Max stamina: **100** (upgradeable via stat tiers)

### Damage & Health

- Base HP: 200 (scales with region difficulty multiplier)
- HP bar colors: Green (>50%), Yellow (25–50%), Red (<25%)
- Damage formula: `base_damage × difficulty_multiplier`

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

## Enemy System

### Enemy Types

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

Special: Physics-enabled; fastest basic enemy; tint cyan

---

**Orc — Vana Raksha**

| Stat | Value |
|------|-------|
| HP | 130 |
| Speed | 105 |
| Damage | 22 |
| Attack Range | 65px |
| Attack CD | 1300ms |

Stronger melee fighter

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
| Shockwave Damage | 80% of attack damage |

Strongest basic enemy; has an AoE shockwave ability

---

### Spawning System

Two modes per region:

1. **Fixed Enemies** — Placed at specific positions; don't respawn once killed; killing all may trigger quest/portal unlock
2. **Spawners** — Every 25 seconds, spawn a new enemy group (1–2 in tutorial, 2–4 in other regions)

**Max Active Enemies by Quality:**

| Quality | Max Enemies |
|---------|------------|
| Low | 8 |
| Medium | 12 |
| High | 18 |

**Death**: Plays death animation, 800ms fadeout, emits `enemy_killed` event

---

## Boss System

### Boss Structure

Every boss has:
- **3 Phases** triggered at HP thresholds: 100%, 50%, 30%
- **Posture bar** — fills as boss takes damage; when full, boss staggers
- **New attack patterns** unlocked each phase

### Posture Mechanic

- Posture fills at **0.4 × damage dealt** each hit
- Max posture: 100
- When full: boss enters **Stagger** for 3 seconds (can't act, fully vulnerable)
- After stagger: posture resets, boss resumes combat
- Posture regens over time (rate varies per boss)

**Visual**: Orange bar below HP bar; "POSTURE BROKEN — VULNERABLE —" text on stagger

### Phase Transitions

- Boss becomes invincible for 2.2 seconds
- Forced into stagger state
- Scale pulse animation
- Camera shakes (500ms, 0.018 intensity)
- White flash + "PHASE II" / "FINAL PHASE" text scales in
- Final phase: Boss sprite tinted red

### Boss Attack Patterns

Bosses cycle through patterns in sequence:

| Category | Patterns | Effect |
|----------|----------|--------|
| Melee slams | `slam`, `smash`, `bite`, `void_slash`, `wind_slash` | ~6% max HP; 130px range; 400ms wind-up |
| AoE radial | `root`, `vine_lash`, `coil`, `gust` | ~4% max HP; 160px radius |
| Projectile | `spore_burst`, `stone_throw`, `venom_spit`, `despair_wave`, `shockwave` | 3–5 projectiles; speed 230; lifetime 2.5s |
| Phase 3 exclusive | `rage_slam`, `frenzy`, `annihilation`, `severance`, `tornado` | 8–12 projectiles in all directions |

`despair_wave` fires 5 spread projectiles (widest spread)  
`annihilation` fires 12 projectiles (most dense, final boss only)

### Boss Roster

**1. Vanaraksha** — Region 1, Mahāvana

| Stat | Value |
|------|-------|
| HP | 1200 |
| Sprite | Tree boss (green tint 0x2d4a1e), 2.5× scale |
| Phase 1 | Slam, Root |
| Phase 2 | + Spore Burst |
| Phase 3 | + Rage Slam |
| Posture Regen | 3/sec |
| Reward | Forest Totem |

---

**2. Vanasur** — Region 2, Vrindavana

| Stat | Value |
|------|-------|
| HP | 1600 |
| Sprite | Tree boss (brown tint 0x5c3d1e), 2.5× scale |
| Phase 1 | Slam, Vine Lash |
| Phase 2 | + Seed Bomb |
| Phase 3 | + Frenzy |
| Reward | Ashram Blessing |

---

**3. Nagraj Kaliya** — Region 3, Nāga Pātāl *(First mandatory boss)*

| Stat | Value |
|------|-------|
| HP | 2000 |
| Sprite | Tree boss (green tint 0x1a6633), 2.8× scale |
| Phase 1 | Bite, Venom Spit |
| Phase 2 | + Coil |
| Phase 3 | + Hydra Form |
| Posture Regen | 5/sec |
| Reward | Naga Scale |

---

**4. Pashana Daitya** — Region 4, Deva Mandira

| Stat | Value |
|------|-------|
| HP | 2400 |
| Sprite | Minotaur (neutral), 2.5× scale |
| Phase 1 | Smash, Shockwave |
| Phase 2 | + Stone Throw |
| Phase 3 | + Rock Storm |
| Reward | Temple Offering |

---

**5. Vayu Rakshasa** — Region 5, Swarga Seema

| Stat | Value |
|------|-------|
| HP | 2800 |
| Sprite | Frost Guardian (cyan tint 0x88ccff), 2.2× scale |
| Phase 1 | Wind Slash, Gust (speed 120) |
| Phase 2 | + Cyclone (speed 155) |
| Phase 3 | + Tornado (speed 190, 900ms CD) |
| Posture Regen | 6/sec (highest) |
| Reward | Vayu Note |

---

**6. Viyogasur** — Region 6, Viyoga Durga *(Final Boss)*

| Stat | Value |
|------|-------|
| HP | 4000 |
| Sprite | Demon Slime (neutral), 2.8× scale |
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
- **Side Quests** — Optional; unlocked by talking to NPCs or entering regions; rewards items

Quest states: `not_started` → `active` → `completed`

Tracked data: active quests (Map), completed quests (Set), kill counts per enemy type (Map)

### NPC Dialogue States

Each NPC has 3 dialogue lines:
1. **First** — before quest starts (introduces quest)
2. **Active** — while quest is in progress
3. **Completed** — after quest finished

Example (Elder Mahesh, Region 0):
> *"The Akhand Sutra — the sacred thread binding all souls — is breaking. A demon called Viyogasur tears it apart."*

### Quest List by Region

**Region 0 — Gramavana**
- Main: "The Village Elder's Warning" (talk to Elder Mahesh)
- Side 1: "Healing Herbs" — Kill 5 enemies → Healing Herb
- Side 2: "The Prithvi Shard" — Kill 8 enemies → Prithvi Shard

**Region 1 — Mahāvana**
- Main: Defeat Vanaraksha
- Side 1: "The Hermit's Totem" — Kill 10 enemies → Forest Totem
- Side 2: "The Scholar's Specimen" — Kill 5 enemies → Spirit Fern
- Side 3: "The Merchant's Lost Goods" — Kill 3 enemies → Merchant's Coin

**Region 2 — Vrindavana**
- Main: Defeat Vanasur
- Side 1: "The Sage's Blessing" — Kill 12 enemies → Ashram Blessing
- Side 2: "Water of Life" — Activate pressure plate → Water Blessing

**Region 3 — Nāga Pātāl**
- Main: Defeat Nagraj Kaliya
- Side 1: "The Naga Scale" — Kill 15 enemies → Naga Scale
- Side 2: "Tears of the Deep" — Kill 10 enemies → Jal Tear

**Region 4 — Deva Mandira**
- Main: Defeat Pashana Daitya
- Side 1: "Sacred Offering" — Kill 15 enemies → Temple Offering
- Side 2: "The Agni Ember" — Activate pressure plate → Agni Ember

**Region 5 — Swarga Seema**
- Main: Defeat Vayu Rakshasa
- Side 1: "The Apsara's Song" — Kill 18 enemies → Vayu Note
- Side 2: "Cloud Crystal" — Activate pressure plate → Cloud Crystal

**Region 6 — Viyoga Durga**
- Main: Defeat Viyogasur (triggers ending)
- No side quests

---

## UI & HUD

### Main Menu

- **Buttons**: PLAY SOLO, HOST CO-OP, JOIN CO-OP, LOAD REGION, QUALITY, FULLSCREEN
- If save exists: CONTINUE / NEW GAME buttons
- Region selector (0–6) for LOAD REGION
- Background: Procedural starfield, pixel mountains, scanline overlay
- Subtitle: *"~ THE UNBROKEN THREAD ~"*

### In-Game HUD

**Top Bar:**
- Left: P1 (Dhruva) — name, HP bar (color-coded), stamina bar
- Left-center: P2 (Tara) — same layout
- Center: Region name (gold serif)
- Bottom right: Control legend

**Ability Bar (bottom center):**
- 3 slots: Q (orange border), E (blue border), R (green border)
- Shows cooldown in seconds or "–" when ready
- Ability name floats up and fades on use

**Dialogue Box (bottom, when talking to NPC):**
- 110px tall, gold top border
- NPC name + message text
- "[F] close" hint

**Quest Panel (U key, right side):**
- Active quests (▶ prefix) and completed quests (✓ prefix)

**Inventory Panel (I key, center overlay):**
- Lists collected quest reward items

**Region Title (on enter):**
- Center screen, gold region name + tan subtitle
- Displays 1.6s, fades in/out

### Boss Bar (Dark Souls-style)

- Slides up from screen bottom when boss triggered
- Boss name (gold serif, centered)
- HP bar: Red fill, dark brown delay ghost
- Phase label: Red text, fades after each phase change
- Posture bar: Orange, below HP bar
- Gold border lines top and bottom

### Notifications & Toasts

Floating text, center-bottom, floats up and fades over 1.5s:
- "PERFECT DODGE!"
- "Quest Complete!"
- "DHRUVA IS DOWN! (12s)"
- "POSTURE BROKEN" / "— VULNERABLE —"

### Pause Menu (ESC)

- Dim overlay
- PAUSED text
- RESUME / MAIN MENU buttons
- Hints: M to mute, F11 for fullscreen

### You Died Screen

- Black veil fades in (0.88 alpha)
- Blood-red flanking lines
- "YOU DIED" — 72px, blood red, scales in
- Options: Retry [R] / Main Menu [ESC]
- Triggers 1.2s after both players are downed

### Ending Screen (GameEndingScene)

- Starfield background with twinkling stars
- "✦ AKHAND SUTRA ✦" gold title
- "The Unbroken Thread — Restored" subtitle
- 10 lines of story lore, fade in over 4s
- Stats: Lore Fragments collected, Quests Completed
- RETURN TO MENU button
- Any key after 5s returns to menu

---

## Audio System

All audio is **synthesized in real-time** using the Web Audio API. No pre-recorded files.

**Master Volume**: 0.4 (40%)  
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

Each region plays a background drone tone generated from sine oscillators:

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
| regionIndex | number | Furthest region reached |
| playerStats | object | maxHp, maxStamina, abilityPow |
| statTiers | object | Upgrade level per stat (structure exists, not yet active) |
| completedQuests | string[] | Array of completed quest IDs |
| inventory | string[] | Collected item names |
| loreCount | number | Lore fragments collected (0–7) |
| bossKills | string[] | Defeated boss keys |

### Stat Progression (Structure, Not Yet Active)

Tier system exists for upgrading maxHp, stamina, and abilityPow — currently all fixed at baseline values. Framework is in place for future implementation.

---

## Co-op & Networking

### Two-Player Modes

- **Play Solo**: Single player controls Dhruva; Tara is AI-controlled
- **Host Co-op**: Host game for P2 to join
- **Join Co-op**: Connect to host

### Network Protocol (Stub — Not Fully Implemented)

- Broadcasts player state at **8 Hz** (every 125ms)
- Payload: position, HP, stamina, facing direction, animation state
- Enemy state: ID, position, HP
- Designed for WebSocket relay (no relay server currently active)

### Tether System

If P2 is more than **360px** from P1, P2 is pulled toward P1 at 80px/sec. Prevents players from separating too far in co-op.

### Co-op Design Notes

- Pressure plates require **both players** simultaneously
- Tara's Jal Mend heals **both players**
- If one player is downed, the other must survive while the timer runs out
- Tether ensures players stay in the same battle zone

---

## Quality Settings

Selectable from the main menu; persists via localStorage (`akhand_quality`):

| Setting | Low | Medium (default) | High |
|---------|-----|---------|------|
| Shadows (ellipse under entities) | Off | On | On |
| Occlusion (fade behind trees) | Off | Off | On |
| Max Active Enemies | 8 | 12 | 18 |
| Rabbit Decorations | 0 | 12 | 12 |

**Shadow**: Ellipse drawn at 2.5× scale under each entity  
**Occlusion**: Entities positioned behind trees fade to 38% alpha  
**Rabbits**: Only in Regions 0–2

---

## Code Structure

```
game/
├── index.html                  # HTML entry point
├── src/
│   ├── main.js                 # Phaser game config + scene order
│   ├── constants.js            # Speeds, damage, cooldowns, region names
│   ├── scenes/
│   │   ├── PreloadScene.js     # Asset loading + animation definitions
│   │   ├── MainMenuScene.js    # Main menu UI, region select, settings
│   │   ├── GameScene.js        # Main gameplay loop (~1242 lines)
│   │   ├── UIScene.js          # In-game HUD overlay, boss bars, dialogue
│   │   ├── PauseScene.js       # Pause menu overlay
│   │   └── GameEndingScene.js  # Victory ending screen
│   ├── entities/
│   │   ├── Player.js           # Character controller, combat, abilities, dodge
│   │   ├── Enemy.js            # AI state machine (idle/pursue/attack)
│   │   ├── Boss.js             # Boss AI, phase transitions, stagger system
│   │   ├── NPC.js              # NPCs, dialogue triggers
│   │   └── Projectile.js       # Projectiles from ranged units and bosses
│   ├── systems/
│   │   ├── AbilityManager.js   # Ability definitions + execution (all 6 abilities)
│   │   ├── SaveManager.js      # localStorage persistence
│   │   ├── QuestManager.js     # Quest state tracking
│   │   ├── AudioManager.js     # Synthesized SFX + ambient audio
│   │   ├── QualitySettings.js  # Low/medium/high presets
│   │   └── NetworkManager.js   # Co-op networking stub
│   ├── data/
│   │   ├── regions.js          # 7 region configs
│   │   ├── enemies.js          # 5 enemy type definitions
│   │   └── quests.js           # Main + side quests, NPC dialogue
│   └── map/                    # Map-related assets/configs
├── server/                     # Co-op server (stub)
└── docs/
    └── GAME_DESIGN_DOCUMENT.md # This file
```

### Scene Order

1. `PreloadScene` — loads all assets
2. `MainMenuScene` — main menu
3. `GameScene` — runs the active region; `UIScene` launched as parallel overlay
4. `PauseScene` — launched over `GameScene` on ESC
5. `GameEndingScene` — final victory screen

---

*Akhand Sutra — The Unbroken Thread. Built with Phaser 3.*
