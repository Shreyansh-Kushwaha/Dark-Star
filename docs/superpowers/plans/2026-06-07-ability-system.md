# Ability System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 character abilities (Q/E/R for Dhruva and Tara) via a new AbilityManager system, with stamina gating and a name-toast UI.

**Architecture:** A new static class `AbilityManager` holds all ability data and effect logic. `Player._handleInput` checks stamina/cooldown then calls `AbilityManager.use()`. `UIScene._onAbilityUsed` shows a 1.5s name toast and drives the cooldown countdown display.

**Tech Stack:** Phaser 3, vanilla ES modules (no build step)

---

## File Map

| File | Change |
|------|--------|
| `src/systems/AbilityManager.js` | **Create** — ability data + 6 effect methods |
| `src/entities/Player.js` | **Edit** — replace Q/E/R stubs; add stamina check; add `_agniShieldTimer` state |
| `src/scenes/UIScene.js` | **Edit** — name toast in `_onAbilityUsed`; cooldown countdown in `update` |

---

## Task 1 — Create `src/systems/AbilityManager.js`

**Files:**
- Create: `src/systems/AbilityManager.js`

This task introduces the AbilityManager class with all 6 ability definitions and their effect implementations. No other files change in this task.

- [ ] **Step 1: Create the file**

Write `src/systems/AbilityManager.js` with this exact content:

```js
const ABILITIES = {
  dhruva: {
    Q: { name: 'Prithvi Slam', stamina: 20, cooldown: 8000 },
    E: { name: 'Agni Shield',  stamina: 25, cooldown: 10000 },
    R: { name: 'Agni Burst',   stamina: 40, cooldown: 12000 },
  },
  tara: {
    Q: { name: 'Vayu Dash',  stamina: 15, cooldown: 8000 },
    E: { name: 'Jal Mend',   stamina: 30, cooldown: 10000 },
    R: { name: 'Vayu Storm', stamina: 35, cooldown: 12000 },
  },
};

export class AbilityManager {
  static getAbility(char, key) {
    return ABILITIES[char]?.[key] ?? null;
  }

  // Returns true if the ability fired, false if it silently refused (e.g. no targets).
  static use(key, player, scene) {
    const char = player.isP1 ? 'dhruva' : 'tara';
    if (char === 'dhruva') {
      if (key === 'Q') { AbilityManager._prithviSlam(player, scene); return true; }
      if (key === 'E') { AbilityManager._agniShield(player, scene);  return true; }
      if (key === 'R') { AbilityManager._agniBurst(player, scene);   return true; }
    } else {
      if (key === 'Q') { AbilityManager._vayuDash(player, scene);  return true; }
      if (key === 'E') { AbilityManager._jalMend(player, scene);   return true; }
      if (key === 'R') { return AbilityManager._vayuStorm(player, scene); }
    }
    return false;
  }

  // ── Dhruva ──────────────────────────────────────────────────────────────────

  static _prithviSlam(player, scene) {
    const r = 150;
    const dmg = 80 * player.abilityPow;
    for (const e of scene.enemies) {
      if (!e?.active || !e.alive) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d <= r) {
        e.takeDamage(dmg, player, scene);
        e._hitstopTimer = 300;
      }
    }
    // Yellow expanding ring
    const gfx = scene.add.graphics();
    scene.tweens.addCounter({
      from: 0, to: r, duration: 400,
      onUpdate: tw => {
        gfx.clear();
        gfx.lineStyle(3, 0xffdd44, 0.85 * (1 - tw.progress));
        gfx.strokeCircle(player.x, player.y, tw.getValue());
      },
      onComplete: () => gfx.destroy(),
    });
    scene.audio.ability();
  }

  static _agniShield(player, scene) {
    player._agniShieldTimer = 3000;
    // Replace any existing shield FX
    if (player._agniShieldFx) { player._agniShieldFx.destroy(); player._agniShieldFx = null; }
    const fx = scene.add.ellipse(player.x, player.y, 64, 64, 0xff6600, 0.28);
    player._agniShieldFx = fx;
    scene.tweens.add({
      targets: fx, scaleX: 1.18, scaleY: 1.18, alpha: 0.45,
      duration: 450, yoyo: true, repeat: -1,
    });
    scene.audio.ability();
  }

  static _agniBurst(player, scene) {
    const r = 250;
    const dmg = 120 * player.abilityPow;
    for (const e of scene.enemies) {
      if (!e?.active || !e.alive) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d <= r) {
        e.takeDamage(dmg, player, scene);
        const angle = Math.atan2(e.y - player.y, e.x - player.x);
        if (e.knockback) e.knockback(angle, 300);
      }
    }
    // Red-orange expanding ring
    const gfx = scene.add.graphics();
    scene.tweens.addCounter({
      from: 0, to: r, duration: 600,
      onUpdate: tw => {
        gfx.clear();
        gfx.lineStyle(5, 0xff5500, 0.9 * (1 - tw.progress));
        gfx.strokeCircle(player.x, player.y, tw.getValue());
      },
      onComplete: () => gfx.destroy(),
    });
    scene.cameras.main.shake(300, 0.012);
    scene.audio.ability();
  }

  // ── Tara ────────────────────────────────────────────────────────────────────

  static _vayuDash(player, scene) {
    const dist = 300;
    // facingX/Y are not guaranteed to be a unit vector (facingX persists across vertical moves),
    // so normalize before computing the dash target and path rectangle.
    const rawDx = player.facingX, rawDy = player.facingY || 0;
    const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1;
    const dx = rawDx / len, dy = rawDy / len;
    const tx = player.x + dx * dist;
    const ty = player.y + dy * dist;
    const dmg = 50 * player.abilityPow;
    const halfW = 30;

    // Hit enemies in a 60px-wide rectangle along the dash path
    for (const e of scene.enemies) {
      if (!e?.active || !e.alive) continue;
      const ex = e.x - player.x, ey = e.y - player.y;
      const proj = ex * dx + ey * dy;
      if (proj < 0 || proj > dist) continue;
      const perpDist = Math.abs(ex * dy - ey * dx);
      if (perpDist <= halfW) e.takeDamage(dmg, player, scene);
    }

    // 3 cyan ghost ellipses trailing behind
    for (let i = 0; i < 3; i++) {
      const gx = player.x + dx * dist * (i / 3);
      const gy = player.y + dy * dist * (i / 3);
      const ghost = scene.add.ellipse(gx, gy, 34, 34, 0x44ccff, 0.4 - i * 0.1);
      scene.tweens.add({
        targets: ghost, alpha: 0, scaleX: 0.4, scaleY: 0.4,
        duration: 300, delay: i * 60, onComplete: () => ghost.destroy(),
      });
    }

    // Move player to destination
    scene.tweens.add({ targets: player, x: tx, y: ty, duration: 180 });
    scene.audio.ability();
  }

  static _jalMend(player, scene) {
    const healAmt = 60;
    for (const p of scene.players) {
      if (!p?.alive || p.downed) continue;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      p._updateHpBar();
    }
    scene.events.emit('healing_aura', { players: scene.players });
    scene.audio.ability();
  }

  // Returns true if fired, false if no target in range (caller refunds stamina/cd).
  static _vayuStorm(player, scene) {
    let nearest = null, nearestDist = 600;
    for (const e of scene.enemies) {
      if (!e?.active || !e.alive) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }
    if (!nearest) return false;

    const dmg = 70 * player.abilityPow;
    const chain = [nearest];
    for (let i = 0; i < 2; i++) {
      const last = chain[chain.length - 1];
      let next = null, nextDist = 200;
      for (const e of scene.enemies) {
        if (!e?.active || !e.alive || chain.includes(e)) continue;
        const d = Phaser.Math.Distance.Between(last.x, last.y, e.x, e.y);
        if (d < nextDist) { next = e; nextDist = d; }
      }
      if (next) chain.push(next);
    }

    // Damage and draw chain lightning lines
    let prev = { x: player.x, y: player.y };
    for (const target of chain) {
      target.takeDamage(dmg, player, scene);
      const line = scene.add.graphics();
      line.lineStyle(2, 0x88eeff, 0.9);
      line.strokeLineShape(new Phaser.Geom.Line(prev.x, prev.y, target.x, target.y));
      scene.tweens.add({ targets: line, alpha: 0, duration: 500, onComplete: () => line.destroy() });
      prev = { x: target.x, y: target.y };
    }
    scene.audio.ability();
    return true;
  }
}
```

- [ ] **Step 2: Verify the file parses correctly**

Open `http://localhost:PORT` in the browser and check the browser console (F12) for import errors. No errors = pass.

- [ ] **Step 3: Commit**

```bash
git add src/systems/AbilityManager.js
git commit -m "feat: add AbilityManager with 6 ability definitions and effects"
git push
```

---

## Task 2 — Wire AbilityManager into `Player.js`

**Files:**
- Modify: `src/entities/Player.js`

This task:
1. Imports AbilityManager
2. Adds `_agniShieldTimer` / `_agniShieldFx` state to the constructor
3. Ticks and cleans up shield state in `_tick`
4. Tracks shield FX position in `update`
5. Handles Agni Shield in `takeDamage`
6. Replaces the Q/E/R dispatch in `_handleInput` with stamina check + AbilityManager.use
7. Removes the now-unused stub methods (`_useAbilityQ/E/R`, `_vajraSlam`, `_akshaLunge`, `_guardianStance`, `_mantraBolt`, `_divyaDrishti`, `_healingAura`)

- [ ] **Step 1: Add AbilityManager import at the top of Player.js**

At the top of `src/entities/Player.js`, after the existing imports, add:

```js
import { AbilityManager } from '../systems/AbilityManager.js';
```

- [ ] **Step 2: Add shield state to the constructor**

In the `constructor`, find the block that initialises state flags (the lines with `this.alive`, `this.downed`, etc.). Add these two lines directly after `this._questKillCount = 0;`:

```js
    this._agniShieldTimer = 0;
    this._agniShieldFx    = null;
```

- [ ] **Step 3: Tick the shield timer in `_tick`**

In `_tick`, after the existing cooldown decrements (`if (this._lightCd > 0)...`), add:

```js
    if (this._agniShieldTimer > 0) {
      this._agniShieldTimer -= delta;
      if (this._agniShieldTimer <= 0) {
        this._agniShieldTimer = 0;
        if (this._agniShieldFx) { this._agniShieldFx.destroy(); this._agniShieldFx = null; }
      }
    }
```

- [ ] **Step 4: Track shield FX position in `update`**

In `update`, after `this.setDepth(this.y);`, add:

```js
    if (this._agniShieldFx) this._agniShieldFx.setPosition(this.x, this.y);
```

- [ ] **Step 5: Apply Agni Shield in `takeDamage`**

In `takeDamage`, find the line `if (this._guardStance) amount *= 0.5;`. Directly after it add:

```js
    if (this._agniShieldTimer > 0) {
      amount *= 0.5;
      if (source?.takeDamage) source.takeDamage(10, this, scene);
    }
```

- [ ] **Step 6: Replace the Q/E/R block in `_handleInput`**

Find and replace these lines in `_handleInput` (lines 189–200 currently):

```js
    if (keys.Q && Phaser.Input.Keyboard.JustDown(keys.Q) && this._abilityCds.Q <= 0) {
      this._abilityCds.Q = ABILITY_CDS.Q;
      this._useAbilityQ(enemies, scene);
    }
    if (keys.E && Phaser.Input.Keyboard.JustDown(keys.E) && this._abilityCds.E <= 0) {
      this._abilityCds.E = ABILITY_CDS.E;
      this._useAbilityE(enemies, scene);
    }
    if (keys.R && Phaser.Input.Keyboard.JustDown(keys.R) && this._abilityCds.R <= 0) {
      this._abilityCds.R = ABILITY_CDS.R;
      this._useAbilityR(enemies, scene);
    }
```

Replace with:

```js
    const char = this.isP1 ? 'dhruva' : 'tara';
    for (const k of ['Q', 'E', 'R']) {
      if (!keys[k] || !Phaser.Input.Keyboard.JustDown(keys[k])) continue;
      if (this._abilityCds[k] > 0) continue;
      const ability = AbilityManager.getAbility(char, k);
      if (!ability || this.stamina < ability.stamina) continue;
      this.stamina -= ability.stamina;
      const fired = AbilityManager.use(k, this, scene);
      if (fired) {
        this._abilityCds[k] = ability.cooldown;
        scene.events.emit('ability_used', { key: k, cd: ability.cooldown, name: ability.name });
      } else {
        this.stamina += ability.stamina; // refund if ability didn't fire (e.g. no targets)
      }
    }
```

- [ ] **Step 7: Remove obsolete ability stub methods**

Delete the following methods entirely from Player.js (they are fully replaced by AbilityManager):

- `_useAbilityQ(enemies, scene)` (the dispatcher at line ~336)
- `_useAbilityE(enemies, scene)`
- `_useAbilityR(enemies, scene)`
- `_vajraSlam(enemies, scene)`
- `_akshaLunge(enemies, scene)`
- `_guardianStance(scene)`
- `_mantraBolt(scene)`
- `_divyaDrishti(enemies, scene)`
- `_healingAura(scene)`

Keep `_spawnAbilityCircle`, `_spawnHitFX`, and `_spawnDustFX` — they are still used.

- [ ] **Step 8: Verify in browser**

Load the game. Press Q as Dhruva — a yellow ring should expand from the player and nearby enemies should take damage. Check the console for errors.

- [ ] **Step 9: Commit**

```bash
git add src/entities/Player.js
git commit -m "feat: wire AbilityManager into Player — stamina gating, shield state, remove stubs"
git push
```

---

## Task 3 — Update `UIScene.js` — name toast + cooldown countdown

**Files:**
- Modify: `src/scenes/UIScene.js`

This task adds: (a) a 1.5s fading ability name that floats up above the Q/E/R icon when an ability fires, and (b) a live cooldown countdown display in the `update` loop.

- [ ] **Step 1: Update `_onAbilityUsed` to show a name toast**

Find `_onAbilityUsed(data)` in UIScene.js (currently around line 362). Replace the entire method with:

```js
  _onAbilityUsed(data) {
    const idx = ['Q', 'E', 'R'].indexOf(data.key);
    if (idx < 0 || !this._abilityIcons[idx]) return;
    const icon = this._abilityIcons[idx];
    icon.cdLeft = data.cd;
    icon.cdMax  = data.cd;

    if (!data.name) return;
    if (icon._nameText) { icon._nameText.destroy(); icon._nameText = null; }
    const nameText = this.add.text(icon.x, icon.y - 36, data.name, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(200);
    icon._nameText = nameText;
    this.tweens.add({
      targets: nameText, alpha: 0, y: icon.y - 54,
      duration: 1500, ease: 'Power2',
      onComplete: () => { nameText.destroy(); icon._nameText = null; },
    });
  }
```

- [ ] **Step 2: Add cooldown countdown to the `update` loop**

In `UIScene.update(time, delta)`, replace the comment block:

```js
    // Update ability cooldowns display
    // (GameScene will emit ability_used events with remaining CD)
```

With:

```js
    // Drive ability cooldown countdown display
    for (const icon of this._abilityIcons) {
      if (icon.cdLeft > 0) {
        icon.cdLeft = Math.max(0, icon.cdLeft - delta);
        const pct = icon.cdLeft / icon.cdMax;
        icon.border.setAlpha(0.25 + 0.75 * (1 - pct));
        icon.cd.setText(icon.cdLeft > 0 ? (icon.cdLeft / 1000).toFixed(1) : '–');
      } else {
        icon.cd.setText('–');
        icon.border.setAlpha(0.5);
      }
    }
```

- [ ] **Step 3: Verify in browser**

Fire an ability (Q, E, or R). The ability name should float up and fade over 1.5 seconds above the icon. The cooldown countdown should count down numerically in the Q/E/R icon. Check the console for errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/UIScene.js
git commit -m "feat: ability name toast and cooldown countdown in UIScene"
git push
```

---

## Task 4 — End-to-end verification

**Files:** None (manual test only)

- [ ] **Step 1: Test all 6 abilities**

Load the game. Test each ability in sequence:

| Character | Key | Expected result |
|-----------|-----|-----------------|
| Dhruva (P1) | Q | Yellow ring expands; nearby enemies stagger |
| Dhruva (P1) | E | Orange pulsing aura appears around Dhruva for 3s; take a hit during it and verify reduced damage |
| Dhruva (P1) | R | Large red-orange ring; enemies knocked back; camera shakes |
| Tara (P2) | Q | Tara slides 300px forward; enemy in path takes damage; cyan ghosts trail |
| Tara (P2) | E | Blue healing pulse; both players gain 60 HP |
| Tara (P2) | R | Blue-white line chains between up to 3 enemies; each takes damage |

- [ ] **Step 2: Test stamina gating**

Drain Dhruva's stamina by dodging repeatedly. With < 20 stamina remaining, press Q — it should NOT fire. Stamina bar confirms rejection.

- [ ] **Step 3: Test Vayu Storm no-target case**

Move Tara far from all enemies. Press R. Ability should NOT fire and stamina should NOT be deducted.

- [ ] **Step 4: Test cooldown countdown**

Fire any ability. The Q/E/R icon should show a numeric countdown (e.g. "8.0", "7.9" …) until it resets to "–".

- [ ] **Step 5: Commit if any final fixes were needed**

```bash
git add -p
git commit -m "fix: ability system polish from e2e verification"
git push
```
