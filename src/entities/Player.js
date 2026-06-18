import {
  PLAYER_SPEED, LIGHT_DMG, HEAVY_DMG, ATTACK_RANGE, ATTACK_ARC,
  LIGHT_CD, HEAVY_CD, LIGHT_STAMINA, HEAVY_STAMINA, DODGE_CD, DODGE_STAMINA, DODGE_DURATION,
  PERFECT_DODGE_WINDOW, PERFECT_DODGE_SLOWMO, PERFECT_DODGE_DURATION,
  WARRIOR_FRAME, XP_THRESHOLDS,
  AMRIT_MAX_DEFAULT, AMRIT_HEAL_FRAC, AMRIT_SIP_LOCKOUT,
} from '../constants.js';
import { AbilityManager } from '../systems/AbilityManager.js';
import { QualitySettings } from '../systems/QualitySettings.js';

const ABILITY_CDS = { Q: 8000, E: 10000, R: 12000 };

export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, isP1, saveData, charKey) {
    super(scene, x, y);
    scene.add.existing(this);

    this.isP1    = isP1;
    this.charKey = charKey || (isP1 ? 'dhruva' : 'tara');
    this.isLocal = true;
    this.facingX = 1;
    this.facingY = 0;

    const stats = saveData?.playerStats || { maxHp: 200, maxStamina: 100, abilityPow: 1.0 };
    this.maxHp      = stats.maxHp;
    this.hp         = this.maxHp;
    this.maxStamina = stats.maxStamina;
    this.stamina    = this.maxStamina;
    this.abilityPow = stats.abilityPow;
    this.level      = saveData?.playerLevel ?? 1;
    this.xp         = saveData?.playerXP    ?? 0;

    // Amrit — healing flask (Estus equivalent)
    this.amritMax     = saveData?.amritMax     ?? AMRIT_MAX_DEFAULT;
    this.amritCharges = saveData?.amritCharges ?? this.amritMax;
    this._amritLockout = 0;

    // State
    this.alive    = true;
    this.downed   = false;
    this.dodging  = false;
    this.attacking = false;
    this._lightCd = 0;
    this._heavyCd = 0;
    this._dodgeCd = 0;
    this._abilityCds = { Q: 0, E: 0, R: 0 };
    this._incomingAttackTimer = -1;
    this._perfectDodgeReady  = false;
    this._nextAttackMult     = 1;
    this._hitstopTimer       = 0;
    this._downTimer          = 0;
    this._dodgeTimer         = 0;
    this._guardStance        = false;
    this._questKillCount     = 0;
    this._agniShieldTimer     = 0;
    this._agniShieldFx        = null;
    this._agniShieldLoopTimer = null;
    this._slowMult   = 1.0;
    this._burnTimer  = null;
    this._slowTimer  = null;
    this._dustTimer  = 0;

    this.godMode     = false;
    this.oneShotMode = false;

    const base = this.charKey;
    this.baseKey = base;

    // Sprite
    this.sprite = scene.add.sprite(0, 0, base + '_idle', 0);
    this.sprite.setScale(1.0);
    this.add(this.sprite);
    this.sprite.play(base + '_idle');

    // Shadow
    if (QualitySettings.shadows) {
      const shadow = scene.add.ellipse(0, 16, 40, 12, 0x000000, 0.3);
      this.add(shadow);
      this.addAt(shadow, 0);
    }

    // HP bar above head
    this._hpBar = this._makeBar(scene, -30, -60, 60, 7, 0x00e676, 0x333333);
    this.add(this._hpBar.bg);
    this.add(this._hpBar.fill);

    // Name tag
    const isD = this.charKey === 'dhruva';
    const nameTag = scene.add.text(0, -75, isD ? 'Dhruva' : 'Tara', {
      fontSize: '11px', color: isD ? '#cc99ff' : '#88ccff',
      fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.add(nameTag);

    // Phaser physics body
    scene.physics.add.existing(this);
    this.body.setSize(32, 32);
    this.body.setOffset(-16, -16);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);

    this.setDepth(y);
  }

  _makeBar(scene, x, y, w, h, fillColor, bgColor) {
    const bg   = scene.add.rectangle(x + w / 2, y, w, h, bgColor).setOrigin(0.5, 0.5);
    const fill = scene.add.rectangle(x, y, w, h, fillColor).setOrigin(0, 0.5);
    return { bg, fill, w };
  }

  _updateHpBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.fill.scaleX = pct;
    this._hpBar.fill.setFillStyle(pct > 0.5 ? 0x00e676 : pct > 0.25 ? 0xffcc00 : 0xff4444);
  }

  update(time, delta, cursors, keys, enemies, scene) {
    if (!this.alive && !this.downed) return;
    if (this._hitstopTimer > 0) {
      this._hitstopTimer -= delta;
      return;
    }

    this.setDepth(this.y);

    if (this.downed) {
      this._downTimer -= delta;
      if (this._downTimer <= 0) this.revive();
      return;
    }

    if (this._amritLockout > 0) this._amritLockout -= delta;

    this._tick(time, delta);
    this._move(delta, cursors, keys);
    if (keys) this._handleInput(time, keys, enemies, scene);
    if (keys?.H && Phaser.Input.Keyboard.JustDown(keys.H)) this.quaffAmrit(scene);

    this._regen(delta);
    this._updateHpBar();

    // Stamina regen
    if (!this.dodging && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * delta / 1000);
    }
  }

  _tick(time, delta) {
    if (this._lightCd > 0)  this._lightCd  -= delta;
    if (this._heavyCd > 0)  this._heavyCd  -= delta;
    if (this._dodgeCd > 0)  this._dodgeCd  -= delta;
    if (this._incomingAttackTimer > 0) this._incomingAttackTimer -= delta;

    for (const k of ['Q', 'E', 'R']) {
      if (this._abilityCds[k] > 0) this._abilityCds[k] -= delta;
    }

    if (this._dodgeTimer > 0) {
      this._dodgeTimer -= delta;
      if (this._dodgeTimer <= 0) this.dodging = false;
    }

    if (this._agniShieldTimer > 0) {
      this._agniShieldTimer -= delta;
      if (this._agniShieldTimer <= 0) {
        this._agniShieldTimer = 0;
        if (this._agniShieldFx) { this._agniShieldFx.destroy(); this._agniShieldFx = null; }
        if (this._agniShieldLoopTimer) { this._agniShieldLoopTimer.remove(false); this._agniShieldLoopTimer = null; }
      }
    }
  }

  _regen() {}

  _move(delta, cursors, keys) {
    if (this.dodging) return;

    // If no keys/cursors are passed, it's the remote player.
    // We let the Tween in applyNetState handle the movement now!
    if (!keys && !cursors) return;

    if (this.scene?.cheatConsoleOpen) { this.body.setVelocity(0, 0); return; }

    let vx = 0, vy = 0;
    const left  = (cursors?.left.isDown)  || (keys?.A?.isDown) || (keys?.LEFT?.isDown);
    const right = (cursors?.right.isDown) || (keys?.D?.isDown) || (keys?.RIGHT?.isDown);
    const up    = (cursors?.up.isDown)    || (keys?.W?.isDown) || (keys?.UP?.isDown);
    const down  = (cursors?.down.isDown)  || (keys?.S?.isDown) || (keys?.DOWN?.isDown);

    if (left)  vx = -PLAYER_SPEED;
    if (right) vx =  PLAYER_SPEED;
    if (up)    vy = -PLAYER_SPEED;
    if (down)  vy =  PLAYER_SPEED;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    // Apply slow status effect
    const sm = this._slowMult ?? 1;
    vx *= sm; vy *= sm;

    this.body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (vx !== 0) { this.facingX = Math.sign(vx); this.facingY = 0; }
      else if (vy !== 0) { this.facingY = Math.sign(vy); }
      this.sprite.setFlipX(this.facingX < 0);
      if (!this.attacking) this.sprite.play(this.baseKey + '_run', true);

      // Footstep dust puffs
      if (this.isLocal) {
        this._dustTimer -= delta;
        if (this._dustTimer <= 0) {
          this._dustTimer = 340;
          this._spawnFootDust(this.scene);
        }
      }
    } else {
      this.body.setVelocity(0, 0);
      this._dustTimer = 0;
      if (!this.attacking) this.sprite.play(this.baseKey + '_idle', true);
    }
  }

  _handleInput(time, keys, enemies, scene) {
    if (scene?.cheatConsoleOpen) return;
    if (keys.J?.isDown && this._lightCd <= 0 && !this.dodging && this.stamina >= LIGHT_STAMINA) {
      this._lightCd = LIGHT_CD;
      this.stamina -= LIGHT_STAMINA;
      this._doAttack(LIGHT_DMG * this.abilityPow * this._nextAttackMult, 0, enemies, scene);
      this._nextAttackMult = 1;
      scene.audio.hit();
    }

    if (keys.K?.isDown && this._heavyCd <= 0 && !this.dodging && this.stamina >= HEAVY_STAMINA) {
      this._heavyCd = HEAVY_CD;
      this.stamina -= HEAVY_STAMINA;
      this._doAttack(HEAVY_DMG * this.abilityPow * this._nextAttackMult, 0, enemies, scene);
      this._nextAttackMult = 1;
      scene.audio.heavyHit();
    }

    if (Phaser.Input.Keyboard.JustDown(keys.SHIFT) && this._dodgeCd <= 0 && this.stamina >= DODGE_STAMINA) {
      this._doDodge(scene);
    }

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
        this.stamina += ability.stamina;
      }
    }
  }

  _doAttack(damage, hitstop, enemies, scene) {
    if (this.oneShotMode) damage *= 9999;
    this.attacking = true;
    const heavy  = damage > 25;
    const atkKey = heavy ? '_attack2' : '_attack1';
    this.sprite.play(this.baseKey + atkKey, true).once('animationcomplete', () => {
      this.attacking = false;
    });

    if (heavy) this._spawnAttackTrail(scene);

    // squash/stretch on the swing (player sprite base scale is a constant 1.0)
    scene._popSprite?.(this.sprite, 1, 1, heavy ? 1.22 : 1.14, heavy ? 0.80 : 0.90, heavy ? 110 : 80);

    this._hitstopTimer = hitstop;
    let _hitLanded = false;

    // Arc hit detection
    const angle = Math.atan2(this.facingY, this.facingX);
    const halfArc = Phaser.Math.DegToRad(ATTACK_ARC / 2);

    const rangeSq = ATTACK_RANGE * ATTACK_RANGE;
    for (const enemy of enemies) {
      if (!enemy || !enemy.active || !enemy.alive) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > rangeSq) continue;

      // Point-blank always hits
      const hits = distSq <= 50 * 50 || Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) < halfArc;
      if (hits) {
        enemy.takeDamage(damage, this, scene);
        this._spawnHitFX(scene, enemy.x, enemy.y, heavy);
        _hitLanded = true;
      }
    }

    // Boss hit check
    const boss = scene?._boss;
    if (boss?.alive) {
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const distSq = dx * dx + dy * dy;
      const bossRange = ATTACK_RANGE + 40;
      if (distSq <= bossRange * bossRange) {
        const hits = distSq <= 70 * 70 || Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) < halfArc;
        if (hits) {
          scene.hitBoss(damage);
          this._spawnHitFX(scene, boss.x, boss.y, heavy);
          _hitLanded = true;
        }
      }
    }

    // weighty hits give a short, subtle camera punch
    if (_hitLanded && heavy) scene._cameraPunch?.(0.006, 80);
  }

  _doDodge(scene) {
    this.stamina     -= DODGE_STAMINA;
    this._dodgeCd    = DODGE_CD;
    this._dodgeTimer = DODGE_DURATION;
    this.dodging     = true;
    this._perfectDodgeReady = true;

    const speed = PLAYER_SPEED * 2.8;
    this.body.setMaxVelocity(speed, speed);
    this.body.setVelocity(this.facingX * speed, this.facingY * speed);

    this.sprite.setAlpha(0.6);
    this.scene.tweens.add({
      targets: this.sprite, alpha: 1,
      duration: DODGE_DURATION, ease: 'Power1',
    });

    scene.audio.dodge();
    this._spawnDustFX(scene);

    this.scene.time.delayedCall(DODGE_DURATION, () => {
      this.dodging = false;
      this._perfectDodgeReady = false;
      this.body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);
    });
  }

  notifyIncomingAttack() {
    this._incomingAttackTimer = PERFECT_DODGE_WINDOW;
  }

  checkPerfectDodge(scene) {
    if (!this._perfectDodgeReady) return false;
    if (this._incomingAttackTimer <= 0) return false;

    this._perfectDodgeReady = false;
    this._nextAttackMult = 1.5;
    this.stamina = Math.min(this.maxStamina, this.stamina + 25);

    scene.tweens.add({ targets: { v: 1 }, v: 0, duration: 1, onStart: () => {
      scene.physics.world.timeScale = PERFECT_DODGE_SLOWMO;
      scene.time.addEvent({ delay: PERFECT_DODGE_DURATION, callback: () => {
        scene.physics.world.timeScale = 1;
      }});
    }});

    scene.audio.perfectDodge();
    scene.events.emit('perfect_dodge');
    return true;
  }

  takeDamage(amount, source, scene) {
    if (!this.alive || this.downed) return;

    // ── Co-op: a player's HP is authoritative on its owner ──────────────
    // The host simulates enemies and may call takeDamage on its REMOTE copy
    // of the client's player. Applying it here is futile — the owner's
    // PLAYER_STATE broadcast would overwrite it. Instead forward the raw hit
    // to the owner, who applies it with their own dodge/guard/shield logic.
    if (!this.isLocal && scene?.network?.connected) {
      scene.network.send('PLAYER_DAMAGE', { amount });
      return;
    }

    if (this.godMode) return;
    if (this.dodging && this.checkPerfectDodge(scene)) return;
    if (this._guardStance) amount *= 0.5;
    if (this._agniShieldTimer > 0) {
      amount *= 0.5;
      if (source?.takeDamage) source.takeDamage(10, this, scene);
    }

    this.hp = Math.max(0, this.hp - amount);
    this._updateHpBar();

    if (scene?.audio) scene.audio.playerDamage();

    this.sprite.setTint(0xff6666);
    this.scene.time.delayedCall(150, () => this.sprite.clearTint());

    if (this.hp <= 0) this._goDown(scene);

    scene?.events?.emit('player_damaged', { player: this });
  }

  applyPoison(scene, dpsPerTick, duration) {
    if (!this.alive || this.downed) return;
    if (this._poisonTimer) { this._poisonTimer.remove(); this._poisonTimer = null; }
    const ticks = Math.max(1, Math.floor(duration / 500));
    let count = 0;
    this._poisonTimer = scene.time.addEvent({
      delay: 500, repeat: ticks - 1,
      callback: () => {
        if (!this.alive || this.downed) { this._poisonTimer = null; return; }
        this.hp = Math.max(0, this.hp - dpsPerTick);
        this._updateHpBar();
        this.sprite.setTint(0x00ff88);
        scene.time.delayedCall(120, () => { if (this.alive) this.sprite.clearTint(); });
        count++;
        if (this.hp <= 0) this._goDown(scene);
        if (count >= ticks) this._poisonTimer = null;
      },
    });
  }

  _goDown(scene) {
    this.downed = true;
    this._downTimer = 12000;
    this.body.setVelocity(0, 0);
    this.sprite.setAlpha(0.4);
    this.sprite.play(this.baseKey + '_idle', true);
    scene?.events?.emit('player_downed', { player: this });
  }

  revive() {
    this.downed   = false;
    this.hp       = Math.floor(this.maxHp * 0.4);
    this.sprite.setAlpha(1);
    this._updateHpBar();
    this.scene?.events?.emit('player_revived', { player: this });
  }

  _spawnHitFX(scene, x, y, heavy = false) {
    if (heavy) {
      const key = 'vfx_yellow1', init = 'vfx_y1_1';
      if (scene.anims?.exists(key) && scene.textures?.exists(init)) {
        scene.add.sprite(x, y, init).setScale(1.1).setDepth(y + 10)
          .play(key).once('animationcomplete', s => s.destroy());
        return;
      }
    } else {
      const idx  = Math.floor(Math.random() * 5) + 1;
      const key  = `vfx_green${idx}`, init = `vfx_g${idx}_1`;
      if (scene.anims?.exists(key) && scene.textures?.exists(init)) {
        scene.add.sprite(x, y, init).setScale(0.85).setDepth(y + 10)
          .play(key).once('animationcomplete', s => s.destroy());
        return;
      }
    }
    const fx = scene.add.sprite(x, y, 'explosion_01').setScale(heavy ? 1.1 : 0.8);
    if (scene.anims.exists('explosion_01_anim')) {
      fx.play('explosion_01_anim').once('animationcomplete', () => fx.destroy());
    } else {
      scene.tweens.add({ targets: fx, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200, onComplete: () => fx.destroy() });
    }
  }

  _spawnAttackTrail(scene) {
    for (let i = 0; i < 3; i++) {
      const ghost = scene.add.sprite(this.x, this.y, this.sprite.texture.key, this.sprite.frame.name)
        .setAlpha(0.38 - i * 0.1)
        .setFlipX(this.sprite.flipX)
        .setScale(this.sprite.scaleX, this.sprite.scaleY)
        .setDepth(this.depth - i - 1);
      scene.tweens.add({ targets: ghost, alpha: 0, duration: 180 + i * 65, onComplete: () => ghost.destroy() });
    }
  }

  _spawnFootDust(scene) {
    const n = Math.floor(Math.random() * 2) + 1;
    const k = `vfx_smoke${n}`, fk = `vfx_s${n}_1`;
    if (!scene.anims?.exists(k)) return;
    const s = scene.add.sprite(
      this.x + (Math.random() - 0.5) * 14,
      this.y + 6, fk
    ).setScale(0.35).setAlpha(0.28).setDepth(this.depth - 1).setTint(0xccaa88);
    s.play(k);
    s.once('animationcomplete', () => s.destroy());
  }

  _spawnDustFX(scene) {
    const fx = scene.add.sprite(this.x, this.y, 'dust_01');
    fx.setScale(0.7);
    scene.tweens.add({
      targets: fx, alpha: 0, scaleX: 1.3, scaleY: 1.3,
      duration: 250, onComplete: () => fx.destroy(),
    });
  }

  _spawnAbilityCircle(scene, x, y, r, color) {
    const circle = scene.add.circle(x, y, r, color, 0.3);
    scene.tweens.add({
      targets: circle, alpha: 0, scaleX: 1.3, scaleY: 1.3,
      duration: 400, onComplete: () => circle.destroy(),
    });
  }

  getNetState() {
    return {
      x: this.x, y: this.y,
      vx: this.body ? this.body.velocity.x : 0, 
      vy: this.body ? this.body.velocity.y : 0, 
      hp: this.hp, stamina: this.stamina,
      facingX: this.facingX, facingY: this.facingY,
      downed: this.downed,
      amritCharges: this.amritCharges, amritMax: this.amritMax,
      anim: this.sprite.anims.currentAnim?.key || '',
    };
  }

  applyNetState(state) {
    this.hp      = state.hp;
    this.stamina = state.stamina;
    this.downed  = state.downed;
    if (state.amritCharges != null) this.amritCharges = state.amritCharges;
    if (state.amritMax != null)     this.amritMax     = state.amritMax;
    this.facingX = state.facingX;
    this.facingY = state.facingY;

    this.sprite.setFlipX(state.facingX < 0);
    if (state.anim && this.sprite.anims.currentAnim?.key !== state.anim) {
      this.sprite.play(state.anim, true);
    }

    this._updateHpBar();
    this.setDepth(state.y);

    // --- SMOOTH NETWORK GLIDING (TWEEN FIX) ---
    const dx = state.x - this.x;
    const dy = state.y - this.y;

    if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
      // Snap instantly if distance is huge (e.g. just spawned in)
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

  applyBurn(scene, dpsPerTick, duration) {
    if (!this.alive || this.downed) return;
    if (this._burnTimer) { this._burnTimer.remove(); this._burnTimer = null; }
    scene.events?.emit('status_flash', { color: 0xff7700, alpha: 0.18, duration: 350 });
    const ticks = Math.max(1, Math.floor(duration / 400));
    let count = 0;
    this._burnTimer = scene.time.addEvent({
      delay: 400, repeat: ticks - 1,
      callback: () => {
        if (!this.alive || this.downed) { this._burnTimer = null; return; }
        this.hp = Math.max(0, this.hp - dpsPerTick);
        this._updateHpBar();
        this.sprite.setTint(0xff6600);
        scene.time.delayedCall(100, () => { if (this.alive) this.sprite.clearTint(); });
        if (++count >= ticks) this._burnTimer = null;
        if (this.hp <= 0) this._goDown(scene);
      },
    });
  }

  applySlow(scene, duration) {
    if (!this.alive || this.downed) return;
    if (this._slowTimer) { this._slowTimer.remove(); this._slowTimer = null; }
    scene.events?.emit('status_flash', { color: 0x4477ff, alpha: 0.16, duration: 320 });
    this._slowMult = 0.5;
    this.sprite.setTint(0x6699ff);
    this._slowTimer = scene.time.delayedCall(duration, () => {
      this._slowMult = 1.0;
      this._slowTimer = null;
      if (this.alive) this.sprite.clearTint();
    });
  }

  applyStat(stat, tier) {
    // Each allocated point = +5%. A full 5-point level pumped into one stat = +25%,
    // matching the pre-points-system per-level growth.
    const mult = 1 + tier * 0.05;
    if (stat === 'maxHp') {
      this.maxHp = Math.floor(200 * mult);
      this.hp = Math.min(this.hp, this.maxHp);
    } else if (stat === 'stamina') {
      this.maxStamina = Math.floor(100 * mult);
    } else if (stat === 'abilityPow') {
      this.abilityPow = mult;
    }
    this._updateHpBar();
  }

  quaffAmrit(scene) {
    if (!this.alive || this.downed) return false;
    if (this._amritLockout > 0) return false;
    if (this.amritCharges <= 0) {
      scene?.events?.emit('amrit_changed', { player: this, charges: this.amritCharges, max: this.amritMax, empty: true });
      return false;
    }
    if (this.hp >= this.maxHp) return false;   // don't waste a sip at full HP
    this.amritCharges--;
    this._amritLockout = AMRIT_SIP_LOCKOUT;
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp * AMRIT_HEAL_FRAC));
    this._updateHpBar();
    scene?.events?.emit('amrit_used', { player: this, x: this.x, y: this.y });
    scene?.events?.emit('amrit_changed', { player: this, charges: this.amritCharges, max: this.amritMax });
    return true;
  }

  refillAmrit(scene) {
    this.amritCharges = this.amritMax;
    scene?.events?.emit('amrit_changed', { player: this, charges: this.amritCharges, max: this.amritMax });
  }

  gainXP(amount) {
    if (!this.alive) return;
    this.xp += amount;
    const threshold = XP_THRESHOLDS[this.level - 1];
    if (threshold && this.xp >= threshold) {
      this.level++;
      this.xp -= threshold;
      // Banked: the boon is chosen by resting at a Thread Shrine, Souls-style.
      this.scene.events.emit('level_banked', { level: this.level });
    }
    this.scene.events.emit('xp_changed', { xp: this.xp, level: this.level, threshold: XP_THRESHOLDS[this.level - 1] });
  }
}