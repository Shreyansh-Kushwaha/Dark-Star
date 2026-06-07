# Ability System Design
**Date:** 2026-06-07
**Scope:** Define and implement Q/E/R abilities for Dhruva and Tara via a new AbilityManager system

---

## Overview

Abilities (Q, E, R) exist in the codebase with cooldown tracking and UI indicators but have no actual effects. This spec defines 6 abilities — 3 per character — and the AbilityManager system that powers them. Abilities cost both stamina and a per-key cooldown, making them tactical choices rather than free tools.

---

## Architecture

### New file: `src/systems/AbilityManager.js`

Holds all ability data definitions and execution logic. Follows the existing Manager pattern (QuestManager, AudioManager, SaveManager).

```
AbilityManager
  ├── ABILITIES (data)         — 6 ability definitions keyed by character + key
  ├── getAbility(char, key)    — returns ability definition for stamina/cooldown check in Player
  ├── use(key, player, scene)  — executes the ability effect
  ├── _aoeSlam(player, scene)  — Dhruva Q
  ├── _agniShield(player, scene) — Dhruva E
  ├── _agniBurst(player, scene)  — Dhruva R
  ├── _vayuDash(player, scene)   — Tara Q
  ├── _jalMend(player, scene)    — Tara E
  └── _vayuStorm(player, scene)  — Tara R
```

### Changes to `src/entities/Player.js`

In `_handleInput`, for each Q/E/R key press:
1. Resolve character: `const char = this.isP1 ? 'dhruva' : 'tara'`
2. Call `AbilityManager.getAbility(char, key)` to get stamina cost
3. Check `this._abilityCds[key] <= 0 && this.stamina >= ability.stamina`
4. If valid: deduct stamina, call `AbilityManager.use(key, this, scene)`, reset cooldown
5. Emit `ability_used` event for UIScene

Agni Shield stores its remaining duration on the player as `this._agniShieldTimer` (ms). The existing `takeDamage` path checks this flag to halve incoming damage and emit burn damage back to the attacker.

No structural refactor of Player required.

### Changes to `src/scenes/UIScene.js`

- When `ability_used` event fires: briefly show the ability name (1.5s fade) above the Q/E/R bar
- No layout change to existing cooldown bar

---

## Dhruva's Abilities — Agni/Prithvi (Fire & Earth)

Dhruva is the heavy fighter: AoE damage, burst, and a defensive option.

### Q — Prithvi Slam
- **Stamina cost:** 20
- **Cooldown:** 8 000 ms
- **Effect:** AoE ground pound — all enemies within 150px of Dhruva take `80 × abilityPow` damage and receive a 300ms hitstop (brief stun)
- **Visual:** Yellow expanding circle ring (radius 0→150px) that fades out over 400ms

### E — Agni Shield
- **Stamina cost:** 25
- **Cooldown:** 10 000 ms
- **Effect:** 3s fire aura — incoming damage reduced by 50%; enemies that land a melee hit on Dhruva take 10 burn damage in return
- **Visual:** Orange pulsing ellipse rendered around Dhruva for 3s duration; removed on expiry

### R — Agni Burst
- **Stamina cost:** 40
- **Cooldown:** 12 000 ms
- **Effect:** Massive 250px fire explosion — `120 × abilityPow` damage to all enemies in range, 300px knockback, camera shake
- **Visual:** Large red-orange circle that expands (0→250px) and fades over 600ms; camera shake via `this.cameras.main.shake(300, 0.012)`

---

## Tara's Abilities — Vayu/Jal (Wind & Water)

Tara is the agile support: a damage dash, team heal, and a chaining projectile.

### Q — Vayu Dash
- **Stamina cost:** 15
- **Cooldown:** 8 000 ms
- **Effect:** Dash 300px in Tara's current facing direction; any enemy whose center falls within a 60px-wide rectangle along the dash path takes `50 × abilityPow` damage. No invincibility frames (distinct from dodge — this is offensive).
- **Visual:** 3 fading cyan ghost ellipses left behind Tara during the dash, each shrinking to 0 alpha over 300ms

### E — Jal Mend
- **Stamina cost:** 30
- **Cooldown:** 10 000 ms
- **Effect:** Healing wave — restores 60 HP to both Dhruva and Tara. Uses the existing `healing_aura` scene event so the existing visual fires automatically.
- **Visual:** Existing healing aura ring (blue pulse from Tara's position)

### R — Vayu Storm
- **Stamina cost:** 35
- **Cooldown:** 12 000 ms
- **Effect:** Launches a wind projectile from Tara toward the nearest enemy within 600px. On hit, it chains to up to 2 additional enemies within 200px of the previous target (3 targets total), dealing `70 × abilityPow` to each. If no enemy exists within 600px, ability does not fire (stamina and cooldown are not consumed). Uses existing `spawn_projectile` infrastructure.
- **Visual:** Blue-white projectile that visibly arcs/hops between enemies

---

## Damage Scaling

All ability damage values are multiplied by `player.abilityPow` (default 1.0). The existing stat upgrade system (stat tier: `abilityPow`) hooks in automatically — no extra wiring needed.

---

## Out of Scope

- Ability upgrades / unlocking new abilities
- Multiplayer sync of ability effects via NetworkManager
- Sound effects for abilities (AudioManager integration)
- Gamepad input for abilities

---

## File Checklist

| File | Change |
|------|--------|
| `src/systems/AbilityManager.js` | **New** — ability data + all 6 effect methods |
| `src/entities/Player.js` | **Edit** — add stamina check + AbilityManager call in `_handleInput` |
| `src/scenes/UIScene.js` | **Edit** — show ability name toast on `ability_used` event |
