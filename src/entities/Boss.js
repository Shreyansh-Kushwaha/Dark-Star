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
    this._decoys       = null;

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

  enter(scene) {
    this.state   = STATE.ENTER;
    this._active = false;

    const cam = scene.cameras.main;
    cam.pan(this.x, this.y, 1200, 'Power2');

    scene.tweens.add({
      targets: this, alpha: 1, duration: 600,
      onComplete: () => {
        this._playAnim('idle');

        if (this.cfg.introLine) {
          this._introActive = true;
          scene.events.emit('boss_intro', { lines: [this.cfg.introLine], boss: this });
          scene.time.delayedCall(3200, () => { this._introActive = false; });
        }

        scene.time.delayedCall(1200, () => {
          cam.startFollow(scene.players[0], true, 0.1, 0.1);
          this.state       = STATE.FIGHT;
          this._active     = true;
          this._graceTimer = 2500;
          scene.events.emit('boss_entered', { boss: this });
        });
      },
    });
  }

  _playAnim(state) {
    const key = `${this.cfg.textureBase}_${state}`;
    if (this.scene?.anims?.exists(key)) this.sprite.play(key, true);
  }

  update(time, delta, players, scene) {
    if (!this.alive || !this._active) return;
    if (this._introActive) return;
    this.setDepth(this.y);

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
          this._decoys.forEach(d => {
            if (d?.active) scene.tweens.add({ targets: d, alpha: 0.8, duration: 300 });
          });
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
    // If a moving player runs too close, immediately hit them without stopping movement tracks
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

      // Keep running animation rolling unless interrupted by a running attack clip
      if (this.sprite.anims.currentAnim?.key !== `${this.cfg.textureBase}_attack`) {
        this._playAnim('run');
      }
    } else {
      if (this.body) this.body.setVelocity(0, 0);
      this._doAttack(phaseCfg, target, scene);
    }

    // Decoy tracking loops
    if (this._decoys?.length) {
      this._decoys.forEach((d, i) => {
        if (!d?.active) return;
        const offset  = (i === 0 ? -1 : 1) * 165;
        const targetX = this.x + offset;
        const targetY = this.y + 22 * Math.sin(this._sinWave * 0.65 + i * Math.PI);
        d.x += (targetX - d.x) * 0.04;
        d.y += (targetY - d.y) * 0.04;
        d.setDepth(d.y);
      });
    }
  }

  _nearestPlayer(players) {
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (!p?.alive || p.downed) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d < bestD) { best = p; bestD = d; }
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

    // Trigger explicit animation context states unless handled internally by sub-actions
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

          // 1. Shrink down (burrow underground)
          scene.tweens.add({
            targets: this.sprite,
            scaleX: 0,
            scaleY: 0,
            duration: 500,
            ease: 'Quad.In',
            onComplete: () => {
              // Hide shadow while underground
              this.alpha = 0; 

              // 2. Delay tracking time underground, then snap immediately to the player's current location
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

                // Spawn warning indicator asset under the player right before eruption
                scene.events.emit('ability_fx', { type: 'venom_pool', x: this.x, y: this.y });

                // 3. Scale burst back up violently (Pop-out attack)
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

                    // Camera punch impact shake
                    scene.cameras.main.shake(300, 0.015);

                    // Direct landing hit resolution box check
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
            scene.cameras.main.shake(210, 0.009);
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
          scene.cameras.main.shake(210, 0.008);
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
          scene.cameras.main.shake(260, 0.009);
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
          scene.cameras.main.shake(360, 0.014);
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

    // Generic fallback attack configs (Left untouched for other boss configurations)
    switch (pattern) {
      case 'slam': case 'smash': case 'bite': case 'void_slash': case 'wind_slash': {
        target.notifyIncomingAttack?.();
        scene.cameras.main.shake(180, 0.006);
        scene.time.delayedCall(400, () => {
          if (!this.alive || !target.alive) return;
          const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
          if (d <= 130) target.takeDamage(this.cfg.maxHp * 0.06, this, scene);
        });
        break;
      }
      case 'root': case 'vine_lash': case 'coil': case 'gust': {
        const r = 160;
        scene.cameras.main.shake(250, 0.008);
        scene.events.emit('ability_fx', { type: 'explosion', x: this.x, y: this.y, r });
        for (const p of scene.players) {
          if (!p?.alive || p.downed) continue;
          if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= r) {
            p.takeDamage(this.cfg.maxHp * 0.04, this, scene);
          }
        }
        break;
      }
      case 'spore_burst': case 'seed_bomb': case 'stone_throw':
      case 'venom_spit': case 'despair_wave': case 'shockwave': case 'cyclone': {
        const angle  = Math.atan2(target.y - this.y, target.x - this.x);
        const spread = pattern === 'despair_wave' ? 5 : 3;
        const step   = pattern === 'despair_wave' ? 0.25 : 0.32;
        for (let i = 0; i < spread; i++) {
          const off = (i - Math.floor(spread / 2)) * step;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: angle + off,
            damage: this.cfg.maxHp * 0.035, fromEnemy: true,
            key: 'fire_01', speed: 230, tint: this.cfg.tint || 0xff4444,
          });
        }
        break;
      }
      case 'rage_slam': case 'frenzy': case 'hydra_form':
      case 'rock_storm': case 'tornado': case 'annihilation': case 'severance': {
        scene.cameras.main.shake(350, 0.014);
        const count = pattern === 'annihilation' ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 / count) * i;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: a,
            damage: this.cfg.maxHp * 0.045, fromEnemy: true,
            key: 'fire_01', speed: 210, tint: this.cfg.tint || 0xff2200,
          });
        }
        break;
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
      decoy.setTint(this.cfg.tint || 0x1a6633);
      decoy.setAlpha(0);
      decoy.setDepth(this.y - 1);
      if (scene.anims.exists(this.cfg.textureBase + '_idle')) {
        decoy.play(this.cfg.textureBase + '_idle', true);
      }
      scene.tweens.add({ targets: decoy, alpha: 0.8, duration: 450 });
      this._decoys.push(decoy);
    }
  }

  _refreshDecoys(scene) {
    if (!this._decoys?.length) { this._spawnDecoys(scene); return; }
    this._decoys.forEach(d => {
      if (!d?.active) return;
      d.setScale(this.sprite.scaleX);
      scene.tweens.add({ targets: d, alpha: 0.8, duration: 300 });
    });
  }

  _dismissDecoys(scene) {
    if (!this._decoys?.length) return;
    this._decoys.forEach(d => {
      if (!d?.active) return;
      scene?.tweens?.add({
        targets: d, alpha: 0, duration: 400,
        onComplete: () => { try { d.destroy(); } catch {} },
      });
    });
    this._decoys = [];
  }

  takeDamage(amount, scene) {
    if (!this.alive || this._invincible || this.state === STATE.STAGGER || this.state === STATE.DEAD) return;
    this.hp = Math.max(0, this.hp - amount);

    this.posture = Math.min(this.maxPosture, this.posture + amount * 0.4);
    if (this.posture >= this.maxPosture) this._triggerStagger(scene);

    this.sprite.setTint(0xff8888);
    scene.time.delayedCall(120, () => {
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
      this.sprite.setTint(0xff2222);
      scene.time.delayedCall(400, () => {
        if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
      });
    }

    scene.cameras.main.shake(500, 0.018);
    scene.events.emit('boss_phase_changed', { phase: newPhase, label: labels[newPhase], boss: this, phaseIndex: newPhase });
    scene.audio?.bossPhase?.();
  }

  _triggerStagger(scene) {
    this.state         = STATE.STAGGER;
    this.posture       = 0;
    this._staggerTimer = 3000;
    this._playAnim('idle');
    this.sprite.setTint(0xffffff);
    scene.cameras.main.shake(300, 0.01);
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

    scene.cameras.main.shake(700, 0.025);
    scene.audio?.victory?.();
    scene.events.emit('boss_killed', { bossKey: this.bossKey, boss: this });

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
}