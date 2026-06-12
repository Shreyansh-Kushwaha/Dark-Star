import { GAME_W, GAME_H } from '../constants.js';

// The Thread Shrine rest menu (bonfire). Overlay launched by GameScene.openShrine().
// Actions delegate back to GameScene so all game state lives in one place.
export class ShrineScene extends Phaser.Scene {
  constructor() { super('ShrineScene'); }

  init(data) {
    this._regionIndex  = data?.regionIndex ?? 0;
    this._regionName   = data?.regionName  || `Region ${this._regionIndex}`;
    this._pending      = data?.pendingLevels || 0;
  }

  create() {
    this._gs = this.scene.get('GameScene');
    if (this._gs?.input) {
      this._gs.input.enabled = false;
      if (this._gs.input.keyboard) this._gs.input.keyboard.enabled = false;
    }

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05060a, 0.82).setOrigin(0).setInteractive();

    // Warm glow behind the title
    const glow = this.add.circle(GAME_W / 2, 150, 120, 0xe8c860, 0.12);
    this.tweens.add({ targets: glow, alpha: 0.22, scale: 1.15, duration: 1200, yoyo: true, repeat: -1 });

    this.add.text(GAME_W / 2, 110, '✦  THREAD SHRINE  ✦', {
      fontSize: '30px', fontFamily: 'serif', fontStyle: 'bold', color: '#ffe9a0',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 150, this._regionName, {
      fontSize: '15px', fontFamily: 'serif', fontStyle: 'italic', color: '#bda35e',
    }).setOrigin(0.5);

    this._items = [
      { label: 'Rest — Recover & Save', desc: 'Heal, refill Amrit, and set your return point here.', action: () => this._rest() },
      { label: `Attune the Thread — Level Up${this._pending ? `  (${this._pending})` : ''}`,
        desc: this._pending ? 'Spend banked attunement to strengthen the party.' : 'No attunement banked. Slay foes to earn it.',
        enabled: this._pending > 0, action: () => this._attune() },
      { label: 'Travel the Thread — Fast Travel', desc: 'Journey to any region you have already explored.', action: () => this._travel() },
      { label: 'Leave', desc: 'Rise and continue your journey.', action: () => this._leave() },
    ];
    this._sel = 0;
    this._rows = [];
    const startY = 220, rowH = 66;
    this._items.forEach((it, i) => {
      const y = startY + i * rowH;
      const bg = this.add.rectangle(GAME_W / 2, y, 520, 56, 0x13161f, 0.95)
        .setStrokeStyle(2, 0x4a4530).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(GAME_W / 2, y - 9, it.label, {
        fontSize: '18px', fontFamily: 'serif', fontStyle: 'bold',
        color: it.enabled === false ? '#6a6450' : '#ffffff',
      }).setOrigin(0.5);
      const desc = this.add.text(GAME_W / 2, y + 14, it.desc, {
        fontSize: '11px', fontFamily: 'monospace', color: '#8a8568',
      }).setOrigin(0.5);
      bg.on('pointerover', () => { this._sel = i; this._refresh(); });
      bg.on('pointerup',   () => this._choose(i));
      this._rows.push({ bg, lbl, desc, it });
    });

    this.add.text(GAME_W / 2, GAME_H - 40, '↑ ↓  Navigate     Enter  Select     Backspace  Map     Esc  Leave', {
      fontSize: '12px', fontFamily: 'monospace', color: '#5a6276',
    }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-UP',    () => { this._sel = (this._sel + this._items.length - 1) % this._items.length; this._refresh(); });
    kb.on('keydown-DOWN',  () => { this._sel = (this._sel + 1) % this._items.length; this._refresh(); });
    kb.on('keydown-ENTER', () => this._choose(this._sel));
    kb.on('keydown-SPACE', () => this._choose(this._sel));
    kb.on('keydown-ESC',   () => this._leave());
    kb.on('keydown-F',     () => this._leave());
    kb.on('keydown-BACKSPACE', () => this._travel());
    this._refresh();
  }

  _refresh() {
    this._rows.forEach((r, i) => {
      const on = i === this._sel;
      r.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd700 : 0x4a4530);
      r.bg.setFillStyle(on ? 0x20242f : 0x13161f, 0.95);
    });
  }

  _choose(i) {
    const it = this._items[i];
    if (!it || it.enabled === false) return;
    it.action();
  }

  _restoreInput() {
    if (this._gs?.input) {
      this._gs.input.enabled = true;
      if (this._gs.input.keyboard) this._gs.input.keyboard.enabled = true;
    }
  }

  _rest()   { this._restoreInput(); this._gs?.closeShrine(); this._gs?.restAtShrine(); this.scene.stop(); }
  _leave()  { this._restoreInput(); this._gs?.closeShrine(); this.scene.stop(); }
  _attune() { this._restoreInput(); this._gs?.closeShrine(); this.scene.stop(); this._gs?.attuneAtShrine(); }
  _travel() {
    this._restoreInput();
    this._gs?.closeShrine();
    this.scene.stop();
    this._gs?.openWorldMap({ fastTravel: true });
  }
}
