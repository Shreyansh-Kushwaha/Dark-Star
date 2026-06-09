import { WORLD_W, WORLD_H, GAME_W, GAME_H, NET_INTERVAL, TETHER_DIST, TETHER_SPEED, BOSS_TRIGGER_DIST, ITEM_DEFS } from '../constants.js';
import { REGIONS } from '../data/regions.js';
import { _mapSpriteKey } from './PreloadScene.js';
import { QUESTS, NPC_DIALOGUE, LORE_FRAGMENTS } from '../data/quests.js';
import { LoreManager } from '../systems/LoreManager.js';
import { Player } from '../entities/Player.js';
import { Enemy  } from '../entities/Enemy.js';
import { Boss   } from '../entities/Boss.js';
import { BOSSES } from '../data/bosses.js';
import { NPC    } from '../entities/NPC.js';
import { Projectile } from '../entities/Projectile.js';
import { AudioManager } from '../systems/AudioManager.js';
import { QuestManager } from '../systems/QuestManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { NetworkManager } from '../systems/NetworkManager.js';
import { QualitySettings } from '../systems/QualitySettings.js';

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
    const saveData = SaveManager.defaults();
    this._save = saveData;
    const regionIndex = data.regionIndex ?? saveData.regionIndex ?? 0;
    this._regionIndex = regionIndex;
    const region = REGIONS[regionIndex];

    // Systems
    this.audio  = new AudioManager();
    this.questManager = new QuestManager();
    this.questManager.load(saveData.completedQuests || []);
    this.loreManager = new LoreManager();
    this.loreManager.load(saveData.collectedLoreIds || []);
    this.network = this.registry.get('network') || new NetworkManager();
    this.registry.remove('network');

    this._region = region;
    this._mapBossOverride = null;

    // Look up map-editor layout for this region
    const _regionMaps = this.registry.get('regionMaps') || [];
    this._mapData = _regionMaps.find(e => e.regionIndex === regionIndex)?.data || null;

    // Physics world
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── World setup ────────────────────────────────────────────────
    this._setupWorld(region);
    this._buildParallaxBorder(regionIndex, region);
    this._buildGroundTexture();
    this._spawnAmbientParticles(regionIndex);
    this._applyRegionColorOverlay(regionIndex);

    // ── Players ───────────────────────────────────────────────────
    const spawnPos = region.spawnPos;
    this.players = [];

    // In co-op: host=P1 local, client=P2 local. Solo: P1 local only.
    const isClient = this.network.connected && this.network.isClient();
    const p1Char   = data.p1Char || 'dhruva';
    const p2Char   = data.p2Char || 'tara';
    this._p1Char = p1Char;
    this._p2Char = p2Char;
    this._isCoop = !!(data.coop || this.network.connected);
    const p1 = new Player(this, spawnPos.x, spawnPos.y, true, saveData, p1Char);
    p1.isLocal = !isClient;
    this.players.push(p1);

    const p2 = new Player(this, spawnPos.x + 60, spawnPos.y, false, saveData, p2Char);
    p2.isLocal = isClient;
    this.players.push(p2);

    // Camera follows the local player
    const localPlayer = isClient ? p2 : p1;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);

    // Register network receive handlers NOW — players array is populated.
    // Store references so shutdown can call off() and prevent accumulation on restart.
    if (this.network.connected) {
      const _netCleanup = [];

      const onPlayerState = ({ playerIndex, state }) => {
        const remote = this.players[playerIndex];
        if (remote && !remote.isLocal) remote.applyNetState(state);
      };
      this.network.on('PLAYER_STATE', onPlayerState);
      _netCleanup.push(['PLAYER_STATE', onPlayerState]);

      // Client: apply enemy states broadcast by host
      if (this.network.isClient()) {
        const onRegionChange = ({ newIndex }) => {
          this.audio.portal();
          this._fadeAndTransition(newIndex);
        };
        this.network.on('REGION_CHANGE', onRegionChange);
        _netCleanup.push(['REGION_CHANGE', onRegionChange]);

        this._remoteEnemyMap = new Map();
        const onEnemySync = ({ enemies }) => {
          if (!enemies) return;
          const seenIds = new Set();
          for (const state of enemies) {
            seenIds.add(state.id);
            let e = this._remoteEnemyMap.get(state.id);
            if (!e) {
              e = new Enemy(this, state.x, state.y, state.typeKey, 1);
              e._id   = state.id;
              e.maxHp = state.maxHp;
              this.enemies.push(e);
              this._remoteEnemyMap.set(state.id, e);
            }
            e.applyNetState(state);
          }
          // Remove enemies that are gone on host (killed)
          for (const [id, e] of this._remoteEnemyMap) {
            if (!seenIds.has(id)) {
              if (e.alive) e._die(null);
              const idx = this.enemies.indexOf(e);
              if (idx > -1) this.enemies.splice(idx, 1);
              this._remoteEnemyMap.delete(id);
            }
          }
        };
        this.network.on('ENEMY_SYNC', onEnemySync);
        _netCleanup.push(['ENEMY_SYNC', onEnemySync]);
      }

      this.events.once('shutdown', () => {
        for (const [type, fn] of _netCleanup) this.network.off(type, fn);
      });
    }

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
    this._pendingPortalUnlock = false;
    this._firedEchoes = new Set();
    this._worldFragmentObjects = [];
    this._bossIntroActive = false;
    this._arenaHazards = [];
    this._comboCount   = 0;
    this._comboTimer   = null;
    this._netTimer = 0;
    this._uiThrottleCounter = 0;
    this._slowTickCounter   = 0;
    this._pendingRTBake     = [];
    this._paused = false;
    this._fixedEnemyMode = false;
    this._anyEnemyKilled = false;

    this._createNPCs(region);
    this._createWorldFragments(region);
    this._createSpawners(region);
    this._createPortals(region);
    this._createPressurePlates(region);
    // Apply map-editor entity overrides before arena/spawner setup
    if (this._mapData?.boss) {
      this._mapBossOverride = this._mapData.boss;
    }

    this._createBossArena(region);

    if (this._mapData) {
      this._buildFromMapData(this._mapData);
    } else if (region.denseForest) {
      this._buildDenseForest(region);
    } else if (region.serpentRealm) {
      this._buildSerpentRealm(region);
    } else {
      this._buildRegionDecorations(region, regionIndex);
    }

    this._spawnRabbitDecoration(regionIndex);

    if (regionIndex === 0 || (regionIndex === 1 && region.villageZone)) {
      this._buildVillage(region);
      this._tutorialShown = false;
    }

    // ── UI scene (overlay) ────────────────────────────────────────
    this.scene.launch('UIScene', { gameScene: this });

    // ── Event listeners ───────────────────────────────────────────
    this.events.on('spawn_projectile',  this._onSpawnProjectile, this);
    this.events.on('healing_aura',      this._onHealingAura, this);
    this.events.on('ability_fx',        this._onAbilityFx, this);
    this.events.on('enemy_killed',      this._onEnemyKilled, this);
    this.events.on('boss_killed',       this._onBossKilled,    this);
    this.events.on('boss_wall_break',   this._onBossWallBreak, this);
    this.events.on('boss_phase_changed',this._onBossPhaseChanged, this);

    this.questManager.addEventListener('quest_started', (e) => {
      this.events.emit('quest_started', e.detail);
    });
    this.questManager.addEventListener('quest_completed', (e) => {
      this.events.emit('quest_completed', e.detail);
      const reward = e.detail?.quest?.reward;
      if (reward?.item) {
        SaveManager.addItem(this.saveData, reward.item);
        SaveManager.save(this.saveData);
        const def = ITEM_DEFS[reward.item];
        if (def?.type === 'passive') this._applyPassiveItem(def);
        this.events.emit('item_acquired', { itemId: reward.item, name: def?.name || reward.name });
      }
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

    // Flush pending tree decorations as individual images at depth=1.
    // All same-depth images batch together per texture in Phaser's WebGL pipeline
    // (~29 texture batches vs hundreds when using setDepth(y)).
    if (this._pendingRTBake.length) {
      for (const d of this._pendingRTBake) {
        const img = this.add.image(d.x, d.y, d.key).setScale(d.scale).setDepth(1);
        if (d.tint != null) img.setTint(d.tint);
        // Gentle sway on larger trees
        if (d.scale > 0.4 && !d.key.includes('stump')) {
          const amp   = 0.4 + Math.random() * 0.7;
          const dur   = 2000 + Math.random() * 2200;
          this.tweens.add({
            targets: img,
            angle: { from: -amp, to: amp },
            duration: dur, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * dur,
          });
        }
      }
      this._pendingRTBake = null;
    }

    console.log(`[GameScene] Region ${regionIndex}: ${region.name}`);
  }

  _buildGroundTexture() {
    if (!this.textures.exists('ground_tile_noise')) {
      const TILE = 48;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 0.055);
      [[5,4],[17,10],[31,6],[43,18],[8,24],[25,30],[40,24],[12,38],[36,44],[42,14],[22,52],[6,50]].forEach(([dx,dy]) => {
        if (dx < TILE && dy < TILE) g.fillRect(dx, dy, 2, 2);
      });
      g.fillStyle(0x000000, 0.09);
      [[12,8],[28,18],[44,10],[6,32],[22,42],[38,36],[14,50]].forEach(([dx,dy]) => {
        if (dx < TILE && dy < TILE) g.fillRect(dx, dy, 2, 2);
      });
      g.lineStyle(1, 0x000000, 0.05);
      g.strokeRect(0, 0, TILE, TILE);
      g.generateTexture('ground_tile_noise', TILE, TILE);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'ground_tile_noise')
      .setOrigin(0, 0).setDepth(-8).setAlpha(0.65);
  }

  _buildParallaxBorder(regionIndex, region) {
    const silColors = [0x0d2010, 0x091a0c, 0x0a0a18, 0x06100d, 0x1a0e04, 0x060d1a, 0x1a0606];
    const col = silColors[regionIndex % silColors.length];
    const g   = this.add.graphics().setDepth(-17);
    g.fillStyle(col, 0.68);
    const TOP = 54;
    for (let x = 0; x < WORLD_W; x += 48) {
      const seed = (((x + regionIndex * 55 + 100) * 2654435761) >>> 0) % 100;
      g.fillRect(x, 0, 48, TOP + seed * 0.36);
      const seed2 = (((x + regionIndex * 55 + 500) * 2654435761) >>> 0) % 100;
      const h2 = TOP + seed2 * 0.36;
      g.fillRect(x, WORLD_H - h2, 48, h2);
    }
    for (let y = TOP; y < WORLD_H - TOP; y += 48) {
      const seed = (((y + regionIndex * 33 + 200) * 2654435761) >>> 0) % 100;
      g.fillRect(0, y, 40 + seed * 0.28, 48);
      const seed2 = (((y + regionIndex * 33 + 700) * 2654435761) >>> 0) % 100;
      const w2 = 40 + seed2 * 0.28;
      g.fillRect(WORLD_W - w2, y, w2, 48);
    }
  }

  _spawnAmbientParticles(regionIndex) {
    if (!this.textures.exists('amb_particle')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('amb_particle', 7, 7);
      g.destroy();
    }
    const cfgs = [
      { tints: [0x44bb33, 0x88cc44, 0x66aa22], gravity: -18, freq: 320, blend: 'NORMAL' },
      { tints: [0x55cc33, 0x77dd44, 0x44aa22], gravity: -20, freq: 300, blend: 'NORMAL' },
      { tints: [0xffdd44, 0xffbb22, 0xaadd44], gravity: -25, freq: 350, blend: 'ADD'    },
      { tints: [0x44aa66, 0x228855, 0x99cc44], gravity: -15, freq: 330, blend: 'NORMAL' },
      { tints: [0xff6600, 0xffaa44, 0xff4422], gravity: -22, freq: 360, blend: 'ADD'    },
      { tints: [0xeeeeff, 0xaaddff, 0xffeedd], gravity: -30, freq: 290, blend: 'ADD'    },
      { tints: [0xff3300, 0x882222, 0xff6644], gravity: -18, freq: 370, blend: 'ADD'    },
    ];
    const cfg = cfgs[regionIndex] || cfgs[0];
    this.add.particles(WORLD_W / 2, WORLD_H / 2, 'amb_particle', {
      x:        { min: -WORLD_W / 2 + 150, max: WORLD_W / 2 - 150 },
      y:        { min: -WORLD_H / 2 + 150, max: WORLD_H / 2 - 150 },
      scale:    { start: 0.6, end: 0.1 },
      alpha:    { start: 0.55, end: 0 },
      speed:    { min: 10, max: 30 },
      angle:    { min: 180, max: 360 },
      lifespan: { min: 5000, max: 9000 },
      frequency: cfg.freq,
      quantity:  1,
      tint:      cfg.tints,
      depth:    -2,
      gravityY:  cfg.gravity,
      blendMode: cfg.blend,
    });
  }

  _applyRegionColorOverlay(regionIndex) {
    const overlays = [
      null,
      { color: 0x001100, alpha: 0.06 },
      { color: 0x001408, alpha: 0.07 },
      { color: 0x010d00, alpha: 0.10 },
      { color: 0x100500, alpha: 0.09 },
      { color: 0x000510, alpha: 0.08 },
      { color: 0x100000, alpha: 0.12 },
    ];
    const ov = overlays[regionIndex];
    if (!ov) return;
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, ov.color, ov.alpha).setDepth(-7);
  }

  _setupWorld(region) {
    const g = this.add.graphics().setDepth(-10);

    // Use map-editor background color if available
    let bgColor  = region.bgColor;
    let bgColor2 = region.bgColor2;
    if (this._mapData?.background?.type === 'color' && this._mapData.background.value) {
      const hex = parseInt(this._mapData.background.value.replace('#', ''), 16);
      bgColor  = hex;
      bgColor2 = hex;
    }

    // Base ground fill
    g.fillStyle(bgColor, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Subtle variation: scatter darker/lighter patches using a seeded pattern
    g.fillStyle(bgColor2, 0.5);
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
      // Warm lantern glow under each NPC
      const g = this.add.circle(npcCfg.x, npcCfg.y + 10, 44, 0xffcc44, 0.1)
        .setDepth(npcCfg.y - 1);
      this.tweens.add({
        targets: g, alpha: { from: 0.06, to: 0.18 },
        duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  _createWorldFragments(region) {
    for (const frag of (region.worldFragments || [])) {
      if (this.loreManager.has(frag.fragmentId)) continue;

      const gfx = this.add.circle(frag.x, frag.y, 14, 0xffd700, 0.5).setDepth(frag.y + 1);
      this.tweens.add({ targets: gfx, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });

      const prompt = this.add.text(frag.x, frag.y - 28, '[F]', {
        fontSize: '12px', color: '#ffd700', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setAlpha(0).setDepth(frag.y + 2);

      this._worldFragmentObjects.push({ fragmentId: frag.fragmentId, x: frag.x, y: frag.y, gfx, prompt });
    }
  }

  _createSpawners(region) {
    // In co-op: only host spawns and simulates enemies
    if (this.network.connected && !this.network.isHost()) return;

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
    if (this.enemies.length >= QualitySettings.maxEnemies) return;
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

    // Floor glow ring
    const glowRing = this.add.circle(x, y, 52, color, 0.1).setDepth(-3);
    this.tweens.add({
      targets: glowRing,
      alpha:  { from: 0.06, to: 0.20 },
      scaleX: { from: 0.78, to: 1.22 },
      scaleY: { from: 0.78, to: 1.22 },
      duration: 880, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

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
    // Map editor boss override takes precedence; fall back to region config
    const bossKey = this._mapBossOverride?.key || region.bossKey;
    if (!bossKey) return;
    const bp = this._mapBossOverride
      ? { x: this._mapBossOverride.x, y: this._mapBossOverride.y }
      : region.bossPos;

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

    const forestX = 900;
    const forestW = WORLD_W - forestX;

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
      this._pendingRTBake.push({ x: wx, y: pt.y, key, scale, tint: null });
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

  _buildFromMapData(mapData) {
    const sprites = mapData.sprites || [];
    const missing = [];

    for (const sp of sprites) {
      const framesToLoad = (sp.animated && sp.frames.length > 1) ? sp.frames : [sp.frames[0]];
      for (const frame of framesToLoad) {
        const key = _mapSpriteKey(sp.dir, frame);
        if (!this.textures.exists(key)) missing.push({ key, url: sp.dir + '/' + frame });
      }
    }

    const place = () => {
      for (const sp of sprites) {
        const key = _mapSpriteKey(sp.dir, sp.frames[0]);
        const depth = sp.spriteLayer === 'above' ? sp.y + 1 : sp.y - 1;
        const img = this.add.image(sp.x, sp.y, key)
          .setScale(sp.scaleX ?? 1, sp.scaleY ?? 1)
          .setDepth(depth);
        if (sp.offsetX != null && sp.offsetY != null) {
          const tex = this.textures.get(key);
          const w = tex.getSourceImage()?.width || sp.offsetX * 2;
          const h = tex.getSourceImage()?.height || sp.offsetY * 2;
          img.setOrigin(sp.offsetX / w, sp.offsetY / h);
        }
      }

      // Spawn enemies placed in the map editor
      const mapEnemies = mapData.enemies || [];
      if (mapEnemies.length > 0) {
        const difficulty = (this._region || {}).difficulty ?? 1.0;
        for (const e of mapEnemies) {
          const enemy = new Enemy(this, e.x, e.y, e.type, difficulty);
          this._enemies.push(enemy);
        }
      }

      // _mapBossOverride already set synchronously before _createBossArena was called
    };

    if (missing.length > 0) {
      missing.forEach(({ key, url }) => this.load.image(key, url));
      this.load.once('complete', place);
      this.load.start();
    } else {
      place();
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
      this._pendingRTBake.push({ x: pt.x, y: pt.y, key, scale, tint });
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
      this._pendingRTBake.push({ x: pt.x, y: pt.y, key, scale, tint });
    }
  }

  _spawnRabbitDecoration(regionIndex) {
    if (regionIndex > 2) return;
    if (QualitySettings.rabbits === 0) return;
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

    if (p1 && p1.isLocal)  p1.update(time, delta, this._cursors, this._keys, this.enemies, this);
    if (p2 && p2.isLocal)  p2.update(time, delta, this._cursors, this._keys, this.enemies, this);
    // Solo only: Tara follows P1 via AI when there is no network connection
    if (p2 && !p2.isLocal && !this.network.connected) this._taraAI(p1, p2, delta);

    // ── Enemies ───────────────────────────────────────────────────
    const cam = this.cameras.main;
    const camCX = cam.scrollX + GAME_W / 2;
    const camCY = cam.scrollY + GAME_H / 2;
    // Only host runs enemy AI; client receives positions via ENEMY_SYNC
    if (!this.network.connected || this.network.isHost()) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e || !e.active) { this.enemies.splice(i, 1); continue; }
        const dx = e.x - camCX, dy = e.y - camCY;
        if (dx * dx + dy * dy > 640000) continue;
        e.update(time, delta, this.players, this._treePositions);
      }
    }

    // ── Food pickup collection ────────────────────────────────────
    if (this.foodPickups?.length) {
      for (let i = this.foodPickups.length - 1; i >= 0; i--) {
        const fp = this.foodPickups[i];
        if (fp.collected) { this.foodPickups.splice(i, 1); continue; }
        for (const pl of this.players) {
          if (!pl?.alive || pl.downed) continue;
          if (Phaser.Math.Distance.Between(fp.x, fp.y, pl.x, pl.y) < 40) {
            fp.collected = true;
            pl.hp = Math.min(pl.maxHp, pl.hp + fp.healAmt);
            pl._updateHpBar?.();
            // Golden pickup flash
            if (this.anims?.exists('vfx_yellow1')) {
              const s = this.add.sprite(fp.x, fp.y - 10, 'vfx_y1_1').setScale(1.0).setDepth(fp.sprite.depth + 1).setAlpha(0.85);
              s.play('vfx_yellow1');
              s.once('animationcomplete', () => s.destroy());
            }
            this.tweens.add({ targets: fp.sprite, y: fp.sprite.y - 20, alpha: 0, duration: 300, onComplete: () => fp.sprite.destroy() });
            this.foodPickups.splice(i, 1);
            this.events.emit('toast', { text: `+${fp.healAmt} HP`, color: '#88ff88' });
            break;
          }
        }
      }
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

    // ── World fragment proximity prompts ──────────────────────────
    for (const wf of this._worldFragmentObjects) {
      let nearest = Infinity;
      for (const p of this.players) {
        if (!p?.active) continue;
        const d = Phaser.Math.Distance.Between(wf.x, wf.y, p.x, p.y);
        if (d < nearest) nearest = d;
      }
      wf.prompt.setAlpha(nearest < 80 ? 1 : 0);
    }

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

    // ── Revival hold mechanic ─────────────────────────────────────
    this._updateRevival(delta);

    // ── Arena hazards ─────────────────────────────────────────────
    if (this._arenaHazards.length) this._updateArenaHazards(time, delta);

    // ── Throttle counters ─────────────────────────────────────────
    this._uiThrottleCounter++;
    this._slowTickCounter++;

    // ── Tree occlusion (High quality only) ────────────────────────
    if (QualitySettings.occlusion) this._updateOcclusionAlpha();

    // ── Slow tick: portals + pressure plates + echoes (every 8 frames)
    if (this._slowTickCounter % 8 === 0) {
      this._checkPressurePlates();
      this._checkPortals();
      this._checkEchoTriggers();
    }

    // ── Interact ─────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this._keys.F)) {
      this._handleInteract();
    }

    // ── Tether (co-op soft tether) ────────────────────────────────
    this._enforceTether();

    // ── Both players downed check ─────────────────────────────────
    this._checkBothDowned();

    // ── Network broadcast (only when connected) ───────────────────
    if (this.network?.connected) {
      this._netTimer += delta;
      if (this._netTimer >= NET_INTERVAL) {
        this._netTimer = 0;
        this._netBroadcast();
      }
    }

    // ── UI update (every 2 frames) ────────────────────────────────
    if (this._uiThrottleCounter % 2 === 0) {
      this.events.emit('update_ui', {
        players: this.players,
        boss: this._boss?.alive ? this._boss : null,
      });
    }
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
          if (proj.poisonOnHit) {
            const dps = (this._boss?.cfg.maxHp || 2000) * 0.004;
            p.applyPoison?.(this, dps, 3000);
          }
          if (proj.burnOnHit) {
            const dps = (this._boss?.cfg.maxHp || 2000) * 0.006;
            p.applyBurn?.(this, dps, 2200);
          }
          if (proj.slowOnHit) p.applySlow?.(this, 2500);
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
    const bossKey = this._mapBossOverride?.key || REGIONS[this._regionIndex].bossKey;
    if (!this._bossArenaPos || !bossKey) return;
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
    // Map editor override takes precedence for both key and position
    const bossKey = this._mapBossOverride?.key || region.bossKey;
    if (!bossKey) return;

    this._bossArenaGfx?.setVisible(false);
    this._bossArenaLabel?.setVisible(false);

    const bossPos = this._mapBossOverride
      ? { x: this._mapBossOverride.x, y: this._mapBossOverride.y }
      : region.bossPos;
    const boss = new Boss(this, bossPos.x, bossPos.y, bossKey);
    boss.enablePhysics(this);
    this._boss = boss;

    boss.enter(this);
    this.audio.bossPhase();

    if (boss.cfg.isFinal) {
      this._startBossIntro(boss);
    }
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
    // In co-op, only the host triggers portal transitions; client follows via REGION_CHANGE
    if (this.network?.connected && this.network.isClient()) return;
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

    // In co-op, host broadcasts region change so client transitions simultaneously
    if (this.network?.connected && this.network.isHost()) {
      this.network.send('REGION_CHANGE', { newIndex });
    }

    this._saveProgress(newIndex);
    this.audio.portal();
    this._fadeAndTransition(newIndex);
  }

  _saveProgress(_newIndex) {
    // Save removed — session-only progress
  }

  _fadeAndTransition(newIndex) {
    // White flash then fade to black for a dramatic portal effect
    const flash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(99999);
    this.tweens.add({
      targets: flash, alpha: 0.88,
      duration: 130, yoyo: true, hold: 55,
      onComplete: () => {
        flash.destroy();
        this.cameras.main.fadeOut(460, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.physics.world.timeScale = 1;
          this.time.timeScale = 1;
          this.scene.stop('UIScene');
          if (this.network?.connected) {
            this.registry.set('network', this.network);
          }
          this.scene.restart({
            regionIndex: newIndex,
            coop: this._isCoop,
            p1Char: this._p1Char,
            p2Char: this._p2Char,
          });
        });
      },
    });
  }

  _handleInteract() {
    // Revival takes priority: F held near downed ally is handled in _updateRevival
    for (const player of this.players) {
      if (!player?.alive || player.downed || !player.isLocal) continue;
      for (const ally of this.players) {
        if (ally === player || !ally?.downed) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, ally.x, ally.y) < 70) return;
      }
    }

    if (this._dialogueActive) {
      this._dialogueActive = false;
      this.events.emit('hide_dialogue');
      if (this._pendingPortalUnlock) {
        this._pendingPortalUnlock = false;
        this._unlockPortalNext();
      }
      return;
    }

    // ── World fragment objects ────────────────────────────────────
    for (const wf of this._worldFragmentObjects) {
      let nearest = Infinity;
      for (const p of this.players) {
        if (!p?.active) continue;
        const d = Phaser.Math.Distance.Between(wf.x, wf.y, p.x, p.y);
        if (d < nearest) nearest = d;
      }
      if (nearest >= 80) continue;

      this.loreManager.collect(wf.fragmentId);
      this._saveCollectedLore();
      this.events.emit('lore_collected', { count: this.loreManager.count(), total: this.loreManager.total() });

      const fragData = LORE_FRAGMENTS.find(f => f.id === wf.fragmentId);
      if (fragData) {
        this._dialogueActive = true;
        this.events.emit('show_dialogue', { text: fragData.text });
      }

      wf.gfx.destroy();
      wf.prompt.destroy();
      this._worldFragmentObjects = this._worldFragmentObjects.filter(o => o !== wf);
      return;
    }

    // ── NPCs ─────────────────────────────────────────────────────
    for (const npc of this.npcs) {
      if (!npc.isPlayerNear) continue;
      const questForNpc = Object.values(QUESTS).find(q => q.trigger === `npc_talk:${npc.npcId}`);
      const line = npc.interact(this.questManager, questForNpc);
      if (line) {
        this._dialogueActive = true;
        this.events.emit('show_dialogue', { text: line });
        this.audio.interact();

        // Collect NPC lore fragment on first talk (idempotent)
        const npcFrag = LORE_FRAGMENTS.find(f => f.source === 'npc' && f.npcId === npc.npcId);
        if (npcFrag && !this.loreManager.has(npcFrag.id)) {
          this.loreManager.collect(npcFrag.id);
          this._saveCollectedLore();
          this.events.emit('lore_collected', { count: this.loreManager.count(), total: this.loreManager.total() });
        }

        // Queue portal unlock to fire after player dismisses this dialogue
        const region = REGIONS[this._regionIndex];
        const unlockKey = `npc_talk:${npc.npcId}`;
        if (npc.npcId === 'elder_mahesh' || region.portalUnlock === unlockKey) {
          this._pendingPortalUnlock = true;
        }
      }
      return;
    }
  }

  _saveCollectedLore() {
    // Save removed — session-only lore tracking
  }

  _enforceTether() {
    const [p1, p2] = this.players;
    // Tether only applies in solo mode; in co-op positions come from network
    if (!p1 || !p2 || !p2.isLocal || this.network.connected) return;
    const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    if (d > TETHER_DIST) {
      const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
      p2.body.setVelocity(Math.cos(angle) * TETHER_SPEED, Math.sin(angle) * TETHER_SPEED);
    }
  }

  _checkBothDowned() {
    const allDown = this.players.every(p => !p?.alive || p.downed);
    if (allDown && !this._gameOverTimer) {
      // Short delay so players see themselves go down before the screen appears
      this._gameOverTimer = this.time.delayedCall(1200, () => {
        this.events.emit('game_over', { regionIndex: this._regionIndex });
      });
    } else if (!allDown && this._gameOverTimer) {
      this._gameOverTimer.remove();
      this._gameOverTimer = null;
    }
  }

  _netBroadcast() {
    if (!this.network?.connected) return;
    const localIdx = this.network.isHost() ? 0 : 1;
    const p = this.players[localIdx];
    if (!p) return;
    this.network.send('PLAYER_STATE', {
      playerIndex: localIdx,
      state: p.getNetState(),
    });
    // Host broadcasts all enemy states so client can render them
    if (this.network.isHost()) {
      const enemyStates = this.enemies
        .filter(e => e?.active)
        .map(e => e.getNetState());
      this.network.send('ENEMY_SYNC', { enemies: enemyStates });
    }
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
    if (type === 'shockwave') {
      // Elite shockwave — lightning burst
      if (this.anims?.exists('vfx_lightning6')) {
        const s = this.add.sprite(x, y, 'vfx_l6_1').setScale(1.6).setDepth(y + 5).setAlpha(0.9);
        s.play('vfx_lightning6');
        s.once('animationcomplete', () => this.tweens.add({ targets: s, alpha: 0, duration: 100, onComplete: () => s.destroy() }));
      }
      const circle = this.add.circle(x, y, r || 60, 0x88ccff, 0.2);
      this.tweens.add({ targets: circle, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 350, onComplete: () => circle.destroy() });
    } else if (type === 'explosion') {
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
    } else if (type === 'venom_pool') {
      // Lingering poison zone — damages players who stand in it
      const poolR  = 55;
      const pool   = this.add.circle(x, y, poolR, 0x00aa33, 0.45);
      pool.setDepth(1);
      const tickDmg  = (this._boss?.cfg.maxHp || 2000) * 0.004;
      const interval = this.time.addEvent({
        delay: 600, repeat: 6,
        callback: () => {
          for (const p of this.players) {
            if (!p?.alive || p.downed) continue;
            if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < poolR) {
              p.takeDamage(tickDmg, null, this);
            }
          }
        },
      });
      this.tweens.add({
        targets: pool, alpha: 0, duration: 4200,
        onComplete: () => { interval.remove(); pool.destroy(); },
      });
    } else if (type === 'tail_sweep') {
      // Green arc drawn behind the boss showing sweep range
      const { angle: sweepAngle, r: sweepR } = data;
      const gfx = this.add.graphics();
      gfx.lineStyle(3, 0x44ff88, 0.9);
      gfx.fillStyle(0x44ff88, 0.18);
      gfx.beginPath();
      gfx.moveTo(x, y);
      gfx.arc(x, y, sweepR, sweepAngle - Math.PI * 0.6, sweepAngle + Math.PI * 0.6, false);
      gfx.closePath();
      gfx.fillPath();
      gfx.strokePath();
      gfx.setDepth(2);
      this.tweens.add({
        targets: gfx, alpha: 0, duration: 450,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  _onEnemyKilled(data) {
    this.questManager.onEnemyKill(this._regionIndex);
    const idx = this.enemies.indexOf(data.enemy);
    if (idx > -1) this.enemies.splice(idx, 1);

    // Kill combo tracker
    this._comboCount = (this._comboCount || 0) + 1;
    if (this._comboTimer) this._comboTimer.remove();
    this._comboTimer = this.time.delayedCall(3000, () => { this._comboCount = 0; this._comboTimer = null; });
    if (this._comboCount >= 2) this.events.emit('kill_combo', { count: this._comboCount });

    // Food drop — 28% chance, elite/mimic drop better food
    const e = data.enemy;
    const roll = Math.random();
    if (roll < 0.28) {
      const isElite = e.typeKey === 'elite' || e.typeKey === 'mimic';
      const isMid   = e.typeKey === 'orc' || e.typeKey === 'slimem' || e.typeKey === 'rat';
      let foodType, healAmt;
      if (isElite)      { foodType = 'food_donut';  healAmt = 50; }
      else if (isMid)   { foodType = 'food_pizza';  healAmt = 35; }
      else              { foodType = 'food_melon';  healAmt = 20; }
      this._spawnFoodPickup(e.x, e.y, foodType, healAmt);
    }

    // XP gain
    const xpGain = e.cfg?.xpValue ?? 10;
    const primaryPlayer = this.players?.find(p => p?.alive) || this.players?.[0];
    if (primaryPlayer?.gainXP) {
      primaryPlayer.gainXP(xpGain);
      this.saveData.playerXP = primaryPlayer.xp;
      this.saveData.playerLevel = primaryPlayer.level;
    }

    // Item drop from enemy loot table
    const drops = e.cfg?.drops || [];
    for (const drop of drops) {
      if (Math.random() < drop.chance) {
        SaveManager.addItem(this.saveData, drop.item);
        SaveManager.save(this.saveData);
        const def = ITEM_DEFS[drop.item];
        if (def?.type === 'passive') this._applyPassiveItem(def);
        this.events.emit('item_acquired', { itemId: drop.item, name: def?.name || drop.item });
        break;
      }
    }

    const region = REGIONS[this._regionIndex];
    if (region.portalUnlock === 'kill_all' && this._fixedEnemyMode) {
      this._anyEnemyKilled = true;
      if (this.enemies.filter(e => e.alive).length === 0) {
        this._unlockPortalNext();
        this.events.emit('toast', { text: 'The grove is cleansed — the path opens.' });
      }
    }
  }

  _applyPassiveItem(def) {
    if (!def?.effect) return;
    for (const p of (this.players || [])) {
      if (!p?.alive) continue;
      if (def.effect.stat === 'maxHp') {
        p.maxHp += def.effect.amount;
        p.hp = Math.min(p.hp + def.effect.amount, p.maxHp);
        p._updateHpBar?.();
      } else if (def.effect.stat === 'abilityPow') {
        p.abilityPow = Math.round((p.abilityPow + def.effect.amount) * 100) / 100;
      }
    }
    if (this.saveData?.playerStats) {
      if (def.effect.stat === 'maxHp') this.saveData.playerStats.maxHp = (this.saveData.playerStats.maxHp || 200) + def.effect.amount;
      if (def.effect.stat === 'abilityPow') this.saveData.playerStats.abilityPow = Math.round(((this.saveData.playerStats.abilityPow || 1.0) + def.effect.amount) * 100) / 100;
    }
  }

  _spawnFoodPickup(x, y, textureKey, healAmt) {
    if (!this.foodPickups) this.foodPickups = [];
    const animMap = { food_donut: 'food_donut_spin', food_pizza: 'food_pizza_eat', food_melon: 'food_melon_spin' };
    const isAnimated = !!animMap[textureKey];
    const sprite = isAnimated
      ? this.add.sprite(x, y - 5, textureKey).play(animMap[textureKey])
      : this.add.image(x, y - 5, textureKey);
    sprite.setDepth(y + 5).setScale(isAnimated ? 2.5 : 2.0);

    // Bob tween
    this.tweens.add({ targets: sprite, y: sprite.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const pickup = { sprite, healAmt, textureKey, x, y, lifetime: 15000 };
    this.foodPickups.push(pickup);

    // Auto-despawn
    this.time.delayedCall(15000, () => {
      if (!pickup.collected) {
        this.tweens.add({ targets: sprite, alpha: 0, duration: 400, onComplete: () => sprite.destroy() });
        const i = this.foodPickups.indexOf(pickup);
        if (i > -1) this.foodPickups.splice(i, 1);
      }
    });
  }

  _onBossPhaseChanged(data) {
    const boss = data.boss;
    if (!boss) return;
    // Big smoke burst on each boss phase transition
    const cx = boss.x, cy = boss.y;
    for (let i = 0; i < 5; i++) {
      const ox = Phaser.Math.Between(-60, 60);
      const oy = Phaser.Math.Between(-60, 30);
      const smokeKey = i < 3 ? 'vfx_smoke3' : 'vfx_smoke4';
      if (this.anims?.exists(smokeKey)) {
        const pfx = i < 3 ? 'vfx_s3_' : 'vfx_s4_';
        this.time.delayedCall(i * 80, () => {
          if (!this.scene.isActive()) return;
          const s = this.add.sprite(cx + ox, cy + oy, `${pfx}1`).setScale(1.0).setDepth(cy + 50).setAlpha(0.75);
          s.play(smokeKey);
          s.once('animationcomplete', () => this.tweens.add({ targets: s, alpha: 0, duration: 200, onComplete: () => s.destroy() }));
        });
      }
    }

    // Spawn rotating arena hazards from phase 2 onward
    if (data.phaseIndex >= 1) {
      this.time.delayedCall(1600, () => {
        if (this._boss?.alive) this._spawnArenaHazards(this._boss, data.phaseIndex);
      });
    }
  }

  _onBossKilled(data) {
    const { bossKey } = data;
    this.questManager.onBossKill(bossKey, this._regionIndex);
    this.audio.victory();

    // Clear arena hazards
    for (const h of this._arenaHazards) h.gfx?.destroy();
    this._arenaHazards = [];

    // Boss XP reward
    const bossXp = BOSSES[bossKey]?.xpValue ?? 200;
    const primaryPlayer = this.players?.find(p => p?.alive) || this.players?.[0];
    if (primaryPlayer?.gainXP) {
      primaryPlayer.gainXP(bossXp);
      this.saveData.playerXP = primaryPlayer.xp;
      this.saveData.playerLevel = primaryPlayer.level;
    }

    // Boss reward item
    const bossRewardItem = BOSSES[bossKey]?.rewardItem;
    if (bossRewardItem) {
      SaveManager.addItem(this.saveData, bossRewardItem);
      SaveManager.save(this.saveData);
      const def = ITEM_DEFS[bossRewardItem];
      this.events.emit('item_acquired', { itemId: bossRewardItem, name: def?.name || bossRewardItem });
    }

    // Collect boss lore fragment
    const bossFragId = data.boss?.cfg?.loreFragment;
    if (bossFragId && !this.loreManager.has(bossFragId)) {
      this.loreManager.collect(bossFragId);
      this._saveCollectedLore();
      this.events.emit('lore_collected', { count: this.loreManager.count(), total: this.loreManager.total() });
    }

    // Show boss lore (non-final only — final boss uses UIScene defeat speech)
    if (bossKey !== 'viyogasur') {
      const bossData = data.boss?.cfg;
      if (bossData) {
        this.time.delayedCall(1500, () => {
          this.events.emit('show_dialogue', { text: `✦ ${bossData.name} defeated ✦\n"${bossData.lore}"` });
          this.time.delayedCall(5000, () => this.events.emit('hide_dialogue'));
        });
      }
      // Level-up selection after lore clears
      this.time.delayedCall(3800, () => {
        this.events.emit('level_up_available', { bossKey });
      });
    }

    // Final boss: UIScene handles defeat speech; we transition after 8s
    if (bossKey === 'viyogasur') {
      this.time.delayedCall(8000, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameEndingScene', {
          loreCount:       this.loreManager.count(),
          loreTotal:       this.loreManager.total(),
          canTrueEnding:   this.loreManager.canTrueEnding(),
          questsCompleted: this.questManager.getCompletedArray().length,
        });
      });
    }
  }

  _checkEchoTriggers() {
    const region = REGIONS[this._regionIndex];
    if (!region.echoTriggers?.length) return;
    for (const trigger of region.echoTriggers) {
      if (this._firedEchoes.has(trigger.id)) continue;
      for (const p of this.players) {
        if (!p?.active) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, trigger.x, trigger.y);
        if (d < trigger.r) {
          this._firedEchoes.add(trigger.id);
          this.events.emit('show_dialogue', { text: trigger.text });
          this.time.delayedCall(4000, () => this.events.emit('hide_dialogue'));
          break;
        }
      }
    }
  }

  _onBossWallBreak(data) {
    const { boss } = data;
    this.cameras.main.shake(900, 0.022);

    // Screen flash
    const flash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0.35)
      .setScrollFactor(0).setDepth(9000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });

    // Debris rocks fly outward from boss position
    const rockKeys = ['rock1', 'rock2'];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 / 10) * i + (Math.random() * 0.3);
      const rock = this.add.image(boss.x, boss.y, rockKeys[i % 2])
        .setScale(0.5 + Math.random() * 0.7)
        .setDepth(boss.y + 20);
      this.tweens.add({
        targets: rock,
        x: boss.x + Math.cos(angle) * (120 + Math.random() * 160),
        y: boss.y + Math.sin(angle) * (120 + Math.random() * 160),
        angle: 360 * (Math.random() > 0.5 ? 1 : -1),
        alpha: 0,
        duration: 700 + Math.random() * 300,
        ease: 'Power2.Out',
        onComplete: () => rock.destroy(),
      });
    }

    // Toast
    this.time.delayedCall(200, () => {
      this.events.emit('show_dialogue', { text: '⟨Pashana Daitya⟩ "You dare chip the stone? Then feel the mountain\'s RAGE!"' });
      this.time.delayedCall(2800, () => this.events.emit('hide_dialogue'));
    });
  }

  _startBossIntro(boss) {
    if (!boss.cfg.introLines?.length) return;
    this._bossIntroActive = true;
    boss._introActive = true;

    const lines = boss.cfg.introLines;
    let i = 0;
    const showNext = () => {
      if (i >= lines.length) {
        this.time.delayedCall(800, () => {
          this._bossIntroActive = false;
          boss._introActive = false;
          this.events.emit('hide_dialogue');
        });
        return;
      }
      this.events.emit('show_dialogue', { text: lines[i++] });
      this.time.delayedCall(3000, showNext);
    };
    // Delay to let the boss name-card overlay finish (~2.8s in UIScene)
    this.time.delayedCall(3200, showNext);
  }

  _updateRevival(delta) {
    if (this.network?.connected) return; // Co-op: rely on auto-revive
    let revivalPossible = false;
    for (const player of this.players) {
      if (!player?.alive || player.downed || !player.isLocal) continue;
      for (const ally of this.players) {
        if (ally === player || !ally?.downed) continue;
        const d = Phaser.Math.Distance.Between(player.x, player.y, ally.x, ally.y);
        if (d < 70) {
          revivalPossible = true;
          if (this._keys.F.isDown) {
            player._revivalTimer = (player._revivalTimer || 0) + delta;
            const progress = Math.min(1, player._revivalTimer / 1800);
            this.events.emit('revival_progress', { progress });
            this.events.emit('revival_prompt', { show: false });
            if (player._revivalTimer >= 1800) {
              player._revivalTimer = 0;
              ally.revive();
              this.audio?.interact?.();
              this.events.emit('revival_progress', { progress: 0 });
            }
          } else {
            player._revivalTimer = 0;
            this.events.emit('revival_prompt', { show: true });
            this.events.emit('revival_progress', { progress: 0 });
          }
          return;
        }
      }
    }
    if (!revivalPossible) {
      for (const p of this.players) { if (p) p._revivalTimer = 0; }
      this.events.emit('revival_prompt', { show: false });
      this.events.emit('revival_progress', { progress: 0 });
    }
  }

  _spawnArenaHazards(boss, phase) {
    for (const h of this._arenaHazards) h.gfx?.destroy();
    this._arenaHazards = [];

    const count  = phase === 1 ? 3 : 5;
    const radius = 165 + phase * 15;
    const speed  = phase === 1 ? 0.00115 : 0.00185;

    for (let i = 0; i < count; i++) {
      const startAngle = (Math.PI * 2 / count) * i;
      const wx = boss.x + Math.cos(startAngle) * radius;
      const wy = boss.y + Math.sin(startAngle) * radius;

      const warn = this.add.circle(wx, wy, 26, 0xff4400, 0.2).setDepth(10);
      warn.setStrokeStyle(2, 0xff6600);
      this.tweens.add({ targets: warn, alpha: { from: 0.1, to: 0.55 }, duration: 230, yoyo: true, repeat: 4 });

      this.time.delayedCall(1400, () => {
        if (!boss.alive || !warn.active) { warn.destroy(); return; }
        warn.setFillStyle(0xff2200, 0.45);
        this._arenaHazards.push({ gfx: warn, dist: radius, angle: startAngle, speed, boss, lastDmgTime: 0 });
      });
    }
  }

  _updateArenaHazards(time, delta) {
    for (let i = this._arenaHazards.length - 1; i >= 0; i--) {
      const h = this._arenaHazards[i];
      if (!h.gfx?.active || !h.boss?.alive) {
        h.gfx?.destroy();
        this._arenaHazards.splice(i, 1);
        continue;
      }
      h.angle += h.speed * delta;
      const hx = h.boss.x + Math.cos(h.angle) * h.dist;
      const hy = h.boss.y + Math.sin(h.angle) * h.dist;
      h.gfx.setPosition(hx, hy);
      h.gfx.setDepth(hy + 5);

      if (time - h.lastDmgTime > 550) {
        for (const p of this.players) {
          if (!p?.alive || p.downed) continue;
          if (Phaser.Math.Distance.Between(hx, hy, p.x, p.y) < 34) {
            p.takeDamage(h.boss.cfg.maxHp * 0.016, h.boss, this);
            h.lastDmgTime = time;
            break;
          }
        }
      }
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
