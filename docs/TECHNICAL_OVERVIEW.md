# Akhand Sutra — Technical Overview

> *"The Unbroken Thread"* — A 2-player co-op action RPG built on Phaser 3.

---

## Table of Contents

1. [What Is This Game?](#1-what-is-this-game)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Scene System](#5-scene-system)
6. [Entity System](#6-entity-system)
7. [Systems & Managers](#7-systems--managers)
8. [Data Layer](#8-data-layer)
9. [User Flow](#9-user-flow)
10. [Combat Flow](#10-combat-flow)
11. [Enemy AI](#11-enemy-ai)
12. [Boss System](#12-boss-system)
13. [Save & Persistence](#13-save--persistence)
14. [Multiplayer Networking](#14-multiplayer-networking)
15. [Map Editor](#15-map-editor)
16. [Key Design Decisions](#16-key-design-decisions)

---

## 1. What Is This Game?

Akhand Sutra is a top-down 2-player cooperative action RPG. Two warriors — Dhruva and Tara — travel through 7 mythological regions, battle 6 bosses, collect lore fragments, and ultimately choose how to end a cosmic conflict between unity and freedom. There are 3 possible endings, one of which requires collecting all 20 lore fragments.

| Dimension | Detail |
|---|---|
| Genre | Top-down action RPG |
| Players | 1-2 (local solo or online co-op) |
| Regions | 7 (tutorial → final fortress) |
| Bosses | 6 (each with 3 phases) |
| Endings | 3 (based on choice + lore collection) |
| World Size | 3200 × 2000 px |
| Viewport | 1280 × 720 px |

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Game Engine | **Phaser 3.60.0** (CDN) | Rendering, physics, input, animations |
| Server | **Node.js + ws 8.16.0** | Static file server + WebSocket multiplayer |
| Map Editor | **Konva.js** | Canvas-based map designer |
| Storage | **localStorage** | Save game progress |
| Audio | **Web Audio API** | Synthesized SFX + ambient tones |
| Testing | **Playwright** | End-to-end tests |
| Language | **ES Modules (vanilla JS)** | No bundler — modules loaded via `type="module"` |

**No build step.** The game runs directly from the file system via the Node.js dev server. Phaser is loaded from CDN; all game code is served as raw ES modules.

---

## 3. Project Structure

```
game/
├── index.html              ← Game entry point (loads Phaser CDN + main.js)
├── map_editor.html         ← Standalone collaborative map editor
├── asset_viewer.html       ← Asset browser tool
├── package.json            ← Server deps (ws, playwright)
├── server/
│   └── combined_server.js  ← Node.js HTTP + WebSocket server (port 8080)
├── src/
│   ├── main.js             ← Phaser game config + scene registration
│   ├── constants.js        ← All magic numbers (speeds, damage, sizes)
│   ├── scenes/
│   │   ├── PreloadScene.js     ← Asset loading + animation setup
│   │   ├── MainMenuScene.js    ← Start screen, settings, co-op entry
│   │   ├── PrologueScene.js    ← Narrative intro (7 fade-in lines)
│   │   ├── GameScene.js        ← Core gameplay (world, entities, loop)
│   │   ├── UIScene.js          ← Overlay HUD (HP, boss bar, quests)
│   │   ├── PauseScene.js       ← Pause menu
│   │   └── GameEndingScene.js  ← 3-choice ending + epilogue
│   ├── entities/
│   │   ├── Player.js       ← Dhruva / Tara (input, combat, dodge)
│   │   ├── Enemy.js        ← AI monsters (state machine)
│   │   ├── Boss.js         ← Phase bosses (posture, patterns)
│   │   ├── NPC.js          ← Quest-giving characters
│   │   └── Projectile.js   ← Arrows, orbs, boss attacks
│   ├── systems/
│   │   ├── AbilityManager.js   ← 6 abilities (3 per character)
│   │   ├── AudioManager.js     ← Synthesized audio (Web Audio API)
│   │   ├── LoreManager.js      ← Fragment collection + true ending gate
│   │   ├── NetworkManager.js   ← WebSocket co-op client
│   │   ├── QuestManager.js     ← Quest state + kill tracking
│   │   ├── SaveManager.js      ← localStorage persistence
│   │   └── QualitySettings.js  ← Performance tiers (low/med/high)
│   └── data/
│       ├── regions.js      ← 7 region configs (layout, enemies, portals)
│       ├── enemies.js      ← 5 enemy type stats
│       ├── bosses.js       ← 6 boss configs with phase data
│       └── quests.js       ← Quests, NPC dialogue, lore fragments
└── docs/
    ├── GAME_DESIGN_DOCUMENT.md
    └── TECHNICAL_OVERVIEW.md   ← (this file)
```

---

## 4. Architecture Overview

```mermaid
graph TB
    subgraph Browser
        PH[Phaser 3 Engine]
        subgraph Scenes
            PRE[PreloadScene]
            MM[MainMenuScene]
            PRO[PrologueScene]
            GS[GameScene]
            UI[UIScene]
            PS[PauseScene]
            END[GameEndingScene]
        end
        subgraph Entities
            PL[Player]
            EN[Enemy]
            BO[Boss]
            NP[NPC]
            PR[Projectile]
        end
        subgraph Systems
            AB[AbilityManager]
            AU[AudioManager]
            LO[LoreManager]
            NM[NetworkManager]
            QM[QuestManager]
            SM[SaveManager]
            QS[QualitySettings]
        end
        subgraph Data
            RD[regions.js]
            ED[enemies.js]
            BD[bosses.js]
            QD[quests.js]
        end
        LS[(localStorage)]
    end

    subgraph Server["Node.js Server :8080"]
        HTTP[HTTP Static Files]
        WS[WebSocket Rooms]
        API[/api/assets]
    end

    PH --> Scenes
    GS --> Entities
    GS --> Systems
    Systems --> Data
    SM --> LS
    NM <-->|ws://| WS
    MM -->|fetch| API
```

**How the layers connect:**

- **Phaser** owns the render loop and input. All scenes extend `Phaser.Scene`.
- **GameScene** is the orchestrator — it instantiates all entities and systems, runs the update loop, and emits events.
- **UIScene** runs in parallel as a Phaser overlay scene. It listens to events emitted by GameScene and updates the HUD.
- **Systems** are plain JS classes (no Phaser dependency) except AudioManager (Web Audio API) and NetworkManager (WebSocket).
- **Data files** are static JS objects — no API calls during gameplay.
- **SaveManager** is the only piece that talks to localStorage.

---

## 5. Scene System

### Scene Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PreloadScene : game starts
    PreloadScene --> MainMenuScene : assets loaded
    MainMenuScene --> PrologueScene : PLAY (first time)
    MainMenuScene --> GameScene : LOAD REGION / CONTINUE
    PrologueScene --> GameScene : skip or timeout (16s)
    GameScene --> GameScene : portal to next region
    GameScene --> UIScene : launched as overlay
    GameScene --> PauseScene : Esc key
    PauseScene --> GameScene : resume
    PauseScene --> MainMenuScene : quit
    GameScene --> GameEndingScene : final portal (region 6 cleared)
    GameEndingScene --> MainMenuScene : epilogue complete
    UIScene --> MainMenuScene : YOU DIED → ESC
```

### Scene Relationships

```mermaid
graph LR
    MM[MainMenuScene] -->|scene.start| PRO[PrologueScene]
    MM -->|scene.start| GS
    PRO -->|scene.start| GS[GameScene]
    GS -->|scene.launch overlay| UI[UIScene]
    GS -->|scene.launch overlay| PS[PauseScene]
    GS -->|scene.start| GS2[GameScene next region]
    GS -->|scene.start| END[GameEndingScene]
    UI -->|scene.get GameScene| GS
    PS -->|scene.get GameScene| GS
```

UIScene and PauseScene are **overlay scenes** — they render on top of GameScene without stopping it. GameScene can be restarted with new `regionIndex` data to load the next region without rebuilding the engine.

### Scenes at a Glance

| Scene | Role | Key Methods |
|---|---|---|
| **PreloadScene** | Load all PNG spritesheets, define all animations | `preload()`, `create()` |
| **MainMenuScene** | Start screen, settings, co-op lobby | `create()`, `update()` |
| **PrologueScene** | 7-line narrative intro → title → fade | `create()` |
| **GameScene** | World, entities, input, quests, saves | `create()`, `update()` (1382 lines) |
| **UIScene** | HP bars, boss bar, toasts, quest log | `create()`, `update()` |
| **PauseScene** | Pause menu overlay | `create()` |
| **GameEndingScene** | 3-choice ending + epilogue text | `create()` |

---

## 6. Entity System

### Hierarchy

```mermaid
classDiagram
    class PhaserContainer {
        +x, y
        +active
        +add(child)
    }

    class Player {
        +hp, maxHp
        +stamina
        +godMode, oneShotMode
        +alive, downed, dodging
        +update(time, delta, cursors, keys, enemies, scene)
        +takeDamage(amount, source, scene)
        +_doAttack(damage, hitstop, enemies, scene)
        +_doDodge(scene)
        +getNetState()
        +applyNetState(state)
    }

    class Enemy {
        +typeKey
        +state: IDLE|PURSUE|ATTACK|DEAD
        +hp, damage, range
        +update(time, delta, players, trees)
        +takeDamage(amount, source, scene)
        -_nearestPlayer(players)
        -_doIdle()
        -_doPursue()
        -_doAttack()
    }

    class Boss {
        +bossKey
        +phase: 0|1|2
        +posture, maxPosture
        +state: IDLE|ENTER|FIGHT|STAGGER|DEAD
        +update(time, delta, players)
        +takeDamage(amount)
        -_checkPhaseTransition()
        -_triggerStagger()
        -_executePattern(pattern)
    }

    class NPC {
        +npcId
        +isPlayerNear
        +interact(scene)
        +update(players)
    }

    class Projectile {
        +damage
        +fromEnemy
        +piercing
        +update(delta)
    }

    PhaserContainer <|-- Player
    PhaserContainer <|-- Enemy
    PhaserContainer <|-- Boss
    PhaserContainer <|-- NPC
    PhaserContainer <|-- Projectile
```

### Entity Interactions

```mermaid
graph TD
    PL[Player] -->|takeDamage| PL
    EN[Enemy] -->|takeDamage| PL
    BO[Boss] -->|takeDamage| PL
    PL -->|_doAttack → takeDamage| EN
    PL -->|hitBoss| BO
    PL -->|abilities via| AB[AbilityManager]
    AB -->|damage, heals| PL
    AB -->|spawn| PR[Projectile]
    BO -->|_fireProjectile| PR
    EN -->|_fireProjectile| PR
    PR -->|collision → takeDamage| PL
    PR -->|collision → takeDamage| EN
    NP[NPC] -->|interact → start| QM[QuestManager]
```

---

## 7. Systems & Managers

### Systems Overview

```mermaid
graph LR
    GS[GameScene]

    GS --> AU[AudioManager\nWeb Audio API\nSFX + ambient]
    GS --> QM[QuestManager\ntrack active\ncompleted quests]
    GS --> LO[LoreManager\ncollected fragments\ntrue ending gate]
    GS --> NM[NetworkManager\nWebSocket\nco-op sync]
    GS --> SM[SaveManager\nlocalStorage\nregion + stats]
    GS --> QS[QualitySettings\nlow/med/high\nmaxEnemies, shadows]
    GS --> AB[AbilityManager\n6 abilities\nQ E R per char]
```

### AbilityManager

Manages 6 abilities — 3 per character. Each ability is a pure JS object with stamina cost, cooldown, and an `execute(player, scene)` function.

| Character | Key | Ability | Effect |
|---|---|---|---|
| Dhruva | Q | Prithvi Slam | AoE 150px, 80 dmg |
| Dhruva | E | Agni Shield | 3s damage reduction + reflect |
| Dhruva | R | Agni Burst | AoE 250px, 120 dmg + knockback |
| Tara | Q | Vayu Dash | Teleport 300px + 50 dmg slash |
| Tara | E | Jal Mend | Heal both players +60 HP |
| Tara | R | Vayu Storm | Chain lightning (3 enemies) |

### AudioManager

All audio is synthesized via the Web Audio API — no audio files. Each sound is built from oscillators (`OscillatorNode`) and white noise buffers.

```
audio.hit()          → 220Hz sawtooth burst + noise
audio.dodge()        → 600/900Hz sine pair
audio.perfectDodge() → 880/1100/1320Hz triad (ascending)
audio.ability()      → 440/660Hz square chord
audio.bossPhase()    → 200→400Hz sawtooth sweep
audio.startAmbient(regionIndex) → per-region drone tone
```

### QuestManager

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> active : trigger fired\n(npc_talk / region_enter)
    active --> completed : completion condition met\n(enemy_kills / boss_kill / pressure_plate)
    completed --> [*]
```

### SaveManager

Saves to `localStorage` key `akhand_sutra_save` as JSON:

```json
{
  "regionIndex": 3,
  "playerStats": { "maxHp": 200, "maxStamina": 100, "abilityPow": 1.0 },
  "completedQuests": ["gramavana_main", "mahavana_sq1"],
  "inventory": [],
  "collectedLoreIds": ["lore_001", "lore_002"],
  "bossKills": ["nagraj_kaliya"]
}
```

Saves happen on **portal use only** — there is no mid-region autosave.

---

## 8. Data Layer

All game content lives in static JS data files. No database, no API calls during gameplay.

```mermaid
graph TD
    RG[regions.js\n7 region configs] --> GS[GameScene]
    EN[enemies.js\n5 enemy types] --> GS
    BO[bosses.js\n6 boss configs] --> GS
    QD[quests.js\nquests + NPCs + lore] --> GS

    GS -->|reads| RG
    GS -->|spawns enemies via| EN
    GS -->|spawns boss via| BO
    QM[QuestManager] -->|reads| QD
    NP[NPC] -->|dialogue from| QD
    LO[LoreManager] -->|fragments from| QD
```

### Region Config Shape

Each region defines the full world for that level:

```javascript
{
  index: 3,
  name: "Nāga Pātāl",
  subtitle: "The Serpent Realm",
  bgColor: 0x3a1a00,
  difficulty: 1.2,          // scales enemy HP and damage
  bossKey: "nagraj_kaliya",
  spawnPos: { x: 200, y: 1000 },
  bossPos: { x: 2800, y: 1000 },
  portalBack: { x: 120, y: 1000 },
  portalNext: { x: 3080, y: 1000 },
  enemySpawnMode: "spawner", // or "fixed"
  enemyTypes: ["melee", "orc", "elite"],
  portalUnlock: "boss_kill", // gate condition for next portal
  worldFragments: [ { fragmentId: "lore_009", x: 600, y: 800 } ],
  serpentRealm: true,        // visual style flag
}
```

### Enemy Types

| Key | Sprite | HP | Speed | Dmg | Range |
|---|---|---|---|---|---|
| `melee` | Goblin | 80 | 120 | 15 | 60px |
| `ranged` | Archer | 55 | 90 | 12 | 350px |
| `flying` | Lancer | 65 | 135 | 18 | 80px |
| `orc` | Orc | 130 | 105 | 22 | 65px |
| `elite` | Ogre | 200 | 90 | 32 | 75px |

All stats are multiplied by the region's `difficulty` value at spawn.

### Boss Configs

Each boss has 3 phases with escalating stats and attack patterns:

```javascript
vanaraksha: {
  maxHp: 1200,
  maxPosture: 400,
  phases: [
    { hpThreshold: 1.0, speed: 80,  attackCd: 2000, patterns: ["slam", "root"] },
    { hpThreshold: 0.5, speed: 110, attackCd: 1600, patterns: ["slam", "root", "spore_burst"] },
    { hpThreshold: 0.3, speed: 140, attackCd: 1200, patterns: ["slam", "root", "spore_burst", "rage_slam"] },
  ]
}
```

---

## 9. User Flow

### Full Game Flow

```mermaid
flowchart TD
    A([Launch game]) --> B[PreloadScene\nLoad assets, build animations]
    B --> C[MainMenuScene\nPlay / Load / Co-op]

    C -->|New Game| D[PrologueScene\n7 story lines → title card]
    C -->|Load Region| F
    C -->|Continue| F
    C -->|Host Co-op| E[NetworkManager.createRoom\nGet 4-letter code]
    E --> F

    D --> F[GameScene Region 0\nGramavana — tutorial]

    F --> G{Explore Region}
    G -->|Talk to NPC| H[QuestManager.start quest]
    G -->|Kill enemies| I[QuestManager.onEnemyKill]
    G -->|Collect lore| J[LoreManager.collect]
    G -->|Approach boss arena| K[Boss spawns, UIScene intro]

    H --> G
    I --> G
    J --> G

    K --> L{Fight Boss\n3 phases}
    L -->|Defeat boss| M[unlock next portal\nSave progress]

    M --> N{Use portal}
    N -->|Back portal| O[Previous region]
    N -->|Next portal| P{Region 6 cleared?}

    P -->|No| Q[GameScene next region\nRepeat]
    Q --> G
    P -->|Yes| R[GameEndingScene\n3 ending choices]

    R -->|Restore Thread| S1[Epilogue A\n+ credits]
    R -->|Break Thread| S2[Epilogue B\n+ credits]
    R -->|Rewrite Thread\nRequires 20/20 lore| S3[True Ending\nEpilogue C\n+ credits]

    S1 --> T[MainMenuScene\nsave cleared]
    S2 --> T
    S3 --> T
```

### Death Flow

```mermaid
flowchart LR
    A[Both players downed] --> B[game_over event]
    B --> C[UIScene: YOU DIED screen]
    C -->|R key| D[Restart current region\nload saved stats]
    C -->|ESC| E[Main Menu]
    C -->|5s timeout| E
```

---

## 10. Combat Flow

### Player Attack

```mermaid
sequenceDiagram
    participant Input
    participant Player
    participant Enemy
    participant UIScene
    participant AudioManager

    Input->>Player: J key down (light attack)
    Player->>Player: Check _lightCd ≤ 0 and not dodging
    Player->>Player: _lightCd = 500ms
    Player->>Player: _doAttack(LIGHT_DMG=20, hitstop=40ms)
    Player->>Player: Arc detection 130°, 175px range
    loop Each enemy in cone
        Player->>Enemy: takeDamage(damage, player, scene)
        Enemy->>Enemy: Reduce HP
        Enemy->>UIScene: emit boss_hp_changed (if boss)
        alt HP ≤ 0
            Enemy->>Enemy: die(), alive=false
            Enemy->>GameScene: emit enemy_killed
        end
    end
    Player->>AudioManager: audio.hit()
    Player->>Player: Hitstop 40ms (animation freeze)
```

### Dodge + Perfect Dodge

```mermaid
sequenceDiagram
    participant Player
    participant Enemy
    participant GameScene

    Enemy->>Player: notifyIncomingAttack()
    Player->>Player: _incomingAttackTimer = 200ms (window open)

    Note over Player: Player presses Shift during window

    Player->>Player: _doDodge() — 280% speed, 300ms
    Player->>Player: _perfectDodgeReady = true

    alt If attack lands during dodge window
        Player->>Player: checkPerfectDodge()
        Player->>GameScene: emit perfect_dodge
        GameScene->>GameScene: timeScale = 0.25 for 500ms (slow-mo)
        Player->>Player: _nextAttackMult = 1.5, stamina += 25
    end
```

---

## 11. Enemy AI

### State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE : spawn

    IDLE --> IDLE : roam near spawn\nevery 2–4 seconds
    IDLE --> PURSUE : player within 350px

    PURSUE --> ATTACK : player within attack range
    PURSUE --> IDLE : no target found

    ATTACK --> PURSUE : player moves out of range
    ATTACK --> IDLE : no target (freeroam cheat)

    ATTACK --> ATTACK : attack cooldown\nranged: fire projectile\nmelee: delay 300ms → damage

    PURSUE --> DEAD : hp ≤ 0
    ATTACK --> DEAD : hp ≤ 0
    IDLE --> DEAD : hp ≤ 0
    DEAD --> [*]
```

### Ranged Enemy Cover Logic

Ranged enemies (Archers) use a cover system: when >200px from the target, they evaluate nearby tree positions and move toward the one with the best score (`-distanceToTree + bonus if tree has line-of-sight to target`). This means archers strafe sideways to hide behind trees before firing.

---

## 12. Boss System

### Boss State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE : player near boss arena
    IDLE --> ENTER : trigger (within BOSS_TRIGGER_DIST=300px)

    ENTER --> FIGHT : enter animation complete\ncamera pans back

    FIGHT --> STAGGER : posture ≥ maxPosture
    STAGGER --> FIGHT : 2.2s stagger duration ends

    FIGHT --> FIGHT : attack pattern loop
    FIGHT --> DEAD : HP ≤ 0

    DEAD --> [*]
```

### Phase Transitions

```mermaid
flowchart TD
    A[Boss takes damage] --> B{HP threshold crossed?}
    B -->|HP ≤ 50%| C[Phase 1]
    B -->|HP ≤ 30%| D[Phase 2]
    B -->|No| E[Continue current phase]

    C --> F[Invincibility 2.2s\nScale pulse\nCamera shake\nEmit boss_phase_changed]
    D --> F
    F --> G[New phase config:\nhigher speed, shorter CD,\nmore attack patterns]
```

### Posture System

The posture bar is a secondary damage meter — dealing damage also fills the posture bar at a rate of `damage × 0.4`. When the posture bar fills completely, the boss staggers for 2.2 seconds (fully immobile, vulnerable to all damage). This creates a rhythm: build posture between attacks, burst damage during stagger.

```mermaid
graph LR
    A[Player hits boss] --> B[HP -= damage]
    A --> C[posture += damage × 0.4]
    C --> D{posture ≥ maxPosture?}
    D -->|Yes| E[STAGGER 2.2s\nposture = 0\nUIScene: POSTURE BROKEN overlay]
    D -->|No| F[posture regens slowly\ncfg.postureRegen/s]
```

---

## 13. Save & Persistence

### Save Trigger Points

```mermaid
flowchart TD
    A[Player walks into next portal] --> B[_checkPortals every 8 frames]
    B --> C[_usePortal isNext=true]
    C --> D[_saveProgress newIndex]
    D --> E[Capture:\nregionIndex\nplayerStats\ncompletedQuests\ncollectedLoreIds\nbossKills]
    E --> F[SaveManager.save data\n→ localStorage]
    F --> G[_fadeAndTransition newIndex]
    G --> H[scene.restart regionIndex]
    H --> I[GameScene.create\nSaveManager.load\nRestore player stats + quests + lore]
```

### What Is Saved vs. What Is Not

| Saved | Not Saved |
|---|---|
| Region index | Mid-region enemy positions |
| Player HP/stamina/ability power | Loot on the ground |
| Completed quest IDs | NPC interaction state per session |
| Collected lore fragment IDs | Current enemy wave state |
| Boss kill list | |

---

## 14. Multiplayer Networking

### Connection Flow

```mermaid
sequenceDiagram
    participant HostBrowser
    participant Server
    participant ClientBrowser

    HostBrowser->>Server: WebSocket connect
    HostBrowser->>Server: ROOM_CREATE
    Server->>HostBrowser: ROOM_READY { code: "ABCD", role: "host" }

    ClientBrowser->>Server: WebSocket connect
    ClientBrowser->>Server: ROOM_JOIN { code: "ABCD" }
    Server->>ClientBrowser: ROOM_READY { role: "client" }
    Server->>HostBrowser: CLIENT_JOINED

    loop Every 125ms (8Hz)
        HostBrowser->>Server: PLAYER_STATE { x, y, hp, anim }
        Server->>ClientBrowser: PLAYER_STATE (relayed)
        ClientBrowser->>Server: PLAYER_STATE
        Server->>HostBrowser: PLAYER_STATE (relayed)
    end

    HostBrowser->>Server: disconnect
    Server->>ClientBrowser: HOST_DISCONNECTED
    ClientBrowser->>ClientBrowser: fallback to AI for P2
```

### Sync Model

- **P1 (local) + P2 (remote)**: Each player controls their own character; only position, HP, and animation state are synced.
- **8Hz broadcast** (125ms tick): Low bandwidth trade-off; acceptable for cooperative (non-competitive) play.
- **No server-side simulation**: The server is a relay only — no game logic runs on the server.
- **Fallback**: If the remote peer disconnects, P2 reverts to AI-controlled follow behavior.

---

## 15. Map Editor

The map editor (`map_editor.html`) is a standalone tool separate from the game. It uses **Konva.js** for the canvas layer and connects to the same Node.js WebSocket server for real-time collaboration.

```mermaid
graph TD
    A[map_editor.html] --> B[Konva.js Canvas\n3200×2000 world]
    A --> C[Asset Library\nfetch /api/assets]
    A --> D[WebSocket\nws://localhost:8080]

    B --> E[bgLayer\nBackground fills]
    B --> F[spritesLayer\nPlaced sprites]
    B --> G[selLayer\nSelection + transformer]

    C --> H[Categories:\nTerrain / Monsters / Units\nBuildings / Resources / FX]

    D --> I[FULL_STATE sync\nSPRITE_ADD / MOVE / DELETE\nBG_COLOR]

    J[Tools] --> K[Select — move sprites]
    J --> L[Pan — navigate]
    J --> M[Delete — remove sprites]
    J --> N[Draw — freehand brush]

    A --> O[Export]
    O --> P[JSON save\nmap_editor_save.json]
    O --> Q[PNG export\n3200×2000 px]
    O --> R[Crop tool\nsave asset region]
```

### Asset API

The server exposes `GET /api/assets` which scans the asset directories and returns a categorized manifest. The map editor uses this to populate its asset library — no hardcoded asset lists.

---

## 16. Key Design Decisions

### Why Phaser 3 (not Unity/Godot)?

Phaser runs in the browser with zero install. Co-op over WebSocket works without a launcher, matchmaking service, or NAT traversal — players share a URL and a 4-letter room code.

### Why No Build Step?

ES modules are loaded directly. This keeps the dev loop instant: edit a file, refresh the browser. No webpack, no transpilation, no hot-reload server. The trade-off is no TypeScript and slightly slower cold load (many small module fetches), both acceptable for a game this size.

### Why Synthesized Audio?

Web Audio API synthesis means zero audio asset files, no licensing concerns, and audio that can dynamically pitch/speed based on game state. The trade-off is that the sounds are abstract (beeps, sweeps) rather than realistic.

### Why localStorage for Saves?

Simple, zero-dependency, works offline. The save payload is small (<2KB). The trade-off is save data is per-browser, not per-account.

### Posture System

Inspired by Sekiro's stamina meter. It prevents degenerate strategies (spam attacks → free stagger) because posture regens between bursts. Players must coordinate burst windows during the 2.2s stagger, which rewards co-op coordination.

### Poisson-Disk Tree Placement

Trees are placed using Poisson-disk sampling with a seeded deterministic RNG. This ensures forest areas look organic (not grid-like, not random clumps) and always generate identically. Exclusion zones around portals, boss arenas, and NPC positions are respected.

### 8Hz Network Tick

Co-op is cooperative, not competitive — players don't need frame-perfect sync. 125ms latency is imperceptible for "follow your friend" play. Higher tick rates would multiply bandwidth usage for no perceptible benefit.

---

## Summary — How Everything Connects

```mermaid
graph TB
    subgraph "Boot"
        PRE[PreloadScene] -->|assets ready| MM[MainMenuScene]
    end

    subgraph "Session Start"
        MM -->|new game| PRO[PrologueScene] --> GS
        MM -->|load/continue| GS[GameScene]
        MM -->|co-op host/join| NM[NetworkManager] --> GS
    end

    subgraph "Gameplay Loop"
        GS -->|creates| PL[Players]
        GS -->|creates| EN[Enemies]
        GS -->|creates| BO[Boss]
        GS -->|creates| NP[NPCs]
        GS -->|launches| UI[UIScene overlay]

        PL -->|combat| EN
        PL -->|combat| BO
        NP -->|triggers| QM[QuestManager]
        PL -->|collects| LO[LoreManager]
        GS -->|sounds| AU[AudioManager]
        GS -->|reads| QS[QualitySettings]

        GS -->|events| UI
        UI -->|reads| GS
    end

    subgraph "Progression"
        GS -->|portal use| SM[SaveManager → localStorage]
        SM -->|restore| GS
        GS -->|region 6 cleared| END[GameEndingScene]
        END -->|epilogue done| MM
    end
```

The game is a **single main loop** (GameScene) surrounded by **stateless data** (regions/enemies/bosses/quests), **event-driven UI** (UIScene listening on GameScene's event emitter), and **side-effect managers** (save, audio, network, quests) that the GameScene calls in response to gameplay events.
