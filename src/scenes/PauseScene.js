import { GAME_W, GAME_H } from '../constants.js';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.65).setOrigin(0, 0);

    this.add.text(GAME_W / 2, GAME_H / 2 - 80, 'PAUSED', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this._menuItems = [
      { label: 'RESUME',    action: () => this._resume()   },
      { label: 'MAIN MENU', action: () => this._mainMenu() },
    ];
    this._selIdx = 0;

    this._buttons = this._menuItems.map((item, i) => {
      return this._makeButton(GAME_W / 2, GAME_H / 2 + i * 60, item.label, item.action, i);
    });

    // Selection cursor (arrow indicator on the left)
    this._cursor = this.add.text(0, 0, '►', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5);
    this._updateCursor();

    this.add.text(GAME_W / 2, GAME_H / 2 + 130,
      '↑↓ Navigate   Enter/Space Confirm   Esc/Home — Resume', {
        fontSize: '12px', color: '#666', fontFamily: 'monospace',
      }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-ESC',   () => this._resume());
    kb.on('keydown-HOME',  () => this._resume());
    kb.on('keydown-UP',    () => this._move(-1));
    kb.on('keydown-DOWN',  () => this._move(1));
    kb.on('keydown-ENTER', () => this._confirm());
    kb.on('keydown-SPACE', () => this._confirm());
  }

  _updateCursor() {
    const btnY = GAME_H / 2 + this._selIdx * 60;
    this._cursor.setPosition(GAME_W / 2 - 130, btnY);
    this._buttons.forEach((b, i) => {
      b.txt.setColor(i === this._selIdx ? '#ffd700' : '#aaaaaa');
      b.bg.setFillStyle(i === this._selIdx ? 0x2a2a4e : 0x1a1a2e);
    });
  }

  _move(dir) {
    this._selIdx = (this._selIdx + dir + this._menuItems.length) % this._menuItems.length;
    this._updateCursor();
  }

  _confirm() {
    this._menuItems[this._selIdx].action();
  }

  _makeButton(x, y, text, onClick, idx) {
    const w = 220, h = 42;
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2e, 0.9).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffd700, 0.7);
    const txt = this.add.text(x, y, text, {
      fontSize: '16px', color: '#aaaaaa', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone
      .on('pointerover', () => { this._selIdx = idx; this._updateCursor(); })
      .on('pointerdown', onClick);
    return { bg, txt, zone };
  }

  _resume() {
    this.scene.get('GameScene')?.togglePause();
  }

  _mainMenu() {
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.stop('PauseScene');
    this.scene.start('MainMenuScene');
  }
}
