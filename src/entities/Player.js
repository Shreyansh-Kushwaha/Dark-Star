import {
  PLAYER_SPEED, LIGHT_DMG, HEAVY_DMG, ATTACK_RANGE, ATTACK_ARC,
  LIGHT_CD, HEAVY_CD, DODGE_CD, DODGE_STAMINA, DODGE_DURATION,
  PERFECT_DODGE_WINDOW, PERFECT_DODGE_SLOWMO, PERFECT_DODGE_DURATION,
  WARRIOR_FRAME,
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
    this._agniShieldTimer = 0;
    this._agniShieldFx    = null;

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
    if (this._agniShieldFx) this._agniShieldFx.setPosition(this.x, this.y);

    if (this.downed) {
      this._downTimer -= delta;
      if (this._downTimer <= 0) this.revive();
      return;
    }

    this._tick(time, delta);
    this._move(delta, cursors, keys);
    if (keys) this._handleInput(time, keys, enemies, scene);

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
      }
    }
  }

  _regen() {}

  _move(delta, cursors, keys) {
    if (this.dodging) return;
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

    this.body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (vx !== 0) { this.facingX = Math.sign(vx); this.facingY = 0; }
      else if (vy !== 0) { this.facingY = Math.sign(vy); }
      this.sprite.setFlipX(this.facingX < 0);
      if (!this.attacking) this.sprite.play(this.baseKey + '_run', true);
    } else {
      this.body.setVelocity(0, 0);
      if (!this.attacking) this.sprite.play(this.baseKey + '_idle', true);
    }
  }

  _handleInput(time, keys, enemies, scene) {
    if (scene?.cheatConsoleOpen) return;
    if (keys.J?.isDown && this._lightCd <= 0 && !this.dodging) {
      this._lightCd = LIGHT_CD;
      this._doAttack(LIGHT_DMG * this.abilityPow * this._nextAttackMult, 40, enemies, scene);
      this._nextAttackMult = 1;
      scene.audio.hit();
    }

    if (keys.K?.isDown && this._heavyCd <= 0 && !this.dodging) {
      this._heavyCd = HEAVY_CD;
      this._doAttack(HEAVY_DMG * this.abilityPow * this._nextAttackMult, 80, enemies, scene);
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
    const atkKey = damage > 25 ? '_attack2' : '_attack1';
    this.sprite.play(this.baseKey + atkKey, true).once('animationcomplete', () => {
      this.attacking = false;
    });

    this._hitstopTimer = hitstop;

    // Arc hit detection
    const angle = Math.atan2(this.facingY, this.facingX);
    const halfArc = Phaser.Math.DegToRad(ATTACK_ARC / 2);

    for (const enemy of enemies) {
      if (!enemy || !enemy.active || !enemy.alive) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ATTACK_RANGE) continue;

      // Point-blank always hits
      const hits = dist <= 50 || Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) < halfArc;
      if (hits) {
        enemy.takeDamage(damage, this, scene);
        this._spawnHitFX(scene, enemy.x, enemy.y);
      }
    }

    // Boss hit check
    const boss = scene?._boss;
    if (boss?.alive) {
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const bossRange = ATTACK_RANGE + 40;
      if (dist <= bossRange) {
        const hits = dist <= 70 || Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) < halfArc;
        if (hits) {
          scene.hitBoss(damage);
          this._spawnHitFX(scene, boss.x, boss.y);
        }
      }
    }
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

    this._hitstopTimer = 60;
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

  _spawnHitFX(scene, x, y) {
    const fx = scene.add.sprite(x, y, 'explosion_01');
    fx.setScale(0.8);
    if (scene.anims.exists('explosion_01_anim')) {
      fx.play('explosion_01_anim').once('animationcomplete', () => fx.destroy());
    } else {
      scene.tweens.add({
        targets: fx, alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 200, onComplete: () => fx.destroy(),
      });
    }
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
      hp: this.hp, stamina: this.stamina,
      facingX: this.facingX, facingY: this.facingY,
      downed: this.downed,
      anim: this.sprite.anims.currentAnim?.key || '',
    };
  }

  applyNetState(state) {
    // body.reset() moves both the physics body AND the container atomically.
    // Direct this.x/this.y assignment gets overridden by body.postUpdate() every frame.
    if (this.body) {
      this.body.reset(state.x, state.y);
    } else {
      this.x = state.x;
      this.y = state.y;
    }
    this.hp      = state.hp;
    this.stamina = state.stamina;
    this.downed  = state.downed;
    this.sprite.setFlipX(state.facingX < 0);
    if (state.anim && this.sprite.anims.currentAnim?.key !== state.anim) {
      this.sprite.play(state.anim, true);
    }
    this._updateHpBar();
    this.setDepth(state.y);
  }

  applyStat(stat, tier) {
    const mult = 1 + tier * 0.25;
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
}
