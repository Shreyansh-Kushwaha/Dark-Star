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

// Plays a one-shot VFX sprite animation at (x, y) in scene.
function _vfxPlay(scene, animKey, x, y, scale = 1, depth = 10, timeScale = 1) {
  if (!scene?.anims?.exists(animKey)) return;
  const framePrefix = _animToPrefix(animKey);
  if (!framePrefix) return;
  const s = scene.add.sprite(x, y, `${framePrefix}1`).setScale(scale).setDepth(depth).setAlpha(0.92);
  s.play(animKey);
  if (timeScale !== 1) s.anims.timeScale = timeScale;
  s.once('animationcomplete', () => {
    scene.tweens.add({ targets: s, alpha: 0, duration: 120, onComplete: () => s.destroy() });
  });
  return s;
}

function _animToPrefix(key) {
  const map = {
    vfx_smoke1: 'vfx_s1_', vfx_smoke2: 'vfx_s2_', vfx_smoke3: 'vfx_s3_', vfx_smoke4: 'vfx_s4_',
    vfx_yellow1: 'vfx_y1_', vfx_yellow2: 'vfx_y2_', vfx_yellow3: 'vfx_y3_',
    vfx_green1: 'vfx_g1_', vfx_green2: 'vfx_g2_', vfx_green3: 'vfx_g3_',
    vfx_green4: 'vfx_g4_', vfx_green5: 'vfx_g5_',
    vfx_lightning1: 'vfx_l1_', vfx_lightning2: 'vfx_l2_', vfx_lightning3: 'vfx_l3_',
    vfx_lightning4: 'vfx_l4_', vfx_lightning5: 'vfx_l5_', vfx_lightning6: 'vfx_l6_',
    vfx_frost1: 'vfx_fr1_', vfx_frost2: 'vfx_fr2_', vfx_frost3: 'vfx_fr3_',
    vfx_fire1s: 'vfx_fb1s_', vfx_fire1l: 'vfx_fb1l_', vfx_fire1e: 'vfx_fb1e_',
    vfx_fire2: 'vfx_fb2_', vfx_fire3: 'vfx_fb3_',
  };
  return map[key] || null;
}

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
        // Small yellow burst on each hit enemy
        _vfxPlay(scene, 'vfx_yellow1', e.x, e.y - 20, 0.7, e.depth + 2);
      }
    }
    // Large golden shockwave (yellow power VFX2 = rising light column, scaled up)
    _vfxPlay(scene, 'vfx_yellow2', player.x, player.y - 30, 1.4, player.depth + 1);
    // Expanding ring fallback still keeps it readable at large radius
    const gfx = scene.add.graphics();
    scene.tweens.addCounter({
      from: 0, to: r, duration: 380,
      onUpdate: tw => {
        gfx.clear();
        gfx.lineStyle(3, 0xffdd44, 0.6 * (1 - tw.progress));
        gfx.strokeCircle(player.x, player.y, tw.getValue());
      },
      onComplete: () => gfx.destroy(),
    });
    scene.audio.ability();
  }

  static _agniShield(player, scene) {
    player._agniShieldTimer = 3000;
    // Clean up any prior instance
    if (player._agniShieldFx) { player.remove(player._agniShieldFx, true); player._agniShieldFx = null; }

    // Attach looping VFX as a child of the player container so it follows movement
    if (scene.anims.exists('vfx_lightning5')) {
      const fx = scene.add.sprite(0, -20, 'vfx_l5_1').setScale(0.85).setAlpha(0.9);
      fx.play({ key: 'vfx_lightning5', repeat: -1 });
      // Insert at index 1 — between shadow (0) and player sprite (2), so it renders under the player
      player.addAt(fx, 1);
      player._agniShieldFx = fx;

      scene.time.delayedCall(3000, () => {
        if (player._agniShieldFx === fx) {
          player.remove(fx, true);
          player._agniShieldFx = null;
        }
      });
    }

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
        // Small fireball on each hit enemy
        _vfxPlay(scene, 'vfx_fire3', e.x, e.y - 15, 0.8, e.depth + 2);
      }
    }
    // Central fireball explosion (VFX2 = large 12-frame burst)
    _vfxPlay(scene, 'vfx_fire2', player.x, player.y - 20, 3.0, player.depth - 1);
    scene._cameraPunch?.(0.012, 300);
    scene.audio.ability();
  }

  // ── Tara ────────────────────────────────────────────────────────────────────

  static _vayuDash(player, scene) {
    const dist = 300;
    const rawDx = player.facingX, rawDy = player.facingY || 0;
    const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1;
    const dx = rawDx / len, dy = rawDy / len;
    const tx = player.x + dx * dist;
    const ty = player.y + dy * dist;
    const dmg = 50 * player.abilityPow;
    const halfW = 30;

    for (const e of scene.enemies) {
      if (!e?.active || !e.alive) continue;
      const ex = e.x - player.x, ey = e.y - player.y;
      const proj = ex * dx + ey * dy;
      if (proj < 0 || proj > dist) continue;
      const perpDist = Math.abs(ex * dy - ey * dx);
      if (perpDist <= halfW) {
        e.takeDamage(dmg, player, scene);
        _vfxPlay(scene, 'vfx_green2', e.x, e.y - 15, 0.7, e.depth + 2);
      }
    }

    // Green dash trail — 4 VFX sprites spaced along the path
    for (let i = 0; i < 4; i++) {
      const gx = player.x + dx * dist * (i / 4);
      const gy = player.y + dy * dist * (i / 4);
      scene.time.delayedCall(i * 35, () => {
        _vfxPlay(scene, 'vfx_green1', gx, gy - 10, 0.85, player.depth + 1);
      });
    }

    scene.tweens.add({ targets: player, x: tx, y: ty, duration: 180 });
    scene.audio.ability();
  }

  static _jalMend(player, scene) {
    const healAmt = 60;
    for (const p of scene.players) {
      if (!p?.alive || p.downed) continue;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      p._updateHpBar();
      // Golden heal glow on each healed player
      _vfxPlay(scene, 'vfx_yellow1', p.x, p.y - 30, 1.2, p.depth + 2);
    }
    // Large radiant circle for the overall aura
    _vfxPlay(scene, 'vfx_yellow3', player.x, player.y - 30, 1.6, player.depth + 2);
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

    // Chain lightning: VFX sprites at each target + thin line between
    let prev = { x: player.x, y: player.y };
    chain.forEach((target, idx) => {
      target.takeDamage(dmg, player, scene);

      // Lightning bolt VFX at target (alternate VFX1/VFX2 for variety)
      const lKey = idx % 2 === 0 ? 'vfx_lightning1' : 'vfx_lightning2';
      _vfxPlay(scene, lKey, target.x, target.y - 20, 1.1, target.depth + 2);

      // Keep a thin arc line for spatial readability
      const line = scene.add.graphics();
      line.lineStyle(2, 0x55ddff, 0.75);
      line.strokeLineShape(new Phaser.Geom.Line(prev.x, prev.y, target.x, target.y));
      scene.tweens.add({ targets: line, alpha: 0, duration: 400, onComplete: () => line.destroy() });
      prev = { x: target.x, y: target.y };
    });

    // Origin burst at player
    _vfxPlay(scene, 'vfx_lightning3', player.x, player.y - 25, 1.0, player.depth + 2);
    scene.audio.ability();
    return true;
  }
}
