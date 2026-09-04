// On-screen virtual joystick + attack/dodge buttons for touch devices.
// Owns plain {isDown}/{isDown,_justDown} state objects that GameScene merges
// with the real keyboard Keys into per-frame view objects — Player.js itself
// never needs to know touch controls exist.
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
      Q: { isDown: false, _justDown: false },
      E: { isDown: false, _justDown: false },
      R: { isDown: false, _justDown: false },
      F: { isDown: false, _justDown: false },
      H: { isDown: false, _justDown: false },
    };

    this._joyPointerId = null;
    this._joyOrigin = { x: 0, y: 0 };
    this._holdOwner = {}; // keyName -> pointer id currently holding that button

    this._onPointerMove = (p) => this._joyMove(p);
    this._onPointerUp = (p) => this._joyEnd(p);
    this._onSceneUpdate = () => this._releaseLostPointers();

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
    this._bindHold(heavyBtn, 'K');
    this._bindHold(lightBtn, 'J');
    this._bindTap(dodgeBtn, 'SHIFT');

    // Ability row (Q/E/R), smaller, above the attack cluster.
    const abilRadius = BTN_RADIUS * 0.72;
    const qBtn = this._makeButton(w - 230, h - 230, abilRadius, 0x9a5aff, 'Q');
    const eBtn = this._makeButton(w - 150, h - 230, abilRadius, 0x9a5aff, 'E');
    const rBtn = this._makeButton(w - 70,  h - 230, abilRadius, 0x9a5aff, 'R');
    this._bindTap(qBtn, 'Q');
    this._bindTap(eBtn, 'E');
    this._bindTap(rBtn, 'R');

    // Interact (hold-to-revive, tap-to-interact) + Amrit heal, centered above the joystick.
    const interactBtn = this._makeButton(w / 2, h - 70, abilRadius, 0x8aff8a, 'F');
    const amritBtn    = this._makeButton(w / 2, h - 150, abilRadius, 0x5affc8, 'H');
    this._bindHold(interactBtn, 'F', /* alsoJustDown */ true);
    this._bindTap(amritBtn, 'H');

    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup', this._onPointerUp);
    scene.input.on('pointerupoutside', this._onPointerUp);
    scene.events.on('update', this._onSceneUpdate);

    scene.events.once('shutdown', () => this.destroy());
  }

  // A touch that ends in touchcancel (notification shade, browser edge
  // gesture, palm swipe) marks its Pointer up but never reaches our
  // pointerup handlers, which would leave the stick or a held button latched
  // on. Verify every pointer we've claimed is still really down each frame.
  _releaseLostPointers() {
    const pointers = this.scene.input.manager.pointers;
    if (this._joyPointerId !== null) {
      const p = pointers.find((pt) => pt.id === this._joyPointerId);
      if (!p || !p.isDown) this._joyEnd(p || { id: this._joyPointerId });
    }
    for (const keyName in this._holdOwner) {
      const id = this._holdOwner[keyName];
      if (id === null) continue;
      const p = pointers.find((pt) => pt.id === id);
      if (!p || !p.isDown) {
        this.keys[keyName].isDown = false;
        this._holdOwner[keyName] = null;
      }
    }
  }

  // isDown only for as long as held (attack buttons, and F which is also
  // polled via .isDown for the co-op revival hold). Tracks the holding
  // pointer so another finger passing over the button can't release it, and
  // so _releaseLostPointers can clean up after a cancelled touch.
  _bindHold(btn, keyName, alsoJustDown = false) {
    const key = this.keys[keyName];
    this._holdOwner[keyName] = null;
    btn.on('pointerdown', (p) => {
      key.isDown = true;
      this._holdOwner[keyName] = p.id;
      if (alsoJustDown) key._justDown = true;
    });
    const release = (p) => {
      if (this._holdOwner[keyName] !== null && p.id !== this._holdOwner[keyName]) return;
      key.isDown = false;
      this._holdOwner[keyName] = null;
    };
    btn.on('pointerup',  release);
    btn.on('pointerout', release);
  }

  // Single JustDown() pulse per press (dodge, abilities, item use).
  _bindTap(btn, keyName) {
    const key = this.keys[keyName];
    btn.on('pointerdown', () => { key.isDown = true; key._justDown = true; });
    btn.on('pointerup',   () => { key.isDown = false; });
    btn.on('pointerout',  () => { key.isDown = false; });
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
    this.scene.events.off('update', this._onSceneUpdate);
    this.container?.destroy();
  }
}
