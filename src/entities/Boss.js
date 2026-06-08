import { BOSSES } from '../data/bosses.js';

const STATE = { IDLE: 'idle', ENTER: 'enter', FIGHT: 'fight', STAGGER: 'stagger', DEAD: 'dead' };

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
    this._patternIdx   = 0;
    this._invincible   = false;
    this._graceTimer   = 2500;
    this._active       = false;
    this._introActive  = false;

    // Charge attack state
    this._chargeActive = false;
    this._chargeVx     = 0;
    this._chargeVy     = 0;
    this._chargeHit    = null;
    this._chargeStartX = 0;
    this._chargeStartY = 0;

    // Stone armor state
    this.stoneArmor    = 0;
    this.maxStoneArmor = cfg.maxStoneArmor || 0;
    this._armorActive  = false;

    const texBase = cfg.textureBase;
    this.sprite = scene.add.sprite(0, 0, texBase + '_idle_01');
    this.sprite.setScale(cfg.scale);
    if (cfg.tint) this.sprite.setTint(cfg.tint);
    this.add(this.sprite);

    const shadow = scene.add.ellipse(0, 40 * cfg.scale, 60 * cfg.scale, 18, 0x000000, 0.3);
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

    if (this._chargeActive) {
      this._updateCharge(delta, players, scene);
      return;
    }

    if (this.state === STATE.FIGHT) {
      this.posture = Math.max(0, this.posture - this.cfg.postureRegen * delta / 1000);
    }

    if (this.state === STATE.STAGGER) {
      this._staggerTimer -= delta;
      this.body?.setVelocity(0, 0);
      if (this._staggerTimer <= 0) {
        this.state = STATE.FIGHT;
        this._invincible = false;
        this._playAnim('idle');
      }
      return;
    }

    this._atkTimer = Math.max(0, this._atkTimer - delta);

    const phaseCfg = this.cfg.phases[this.phase];
    const target   = this._nearestPlayer(players);
    if (!target) return;

    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const shouldFlip = this.cfg.mirrorSprite ? dx > 0 : dx < 0;
    this.sprite.setFlipX(shouldFlip);

    if (dist > 80) {
      this.body?.setVelocity(dx / dist * phaseCfg.speed, dy / dist * phaseCfg.speed);
      this._playAnim('run');
    } else {
      this.body?.setVelocity(0, 0);
      this._doAttack(phaseCfg, target, scene);
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

  _updateCharge(delta, players, scene) {
    const speed = (this.cfg.phases[this.phase]?.speed || 100) * 5.5;
    this.body?.setVelocity(this._chargeVx * speed, this._chargeVy * speed);

    for (const p of players) {
      if (!p?.alive || p.downed || this._chargeHit.has(p)) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 90) {
        p.takeDamage(this.cfg.maxHp * 0.10, this, scene);
        scene.cameras.main.shake(200, 0.012);
        this._chargeHit.add(p);
      }
    }

    const traveled = Phaser.Math.Distance.Between(this._chargeStartX, this._chargeStartY, this.x, this.y);
    if (traveled > 750) this._endCharge(scene);
  }

  _endCharge(scene) {
    this._chargeActive = false;
    this.body?.setVelocity(0, 0);
    this._atkTimer = Math.max(this._atkTimer, 1600);
    scene.cameras.main.shake(360, 0.016);

    // Stagger flash — free hit window visual
    this.sprite.setTint(0xffaa44);
    scene.time.delayedCall(1400, () => {
      if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
    });

    // Spawn impact rocks
    const rockKeys = ['rock1', 'rock2'];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const rock = scene.add.image(this.x, this.y, rockKeys[i % 2])
        .setScale(0.5 + Math.random() * 0.5).setDepth(this.y + 10);
      scene.tweens.add({
        targets: rock,
        x: this.x + Math.cos(angle) * (80 + Math.random() * 80),
        y: this.y + Math.sin(angle) * (80 + Math.random() * 80),
        alpha: 0, duration: 600, ease: 'Power2.Out',
        onComplete: () => rock.destroy(),
      });
    }
  }

  _activateArmor(scene) {
    this.stoneArmor  = this.maxStoneArmor;
    this._armorActive = true;
    this.sprite.setTint(0x999999);
    scene.time.delayedCall(350, () => {
      if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
    });
    scene.events.emit('boss_armor_changed', { boss: this });
    scene.audio?.bossPhase?.();
  }

  _breakArmor(scene) {
    this._armorActive = false;
    this.stoneArmor   = 0;
    scene.cameras.main.shake(320, 0.012);
    scene.events.emit('boss_armor_broken', { boss: this });
    scene.audio?.bossStagger?.();
    this.sprite.setTint(0xffffff);
    scene.time.delayedCall(250, () => {
      if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
    });
  }

  _doAttack(phaseCfg, target, scene) {
    if (this._atkTimer > 0) return;
    this._atkTimer = phaseCfg.attackCd;

    const patterns = phaseCfg.patterns;
    const pattern  = patterns[this._patternIdx % patterns.length];
    this._patternIdx++;

    this._playAnim('attack');
    this._executePattern(pattern, target, scene);
  }

  _executePattern(pattern, target, scene) {
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
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const spread = pattern === 'despair_wave' ? 5 : 3;
        const step   = pattern === 'despair_wave' ? 0.25 : 0.32;
        for (let i = 0; i < spread; i++) {
          const off = (i - Math.floor(spread / 2)) * step;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y,
            angle: angle + off,
            damage: this.cfg.maxHp * 0.035,
            fromEnemy: true,
            key: 'fire_01',
            speed: 230,
            tint: this.cfg.tint || 0xff4444,
          });
        }
        break;
      }
      case 'charge': {
        const cdx = target.x - this.x, cdy = target.y - this.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        this._chargeVx = cdx / cdist;
        this._chargeVy = cdy / cdist;
        this._chargeHit = new Set();

        // Draw warning line over 800ms telegraph
        const lineGfx = scene.add.graphics().setDepth(600);
        lineGfx.lineStyle(4, 0xff4400, 0.75);
        lineGfx.beginPath();
        lineGfx.moveTo(this.x, this.y);
        lineGfx.lineTo(this.x + this._chargeVx * 820, this.y + this._chargeVy * 820);
        lineGfx.strokePath();
        scene.cameras.main.shake(150, 0.006);
        scene.tweens.add({ targets: lineGfx, alpha: 0, duration: 800, onComplete: () => lineGfx.destroy() });

        scene.time.delayedCall(800, () => {
          if (!this.alive) return;
          this._chargeActive = true;
          this._chargeStartX = this.x;
          this._chargeStartY = this.y;
          this._playAnim('run');
        });
        break;
      }

      case 'ground_crack': {
        scene.cameras.main.shake(280, 0.010);
        const baseAng = Math.atan2(target.y - this.y, target.x - this.x);
        const crackAngles = [baseAng - 0.38, baseAng, baseAng + 0.38];
        const crackLen = 320;

        for (const ang of crackAngles) {
          const cx = Math.cos(ang), cy = Math.sin(ang);
          const gfx = scene.add.graphics().setDepth(400);
          let progress = 0;

          scene.time.addEvent({
            delay: 18, repeat: 16,
            callback: () => {
              progress = Math.min(1, progress + 1 / 16);
              gfx.clear();
              gfx.lineStyle(9, 0xaa6633, 0.9);
              gfx.beginPath();
              gfx.moveTo(this.x, this.y);
              gfx.lineTo(this.x + cx * crackLen * progress, this.y + cy * crackLen * progress);
              gfx.strokePath();
              // Thin inner line for detail
              gfx.lineStyle(3, 0xffcc88, 0.6);
              gfx.beginPath();
              gfx.moveTo(this.x, this.y);
              gfx.lineTo(this.x + cx * crackLen * progress, this.y + cy * crackLen * progress);
              gfx.strokePath();
            },
          });

          // Damage at 280ms (near full extension)
          scene.time.delayedCall(280, () => {
            if (!this.alive) return;
            for (const p of scene.players) {
              if (!p?.alive || p.downed) continue;
              const pdx = p.x - this.x, pdy = p.y - this.y;
              const t = pdx * cx + pdy * cy;
              if (t < 0 || t > crackLen) continue;
              const perp = Math.abs(pdx * (-cy) + pdy * cx);
              if (perp < 48) p.takeDamage(this.cfg.maxHp * 0.05, this, scene);
            }
          });

          scene.time.delayedCall(320, () => {
            scene.tweens.add({ targets: gfx, alpha: 0, duration: 260, onComplete: () => gfx.destroy() });
          });
        }
        break;
      }

      case 'stomp_warning': {
        const bx = this.x, by = this.y;
        const safeZones = [
          { x: bx + 230, y: by - 140, r: 58 },
          { x: bx - 210, y: by + 110, r: 58 },
          { x: bx + 40,  y: by + 210, r: 58 },
        ];

        const gfxList = safeZones.map(sz => {
          const g = scene.add.graphics().setDepth(400);
          g.lineStyle(3, 0x00ff88, 0.85);
          g.strokeCircle(sz.x, sz.y, sz.r);
          g.fillStyle(0x00ff88, 0.14);
          g.fillCircle(sz.x, sz.y, sz.r);
          return g;
        });

        // Pulse the warning circles
        scene.cameras.main.shake(120, 0.005);
        scene.tweens.add({ targets: gfxList, alpha: 0.5, duration: 400, yoyo: true, repeat: 1 });

        scene.time.delayedCall(1200, () => {
          if (!this.alive) return;
          gfxList.forEach(g => g.destroy());
          scene.cameras.main.shake(500, 0.020);
          scene.events.emit('ability_fx', { type: 'explosion', x: this.x, y: this.y, r: 310 });

          for (const p of scene.players) {
            if (!p?.alive || p.downed) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
            if (d > 310) continue;
            const inSafe = safeZones.some(sz =>
              Phaser.Math.Distance.Between(p.x, p.y, sz.x, sz.y) <= sz.r
            );
            if (!inSafe) p.takeDamage(this.cfg.maxHp * 0.09, this, scene);
          }
        });
        break;
      }

      case 'split_gust': {
        scene.cameras.main.shake(180, 0.007);
        // Inner ring — players too close
        scene.events.emit('ability_fx', { type: 'explosion', x: this.x, y: this.y, r: 145 });
        for (const p of scene.players) {
          if (!p?.alive || p.downed) continue;
          if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= 145) {
            p.takeDamage(this.cfg.maxHp * 0.04, this, scene);
          }
        }
        // Outer ring 650ms later — players who backed away
        scene.time.delayedCall(650, () => {
          if (!this.alive) return;
          scene.cameras.main.shake(240, 0.009);
          const ringGfx = scene.add.graphics().setDepth(400);
          ringGfx.lineStyle(7, 0xff8844, 0.88);
          ringGfx.strokeCircle(this.x, this.y, 265);
          scene.tweens.add({ targets: ringGfx, alpha: 0, duration: 380, onComplete: () => ringGfx.destroy() });

          for (const p of scene.players) {
            if (!p?.alive || p.downed) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
            if (d >= 155 && d <= 315) p.takeDamage(this.cfg.maxHp * 0.045, this, scene);
          }
        });
        break;
      }

      case 'rage_slam': case 'frenzy': case 'hydra_form':
      case 'rock_storm': case 'tornado': case 'annihilation': case 'severance': {
        // Final phase special — dense radial burst
        scene.cameras.main.shake(350, 0.014);
        const count = pattern === 'annihilation' ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 / count) * i;
          scene.events.emit('spawn_projectile', {
            x: this.x, y: this.y, angle: a,
            damage: this.cfg.maxHp * 0.045,
            fromEnemy: true,
            key: 'fire_01',
            speed: 210,
            tint: this.cfg.tint || 0xff2200,
          });
        }
        break;
      }
    }
  }

  takeDamage(amount, scene) {
    if (!this.alive || this._invincible || this.state === STATE.STAGGER || this.state === STATE.DEAD) return;

    if (this._armorActive && this.stoneArmor > 0) {
      const drain = Math.min(this.stoneArmor, amount * 2);
      this.stoneArmor = Math.max(0, this.stoneArmor - drain);
      amount *= 0.3;
      if (this.stoneArmor <= 0) this._breakArmor(scene);
      scene.events.emit('boss_armor_changed', { boss: this });
    }

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
    const hpPct    = this.hp / this.maxHp;
    let newPhase = 0;
    for (let i = this.cfg.phases.length - 1; i >= 0; i--) {
      if (hpPct <= this.cfg.phases[i].hpThreshold && i > 0) { newPhase = i; break; }
    }
    if (newPhase <= this.phase) return;

    this.phase = newPhase;
    const labels = ['', 'PHASE II', 'FINAL PHASE'];

    // Dramatic phase transition: brief invincibility + forced stagger
    this._invincible   = true;
    this.state         = STATE.STAGGER;
    this._staggerTimer = 2200;

    // Scale pulse
    scene.tweens.add({
      targets: this, scaleX: 1.18, scaleY: 1.18,
      duration: 280, yoyo: true, ease: 'Power2',
    });

    // On final phase, tint boss red
    if (newPhase === 2) {
      this.sprite.setTint(0xff2222);
      scene.time.delayedCall(400, () => {
        if (this.alive) this.sprite.setTint(this.cfg.tint || 0xffffff);
      });

      // Activate stone armor (pashana_daitya only)
      if (this.cfg.maxStoneArmor) {
        scene.time.delayedCall(600, () => { if (this.alive) this._activateArmor(scene); });
      }

      // Wall-break visual event
      if (this.cfg.wallBreak) {
        scene.time.delayedCall(300, () => { if (this.alive) scene.events.emit('boss_wall_break', { boss: this }); });
      }
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
  }

  _die(scene) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.body?.setVelocity(0, 0);
    if (this.body) this.body.enable = false;
    this._playAnim('dead');

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
