import { WORLD_W, WORLD_H } from '../constants.js';

export class Projectile extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, key, config = {}) {
    super(scene, x, y, key);
    scene.add.existing(this);

    this.damage    = config.damage  || 12;
    this.speed     = config.speed   || 320;
    this.fromEnemy = config.fromEnemy || false;
    this.piercing  = config.piercing  || false;
    this.lifetime  = config.lifetime  || 2500;

    const angle = config.angle || 0;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.setScale(config.scale || 0.6);
    if (config.tint) this.setTint(config.tint);
    this.setDepth(this.y + 10);

    this._born = scene.time.now;
    this._hit  = false;
  }

  update(time, delta) {
    if (this._hit) return;
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.setDepth(this.y);

    // Orient to direction
    this.rotation = Math.atan2(this.vy, this.vx);

    if (time - this._born > this.lifetime) this.destroy();
    if (this.x < 0 || this.x > WORLD_W || this.y < 0 || this.y > WORLD_H) this.destroy();
  }

  hit() {
    if (this._hit) return;
    this._hit = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 120,
      onComplete: () => this.destroy(),
    });
  }
}
