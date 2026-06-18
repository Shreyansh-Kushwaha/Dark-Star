import { ENEMY_TYPES } from '../data/enemies.js';
import { QualitySettings } from '../systems/QualitySettings.js';

const STATE = { IDLE: 'idle', PURSUE: 'pursue', ATTACK: 'attack', FLEE: 'flee', DEAD: 'dead' };
const IDLE_ROAM_DIST = 120;
const DETECT_RANGE   = 350;
const DETECT_RANGE_SQ = DETECT_RANGE * DETECT_RANGE;
// Passive wildlife: bolt when the player gets this close (or when hit), and keep
// running until they've opened up this much distance.
const FLEE_TRIGGER   = 170;
const FLEE_TRIGGER_SQ = FLEE_TRIGGER * FLEE_TRIGGER;
const FLEE_SAFE      = 360;
const FLEE_SAFE_SQ   = FLEE_SAFE * FLEE_SAFE;
let _enemyIdCounter  = 0;

export class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, x, y, typeKey, diffMult = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this._id = ++_enemyIdCounter;

    // typeKey may be a string (ENEMY_TYPES lookup) or a ready-made config object
    // (map-editor creatures synthesize one from animations.json — see GameScene).
    const cfg = (typeKey && typeof typeKey === 'object') ? typeKey : ENEMY_TYPES[typeKey];
    this.typeKey   = cfg.key;
    this.cfg       = cfg;
    if (typeof typeKey === 'string') scene._markEnemyEncountered?.(typeKey); // Codex bestiary
    this.alive     = true;
    this.passive   = !!cfg.passive;   // wildlife: never attacks; flees instead
    this._fleeTimer = 0;
    this.state     = STATE.IDLE;
    this.speed     = cfg.speed;
    this.maxHp     = Math.floor(cfg.maxHp * diffMult);
    this.hp        = this.maxHp;
    this.damage    = cfg.attackDmg * diffMult;
    this.range     = cfg.attackRange;
    this.attackCd  = cfg.attackCd;
    this._atkTimer = 0;
    this._shockwaveTimer = cfg.shockwaveCd || Infinity;
    this._coverTree = null;
    this._lastDepthY = y;

    this._spawnX = x;
    this._spawnY = y;
    this._roamTarget = null;
    this._roamTimer  = 0;

    // Stuck detection
    this._stuckCheckX     = x;
    this._stuckCheckY     = y;
    this._stuckCheckTimer = 0;
    this._stuckDetourTimer = 0;
    this._stuckDetourAngle = 0;

    // Build sprite — new spritesheet-based enemies have a spriteTexture override
    const baseKey  = cfg.textureBase;
    const initTex  = cfg.spriteTexture || (baseKey + '_idle_01');
    this.sprite = scene.add.sprite(0, 0, initTex);
    this.sprite.setScale(cfg.scale || 1);
    if (cfg.tint) this.sprite.setTint(cfg.tint);
    this.add(this.sprite);

    // Mimic: starts dormant (chest) until player gets close
    if (cfg.isMimic) {
      this._mimicAwake = false;
      this._mimicPhase = 'chest'; // 'chest' | 'opening' | 'awake'
    }

    // Shadow
    if (QualitySettings.shadows) {
      const shadow = scene.add.ellipse(0, this.sprite.displayHeight * 0.35, 30 * (cfg.scale || 1), 10, 0x000000, 0.25);
      this.addAt(shadow, 0);
    }

    // HP bar
    this._hpBar = scene.add.rectangle(0, -32 * (cfg.scale || 1), 40, 4, 0x22cc44).setOrigin(0.5, 0.5);
    this._hpBg  = scene.add.rectangle(0, -32 * (cfg.scale || 1), 40, 4, 0x333333).setOrigin(0.5, 0.5);
    this.add(this._hpBg);
    this.add(this._hpBar);

    // Physics
    scene.physics.add.existing(this);
    this.body.setSize(28, 28);
    this.body.setOffset(-14, -14);
    if (cfg.physics) this.body.allowGravity = false;

    // Directional sprites (e.g. farm animals) ship _back/_left/_right variants;
    // if any exist, drive the anim by facing instead of mirroring with flipX.
    this._facing = 'front';
    const tb = this.cfg.textureBase;
    this._directional = ['idle', 'walk', 'run'].some(n =>
      scene.anims.exists(`${tb}_${n}_left`) ||
      scene.anims.exists(`${tb}_${n}_right`) ||
      scene.anims.exists(`${tb}_${n}_back`));
    // Directional creatures start facing a random way so a placed group doesn't
    // all stare front; facing then tracks movement. (Front-only sprites stay front.)
    if (this._directional) {
      this._facing = ['front', 'back', 'left', 'right'][Math.floor(Math.random() * 4)];
    }

    this._playAnim('idle');
    this.setDepth(y);
  }

  _playAnim(state) {
    // Creatures may name their anims differently (e.g. "death" not "dead",
    // "walk" not "run"); cfg.animAlias remaps the logical state to what exists.
    const alias = this.cfg.animAlias;
    const name  = (alias && alias[state]) || state;
    const base  = this.cfg.textureBase;

    // Directional sprites: pick the variant matching current facing. front uses
    // the bare name; back/left/right append a suffix. Falls back to the bare clip.
    if (this._directional && this._facing && this._facing !== 'front') {
      const dirKey = `${base}_${name}_${this._facing}`;
      if (this.scene.anims.exists(dirKey)) {
        this.sprite.setFlipX(false);          // directional clips already face correctly
        this.sprite.play(dirKey, true);
        return;
      }
    }
    const key = `${base}_${name}`;
    if (this.scene.anims.exists(key)) {
      if (this._directional) this.sprite.setFlipX(false);
      this.sprite.play(key, true);
    }
  }

  update(time, delta, players, treePositions) {
    if (!this.alive) return;
    this._atkTimer = Math.max(0, this._atkTimer - delta);
    if (this._shockwaveTimer !== Infinity) this._shockwaveTimer = Math.max(0, this._shockwaveTimer - delta);

    if (Math.abs(this.y - this._lastDepthY) > 1) {
      this.setDepth(this.y);
      this._lastDepthY = this.y;
    }

    // Track 4-way facing from current velocity (keep last facing when stopped).
    if (this._directional && this.body) {
      const vx = this.body.velocity.x, vy = this.body.velocity.y;
      if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
        this._facing = Math.abs(vx) >= Math.abs(vy)
          ? (vx < 0 ? 'left' : 'right')
          : (vy < 0 ? 'back' : 'front');
      }
    }

    const target = this._nearestPlayer(players);

    // Mimic: awaken sequence when player steps close
    if (this.cfg.isMimic && !this._mimicAwake) {
      if (target) {
        const mdx = this.x - target.x, mdy = this.y - target.y;
        if (mdx * mdx + mdy * mdy < 200 * 200 && this._mimicPhase === 'chest') {
          this._mimicPhase = 'opening';
          this._playAnim('opening');
          this.scene.time.delayedCall(900, () => {
            if (!this.alive) return;
            this._mimicPhase = 'awake';
            this._mimicAwake = true;
            this._playAnim('run');
          });
        }
      }
      if (this._mimicPhase !== 'awake') return; // stay frozen until awake
    }

    switch (this.state) {
      case STATE.IDLE:    this._doIdle(time, delta, target); break;
      case STATE.PURSUE:  this._doPursue(delta, target, treePositions); break;
      case STATE.ATTACK:  this._doAttack(target); break;
      case STATE.FLEE:    this._doFlee(delta, target); break;
    }
  }

  _nearestPlayer(players) {
    if (this.scene?.freeroam) return null;
    let best = null, bestDistSq = Infinity;
    for (const p of players) {
      if (!p || !p.active || !p.alive || p.downed) continue;
      const dx = this.x - p.x, dy = this.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) { best = p; bestDistSq = dSq; }
    }
    return bestDistSq < DETECT_RANGE_SQ || this.state !== STATE.IDLE ? best : null;
  }

  _doIdle(time, delta, target) {
    if (target) {
      const dx = this.x - target.x, dy = this.y - target.y;
      const dSq = dx * dx + dy * dy;
      if (this.passive) {
        // Wildlife: never aggro — bolt only when the player gets very close.
        if (dSq < FLEE_TRIGGER_SQ) { this.state = STATE.FLEE; this._fleeTimer = 1200; return; }
      } else if (dSq < DETECT_RANGE_SQ) {
        this.state = STATE.PURSUE; return;
      }
    }

    this._roamTimer -= delta;
    if (this._roamTimer <= 0) {
      this._roamTimer = Phaser.Math.Between(2000, 4000);
      const angle = Math.random() * Math.PI * 2;
      this._roamTarget = {
        x: this._spawnX + Math.cos(angle) * IDLE_ROAM_DIST,
        y: this._spawnY + Math.sin(angle) * IDLE_ROAM_DIST,
      };
    }

    if (this._roamTarget) {
      const dx = this._roamTarget.x - this.x;
      const dy = this._roamTarget.y - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > 8) {
        const s = this.speed * 0.4;
        this.body.setVelocity(dx / d * s, dy / d * s);
        this.sprite.setFlipX(dx < 0);
        this._playAnim('run');

        // If roam target is blocked by a no-walk zone, pick a new one
        this._stuckCheckTimer -= delta;
        if (this._stuckCheckTimer <= 0) {
          this._stuckCheckTimer = 300;
          const moved = Phaser.Math.Distance.Between(this.x, this.y, this._stuckCheckX, this._stuckCheckY);
          if (moved < 4) { this._roamTarget = null; this._roamTimer = 0; }
          this._stuckCheckX = this.x;
          this._stuckCheckY = this.y;
        }
      } else {
        this.body.setVelocity(0, 0);
        this._playAnim('idle');
      }
    } else {
      this.body.setVelocity(0, 0);
      this._playAnim('idle');
    }
  }

  // Passive wildlife flee: sprint directly away from the player until they've
  // opened up a safe gap and the panic timer has run out, then settle to idle.
  _doFlee(delta, target) {
    this._fleeTimer -= delta;
    if (!target) {
      if (this._fleeTimer <= 0) { this.state = STATE.IDLE; this.body.setVelocity(0, 0); this._playAnim('idle'); }
      return;
    }
    const dx = this.x - target.x, dy = this.y - target.y;
    const dSq = dx * dx + dy * dy;
    if (this._fleeTimer <= 0 && dSq > FLEE_SAFE_SQ) {
      this.state = STATE.IDLE; this._roamTarget = null; this._roamTimer = 0;
      this.body.setVelocity(0, 0); this._playAnim('idle');
      return;
    }
    if (dSq < FLEE_TRIGGER_SQ) this._fleeTimer = Math.max(this._fleeTimer, 600); // keep bolting while chased
    const d = Math.sqrt(dSq) || 1;
    const mx = dx / d, my = dy / d;
    this.body.setVelocity(mx * this.speed, my * this.speed);
    this.sprite.setFlipX(mx < 0);
    this._playAnim('run');
  }

  _doPursue(delta, target, treePositions) {
    if (!target) { this.state = STATE.IDLE; return; }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.range) {
      this.body.setVelocity(0, 0);
      this.state = STATE.ATTACK;
      return;
    }

    // Ranged enemies seek cover near trees before shooting
    let mx = dx / dist, my = dy / dist;
    if (this.typeKey === 'ranged' && treePositions?.length && dist > 200) {
      const cover = this._findCoverPos(target, treePositions);
      if (cover) {
        const cdx = cover.x - this.x;
        const cdy = cover.y - this.y;
        const cd  = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd > 10) { mx = cdx / cd; my = cdy / cd; }
      }
    }

    // Stuck detection: if barely moved in 300ms, steer perpendicular to slide around obstacle
    this._stuckCheckTimer -= delta;
    if (this._stuckCheckTimer <= 0) {
      this._stuckCheckTimer = 300;
      const moved = Phaser.Math.Distance.Between(this.x, this.y, this._stuckCheckX, this._stuckCheckY);
      if (moved < 6 && this._stuckDetourTimer <= 0) {
        const baseAngle = Math.atan2(my, mx);
        const side = Math.random() < 0.5 ? 1 : -1;
        this._stuckDetourAngle = baseAngle + side * (Math.PI * 0.5 + Math.random() * 0.4);
        this._stuckDetourTimer = 500 + Math.random() * 400;
      }
      this._stuckCheckX = this.x;
      this._stuckCheckY = this.y;
    }
    if (this._stuckDetourTimer > 0) {
      this._stuckDetourTimer -= delta;
      mx = Math.cos(this._stuckDetourAngle);
      my = Math.sin(this._stuckDetourAngle);
    }

    this.body.setVelocity(mx * this.speed, my * this.speed);
    this.sprite.setFlipX(mx < 0);
    this._playAnim('run');
  }

  _findCoverPos(target, trees) {
    let best = null, bestScore = -Infinity;
    for (const t of trees) {
      const coverDist = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      const targetDist = Phaser.Math.Distance.Between(t.x, t.y, target.x, target.y);
      // Prefer trees close to us but with line-of-sight to target
      const score = -coverDist + (targetDist < 400 ? 100 : 0);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  _doAttack(target) {
    if (!target) { this.state = STATE.IDLE; return; }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (dist > this.range * 1.3) {
      this.state = STATE.PURSUE;
      return;
    }

    this.body.setVelocity(0, 0);
    this.sprite.setFlipX(target.x < this.x);

    if (this._atkTimer <= 0) {
      this._atkTimer = this.attackCd;
      this._playAnim('attack');

      if (this.typeKey === 'ranged') {
        this._fireProjectile(target);
      } else {
        target.notifyIncomingAttack?.();
        this.scene.time.delayedCall(300, () => {
          if (!this.alive || !target.alive) return;
          const d2 = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
          if (d2 <= this.range * 1.4) {
            target.takeDamage(this.damage, this, this.scene);
          }
        });
      }

      // Elite shockwave
      if (this.typeKey === 'elite' && this._shockwaveTimer <= 0) {
        this._shockwaveTimer = this.cfg.shockwaveCd;
        this._doShockwave();
      }
    }
  }

  _fireProjectile(target) {
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.scene.events.emit('spawn_projectile', {
      x: this.x, y: this.y, angle,
      damage: this.damage, fromEnemy: true,
      key: 'arrow', speed: 280,
    });
  }

  _doShockwave() {
    const r = 140;
    this.scene.events.emit('ability_fx', { type: 'shockwave', x: this.x, y: this.y, r });
    const players = this.scene.players || [];
    for (const p of players) {
      if (!p?.alive || p.downed) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= r) {
        p.takeDamage(this.damage * 0.8, this, this.scene);
      }
    }
  }

  _spawnDamageNumber(scene, amount) {
    if (!scene) return;
    const heavy = amount >= 20;
    const txt = scene.add.text(
      this.x + Phaser.Math.Between(-10, 10), this.y - 40,
      Math.ceil(amount).toString(),
      { fontSize: heavy ? '18px' : '13px', color: heavy ? '#ff5555' : '#ffcc44',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5, 1).setDepth(this.depth + 100);
    scene.tweens.add({ targets: txt, y: txt.y - 36, alpha: 0, duration: 700, ease: 'Power1',
      onComplete: () => txt.destroy() });
  }

  takeDamage(amount, source, scene) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this._updateHpBar();
    this._spawnDamageNumber(scene, amount);

    // hit juice: sharp white flash, squash/stretch pop, impact dust kick
    const _base = this.cfg.scale || 1;
    scene._popSprite?.(this.sprite, _base, _base, 1.18, 0.82, 80);
    scene._impactDust?.(this.x, this.y - 10, 0xffe6b0, amount >= 20 ? 6 : 4);
    this.sprite.setTint(0xffffff);
    scene.time.delayedCall(70, () => {
      if (this.alive) this.sprite.clearTint();
    });

    // Aggro on hit — but passive wildlife bolts instead of fighting back.
    if (this.passive) { this.state = STATE.FLEE; this._fleeTimer = 1500; }
    else if (this.state === STATE.IDLE) this.state = STATE.PURSUE;

    if (this.hp <= 0) this._die(scene);
  }

  knockback(angle, force) {
    if (!this.body) return;
    this.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    this.scene.time.delayedCall(200, () => {
      if (this.body) this.body.setVelocity(0, 0);
    });
  }

  _die(scene) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this._hpBar.setVisible(false);
    this._hpBg.setVisible(false);

    this._playAnim('dead');
    scene?.audio?.enemyDeath?.();
    scene?.events?.emit('enemy_killed', { enemy: this });

    if (scene) {
      // White flash on death
      this.sprite.setTint(0xffffff);

      // Particle burst
      const colors = [0xff4444, 0xffaa33, 0xff6600];
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i;
        const d = 22 + Math.random() * 18;
        const dot = scene.add.circle(
          this.x + Math.cos(a) * d, this.y + Math.sin(a) * d,
          3 + Math.random() * 3, colors[i % 3], 0.9
        ).setDepth(this.depth + 2);
        scene.tweens.add({
          targets: dot,
          x: dot.x + Math.cos(a) * 28, y: dot.y + Math.sin(a) * 28,
          alpha: 0, scaleX: 0.1, scaleY: 0.1,
          duration: 380 + Math.random() * 200,
          onComplete: () => dot.destroy(),
        });
      }

      // Smoke puff
      const idx = Phaser.Math.Between(1, 2);
      const smokeKey  = `vfx_smoke${idx}`;
      const initFrame = `vfx_s${idx}_1`;
      if (scene.anims?.exists(smokeKey) && scene.textures?.exists(initFrame)) {
        const s = scene.add.sprite(this.x, this.y - 10, initFrame).setScale(0.8).setDepth(this.depth + 1).setAlpha(0.85);
        s.play(smokeKey);
        s.once('animationcomplete', () => s.destroy());
      }
    }

    this.scene.time.delayedCall(700, () => {
      this.scene.tweens.add({
        targets: this, alpha: 0, duration: 500,
        onComplete: () => this.destroy(),
      });
    });
  }

  _updateHpBar() {
    const pct = this.hp / this.maxHp;
    this._hpBar.scaleX = pct;
    this._hpBar.setFillStyle(pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xffcc00 : 0xff4444);
    this._hpBar.setVisible(pct < 1);
    this._hpBg.setVisible(pct < 1);
  }

  getNetState() {
    return {
      id:      this._id,
      typeKey: this.typeKey,
      x:       this.x,
      y:       this.y,
      hp:      this.hp,
      maxHp:   this.maxHp,
      alive:   this.alive,
      flipX:   this.sprite?.flipX || false,
      anim:    this.sprite?.anims?.currentAnim?.key || '',
    };
  }

  applyNetState(state) {
    if (!state.alive && this.alive) { this._die(null); return; }
    if (!this.alive) return;

    this.hp = state.hp;
    this._updateHpBar();

    if (this.sprite) {
      this.sprite.setFlipX(state.flipX);
      const k = state.anim;
      if (k && this.sprite.anims?.currentAnim?.key !== k && this.scene.anims.exists(k)) {
        this.sprite.play(k, true);
      }
    }
    this.setDepth(state.y);

    // --- SMOOTH NETWORK GLIDING (TWEEN FIX) ---
    const dx = state.x - this.x;
    const dy = state.y - this.y;

    if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
      // Snap instantly if distance is huge (e.g., just spawned in)
      this.x = state.x;
      this.y = state.y;
      if (this.body) {
        this.body.setVelocity(0, 0);
        this.body.reset(this.x, this.y);
      }
    } else {
      // Stop the old tween if a new packet arrives early
      if (this._netTween) this._netTween.stop();

      // Smoothly slide them to the exact coordinates over 100 milliseconds
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