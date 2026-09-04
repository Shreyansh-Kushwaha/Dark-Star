import { BOSSES } from '../data/bosses.js';

const STATE = { IDLE: 'idle', ENTER: 'enter', FIGHT: 'fight', STAGGER: 'stagger', DEAD: 'dead', AMBUSH: 'ambush' };

export class Boss extends Phaser.GameObjects.Container {
  constructor(scene, x, y, bossKey) {
    super(scene, x, y);
    scene.add.existing(this);

    const cfg = BOSSES[bossKey];
    this.cfg        = cfg;
    this.bossKey    = bossKey;
    this.alive      = true;
    this.state      = STATE.IDLE;
    this.phase      = 0;
    this.maxHp      = cfg.maxHp;
    this.hp         = cfg.maxHp;
    this.posture    = 0;
    this.maxPosture = cfg.maxPosture;
    this._staggerTimer = 0;
    this._atkTimer     = 0;
    this._lastPattern  = null;
    this._invincible   = false;
    this._graceTimer   = 2500;
    this._active       = false;
    this._introActive  = false;
    this._sinWave      = 0;
    this._decoys        = null;
    this._windCorridors = [];
    this._splitShadows  = [];
    this._aura          = null;

    const texBase = cfg.textureBase;
    this.sprite = scene.add.sprite(0, cfg.visualOffsetY || 0, texBase + '_idle_01');
    this.sprite.setScale(cfg.scale);
    if (cfg.tint) this.sprite.setTint(cfg.tint);
    this.add(this.sprite);

    const shadow = scene.add.ellipse(0, 0, 60 * cfg.scale, 18, 0x000000, 0.3);
    this.addAt(shadow, 0);

    this.setAlpha(0);
    this.setDepth(y);
  }

  // Cinematic entrance primitive, driven by CutscenePlayer's `reveal` step:
  // pan to the boss, then a dramatic scale-up + camera shake. Resolves once the
  // entrance settles so the cutscene can move to its next beat. Does NOT start
  // the fight — that's beginFight(), called when the whole cutscene ends.
  reveal(scene) {
    this.state   = STATE.ENTER;
    this._active = false;
    this._introActive = true;
    this.setAlpha(0);
    this.sprite.setScale(0.05);

    const cam = scene.cameras.main;
    cam.pan(this.x, this.y, 900, 'Power2');

    return new Promise(resolve => {
      scene.time.delayedCall(360, () => {
        scene.tweens.add({ targets: this, alpha: 1, duration: 180 });
        scene.tweens.add({
          targets: this.sprite,
          scaleX: this.cfg.scale * 1.22, scaleY: this.cfg.scale * 1.22,
          duration: 560, ease: 'Back.Out',
          onComplete: () => {
            // Rebound to true size
            scene.tweens.add({
              targets: this.sprite,
              scaleX: this.cfg.scale, scaleY: this.cfg.scale,
              duration: 300, ease: 'Power2.Out',
            });
            scene._cameraPunch?.(0.016, 500);
            this._playAnim('idle');
            scene.time.delayedCall(320, resolve);
          },
        });
      });
    });
  }

  // Hands control from the intro cutscene back to gameplay: camera resumes
  // following the player, the HP bar slides up, and the AI goes live.
  beginFight(scene) {
    this._introActive = false;
    this.setAlpha(1);
    if (!this.cfg.phaseScales) this.sprite.setScale(this.cfg.scale);

    scene.cameras.main.startFollow(scene.players[0], true, 0.1, 0.1);
    this.state       = STATE.FIGHT;
    this._active     = true;
    this._graceTimer = 2500;
    scene.events.emit('boss_bar_show', { boss: this });
    scene.audio?.playMusic?.('boss');

    // Pulsing floor aura
    this._aura = scene.add.circle(this.x, this.y, 80 * this.cfg.scale, this.cfg.tint || 0xff4400, 0.13);
    this._aura.setDepth(this.y - 2);
    scene.tweens.add({
      targets: this._aura,
      alpha:  { from: 0.07, to: 0.22 },
      scaleX: { from: 0.82, to: 1.18 },
      scaleY: { from: 0.82, to: 1.18 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _playAnim(state) {
    const key = `${this.cfg.textureBase}_${state}`;
    if (this.scene?.anims?.exists(key)) this.sprite.play(key, true);
  }

  update(time, delta, players, scene) {
    if (!this.alive || !this._active) return;
    if (this._introActive) return;
    // Guard the depth writes — each unconditional setDepth forces a full
    // display-list sort at render time, twice per frame with the aura.
    if (Math.abs(this.y - (this._lastDepthY ?? -1)) > 1) {
      this.setDepth(this.y);
      this._aura?.setDepth(this.y - 2);
      this._lastDepthY = this.y;
    }
    if (this._aura) this._aura.setPosition(this.x, this.y);

    if (this._graceTimer > 0) { this._graceTimer -= delta; return; }

    if (this.state === STATE.FIGHT) {
      this.posture = Math.max(0, this.posture - this.cfg.postureRegen * delta / 1000);
    }

    if (this.state === STATE.STAGGER) {
      this._staggerTimer -= delta;
      if (this.body) this.body.setVelocity(0, 0);
      if (this._staggerTimer <= 0) {
        this.state = STATE.FIGHT;
        this._invincible = false;
        this._playAnim('idle');
        if (this._decoys?.length) {
          const live = this._decoys.filter(d => d?.active);
          if (live.length) scene.tweens.add({ targets: live, alpha: 1.0, duration: 300 });
        }
      }
      return;
    }

    // Skip tracking routines if currently executing a burrow setup
    if (this.state === STATE.AMBUSH) return;

    this._atkTimer = Math.max(0, this._atkTimer - delta);

    const phaseCfg = this.cfg.phases[this.phase];
    const target   = this._nearestPlayer(players);
    if (!target) return;

    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.bossKey === 'nagraj_kaliya') {
      this._sinWave += delta * 0.003;
    }

    const shouldFlip = this.cfg.mirrorSprite ? dx > 0 : dx < 0;
    this.sprite.setFlipX(shouldFlip);

    // --- PROXIMITY REACTION (RUNNING ATTACK) ---
    if (dist <= 110 && this._atkTimer <= 0) {
      const targetIsMoving = (target.body && (target.body.velocity.x !== 0 || target.body.velocity.y !== 0));
      if (targetIsMoving) {
        this._doAttack(phaseCfg, target, scene);
      }
    }

    // --- CHASE MOVEMENT ENGINE ---
    if (dist > 80) {
      let vx = dx / dist * phaseCfg.speed;
      let vy = dy / dist * phaseCfg.speed;

      if (this.bossKey === 'nagraj_kaliya') {
        const perpX = -dy / dist;
        const perpY =  dx / dist;
        const sway  = Math.sin(this._sinWave) * (phaseCfg.speed * 0.45);
        vx += perpX * sway;
        vy += perpY * sway;
      }

      if (this.body) {
        this.body.setVelocity(vx, vy);
      } else {
        this.x += vx * delta / 1000;
        this.y += vy * delta / 1000;
      }

      // Keep running animation rolling unless interrupted by an attack
      if (this.sprite.anims.currentAnim?.key !== `${this.cfg.textureBase}_attack`) {
        this._playAnim('run');
      }
    } else {
      if (this.body) this.body.setVelocity(0, 0);
      this._doAttack(phaseCfg, target, scene);
    }

    // Illusion AI: each decoy chases and attacks the player independently
    if (this._decoys?.length) {
      const pCfg = this.cfg.phases[this.phase];
      const illusionTarget = target; // same nearest player computed above
      this._decoys.forEach(d => {
        if (!d?.active) return;
        d._atkTimer = (d._atkTimer || 0) - delta;
        if (!illusionTarget) return;
        const ddx  = illusionTarget.x - d.x;
        const ddy  = illusionTarget.y - d.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        d.setFlipX(this.cfg.mirrorSprite ? ddx > 0 : ddx < 0);

        // Separation from boss — keep at least 150px away
        const bx = d.x - this.x, by = d.y - this.y;
        const bd = Math.sqrt(bx * bx + by * by);
        if (bd < 150 && bd > 0) {
          const push = (150 - bd) / 150;
          d.x += (bx / bd) * push * 90 * delta / 1000;
          d.y += (by / bd) * push * 90 * delta / 1000;
        }

        // Separation between decoys — keep at least 120px apart
        this._decoys.forEach(other => {
          if (other === d || !other?.active) return;
          const ox = d.x - other.x, oy = d.y - other.y;
          const od = Math.sqrt(ox * ox + oy * oy);
          if (od < 120 && od > 0) {
            const push = (120 - od) / 120;
            d.x += (ox / od) * push * 60 * delta / 1000;
            d.y += (oy / od) * push * 60 * delta / 1000;
          }
        });

        // Chase if not in stop range
        if (dist > 85) {
          const spd = pCfg.speed * 0.85;
          d.x += (ddx / dist) * spd * delta / 1000;
          d.y += (ddy / dist) * spd * delta / 1000;
          d.setDepth(d.y);
          const runKey = this.cfg.textureBase + '_run';
          if (scene.anims.exists(runKey) && d.anims.currentAnim?.key !== runKey) d.play(runKey, true);
        } else {
          const idleKey = this.cfg.textureBase + '_idle';
          if (scene.anims.exists(idleKey) && d.anims.currentAnim?.key !== idleKey) d.play(idleKey, true);
        }

        // Ranged attack — fire from up to 320px so player speed can't prevent it
        if (d._atkTimer <= 0 && dist <= 320) {
          d._atkTimer = pCfg.attackCd * 1.5;
          const angle = Math.atan2(illusionTarget.y - d.y, illusionTarget.x - d.x);
          scene.events.emit('spawn_projectile', {
            x: d.x, y: d.y, angle,
            damage: this.cfg.maxHp * 0.025, fromEnemy: true,
            key: 'fire_01', speed: 200, tint: 0x00ff88, poisonOnHit: true,
          });
        }
      });
    }

    if (this._windCorridors?.length) this._updateWindCorridors(delta, players, scene);
    if (this._splitShadows?.length)  this._updateSplitShadows(time, delta, players, scene);
  }

  _nearestPlayer(players) {
    let best = null, bestDSq = Infinity;
    for (const p of players) {
      if (!p?.alive || p.downed) continue;
      const dx = this.x - p.x, dy = this.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDSq) { best = p; bestDSq = dSq; }
    }
    return best;
  }

  _doAttack(phaseCfg, target, scene) {
    if (this._atkTimer > 0) return;
    this._atkTimer = phaseCfg.attackCd;

    const patterns = phaseCfg.patterns;
    let pattern;
    if (patterns.length === 1) {
      pattern = patterns[0];
    } else {
      const candidates = patterns.filter(p => p !== this._lastPattern);
      const pool = candidates.length ? candidates : patterns;
      pattern = pool[Math.floor(Math.random() * pool.length)];
    }
    this._lastPattern = pattern;

    if (pattern !== 'ambush_popout') {
      this._playAnim('attack');
    }

    this._executePattern(pattern, target, scene);
  }

  _executePattern(pattern, target, scene) {
    if (this.bossKey === 'nagraj_kaliya') {
      switch (pattern) {

        case 'ambush_popout': {
          this.state = STATE.AMBUSH;
          this._invincible = true;
          if (this.body) this.body.setVelocity(0, 0);

          scene.tweens.add({
            targets: this.sprite,
            scaleX: 0,
            scaleY: 0,
            duration: 500,
            ease: 'Quad.In',
            onComplete: () => {
              this.alpha = 0; 

              scene.time.delayedCall(1000, () => {
                if (!this.alive || !target.alive) {
                  this.state = STATE.FIGHT;
                  this.alpha = 1;
                  this.sprite.setScale(this.cfg.scale);
                  return;
                }

                this.x = target.x;
                this.y = target.y;
                this.setDepth(this.y);
                this.alpha = 1;

                scene.events.emit('ability_fx', { type: 'venom_pool', x: this.x, y: this.y });

                scene.tweens.add({
                  targets: this.sprite,
                  scaleX: this.cfg.scale,
                  scaleY: this.cfg.scale,
                  duration: 400,
                  ease: 'Back.Out',
                  onStart: () => {
                    this._playAnim('attack');
                  },
                  onComplete: () => {
                    this._invincible = false;
                    this.state = STATE.FIGHT;
                    scene._cameraPunch?.(0.015, 300);
                    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                    if (d <= 140) {
                      target.takeDamage(this.cfg.maxHp * 0.09, this, scene);
                    }
                  }
                });
              });
            }
          });
          return;
        }

        case 'bite': {
          target.notifyIncomingAttack?.();
          const ang = Math.atan2(target.y - this.y, target.x - this.x);
          this._invincible = true;
          this.body?.setVelocity(Math.cos(ang) * 960, Math.sin(ang) * 960);
          scene.time.delayedCall(165, () => {
            this.body?.setVelocity(0, 0);
            this._invincible = false;
            scene._cameraPunch?.(0.009, 210);
            if (!this.alive || !target.alive) return;
            const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
            if (d <= 165) target.takeDamage(this.cfg.maxHp * 0.07, this, scene);
          });
          return;
        }

        case 'venom_spit': {
          const ang = Math.atan2(target.y - this.y, target.x - this.x);
          const travelDist = 320;
          for (let i = 0; i < 3; i++) {
            const off   = (i - 1) * 0.32;
            const poolX = this.x + Math.cos(ang + off) * travelDist;
            const poolY = this.y + Math.sin(ang + off) * travelDist;
            scene.events.emit('spawn_projectile', {
              x: this.x, y: this.y, angle: ang + off,
              damage: this.cfg.maxHp * 0.035, fromEnemy: true,
              key: 'fire_01', speed: 230, tint: 0x00cc44, poisonOnHit: true,
            });
            const delay = (travelDist / 230) * 1000;
            scene.time.delayedCall(delay, () => {
              if (this.alive) scene.events.emit('ability_fx', { type: 'venom_pool', x: poolX, y: poolY });
            });
          }
          return;
        }

        case 'coil': {
          scene._cameraPunch?.(0.008, 210);
          const count  = 12;
          const radius = 235;
          for (let i = 0; i < count; i++) {
            const a      = (Math.PI * 2 / count) * i;
            const px     = target.x + Math.cos(a) * radius;
            const py     = target.y + Math.sin(a) * radius;
            const inward = Math.atan2(target.y - py, target.x - px);
            scene.events.emit('spawn_projectile', {
              x: px, y: py, angle: inward,
              damage: this.cfg.maxHp * 0.03, fromEnemy: true,
              key: 'fire_01', speed: 175, tint: 0x00cc44, poisonOnHit: true,
            });
          }
          return;
        }

        case 'tail_sweep': {
          const faceAng = Math.atan2(target.y - this.y, target.x - this.x);
          const rearAng = faceAng + Math.PI;
          const sweepR  = 190;
          scene._cameraPunch?.(0.009, 260);
          scene.events.emit('ability_fx', { type: 'tail_sweep', x: this.x, y: this.y, angle: rearAng, r: sweepR });
          scene.time.delayedCall(180, () => {
            for (const p of scene.players) {
              if (!p?.alive || p.downed) continue;
              const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
              if (d > sweepR) continue;
              const pAng = Math.atan2(p.y - this.y, p.x - this.x);
              let diff = pAng - rearAng;
              while (diff >  Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              if (Math.abs(diff) <= Math.PI * 0.6) p.takeDamage(this.cfg.maxHp * 0.055, this, scene);
            }
          });
          return;
        }

        case 'hydra_form': {
          scene._cameraPunch?.(0.014, 360);
          this._refreshDecoys(scene);
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            scene.events.emit('spawn_projectile', {
              x: this.x, y: this.y, angle: a,
              damage: this.cfg.maxHp * 0.045, fromEnemy: true,
              key: 'fire_01', speed: 210, tint: 0x00ff55, poisonOnHit: true,
            });
          }
          return;
        }
      }
    }

    if (this.bossKey === 'viyogasur') {
      switch (pattern) {

        case 'soul_split': {
          // Separates a void shadow from the player — it chases and attacks them
          scene._cameraPunch?.(0.008, 220);
          const tx = target.x, ty = target.y;
          const burst = scene.add.circle(tx, ty, 48, 0x9900ff, 0.55).setDepth(ty + 1);
          scene.tweens.add({ targets: burst, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 360, onComplete: () => burst.destroy() });
          scene.time.delayedCall(320, () => {
            if (!this.alive) return;
            const shadow = scene.add.sprite(tx, ty, this.cfg.textureBase + '_idle_01')
              .setScale(this.sprite.scaleX * 0.65)
              .setTint(0x1a0033)
              .setAlpha(0)
              .setDepth(ty);
            if (scene.anims.exists(this.cfg.textureBase + '_idle')) shadow.play(this.cfg.textureBase + '_idle', true);
            scene.tweens.add({ targets: shadow, alpha: 0.82, duration: 380 });
            this._splitShadows.push({ sprite: shadow, x: tx, y: ty, timer: 9000, atkTimer: 0 });
          });
          return;
        }

        case 'speed_burst': {
          // Boss dashes through the player at lethal speed, leaving void trails
          target.notifyIncomingAttack?.();
          const ang = Math.atan2(target.y - this.y, target.x - this.x);
          this._invincible = true;
          scene._cameraPunch?.(0.009, 180);
          scene.time.delayedCall(160, () => {
            if (!this.alive) return;
            this.body?.setVelocity(Math.cos(ang) * 1500, Math.sin(ang) * 1500);
            // Trail afterimages
            for (let t = 0; t < 5; t++) {
              scene.time.delayedCall(t * 35, () => {
                if (!this.alive) return;
                const trail = scene.add.sprite(this.x, this.y, this.cfg.textureBase + '_idle_01')
                  .setScale(this.sprite.scaleX).setTint(0x6600aa).setAlpha(0.45).setDepth(this.y - 1);
                scene.tweens.add({ targets: trail, alpha: 0, duration: 260, onComplete: () => trail.destroy() });
              });
            }
            scene.time.delayedCall(230, () => {
              if (!this.alive) return;
              this.body?.setVelocity(0, 0);
              this._invincible = false;
              scene._cameraPunch?.(0.012, 280);
              for (const p of scene.players) {
                if (!p?.alive || p.downed) continue;
                if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= 140) {
                  p.takeDamage(this.cfg.maxHp * 0.09, this, scene);
                  p.applySlow?.(scene, 900);
                }
              }
            });
          });
          return;
        }
      }
    }

    switch (pattern) {
      case 'slam': case 'smash': case 'bite': case 'void_slash': case 'wind_slash': {
        target.notifyIncomingAttack?.();
        scene._cameraPunch?.(0.006, 180);
        scene.time.delayedCall(400, () => {
          if (!this.alive || !target.alive) return;
          const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
          if (d <= 130) {
            target.takeDamage(this.cfg.maxHp * 0.06, this, scene);
            if (pattern === 'void_slash' || pattern === 'wind_slash') target.applySlow?.(scene, 2200);
          }
        });
        break;
      }
      case 'root': case 'vine_lash': case 'coil': case 'gust': {
        const r = 160;
        scene._cameraPunch?.(0.008, 250);
        scene.events.emit('ability_fx', { type: 'explosion', x: this.x, y: this.y, r });
        for (const p of scene.players) {
          if (!p?.alive || p.downed) continue;
          if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= r) {
            p.takeDamage(this.cfg.maxHp * 0.04, this, scene);
            if (pattern === 'root' || pattern === 'gust') p.applySlow?.(scene, 2500);
            if (pattern === 'vine_lash') p.applyPoison?.(scene, this.cfg.maxHp * 0.003, 3000);
          }
        }
        break;
      }
      case 'spore_burst': case 'seed_bomb': case 'stone_throw':
      case 'venom_spit': case 'despair_wave': case 'shockwave': case 'cyclone': {
        const angle  = Math.atan2(target.y - this.y, target.x - this.x);
        const spread = pattern === 'despair_wave' ? 5 : 3;
        const step   = pattern === 'despair_wave' ? 0.25 : 0.32;
        const slowProj = pattern === 'cyclone' || pattern === 'shockwave';
        for (let i = 0; i < spread; i++) {
          const off = (i - Math.floor(spread / 2)) * step;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: angle + off,
            damage: this.cfg.maxHp * 0.035, fromEnemy: true,
            key: 'fire_01', speed: 230, tint: this.cfg.tint || 0xff4444,
            slowOnHit: slowProj,
          });
        }
        break;
      }
      case 'rage_slam': case 'frenzy': case 'hydra_form':
      case 'rock_storm': case 'tornado': case 'annihilation': case 'severance': {
        scene._cameraPunch?.(0.014, 350);
        const count = pattern === 'annihilation' ? 12 : 8;
        const burnProj = pattern === 'rage_slam' || pattern === 'frenzy' || pattern === 'rock_storm';
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 / count) * i;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: a,
            damage: this.cfg.maxHp * 0.045, fromEnemy: true,
            key: 'fire_01', speed: 210, tint: this.cfg.tint || 0xff2200,
            burnOnHit: burnProj,
          });
        }
        break;
      }

      case 'wind_corridor': {
        // Glowing wind lane across the arena — slows players who stand in it
        const horiz = Math.random() < 0.5;
        const span  = 400;
        const thick = 88;
        const hw = horiz ? span : thick / 2;
        const hh = horiz ? thick / 2 : span;
        const cx = target.x + (horiz ? 0 : Phaser.Math.Between(-40, 40));
        const cy = target.y + (horiz ? Phaser.Math.Between(-40, 40) : 0);

        const gfx = scene.add.graphics().setDepth(cy + 3).setAlpha(0.5);
        gfx.fillStyle(0x88ccff, 0.22);
        gfx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
        gfx.lineStyle(2, 0xaaddff, 0.9);
        gfx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
        scene.tweens.add({ targets: gfx, alpha: { from: 0.3, to: 0.85 }, duration: 210, yoyo: true, repeat: 3 });

        const corridor = { gfx, cx, cy, hw, hh, active: false, timer: 3200 };
        scene.time.delayedCall(1000, () => {
          if (!gfx.active) return;
          gfx.clear();
          gfx.fillStyle(0xaaddff, 0.38);
          gfx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
          gfx.lineStyle(2, 0xffffff, 0.5);
          gfx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
          gfx.setAlpha(1);
          corridor.active = true;
          scene._cameraPunch?.(0.005, 150);
        });
        this._windCorridors.push(corridor);
        return;
      }

      case 'frost_breath': {
        // 5 slow frost projectiles in a spread + frost VFX at boss
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        for (let i = 0; i < 5; i++) {
          const off = (i - 2) * 0.28;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: angle + off,
            damage: this.cfg.maxHp * 0.03, fromEnemy: true,
            key: 'fire_01', speed: 155, tint: 0x88ddff,
            slowOnHit: true,
          });
        }
        if (scene.anims?.exists('vfx_frost2')) {
          const s = scene.add.sprite(this.x, this.y - 20, 'vfx_fr2_1')
            .setScale(1.3).setDepth(this.y + 5).setAlpha(0.9).setTint(0xaaddff);
          s.play('vfx_frost2');
          s.once('animationcomplete', () => s.destroy());
        }
        return;
      }

      case 'ice_storm': {
        // Phase 3 ultimate: 12 frost projectiles + frost burst at player's position = freeze
        scene._cameraPunch?.(0.015, 380);
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 / 12) * i;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: a,
            damage: this.cfg.maxHp * 0.038, fromEnemy: true,
            key: 'fire_01', speed: 135, tint: 0x88ddff,
            slowOnHit: true,
          });
        }
        // Frost burst erupts at target position after 0.55s
        const tx = target.x, ty = target.y;
        scene.time.delayedCall(550, () => {
          if (!this.alive) return;
          ['vfx_frost1', 'vfx_frost2', 'vfx_frost3'].forEach((key, idx) => {
            if (!scene.anims?.exists(key)) return;
            scene.time.delayedCall(idx * 90, () => {
              if (!scene.scene?.isActive?.()) return;
              const ox = Phaser.Math.Between(-40, 40), oy = Phaser.Math.Between(-30, 30);
              const s = scene.add.sprite(tx + ox, ty + oy, `vfx_fr${idx + 1}_1`)
                .setScale(1.4).setDepth(ty + 10).setAlpha(0.92);
              s.play(key);
              s.once('animationcomplete', () => scene.tweens.add({ targets: s, alpha: 0, duration: 200, onComplete: () => s.destroy() }));
            });
          });
          // Freeze (heavy slow) anyone near the burst point
          for (const p of scene.players) {
            if (!p?.alive || p.downed) continue;
            if (Phaser.Math.Distance.Between(tx, ty, p.x, p.y) < 75) {
              p.takeDamage(this.cfg.maxHp * 0.055, this, scene);
              p.applySlow?.(scene, 2800);
            }
          }
        });
        return;
      }

      case 'vine_trap': {
        // Plant warning markers at/near the player — they erupt after 1.3s
        const trapCount = this.phase === 2 ? 4 : 2;
        for (let i = 0; i < trapCount; i++) {
          const ox = Phaser.Math.Between(-75, 75);
          const oy = Phaser.Math.Between(-75, 75);
          const wx = target.x + ox;
          const wy = target.y + oy;
          const warn = scene.add.circle(wx, wy, 48, 0x33bb11, 0.2).setDepth(wy + 1);
          warn.setStrokeStyle(2, 0x88ff44);
          scene.tweens.add({ targets: warn, alpha: { from: 0.1, to: 0.55 }, duration: 190, yoyo: true, repeat: 3 });
          scene.time.delayedCall(1300, () => {
            if (!warn.active) return;
            warn.destroy();
            if (!this.alive) return;
            const burst = scene.add.circle(wx, wy, 55, 0x88ff44, 0.65).setDepth(wy + 2);
            scene.tweens.add({ targets: burst, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 320, onComplete: () => burst.destroy() });
            scene._cameraPunch?.(0.004, 110);
            for (const p of scene.players) {
              if (!p?.alive || p.downed) continue;
              if (Phaser.Math.Distance.Between(wx, wy, p.x, p.y) < 55) {
                p.takeDamage(this.cfg.maxHp * 0.05, this, scene);
                p.applyPoison?.(scene, this.cfg.maxHp * 0.002, 2500);
              }
            }
            // Phase 3: eruptions leave lingering poison pools
            if (this.phase === 2) scene.events.emit('ability_fx', { type: 'venom_pool', x: wx, y: wy });
          });
        }
        return;
      }

      case 'vine_berserk': {
        // Phase 3 berserk: 5 vine traps scattered around the arena + radial poison burst
        scene._cameraPunch?.(0.016, 400);
        for (let i = 0; i < 5; i++) {
          const ang = (Math.PI * 2 / 5) * i + Phaser.Math.FloatBetween(-0.4, 0.4);
          const rad = Phaser.Math.Between(90, 210);
          const wx  = this.x + Math.cos(ang) * rad;
          const wy  = this.y + Math.sin(ang) * rad;
          const warn = scene.add.circle(wx, wy, 52, 0x33bb11, 0.2).setDepth(wy + 1);
          warn.setStrokeStyle(2, 0x88ff44);
          scene.tweens.add({ targets: warn, alpha: { from: 0.1, to: 0.6 }, duration: 150, yoyo: true, repeat: 3 });
          scene.time.delayedCall(1200, () => {
            if (!warn.active) return;
            warn.destroy();
            if (!this.alive) return;
            const burst = scene.add.circle(wx, wy, 62, 0x88ff44, 0.7).setDepth(wy + 2);
            scene.tweens.add({ targets: burst, alpha: 0, scaleX: 1.7, scaleY: 1.7, duration: 340, onComplete: () => burst.destroy() });
            for (const p of scene.players) {
              if (!p?.alive || p.downed) continue;
              if (Phaser.Math.Distance.Between(wx, wy, p.x, p.y) < 62) {
                p.takeDamage(this.cfg.maxHp * 0.055, this, scene);
                p.applyPoison?.(scene, this.cfg.maxHp * 0.003, 3000);
              }
            }
            scene.events.emit('ability_fx', { type: 'venom_pool', x: wx, y: wy });
          });
        }
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 / 10) * i;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: a,
            damage: this.cfg.maxHp * 0.04, fromEnemy: true,
            key: 'fire_01', speed: 190, tint: 0x55ff22,
            poisonOnHit: true,
          });
        }
        return;
      }
    }
  }

  _spawnDecoys(scene) {
    this._dismissDecoys(scene);
    this._decoys = [];
    for (let i = 0; i < 2; i++) {
      const offset = (i === 0 ? -1 : 1) * 165;
      const decoy  = scene.add.sprite(this.x + offset, this.y, this.cfg.textureBase + '_idle_01');
      decoy.setScale(this.sprite.scaleX);
      if (this.cfg.tint) decoy.setTint(this.cfg.tint); else decoy.clearTint();
      decoy.setAlpha(0);
      decoy.setDepth(this.y - 1);
      decoy._atkTimer = 2000 + i * 600;
      if (scene.anims.exists(this.cfg.textureBase + '_idle')) {
        decoy.play(this.cfg.textureBase + '_idle', true);
      }
      scene.tweens.add({ targets: decoy, alpha: 1.0, duration: 450 });
      this._decoys.push(decoy);
    }
  }

  _refreshDecoys(scene) {
    if (!this._decoys?.length) { this._spawnDecoys(scene); return; }
    const live = [];
    this._decoys.forEach(d => {
      if (!d?.active) return;
      d.setScale(this.sprite.scaleX);
      if (this.cfg.tint) d.setTint(this.cfg.tint); else d.clearTint();
      live.push(d);
    });
    if (live.length) scene.tweens.add({ targets: live, alpha: 1.0, duration: 300 });
  }

  _dismissDecoys(scene) {
    if (!this._decoys?.length) return;
    const live = this._decoys.filter(d => d?.active);
    if (live.length) {
      scene?.tweens?.add({
        targets: live, alpha: 0, duration: 400,
        onComplete: () => { for (const d of live) { try { d.destroy(); } catch {} } },
      });
    }
    this._decoys = [];
  }

  _updateWindCorridors(delta, players, scene) {
    for (let i = this._windCorridors.length - 1; i >= 0; i--) {
      const c = this._windCorridors[i];
      if (!c.gfx?.active) { this._windCorridors.splice(i, 1); continue; }
      if (!c.active) continue;
      c.timer -= delta;
      if (c.timer <= 0) {
        scene.tweens.add({ targets: c.gfx, alpha: 0, duration: 380, onComplete: () => { try { c.gfx.destroy(); } catch {} } });
        this._windCorridors.splice(i, 1);
        continue;
      }
      for (const p of players) {
        if (!p?.alive || p.downed) continue;
        if (Math.abs(p.x - c.cx) <= c.hw && Math.abs(p.y - c.cy) <= c.hh) {
          p.applySlow?.(scene, 380);
        }
      }
    }
  }

  _updateSplitShadows(time, delta, players, scene) {
    const speed = this.cfg.phases[this.phase].speed * 0.72;
    for (let i = this._splitShadows.length - 1; i >= 0; i--) {
      const sh = this._splitShadows[i];
      if (!sh.sprite?.active) { this._splitShadows.splice(i, 1); continue; }
      sh.timer -= delta;
      sh.atkTimer = Math.max(0, sh.atkTimer - delta);

      if (sh.timer <= 0) {
        // Shadow expires: void burst at its position
        scene._cameraPunch?.(0.007, 180);
        for (let j = 0; j < 6; j++) {
          const a = (Math.PI * 2 / 6) * j;
          scene.events.emit('spawn_projectile', {
            x: sh.x, y: sh.y, angle: a,
            damage: this.cfg.maxHp * 0.04, fromEnemy: true,
            key: 'fire_01', speed: 175, tint: 0xaa00ff,
          });
        }
        scene.tweens.add({ targets: sh.sprite, alpha: 0, scaleX: 2, scaleY: 2, duration: 280, onComplete: () => { try { sh.sprite.destroy(); } catch {} } });
        this._splitShadows.splice(i, 1);
        continue;
      }

      // Chase nearest player
      const t = this._nearestPlayer(players);
      if (t) {
        const ddx = t.x - sh.x, ddy = t.y - sh.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > 30) {
          sh.x += (ddx / dist) * speed * delta / 1000;
          sh.y += (ddy / dist) * speed * delta / 1000;
          sh.sprite.setFlipX(ddx < 0);
        } else if (sh.atkTimer <= 0) {
          sh.atkTimer = 950;
          t.takeDamage(this.cfg.maxHp * 0.042, this, scene);
          scene._cameraPunch?.(0.005, 130);
        }
      }

      sh.sprite.setPosition(sh.x, sh.y);
      sh.sprite.setDepth(sh.y);
      // Eerie flicker
      sh.sprite.setAlpha(0.65 + Math.sin(time / 110) * 0.18);
    }
  }

  _spawnDamageNumber(scene, amount) {
    if (!scene) return;
    const heavy = amount >= 40;
    const txt = scene.add.text(
      this.x + Phaser.Math.Between(-15, 15), this.y - 55,
      Math.ceil(amount).toString(),
      { fontSize: heavy ? '22px' : '16px', color: heavy ? '#ff6666' : '#ffcc44',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5, 1).setDepth(this.depth + 100);
    scene.tweens.add({ targets: txt, y: txt.y - 45, alpha: 0, duration: 900, ease: 'Power1',
      onComplete: () => txt.destroy() });
  }

  takeDamage(amount, scene) {
    if (!this.alive || this._invincible || this.state === STATE.DEAD) return;
    this.hp = Math.max(0, this.hp - amount);
    this._spawnDamageNumber(scene, amount);

    this.posture = Math.min(this.maxPosture, this.posture + amount * 0.4);
    if (this.posture >= this.maxPosture) this._triggerStagger(scene);

    // hit juice: sharp white flash + impact dust (scale left alone — boss scale
    // is phase-driven, so popping it would fight the phase-transition tweens)
    scene._impactDust?.(this.x, this.y - 20, 0xffe6b0, amount >= 40 ? 7 : 4);
    this.sprite.setTint(0xffffff);
    scene.time.delayedCall(80, () => {
      if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
    });

    this._checkPhaseTransition(scene);
    if (this.hp <= 0) this._die(scene);

    scene.events.emit('boss_hp_changed', { boss: this });
  }

  _checkPhaseTransition(scene) {
    const hpPct  = this.hp / this.maxHp;
    let newPhase = 0;
    for (let i = this.cfg.phases.length - 1; i >= 0; i--) {
      if (hpPct <= this.cfg.phases[i].hpThreshold && i > 0) { newPhase = i; break; }
    }
    if (newPhase <= this.phase) return;

    this.phase = newPhase;
    const labels = ['', 'PHASE II', 'FINAL PHASE'];

    this._invincible   = true;
    this.state         = STATE.STAGGER;
    this._staggerTimer = 2200;

    scene.tweens.add({
      targets: this, scaleX: 1.18, scaleY: 1.18,
      duration: 280, yoyo: true, ease: 'Power2',
    });

    if (this.cfg.phaseScales) {
      const newSpriteScale = this.cfg.phaseScales[newPhase];
      scene.tweens.add({
        targets: this.sprite,
        scaleX: newSpriteScale, scaleY: newSpriteScale,
        duration: 700, ease: 'Back.Out', delay: 280,
      });
    }

    if (newPhase === 2) {
      if (this.bossKey === 'viyogasur') {
        // True form reveal: brief gold flash (Ekatmadeva), then void-purple final form
        this._staggerTimer = 4200;
        this.sprite.setTint(0xffd700);
        const goldAura = scene.add.circle(this.x, this.y, 140, 0xffdd44, 0.3).setDepth(this.y - 1);
        scene.tweens.add({ targets: goldAura, alpha: 0, scaleX: 3.2, scaleY: 3.2, duration: 2400, ease: 'Power2.Out', onComplete: () => goldAura.destroy() });
        scene.tweens.add({ targets: this.sprite, alpha: { from: 1, to: 0.5 }, duration: 220, yoyo: true, repeat: 3, delay: 400 });
        scene.events.emit('show_dialogue', { text: '⟨Ekatmadeva⟩ "...you see me.\nNot the demon.\nThe wound."' });
        scene.time.delayedCall(2600, () => {
          if (!this.alive) return;
          scene.events.emit('hide_dialogue');
          this.sprite.setTint(0x5500cc);
          scene._cameraPunch?.(0.024, 550);
        });
      } else {
        this.sprite.setTint(0xff2222);
        scene.time.delayedCall(400, () => {
          if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
        });
      }
    }

    scene._cameraPunch?.(0.018, 500);
    scene.events.emit('boss_phase_changed', { phase: newPhase, label: labels[newPhase] ?? `PHASE ${newPhase + 1}`, boss: this, phaseIndex: newPhase });
    scene.audio?.bossPhase?.();
    scene.haptics?.play('bossPhase');
  }

  _triggerStagger(scene) {
    this.state         = STATE.STAGGER;
    this.posture       = 0;
    this._staggerTimer = 3000;
    this._playAnim('idle');
    this.sprite.setTint(0xffffff);
    scene._cameraPunch?.(0.01, 300);
    scene.events.emit('boss_staggered');
    scene.audio?.bossStagger?.();
    if (this._decoys?.length) {
      this._decoys.forEach(d => { if (d?.active) scene.tweens.add({ targets: d, alpha: 0.15, duration: 300 }); });
    }
  }

  _die(scene) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.body?.setVelocity(0, 0);
    if (this.body) this.body.enable = false;
    this._playAnim('dead');
    this._dismissDecoys(scene);
    for (const c of this._windCorridors) { try { c.gfx?.destroy(); } catch {} }
    this._windCorridors = [];
    for (const sh of this._splitShadows) { try { sh.sprite?.destroy(); } catch {} }
    this._splitShadows = [];
    if (this._aura) { this._aura.destroy(); this._aura = null; }

    // Final-blow beat: long slow-mo, a zoom punch toward the arena, heavy
    // rumble — the camera settles back before the fade-out at ~3s.
    scene._hitStop?.(420, 0.18);
    scene.haptics?.play('bossDeath');
    const cam = scene.cameras.main;
    cam.zoomTo(1.12, 260, 'Sine.easeOut');
    scene.time.delayedCall(1100, () => cam.zoomTo(1, 800, 'Sine.easeInOut'));

    scene._cameraPunch?.(0.025, 700);
    scene.audio?.victory?.();
    scene.events.emit('boss_killed', { bossKey: this.bossKey, boss: this });

    const cx = this.x, cy = this.y;

    // Wave 1: lightning cross burst
    for (let i = 0; i < 4; i++) {
      const k = `vfx_lightning${(i % 6) + 1}`, fk = `vfx_l${(i % 6) + 1}_1`;
      if (!scene.anims?.exists(k)) continue;
      const ang = (Math.PI / 2) * i;
      const s = scene.add.sprite(cx + Math.cos(ang) * 50, cy + Math.sin(ang) * 50, fk)
        .setScale(1.6).setDepth(cy + 60).setAlpha(0.9);
      s.play(k).once('animationcomplete', () => s.destroy());
    }

    // Wave 2 (t=350ms): fireball ring + shake
    scene.time.delayedCall(350, () => {
      if (!scene.scene?.isActive?.()) return;
      const bossColor = this.cfg.tint || 0xff4400;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        scene.events.emit('spawn_projectile', {
          x: cx, y: cy, angle: a,
          damage: 0, fromEnemy: false,
          key: 'fire_01', speed: 190, tint: bossColor,
        });
      }
      scene._cameraPunch?.(0.016, 380);
    });

    // Wave 3 (t=700ms): smoke burst
    scene.time.delayedCall(700, () => {
      if (!scene.scene?.isActive?.()) return;
      for (let i = 0; i < 6; i++) {
        const ox = Phaser.Math.Between(-80, 80), oy = Phaser.Math.Between(-60, 28);
        const n  = (i % 4) + 1;
        const sk = `vfx_smoke${n}`, fk = `vfx_s${n}_1`;
        if (!scene.anims?.exists(sk)) continue;
        scene.time.delayedCall(i * 80, () => {
          if (!scene.scene?.isActive?.()) return;
          const s = scene.add.sprite(cx + ox, cy + oy, fk)
            .setScale(1.4).setDepth(cy + 80).setAlpha(0.75);
          s.play(sk).once('animationcomplete', () => s.destroy());
        });
      }
    });

    scene.time.delayedCall(1800, () => {
      scene.tweens.add({
        targets: this, alpha: 0, duration: 1200,
        onComplete: () => this.destroy(),
      });
    });
  }

  enablePhysics(scene) {
    scene.physics.add.existing(this);
    this.body.setSize(60, 60);
    this.body.setOffset(-30, -30);
  }

  getPosturePct() { return this.posture / this.maxPosture; }
  getHpPct()      { return this.hp / this.maxHp; }

  // --------------------------------------------------------
  // --- NETWORK SYNC METHODS ADDED BELOW ---
  // --------------------------------------------------------

  // Per-frame upkeep for a network-puppeted boss (co-op client). The full
  // update() runs AI/attack patterns — on the client the host owns those and
  // this just keeps depth-sort and the floor aura tracking the synced position.
  puppetUpdate() {
    if (Math.abs(this.y - (this._lastDepthY ?? -1)) > 1) {
      this.setDepth(this.y);
      this._aura?.setDepth(this.y - 2);
      this._lastDepthY = this.y;
    }
    if (this._aura) this._aura.setPosition(this.x, this.y);
  }

  getNetState() {
    return {
      bossKey: this.bossKey,
      x:       this.x,
      y:       this.y,
      hp:      this.hp,
      alive:   this.alive,
      posture: this.posture,
      phase:   this.phase,
      state:   this.state,
      flipX:   this.sprite?.flipX || false,
      anim:    this.sprite?.anims?.currentAnim?.key || '',
    };
  }

  applyNetState(state) {
    // Mirror the host's death so the client runs _die (death VFX + tears down the
    // aura tween, decoys, wind corridors, split shadows). Without this the client's
    // boss freezes on its last frame with all its effects still running.
    if (state.alive === false && this.alive) { this._die(this.scene); return; }
    if (!this.alive) return;

    this.hp      = state.hp;
    this.posture = state.posture;
    this.phase   = state.phase;
    this.state   = state.state;

    // Apply animation and direction
    if (this.sprite) {
      this.sprite.setFlipX(state.flipX);
      const k = state.anim;
      if (k && this.sprite.anims?.currentAnim?.key !== k && this.scene?.anims?.exists(k)) {
        this.sprite.play(k, true);
      }
    }

    this.setDepth(state.y);

    // --- SMOOTH NETWORK GLIDING (TWEEN FIX) ---
    const dx = state.x - this.x;
    const dy = state.y - this.y;

    if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
      // Snap instantly if distance is huge (e.g., spawn or ambush teleport)
      this.x = state.x;
      this.y = state.y;
      if (this.body) {
        this.body.setVelocity(0, 0);
        this.body.reset(this.x, this.y);
      }
    } else {
      // Stop the old tween if a new packet arrives early
      if (this._netTween) this._netTween.stop();

      // Smoothly slide the boss to the exact coordinates over 100 milliseconds
      this._netTween = this.scene.tweens.add({
        targets: this,
        x: state.x,
        y: state.y,
        duration: 100, // Matches standard network tick rates
        ease: 'Linear',
        onUpdate: () => {
          // Tell Phaser's physics engine NOT to fight the slide
          if (this.body) {
            this.body.setVelocity(0, 0);
            this.body.updateFromGameObject();
          }
        }
      });
    }
  }
}