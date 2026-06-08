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
