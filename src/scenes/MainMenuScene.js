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
    this._selIdx = 0;
    this.input.keyboard.on('keydown', (e) => this._onKey(e));

    this._menuCursor = this.add.text(0, 0, '►', {
      fontSize: '15px', color: '#ffdd00', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setDepth(20);
    this._updateMenuCursor();
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

    // Main nav buttons — tracked for keyboard arrow selection
    this._navButtons = [];
    const addNav = (x, y, label, action, opts) => {
      const btn = this._makeButton(x, y, label, action, opts);
      this._navButtons.push({ btn, x, y, action });
      return btn;
    };

    addNav(cx, 240, '>  PLAY SOLO',   () => this._startGame(false));
    addNav(cx, 300, '>  HOST CO-OP',  () => this._hostCoop());
    addNav(cx, 360, '>  JOIN CO-OP',  () => this._joinCoop());
    addNav(cx, 420, '>  LOAD REGION', () => this._toggleRegionSelect());

    this._qualityBtn = addNav(cx, 480, this._qualityLabel(), () => this._cycleQuality(),
      { bg: 0x0c1428, border: 0x2244aa, text: '#88aaff', w: 200 });

    this._fsBtn = addNav(cx, 535, this._fsLabel(), () => this._toggleFullscreen(),
      { bg: 0x0c1428, border: 0x334466, text: '#7799bb', w: 200 });

    this._regionSelectPanel  = null;
    this._regionSelectOpen   = false;
    this._regionSelectRows   = [];   // [{ drawRow, index }] for keyboard nav
    this._regionCursor       = 0;

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

  _updateMenuCursor() {
    if (!this._navButtons?.length || !this._menuCursor) return;
    const entry = this._navButtons[this._selIdx];
    if (!entry) return;
    this._menuCursor.setPosition(entry.x - 148, entry.y);
    this._navButtons.forEach((e, i) => {
      if (e.btn?.txt) e.btn.txt.setColor(i === this._selIdx ? '#ffdd00' : '#ffffff');
    });
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

  async _toggleRegionSelect() {
    if (this._regionSelectOpen) {
      if (this._regionSelectPanel) {
        this._regionSelectPanel.forEach(o => o.destroy());
        this._regionSelectPanel = null;
      }
      this._regionSelectOpen = false;
    } else {
      this._regionSelectOpen = true;
      // Fetch the live region list from the server so editor-saved regions appear
      let entries = [];
      try {
        const res = await fetch('/api/regions');
        const list = await res.json();
        // Sort by regionIndex ascending; fall back to filename order
        list.sort((a, b) => (a.regionIndex ?? 999) - (b.regionIndex ?? 999));
        entries = list.map(r => ({
          index: r.regionIndex,
          name: REGION_NAMES[r.regionIndex] ?? `Region ${r.regionIndex}`,
        }));
      } catch (_) {
        // Offline fallback: show hardcoded list
        entries = REGION_NAMES.map((name, i) => ({ index: i, name }));
      }
      if (!this._regionSelectOpen) return; // closed while fetching
      this._regionCursor = 0;
      this._regionSelectPanel = this._makeRegionSelect(entries);
      this._highlightRegionRow(0);
    }
  }

  _highlightRegionRow(cursor) {
    this._regionSelectRows.forEach(({ setHighlight }, i) => setHighlight(i === cursor));
  }

  _makeRegionSelect(entries) {
    const cx     = GAME_W / 2 + 170;
    const startY = 230;
    const rowH   = 36;
    const panelW = 440;
    const objs   = [];

    // Panel background
    const totalH = entries.length * rowH + 12;
    const panelBg = this.add.graphics().setDepth(8);
    panelBg.fillStyle(0x05050f, 0.97);
    panelBg.fillRect(cx - panelW / 2, startY - 6, panelW, totalH);
    panelBg.lineStyle(3, 0x4444dd, 1);
    panelBg.strokeRect(cx - panelW / 2, startY - 6, panelW, totalH);
    objs.push(panelBg);

    const hdr = this.add.text(cx, startY + 4, 'SELECT REGION  [↑↓ navigate  Enter=select  Esc=close]', {
      fontSize: '10px', fontFamily: 'monospace', color: '#8899ff',
    }).setOrigin(0.5, 0).setDepth(9);
    objs.push(hdr);

    this._regionSelectRows = [];

    entries.forEach(({ index, name }, row) => {
      const y    = startY + 22 + row * rowH;
      const rowG = this.add.graphics().setDepth(8);
      const lbl  = this.add.text(cx, y, `${index}  ${name}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc',
      }).setOrigin(0.5).setDepth(9);

      const setHighlight = (on) => {
        rowG.clear();
        rowG.fillStyle(on ? 0x1a1a55 : 0x0c0c28, 1);
        rowG.fillRect(cx - panelW / 2 + 4, y - rowH / 2 + 2, panelW - 8, rowH - 4);
        lbl.setColor(on ? '#ffdd00' : '#aabbcc');
      };
      setHighlight(false);

      this._regionSelectRows.push({ setHighlight, index });

      const zone = this.add.zone(cx, y, panelW - 8, rowH - 4)
        .setInteractive({ useHandCursor: true }).setDepth(10);
      zone
        .on('pointerover',  () => { this._regionCursor = row; this._highlightRegionRow(row); })
        .on('pointerout',   () => {})
        .on('pointerdown',  () => this._startGame(false, index));

      objs.push(rowG, lbl, zone);
    });

    return objs;
  }

  // ── Game start / co-op ────────────────────────────────────────────────────

  _startGame(isCoop, regionIndex = 0, charData = {}) {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('MainMenuScene');
      // Show prologue only on fresh solo new games (co-op skips to keep both players in sync)
      const hasSave = !!SaveManager.load();
      if (!hasSave && regionIndex === 0 && !isCoop) {
        this.scene.start('PrologueScene', { regionIndex, coop: isCoop, ...charData });
      } else {
        this.scene.start('GameScene', { regionIndex, coop: isCoop, ...charData });
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
    this._cancelCoopScreen();
    this._roomPrompt.setText('CONNECTING...  [Backspace=cancel]').setAlpha(1);
    this._roomInput.setText('....').setAlpha(1);
    try {
      const net = new NetworkManager();
      this._hostNet = net;
      await net.connect();
      net.createRoom();
      net.on('ROOM_READY', ({ code }) => {
        this._roomInput.setText(code);
        this._roomPrompt.setText('WAITING FOR PARTNER...');
      });
      net.on('CLIENT_JOINED', () => {
        this._showCharSelect(net, true);
      });
    } catch (err) {
      this._roomPrompt.setText('CONNECTION FAILED');
      this._roomInput.setAlpha(0);
    }
  }

  _joinCoop() {
    this._joiningMode = true;
    this._joinCode    = '';
    this._roomPrompt.setText('ENTER 4-LETTER ROOM CODE:  [Backspace=cancel]').setAlpha(1);
    this._roomInput.setText('____').setAlpha(1);
  }

  _cancelCoopScreen() {
    this._joiningMode = false;
    this._joinCode    = '';
    this._roomInput.setAlpha(0);
    this._roomPrompt.setAlpha(0);
    if (this._hostNet) {
      try { this._hostNet.close?.(); } catch {}
      this._hostNet = null;
    }
  }

  _onKey(e) {
    // Region select panel steals keyboard focus while open
    if (this._regionSelectOpen) {
      const rows = this._regionSelectRows;
      if (e.key === 'ArrowUp') {
        this._regionCursor = (this._regionCursor - 1 + rows.length) % rows.length;
        this._highlightRegionRow(this._regionCursor);
        return;
      }
      if (e.key === 'ArrowDown') {
        this._regionCursor = (this._regionCursor + 1) % rows.length;
        this._highlightRegionRow(this._regionCursor);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const row = rows[this._regionCursor];
        if (row) this._startGame(false, row.index);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        this._toggleRegionSelect();
        return;
      }
      return;
    }
    if (!this._joiningMode) {
      // Backspace / Escape cancels the host co-op waiting screen
      if ((e.key === 'Backspace' || e.key === 'Escape') && this._roomPrompt.alpha > 0) {
        this._cancelCoopScreen();
        return;
      }
      if (e.key === 'ArrowUp') {
        this._selIdx = (this._selIdx - 1 + this._navButtons.length) % this._navButtons.length;
        this._updateMenuCursor();
        return;
      }
      if (e.key === 'ArrowDown') {
        this._selIdx = (this._selIdx + 1) % this._navButtons.length;
        this._updateMenuCursor();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        this._navButtons[this._selIdx]?.action();
        return;
      }
      return;
    }
    // ── Joining mode ────────────────────────────────────────────────────────
    if (e.key === 'Escape' || (e.key === 'Backspace' && this._joinCode.length === 0)) {
      this._cancelCoopScreen();
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
            this._showCharSelect(net, false);
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

  _showCharSelect(net, isHost) {
    this._roomPrompt.setAlpha(0);
    this._roomInput.setAlpha(0);

    const D = 20;
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.88).setDepth(D);

    this.add.text(GAME_W / 2, 62, 'SELECT YOUR CHARACTER', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 1);

    const cardW = 320, cardH = 260, cardY = GAME_H / 2 - 10;
    const cx = { dhruva: GAME_W / 2 - 200, tara: GAME_W / 2 + 200 };
    const col = { dhruva: 0xcc99ff, tara: 0x88ccff };
    const hex = { dhruva: '#cc99ff', tara: '#88ccff' };
    const sub = { dhruva: 'Warrior of Earth & Fire', tara: 'Dancer of Wind & Water' };
    const abils = {
      dhruva: ['Q  —  Prithvi Slam', 'E  —  Agni Shield', 'R  —  Agni Burst'],
      tara:   ['Q  —  Vayu Dash',    'E  —  Jal Mend',    'R  —  Vayu Storm'],
    };

    const borders = {};
    const bgs    = {};

    ['dhruva', 'tara'].forEach(char => {
      const x = cx[char];
      bgs[char] = this.add.rectangle(x, cardY, cardW, cardH, 0x0a0a1e).setDepth(D + 1);
      borders[char] = this.add.rectangle(x, cardY, cardW, cardH)
        .setStrokeStyle(2, 0x334466).setDepth(D + 2);

      this.add.text(x, cardY - 95, char.toUpperCase(), {
        fontSize: '20px', fontFamily: 'monospace', color: hex[char],
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(D + 3);

      this.add.text(x, cardY - 68, sub[char], {
        fontSize: '11px', fontFamily: 'monospace', color: '#888888',
      }).setOrigin(0.5).setDepth(D + 3);

      const dg = this.add.graphics().setDepth(D + 3);
      dg.lineStyle(1, 0x334466, 0.7);
      dg.lineBetween(x - 120, cardY - 50, x + 120, cardY - 50);

      abils[char].forEach((a, i) => {
        this.add.text(x, cardY - 24 + i * 26, a, {
          fontSize: '13px', fontFamily: 'monospace', color: '#cccccc',
        }).setOrigin(0.5).setDepth(D + 3);
      });
    });

    const statusTxt = this.add.text(GAME_W / 2, GAME_H - 100, 'Click a card to choose your character', {
      fontSize: '15px', fontFamily: 'monospace', color: '#778899',
    }).setOrigin(0.5).setDepth(D + 1);

    const partnerTxt = this.add.text(GAME_W / 2, GAME_H - 70, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setDepth(D + 1);

    let myChar = null;
    let partnerChar = null;

    const tryStart = () => {
      if (!myChar || !partnerChar) return;
      const p1Char = isHost ? myChar : partnerChar;
      const p2Char = isHost ? partnerChar : myChar;
      statusTxt.setText('Both ready!').setStyle({ color: '#ffdd00' });

      if (isHost) {
        // Host picks the starting region; client waits
        this.time.delayedCall(400, () => this._showCoopRegionSelect(net, p1Char, p2Char, D));
      } else {
        statusTxt.setText('Waiting for host to select region...');
        net.on('REGION_SELECT', ({ regionIndex }) => {
          this.registry.set('network', net);
          this._startGame(true, regionIndex, { p1Char, p2Char });
        });
      }
    };

    const selectChar = (char) => {
      if (myChar) return;
      myChar = char;
      const other = char === 'dhruva' ? 'tara' : 'dhruva';
      borders[char].setStrokeStyle(3, col[char]);
      borders[other].setStrokeStyle(2, 0x223344);
      bgs[other].setAlpha(0.3);
      this.add.text(cx[char], cardY + 108, '✓  SELECTED', {
        fontSize: '13px', fontFamily: 'monospace', color: hex[char],
      }).setOrigin(0.5).setDepth(D + 3);
      statusTxt.setText('Waiting for partner...');
      net.send('CHAR_SELECT', { char });
      tryStart();
    };

    net.on('CHAR_SELECT', ({ char }) => {
      partnerChar = char;
      partnerTxt.setText(`Partner chose: ${char.toUpperCase()}`).setStyle({ color: hex[char] });
      tryStart();
    });

    ['dhruva', 'tara'].forEach(char => {
      const zone = this.add.zone(cx[char], cardY, cardW, cardH)
        .setInteractive({ useHandCursor: true }).setDepth(D + 4);
      zone.on('pointerover', () => { if (!myChar) borders[char].setStrokeStyle(2, col[char]); });
      zone.on('pointerout',  () => { if (!myChar) borders[char].setStrokeStyle(2, 0x334466); });
      zone.on('pointerdown', () => selectChar(char));
    });
  }

  _showCoopRegionSelect(net, p1Char, p2Char, D) {
    const cx = GAME_W / 2;
    const panelY = GAME_H / 2;
    const panelW = 680, panelH = 340;

    this.add.rectangle(cx, panelY, panelW, panelH, 0x04040f, 0.96).setDepth(D + 5);
    this.add.rectangle(cx, panelY, panelW, panelH).setStrokeStyle(2, 0x4444dd).setDepth(D + 6);

    const titleTxt = this.add.text(cx, panelY - 140, 'SELECT STARTING REGION', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffdd00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 7);

    const cols = 4;
    const btnW = 148, btnH = 44, gapX = 12, gapY = 10;
    const startX = cx - ((cols * btnW + (cols - 1) * gapX) / 2) + btnW / 2;
    const startY = panelY - 90;

    let started = false;

    const allBgs = [];
    REGION_NAMES.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gapX);
      const by = startY + row * (btnH + gapY);

      const bg = this.add.rectangle(bx, by, btnW, btnH, 0x0c0c28).setDepth(D + 7).setInteractive({ useHandCursor: true });
      const border = this.add.rectangle(bx, by, btnW, btnH).setStrokeStyle(1, 0x334466).setDepth(D + 8);
      const label = name.split(' — ')[0];
      const txt = this.add.text(bx, by, label, {
        fontSize: '11px', fontFamily: 'monospace', color: '#cccccc',
      }).setOrigin(0.5).setDepth(D + 9);

      allBgs.push(bg);
      bg.on('pointerover', () => { if (!started) { border.setStrokeStyle(2, 0xffdd00); txt.setStyle({ color: '#ffdd00' }); } });
      bg.on('pointerout',  () => { if (!started) { border.setStrokeStyle(1, 0x334466); txt.setStyle({ color: '#cccccc' }); } });
      bg.on('pointerdown', () => {
        if (started) return;
        started = true;
        allBgs.forEach(b => b.disableInteractive());
        net.send('REGION_SELECT', { regionIndex: i });
        this.registry.set('network', net);
        this._startGame(true, i, { p1Char, p2Char });
      });
    });

    // If connection drops while host is choosing, show error instead of launching solo silently
    const onDisconnect = () => {
      started = true;
      allBgs.forEach(b => b.disableInteractive());
      titleTxt.setText('PARTNER DISCONNECTED').setStyle({ color: '#ff4444', fontSize: '18px' });
    };
    net.on('disconnected', onDisconnect);
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
