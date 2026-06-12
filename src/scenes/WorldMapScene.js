import { GAME_W, GAME_H, REGION_NAMES } from '../constants.js';
import { ExploredManager } from '../systems/ExploredManager.js';
import { MAP_LAYOUT, ACT_COLORS, fallbackPos } from '../data/worldMapLayout.js';

// ── palette ─────────────────────────────────────────────────────────────────
const C = {
  backdrop:  0x05060a,
  panel:     0x0d1018,
  panelEdge: 0x2a3550,
  thread:    0xe8c860,   // the unbroken Sutra thread (explored↔explored edge)
  threadDim: 0x3a4055,   // edge touching an unexplored region
  lockFill:  0x14161c,
  lockEdge:  0x3a4150,
  lockInk:   0x6b7286,
  ink:       '#dfe6f2',
  inkDim:    '#8893a8',
  gold:      '#e8c860',
};

const NODE_W = 176;   // thumbnail width
const NODE_H = 110;   // thumbnail height (16:10, matches the 3200×2000 maps)
const HIT_H  = 150;   // node hit area incl. label
const PANEL_W = 340;  // right-hand detail panel width

export class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMapScene'); }

  init(data) {
    this._from        = data?.from || 'menu';
    this._fromScene   = this._from === 'game' ? 'GameScene'
                      : this._from === 'pause' ? 'PauseScene' : 'MainMenuScene';
    this._current     = data?.currentRegion ?? 0;
  }

  create() {
    // Freeze the launcher scene's input so clicks/keys don't fall through to the
    // game or menu rendered beneath the map.
    this._launcher = this.scene.get(this._fromScene);
    if (this._launcher?.input) {
      this._launcher.input.enabled = false;
      if (this._launcher.input.keyboard) this._launcher.input.keyboard.enabled = false;
    }

    // Fixed backdrop (not part of the pan/zoom world) — also swallows stray input.
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.backdrop, 1).setOrigin(0).setDepth(0)
      .setInteractive();

    this._world = this.add.container(0, 0).setDepth(5);   // pan/zoom layer
    this._nodes = {};          // index -> { container, explored, data }
    this._selected = null;
    this._fullKeys = new Set(); // loaded full-image texture keys

    this._loadingTxt = this.add.text(GAME_W / 2, GAME_H / 2, 'Unrolling the map…', {
      fontSize: '18px', fontFamily: 'serif', color: C.gold,
    }).setOrigin(0.5).setDepth(50);

    this._buildHud();
    this._setupInput();
    this._loadData();
  }

  // ── Data load ───────────────────────────────────────────────────────────────
  async _loadData() {
    this._explored = ExploredManager.get();

    // Live region list (authoritative names + portal graph). Fall back gracefully.
    let regions = [];
    try {
      const res = await fetch('/api/regions');
      regions = await res.json();
    } catch { regions = []; }
    if (!this.scene.isActive()) return;

    // Screenshot manifest (index -> {full, thumb, w, h}).
    let manifest = {};
    try {
      const res = await fetch('/region_screenshots/manifest.json');
      manifest = await res.json();
    } catch { manifest = {}; }

    this._manifest = manifest;
    this._regionData = {};
    for (const r of regions) {
      if (r.regionIndex != null) this._regionData[r.regionIndex] = r.data || {};
    }

    // Queue thumbnail loads for explored regions only (locked regions stay hidden).
    let queued = 0;
    for (const idx of this._explored) {
      const m = manifest[String(idx)];
      const key = 'rthumb_' + idx;
      if (m && m.thumb && !this.textures.exists(key)) {
        this.load.image(key, encodeURI(m.thumb));
        queued++;
      }
    }
    if (queued > 0) {
      this.load.once('complete', () => this._build());
      this.load.start();
    } else {
      this._build();
    }
  }

  // ── Build the graph ─────────────────────────────────────────────────────────
  _build() {
    this._loadingTxt?.destroy();

    // Collect every region we have a layout slot for (= all 37 world regions).
    const indices = Object.keys(MAP_LAYOUT).map(Number);
    const pos = {};
    indices.forEach((idx, ord) => { pos[idx] = MAP_LAYOUT[idx] || fallbackPos(idx, ord); });

    // Edges from real portal data, deduped & undirected.
    const edgeSet = new Set();
    const edges = [];
    for (const idx of indices) {
      const portals = this._regionData[idx]?.portals || [];
      for (const p of portals) {
        const t = p.targetRegion;
        if (t == null || pos[t] == null) continue;
        const key = idx < t ? `${idx}-${t}` : `${t}-${idx}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push([idx, t]);
      }
    }

    // ── Draw edges (under the nodes) ──
    const g = this.add.graphics();
    this._world.add(g);
    for (const [a, b] of edges) {
      const pa = pos[a], pb = pos[b];
      const bothSeen = this._explored.has(a) && this._explored.has(b);
      g.lineStyle(bothSeen ? 5 : 2.5, bothSeen ? C.thread : C.threadDim, bothSeen ? 0.95 : 0.5);
      g.beginPath();
      g.moveTo(pa.x, pa.y);
      g.lineTo(pb.x, pb.y);
      g.strokePath();
      if (bothSeen) {  // a soft glow underlay for the live thread
        g.lineStyle(9, C.thread, 0.12);
        g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.strokePath();
      }
    }

    // ── Draw nodes ──
    for (const idx of indices) this._makeNode(idx, pos[idx]);

    // Compute world bounds for pan clamping.
    const xs = indices.map(i => pos[i].x), ys = indices.map(i => pos[i].y);
    this._bounds = {
      minX: Math.min(...xs) - 200, maxX: Math.max(...xs) + 200,
      minY: Math.min(...ys) - 200, maxY: Math.max(...ys) + 200,
    };

    // Centre on the current region.
    this._zoom = 0.5;
    this._world.setScale(this._zoom);
    const target = pos[this._current] || pos[indices[0]];
    this._world.x = (GAME_W - PANEL_W) / 2 - target.x * this._zoom;
    this._world.y = GAME_H / 2 - target.y * this._zoom;
    this._clampPan();

    this._updateCounter();
    this._showDetail(this._explored.has(this._current) ? this._current
                     : [...this._explored][0] ?? this._current);
  }

  _makeNode(idx, p) {
    const explored = this._explored.has(idx);
    const data = this._regionData[idx] || {};
    const act  = MAP_LAYOUT[idx]?.act ?? 1;
    const tag  = MAP_LAYOUT[idx]?.tag;
    const actColor = ACT_COLORS[act] || 0x888888;

    const node = this.add.container(p.x, p.y);
    const frame = this.add.graphics();

    if (explored) {
      // Frame + thumbnail + name.
      frame.fillStyle(0x0a0c12, 1);
      frame.fillRoundedRect(-NODE_W / 2 - 3, -NODE_H / 2 - 3, NODE_W + 6, NODE_H + 6, 7);
      frame.lineStyle(3, actColor, 1);
      frame.strokeRoundedRect(-NODE_W / 2 - 3, -NODE_H / 2 - 3, NODE_W + 6, NODE_H + 6, 7);
      node.add(frame);

      const tkey = 'rthumb_' + idx;
      if (this.textures.exists(tkey)) {
        const img = this.add.image(0, 0, tkey).setDisplaySize(NODE_W, NODE_H);
        node.add(img);
      } else {
        const ph = this.add.rectangle(0, 0, NODE_W, NODE_H, 0x1a2030).setStrokeStyle(1, actColor, 0.5);
        node.add(ph);
      }

      const name = data.regionName || REGION_NAMES[idx]?.split(' — ')[0] || `Region ${idx}`;
      const label = this.add.text(0, NODE_H / 2 + 8, name, {
        fontSize: '13px', fontFamily: 'serif', fontStyle: 'bold', color: C.ink,
        stroke: '#000', strokeThickness: 3, align: 'center',
        wordWrap: { width: NODE_W + 30 },
      }).setOrigin(0.5, 0);
      node.add(label);

      if (tag) node.add(this._tagBadge(tag, actColor));
    } else {
      // Locked — silhouette, no name, no screenshot.
      frame.fillStyle(C.lockFill, 1);
      frame.fillRoundedRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 7);
      frame.lineStyle(2, C.lockEdge, 1);
      frame.strokeRoundedRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 7);
      node.add(frame);
      node.add(this.add.text(0, -8, '🔒', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.6));
      node.add(this.add.text(0, 26, '? ? ?', {
        fontSize: '15px', fontFamily: 'monospace', color: '#6b7286', fontStyle: 'bold',
      }).setOrigin(0.5));
    }

    // Current-region pulsing highlight.
    if (idx === this._current) {
      const ring = this.add.graphics();
      ring.lineStyle(3, 0xffffff, 0.9);
      ring.strokeRoundedRect(-NODE_W / 2 - 8, -NODE_H / 2 - 8, NODE_W + 16, NODE_H + 16, 9);
      node.add(ring);
      this.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
    }

    // Selection outline (hidden until selected).
    const sel = this.add.graphics();
    sel.lineStyle(3, 0xffffff, 1);
    sel.strokeRoundedRect(-NODE_W / 2 - 5, -NODE_H / 2 - 5, NODE_W + 10, NODE_H + 10, 8);
    sel.setVisible(false);
    node.add(sel);

    node.setSize(NODE_W, HIT_H);
    node.setInteractive(new Phaser.Geom.Rectangle(-NODE_W / 2, -NODE_H / 2, NODE_W, HIT_H),
      Phaser.Geom.Rectangle.Contains);
    node.on('pointerover', () => { if (!explored) node.setAlpha(0.85); });
    node.on('pointerout',  () => node.setAlpha(1));
    node.on('pointerup',   () => { if (this._dragDist < 8) this._select(idx); });

    this._world.add(node);
    this._nodes[idx] = { container: node, sel, explored };
  }

  _tagBadge(tag, color) {
    const map = { hub: '⌂', boss: '☠', start: '✦', end: '⚑', secret: '✶' };
    const glyph = map[tag] || '•';
    const c = this.add.container(-NODE_W / 2 + 12, -NODE_H / 2 + 12);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6); bg.fillCircle(0, 0, 12);
    bg.lineStyle(1.5, color, 1); bg.strokeCircle(0, 0, 12);
    c.add(bg);
    c.add(this.add.text(0, 0, glyph, { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5));
    return c;
  }

  _select(idx) {
    for (const k in this._nodes) this._nodes[k].sel.setVisible(false);
    this._nodes[idx]?.sel.setVisible(true);
    this._selected = idx;
    this._showDetail(idx);
  }

  // ── Right-hand detail panel ──────────────────────────────────────────────────
  _showDetail(idx) {
    const explored = this._explored.has(idx);
    const data = this._regionData[idx] || {};
    const px = GAME_W - PANEL_W;

    // (Re)build the inner content holder.
    this._detailObjs?.forEach(o => o.destroy());
    this._detailObjs = [];
    const add = o => { this._detailObjs.push(o); return o; };

    if (!explored) {
      add(this.add.rectangle(px + PANEL_W / 2, 250, PANEL_W - 48, 150, 0x14161c)
        .setStrokeStyle(2, C.lockEdge).setDepth(31));
      add(this.add.text(px + PANEL_W / 2, 250, '🔒', { fontSize: '52px' }).setOrigin(0.5).setDepth(32).setAlpha(0.7));
      add(this.add.text(px + PANEL_W / 2, 350, '? ? ?', {
        fontSize: '26px', fontFamily: 'serif', fontStyle: 'bold', color: '#6b7286',
      }).setOrigin(0.5).setDepth(32));
      add(this.add.text(px + PANEL_W / 2, 392, 'Undiscovered Region', {
        fontSize: '13px', fontFamily: 'monospace', color: C.inkDim,
      }).setOrigin(0.5).setDepth(32));
      add(this.add.text(px + PANEL_W / 2, 440, 'Travel here to reveal its\nname and map.', {
        fontSize: '12px', fontFamily: 'serif', color: '#5a6276', align: 'center',
      }).setOrigin(0.5).setDepth(32));
      return;
    }

    const imgW = PANEL_W - 40, imgH = imgW * 10 / 16;
    const imgY = 150 + imgH / 2;
    add(this.add.rectangle(px + PANEL_W / 2, imgY, imgW + 4, imgH + 4, 0x000000)
      .setStrokeStyle(2, ACT_COLORS[MAP_LAYOUT[idx]?.act] || 0x888888).setDepth(31));

    const fkey = 'rfull_' + idx;
    const placeThumb = () => {
      const tkey = 'rthumb_' + idx;
      if (this.textures.exists(tkey)) {
        add(this.add.image(px + PANEL_W / 2, imgY, tkey).setDisplaySize(imgW, imgH).setDepth(31));
      }
    };
    if (this.textures.exists(fkey)) {
      add(this.add.image(px + PANEL_W / 2, imgY, fkey).setDisplaySize(imgW, imgH).setDepth(32));
    } else {
      placeThumb();  // show thumb immediately, swap to full when loaded
      const m = this._manifest?.[String(idx)];
      if (m?.full) {
        this.load.image(fkey, encodeURI(m.full));
        this.load.once('complete', () => {
          if (this._selected === idx && this.textures.exists(fkey)) this._showDetail(idx);
        });
        this.load.start();
      }
    }

    const name = data.regionName || REGION_NAMES[idx]?.split(' — ')[0] || `Region ${idx}`;
    const sub  = data.regionSubtitle || REGION_NAMES[idx]?.split(' — ')[1] || '';
    let ty = imgY + imgH / 2 + 18;
    add(this.add.text(px + PANEL_W / 2, ty, name, {
      fontSize: '21px', fontFamily: 'serif', fontStyle: 'bold', color: C.gold, align: 'center',
      wordWrap: { width: PANEL_W - 36 },
    }).setOrigin(0.5, 0).setDepth(32));
    ty += 30;
    if (sub) {
      add(this.add.text(px + PANEL_W / 2, ty, sub, {
        fontSize: '13px', fontFamily: 'serif', fontStyle: 'italic', color: C.inkDim, align: 'center',
        wordWrap: { width: PANEL_W - 36 },
      }).setOrigin(0.5, 0).setDepth(32));
      ty += 26;
    }
    add(this.add.text(px + PANEL_W / 2, ty + 6, '✦ Explored', {
      fontSize: '12px', fontFamily: 'monospace', color: '#6bbf6b',
    }).setOrigin(0.5, 0).setDepth(32));
  }

  // ── Fixed HUD (title, legend, panel frame, hints) ────────────────────────────
  _buildHud() {
    // Title bar.
    this.add.text(28, 20, 'WORLD  MAP', {
      fontSize: '26px', fontFamily: 'serif', fontStyle: 'bold', color: C.gold,
      stroke: '#000', strokeThickness: 4,
    }).setDepth(30);
    this.add.text(30, 52, 'The Fractured Realm of Akhand', {
      fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic', color: C.inkDim,
    }).setDepth(30);

    this._counter = this.add.text(30, 74, '', {
      fontSize: '12px', fontFamily: 'monospace', color: C.ink,
    }).setDepth(30);

    // Right detail panel frame.
    const px = GAME_W - PANEL_W;
    this.add.rectangle(px, 0, PANEL_W, GAME_H, C.panel, 0.92).setOrigin(0).setDepth(28);
    this.add.rectangle(px, 0, 2, GAME_H, C.panelEdge).setOrigin(0).setDepth(29);
    this.add.text(px + PANEL_W / 2, 24, 'REGION', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: C.inkDim,
    }).setOrigin(0.5).setDepth(30);

    // Legend (bottom-left).
    this._buildLegend();

    // Hints.
    this.add.text(30, GAME_H - 22,
      'Drag / Arrows — Pan    Scroll / + − — Zoom    Click — Inspect    M / Esc — Close', {
        fontSize: '11px', fontFamily: 'monospace', color: '#5a6276',
      }).setDepth(30);

    // Close button.
    const cb = this.add.text(px - 36, 20, '✕', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ff8888',
    }).setDepth(30).setInteractive({ useHandCursor: true });
    cb.on('pointerup', () => this._close());
  }

  _buildLegend() {
    const items = [
      ['Mortal Vale',    ACT_COLORS[1]], ['Drowned Reach', ACT_COLORS[2]],
      ['Emberwastes',    ACT_COLORS[3]], ['Skyward Climb', ACT_COLORS[4]],
      ['Sunless Deep',   ACT_COLORS[5]], ['The Severance', ACT_COLORS[6]],
      ['Erased Path ✶',  ACT_COLORS[7]],
    ];
    const x0 = 30, y0 = GAME_H - 150;
    this.add.text(x0, y0 - 20, 'PROVINCES', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: C.inkDim,
    }).setDepth(30);
    items.forEach(([label, color], i) => {
      const y = y0 + i * 17;
      this.add.rectangle(x0 + 6, y + 6, 12, 12, color).setOrigin(0.5).setDepth(30);
      this.add.text(x0 + 18, y, label, {
        fontSize: '11px', fontFamily: 'monospace', color: C.ink,
      }).setDepth(30);
    });
  }

  _updateCounter() {
    const total = Object.keys(MAP_LAYOUT).length;
    const n = [...this._explored].filter(i => MAP_LAYOUT[i] != null).length;
    this._counter.setText(`Explored  ${n} / ${total}  regions`);
  }

  // ── Pan / zoom / keyboard input ──────────────────────────────────────────────
  _setupInput() {
    this._dragging = false;
    this._dragDist = 0;
    this._lastX = 0; this._lastY = 0;

    this.input.on('pointerdown', (p) => {
      this._dragging = true; this._dragDist = 0;
      this._lastX = p.x; this._lastY = p.y;
    });
    this.input.on('pointermove', (p) => {
      if (!this._dragging || !this._world) return;
      const dx = p.x - this._lastX, dy = p.y - this._lastY;
      this._dragDist += Math.abs(dx) + Math.abs(dy);
      this._world.x += dx; this._world.y += dy;
      this._lastX = p.x; this._lastY = p.y;
      this._clampPan();
    });
    this.input.on('pointerup', () => { this._dragging = false; });

    this.input.on('wheel', (p, over, dx, dy) => {
      this._zoomAt(p.x, p.y, dy < 0 ? 1.12 : 0.89);
    });

    const kb = this.input.keyboard;
    kb.on('keydown-ESC', () => this._close());
    kb.on('keydown-M',   () => this._close());
    kb.on('keydown-LEFT',  () => this._panBy(120, 0));
    kb.on('keydown-RIGHT', () => this._panBy(-120, 0));
    kb.on('keydown-UP',    () => this._panBy(0, 120));
    kb.on('keydown-DOWN',  () => this._panBy(0, -120));
    kb.on('keydown-PLUS',  () => this._zoomAt(GAME_W / 2, GAME_H / 2, 1.15));
    kb.on('keydown-MINUS', () => this._zoomAt(GAME_W / 2, GAME_H / 2, 0.87));
    kb.on('keydown-EQUALS',() => this._zoomAt(GAME_W / 2, GAME_H / 2, 1.15));
  }

  _panBy(dx, dy) {
    if (!this._world) return;
    this._world.x += dx; this._world.y += dy;
    this._clampPan();
  }

  _zoomAt(px, py, factor) {
    if (!this._world) return;
    const old = this._zoom;
    const next = Phaser.Math.Clamp(old * factor, 0.22, 1.4);
    if (next === old) return;
    const wx = (px - this._world.x) / old;
    const wy = (py - this._world.y) / old;
    this._zoom = next;
    this._world.setScale(next);
    this._world.x = px - wx * next;
    this._world.y = py - wy * next;
    this._clampPan();
  }

  _clampPan() {
    if (!this._world || !this._bounds) return;
    const z = this._zoom;
    const viewW = GAME_W - PANEL_W;
    // Keep at least part of the graph within the viewport.
    const minX = viewW - this._bounds.maxX * z;
    const maxX = -this._bounds.minX * z;
    const minY = GAME_H - this._bounds.maxY * z;
    const maxY = -this._bounds.minY * z;
    this._world.x = Phaser.Math.Clamp(this._world.x, Math.min(minX, maxX), Math.max(minX, maxX));
    this._world.y = Phaser.Math.Clamp(this._world.y, Math.min(minY, maxY), Math.max(minY, maxY));
  }

  // ── Close ────────────────────────────────────────────────────────────────────
  _close() {
    if (this._launcher?.input) {
      this._launcher.input.enabled = true;
      if (this._launcher.input.keyboard) this._launcher.input.keyboard.enabled = true;
    }
    if (this._from === 'game') this.scene.get('GameScene')?.closeWorldMap();
    this.scene.stop();
  }
}
