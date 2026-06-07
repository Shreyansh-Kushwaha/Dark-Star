import { GAME_W, GAME_H, REGION_NAMES } from '../constants.js';
import { SaveManager } from '../systems/SaveManager.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0012, 0x0a0012, 0x1a0030, 0x1a0030, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Procedural mandala
    this._drawMandala(GAME_W / 2, GAME_H / 2 - 30, 180);

    // Title
    this.add.text(GAME_W / 2, 80, 'AKHAND SUTRA', {
      fontSize: '42px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 128, 'The Unbroken Thread', {
      fontSize: '16px', color: '#cc9933', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 3,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 158, '— A 2-Player Co-op Action RPG —', {
      fontSize: '12px', color: '#886644', fontFamily: 'serif',
    }).setOrigin(0.5);

    // Buttons — centered vertically on screen
    const cx = GAME_W / 2;
    this._makeButton(cx, 280, 'SOLO PLAY', () => this._startGame(false));
    this._makeButton(cx, 340, 'HOST CO-OP', () => this._hostCoop());
    this._makeButton(cx, 400, 'JOIN CO-OP', () => this._joinCoop());

    this._makeButton(cx, 460, 'LOAD REGION', () => this._toggleRegionSelect());
    this._regionSelectPanel = null;
    this._regionSelectOpen = false;

    const hasSave = !!SaveManager.load();
    if (hasSave) {
      this._makeButton(cx, 520, 'CONTINUE', () => this._continueGame(), 0x224422, 0x44ff44);
      this._makeButton(cx + 220, 520, 'NEW GAME', () => { SaveManager.clear(); this._startGame(false); }, 0x442222, 0xff8888);
    }

    // Version
    this.add.text(GAME_W - 8, GAME_H - 8, 'v1.0 | AKHAND SUTRA', {
      fontSize: '10px', color: '#444', fontFamily: 'monospace',
    }).setOrigin(1, 1);

    // Controls guide
    this.add.text(GAME_W / 2, GAME_H - 30, 'WASD/Arrows: Move  J: Light  K: Heavy  Q/E/R: Abilities  Shift: Dodge  F: Interact  Esc: Pause', {
      fontSize: '10px', color: '#555', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    // Co-op room code input area (hidden by default)
    this._roomInput = this.add.text(cx, 620, '', {
      fontSize: '22px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#111',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setAlpha(0);

    this._roomPrompt = this.add.text(cx, 590, '', {
      fontSize: '13px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this._joinCode = '';
    this._joiningMode = false;
    this.input.keyboard.on('keydown', (e) => this._onKey(e));

    // Animate mandala
    this._mandalaAngle = 0;
  }

  _drawMandala(cx, cy, r) {
    const g = this.add.graphics();
    const petals = 12;
    for (let i = 0; i < petals; i++) {
      const angle = (Math.PI * 2 / petals) * i;
      const px = cx + Math.cos(angle) * r * 0.55;
      const py = cy + Math.sin(angle) * r * 0.55;
      g.lineStyle(1.5, 0xffd700, 0.35);
      g.strokeCircle(px, py, r * 0.35);
      g.lineStyle(1, 0xcc9933, 0.25);
      g.strokeCircle(px, py, r * 0.2);
    }
    // Inner rings
    for (let ri = 1; ri <= 4; ri++) {
      g.lineStyle(ri === 4 ? 2 : 1, 0xffd700, 0.15 + ri * 0.05);
      g.strokeCircle(cx, cy, r * ri * 0.25);
    }
    // Spokes
    g.lineStyle(1, 0xffd700, 0.2);
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 / 24) * i;
      g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    // Center dot
    g.fillStyle(0xffd700, 0.6);
    g.fillCircle(cx, cy, 6);
    g.setDepth(1);
  }

  _makeButton(x, y, text, onClick, bgColor = 0x1a1a2e, textColor = 0xffd700) {
    const w = 240, h = 44;
    const bg = this.add.rectangle(x, y, w, h, bgColor, 0.9).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffd700, 0.7);
    const label = this.add.text(x, y, text, {
      fontSize: '16px', color: '#' + textColor.toString(16).padStart(6,'0'),
      fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Zone is the most reliable hit-test target for non-sprite objects in Phaser 3
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone
      .on('pointerover',  () => { bg.setFillStyle(0x2a2a4e); bg.setStrokeStyle(2, 0xffffaa); })
      .on('pointerout',   () => { bg.setFillStyle(bgColor);  bg.setStrokeStyle(2, 0xffd700, 0.7); })
      .on('pointerdown',  onClick);

    return { bg, label };
  }

  _startGame(isCoop, regionIndex = 0) {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('MainMenuScene');
      this.scene.start('GameScene', { regionIndex, coop: isCoop });
    });
  }

  _continueGame() {
    const save = SaveManager.load();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('MainMenuScene');
      this.scene.start('GameScene', { regionIndex: save?.regionIndex || 0 });
    });
  }

  _hostCoop() {
    this._roomPrompt.setText('Starting host... connect to: ws://localhost:8080').setAlpha(1);
    this._roomInput.setText('Hosting...').setAlpha(1);
    // For now, just start solo — co-op requires full NetworkManager
    this.time.delayedCall(1500, () => this._startGame(true));
  }

  _joinCoop() {
    this._joiningMode = true;
    this._joinCode = '';
    this._roomPrompt.setText('Type 4-letter room code:').setAlpha(1);
    this._roomInput.setText('____').setAlpha(1);
  }

  _toggleRegionSelect() {
    if (this._regionSelectOpen) {
      if (this._regionSelectPanel) {
        this._regionSelectPanel.forEach(obj => obj.destroy());
        this._regionSelectPanel = null;
      }
      this._regionSelectOpen = false;
    } else {
      this._regionSelectPanel = this._makeRegionSelect();
      this._regionSelectOpen = true;
    }
  }

  _makeRegionSelect() {
    const cx = GAME_W / 2;
    const panelX = cx + 160;
    const startY = 390;
    const rowH   = 36;
    const objs   = [];

    const panelBg = this.add.rectangle(panelX, startY + (REGION_NAMES.length * rowH) / 2 - rowH / 2, 460, REGION_NAMES.length * rowH + 16, 0x0a0018, 0.95).setOrigin(0.5);
    panelBg.setStrokeStyle(1, 0xffd700, 0.5);
    objs.push(panelBg);

    REGION_NAMES.forEach((name, i) => {
      const y = startY + i * rowH;
      const rowBg = this.add.rectangle(panelX, y, 456, rowH - 2, 0x1a1a2e, 0.85).setOrigin(0.5);
      rowBg.setStrokeStyle(1, 0x444466, 0.4);
      const label = this.add.text(panelX, y, `${i}: ${name}`, {
        fontSize: '13px', color: '#ccaa44', fontFamily: 'serif',
      }).setOrigin(0.5);
      const zone = this.add.zone(panelX, y, 456, rowH - 2).setInteractive({ useHandCursor: true });
      zone
        .on('pointerover',  () => { rowBg.setFillStyle(0x2a2a4e); label.setColor('#ffd700'); })
        .on('pointerout',   () => { rowBg.setFillStyle(0x1a1a2e); label.setColor('#ccaa44'); })
        .on('pointerdown',  () => this._startGame(false, i));
      objs.push(rowBg, label, zone);
    });

    return objs;
  }

  _onKey(e) {
    if (!this._joiningMode) return;
    if (e.key === 'Escape') {
      this._joiningMode = false;
      this._roomInput.setAlpha(0);
      this._roomPrompt.setAlpha(0);
      return;
    }
    if (e.key === 'Enter' && this._joinCode.length === 4) {
      this._joiningMode = false;
      this._roomPrompt.setText('Joining room ' + this._joinCode + '...');
      this.time.delayedCall(1000, () => this._startGame(true));
      return;
    }
    if (e.key === 'Backspace') {
      this._joinCode = this._joinCode.slice(0, -1);
    } else if (e.key.length === 1 && /[A-Za-z]/.test(e.key) && this._joinCode.length < 4) {
      this._joinCode += e.key.toUpperCase();
    }
    this._roomInput.setText(this._joinCode.padEnd(4, '_'));
  }

  update() {
    // Subtle mandala rotation via shader would be nice; for now static
  }
}
