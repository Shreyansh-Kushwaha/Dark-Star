import { GAME_W, GAME_H } from '../constants.js';
import { QUESTS, LORE_FRAGMENTS } from '../data/quests.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { ENEMY_LORE, CHARACTERS, NPC_CODEX } from '../data/codex.js';
import { BOSSES } from '../data/bosses.js';
import { CREATURE_STATS } from '../data/creatureStats.js';
import { Settings } from '../systems/Settings.js';
import { QualitySettings } from '../systems/QualitySettings.js';

const REGION_LABELS = [
  'Gramavana', 'Mahāvana', 'Vrindavana',
  'Nāga Pātāl', 'Deva Mandira', 'Swarga Seema', 'Viyoga Durga',
];

// ─── palette ──────────────────────────────────────────────────────────────────
const C = {
  cover:      0x1a0c04,
  spine:      0x0d0602,
  pageL:      0xe8d5a0,
  pageR:      0xf0deb0,
  rule:       0x8b5a2b,
  ink:        0x2c1400,
  inkFaint:   0x5a3a18,
  inkMuted:   0x7a5530,
  tab:        0xc8a060,
  tabInact:   0xb09050,
  doneGreen:  0x2d6e2d,
  doneBg:     0xd4eacc,
  activeBrown:0x7a4800,
  activeBg:   0xf0e0a8,
  lockedGrey: 0x888866,
  lockedBg:   0xe0d8b8,
  loreBg:     0xe0c878,
  missedBg:   0xd4ccaa,
  barTrack:   0xc4a87a,
  barFill:    0x4a7a28,
  gold:       0xc8a040,
};

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    // Dim overlay
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.68)
      .setOrigin(0.5);

    // Entrance: fade in with a slight zoom settle.
    const cam = this.cameras.main;
    cam.alpha = 0; cam.setZoom(1.04);
    this.tweens.add({ targets: cam, alpha: 1, zoom: 1, duration: 160, ease: 'Cubic.easeOut' });

    this.add.text(GAME_W / 2, GAME_H / 2 - 90, 'PAUSED', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this._menuItems = [
      { label: 'RESUME',    action: () => this._resume()       },
      { label: 'WORLD MAP', action: () => this._openMap()      },
      { label: 'CODEX',     action: () => this._openBook()     },
      { label: 'SETTINGS',  action: () => this._openSettings() },
      { label: 'MAIN MENU', action: () => this._mainMenu()     },
    ];
    this._selIdx = 0;
    this._buttons = this._menuItems.map((item, i) =>
      this._makeButton(GAME_W / 2, GAME_H / 2 - 50 +i * 58, item.label, item.action, i));

    this._cursor = this.add.text(0, 0, '►', {
      fontSize: '15px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5);
    this._updateCursor();

    this.add.text(GAME_W / 2, GAME_H / 2 + 218,
      '↑↓ Navigate   Enter / Space — Confirm   Esc / Backspace — Back', {
        fontSize: '11px', color: '#555', fontFamily: 'monospace',
      }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-ESC',       () => this._onEsc());
    kb.on('keydown-BACKSPACE', () => this._onEsc());
    kb.on('keydown-HOME',      () => this._resume());
    kb.on('keydown-UP',        () => this._bookOpen ? this._bookPageStep(-1) : this._settingsOpen ? this._settingsMove(-1) : this._move(-1));
    kb.on('keydown-DOWN',      () => this._bookOpen ? this._bookPageStep(1)  : this._settingsOpen ? this._settingsMove(1)  : this._move(1));
    kb.on('keydown-LEFT',      () => { if (this._bookOpen) this._bookTabStep(-1); else if (this._settingsOpen) this._settingsAdjust(-1); });
    kb.on('keydown-RIGHT',     () => { if (this._bookOpen) this._bookTabStep(1);  else if (this._settingsOpen) this._settingsAdjust(1); });
    kb.on('keydown-ENTER',     () => this._confirm());
    kb.on('keydown-SPACE',     () => this._confirm());

    this._bookOpen = false;
    this._bookObjs = [];
    this._settingsOpen = false;
    this._setObjs = [];
  }

  // ── Menu helpers ─────────────────────────────────────────────────────────

  _onEsc()    { if (this._bookOpen) { this._closeBook(); return; } if (this._settingsOpen) { this._closeSettings(); return; } this._resume(); }
  _move(d)    { if (this._bookOpen || this._settingsOpen) return; this._selIdx = (this._selIdx + d + this._menuItems.length) % this._menuItems.length; this._audio()?.uiClick?.(); this._updateCursor(); }
  _confirm()  { if (this._bookOpen) return; if (this._settingsOpen) { this._settingsAdjust(1); return; } this._audio()?.uiClick?.(); this._menuItems[this._selIdx].action(); }
  _audio()    { return this.scene.get('GameScene')?.audio; }

  _updateCursor() {
    this._cursor.setPosition(GAME_W / 2 - 140, GAME_H / 2 - 50 +this._selIdx * 58);
    this._buttons.forEach((b, i) => {
      b.txt.setColor(i === this._selIdx ? '#ffd700' : '#aaaaaa');
      b.bg.setFillStyle(i === this._selIdx ? 0x2a2a4e : 0x1a1a2e);
    });
  }

  _makeButton(x, y, label, onClick, idx) {
    const w = 220, h = 42;
    const bg  = this.add.rectangle(x, y, w, h, 0x1a1a2e, 0.9).setOrigin(0.5).setStrokeStyle(2, 0xffd700, 0.7);
    const txt = this.add.text(x, y, label, { fontSize: '16px', color: '#aaaaaa', fontFamily: 'serif', fontStyle: 'bold' }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { this._selIdx = idx; this._updateCursor(); })
      .on('pointerdown', () => { bg.setScale(0.96); txt.setScale(0.96); })
      .on('pointerup',   () => { bg.setScale(1); txt.setScale(1); onClick(); });
    return { bg, txt, zone };
  }

  // ── Settings panel ────────────────────────────────────────────────────────

  _openSettings() {
    if (this._settingsOpen) return;
    this._settingsOpen = true;
    this._setIdx = 0;
    this._setObjs = [];
    const D = 60, cx = GAME_W / 2;

    const pct = v => `${Math.round(v * 100)}%`;
    const vol = (key, d) => {
      Settings.set(key, Math.min(1, Math.max(0, Math.round((Settings[key] + d * 0.1) * 10) / 10)));
      this._audio()?.applyVolumes?.();
    };
    this._setRows = [
      { label: 'MASTER VOLUME',  get: () => pct(Settings.masterVol), adjust: d => vol('masterVol', d) },
      { label: 'MUSIC VOLUME',   get: () => pct(Settings.musicVol),  adjust: d => vol('musicVol', d) },
      { label: 'SFX VOLUME',     get: () => pct(Settings.sfxVol),    adjust: d => vol('sfxVol', d) },
      { label: 'REDUCED MOTION', get: () => (Settings.reducedMotion ? 'ON' : 'OFF'),
        adjust: () => Settings.set('reducedMotion', !Settings.reducedMotion) },
      { label: 'QUALITY',        get: () => QualitySettings.level.toUpperCase(),
        adjust: () => QualitySettings.cycle(), note: 'applies fully on next region' },
    ];

    const add = o => { o.setDepth(D + 1); this._setObjs.push(o); return o; };
    // Interactive veil: swallow pointer events so the menu buttons underneath
    // (topmost-only hit testing) can't be clicked through the panel.
    this._setObjs.push(this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.86).setDepth(D).setInteractive());
    add(this.add.text(cx, 120, 'SETTINGS', {
      fontSize: '30px', color: '#ffd700', fontFamily: 'serif', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5));

    const rowY = i => 210 + i * 64;
    this._setCells = this._setRows.map((row, i) => {
      const y = rowY(i);
      const bg = add(this.add.rectangle(cx, y, 520, 48, 0x1a1a2e, 0.9).setStrokeStyle(2, 0x8a6a3a, 0.8)
        .setInteractive({ useHandCursor: true }));
      const label = add(this.add.text(cx - 240, y, row.label, {
        fontSize: '15px', color: '#cccccc', fontFamily: 'serif', fontStyle: 'bold',
      }).setOrigin(0, 0.5));
      const value = add(this.add.text(cx + 150, y, '', {
        fontSize: '15px', color: '#ffe8a0', fontFamily: 'monospace',
      }).setOrigin(0.5));
      const left = add(this.add.text(cx + 78, y, '◄', {
        fontSize: '18px', color: '#aa8855', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
      const right = add(this.add.text(cx + 222, y, '►', {
        fontSize: '18px', color: '#aa8855', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
      if (row.note) add(this.add.text(cx - 240, y + 30, row.note, {
        fontSize: '9px', color: '#665533', fontFamily: 'monospace',
      }).setOrigin(0, 0.5));
      bg.on('pointerover', () => { this._setIdx = i; this._renderSettings(); });
      left.on('pointerdown',  () => { this._setIdx = i; this._settingsAdjust(-1); });
      right.on('pointerdown', () => { this._setIdx = i; this._settingsAdjust(1); });
      return { bg, label, value };
    });

    add(this.add.text(cx, rowY(this._setRows.length) + 8, '↑↓ Select   ◄ ► Adjust   Esc — Back', {
      fontSize: '11px', color: '#555', fontFamily: 'monospace',
    }).setOrigin(0.5));
    const backBg = add(this.add.rectangle(cx, rowY(this._setRows.length) + 52, 160, 38, 0x1a1a2e, 0.9)
      .setStrokeStyle(2, 0xffd700, 0.7).setInteractive({ useHandCursor: true }));
    add(this.add.text(cx, rowY(this._setRows.length) + 52, '✕  BACK', {
      fontSize: '14px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5));
    backBg.on('pointerup', () => this._closeSettings());
    this._renderSettings();
  }

  _renderSettings() {
    if (!this._settingsOpen) return;
    this._setCells.forEach((c, i) => {
      const on = i === this._setIdx;
      c.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd700 : 0x8a6a3a, on ? 1 : 0.8);
      c.bg.setFillStyle(on ? 0x2a2a4e : 0x1a1a2e, 0.9);
      c.label.setColor(on ? '#ffd700' : '#cccccc');
      c.value.setText(this._setRows[i].get());
    });
  }

  _settingsMove(d) {
    this._setIdx = (this._setIdx + d + this._setRows.length) % this._setRows.length;
    this._audio()?.uiClick?.();
    this._renderSettings();
  }

  _settingsAdjust(d) {
    this._setRows[this._setIdx].adjust(d);
    this._audio()?.uiClick?.();
    this._renderSettings();
  }

  _closeSettings() {
    this._settingsOpen = false;
    this._setObjs.forEach(o => { try { o.destroy(); } catch {} });
    this._setObjs = [];
    this._setCells = [];
  }

  _resume()   { this.scene.get('GameScene')?.togglePause(); }
  _mainMenu() { this.scene.stop('GameScene'); this.scene.stop('UIScene'); this.scene.stop('PauseScene'); this.scene.start('MainMenuScene'); }
  _openMap()  {
    const cur = this.scene.get('GameScene')?._regionIndex ?? 0;
    this.scene.launch('WorldMapScene', { from: 'pause', currentRegion: cur });
    this.scene.bringToTop('WorldMapScene');
  }

  // ── Book ─────────────────────────────────────────────────────────────────

  _openBook() {
    if (this._bookOpen) return;
    this._bookOpen = true;
    this._bookTab  = 'quests';
    this._bookPage = 0;
    this._bookTotalPages = 1;
    this._bookObjs = [];
    this._renderBook();
  }

  // Tab order for ← / → navigation.
  get _tabKeys() { return ['quests', 'lore', 'enemies', 'bosses', 'characters', 'npcs']; }

  _bookTabStep(d) {
    if (!this._bookRenderAllowed()) return;
    const keys = this._tabKeys;
    const i = Math.max(0, keys.indexOf(this._bookTab));
    this._bookTab  = keys[(i + d + keys.length) % keys.length];
    this._bookPage = 0;
    this._audio()?.pageTurn?.();
    this._renderBook();
  }

  _bookPageStep(d) {
    const tp = this._bookTotalPages || 1;
    const np = Phaser.Math.Clamp(this._bookPage + d, 0, tp - 1);
    if (np !== this._bookPage && this._bookRenderAllowed()) { this._bookPage = np; this._audio()?.pageTurn?.(); this._renderBook(); }
  }

  _closeBook() {
    this._bookOpen = false;
    this._bookObjs.forEach(o => o.destroy());
    this._bookObjs = [];
  }

  _gs()  { return this.scene.get('GameScene'); }
  _add(o){ this._bookObjs.push(o); return o; }

  // ── Core book shell ───────────────────────────────────────────────────────

  // A full book render creates ~50 Text canvases + GL textures; a held arrow
  // key at OS repeat rate would churn ~1500 of them per second. One rebuild per
  // 120ms is indistinguishable to the eye and bounds the cost.
  _bookRenderAllowed() {
    const now = this.time.now;
    if (now - (this._lastBookRender || 0) < 120) return false;
    this._lastBookRender = now;
    return true;
  }

  _renderBook() {
    this._bookObjs.forEach(o => o.destroy());
    this._bookObjs = [];

    const BW = 980, BH = 582;
    const BX = GAME_W / 2, BY = GAME_H / 2;
    const L  = BX - BW / 2, T = BY - BH / 2;
    const D  = 60;
    const PW = (BW - 12) / 2;   // single page width
    const LMX = L;               // left page left edge
    const RMX = BX + 6;         // right page left edge

    // ── Full-screen dim behind book ─────────────────────────────────────
    // setInteractive so it swallows clicks — otherwise pointer events fall through
    // to the RESUME/MAP/CODEX/MENU zones still active behind the open book.
    this._add(this.add.rectangle(BX, BY, GAME_W, GAME_H, 0x000000, 0.6).setDepth(D).setInteractive());

    // ── Leather cover (slightly oversized) ──────────────────────────────
    const g = this._add(this.add.graphics().setDepth(D + 1));
    g.fillStyle(C.cover, 1);
    g.fillRoundedRect(L - 14, T - 10, BW + 28, BH + 20, 8);
    // Cover border emboss
    g.lineStyle(2, C.gold, 0.35);
    g.strokeRoundedRect(L - 10, T - 6, BW + 20, BH + 12, 6);
    // Inner border
    g.lineStyle(1, C.gold, 0.2);
    g.strokeRoundedRect(L - 4, T, BW + 8, BH, 3);

    // ── Left page ────────────────────────────────────────────────────────
    const lg = this._add(this.add.graphics().setDepth(D + 2));
    lg.fillStyle(C.pageL, 1);
    lg.fillRect(LMX, T, PW, BH);
    // Page ruling lines
    lg.lineStyle(1, C.rule, 0.07);
    for (let ry = T + 28; ry < T + BH - 10; ry += 22) lg.lineBetween(LMX + 10, ry, LMX + PW - 10, ry);
    // Right-edge spine shadow
    lg.fillStyle(0x000000, 0.12);
    lg.fillRect(LMX + PW - 14, T, 14, BH);

    // ── Spine ────────────────────────────────────────────────────────────
    const sg = this._add(this.add.graphics().setDepth(D + 3));
    sg.fillStyle(C.spine, 1);
    sg.fillRect(BX - 6, T, 12, BH);
    sg.fillStyle(C.gold, 0.15);
    sg.fillRect(BX - 6, T, 3, BH);

    // ── Right page ───────────────────────────────────────────────────────
    const rg = this._add(this.add.graphics().setDepth(D + 2));
    rg.fillStyle(C.pageR, 1);
    rg.fillRect(RMX, T, PW, BH);
    rg.lineStyle(1, C.rule, 0.07);
    for (let ry = T + 28; ry < T + BH - 10; ry += 22) rg.lineBetween(RMX + 10, ry, RMX + PW - 10, ry);
    // Left-edge spine shadow
    rg.fillStyle(0x000000, 0.08);
    rg.fillRect(RMX, T, 14, BH);

    // ── Book title (centred on spine) ────────────────────────────────────
    this._add(this.add.text(BX, T + 18, 'C O D E X   O F   A K H A N D   S U T R A', {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold',
      color: '#3d1f05',
    }).setOrigin(0.5, 0).setDepth(D + 4));

    // Header divider
    const hd = this._add(this.add.graphics().setDepth(D + 4));
    hd.lineStyle(1, C.rule, 0.5);
    hd.lineBetween(LMX + 16, T + 36, LMX + BW - 16, T + 36);
    hd.lineStyle(1, C.rule, 0.2);
    hd.lineBetween(LMX + 16, T + 38, LMX + BW - 16, T + 38);

    // ── Tabs ─────────────────────────────────────────────────────────────
    const tabs = [
      { k: 'quests',     label: '📜 Quests'   },
      { k: 'lore',       label: '📖 Lore'     },
      { k: 'enemies',    label: '🗡 Bestiary' },
      { k: 'bosses',     label: '☠ Bosses'   },
      { k: 'characters', label: '👤 Heroes'   },
      { k: 'npcs',       label: '💬 NPCs'     },
    ];
    const tabW = 138, tabH = 26, tabY = T + 52, tabStep = 152;
    const tabStartX = BX - tabStep * (tabs.length - 1) / 2;
    tabs.forEach((tab, i) => {
      const tx = tabStartX + i * tabStep;
      const isActive = tab.k === this._bookTab;
      const tg = this._add(this.add.graphics().setDepth(D + 4));
      tg.fillStyle(isActive ? C.tab : C.tabInact, isActive ? 1 : 0.55);
      tg.fillRoundedRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH, { tl: 4, tr: 4, bl: 0, br: 0 });
      tg.lineStyle(1, C.rule, isActive ? 0.6 : 0.3);
      tg.strokeRoundedRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH, { tl: 4, tr: 4, bl: 0, br: 0 });
      this._add(this.add.text(tx, tabY, tab.label, {
        fontSize: '11px', fontFamily: 'serif', fontStyle: isActive ? 'bold' : 'normal',
        color: isActive ? '#1a0800' : '#5a3a10',
      }).setOrigin(0.5).setDepth(D + 5));
      const tz = this._add(this.add.zone(tx, tabY, tabW, tabH).setInteractive({ useHandCursor: true }).setDepth(D + 6));
      tz.on('pointerdown', () => { this._bookTab = tab.k; this._bookPage = 0; this._audio()?.pageTurn?.(); this._renderBook(); });
    });
    // Tab underline
    const tu = this._add(this.add.graphics().setDepth(D + 4));
    tu.lineStyle(1, C.rule, 0.5);
    tu.lineBetween(LMX + 16, T + 66, LMX + BW - 16, T + 66);

    // ── Close button ──────────────────────────────────────────────────────
    const cx = LMX + BW - 2, cy = T - 2;
    const cbg = this._add(this.add.graphics().setDepth(D + 6));
    cbg.fillStyle(0x6b1a1a, 1); cbg.fillCircle(cx, cy, 14);
    cbg.lineStyle(1.5, 0xff6666, 0.8); cbg.strokeCircle(cx, cy, 14);
    this._add(this.add.text(cx, cy, '✕', { fontSize: '13px', fontFamily: 'monospace', color: '#ffaaaa' }).setOrigin(0.5).setDepth(D + 7));
    this._add(this.add.zone(cx, cy, 28, 28).setInteractive({ useHandCursor: true }).setDepth(D + 8))
      .on('pointerdown', () => this._closeBook());

    // ── Content ───────────────────────────────────────────────────────────
    const CT = T + 72;   // content top
    const CB = T + BH - 22; // content bottom
    this._bookTotalPages = 1;   // tabs that paginate override this
    const contentStart = this._bookObjs.length;
    switch (this._bookTab) {
      case 'lore':       this._renderLore(LMX, RMX, PW, CT, CB, D);       break;
      case 'enemies':    this._renderEnemies(LMX, RMX, PW, CT, CB, D);    break;
      case 'bosses':     this._renderBosses(LMX, RMX, PW, CT, CB, D);     break;
      case 'characters': this._renderCharacters(LMX, RMX, PW, CT, CB, D); break;
      case 'npcs':       this._renderNpcs(LMX, RMX, PW, CT, CB, D);       break;
      default:           this._renderQuests(LMX, RMX, PW, CT, CB, D);     break;
    }
    // Page-turn feel: the fresh content settles in with a quick fade.
    const fresh = this._bookObjs.slice(contentStart);
    fresh.forEach(o => { if (o.setAlpha) o.setAlpha(0); });
    this.tweens.add({ targets: fresh, alpha: 1, duration: 110, ease: 'Quad.easeOut' });

    // ── Keyboard hint ─────────────────────────────────────────────────────
    this._add(this.add.text(BX, T + BH + 4,
      '◄ ► Tabs     ▲ ▼ Pages     Esc — Close', {
        fontSize: '9px', fontFamily: 'monospace', color: '#caa460',
      }).setOrigin(0.5, 0).setDepth(D + 5));
  }

  // ── Quests tab ────────────────────────────────────────────────────────────

  _renderQuests(LMX, RMX, PW, CT, CB, D) {
    const gs = this._gs();
    const qm = gs?.questManager;

    const allQuests  = Object.values(QUESTS);
    const mainQuests = allQuests.filter(q => q.type === 'main');
    const sideQuests = allQuests.filter(q => q.type === 'side');

    const stateOf = id =>
      qm?.completed.has(id) ? 'done' :
      qm?.active.has(id)    ? 'active' : 'locked';

    const PAD = 16;
    const entryW = PW - PAD * 2 - 6;

    // Both columns page together so every quest is reachable (the old fill
    // loop silently dropped whatever ran past the page bottom).
    const PER_COL = 8;
    const totalPages = Math.max(1,
      Math.ceil(mainQuests.length / PER_COL), Math.ceil(sideQuests.length / PER_COL));
    this._bookTotalPages = totalPages;
    const mainPage = mainQuests.slice(this._bookPage * PER_COL, (this._bookPage + 1) * PER_COL);
    const sidePage = sideQuests.slice(this._bookPage * PER_COL, (this._bookPage + 1) * PER_COL);

    // Left — Main Quests
    let y = CT;
    this._sectionHeader(LMX + PAD, y, 'MAIN  QUESTS', D); y += 20;
    for (const q of mainPage) {
      const h = this._questEntry(LMX + PAD, y, entryW, q, stateOf(q.id), D);
      y += h + 5;
      if (y + 40 > CB) break;
    }
    const mainDone = mainQuests.filter(q => stateOf(q.id) === 'done').length;
    this._add(this.add.text(LMX + PW / 2, CB - 14, `${mainDone} / ${mainQuests.length} completed`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
    this._pageNav(LMX, PAD, PW, CB - 2, totalPages, D);

    // Right — Side Quests
    y = CT;
    this._sectionHeader(RMX + PAD, y, 'SIDE  QUESTS', D); y += 20;
    for (const q of sidePage) {
      const h = this._questEntry(RMX + PAD, y, entryW, q, stateOf(q.id), D);
      y += h + 5;
      if (y + 40 > CB) break;
    }
    const sideDone = sideQuests.filter(q => stateOf(q.id) === 'done').length;
    this._add(this.add.text(RMX + PW / 2, CB, `${sideDone} / ${sideQuests.length} completed`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
  }

  _questEntry(x, y, w, q, state, D) {
    const icon  = state === 'done' ? '✓' : state === 'active' ? '▶' : '○';
    const iCol  = state === 'done' ? '#2d6e2d' : state === 'active' ? '#8b5500' : '#888866';
    const bgCol = state === 'done' ? C.doneBg  : state === 'active' ? C.activeBg : C.lockedBg;
    const ttCol = state === 'done' ? '#1e5c1e' : state === 'active' ? '#6a3c00' : '#666655';
    const H = 46;

    // Row background
    const rg = this._add(this.add.graphics().setDepth(D + 4));
    rg.fillStyle(bgCol, 0.65); rg.fillRoundedRect(x, y, w, H, 3);
    // Left accent bar
    const accentCol = state === 'done' ? C.doneGreen : state === 'active' ? C.activeBrown : C.lockedGrey;
    rg.fillStyle(accentCol, 0.8); rg.fillRect(x, y, 3, H);

    this._add(this.add.text(x + 10, y + 7, icon, { fontSize: '11px', fontFamily: 'monospace', color: iCol }).setDepth(D + 5));
    this._add(this.add.text(x + 22, y + 6, q.title, {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: ttCol,
      wordWrap: { width: w - 26 },
    }).setDepth(D + 5));
    this._add(this.add.text(x + 22, y + 22, q.desc, {
      fontSize: '8.5px', fontFamily: 'serif', color: '#3d2a10',
      wordWrap: { width: w - 26 },
    }).setDepth(D + 5));
    return H;
  }

  // ── Lore tab ──────────────────────────────────────────────────────────────

  _renderLore(LMX, RMX, PW, CT, CB, D) {
    const lm = this._gs()?.loreManager;
    const collectedIds = new Set(lm?.toArray() || []);
    const PAGE_SIZE = 5;
    const total = LORE_FRAGMENTS.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    this._bookTotalPages = totalPages;
    const pageFrags = LORE_FRAGMENTS.slice(this._bookPage * PAGE_SIZE, (this._bookPage + 1) * PAGE_SIZE);

    const PAD = 16;
    const entryW = PW - PAD * 2 - 6;

    // Left — lore entries
    let y = CT;
    this._sectionHeader(LMX + PAD, y, 'LORE  FRAGMENTS', D); y += 20;
    for (const frag of pageFrags) {
      const found = collectedIds.has(frag.id);
      const h = this._loreEntry(LMX + PAD, y, entryW, frag, found, D);
      y += h + 5;
      if (y + 30 > CB) break;
    }

    // Pagination
    const navY = CB - 2;
    if (this._bookPage > 0) {
      const prev = this._add(this.add.text(LMX + PAD, navY, '◄ Prev', {
        fontSize: '10px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(0, 1).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      prev.on('pointerover', () => prev.setColor('#c8900a'));
      prev.on('pointerout',  () => prev.setColor('#5a3a10'));
      prev.on('pointerdown', () => { this._bookPage--; this._renderBook(); });
    }
    this._add(this.add.text(LMX + PW / 2, navY, `${this._bookPage + 1}  /  ${totalPages}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
    if (this._bookPage < totalPages - 1) {
      const next = this._add(this.add.text(LMX + PW - PAD, navY, 'Next ►', {
        fontSize: '10px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(1, 1).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      next.on('pointerover', () => next.setColor('#c8900a'));
      next.on('pointerout',  () => next.setColor('#5a3a10'));
      next.on('pointerdown', () => { this._bookPage++; this._renderBook(); });
    }

    // Right — region progress
    y = CT;
    this._sectionHeader(RMX + PAD, y, 'COLLECTED  BY  REGION', D); y += 22;

    // Group fragments by region
    const byRegion = {};
    for (const f of LORE_FRAGMENTS) {
      (byRegion[f.region] = byRegion[f.region] || []).push(f);
    }

    const barW = PW - PAD * 2 - 50;
    for (const rIdx of Object.keys(byRegion).map(Number).sort()) {
      const frags = byRegion[rIdx];
      const got   = frags.filter(f => collectedIds.has(f.id)).length;
      const pct   = got / frags.length;
      const name  = REGION_LABELS[rIdx] || `Region ${rIdx}`;

      this._add(this.add.text(RMX + PAD, y, name, {
        fontSize: '10px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d2008',
      }).setDepth(D + 5));
      y += 14;

      const bg2 = this._add(this.add.graphics().setDepth(D + 4));
      bg2.fillStyle(C.barTrack, 0.7); bg2.fillRoundedRect(RMX + PAD, y, barW, 8, 4);
      if (pct > 0) {
        bg2.fillStyle(C.barFill, 0.9);
        bg2.fillRoundedRect(RMX + PAD, y, barW * pct, 8, 4);
        if (pct === 1) { bg2.lineStyle(1, C.gold, 0.6); bg2.strokeRoundedRect(RMX + PAD, y, barW, 8, 4); }
      }
      this._add(this.add.text(RMX + PAD + barW + 7, y + 4, `${got}/${frags.length}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#5a3a10',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      y += 20;
    }

    // Total
    const totalGot = collectedIds.size;
    this._ornament(RMX + PW / 2, CB - 28, D);
    this._add(this.add.text(RMX + PW / 2, CB - 10, `${totalGot} / ${total} fragments discovered`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
  }

  _loreEntry(x, y, w, frag, found, D) {
    if (found) {
      const H = 74;
      const eg = this._add(this.add.graphics().setDepth(D + 4));
      eg.fillStyle(C.loreBg, 0.45); eg.fillRoundedRect(x, y, w, H, 3);
      eg.fillStyle(C.gold, 0.7); eg.fillRect(x, y, 3, H);

      const rName = REGION_LABELS[frag.region] || `Region ${frag.region}`;
      this._add(this.add.text(x + 8, y + 6, frag.title, {
        fontSize: '10.5px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
      }).setDepth(D + 5));
      this._add(this.add.text(x + 8, y + 20, frag.text.replace('⟨Lore Fragment⟩ ', ''), {
        fontSize: '8px', fontFamily: 'serif', color: '#2a1a08',
        wordWrap: { width: w - 16 },
      }).setDepth(D + 5));
      this._add(this.add.text(x + 8, y + H - 10, `— ${rName}`, {
        fontSize: '7.5px', fontFamily: 'serif', fontStyle: 'italic', color: '#7a5030',
      }).setDepth(D + 5));
      return H;
    } else {
      const H = 30;
      const eg = this._add(this.add.graphics().setDepth(D + 4));
      eg.fillStyle(C.missedBg, 0.4); eg.fillRoundedRect(x, y, w, H, 3);
      eg.fillStyle(C.lockedGrey, 0.5); eg.fillRect(x, y, 3, H);
      this._add(this.add.text(x + 10, y + H / 2, '???  —  Fragment not yet discovered', {
        fontSize: '9px', fontFamily: 'serif', fontStyle: 'italic', color: '#888866',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      return H;
    }
  }

  // ── Bestiary tab ────────────────────────────────────────────────────────
  // All enemies, with stats + lore once faced. Foes you have not met read "???".
  // Raw creature entity_keys → readable names ('enemy_4_giant_goblin' →
  // 'Giant Goblin', 'minotaur_minotaur_2' → 'Minotaur 2').
  _prettyCreatureName(k) {
    return String(k)
      .replace(/^enemy_\d+_/, '').replace(/^boss_/, '')
      .replace(/^craftpix_\d+_[a-z_]*chibi_/, 'chibi ')
      .replace(/_/g, ' ').trim()
      .replace(/\b(\w+) \1\b/gi, '$1')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  _renderEnemies(LMX, RMX, PW, CT, CB, D) {
    const faced = this._gs()?._encounteredEnemies || new Set();
    // Full roster: the hand-tuned enemy types, then every map-editor creature.
    const defs = [
      ...Object.values(ENEMY_TYPES),
      ...Object.keys(CREATURE_STATS).map(k => ({
        key: k, label: this._prettyCreatureName(k), _creature: true,
        maxHp: CREATURE_STATS[k].maxHp, attackDmg: CREATURE_STATS[k].attackDmg,
        speed: CREATURE_STATS[k].speed, xpValue: CREATURE_STATS[k].xpValue,
      })),
    ];
    const PAD = 16;
    const entryW = PW - PAD * 2 - 6;

    const PER_COL = 5;
    const perSpread = PER_COL * 2;
    const totalPages = Math.max(1, Math.ceil(defs.length / perSpread));
    this._bookTotalPages = totalPages;
    const spread = defs.slice(this._bookPage * perSpread, (this._bookPage + 1) * perSpread);
    const cols = [
      { x: LMX + PAD, list: spread.slice(0, PER_COL) },
      { x: RMX + PAD, list: spread.slice(PER_COL)    },
    ];

    this._sectionHeader(LMX + PAD, CT, 'BESTIARY  ·  FOES  FACED', D);
    this._sectionHeader(RMX + PAD, CT, 'BESTIARY  ·  CONTINUED',   D);

    for (const col of cols) {
      let y = CT + 20;
      for (const def of col.list) {
        const found = faced.has(def.key);
        const h = this._enemyEntry(col.x, y, entryW, def, found, D);
        y += h + 5;
        if (y + 20 > CB) break;
      }
    }

    this._pageNav(LMX, PAD, PW, CB - 2, totalPages, D);
    const recorded = defs.filter(d => faced.has(d.key)).length;
    this._ornament(RMX + PW / 2, CB - 16, D);
    this._add(this.add.text(RMX + PW / 2, CB, `${recorded} / ${defs.length} foes recorded`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
  }

  _enemyEntry(x, y, w, def, found, D) {
    if (!found) {
      const H = 30;
      const eg = this._add(this.add.graphics().setDepth(D + 4));
      eg.fillStyle(C.missedBg, 0.4); eg.fillRoundedRect(x, y, w, H, 3);
      eg.fillStyle(C.lockedGrey, 0.5); eg.fillRect(x, y, 3, H);
      this._add(this.add.text(x + 10, y + H / 2, '???  —  not yet faced', {
        fontSize: '9px', fontFamily: 'serif', fontStyle: 'italic', color: '#888866',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      return H;
    }
    const lore = ENEMY_LORE[def.key] || '';
    const H = lore ? 86 : 40;
    const eg = this._add(this.add.graphics().setDepth(D + 4));
    eg.fillStyle(C.loreBg, 0.45); eg.fillRoundedRect(x, y, w, H, 3);
    eg.fillStyle(0x8b2a1a, 0.7); eg.fillRect(x, y, 3, H);

    this._add(this.add.text(x + 8, y + 6, def.label || def.key, {
      fontSize: '10.5px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    const st = v => (v ?? '—');
    this._add(this.add.text(x + 8, y + 20,
      `HP ${st(def.maxHp)}    DMG ${st(def.attackDmg)}    SPD ${st(def.speed)}    XP ${st(def.xpValue)}`, {
        fontSize: '7.5px', fontFamily: 'monospace', color: '#6a4520',
      }).setDepth(D + 5));
    if (lore) {
      this._add(this.add.text(x + 8, y + 32, lore, {
        fontSize: '8px', fontFamily: 'serif', color: '#2a1a08',
        wordWrap: { width: w - 16 },
      }).setDepth(D + 5));
    }
    return H;
  }

  // ── Bosses tab ──────────────────────────────────────────────────────────
  // The six great foes — name, epithet and lore once felled; sealed before.
  _renderBosses(LMX, RMX, PW, CT, CB, D) {
    const kills = new Set(this._gs()?._save?.bossKills || []);
    const defs  = Object.values(BOSSES);
    const PAD = 16;
    const entryW = PW - PAD * 2 - 6;

    const half = Math.ceil(defs.length / 2);
    const cols = [
      { x: LMX + PAD, list: defs.slice(0, half) },
      { x: RMX + PAD, list: defs.slice(half)    },
    ];
    this._sectionHeader(LMX + PAD, CT, 'GREAT  FOES  ·  FELLED', D);
    this._sectionHeader(RMX + PAD, CT, 'GREAT  FOES  ·  CONTINUED', D);

    for (const col of cols) {
      let y = CT + 20;
      for (const def of col.list) {
        const h = this._bossEntry(col.x, y, entryW, def, kills.has(def.key), D);
        y += h + 6;
        if (y + 20 > CB) break;
      }
    }

    this._ornament(RMX + PW / 2, CB - 16, D);
    this._add(this.add.text(RMX + PW / 2, CB, `${kills.size} / ${defs.length} great foes felled`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
  }

  _bossEntry(x, y, w, def, felled, D) {
    if (!felled) {
      const H = 34;
      const eg = this._add(this.add.graphics().setDepth(D + 4));
      eg.fillStyle(C.missedBg, 0.4); eg.fillRoundedRect(x, y, w, H, 3);
      eg.fillStyle(C.lockedGrey, 0.5); eg.fillRect(x, y, 3, H);
      this._add(this.add.text(x + 10, y + H / 2, '☠  ???  —  a great foe still draws breath', {
        fontSize: '9px', fontFamily: 'serif', fontStyle: 'italic', color: '#888866',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      return H;
    }
    const H = 96;
    const eg = this._add(this.add.graphics().setDepth(D + 4));
    eg.fillStyle(C.loreBg, 0.5); eg.fillRoundedRect(x, y, w, H, 3);
    eg.fillStyle(0x6b1a1a, 0.85); eg.fillRect(x, y, 3, H);
    eg.lineStyle(1, C.gold, 0.45); eg.strokeRoundedRect(x, y, w, H, 3);

    this._add(this.add.text(x + 8, y + 6, `☠  ${def.name.toUpperCase()}`, {
      fontSize: '12px', fontFamily: 'serif', fontStyle: 'bold', color: '#5a1508',
    }).setDepth(D + 5));
    this._add(this.add.text(x + w - 8, y + 8, 'FELLED', {
      fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#2d6e2d',
    }).setOrigin(1, 0).setDepth(D + 5));
    if (def.subtitle) {
      this._add(this.add.text(x + 8, y + 22, def.subtitle, {
        fontSize: '8.5px', fontFamily: 'serif', fontStyle: 'italic', color: '#7a5030',
      }).setDepth(D + 5));
    }
    this._add(this.add.text(x + 8, y + 36, def.lore || '', {
      fontSize: '8px', fontFamily: 'serif', color: '#2a1a08',
      wordWrap: { width: w - 16 },
    }).setDepth(D + 5));
    this._add(this.add.text(x + 8, y + H - 12, `HP ${def.maxHp}    XP ${def.xpValue ?? '—'}`, {
      fontSize: '7.5px', fontFamily: 'monospace', color: '#6a4520',
    }).setDepth(D + 5));
    return H;
  }

  // ── Heroes tab ──────────────────────────────────────────────────────────
  // The two playable characters and their lore, one per page.
  _renderCharacters(LMX, RMX, PW, CT, CB, D) {
    const PAD = 16;
    this._characterPage(LMX + PAD, PW - PAD * 2 - 6, CT, CB, CHARACTERS[0], D);
    this._characterPage(RMX + PAD, PW - PAD * 2 - 6, CT, CB, CHARACTERS[1], D);
  }

  _characterPage(x, w, CT, CB, char, D) {
    if (!char) return;
    this._sectionHeader(x, CT, 'PLAYABLE  HERO', D);

    // Colour swatch + name
    const sw = this._add(this.add.graphics().setDepth(D + 4));
    sw.fillStyle(Phaser.Display.Color.HexStringToColor(char.color || '#c8a040').color, 1);
    sw.fillCircle(x + 7, CT + 34, 6);
    sw.lineStyle(1, C.gold, 0.6); sw.strokeCircle(x + 7, CT + 34, 6);

    this._add(this.add.text(x + 20, CT + 26, char.name, {
      fontSize: '20px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    this._add(this.add.text(x + 20, CT + 50, char.title, {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'italic', color: '#7a5030',
    }).setDepth(D + 5));

    const dv = this._add(this.add.graphics().setDepth(D + 4));
    dv.lineStyle(1, C.rule, 0.4); dv.lineBetween(x, CT + 70, x + w, CT + 70);

    this._add(this.add.text(x, CT + 80, char.lore, {
      fontSize: '10px', fontFamily: 'serif', color: '#2a1a08', lineSpacing: 4,
      wordWrap: { width: w },
    }).setDepth(D + 5));
  }

  // ── NPC tab ───────────────────────────────────────────────────────────────
  // Everyone you have spoken with, plus the known roster yet to be met.
  _renderNpcs(LMX, RMX, PW, CT, CB, D) {
    const met = this._gs()?._metNpcs || new Map();

    // Roster: curated story NPCs (region order) then any extra wanderers met.
    const roster = Object.keys(NPC_CODEX).map(id => ({
      id, name: NPC_CODEX[id].name, region: NPC_CODEX[id].region,
      lore: NPC_CODEX[id].lore, found: met.has(id),
    }));
    roster.sort((a, b) => a.region - b.region);
    for (const [id, rec] of met) {
      if (NPC_CODEX[id]) continue;
      roster.push({ id, name: rec.name, region: null, lore: rec.lore, found: true });
    }

    const PAGE_SIZE = 5;
    const totalPages = Math.max(1, Math.ceil(roster.length / PAGE_SIZE));
    this._bookTotalPages = totalPages;
    const pageRoster = roster.slice(this._bookPage * PAGE_SIZE, (this._bookPage + 1) * PAGE_SIZE);

    const PAD = 16;
    const entryW = PW - PAD * 2 - 6;

    // Left — roster entries
    let y = CT;
    this._sectionHeader(LMX + PAD, y, 'SOULS  ENCOUNTERED', D); y += 20;
    for (const rec of pageRoster) {
      const h = this._npcEntry(LMX + PAD, y, entryW, rec, D);
      y += h + 5;
      if (y + 30 > CB) break;
    }
    this._pageNav(LMX, PAD, PW, CB - 2, totalPages, D);

    // Right — met progress by region
    y = CT;
    this._sectionHeader(RMX + PAD, y, 'MET  BY  REGION', D); y += 22;
    const byRegion = {};
    for (const id of Object.keys(NPC_CODEX)) {
      const r = NPC_CODEX[id].region;
      (byRegion[r] = byRegion[r] || []).push(id);
    }
    const barW = PW - PAD * 2 - 50;
    for (const rIdx of Object.keys(byRegion).map(Number).sort((a, b) => a - b)) {
      const ids = byRegion[rIdx];
      const got = ids.filter(id => met.has(id)).length;
      const pct = got / ids.length;
      this._add(this.add.text(RMX + PAD, y, REGION_LABELS[rIdx] || `Region ${rIdx}`, {
        fontSize: '10px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d2008',
      }).setDepth(D + 5));
      y += 14;
      const bg2 = this._add(this.add.graphics().setDepth(D + 4));
      bg2.fillStyle(C.barTrack, 0.7); bg2.fillRoundedRect(RMX + PAD, y, barW, 8, 4);
      if (pct > 0) {
        bg2.fillStyle(C.barFill, 0.9); bg2.fillRoundedRect(RMX + PAD, y, barW * pct, 8, 4);
        if (pct === 1) { bg2.lineStyle(1, C.gold, 0.6); bg2.strokeRoundedRect(RMX + PAD, y, barW, 8, 4); }
      }
      this._add(this.add.text(RMX + PAD + barW + 7, y + 4, `${got}/${ids.length}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#5a3a10',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      y += 20;
    }
    const totalMet = roster.filter(r => r.found).length;
    this._ornament(RMX + PW / 2, CB - 16, D);
    this._add(this.add.text(RMX + PW / 2, CB, `${totalMet} souls remembered`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
  }

  _npcEntry(x, y, w, rec, D) {
    if (!rec.found) {
      const H = 30;
      const eg = this._add(this.add.graphics().setDepth(D + 4));
      eg.fillStyle(C.missedBg, 0.4); eg.fillRoundedRect(x, y, w, H, 3);
      eg.fillStyle(C.lockedGrey, 0.5); eg.fillRect(x, y, 3, H);
      this._add(this.add.text(x + 10, y + H / 2, '???  —  not yet encountered', {
        fontSize: '9px', fontFamily: 'serif', fontStyle: 'italic', color: '#888866',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      return H;
    }
    const H = 74;
    const eg = this._add(this.add.graphics().setDepth(D + 4));
    eg.fillStyle(C.loreBg, 0.45); eg.fillRoundedRect(x, y, w, H, 3);
    eg.fillStyle(0x2a6a8b, 0.7); eg.fillRect(x, y, 3, H);
    this._add(this.add.text(x + 8, y + 6, rec.name, {
      fontSize: '10.5px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    this._add(this.add.text(x + 8, y + 20, rec.lore, {
      fontSize: '8px', fontFamily: 'serif', color: '#2a1a08',
      wordWrap: { width: w - 16 },
    }).setDepth(D + 5));
    if (rec.region != null) {
      this._add(this.add.text(x + 8, y + H - 10, `— ${REGION_LABELS[rec.region] || `Region ${rec.region}`}`, {
        fontSize: '7.5px', fontFamily: 'serif', fontStyle: 'italic', color: '#7a5030',
      }).setDepth(D + 5));
    }
    return H;
  }

  // Clickable ◄ Prev / Next ► row (keyboard ▲ ▼ also page via _bookPageStep).
  _pageNav(LMX, PAD, PW, navY, totalPages, D) {
    if (this._bookPage > 0) {
      const prev = this._add(this.add.text(LMX + PAD, navY, '◄ Prev', {
        fontSize: '10px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(0, 1).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      prev.on('pointerover', () => prev.setColor('#c8900a'));
      prev.on('pointerout',  () => prev.setColor('#5a3a10'));
      prev.on('pointerdown', () => { this._bookPage--; this._renderBook(); });
    }
    this._add(this.add.text(LMX + PW / 2, navY, `${this._bookPage + 1}  /  ${totalPages}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));
    if (this._bookPage < totalPages - 1) {
      const next = this._add(this.add.text(LMX + PW - PAD, navY, 'Next ►', {
        fontSize: '10px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(1, 1).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      next.on('pointerover', () => next.setColor('#c8900a'));
      next.on('pointerout',  () => next.setColor('#5a3a10'));
      next.on('pointerdown', () => { this._bookPage++; this._renderBook(); });
    }
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  _sectionHeader(x, y, label, D) {
    this._add(this.add.text(x, y, label, {
      fontSize: '9.5px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#5a3010', letterSpacing: 2,
    }).setDepth(D + 5));
    const dg = this._add(this.add.graphics().setDepth(D + 4));
    dg.lineStyle(1, C.rule, 0.4);
    dg.lineBetween(x, y + 15, x + 440, y + 15);
  }

  _ornament(cx, y, D) {
    this._add(this.add.text(cx, y, '— ✦ —', {
      fontSize: '10px', fontFamily: 'serif', color: '#8b6a3a',
    }).setOrigin(0.5).setDepth(D + 5));
  }
}
