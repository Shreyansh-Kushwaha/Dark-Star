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
    const char = player.charKey || (player.isP1 ? 'dhruva' : 'tara');
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
