# Akhand Sutra — Full Story & Lore Implementation
**Date:** 2026-06-08
**Approach:** Data-First (Approach 1)

---

## Overview

Implement the complete Akhand Sutra story script into the game. The story reveals that Viyogasur (the final boss) is actually Ekatmadeva, a betrayed god who was renamed a demon by the five surviving gods. Players discover the truth through updated NPC dialogue, lore fragments collected across all seven regions, ambient echo triggers, boss dialogue moments, a prologue cinematic, and a three-choice ending system.

---

## Section 1 — Data Layer

### 1.1 `src/data/quests.js`

**`NPC_DIALOGUE` rewrite**
All existing NPC dialogue keys are rewritten to match the story script exactly. Each entry retains the `first`, `active`, and `completed` fields.

Key NPCs and their story roles:

| NPC ID | Region | Story Role |
|---|---|---|
| `elder_mahesh` | 0 | First hint that official history may be false |
| `village_healer` | 0 | Warns that shrine names were changed |
| `village_child` | 0 | Notes there used to be six gods, not five |
| `village_warrior` | 0 | Combat tutorial, thread lore |
| `gramavana_villager` | 0 | Healing herbs quest |
| `mahavana_hermit` | 1 | Studies what gods left behind when they lied |
| `forest_scholar` | 1 | Notes the six-symbol pattern erasure |
| `lost_merchant` | 1 | Casual witness — shares the recurring silver thread dream |
| `vrindavana_sage` | 2 | First direct reference to the mural with six halos |
| `vrindavana_dancer` | 2 | Hymn with six notes, last note always missing |
| `naga_oracle` | 3 | Reveals the prison was made by gods, not demons |
| `naga_merchant` | 3 | Tears reflect memories — always five judges, one accused |
| `temple_priest` | 4 | Starts as a true believer, breaks when shown the vault evidence |
| `deva_guardian` | 4 | Admits he never questioned what his duty protected |
| `apsara_guide` | 5 | Directly names Ekatmadeva under the cloud seals |
| `deva_warrior` | 5 | Questions duty after learning the truth |
| `akhand_voice` | 6 | The Voice in the Void — final lore gatekeeper |

**`QUESTS` title and description updates**

| Quest ID | New Title | Trigger |
|---|---|---|
| `gramavana_main` | The Elder's Warning | `npc_talk:elder_mahesh` |
| `mahavana_main` | The Hermit's Silence | `region_enter:1` |
| `vrindavana_main` | The Grove Remembers | `region_enter:2` |
| `nagapatal_main` | The Serpent's Memory | `region_enter:3` |
| `devamandira_main` | The Temple of the Hidden Face | `region_enter:4` |
| `swargaseema_main` | The Sky That Lied | `region_enter:5` |
| `viyogadurga_main` | The Forgotten Name | `region_enter:6` |

Side quest descriptions are updated to reference the lore (e.g. "The healer needs herbs — she says the oldest remedies carry memory alongside medicine").

**New export: `LORE_FRAGMENTS`**

Array of 20 fragment definitions. Each fragment has:
```js
{
  id: string,          // unique key
  region: number,      // 0–6
  source: string,      // 'npc' | 'boss' | 'world'
  npcId?: string,      // if source === 'npc'
  bossKey?: string,    // if source === 'boss'
  x?: number,          // if source === 'world'
  y?: number,          // if source === 'world'
  title: string,       // short name shown in lore log
  text: string,        // full lore text shown in dialogue box
}
```

Distribution (20 total — 2 for region 0, 3 per region for regions 1–6):

| Region | NPC fragment | Boss fragment | World fragment |
|---|---|---|---|
| 0 — Gramavana | elder_mahesh first talk | — | Cracked stone near shrine |
| 1 — Mahāvana | mahavana_hermit complete | vanaraksha kill | Carved roots beneath ancient tree |
| 2 — Vrindavana | vrindavana_sage complete | vanasur kill | Six-halo mural |
| 3 — Nāga Pātāl | naga_oracle complete | nagraj_kaliya kill | Drowned reliquary |
| 4 — Deva Mandira | temple_priest (lore unlock) | pashana_daitya kill | Vault golden mural |
| 5 — Swarga Seema | apsara_guide complete | vayu_rakshasa kill | Cloud seal inscription |
| 6 — Viyoga Durga | akhand_voice first talk | viyogasur kill | Prison echo stone |

World fragments use the `[F]` interact system (same as NPCs). Their positions are defined in `regions.js`.

---

### 1.2 `src/data/bosses.js`

Each boss gets updated `lore` text matching the story's post-defeat region dialogue.

Viyogasur gets three new fields:

```js
introLines: [
  "So the world still remembers the name they gave me.",
  "Tell me, warrior... did the temples teach you to hate me?",
  "Did they tell you how many centuries I watched them twist truth into law?",
  "I was not born a demon. I was made one.",
],
phaseLines: [
  "",                                                        // phase 1 — no line
  "They broke my body. They could not break the bond itself.", // phase 2 (50% HP)
  "Then let the world see what happens when a god is forced to become the thing it was accused of being.", // phase 3 (30% HP)
],
defeatLines: [
  "At last... someone saw it.",
  "Not the monster. The wound.",
  "Not the demon. The name they carved into me.",
  "I did not sever the thread. I refused to let them own it.",
  "That is why they feared me.",
  "Now choose: restore their order, accept their lie, or weave a new one from the ashes of both.",
],
```

Other bosses get one-line `phaseLines` entries (short, atmospheric — not narrative speeches).

---

### 1.3 `src/data/regions.js`

**Updated `subtitle` strings:**

| Region | New Subtitle |
|---|---|
| 0 — Gramavana | The Village of Ash and Memory |
| 1 — Mahāvana | The Great Forest |
| 2 — Vrindavana | The Sacred Grove |
| 3 — Nāga Pātāl | The Serpent Realm |
| 4 — Deva Mandira | The Temple of the Gods |
| 5 — Swarga Seema | The Edge of Heaven |
| 6 — Viyoga Durga | Fortress of Separation |

**New `echoTriggers` array per region** — proximity zones checked on slow tick. When the player enters the radius for the first time, the echo text appears in the dialogue box and auto-dismisses after 4 seconds. Each trigger fires once per session.

```js
echoTriggers: [
  { id: 'echo_mahavana_forest', x: 1800, y: 950, r: 200,
    text: '⟨Voice in the Trees⟩ "They called me the problem because I refused to become their excuse."' }
]
```

Regions with echo triggers: 1, 3, 4, 5, 6.

**New `worldFragments` array per region** — positions of interactable lore objects. Each entry is:
```js
{ fragmentId: 'lore_grove_mural', x: 1800, y: 900 }
```

---

## Section 2 — New Systems

### 2.1 `src/systems/LoreManager.js` (new)

Single responsibility: track collected lore fragments, persist to save data, expose status.

```js
export class LoreManager {
  constructor(saveManager) { ... }
  collect(fragmentId)   // idempotent — safe to call twice
  has(fragmentId)       // → boolean
  count()               // → number of collected fragments
  total()               // → 20 (constant from LORE_FRAGMENTS.length)
  canTrueEnding()       // → count() === total()
  toArray()             // → string[] of collected IDs (for saving)
  load(ids)             // restore from save data
}
```

Fragment collection is wired at three points in `GameScene`:
- **Boss kill**: `_onBossKilled()` calls `loreManager.collect(bossLoreFragmentId)`
- **NPC talk**: `NPC.interact()` returns the fragment ID alongside the line (or GameScene handles it post-interact)
- **World object**: new `_handleWorldFragment(fragmentId)` in GameScene, called from `F` interact

Emits `lore_collected` event (Phaser event on GameScene) so UIScene can update the counter.

---

### 2.2 `src/scenes/PrologueScene.js` (new)

Plays automatically on first new game only (checked via `SaveManager` flag `prologueSeen`). Skipped on continue/load.

**Flow:**
1. Black screen, faint silver horizontal line graphic centered
2. Seven narrator lines from the prologue script fade in sequentially, 1.8s apart
3. After the last line, a 1.5s pause, then fade to black
4. Transitions to `GameScene` region 0

**Skip:** Any key press or 14-second timeout skips immediately to `GameScene`.

**Lines (from script):**
1. "Before the world had name, before the stars had fire, there was only the thread."
2. "It bound all souls into one song."
3. "And within that song, six gods sang the world into being."
4. "But unity is a power that frightens the proud."
5. "And the gods who feared the future chose betrayal."
6. "They called him Viyogasur. They called him demon. They called truth a crime."
7. "Now the thread weakens. And two souls will walk the broken road."

Followed by the title card: **AKHAND SUTRA** / *The Unbroken Thread*

---

### 2.3 `src/scenes/GameEndingScene.js` (rewrite)

Triggered when GameScene emits `game_ending` with `{ loreCount, loreTotal }`.

**Flow:**
1. Viyogasur's `defeatLines` scroll one by one (same fade-in style as prologue)
2. "Now choose…" — pause
3. Three ending panels appear, keyboard-navigable (W/S to select, Enter to confirm):

```
┌─────────────────────────────┐
│  ◈  Restore the Thread      │  always available
├─────────────────────────────┤
│  ◈  Break the Thread        │  always available
├─────────────────────────────┤
│  🔒 Rewrite the Thread      │  locked if lore incomplete
│     (Requires 20/20 frags)  │
└─────────────────────────────┘
```

4. On selection: narrator epilogue text for that ending scrolls
5. Fade to black → credits text (the sample epilogue voice-over from the script)
6. Credits fade → return to main menu

---

### 2.4 Ambient Echo System (`GameScene.js`)

Added to the existing slow-tick loop (every 16 frames). For each `echoTrigger` in the current region:

- Check if any player is within radius `r`
- If yes, and `_firedEchoes` set does not contain `trigger.id`:
  - Add to `_firedEchoes`
  - Emit `show_dialogue` with the echo text
  - Schedule `hide_dialogue` after 4000ms (via `time.delayedCall`)

Echo dialogue does NOT set `_dialogueActive = true` — it is display-only and cannot be dismissed with F (it auto-hides). This avoids interfering with NPC interaction.

---

### 2.5 World Lore Object System (`GameScene.js`)

`_createWorldFragments(region)` spawns interactable objects at each position in `region.worldFragments`:
- Visual: small gold pulsing circle (`add.circle`) with a `[F]` prompt that appears on approach (same proximity logic as NPCs, 80px radius)
- On F interact: collect fragment via LoreManager, show fragment text in dialogue box (standard `_dialogueActive` flow), destroy the object so it cannot be re-collected in the same session

Fragment collected state persists via LoreManager/SaveManager so re-entering a region does not re-spawn already-collected world fragments.

---

## Section 3 — UI Changes

### 3.1 Lore Fragment Counter (`UIScene.js`)

Added below the region name label in the top-right HUD:
```
Gramavana          ◈ 2 / 18
```
Gold `◈` icon, 10px monospace. Updates on `lore_collected` event. Shown from game start. Total is always 20.

### 3.2 Viyogasur Final Speech (`UIScene.js`)

When `boss_killed` fires and the boss is `isFinal: true`:
- Intercept before the standard "ENEMY FELLED" sequence
- Show a full-screen cinematic: black veil fades in, then `defeatLines` appear one by one (same style as prologue)
- After the last line, a short pause, then transition to `GameEndingScene`

Standard "ENEMY FELLED" text is suppressed for the final boss.

### 3.3 Boss Phase Lines (`UIScene.js`)

`boss_phase_changed` event payload is extended from `{ label }` to `{ label, phaseIndex, boss }`. `_onBossPhase` uses `phaseIndex` to look up `boss.cfg.phaseLines[phaseIndex]`. For Viyogasur, if that line is non-empty, the full dialogue line replaces the short phase label. Displayed large and centered, fading out after 3 seconds. All other bosses keep the existing short phase label behaviour unchanged.

### 3.4 Viyogasur Pre-Fight Intro (`UIScene.js` / `GameScene.js`)

When the boss arena is entered (`boss_entered` event), Viyogasur's `introLines` play as sequential dialogue in the standard bottom dialogue box before the fight begins. The boss is spawned but does not attack during intro. After the last intro line, a 1-second pause, then the fight begins.

Non-final bosses skip this and go straight to the existing boss intro overlay (name card).

### 3.5 Quest Log Lore Tab (`UIScene.js`)

The existing `[U]` quest panel gets a second section below active quests: **LORE FRAGMENTS** with a count header and a list of collected fragment titles. No new key binding. Scrolls within the same panel if the list is long.

---

## File Change Summary

| File | Type | Change |
|---|---|---|
| `src/data/quests.js` | Edit | Rewrite `NPC_DIALOGUE`, update `QUESTS` titles/descs, add `LORE_FRAGMENTS` export |
| `src/data/bosses.js` | Edit | Update `lore` strings, add `introLines`/`phaseLines`/`defeatLines` to all bosses |
| `src/data/regions.js` | Edit | Update `subtitle` strings, add `echoTriggers` and `worldFragments` arrays |
| `src/systems/LoreManager.js` | New | Fragment tracking, persistence, true-ending gate |
| `src/scenes/PrologueScene.js` | New | Text-crawl opening cinematic |
| `src/scenes/GameEndingScene.js` | Rewrite | Viyogasur speech + 3-choice ending + credits |
| `src/scenes/GameScene.js` | Edit | LoreManager wiring, echo system, world fragment objects, intro sequence |
| `src/scenes/UIScene.js` | Edit | Lore counter, phase lines, final boss speech, lore tab in quest panel |
| `src/main.js` | Edit | Register `PrologueScene` in scene list |

---

## Out of Scope (future work)

- Animated prologue (moving shapes, six-god silhouettes)
- Voice acting
- Save slot selection screen
- Per-ending art/illustrations
- In-world murals as actual image assets
