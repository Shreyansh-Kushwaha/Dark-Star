import { WORLD_W, WORLD_H, GAME_W, GAME_H, NET_INTERVAL, TETHER_DIST, TETHER_SPEED, BOSS_TRIGGER_DIST } from '../constants.js';
import { REGIONS } from '../data/regions.js';
import { QUESTS, NPC_DIALOGUE } from '../data/quests.js';
import { Player } from '../entities/Player.js';
import { Enemy  } from '../entities/Enemy.js';
import { Boss   } from '../entities/Boss.js';
import { NPC    } from '../entities/NPC.js';
import { Projectile } from '../entities/Projectile.js';
import { AudioManager } from '../systems/AudioManager.js';
import { QuestManager } from '../systems/QuestManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { NetworkManager } from '../systems/NetworkManager.js';

// Poisson-disk sampling (returns {x,y}[] within bounds avoiding exclusion zones)
function poissonDisk(width, height, minDist, count, exclusions, seed = 42) {
  const grid = [];
  const cellSize = minDist / Math.SQRT2;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cells = new Array(cols * rows).fill(null);
  const active = [];
  const result = [];

  // Simple seeded pseudo-random
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0x100000000; };

  const inExclusion = (x, y) => exclusions.some(e => {
    const dx = x - e.x, dy = y - e.y;
    return Math.sqrt(dx*dx + dy*dy) < (e.r || 160);
  });

  const cellIdx = (x, y) => {
    const ci = Math.floor(x / cellSize);
    const ri = Math.floor(y / cellSize);
    return ri * cols + ci;
  };

  const valid = (x, y) => {
    if (x < 20 || x > width - 20 || y < 20 || y > height - 20) return false;
    if (inExclusion(x, y)) return false;
    const ci = Math.floor(x / cellSize);
    const ri = Math.floor(y / cellSize);
    for (let dri = -2; dri <= 2; dri++) {
      for (let dci = -2; dci <= 2; dci++) {
        const ni = (ri + dri) * cols + (ci + dci);
        if (ni < 0 || ni >= cells.length || !cells[ni]) continue;
        const nb = cells[ni];
        const dx = x - nb.x, dy = y - nb.y;
        if (Math.sqrt(dx*dx + dy*dy) < minDist) return false;
      }
    }
    return true;
  };

  // Initial point
  const px = width / 2 + (rand() - 0.5) * 100;
  const py = height / 2 + (rand() - 0.5) * 100;
  if (!inExclusion(px, py)) {
    const p = { x: px, y: py };
    cells[cellIdx(px, py)] = p;
    active.push(p);
    result.push(p);
  }

  const MAX_TRIES = 30;
  while (active.length && result.length < count) {
    const idx = Math.floor(rand() * active.length);
    const base = active[idx];
    let found = false;
    for (let k = 0; k < MAX_TRIES; k++) {
      const angle = rand() * Math.PI * 2;
      const radius = minDist * (1 + rand());
      const nx = base.x + Math.cos(angle) * radius;
      const ny = base.y + Math.sin(angle) * radius;
      if (valid(nx, ny)) {
        const np = { x: nx, y: ny };
        cells[cellIdx(nx, ny)] = np;
        active.push(np);
        result.push(np);
        found = true;
        if (result.length >= count) break;
      }
    }
    if (!found) active.splice(idx, 1);
  }
  return result;
}

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this._initData = data || {};
  }

  create() {
    const data = this._initData;
    const saveData = SaveManager.load() || SaveManager.defaults();
    this._save = saveData;
    const regionIndex = data.regionIndex ?? saveData.regionIndex ?? 0;
    this._regionIndex = regionIndex;
    const region = REGIONS[regionIndex];

    // Systems
    this.audio  = new AudioManager();
    this.questManager = new QuestManager();
    this.questManager.load(saveData.completedQuests || []);
    this.network = new NetworkManager();

    // Physics world
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── World setup ────────────────────────────────────────────────
    this._setupWorld(region);

    // ── Players ───────────────────────────────────────────────────
    const spawnPos = region.spawnPos;
    this.players = [];

    const p1 = new Player(this, spawnPos.x, spawnPos.y, true, saveData);
    this.players.push(p1);

    // P2: spawn next to P1 (will be controlled by remote or follow AI)
    const p2 = new Player(this, spawnPos.x + 60, spawnPos.y, false, saveData);
    p2.isLocal = false; // will be set true if P2 joins
    this.players.push(p2);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(p1, true, 0.1, 0.1);

    // ── Input ─────────────────────────────────────────────────────
    this._cursors = this.input.keyboard.createCursorKeys();
    this._keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      K: Phaser.Input.Keyboard.KeyCodes.K,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      R: Phaser.Input.Keyboard.KeyCodes.R,
      F: Phaser.Input.Keyboard.KeyCodes.F,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    // ── Enemies & NPCs ────────────────────────────────────────────
    this.enemies     = [];
    this.projectiles = [];
    this.npcs        = [];
    this._spawnerTimers = [];
    this._spawnerPositions = region.spawnerPositions || [];
    this._treePositions = [];
    this._boss = null;
    this._bossTriggered = false;
    this._pressurePlates = [];
    this._plateTriggered = [false, false];
    this._plateRewardGiven = false;
    this._dialogueActive = false;
    this._dialogueLine = '';
    this._interactTarget = null;
    this._netTimer = 0;
    this._paused = false;
    this._fixedEnemyMode = false;
    this._anyEnemyKilled = false;

    this._createNPCs(region);
    this._createSpawners(region);
    this._createPortals(region);
    this._createPressurePlates(region);
    this._createBossArena(region);

    if (region.denseForest) this._buildDenseForest(region);
    else if (region.serpentRealm) this._buildSerpentRealm(region);
    else this._buildRegionDecorations(region, regionIndex);

    this._spawnRabbitDecoration(regionIndex);

    if (regionIndex === 0 || (regionIndex === 1 && region.villageZone)) {
      this._buildVillage(region);
      this._tutorialShown = false;
    }

    // ── UI scene (overlay) ────────────────────────────────────────
    this.scene.launch('UIScene', { gameScene: this });

    // ── Event listeners ───────────────────────────────────────────
    this.events.on('spawn_projectile', this._onSpawnProjectile, this);
    this.events.on('healing_aura',     this._onHealingAura, this);
    this.events.on('ability_fx',       this._onAbilityFx, this);
    this.events.on('enemy_killed',     this._onEnemyKilled, this);
    this.events.on('boss_killed',      this._onBossKilled, this);

    this.questManager.addEventListener('quest_started', (e) => {
      this.events.emit('quest_started', e.detail);
    });
    this.questManager.addEventListener('quest_completed', (e) => {
      this.events.emit('quest_completed', e.detail);
    });
    this.questManager.addEventListener('boss_killed', () => {
      this._unlockPortalNext();
    });

    // ── Region title ──────────────────────────────────────────────
    this.time.delayedCall(500, () => {
      this.events.emit('region_title', { name: region.name, subtitle: region.subtitle });
    });

    // Start ambient audio
    this.audio.startAmbient(regionIndex);

    // Auto-trigger region main quest (skip region 0 — triggered by NPC talk)
    const QUEST_PREFIXES = ['gramavana','mahavana','vrindavana','nagapatal','devamandira','swargaseema','viyogadurga'];
    const mainQuestKey = QUEST_PREFIXES[regionIndex] + '_main';
    if (regionIndex > 0 && QUESTS[mainQuestKey]) {
      this.questManager.start(mainQuestKey, QUESTS[mainQuestKey]);
    }

    console.log(`[GameScene] Region ${regionIndex}: ${region.name}`);
  }

  _setupWorld(region) {
    const g = this.add.graphics().setDepth(-10);

    // Base ground fill
    g.fillStyle(region.bgColor, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Subtle variation: scatter darker/lighter patches using a seeded pattern
    g.fillStyle(region.bgColor2, 0.5);
    const PATCH = 120;
    const cols = Math.ceil(WORLD_W / PATCH);
    const rows = Math.ceil(WORLD_H / PATCH);
    // Simple deterministic checkerboard-ish patches
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Use a simple hash to decide whether to draw a patch
        const hash = (r * 7 + c * 13 + r * c) % 5;
        if (hash < 2) {
          const px = c * PATCH + (hash * 12 % PATCH);
          const py = r * PATCH + (hash * 17 % PATCH);
          const pw = PATCH * 0.55 + hash * 10;
          const ph = PATCH * 0.55 + hash * 8;
          g.fillRect(px, py, pw, ph);
        }
      }
    }

    // Thin edge vignette (darker strip around the world)
    const VIGN = 60;
    const border = region.borderColor || 0x000000;
    g.fillStyle(border, 0.6);
    g.fillRect(0, 0, WORLD_W, VIGN);             // top
    g.fillRect(0, WORLD_H - VIGN, WORLD_W, VIGN); // bottom
    g.fillRect(0, 0, VIGN, WORLD_H);             // left
    g.fillRect(WORLD_W - VIGN, 0, VIGN, WORLD_H); // right

    // Dark overlay for Viyoga Durga
    if (region.darkOverlay) {
      this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x000000, 0.35)
        .setOrigin(0, 0).setDepth(-9);
    }

    // World border line
    const borderGfx = this.add.graphics().setDepth(100);
    borderGfx.lineStyle(3, region.borderColor || 0x333333, 0.9);
    borderGfx.strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);
  }

  _createNPCs(region) {
    for (const npcCfg of (region.npcPositions || [])) {
      const npc = new NPC(this, npcCfg.x, npcCfg.y, npcCfg);
      this.npcs.push(npc);
    }
  }

  _createSpawners(region) {
    if (region.fixedEnemies?.length) {
      this._spawnFixedEnemies(region);
    }

    if (region.enemySpawnMode === 'fixed') return;

    for (let i = 0; i < this._spawnerPositions.length; i++) {
      const pos = this._spawnerPositions[i];
      const gfx = this.add.graphics();
      gfx.fillStyle(0x440000, 0.4);
      gfx.fillCircle(pos.x, pos.y, 20);
      gfx.setDepth(-5);

      this._spawnEnemyGroup(pos, region);

      const timer = this.time.addEvent({
        delay: 25000,
        loop: true,
        callback: () => { if (!this._paused) this._spawnEnemyGroup(pos, region); },
      });
      this._spawnerTimers.push(timer);
    }
  }

  _spawnFixedEnemies(region) {
    for (const cfg of region.fixedEnemies) {
      const enemy = new Enemy(this, cfg.x, cfg.y, cfg.type, region.difficulty);
      this.enemies.push(enemy);
    }
    this._fixedEnemyMode = true;
    this._anyEnemyKilled = false;
  }

  _spawnEnemyGroup(pos, region) {
    const types = region.enemyTypes || ['melee'];
    const type  = types[Math.floor(Math.random() * types.length)];
    // Region 0 is a tutorial — spawn only 1–2 per group
    const isTutorial = this._regionIndex === 0;
    const count = isTutorial ? (1 + Math.floor(Math.random() * 2)) : (2 + Math.floor(Math.random() * 2));
    for (let i = 0; i < count; i++) {
      const x = pos.x + (Math.random() - 0.5) * 120;
      const y = pos.y + (Math.random() - 0.5) * 120;
      const enemy = new Enemy(this, x, y, type, REGIONS[this._regionIndex].difficulty);
      this.enemies.push(enemy);
    }
  }

  _createPortals(region) {
    this._portals = {};

    if (region.portalBack) {
      this._portals.back = this._makePortal(region.portalBack.x, region.portalBack.y, 0x44aaff, 'BACK', true);
    }
    if (region.portalNext) {
      this._portals.next = this._makePortal(region.portalNext.x, region.portalNext.y, 0xffaa44, 'NEXT', this._regionIndex === 0);
      if (this._regionIndex > 0) {
        // Locked until boss killed
        this._portals.next.locked = true;
        this._portals.next.visual.setAlpha(0.3);
      }
    }
  }

  _makePortal(x, y, color, label, unlocked) {
    const gfx = this.add.graphics();
    const drawPortal = (alpha) => {
      gfx.clear();
      gfx.lineStyle(3, color, alpha);
      gfx.strokeCircle(x, y, 32);
      gfx.fillStyle(color, alpha * 0.2);
      gfx.fillCircle(x, y, 32);
    };
    drawPortal(1);

    const text = this.add.text(x, y - 44, label === 'BACK' ? '← BACK' : 'NEXT →', {
      fontSize: '12px', color: '#' + color.toString(16).padStart(6,'0'),
      fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(100);

    // Pulsing tween
    this.tweens.add({
      targets: gfx, alpha: { from: 0.6, to: 1 },
      duration: 800, yoyo: true, repeat: -1,
    });

    const portal = { x, y, color, label, unlocked, visual: gfx, text };
    return portal;
  }

  _unlockPortalNext() {
    if (this._portals?.next) {
      this._portals.next.locked = false;
      this._portals.next.visual.setAlpha(1);
      this.audio.portal();
      this.events.emit('show_dialogue', { text: '⟨Portal⟩ The path forward is open.' });
      this.time.delayedCall(2500, () => this.events.emit('hide_dialogue'));
    }
  }

  _createPressurePlates(region) {
    for (let i = 0; i < (region.platePositions || []).length; i++) {
      const pos = region.platePositions[i];
      const plate = this.add.circle(pos.x, pos.y, 20, 0x886644, 0.7);
      plate.setStrokeStyle(2, 0xddaa66);
      plate.setDepth(-3);
      const label = this.add.text(pos.x, pos.y - 28, '[STEP]', {
        fontSize: '10px', color: '#ccaa66', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this._pressurePlates.push({ ...pos, gfx: plate, label, triggered: false });
    }
  }

  _createBossArena(region) {
    if (!region.bossKey) return;
    const bp = region.bossPos;

    // Arena circle
    const arena = this.add.graphics();
    arena.lineStyle(2, 0x882222, 0.5);
    arena.strokeCircle(bp.x, bp.y, BOSS_TRIGGER_DIST);
    arena.setDepth(-5);

    const bossLabel = this.add.text(bp.x, bp.y - BOSS_TRIGGER_DIST - 20, '⚠ BOSS ARENA ⚠', {
      fontSize: '14px', color: '#cc4444', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(1);

    this._bossArenaPos = bp;
    this._bossArenaGfx = arena;
    this._bossArenaLabel = bossLabel;
  }

  _buildDenseForest(region) {
    const jungleKeys = [
      'jungle_tree_1','jungle_tree_2','jungle_tree_3','jungle_tree_4','jungle_tree_5',
      'jungle_tree_6','jungle_tree_7','jungle_tree_8','jungle_tree_9','jungle_tree_10',
      'jungle_tree_11','jungle_tree_12','jungle_tree_13','jungle_tree_14',
    ];
    const firKeys = [
      'fir_tree_1','fir_tree_2','fir_tree_3','fir_tree_4','fir_tree_5',
      'fir_tree_6','fir_tree_7','fir_tree_8','fir_tree_9','fir_tree_10','fir_tree_11',
    ];
    const stumpKeys = ['ts_stump_1','ts_stump_2','ts_stump_3','ts_stump_4'];

    // Trees only in the forest zone (x > 900 — village is left side)
    const forestX = 900;
    const forestW = WORLD_W - forestX;

    // Translate exclusions to local forest coords
    const excl = [
      ...(region.portalNext   ? [{ x: region.portalNext.x   - forestX, y: region.portalNext.y,   r: 160 }] : []),
      ...(region.portalBack   ? [{ x: region.portalBack.x   - forestX, y: region.portalBack.y,   r: 160 }] : []),
      ...(region.spawnPos     ? [{ x: region.spawnPos.x     - forestX, y: region.spawnPos.y,     r: 180 }] : []),
      ...(region.fixedEnemies || []).map(e => ({ x: e.x - forestX, y: e.y, r: 120 })),
    ];

    const points = poissonDisk(forestW, WORLD_H, 80, 160, excl, 1234);

    for (const pt of points) {
      const wx = pt.x + forestX;
      const r  = Math.random();
      let key, scale;
      if (r < 0.20) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.60) {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
      }
      this.add.image(wx, pt.y, key).setScale(scale).setDepth(1);
    }
  }

  _buildRegionDecorations(region, regionIndex) {
    if (regionIndex === 2) {
      this._buildSacredGroveTrees(region);
      return;
    }

    const r = regionIndex;
    const count = 30;
    for (let i = 0; i < count; i++) {
      const x = 200 + Math.random() * (WORLD_W - 400);
      const y = 200 + Math.random() * (WORLD_H - 400);
      let key = 'bush1';
      if (r >= 4) key = Math.random() < 0.5 ? 'rock1' : 'rock2';
      else key = ['bush1','bush2','bush3','bush4','rock1','rock2'][Math.floor(Math.random()*6)];
      this.add.image(x, y, key).setScale(1.5 + Math.random()).setDepth(y);
    }

    // Clouds for Swarga Seema
    if (r === 5) {
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * WORLD_W;
        const y = Math.random() * WORLD_H;
        const key = Math.random() < 0.5 ? 'cloud1' : 'cloud2';
        this.add.image(x, y, key).setScale(2 + Math.random()).setAlpha(0.4).setDepth(-8);
      }
    }
  }

  _buildSacredGroveTrees(region) {
    const jungleKeys = [
      'jungle_tree_1','jungle_tree_2','jungle_tree_3','jungle_tree_4','jungle_tree_5',
      'jungle_tree_6','jungle_tree_7','jungle_tree_8','jungle_tree_9','jungle_tree_10',
      'jungle_tree_11','jungle_tree_12','jungle_tree_13','jungle_tree_14',
    ];
    const firKeys = [
      'fir_tree_1','fir_tree_2','fir_tree_3','fir_tree_4','fir_tree_5',
      'fir_tree_6','fir_tree_7','fir_tree_8','fir_tree_9','fir_tree_10','fir_tree_11',
    ];
    const stumpKeys = ['ts_stump_1','ts_stump_2','ts_stump_3','ts_stump_4'];

    const excl = [
      ...(region.spawnPos    ? [{ ...region.spawnPos,  r: 180 }] : []),
      ...(region.portalBack  ? [{ ...region.portalBack, r: 160 }] : []),
      ...(region.portalNext  ? [{ ...region.portalNext, r: 160 }] : []),
      ...(region.fixedEnemies || []).map(e => ({ x: e.x, y: e.y, r: 140 })),
      ...(region.npcPositions || []).map(n => ({ x: n.x, y: n.y, r: 120 })),
      ...(region.platePositions || []).map(p => ({ x: p.x, y: p.y, r: 100 })),
    ];

    const points = poissonDisk(WORLD_W, WORLD_H, 80, 200, excl, 5678);

    for (const pt of points) {
      const r = Math.random();
      let key, scale, tint = null;
      if (r < 0.35) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
      } else if (r < 0.80) {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
      } else {
        const jungle = Math.random() < 0.55;
        key   = jungle
          ? jungleKeys[Math.floor(Math.random() * jungleKeys.length)]
          : firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x336622;
      }
      const img = this.add.image(pt.x, pt.y, key).setScale(scale).setDepth(1);
      if (tint !== null) img.setTint(tint);
    }
  }

  _buildSerpentRealm(region) {
    const g = this.add.graphics().setDepth(-6);

    // Snake den mounds
    for (let i = 0; i < 18; i++) {
      const x = 300 + Math.random() * (WORLD_W - 600);
      const y = 200 + Math.random() * (WORLD_H - 400);
      const w = 80 + Math.random() * 40, h = 40 + Math.random() * 20;
      g.fillStyle(0x6a3a0a, 0.7);
      g.fillEllipse(x, y, w, h);
      g.lineStyle(2, 0x4a2800, 0.6);
      g.strokeEllipse(x, y, w, h);
      g.fillStyle(0x1a0800, 0.9);
      g.fillEllipse(x, y + 8, 20, 12);
    }

    // Glowing amber pools
    for (let i = 0; i < 10; i++) {
      const x = 400 + Math.random() * (WORLD_W - 800);
      const y = 300 + Math.random() * (WORLD_H - 600);
      const r = 25 + Math.random() * 20;
      g.fillStyle(0xffaa22, 0.22);
      g.fillEllipse(x, y, r * 2, r);
      g.lineStyle(1.5, 0xff8800, 0.4);
      g.strokeEllipse(x, y, r * 2, r);
    }

    // Rocks
    const rockKeys = ['rock1', 'rock2'].filter(k => this.textures.exists(k));
    for (let i = 0; i < 24; i++) {
      const x = 200 + Math.random() * (WORLD_W - 400);
      const y = 200 + Math.random() * (WORLD_H - 400);
      const key = rockKeys.length ? rockKeys[Math.floor(Math.random() * rockKeys.length)] : 'bush1';
      this.add.image(x, y, key).setScale(1.2 + Math.random() * 0.8).setDepth(y).setTint(0xaa6633);
    }

    // Small dry shrubs
    const shrubKeys = ['bush1','bush2','bush3'].filter(k => this.textures.exists(k));
    for (let i = 0; i < 20; i++) {
      const x = 200 + Math.random() * (WORLD_W - 400);
      const y = 200 + Math.random() * (WORLD_H - 400);
      const key = shrubKeys[Math.floor(Math.random() * shrubKeys.length)];
      this.add.image(x, y, key).setScale(1.0 + Math.random() * 0.5).setDepth(y).setTint(0xcc8844);
    }

    // Petrified/dead tree overlay — setDepth(1) so always behind players/enemies
    const firKeys = [
      'fir_tree_1','fir_tree_2','fir_tree_3','fir_tree_4','fir_tree_5',
      'fir_tree_6','fir_tree_7','fir_tree_8','fir_tree_9','fir_tree_10','fir_tree_11',
    ];
    const jungleKeys = [
      'jungle_tree_1','jungle_tree_2','jungle_tree_3','jungle_tree_4','jungle_tree_5',
      'jungle_tree_6','jungle_tree_7','jungle_tree_8','jungle_tree_9','jungle_tree_10',
      'jungle_tree_11','jungle_tree_12','jungle_tree_13','jungle_tree_14',
    ];
    const stumpKeys = ['ts_stump_1','ts_stump_2','ts_stump_3','ts_stump_4'];

    const deadExcl = [
      ...(region.spawnPos    ? [{ ...region.spawnPos,  r: 180 }] : []),
      ...(region.portalBack  ? [{ ...region.portalBack, r: 160 }] : []),
      ...(region.portalNext  ? [{ ...region.portalNext, r: 160 }] : []),
      ...(region.bossPos     ? [{ ...region.bossPos,   r: 200 }] : []),
      ...(region.spawnerPositions || []).map(s => ({ x: s.x, y: s.y, r: 140 })),
      ...(region.npcPositions || []).map(n => ({ x: n.x, y: n.y, r: 120 })),
      ...(region.fixedEnemies || []).map(e => ({ x: e.x, y: e.y, r: 120 })),
      ...(region.platePositions || []).map(p => ({ x: p.x, y: p.y, r: 100 })),
    ];

    const deadPts = poissonDisk(WORLD_W, WORLD_H, 80, 110, deadExcl, 9012);
    for (const pt of deadPts) {
      const r = Math.random();
      let key, scale, tint;
      if (r < 0.55) {
        key   = stumpKeys[Math.floor(Math.random() * stumpKeys.length)];
        scale = 0.30 + Math.random() * 0.15;
        tint  = 0x7a4422;
      } else if (r < 0.85) {
        key   = firKeys[Math.floor(Math.random() * firKeys.length)];
        scale = 0.70 + Math.random() * 0.40;
        tint  = 0x4a2800;
      } else {
        key   = jungleKeys[Math.floor(Math.random() * jungleKeys.length)];
        scale = 0.60 + Math.random() * 0.40;
        tint  = 0x2a1200;
      }
      this.add.image(pt.x, pt.y, key).setScale(scale).setDepth(1).setTint(tint);
    }
  }

  _spawnRabbitDecoration(regionIndex) {
    if (regionIndex > 2) return;
    const forestX = 900;

    const spawnOne = (texKey, idleAnim, moveAnim, x, y) => {
      if (!this.textures.exists(texKey)) return;
      const spr = this.add.sprite(x, y, texKey).setScale(2.5).setDepth(y - 2).setAlpha(0.9);
      const flip = Math.random() < 0.5;
      spr.setFlipX(flip);

      const loop = () => {
        if (!spr.active) return;
        const resting = Math.random() < 0.55;
        const dur = resting ? 1500 + Math.random() * 2500 : 800 + Math.random() * 1200;
        if (resting) {
          if (this.anims.exists(idleAnim)) spr.play(idleAnim);
        } else {
          const dir = Math.random() < 0.5 ? 1 : -1;
          spr.setFlipX(dir < 0);
          if (this.anims.exists(moveAnim)) spr.play(moveAnim);
          this.tweens.add({
            targets: spr,
            x: spr.x + dir * (40 + Math.random() * 60),
            duration: dur,
            ease: 'Linear',
          });
        }
        this.time.delayedCall(dur, loop);
      };
      loop();
    };

    for (let i = 0; i < 8; i++) {
      spawnOne('rabbit_idle', 'rabbit_idle', 'rabbit_move',
        forestX + Math.random() * (WORLD_W - forestX - 200),
        300 + Math.random() * (WORLD_H - 600));
    }
    for (let i = 0; i < 4; i++) {
      spawnOne('rabbitH_idle', 'rabbitH_idle', 'rabbit_move',
        forestX + Math.random() * (WORLD_W - forestX - 200),
        300 + Math.random() * (WORLD_H - 600));
    }
  }

  _buildVillage(region) {
    const vz = region.villageZone;
    const isHermit = region.villageStyle === 'hermit';
    const g = this.add.graphics().setDepth(-6);

    g.fillStyle(isHermit ? 0x2a4a1a : 0x5a9448, isHermit ? 0.7 : 0.55);
    g.fillRect(vz.x, vz.y, vz.w, vz.h);

    g.lineStyle(4, isHermit ? 0x4a3010 : 0x8b5c2a, 0.85);
    g.strokeRect(vz.x + 10, vz.y + 10, vz.w - 20, vz.h - 20);

    g.fillStyle(isHermit ? 0x3a2010 : 0x7a4e20, 1);
    for (let px = vz.x + 10; px < vz.x + vz.w - 10; px += 80) {
      g.fillRect(px - 4, vz.y + 6, 8, 18);
      g.fillRect(px - 4, vz.y + vz.h - 24, 8, 18);
    }
    for (let py = vz.y + 10; py < vz.y + vz.h - 10; py += 80) {
      g.fillRect(vz.x + 6, py - 4, 18, 8);
      g.fillRect(vz.x + vz.w - 24, py - 4, 18, 8);
    }

    // Gate opening on right side at CY
    g.fillStyle(isHermit ? 0x2a4a1a : 0x5a9448, 1);
    g.fillRect(vz.x + vz.w - 24, WORLD_H / 2 - 60, 30, 120);

    g.fillStyle(isHermit ? 0x3a2010 : 0x5c3410, 1);
    g.fillRect(vz.x + vz.w - 8, WORLD_H / 2 - 64, 12, 24);
    g.fillRect(vz.x + vz.w - 8, WORLD_H / 2 + 40, 12, 24);

    const hutColor = isHermit ? 0x5c4020 : 0xb8824a;
    region.npcPositions.forEach(np => {
      g.fillStyle(hutColor, isHermit ? 0.6 : 0.45);
      g.fillCircle(np.x, np.y, 48);
      g.lineStyle(3, isHermit ? 0x3a2010 : 0x8b5c2a, 0.8);
      g.strokeCircle(np.x, np.y, 48);
      g.fillStyle(0x2a1000, 0.9);
      g.fillRect(np.x - 8, np.y + 30, 16, 20);
    });

    const cx = vz.x + vz.w * 0.5;
    const cy = WORLD_H / 2;
    if (isHermit) {
      g.fillStyle(0x333333, 0.9); g.fillCircle(cx, cy, 16);
      g.fillStyle(0xff6600, 0.9); g.fillCircle(cx, cy, 8);
      g.fillStyle(0xffcc00, 0.8); g.fillCircle(cx, cy, 4);
    } else {
      g.fillStyle(0x6a6a6a, 0.9); g.fillCircle(cx, cy, 22);
      g.fillStyle(0x2255aa, 0.8); g.fillCircle(cx, cy, 14);
      g.lineStyle(3, 0x444444, 0.9); g.strokeCircle(cx, cy, 22);
    }

    const label = isHermit ? "Hermit's Camp" : 'Gramavana';
    this.add.text(vz.x + vz.w - 100, WORLD_H / 2 - 90, label, {
      fontSize: '13px', color: isHermit ? '#c8a060' : '#e8c87a',
      fontFamily: 'serif', stroke: '#1a0a00', strokeThickness: 3,
    }).setDepth(10);
    this.add.text(vz.x + vz.w + 20, WORLD_H / 2 - 90, '⟶ Forest', {
      fontSize: '13px', color: '#88cc55', fontFamily: 'serif',
      stroke: '#0a2200', strokeThickness: 3,
    }).setDepth(10);
  }

  _showTutorial() {
    this._tutorialShown = true;

    // Camera-space UI card — attached to camera so it stays on screen
    const cam = this.cameras.main;
    const card = this.add.graphics().setScrollFactor(0).setDepth(200);
    const cx = GAME_W / 2, cy = GAME_H / 2;
    const cw = 560, ch = 220;

    card.fillStyle(0x0a120a, 0.88);
    card.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 14);
    card.lineStyle(2, 0x66cc44, 0.9);
    card.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 14);

    const title = this.add.text(cx, cy - ch / 2 + 22, '⚔  Forest Combat — Controls', {
      fontSize: '16px', color: '#aaffaa', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const lines = [
      'WASD / Arrow keys    Move',
      'J                   Light Attack',
      'K                   Heavy Attack',
      'Shift               Dodge  (time perfectly → slow-motion!)',
      'Q / E / R           Special Abilities',
      'F                   Talk to NPCs / Interact',
      'Esc                 Pause',
    ].join('\n');

    const body = this.add.text(cx, cy + 10, lines, {
      fontSize: '13px', color: '#ccffcc', fontFamily: 'monospace',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const hint = this.add.text(cx, cy + ch / 2 - 22, 'Tutorial enemies ahead — they are weak. Good luck!', {
      fontSize: '11px', color: '#88cc55', fontFamily: 'serif', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Fade out after 6 seconds
    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: [card, title, body, hint], alpha: 0,
        duration: 800,
        onComplete: () => { card.destroy(); title.destroy(); body.destroy(); hint.destroy(); },
      });
    });
  }

  _updateOcclusionAlpha() {
    if (!this._treePositions.length) return;
    const entities = [
      ...this.players.filter(p => p?.active),
      ...this.enemies.filter(e => e?.active),
    ];
    for (const ent of entities) {
      let behind = false;
      for (const tree of this._treePositions) {
        if (ent.y >= tree.y) continue;
        const dx = ent.x - tree.x;
        const dy = ent.y - tree.y;
        if (Math.sqrt(dx * dx + dy * dy) < tree.r) {
          behind = true;
          break;
        }
      }
      const target = behind ? 0.38 : 1.0;
      if (Math.abs(ent.alpha - target) > 0.01) ent.setAlpha(target);
    }
  }

  update(time, delta) {
    if (this._paused) return;

    // ── Players ───────────────────────────────────────────────────
    const p1 = this.players[0];
    const p2 = this.players[1];

    if (p1) p1.update(time, delta, this._cursors, this._keys, this.enemies, this);
    if (p2 && p2.isLocal) p2.update(time, delta, null, null, this.enemies, this);
    else if (p2 && !p2.isLocal) this._taraAI(p1, p2, delta);

    // ── Enemies ───────────────────────────────────────────────────
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e || !e.active) { this.enemies.splice(i, 1); continue; }
      e.update(time, delta, this.players, this._treePositions);
    }

    // ── Projectiles ───────────────────────────────────────────────
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p || !p.active) { this.projectiles.splice(i, 1); continue; }
      p.update(time, delta);
      this._checkProjectileCollisions(p);
    }

    // ── NPCs ──────────────────────────────────────────────────────
    for (const npc of this.npcs) npc.update(this.players);

    // ── Boss ──────────────────────────────────────────────────────
    if (this._boss?.active) {
      this._boss.update(time, delta, this.players, this);
      this._checkBossProjectileHit();
    } else if (!this._bossTriggered && this._bossArenaPos) {
      this._checkBossTrigger();
    }

    // ── Tutorial trigger (region 0 only) ─────────────────────────
    if (this._regionIndex === 0 && !this._tutorialShown) {
      const p = this.players[0];
      if (p?.alive && p.x > 900) this._showTutorial();
    }

    // ── Tree occlusion ghost highlight ────────────────────────────
    this._updateOcclusionAlpha();

    // ── Pressure plates ───────────────────────────────────────────
    this._checkPressurePlates();

    // ── Portals ───────────────────────────────────────────────────
    this._checkPortals();

    // ── Interact ─────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this._keys.F)) {
      this._handleInteract();
    }

    // ── Tether (co-op soft tether) ────────────────────────────────
    this._enforceTether();

    // ── Both players downed check ─────────────────────────────────
    this._checkBothDowned();

    // ── Network broadcast ─────────────────────────────────────────
    this._netTimer += delta;
    if (this._netTimer >= NET_INTERVAL) {
      this._netTimer = 0;
      this._netBroadcast();
    }

    // ── UI update ─────────────────────────────────────────────────
    this.events.emit('update_ui', {
      players: this.players,
      boss: this._boss?.alive ? this._boss : null,
    });
  }

  _taraAI(p1, p2, delta) {
    if (!p1 || !p2) return;
    if (p2.downed) return;

    // Follow P1 at distance
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 100) {
      const speed = 180;
      p2.body?.setVelocity(dx / dist * speed, dy / dist * speed);
      p2.sprite?.setFlipX(dx < 0);
      p2.sprite?.play('tara_run', true);
    } else {
      p2.body?.setVelocity(0, 0);
      p2.sprite?.play('tara_idle', true);
    }
    p2.setDepth(p2.y);
  }

  _checkProjectileCollisions(proj) {
    if (!proj.active) return;

    if (proj.fromEnemy) {
      // Hit players
      for (const p of this.players) {
        if (!p?.alive || p.downed) continue;
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y);
        if (d < 24) {
          p.takeDamage(proj.damage, null, this);
          proj.hit();
          return;
        }
      }
    } else {
      // Hit enemies
      for (const e of this.enemies) {
        if (!e?.alive) continue;
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, e.x, e.y);
        if (d < 28) {
          e.takeDamage(proj.damage, null, this);
          if (!proj.piercing) { proj.hit(); return; }
        }
      }
      // Hit boss
      if (this._boss?.alive) {
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, this._boss.x, this._boss.y);
        if (d < 60) {
          this._boss.takeDamage(proj.damage, this);
          proj.hit();
        }
      }
    }
  }

  _checkBossProjectileHit() {
    // Boss hitbox vs player melee (already handled in Player._doAttack via enemy list)
    // This checks if boss should be hit by player attacks (boss is not in enemies array)
  }

  _checkBossTrigger() {
    if (!this._bossArenaPos || !REGIONS[this._regionIndex].bossKey) return;
    for (const p of this.players) {
      if (!p?.alive) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, this._bossArenaPos.x, this._bossArenaPos.y);
      if (d < BOSS_TRIGGER_DIST) {
        this._triggerBoss();
        return;
      }
    }
  }

  _triggerBoss() {
    if (this._bossTriggered) return;
    this._bossTriggered = true;
    const region = REGIONS[this._regionIndex];
    if (!region.bossKey) return;

    this._bossArenaGfx?.setVisible(false);
    this._bossArenaLabel?.setVisible(false);

    const { bossPos } = region;
    const boss = new Boss(this, bossPos.x, bossPos.y, region.bossKey);
    boss.enablePhysics(this);
    this._boss = boss;

    boss.enter(this);
    this.audio.bossPhase();
  }

  _checkPressurePlates() {
    if (this._plateRewardGiven || this._pressurePlates.length < 2) return;

    const triggered = this._pressurePlates.map((plate, i) => {
      let any = false;
      for (const p of this.players) {
        if (!p?.alive || p.downed) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, plate.x, plate.y);
        if (d < 30) { any = true; break; }
      }
      if (any !== this._plateTriggered[i]) {
        this._plateTriggered[i] = any;
        plate.gfx.setFillStyle(any ? 0xffcc44 : 0x886644, 0.7);
      }
      return any;
    });

    if (triggered.every(t => t)) {
      this._plateRewardGiven = true;
      this._onPlateActivated();
    }
  }

  _onPlateActivated() {
    // 35% HP heal
    for (const p of this.players) {
      if (!p?.alive || p.downed) continue;
      p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.35));
      p._updateHpBar?.();
    }
    this.audio.pressurePlate();
    this.events.emit('show_dialogue', { text: '⟨Sacred Stone⟩ The bond of unity heals your wounds. +35% HP restored.' });
    this.time.delayedCall(3000, () => this.events.emit('hide_dialogue'));
    this.questManager.onPressurePlate();
  }

  _checkPortals() {
    const check = (portal, isNext) => {
      if (!portal || portal.locked) return;
      for (const p of this.players) {
        if (!p?.alive || p.downed) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, portal.x, portal.y);
        if (d < 40) {
          this._usePortal(isNext);
          return;
        }
      }
    };
    if (!this._portalCooldown || this.time.now > this._portalCooldown) {
      check(this._portals?.back, false);
      check(this._portals?.next, true);
    }
  }

  _usePortal(isNext) {
    this._portalCooldown = this.time.now + 3000;
    const newIndex = isNext ? this._regionIndex + 1 : Math.max(0, this._regionIndex - 1);

    if (newIndex < 0 || newIndex >= REGIONS.length) return;

    // Save progress
    this._saveProgress(newIndex);
    this.audio.portal();
    this._fadeAndTransition(newIndex);
  }

  _saveProgress(newIndex) {
    const saveData = {
      regionIndex: newIndex,
      playerStats: {
        maxHp: this.players[0]?.maxHp || 200,
        maxStamina: this.players[0]?.maxStamina || 100,
        abilityPow: this.players[0]?.abilityPow || 1.0,
      },
      statTiers: this._save?.statTiers || {},
      completedQuests: this.questManager.getCompletedArray(),
      inventory: this._save?.inventory || [],
      loreCount: this._save?.loreCount || 0,
      bossKills: this._save?.bossKills || [],
    };
    SaveManager.save(saveData);
  }

  _fadeAndTransition(newIndex) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Reset timescales
      this.physics.world.timeScale = 1;
      this.time.timeScale = 1;
      this.scene.stop('UIScene');
      this.scene.restart({ regionIndex: newIndex });
    });
  }

  _handleInteract() {
    if (this._dialogueActive) {
      this._dialogueActive = false;
      this.events.emit('hide_dialogue');
      return;
    }

    for (const npc of this.npcs) {
      if (!npc.isPlayerNear) continue;
      const regionKey = `${REGIONS[this._regionIndex].name.toLowerCase().split(' ')[0].replace(/[^a-z]/g,'')}_main`;
      const questForNpc = Object.values(QUESTS).find(q => q.trigger === `npc_talk:${npc.npcId}`);
      const line = npc.interact(this.questManager, questForNpc);
      if (line) {
        this._dialogueActive = true;
        this.events.emit('show_dialogue', { text: line });
        this.audio.interact();
        // If gramavana elder triggers main quest
        const region = REGIONS[this._regionIndex];
        const unlockKey = `npc_talk:${npc.npcId}`;
        if (npc.npcId === 'elder_mahesh' || region.portalUnlock === unlockKey) {
          this._unlockPortalNext();
        }
      }
      return;
    }
  }

  _enforceTether() {
    const [p1, p2] = this.players;
    if (!p1 || !p2 || !p2.isLocal) return;
    const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    if (d > TETHER_DIST) {
      const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
      p2.body.setVelocity(Math.cos(angle) * TETHER_SPEED, Math.sin(angle) * TETHER_SPEED);
    }
  }

  _checkBothDowned() {
    const allDown = this.players.every(p => !p?.alive || p.downed);
    if (allDown && !this._gameOverTimer) {
      this._gameOverTimer = this.time.delayedCall(3000, () => {
        this.scene.stop('UIScene');
        this.scene.start('MainMenuScene');
      });
    } else if (!allDown && this._gameOverTimer) {
      this._gameOverTimer.remove();
      this._gameOverTimer = null;
    }
  }

  _netBroadcast() {
    if (!this.network?.connected) return;
    const p = this.players[0];
    if (!p) return;
    this.network.send('PLAYER_STATE', {
      state: p.getNetState(),
      enemies: this.enemies.filter(e => e?.alive).map(e => ({
        id: e._id, x: e.x, y: e.y, hp: e.hp,
      })),
    });
  }

  _onSpawnProjectile(data) {
    const proj = new Projectile(this, data.x, data.y, data.key || 'fire_01', data);
    this.projectiles.push(proj);
  }

  _onHealingAura(data) {
    const { players } = data;
    for (const p of (players || [])) {
      if (!p?.alive || p.downed) continue;
      p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.2));
      p._updateHpBar?.();
    }
  }

  _onAbilityFx(data) {
    const { type, x, y, r } = data;
    if (type === 'explosion' || type === 'shockwave') {
      const circle = this.add.circle(x, y, r || 60, 0xffcc44, 0.3);
      this.tweens.add({
        targets: circle, alpha: 0, scaleX: 1.4, scaleY: 1.4,
        duration: 400, onComplete: () => circle.destroy(),
      });
    } else if (type === 'heal') {
      const circle = this.add.circle(x, y, 80, 0x44ff88, 0.3);
      this.tweens.add({
        targets: circle, alpha: 0, scaleX: 2, scaleY: 2,
        duration: 600, onComplete: () => circle.destroy(),
      });
    }
  }

  _onEnemyKilled(data) {
    this.questManager.onEnemyKill(this._regionIndex);
    const idx = this.enemies.indexOf(data.enemy);
    if (idx > -1) this.enemies.splice(idx, 1);

    const region = REGIONS[this._regionIndex];
    if (region.portalUnlock === 'kill_all' && this._fixedEnemyMode) {
      this._anyEnemyKilled = true;
      if (this.enemies.filter(e => e.alive).length === 0) {
        this._unlockPortalNext();
        this.events.emit('toast', { text: 'The grove is cleansed — the path opens.' });
      }
    }
  }

  _onBossKilled(data) {
    const { bossKey } = data;
    this.questManager.onBossKill(bossKey, this._regionIndex);
    this.audio.victory();

    // Save boss kill
    const save = this._save;
    if (save && !save.bossKills.includes(bossKey)) {
      save.bossKills.push(bossKey);
      SaveManager.save(save);
    }

    // Show boss lore
    const bossData = data.boss?.cfg;
    if (bossData) {
      this.time.delayedCall(1500, () => {
        this.events.emit('show_dialogue', { text: `✦ ${bossData.name} defeated ✦\n"${bossData.lore}"` });
        this.time.delayedCall(5000, () => this.events.emit('hide_dialogue'));
      });
    }

    // Final boss check
    if (bossKey === 'viyogasur') {
      this.time.delayedCall(6000, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameEndingScene', {
          loreCount: this._save?.loreCount || 0,
          questsCompleted: this.questManager.getCompletedArray().length,
        });
      });
    }
  }

  togglePause() {
    this._paused = !this._paused;
    if (this._paused) {
      this.scene.launch('PauseScene');
      this.physics.pause();
    } else {
      this.scene.stop('PauseScene');
      this.physics.resume();
    }
  }

  // Called by Player.js when player melee hits boss
  hitBoss(damage) {
    if (!this._boss?.alive) return;
    this._boss.takeDamage(damage, this);
  }
}
