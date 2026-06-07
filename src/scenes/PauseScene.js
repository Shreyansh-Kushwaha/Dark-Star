import { GAME_W, GAME_H } from '../constants.js';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    // Dim overlay
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.65).setOrigin(0, 0);

    this.add.text(GAME_W / 2, GAME_H / 2 - 80, 'PAUSED', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this._makeButton(GAME_W / 2, GAME_H / 2, 'RESUME', () => this._resume());
    this._makeButton(GAME_W / 2, GAME_H / 2 + 60, 'MAIN MENU', () => this._mainMenu());

    this.add.text(GAME_W / 2, GAME_H / 2 + 130, 'M — Toggle Mute   Esc — Resume', {
      fontSize: '12px', color: '#666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => this._resume());
  }

  _makeButton(x, y, text, onClick) {
    const w = 220, h = 42;
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2e, 0.9).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffd700, 0.7);
    this.add.text(x, y, text, {
      fontSize: '16px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone
      .on('pointerover', () => bg.setFillStyle(0x2a2a4e))
      .on('pointerout',  () => bg.setFillStyle(0x1a1a2e))
      .on('pointerdown', onClick);
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
