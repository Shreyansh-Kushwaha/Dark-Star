// On-screen virtual joystick + attack/dodge buttons for touch devices.
// Owns plain {isDown}/{isDown,_justDown} state objects that GameScene ORs
// into the real keyboard Key objects each frame — Player.js itself never
// needs to know touch controls exist.
import { QualitySettings } from './QualitySettings.js';

const JOY_RADIUS = 55;
const JOY_DEAD = 12;
const BTN_RADIUS = 38;

export class TouchControls {
  static isSupported() {
    return QualitySettings._isTouchDevice();
  }

  constructor(scene) {
    this.scene = scene;

    this.cursors = {
      left: { isDown: false }, right: { isDown: false },
      up: { isDown: false }, down: { isDown: false },
    };
    this.keys = {
      J: { isDown: false },
      K: { isDown: false },
      SHIFT: { isDown: false, _justDown: false },
    };

    this._joyPointerId = null;
    this._joyOrigin = { x: 0, y: 0 };

    this._onPointerMove = (p) => this._joyMove(p);
    this._onPointerUp = (p) => this._joyEnd(p);

    this._buildUI();
  }

  _buildUI() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const w = cam.width, h = cam.height;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);

    const joyX = 110, joyY = h - 110;
    this._joyOrigin = { x: joyX, y: joyY };
    this._joyBase = scene.add.circle(joyX, joyY, JOY_RADIUS, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35).setScrollFactor(0);
    this._joyThumb = scene.add.circle(joyX, joyY, JOY_RADIUS * 0.5, 0xffffff, 0.28)
      .setScrollFactor(0);
    this.container.add([this._joyBase, this._joyThumb]);

    // Hit zone is larger than the visible base so a touch that starts a little
    // outside it still grabs the stick — easier to hit without looking down.
    const joyZone = scene.add.zone(joyX, joyY, JOY_RADIUS * 3.2, JOY_RADIUS * 3.2)
      .setScrollFactor(0).setInteractive();
    joyZone.on('pointerdown', (p) => this._joyStart(p));
    this.container.add(joyZone);

    const heavyBtn = this._makeButton(w - 70, h - 150, BTN_RADIUS, 0xff5a5a, 'K');
    const lightBtn = this._makeButton(w - 150, h - 90, BTN_RADIUS, 0xffcf5a, 'J');
    const dodgeBtn = this._makeButton(w - 70, h - 70, BTN_RADIUS * 0.8, 0x5ad1ff, 'DODGE');

    heavyBtn.on('pointerdown', () => { this.keys.K.isDown = true; });
    heavyBtn.on('pointerup',   () => { this.keys.K.isDown = false; });
    heavyBtn.on('pointerout',  () => { this.keys.K.isDown = false; });

    lightBtn.on('pointerdown', () => { this.keys.J.isDown = true; });
    lightBtn.on('pointerup',   () => { this.keys.J.isDown = false; });
    lightBtn.on('pointerout',  () => { this.keys.J.isDown = false; });

    dodgeBtn.on('pointerdown', () => { this.keys.SHIFT.isDown = true; this.keys.SHIFT._justDown = true; });
    dodgeBtn.on('pointerup',   () => { this.keys.SHIFT.isDown = false; });
    dodgeBtn.on('pointerout',  () => { this.keys.SHIFT.isDown = false; });

    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup', this._onPointerUp);
    scene.input.on('pointerupoutside', this._onPointerUp);

    scene.events.once('shutdown', () => this.destroy());
  }

  _makeButton(x, y, radius, color, label) {
    const scene = this.scene;
    const circle = scene.add.circle(x, y, radius, color, 0.32)
      .setStrokeStyle(2, color, 0.7).setScrollFactor(0).setInteractive();
    const text = scene.add.text(x, y, label, {
      fontFamily: 'Silkscreen', fontSize: label.length > 1 ? '11px' : '16px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0);
    this.container.add([circle, text]);
    return circle;
  }

  _joyStart(pointer) {
    if (this._joyPointerId !== null) return;
    this._joyPointerId = pointer.id;
    this._updateJoyFromPointer(pointer);
  }

  _joyMove(pointer) {
    if (pointer.id !== this._joyPointerId) return;
    this._updateJoyFromPointer(pointer);
  }

  _joyEnd(pointer) {
    if (pointer.id !== this._joyPointerId) return;
    this._joyPointerId = null;
    this._joyThumb.setPosition(this._joyOrigin.x, this._joyOrigin.y);
    this.cursors.left.isDown = this.cursors.right.isDown = false;
    this.cursors.up.isDown = this.cursors.down.isDown = false;
  }

  _updateJoyFromPointer(pointer) {
    const ox = this._joyOrigin.x, oy = this._joyOrigin.y;
    const dx = pointer.x - ox, dy = pointer.y - oy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOY_RADIUS);
    const angle = Math.atan2(dy, dx);
    this._joyThumb.setPosition(ox + Math.cos(angle) * clamped, oy + Math.sin(angle) * clamped);

    if (dist < JOY_DEAD) {
      this.cursors.left.isDown = this.cursors.right.isDown = false;
      this.cursors.up.isDown = this.cursors.down.isDown = false;
      return;
    }
    this.cursors.left.isDown  = dx < -JOY_DEAD;
    this.cursors.right.isDown = dx >  JOY_DEAD;
    this.cursors.up.isDown    = dy < -JOY_DEAD;
    this.cursors.down.isDown  = dy >  JOY_DEAD;
  }

  destroy() {
    this.scene.input.off('pointermove', this._onPointerMove);
    this.scene.input.off('pointerup', this._onPointerUp);
    this.scene.input.off('pointerupoutside', this._onPointerUp);
    this.container?.destroy();
  }
}
