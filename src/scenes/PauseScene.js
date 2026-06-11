import { GAME_W, GAME_H } from '../constants.js';
import { QUESTS, LORE_FRAGMENTS } from '../data/quests.js';

const REGION_NAMES = [
  'Gramavana', 'Mahāvana', 'Vrindavana',
  'Nāga Pātāl', 'Deva Mandira', 'Swarga Seema', 'Viyoga Durga',
];

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
      { label: 'CODEX',     action: () => this._openBook() },
      { label: 'MAIN MENU', action: () => this._mainMenu() },
    ];
    this._selIdx = 0;

    this._buttons = this._menuItems.map((item, i) => {
      return this._makeButton(GAME_W / 2, GAME_H / 2 + i * 60, item.label, item.action, i);
    });

    this._cursor = this.add.text(0, 0, '►', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5);
    this._updateCursor();

    this.add.text(GAME_W / 2, GAME_H / 2 + 170,
      '↑↓ Navigate   Enter/Space Confirm   Esc/Home — Resume', {
        fontSize: '12px', color: '#666', fontFamily: 'monospace',
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

  _onEsc() {
    if (this._bookOpen) { this._closeBook(); return; }
    this._resume();
  }

  _updateCursor() {
    const base = GAME_H / 2;
    this._cursor.setPosition(GAME_W / 2 - 140, base + this._selIdx * 60);
    this._buttons.forEach((b, i) => {
      b.txt.setColor(i === this._selIdx ? '#ffd700' : '#aaaaaa');
      b.bg.setFillStyle(i === this._selIdx ? 0x2a2a4e : 0x1a1a2e);
    });
  }

  _move(dir) {
    if (this._bookOpen) return;
    this._selIdx = (this._selIdx + dir + this._menuItems.length) % this._menuItems.length;
    this._updateCursor();
  }

  _confirm() {
    if (this._bookOpen) return;
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

  // ── Book ─────────────────────────────────────────────────────────────────

  _openBook() {
    if (this._bookOpen) return;
    this._bookOpen  = true;
    this._bookTab   = 'quests'; // 'quests' | 'lore'
    this._bookPage  = 0;
    this._bookObjs  = [];
    this._renderBook();
  }

  _closeBook() {
    this._bookOpen = false;
    this._bookObjs.forEach(o => o.destroy());
    this._bookObjs = [];
  }

  _getManagers() {
    const gs = this.scene.get('GameScene');
    return {
      questManager: gs?.questManager || null,
      loreManager:  gs?.loreManager  || null,
    };
  }

  _add(obj) { this._bookObjs.push(obj); return obj; }

  _renderBook() {
    this._bookObjs.forEach(o => o.destroy());
    this._bookObjs = [];

    const BW = 960, BH = 580;
    const BX = GAME_W / 2, BY = GAME_H / 2;
    const L  = BX - BW / 2, T = BY - BH / 2;
    const D  = 50; // base depth

    // ── Backdrop ──────────────────────────────────────────────────────────
    this._add(this.add.rectangle(BX, BY, GAME_W, GAME_H, 0x000000, 0.55).setDepth(D));

    // ── Book cover ───────────────────────────────────────────────────────
    // Outer cover
    this._add(this.add.rectangle(BX, BY, BW + 24, BH + 24, 0x2c1a0e).setDepth(D + 1));
    // Left page
    this._add(this.add.rectangle(BX - 4, BY, BW / 2 - 4, BH, 0xe8d5a0).setDepth(D + 2));
    // Right page
    this._add(this.add.rectangle(BX + 4, BY, BW / 2 - 4, BH, 0xf0deb0).setDepth(D + 2));
    // Spine
    this._add(this.add.rectangle(BX, BY, 14, BH, 0x1a0c04).setDepth(D + 3));
    // Page edge shadow (left)
    this._add(this.add.rectangle(BX - 8, BY, 12, BH, 0x000000, 0.18).setDepth(D + 3));
    this._add(this.add.rectangle(BX + 8, BY, 12, BH, 0x000000, 0.10).setDepth(D + 3));

    // ── Header / title ────────────────────────────────────────────────────
    this._add(this.add.text(BX, T + 22, 'CODEX  OF  AKHAND  SUTRA', {
      fontSize: '15px', fontFamily: 'serif', fontStyle: 'bold',
      color: '#3d1f05', stroke: '#c8a060', strokeThickness: 1,
    }).setOrigin(0.5, 0).setDepth(D + 4));

    // Decorative divider
    const dvd = this.add.graphics().setDepth(D + 4);
    dvd.lineStyle(1, 0x8b5a2b, 0.6);
    dvd.lineBetween(L + 30, T + 46, L + BW - 30, T + 46);
    this._bookObjs.push(dvd);

    // ── Tabs ──────────────────────────────────────────────────────────────
    const tabs = [
      { key: 'quests', label: '📜 Quests' },
      { key: 'lore',   label: '📖 Lore'   },
    ];
    tabs.forEach((tab, i) => {
      const tx = BX - 90 + i * 180;
      const ty = T + 66;
      const isActive = tab.key === this._bookTab;
      const tabBg = this._add(this.add.rectangle(tx, ty, 160, 28,
        isActive ? 0xc8a060 : 0xb09050, isActive ? 1 : 0.5).setDepth(D + 4));
      tabBg.setStrokeStyle(1, 0x6b3d0a, 0.9);
      this._add(this.add.text(tx, ty, tab.label, {
        fontSize: '13px', fontFamily: 'serif', fontStyle: isActive ? 'bold' : 'normal',
        color: isActive ? '#1a0800' : '#4a3010',
      }).setOrigin(0.5).setDepth(D + 5));
      const zone = this._add(this.add.zone(tx, ty, 160, 28).setInteractive({ useHandCursor: true }).setDepth(D + 6));
      zone.on('pointerdown', () => { this._bookTab = tab.key; this._bookPage = 0; this._renderBook(); });
    });

    // Close button
    const closeBg = this._add(this.add.rectangle(L + BW - 20, T + 20, 28, 28, 0x6b1a1a, 0.85).setDepth(D + 5));
    closeBg.setStrokeStyle(1, 0xff6666, 0.7);
    this._add(this.add.text(L + BW - 20, T + 20, '✕', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(D + 6));
    const closeZone = this._add(this.add.zone(L + BW - 20, T + 20, 28, 28).setInteractive({ useHandCursor: true }).setDepth(D + 7));
    closeZone.on('pointerdown', () => this._closeBook());

    // ── Content area ──────────────────────────────────────────────────────
    const contentTop = T + 90;
    const contentBot = T + BH - 44;
    const contentH   = contentBot - contentTop;
    const halfW      = BW / 2 - 40;

    if (this._bookTab === 'quests') {
      this._renderQuestTab(L, T, BW, contentTop, contentH, halfW, D);
    } else {
      this._renderLoreTab(L, T, BW, contentTop, contentH, halfW, D);
    }
  }

  _renderQuestTab(L, T, BW, contentTop, contentH, halfW, D) {
    const { questManager } = this._getManagers();
    const BX = GAME_W / 2;

    // Collect all quests with their state
    const allQuests = Object.values(QUESTS).map(q => ({
      ...q,
      state: questManager?.completed.has(q.id) ? 'done'
           : questManager?.active.has(q.id)    ? 'active'
           : 'locked',
    }));

    const mainQuests = allQuests.filter(q => q.type === 'main');
    const sideQuests = allQuests.filter(q => q.type === 'side');

    // Left page — main quests
    const lx = L + 28;
    let y = contentTop;

    this._add(this.add.text(lx, y, 'MAIN QUESTS', {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    y += 18;

    const rowH = 52;
    const leftPageBottom = contentTop + contentH;

    for (const q of mainQuests) {
      if (y + rowH > leftPageBottom) break;
      this._drawQuestRow(lx, y, halfW - 10, q, D);
      y += rowH;
    }

    // Right page — side quests
    const rx = BX + 20;
    y = contentTop;

    this._add(this.add.text(rx, y, 'SIDE QUESTS', {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    y += 18;

    for (const q of sideQuests) {
      if (y + rowH > leftPageBottom) break;
      this._drawQuestRow(rx, y, halfW - 10, q, D);
      y += rowH;
    }

    // Stats footer
    const done = allQuests.filter(q => q.state === 'done').length;
    const total = allQuests.length;
    this._add(this.add.text(BX, T + contentH + contentTop - T - 14,
      `${done} / ${total} quests completed`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#7a5a30',
      }).setOrigin(0.5).setDepth(D + 5));
  }

  _drawQuestRow(x, y, w, q, D) {
    const icon  = q.state === 'done'   ? '✓' : q.state === 'active' ? '►' : '○';
    const color = q.state === 'done'   ? '#2d6e2d'
                : q.state === 'active' ? '#8b5a00'
                : '#777755';
    const bgCol = q.state === 'done'   ? 0xd4eacc
                : q.state === 'active' ? 0xf0e0b0
                : 0xe8e0c8;

    this._add(this.add.rectangle(x + w / 2, y + 20, w, 46, bgCol, 0.6).setDepth(D + 4));

    this._add(this.add.text(x + 6, y + 6, icon + ' ' + q.title, {
      fontSize: '12px', fontFamily: 'serif', fontStyle: 'bold', color,
      wordWrap: { width: w - 12 },
    }).setDepth(D + 5));

    this._add(this.add.text(x + 14, y + 23, q.desc, {
      fontSize: '9px', fontFamily: 'serif', color: '#3d2a10',
      wordWrap: { width: w - 20 },
    }).setDepth(D + 5));
  }

  _renderLoreTab(L, T, BW, contentTop, contentH, halfW, D) {
    const { loreManager } = this._getManagers();
    const BX = GAME_W / 2;

    const collectedIds = new Set(loreManager?.toArray() || []);
    const totalCollected = collectedIds.size;
    const total = LORE_FRAGMENTS.length;

    // Group by region
    const byRegion = {};
    for (const frag of LORE_FRAGMENTS) {
      if (!byRegion[frag.region]) byRegion[frag.region] = [];
      byRegion[frag.region].push(frag);
    }
    const regions = Object.keys(byRegion).map(Number).sort();

    // Paginate: one region per page-spread (left = region header + entries, right = overflow)
    const PAGE_SIZE = 5; // entries per page
    const allFrags = LORE_FRAGMENTS; // in order
    const pageStart = this._bookPage * PAGE_SIZE;
    const pageFrags = allFrags.slice(pageStart, pageStart + PAGE_SIZE);
    const totalPages = Math.ceil(allFrags.length / PAGE_SIZE);

    // Left side — page of lore entries
    const lx = L + 28;
    let y = contentTop;

    this._add(this.add.text(lx, y, 'LORE FRAGMENTS', {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    y += 18;

    for (const frag of pageFrags) {
      const collected = collectedIds.has(frag.id);
      this._drawLoreEntry(lx, y, BW - 56, frag, collected, D);
      y += collected ? 76 : 38;
    }

    // Right side — region map / progress
    const rx = BX + 20;
    y = contentTop;

    this._add(this.add.text(rx, y, 'BY REGION', {
      fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
    }).setDepth(D + 5));
    y += 20;

    for (const rIdx of regions) {
      const frags = byRegion[rIdx];
      const got   = frags.filter(f => collectedIds.has(f.id)).length;
      const pct   = frags.length ? got / frags.length : 0;
      const name  = REGION_NAMES[rIdx] || `Region ${rIdx}`;

      this._add(this.add.text(rx, y, name, {
        fontSize: '10px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d2008',
      }).setDepth(D + 5));
      y += 13;

      // Progress bar
      const barW = halfW - 20;
      this._add(this.add.rectangle(rx + barW / 2, y + 5, barW, 8, 0xc4b08a).setDepth(D + 4));
      if (pct > 0) this._add(this.add.rectangle(rx + (barW * pct) / 2, y + 5, barW * pct, 8, 0x5a8c3a).setDepth(D + 5));
      this._add(this.add.text(rx + barW + 6, y + 5, `${got}/${frags.length}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#5a3a10',
      }).setOrigin(0, 0.5).setDepth(D + 5));
      y += 20;
    }

    // Pagination controls
    const navY = T + contentH + contentTop - T - 12;
    if (this._bookPage > 0) {
      const prev = this._add(this.add.text(L + 50, navY, '◄ PREV', {
        fontSize: '11px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(0.5).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      prev.on('pointerdown', () => { this._bookPage--; this._renderBook(); });
    }
    this._add(this.add.text(BX, navY, `Page ${this._bookPage + 1} / ${totalPages}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5).setDepth(D + 5));
    if (this._bookPage < totalPages - 1) {
      const next = this._add(this.add.text(L + BW - 50, navY, 'NEXT ►', {
        fontSize: '11px', fontFamily: 'serif', color: '#5a3a10',
      }).setOrigin(0.5).setDepth(D + 5).setInteractive({ useHandCursor: true }));
      next.on('pointerdown', () => { this._bookPage++; this._renderBook(); });
    }

    // Total collected footer
    this._add(this.add.text(BX, navY - 14, `${totalCollected} / ${total} fragments collected`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7a5a30',
    }).setOrigin(0.5).setDepth(D + 5));
  }

  _drawLoreEntry(x, y, w, frag, collected, D) {
    const bgCol = collected ? 0xe8d4a0 : 0xd8ceb0;
    const h     = collected ? 72 : 34;

    this._add(this.add.rectangle(x + w / 2, y + h / 2, w, h - 4, bgCol, 0.7).setDepth(D + 4));

    if (collected) {
      const regionName = REGION_NAMES[frag.region] || `Region ${frag.region}`;
      this._add(this.add.text(x + 6, y + 4, frag.title, {
        fontSize: '11px', fontFamily: 'serif', fontStyle: 'bold', color: '#3d1f05',
      }).setDepth(D + 5));
      this._add(this.add.text(x + 6, y + 18, frag.text.replace('⟨Lore Fragment⟩ ', ''), {
        fontSize: '9px', fontFamily: 'serif', color: '#2a1a08',
        wordWrap: { width: w - 12 },
      }).setDepth(D + 5));
      this._add(this.add.text(x + 6, y + 57, `— ${regionName}`, {
        fontSize: '8px', fontFamily: 'serif', fontStyle: 'italic', color: '#7a5030',
      }).setDepth(D + 5));
    } else {
      this._add(this.add.text(x + 6, y + 6, '??? — Fragment not yet discovered', {
        fontSize: '10px', fontFamily: 'serif', fontStyle: 'italic', color: '#888866',
      }).setDepth(D + 5));
    }
  }

  // ── Nav ──────────────────────────────────────────────────────────────────

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
