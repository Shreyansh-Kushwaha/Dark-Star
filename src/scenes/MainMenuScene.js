import { GAME_W, GAME_H, REGION_NAMES } from '../constants.js';
import { SaveManager } from '../systems/SaveManager.js';
import { QualitySettings } from '../systems/QualitySettings.js';
import { NetworkManager } from '../systems/NetworkManager.js';

const PAL = {
  sky:      0x05050f,
  skyMid:   0x0a0a1e,
  mtnFar:   0x12103a,
  mtnNear:  0x0a1c10,
  ground:   0x061208,
  titleShadow: 0x2222cc,
  btnBg:    0x0c0c28,
  btnHover: 0x18185a,
  btnBorder: 0x4444dd,
  btnBorderHover: 0xffdd00,
  text:     0xffffff,
  dim:      0x556677,
  accent:   0xffdd00,
};

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    this._drawSky();
    this._drawStars();
    this._drawMountains();
    this._drawScanlines();
    this._drawTitle();
    this._drawButtons();
    this._drawHud();

    this._joinCode = '';
    this._joiningMode = false;
    this.input.keyboard.on('keydown', (e) => this._onKey(e));
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _drawSky() {
    const g = this.add.graphics().setDepth(-20);
    const rows = 16;
    const rowH = Math.ceil(GAME_H / rows);
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      // Interpolate from very dark (#05050f) to slightly less dark (#111128)
      const r  = Math.round(Phaser.Math.Linear(0x05, 0x11, t));
      const gb = Math.round(Phaser.Math.Linear(0x05, 0x10, t));
      const b  = Math.round(Phaser.Math.Linear(0x0f, 0x28, t));
      g.fillStyle((r << 16) | (gb << 8) | b, 1);
      g.fillRect(0, i * rowH, GAME_W, rowH + 1);
    }
  }

  _drawStars() {
    const g = this.add.graphics().setDepth(-18);
    const cols = [0xffffff, 0xddddff, 0xffffcc, 0xaaaaff, 0xffddff];
    for (let i = 0; i < 180; i++) {
      const x    = Math.floor(Math.random() * GAME_W);
      const y    = Math.floor(Math.random() * 560);
      const size = Math.random() < 0.12 ? 2 : 1;
      const c    = cols[Math.floor(Math.random() * cols.length)];
      const a    = 0.4 + Math.random() * 0.6;
      g.fillStyle(c, a);
      g.fillRect(x, y, size, size);
    }

    // A handful of twinklers
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(Math.random() * GAME_W);
      const y = Math.floor(Math.random() * 480);
      const r = this.add.rectangle(x, y, 2, 2, 0xffffff, 0.9).setDepth(-17);
      this.tweens.add({
        targets: r, alpha: 0.1,
        duration: 600 + Math.random() * 1200,
        yoyo: true, repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _drawMountains() {
    const g = this.add.graphics().setDepth(-15);

    // Far peaks (blocky pixel style — staircase edges)
    g.fillStyle(0x12103a, 1);
    const far = this._pixelPeak([
      [0,620],[60,580],[100,590],[160,545],[220,570],[300,520],[380,555],
      [460,505],[560,545],[660,498],[760,538],[860,498],[960,540],[1060,498],
      [1160,535],[1240,505],[1280,560],[1280,720],[0,720],
    ]);
    g.fillPoints(far, true);

    // Mid layer
    g.fillStyle(0x0c1e14, 1);
    const mid = this._pixelPeak([
      [0,648],[80,625],[140,638],[200,618],[280,632],[360,612],[460,628],
      [560,608],[660,625],[760,606],[860,622],[960,605],[1060,620],
      [1160,607],[1240,618],[1280,632],[1280,720],[0,720],
    ]);
    g.fillPoints(mid, true);

    // Ground strip
    g.fillStyle(0x061208, 1);
    g.fillRect(0, 690, GAME_W, 30);

    // Pixel grass dots along horizon
    g.fillStyle(0x1a4a1a, 1);
    for (let x = 0; x < GAME_W; x += 4) {
      const h = 2 + Math.floor(Math.random() * 4);
      g.fillRect(x, 690, 2, h);
    }
  }

  // Convert polygon points into axis-aligned "pixel staircase" steps
  _pixelPeak(pts) {
    const step = 8;
    const out  = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      out.push({ x: x0, y: y0 });
      const steps = Math.max(1, Math.round(Math.abs(x1 - x0) / step));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const sx = Math.round(x0 + (x1 - x0) * t);
        const sy = Math.round(y0 + (y1 - y0) * t);
        out.push({ x: sx - (step / 2), y: sy });
        out.push({ x: sx,              y: sy });
      }
    }
    out.push({ x: pts[pts.length-1][0], y: pts[pts.length-1][1] });
    return out;
  }

  _drawScanlines() {
    const g = this.add.graphics().setDepth(100);
    g.lineStyle(1, 0x000000, 0.07);
    for (let y = 0; y < GAME_H; y += 2) {
      g.lineBetween(0, y, GAME_W, y);
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────────

  _drawTitle() {
    const cx = GAME_W / 2;

    // Shadow layer
    this.add.text(cx + 4, 74, 'AKHAND SUTRA', {
      fontSize: '46px', fontFamily: 'monospace', color: '#110066',
    }).setOrigin(0.5).setDepth(2);

    // Main title
    this.add.text(cx, 70, 'AKHAND SUTRA', {
      fontSize: '46px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(3);

    // Subtitle
    this.add.text(cx, 124, '~  THE UNBROKEN THREAD  ~', {
      fontSize: '13px', fontFamily: 'monospace', color: '#8899ff',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, 148, 'A 2-PLAYER CO-OP ACTION RPG', {
      fontSize: '10px', fontFamily: 'monospace', color: '#445588',
    }).setOrigin(0.5).setDepth(3);

    // Pixel divider
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x3344bb, 1);
    g.fillRect(cx - 220, 165, 440, 2);
    g.fillStyle(0x2233aa, 0.4);
    g.fillRect(cx - 180, 169, 360, 1);
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  _drawButtons() {
    const cx = GAME_W / 2;

    this._makeButton(cx, 240, '>  PLAY SOLO',   () => this._startGame(false));
    this._makeButton(cx, 300, '>  HOST CO-OP',  () => this._hostCoop());
    this._makeButton(cx, 360, '>  JOIN CO-OP',  () => this._joinCoop());
    this._makeButton(cx, 420, '>  LOAD REGION', () => this._toggleRegionSelect());

    this._qualityBtn = this._makeButton(cx, 480, this._qualityLabel(), () => this._cycleQuality(),
      { bg: 0x0c1428, border: 0x2244aa, text: '#88aaff', w: 200 });

    this._fsBtn = this._makeButton(cx, 535, this._fsLabel(), () => this._toggleFullscreen(),
      { bg: 0x0c1428, border: 0x334466, text: '#7799bb', w: 200 });

    this._regionSelectPanel = null;
    this._regionSelectOpen  = false;

    const hasSave = !!SaveManager.load();
    if (hasSave) {
      this._makeButton(cx - 95, 490, 'CONTINUE', () => this._continueGame(),
        { bg: 0x0a1e0a, border: 0x33cc66, text: '#44ff88', w: 170 });
      this._makeButton(cx + 95, 490, 'NEW GAME',
        () => { SaveManager.clear(); this._startGame(false); },
        { bg: 0x1e0a0a, border: 0xcc3333, text: '#ff6666', w: 170 });
    }

    // Room input (hidden until needed)
    this._roomInput = this.add.text(cx, 600, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffdd00',
      backgroundColor: '#0a0a22',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this._roomPrompt = this.add.text(cx, 572, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#8899ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
  }

  _makeButton(x, y, label, onClick, opts = {}) {
    const w      = opts.w      ?? 280;
    const h      = 42;
    const bgCol  = opts.bg     ?? 0x0c0c28;
    const borCol = opts.border ?? 0x4444dd;
    const txCol  = opts.text   ?? '#ffffff';

    // Pixel border: draw as filled rect then smaller inner rect on top
    const border = this.add.graphics().setDepth(4);
    const fill   = this.add.graphics().setDepth(4);
    const txt    = this.add.text(x, y, label, {
      fontSize: '15px', fontFamily: 'monospace', color: txCol,
    }).setOrigin(0.5).setDepth(5);

    const draw = (bg, bor) => {
      border.clear();
      fill.clear();
      border.fillStyle(bor, 1);
      border.fillRect(x - w / 2, y - h / 2, w, h);
      fill.fillStyle(bg, 1);
      fill.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6);
    };
    draw(bgCol, borCol);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(6);
    zone
      .on('pointerover',  () => { draw(0x18185a, 0xffdd00); txt.setColor('#ffdd00'); })
      .on('pointerout',   () => { draw(bgCol, borCol);       txt.setColor(txCol);    })
      .on('pointerdown',  onClick);

    return { border, fill, txt, zone };
  }

  // ── HUD / footer ──────────────────────────────────────────────────────────

  _drawHud() {
    const g = this.add.graphics().setDepth(3);
    // Bottom bar
    g.fillStyle(0x000000, 0.6);
    g.fillRect(0, GAME_H - 24, GAME_W, 24);
    g.lineStyle(1, 0x2233aa, 0.6);
    g.lineBetween(0, GAME_H - 24, GAME_W, GAME_H - 24);

    this.add.text(GAME_W / 2, GAME_H - 12,
      'MOVE:WASD  LIGHT:J  HEAVY:K  SKILLS:Q/E/R  DODGE:SHIFT  TALK:F  PAUSE:ESC', {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5).setDepth(4);

    this.add.text(8, GAME_H - 12, 'v1.0', {
      fontSize: '9px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(0, 0.5).setDepth(4);
  }

  // ── Region select panel ───────────────────────────────────────────────────

  _toggleRegionSelect() {
    if (this._regionSelectOpen) {
      if (this._regionSelectPanel) {
        this._regionSelectPanel.forEach(o => o.destroy());
        this._regionSelectPanel = null;
      }
      this._regionSelectOpen = false;
    } else {
      this._regionSelectPanel = this._makeRegionSelect();
      this._regionSelectOpen  = true;
    }
  }

  _makeRegionSelect() {
    const cx     = GAME_W / 2 + 170;
    const startY = 230;
    const rowH   = 36;
    const panelW = 440;
    const objs   = [];

    // Panel background
    const totalH = REGION_NAMES.length * rowH + 12;
    const panelBg = this.add.graphics().setDepth(8);
    panelBg.fillStyle(0x05050f, 0.97);
    panelBg.fillRect(cx - panelW / 2, startY - 6, panelW, totalH);
    panelBg.lineStyle(3, 0x4444dd, 1);
    panelBg.strokeRect(cx - panelW / 2, startY - 6, panelW, totalH);
    objs.push(panelBg);

    const hdr = this.add.text(cx, startY + 4, 'SELECT REGION', {
      fontSize: '11px', fontFamily: 'monospace', color: '#8899ff',
    }).setOrigin(0.5, 0).setDepth(9);
    objs.push(hdr);

    REGION_NAMES.forEach((name, i) => {
      const y     = startY + 22 + i * rowH;
      const rowG  = this.add.graphics().setDepth(8);
      const drawRow = (hover) => {
        rowG.clear();
        rowG.fillStyle(hover ? 0x1a1a55 : 0x0c0c28, 1);
        rowG.fillRect(cx - panelW / 2 + 4, y - rowH / 2 + 2, panelW - 8, rowH - 4);
      };
      drawRow(false);

      const lbl = this.add.text(cx, y, `${i}  ${name}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc',
      }).setOrigin(0.5).setDepth(9);

      const zone = this.add.zone(cx, y, panelW - 8, rowH - 4)
        .setInteractive({ useHandCursor: true }).setDepth(10);
      zone
        .on('pointerover',  () => { drawRow(true);  lbl.setColor('#ffdd00'); })
        .on('pointerout',   () => { drawRow(false); lbl.setColor('#aabbcc'); })
        .on('pointerdown',  () => this._startGame(false, i));

      objs.push(rowG, lbl, zone);
    });

    return objs;
  }

  // ── Game start / co-op ────────────────────────────────────────────────────

  _startGame(isCoop, regionIndex = 0) {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('MainMenuScene');
      // Show prologue only on fresh new games (region 0, no existing save)
      const hasSave = !!SaveManager.load();
      if (!hasSave && regionIndex === 0) {
        this.scene.start('PrologueScene', { regionIndex, coop: isCoop });
      } else {
        this.scene.start('GameScene', { regionIndex, coop: isCoop });
      }
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

  async _hostCoop() {
    this._roomPrompt.setText('CONNECTING...').setAlpha(1);
    this._roomInput.setText('....').setAlpha(1);
    try {
      const net = new NetworkManager();
      await net.connect();
      net.createRoom();
      net.on('ROOM_READY', ({ code }) => {
        this._roomInput.setText(code);
        this._roomPrompt.setText('WAITING FOR PARTNER...');
      });
      net.on('CLIENT_JOINED', () => {
        this._roomPrompt.setText('PARTNER JOINED!  STARTING...');
        this.registry.set('network', net);
        this.time.delayedCall(800, () => this._startGame(true));
      });
    } catch (err) {
      this._roomPrompt.setText('CONNECTION FAILED');
      this._roomInput.setAlpha(0);
    }
  }

  _joinCoop() {
    this._joiningMode = true;
    this._joinCode    = '';
    this._roomPrompt.setText('ENTER 4-LETTER ROOM CODE:').setAlpha(1);
    this._roomInput.setText('____').setAlpha(1);
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
      const code = this._joinCode;
      this._roomPrompt.setText('JOINING ' + code + '...');
      (async () => {
        try {
          const net = new NetworkManager();
          await net.connect();
          net.joinRoom(code);
          net.on('ROOM_READY', () => {
            this._roomPrompt.setText('CONNECTED!  STARTING...');
            this.registry.set('network', net);
            this.time.delayedCall(800, () => this._startGame(true));
          });
          net.on('ROOM_ERROR', ({ reason }) => {
            this._roomPrompt.setText('ERROR: ' + reason);
            this._roomInput.setText('____');
            this._joiningMode = true;
            this._joinCode = '';
          });
        } catch (err) {
          this._roomPrompt.setText('CONNECTION FAILED');
          this._joiningMode = true;
          this._joinCode = '';
        }
      })();
      return;
    }
    if (e.key === 'Backspace') {
      this._joinCode = this._joinCode.slice(0, -1);
    } else if (e.key.length === 1 && /[A-Za-z]/.test(e.key) && this._joinCode.length < 4) {
      this._joinCode += e.key.toUpperCase();
    }
    this._roomInput.setText(this._joinCode.padEnd(4, '_'));
  }

  _qualityLabel() {
    return `>  QUALITY: ${QualitySettings.level.toUpperCase()}`;
  }

  _cycleQuality() {
    QualitySettings.cycle();
    this._qualityBtn.txt.setText(this._qualityLabel());
  }

  _fsLabel() {
    return this.scale?.isFullscreen ? '>  FULLSCREEN: ON' : '>  FULLSCREEN: OFF';
  }

  _toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
    // Update label after a tick (isFullscreen updates asynchronously)
    this.time.delayedCall(100, () => {
      this._fsBtn.txt.setText(this._fsLabel());
    });
  }

  update() {}
}
