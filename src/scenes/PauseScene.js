import { GAME_W, GAME_H } from '../constants.js';
import { QUESTS, LORE_FRAGMENTS } from '../data/quests.js';

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

    this.add.text(GAME_W / 2, GAME_H / 2 - 90, 'PAUSED', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this._menuItems = [
      { label: 'RESUME',    action: () => this._resume()   },
      { label: 'CODEX',     action: () => this._openBook() },
      { label: 'MAIN MENU', action: () => this._mainMenu() },
    ];
    this._selIdx = 0;
    this._buttons = this._menuItems.map((item, i) =>
      this._makeButton(GAME_W / 2, GAME_H / 2 - 20 + i * 58, item.label, item.action, i));

    this._cursor = this.add.text(0, 0, '►', {
      fontSize: '15px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5);
    this._updateCursor();

    this.add.text(GAME_W / 2, GAME_H / 2 + 160,
      '↑↓ Navigate   Enter / Space — Confirm   Esc — Resume', {
        fontSize: '11px', color: '#555', fontFamily: 'monospace',
      }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-ESC',   () => this._onEsc());
    kb.on('keydown-HOME',  () => this._resume());
    kb.on('keydown-UP',    () => this._move(-1));
    kb.on('keydown-DOWN',  () => this._move(1));
    kb.on('keydown-ENTER', () => this._confirm());
    kb.on('keydown-SPACE', () => this._confirm());

    this._bookOpen = false;
    this._bookObjs = [];
  }

  // ── Menu helpers ─────────────────────────────────────────────────────────

  _onEsc()    { if (this._bookOpen) { this._closeBook(); return; } this._resume(); }
  _move(d)    { if (this._bookOpen) return; this._selIdx = (this._selIdx + d + this._menuItems.length) % this._menuItems.length; this._updateCursor(); }
  _confirm()  { if (this._bookOpen) return; this._menuItems[this._selIdx].action(); }

  _updateCursor() {
    this._cursor.setPosition(GAME_W / 2 - 140, GAME_H / 2 - 20 + this._selIdx * 58);
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
    zone.on('pointerover', () => { this._selIdx = idx; this._updateCursor(); }).on('pointerdown', onClick);
    return { bg, txt, zone };
  }

  _resume()   { this.scene.get('GameScene')?.togglePause(); }
  _mainMenu() { this.scene.stop('GameScene'); this.scene.stop('UIScene'); this.scene.stop('PauseScene'); this.scene.start('MainMenuScene'); }

  // ── Book ─────────────────────────────────────────────────────────────────

  _openBook() {
    if (this._bookOpen) return;
    this._bookOpen = true;
    this._bookTab  = 'quests';
    this._bookPage = 0;
    this._bookObjs = [];
    this._renderBook();
  }

  _closeBook() {
    this._bookOpen = false;
    this._bookObjs.forEach(o => o.destroy());
    this._bookObjs = [];
  }

  _gs()  { return this.scene.get('GameScene'); }
  _add(o){ this._bookObjs.push(o); return o; }

  // ── Core book shell ───────────────────────────────────────────────────────

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
    this._add(this.add.rectangle(BX, BY, GAME_W, GAME_H, 0x000000, 0.6).setDepth(D));

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
    const tabs = [{ k: 'quests', label: '📜  Quests' }, { k: 'lore', label: '📖  Lore' }];
    const tabW = 140, tabH = 26, tabY = T + 52;
    tabs.forEach((tab, i) => {
      const tx = BX - 76 + i * 156;
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
      tz.on('pointerdown', () => { this._bookTab = tab.k; this._bookPage = 0; this._renderBook(); });
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
    if (this._bookTab === 'quests') {
      this._renderQuests(LMX, RMX, PW, CT, CB, D);
    } else {
      this._renderLore(LMX, RMX, PW, CT, CB, D);
    }
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

    // Left — Main Quests
    let y = CT;
    this._sectionHeader(LMX + PAD, y, 'MAIN  QUESTS', D); y += 20;
    for (const q of mainQuests) {
      const h = this._questEntry(LMX + PAD, y, entryW, q, stateOf(q.id), D);
      y += h + 5;
      if (y + 40 > CB) break;
    }
    // Footer stats
    const mainDone = mainQuests.filter(q => stateOf(q.id) === 'done').length;
    this._add(this.add.text(LMX + PW / 2, CB, `${mainDone} / ${mainQuests.length} completed`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5, 1).setDepth(D + 5));

    // Right — Side Quests
    y = CT;
    this._sectionHeader(RMX + PAD, y, 'SIDE  QUESTS', D); y += 20;
    for (const q of sideQuests) {
      const h = this._questEntry(RMX + PAD, y, entryW, q, stateOf(q.id), D);
      y += h + 5;
      if (y + 40 > CB) break;
    }
    const sideDone = sideQuests.filter(q => stateOf(q.id) === 'done').length;
    this._ornament(RMX + PW / 2, CB - 16, D);
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
