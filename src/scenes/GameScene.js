import { WORLD_W, WORLD_H, GAME_W, GAME_H, NET_INTERVAL, TETHER_DIST, TETHER_SPEED, BOSS_TRIGGER_DIST, ITEM_DEFS } from '../constants.js';
import { REGIONS } from '../data/regions.js';
import { _mapSpriteKey } from './PreloadScene.js';
import { QUESTS, LORE_FRAGMENTS } from '../data/quests.js';
import { LoreManager } from '../systems/LoreManager.js';
import { Player } from '../entities/Player.js';
import { Enemy  } from '../entities/Enemy.js';
import { Boss   } from '../entities/Boss.js';
import { BOSSES } from '../data/bosses.js';
import { familyForKey, familyLoads, familyAnimKeys, entityType, assetsReady, defineAnims, loadAnimationsJSON } from '../systems/AnimationLoader.js';
import { statsFor } from '../data/creatureStats.js';
import { Projectile } from '../entities/Projectile.js';
import { AudioManager } from '../systems/AudioManager.js';
import { QuestManager } from '../systems/QuestManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { NetworkManager } from '../systems/NetworkManager.js';
import { QualitySettings } from '../systems/QualitySettings.js';
import { ExploredManager } from '../systems/ExploredManager.js';
import { NPC } from '../entities/NPC.js';

// Gated shortcuts: portals sealed until a requirement is met. Keyed by region index,
// matched to a portal by its targetRegion. requires: { lore: N } | { item } | { boss }.
// Only gate optional/secret branches so the critical path can never be blocked.
const PORTAL_GATES = {
  34: [{ target: 39, requires: { lore: 15 }, sealedText: 'The Sixth Door is sealed. It opens only to one who has gathered the erased truth (15 lore fragments).' }],
};

// ── Seamless region streaming ───────────────────────────────────────────────
// Silently pre-load the horizontally-adjacent region beside the current one so
// the player walks across the boundary with no portal / fade / restart. The
// region behind is unloaded once the camera has fully left it. Solo play, and
// horizontal (east/west) neighbours along `_streamChain` (numeric index order).
const STREAM_POC = {
  enabled: true,
  trigger: 520,        // px from the shared edge → start pre-loading the neighbour
  commit:  720,        // px past the boundary → old region is off-camera, unload + remap
  buildPerFrame: 100,  // streamed-region sprites created per frame (avoids a build hitch)
};

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
    // Persisted progression (stats, XP, Amrit, lore, quests…) merged over defaults.
    const saveData = { ...SaveManager.defaults(), ...(SaveManager.load() || {}) };
    this._save = saveData;
    this._pendingLevels = saveData.pendingLevels ?? 0;
    const regionIndex = data.regionIndex ?? saveData.regionIndex ?? 0;
    this._regionIndex = regionIndex;

    // Permanently record this region as explored for the world map (fog-of-war).
    ExploredManager.markExplored(regionIndex);

    // Look up map-editor layout first so we can use it for the fallback region
    const _regionMaps = this.registry.get('regionMaps') || [];
    this._mapData = _regionMaps.find(e => e.regionIndex === regionIndex)?.data || null;

    // Horizontal streaming chain: every real region, in numeric index order.
    // Region 0 then the editor regions 7..49 (legacy procedural 1–6 are excluded
    // — the authored flow bypasses them via region 0 → 7).
    this._streamChain = _regionMaps
      .map(e => e.regionIndex)
      .filter(i => i === 0 || i >= 7)
      .sort((a, b) => a - b);

    // Real region (REGIONS[]) when present, else a synthesised editor descriptor.
    const region = this._regionDescriptor(regionIndex, this._mapData);

    // Systems
    this.audio  = new AudioManager();
    this.questManager = new QuestManager();
    this.questManager.load(saveData.completedQuests || []);
    this.loreManager = new LoreManager();
    this.loreManager.load(saveData.collectedLoreIds || []);
    // Codex tracking: enemies faced and NPCs met (for the Bestiary / NPC pages).
    this._encounteredEnemies = new Set(saveData.encounteredEnemyIds || []);
    this._metNpcs = new Map((saveData.metNpcs || []).map(n => [n.id, n]));
    this.network = this.registry.get('network') || new NetworkManager();
    this.registry.remove('network');

    this._region = region;
    this._mapBossOverride = null;

    // Physics world
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this._noWalkGroup = this.physics.add.staticGroup();

    // ── World setup ────────────────────────────────────────────────
    this._setupWorld(region);
    this._buildParallaxBorder(regionIndex, region);
    this._buildGroundTexture();
    this._spawnAmbientParticles(regionIndex);
    this._applyRegionColorOverlay(regionIndex);
    this._glowCount = 0;       // reset per-region glow budget (scene instance is reused)
    this._lightPoolCount = 0;  // reset per-region light-pool budget
    this._setupPostFx(regionIndex);
    this._buildVignette(regionIndex);

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
    this.physics.add.collider(this.players, this._noWalkGroup);

    // Re-apply persisted level-up stat tiers so character growth survives reloads.
    const tiers = saveData.statTiers || {};
    for (const [stat, tier] of Object.entries(tiers)) {
      if (tier > 0) this.players.forEach(p => p?.applyStat?.(stat, tier));
    }
    this.players.forEach(p => { if (p) p.hp = p.maxHp; });

    // Seed the HUD Amrit pips from each player's actual charges.
    this.time.delayedCall(0, () => {
      this.events.emit('amrit_changed', { player: p1, charges: p1.amritCharges, max: p1.amritMax });
      this.events.emit('amrit_changed', { player: p2, charges: p2.amritCharges, max: p2.amritMax });
    });

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

      // Damage dealt to a remote player is forwarded here so the owner applies
      // it authoritatively to its own local player (HP, dodge, downed state).
      const onPlayerDamage = ({ amount }) => {
        const local = this.players.find(p => p?.isLocal);
        if (local) local.takeDamage(amount, null, this);
      };
      this.network.on('PLAYER_DAMAGE', onPlayerDamage);
      _netCleanup.push(['PLAYER_DAMAGE', onPlayerDamage]);

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
      H: Phaser.Input.Keyboard.KeyCodes.H,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    // World map overlay — open with M (when not already paused / mid-dialogue).
    this.input.keyboard.on('keydown-M', () => {
      if (this._paused || this._mapOpen || this._dialogueActive || this._bossIntroActive) return;
      this.openWorldMap();
    });

    // Debug: P prints the nearest enemy's live + configured stats (for balancing
    // map-editor creatures). Logs to console and flashes a readout on screen.
    this.input.keyboard.on('keydown-P', () => this._debugPrintNearestCreature());

    // ── Enemies ───────────────────────────────────────────────────
    this.enemies     = [];
    this._mapNpcs    = [];
    this._mapCreatures = [];
    this.projectiles = [];
    this.physics.add.collider(this.enemies, this._noWalkGroup);
    this._spawnerTimers = [];
    this._spawnerPositions = region.spawnerPositions || [];
    this._treePositions = [];
    this._boss = null;
    this._bossTriggered = false;
    this._bossAssetsReady = true;     // flipped to false by _ensureBossAssets if a stream is needed
    this._bossLoadingFamily = null;
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
    // FPS watchdog: accumulates time spent below the threshold; if it stays low
    // long enough we step quality down one level (once per scene session).
    this._lowFpsAccum   = 0;
    this._fpsGraceTimer = 3000;   // ignore the first few seconds (load/GC spikes)
    this._autoDowngraded = false;
    this._wdLast = undefined;
    this._pendingRTBake     = [];
    this._paused = false;
    this._fixedEnemyMode = false;
    this._anyEnemyKilled = false;

    // Seamless streaming state. `base` is the region occupying world-cell 0
    // (x: 0..WORLD_W). `next`/`prev` hold a pre-loaded neighbour (or null).
    this._stream = { base: regionIndex, next: null, prev: null };
    this._streamBusy = false;
    // Deferred sprite creation for streamed neighbours: { regionIndex, fn }
    // entries drained a few-hundred-per-frame so heavy regions don't hitch.
    this._streamBuildQueue = [];

    this._shrineOpen = false;
    this._createWorldFragments(region);
    this._createSpawners(region);
    this._createPortals(region);
    this._createShrine(region);
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

    // Seal any gated shortcuts in this region (portals must exist by now).
    this._applyPortalGates();

    this._spawnRabbitDecoration(regionIndex);

    // ── UI scene (overlay) ────────────────────────────────────────
    this.scene.launch('UIScene', { gameScene: this });
    this._spawnDeathEcho();

    // ── Event listeners ───────────────────────────────────────────
    this.events.on('spawn_projectile',  this._onSpawnProjectile, this);
    this.events.on('healing_aura',      this._onHealingAura, this);
    this.events.on('ability_fx',        this._onAbilityFx, this);
    this.events.on('amrit_used',        this._onAmritUsed, this);
    this.events.on('level_banked',      this._onLevelBanked, this);
    this.events.on('level_up_done',     this._onLevelUpDone, this);
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
        SaveManager.addItem(this._save, reward.item);
        SaveManager.save(this._save);
        const def = ITEM_DEFS[reward.item];
        if (def?.type === 'passive') this._applyPassiveItem(def);
        this.events.emit('item_acquired', { itemId: reward.item, name: def?.name || reward.name });
      }
    });
    // ── Region title ──────────────────────────────────────────────
    // Prefer the map's nickname + Sanskrit subtitle when a JSON map exists,
    // so editor-authored regions (incl. the start region) show the new names
    // even where a legacy REGIONS[] entry would otherwise shadow them.
    this.time.delayedCall(500, () => {
      const titleName = this._mapData?.regionName || region.name;
      const titleSub  = this._mapData?.regionSubtitle ?? region.subtitle;
      this.events.emit('region_title', { name: titleName, subtitle: titleSub });
    });

    // Start ambient audio
    this.audio.startAmbient(regionIndex);

    // Auto-trigger region main quest
    const QUEST_PREFIXES = ['gramavana','mahavana','vrindavana','nagapatal','devamandira','swargaseema','viyogadurga'];
    const mainQuestKey = QUEST_PREFIXES[regionIndex] + '_main';
    if (QUESTS[mainQuestKey]) {
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

    // Tag everything the base region just created so seamless streaming can
    // later unload it. Players (Containers) and camera-fixed HUD are skipped.
    if (STREAM_POC.enabled) this._tagBaseRegion(regionIndex);

    console.log(`[GameScene] Region ${regionIndex}: ${region.name}`);
  }

  // ── Seamless region streaming ─────────────────────────────────────────────
  // Tag the currently-built region's world objects + enemies + no-walk bodies
  // with `_streamRegion` so they can be located and destroyed on unload.
  _tagBaseRegion(regionIndex) {
    for (const o of this.children.list) {
      if (o === this.players?.[0] || o === this.players?.[1]) continue;
      if (o.scrollFactorX === 0) continue; // camera-fixed (HUD / vignette / flash)
      if (o._streamRegion == null) o._streamRegion = regionIndex;
    }
    for (const e of (this.enemies || []))            if (e._streamRegion == null) e._streamRegion = regionIndex;
    for (const z of this._noWalkGroup.getChildren()) if (z._streamRegion == null) z._streamRegion = regionIndex;
    for (const n of (this._mapNpcs || []))           if (n._streamRegion == null) n._streamRegion = regionIndex;
    for (const c of (this._mapCreatures || []))      if (c._streamRegion == null) c._streamRegion = regionIndex;
  }

  // Real region (REGIONS[]) when present, else a synthesised descriptor for an
  // editor-only region (indices 7..49) built from its map data. Shared by the
  // initial create() build, streamed neighbours, and post-crossing commits.
  _regionDescriptor(regionIndex, mapData) {
    if (REGIONS[regionIndex]) return REGIONS[regionIndex];
    const md = mapData || (this.registry.get('regionMaps') || []).find(e => e.regionIndex === regionIndex)?.data || null;
    let bgColor = 0x2d5c28;
    if (md?.background?.type === 'color' && md.background.value) {
      bgColor = parseInt(md.background.value.replace('#', ''), 16);
    }
    return {
      index: regionIndex,
      name: md?.regionName || `Region ${regionIndex}`,
      subtitle: md?.regionSubtitle || '',
      bgColor,
      bgColor2: bgColor,
      borderColor: 0x111111,
      difficulty: 1.0,
      bossKey: null,
      bossPos: null,
      spawnPos: { x: 380, y: WORLD_H / 2 },
      portalBack: null,
      portalNext: null,
      spawnerPositions: [],
      platePositions: [],
      fixedEnemies: [],
      enemyTypes: ['melee'],
      echoTriggers: [],
      worldFragments: [],
      ambientKey: 0,
    };
  }

  // Position of a region in the horizontal chain, or -1 if not chained.
  _chainPos(regionIndex) { return (this._streamChain || []).indexOf(regionIndex); }

  // Neighbouring region index in the chain (`dir` = +1 east / -1 west), or null.
  _chainNeighbor(regionIndex, dir) {
    const chain = this._streamChain || [];
    const pos = chain.indexOf(regionIndex);
    if (pos < 0) return null;
    const n = pos + dir;
    return (n >= 0 && n < chain.length) ? chain[n] : null;
  }

  // Create up to `budget` queued streamed-region sprites this frame.
  _drainBuildQueue(budget) {
    const q = this._streamBuildQueue;
    let n = Math.min(budget, q.length);
    for (let i = 0; i < n; i++) q.shift().fn();
  }

  // Create all remaining queued sprites for a region immediately (used right
  // before a remap so the survivor's pending sprites get shifted with it).
  _flushBuildQueue(regionIndex) {
    const q = this._streamBuildQueue;
    const keep = [];
    for (const item of q) { if (item.regionIndex === regionIndex) item.fn(); else keep.push(item); }
    this._streamBuildQueue = keep;
  }

  // Discard queued sprites for a region that is being unloaded (never created).
  _dropBuildQueue(regionIndex) {
    this._streamBuildQueue = this._streamBuildQueue.filter(item => item.regionIndex !== regionIndex);
  }

  // Build a full region's world content shifted by (dx, dy). Returns a "slice"
  // descriptor tracking everything created so it can be unloaded later. Mirrors
  // the active-region build path but offset, tagged, and without portals/UI.
  _buildRegionAtOffset(regionIndex, dx, dy) {
    const maps = this.registry.get('regionMaps') || [];
    const mapData = maps.find(e => e.regionIndex === regionIndex)?.data || null;
    const region = this._regionDescriptor(regionIndex, mapData);
    if (!region) return null;
    const sink = { regionIndex, dx, dy, objects: [], enemies: [], noWalk: [] };

    this._paintRegionGround(region, mapData, dx, dy, sink);

    if (mapData) {
      this._buildFromMapData(mapData, { dx, dy, regionIndex, sink, difficulty: region.difficulty });
    } else if (region.denseForest) {
      this._buildForestAtOffset(region, dx, dy, sink);
    } else {
      this._buildDecorAtOffset(region, regionIndex, dx, dy, sink);
    }

    // Pre-placed enemies (host/solo only). Streamed regions use fixed enemies;
    // spawner timers are intentionally skipped to avoid orphaned timers.
    if (!this.network.connected || this.network.isHost()) {
      const track = (e) => { e._streamRegion = regionIndex; sink.enemies.push(e); this.enemies.push(e); };
      for (const cfg of (region.fixedEnemies || [])) {
        track(new Enemy(this, cfg.x + dx, cfg.y + dy, cfg.type, region.difficulty));
      }
    }

    const queued = this._streamBuildQueue.filter(i => i.regionIndex === regionIndex).length;
    console.log(`[stream] built region ${regionIndex} at (${dx},${dy}) — ${sink.objects.length} objs + ${queued} queued sprites, ${sink.enemies.length} enemies`);
    return sink;
  }

  // Background fill + patches + edge strip + ground noise for a streamed region.
  _paintRegionGround(region, mapData, dx, dy, sink) {
    const track = (o) => { o._streamRegion = sink.regionIndex; sink.objects.push(o); return o; };
    let bgColor = region.bgColor, bgColor2 = region.bgColor2;
    if (mapData?.background?.type === 'color' && mapData.background.value) {
      bgColor = bgColor2 = parseInt(mapData.background.value.replace('#', ''), 16);
    }
    const g = track(this.add.graphics().setDepth(-10));
    g.fillStyle(bgColor, 1);
    g.fillRect(dx, dy, WORLD_W, WORLD_H);
    g.fillStyle(bgColor2, 0.5);
    const PATCH = 120;
    const cols = Math.ceil(WORLD_W / PATCH), rows = Math.ceil(WORLD_H / PATCH);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hash = (r * 7 + c * 13 + r * c) % 5;
        if (hash < 2) g.fillRect(dx + c * PATCH + (hash * 12 % PATCH), dy + r * PATCH + (hash * 17 % PATCH), PATCH * 0.55 + hash * 10, PATCH * 0.55 + hash * 8);
      }
    }
    const VIGN = 60, border = region.borderColor || 0x000000;
    g.fillStyle(border, 0.6);
    g.fillRect(dx, dy, WORLD_W, VIGN);                 // top
    g.fillRect(dx, dy + WORLD_H - VIGN, WORLD_W, VIGN); // bottom
    // Skip the vertical edge strip that faces the active region so the shared
    // boundary doesn't render a double-thick dark wall.
    if (dx < 0) g.fillRect(dx, dy, VIGN, WORLD_H);                  // left edge (far side for a western neighbour)
    if (dx > 0) g.fillRect(dx + WORLD_W - VIGN, dy, VIGN, WORLD_H); // right edge (far side for an eastern neighbour)

    if (this.textures.exists('ground_tile_noise')) {
      track(this.add.tileSprite(dx, dy, WORLD_W, WORLD_H, 'ground_tile_noise')
        .setOrigin(0, 0).setDepth(-8).setAlpha(0.65));
    }
  }

  // Dense forest trees placed directly (no RT-bake deferral) at an offset.
  _buildForestAtOffset(region, dx, dy, sink) {
    const track = (o) => { o._streamRegion = sink.regionIndex; sink.objects.push(o); return o; };
    const jungleKeys = ['jungle_tree_1','jungle_tree_2','jungle_tree_3','jungle_tree_4','jungle_tree_5','jungle_tree_6','jungle_tree_7','jungle_tree_8','jungle_tree_9','jungle_tree_10','jungle_tree_11','jungle_tree_12','jungle_tree_13','jungle_tree_14'];
    const firKeys = ['fir_tree_1','fir_tree_2','fir_tree_3','fir_tree_4','fir_tree_5','fir_tree_6','fir_tree_7','fir_tree_8','fir_tree_9','fir_tree_10','fir_tree_11'];
    const stumpKeys = ['ts_stump_1','ts_stump_2','ts_stump_3','ts_stump_4'];
    const forestX = 900, forestW = WORLD_W - forestX;
    const excl = [
      ...(region.spawnPos ? [{ x: region.spawnPos.x - forestX, y: region.spawnPos.y, r: 180 }] : []),
      ...(region.fixedEnemies || []).map(e => ({ x: e.x - forestX, y: e.y, r: 120 })),
    ];
    const points = poissonDisk(forestW, WORLD_H, 80, 160, excl, 1234);
    for (const pt of points) {
      const wx = pt.x + forestX, r = Math.random();
      let key, scale;
      if (r < 0.20)      { key = stumpKeys[Math.floor(Math.random() * stumpKeys.length)]; scale = 0.30 + Math.random() * 0.15; }
      else if (r < 0.60) { key = jungleKeys[Math.floor(Math.random() * jungleKeys.length)]; scale = 0.60 + Math.random() * 0.40; }
      else               { key = firKeys[Math.floor(Math.random() * firKeys.length)]; scale = 0.70 + Math.random() * 0.40; }
      if (!this.textures.exists(key)) continue;
      const tree = track(this.add.image(wx + dx, pt.y + dy, key).setScale(scale).setDepth(1));
      tree.setAlpha(0);
      this.tweens.add({ targets: tree, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    }
  }

  // Generic scatter decorations for regions without map data or a forest flag.
  _buildDecorAtOffset(region, regionIndex, dx, dy, sink) {
    const track = (o) => { o._streamRegion = sink.regionIndex; sink.objects.push(o); return o; };
    for (let i = 0; i < 30; i++) {
      const x = 200 + Math.random() * (WORLD_W - 400);
      const y = 200 + Math.random() * (WORLD_H - 400);
      let key = regionIndex >= 4 ? (Math.random() < 0.5 ? 'rock1' : 'rock2')
                                 : ['bush1','bush2','bush3','bush4','rock1','rock2'][Math.floor(Math.random() * 6)];
      if (!this.textures.exists(key)) continue;
      track(this.add.image(x + dx, y + dy, key).setScale(1.5 + Math.random()).setDepth(y));
    }
  }

  // Destroy every object/enemy/no-walk body belonging to a streamed slice.
  _unloadSlice(slice) {
    if (!slice) return;
    this._dropBuildQueue(slice.regionIndex);   // cancel any not-yet-created sprites
    for (const e of slice.enemies) {
      const i = this.enemies.indexOf(e);
      if (i >= 0) this.enemies.splice(i, 1);
      e.destroy?.();
    }
    for (const z of slice.noWalk) { this._noWalkGroup.remove(z, true, true); }
    for (const o of slice.objects) o.destroy?.();
    this._noWalkGroup.refresh();
  }

  // Destroy the active (untracked-but-tagged) base region by its index.
  _unloadRegion(regionIndex) {
    this._dropBuildQueue(regionIndex);   // safety: cancel any pending sprite work
    // Enemies tagged with this region.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i]?._streamRegion === regionIndex) { this.enemies[i].destroy?.(); this.enemies.splice(i, 1); }
    }
    // NPCs / creatures.
    this._mapNpcs    = (this._mapNpcs || []).filter(n => { if (n._streamRegion === regionIndex) { n.destroy?.(); return false; } return true; });
    this._mapCreatures = (this._mapCreatures || []).filter(c => { if (c._streamRegion === regionIndex) { c.destroy?.(); return false; } return true; });
    // No-walk bodies.
    for (const z of this._noWalkGroup.getChildren().slice()) {
      if (z._streamRegion === regionIndex) this._noWalkGroup.remove(z, true, true);
    }
    this._noWalkGroup.refresh();
    // World display objects.
    for (const o of this.children.list.slice()) {
      if (o._streamRegion === regionIndex) o.destroy?.();
    }
  }

  // Shift the whole live world so the surviving region returns to origin.
  // A single pass over the scene display list covers players, enemies, NPCs and
  // every world sprite (all are scene children). Camera-fixed HUD is left alone.
  // Keeps coordinates small and avoids float drift over many crossings.
  _remapPositions(shiftX, shiftY) {
    for (const o of this.children.list.slice()) {
      if (o.scrollFactorX === 0) continue;       // HUD / vignette / flash
      if (o.x == null) continue;
      o.x += shiftX; o.y += shiftY;
      if (o.body?.reset) o.body.reset(o.x, o.y);
      else if (o.body?.updateFromGameObject) o.body.updateFromGameObject();
    }
    this._noWalkGroup.refresh();
    // Shift the camera by the same amount so the view is pixel-identical before
    // and after the remap — the smooth-follow would otherwise pan across the jump.
    const cam = this.cameras.main;
    cam.scrollX += shiftX; cam.scrollY += shiftY;
  }

  // Slow-tick driver: pre-load the neighbour as the player nears an edge, then
  // commit (unload the region behind + remap) once they're well across.
  _checkStreaming() {
    if (!STREAM_POC.enabled) return;
    if (this.network?.connected) return;             // solo only
    if (this._streamBusy) return;
    const lp = this.players.find(p => p?.isLocal) || this.players[0];
    if (!lp) return;
    const baseIdx = this._stream.base;
    if (this._chainPos(baseIdx) < 0) return;         // current region isn't chained

    const fwdIdx  = this._chainNeighbor(baseIdx, +1);
    const backIdx = this._chainNeighbor(baseIdx, -1);

    // ── Pre-load the eastern neighbour ───────────────────────────────
    if (!this._stream.next && fwdIdx != null && lp.x > WORLD_W - STREAM_POC.trigger) {
      this._stream.next = this._buildRegionAtOffset(fwdIdx, WORLD_W, 0);
      this._expandBounds();
    }
    // ── Pre-load the western neighbour ───────────────────────────────
    if (!this._stream.prev && backIdx != null && lp.x < STREAM_POC.trigger) {
      this._stream.prev = this._buildRegionAtOffset(backIdx, -WORLD_W, 0);
      this._expandBounds();
    }

    // ── Commit eastward: player is well into the next cell ───────────
    if (this._stream.next && lp.x > WORLD_W + STREAM_POC.commit) {
      this._commitCrossing(this._stream.next.regionIndex, -WORLD_W);
    }
    // ── Commit westward ──────────────────────────────────────────────
    else if (this._stream.prev && lp.x < -STREAM_POC.commit) {
      this._commitCrossing(this._stream.prev.regionIndex, WORLD_W);
    }
  }

  // Expand world + camera bounds to cover the current base cell plus any
  // pre-loaded neighbour on either side.
  _expandBounds() {
    const left  = this._stream.prev ? -WORLD_W : 0;
    const right = this._stream.next ? WORLD_W * 2 : WORLD_W;
    this.physics.world.setBounds(left, 0, right - left, WORLD_H);
    this.cameras.main.setBounds(left, 0, right - left, WORLD_H);
  }

  _commitCrossing(newBaseIdx, shiftX) {
    this._streamBusy = true;
    const oldBase = this._stream.base;
    // Drop the slice we're leaving behind, and any neighbour we never entered.
    this._unloadRegion(oldBase);
    if (shiftX < 0 && this._stream.prev) { this._unloadSlice(this._stream.prev); this._stream.prev = null; }
    if (shiftX > 0 && this._stream.next) { this._unloadSlice(this._stream.next); this._stream.next = null; }

    // Finish any still-queued sprites for the region we entered BEFORE remapping
    // (so they're created at the pre-remap offset and shifted with everything
    // else). By commit time the queue is virtually always already drained.
    this._flushBuildQueue(newBaseIdx);

    // The neighbour we entered keeps its objects (now tagged with its index);
    // remap so it sits back at origin.
    this._remapPositions(shiftX, 0);

    // The previous region owned the portals/shrine/fragments; their visuals are
    // gone. Reset the references so stale gameplay anchors can't fire. The new
    // base region is driven purely by streaming for the PoC.
    this._portals = {};
    this._portalList = [];
    this._shrine = null;
    this._shrinePrompt = null;
    this._deathEchoObj = null;
    this._worldFragmentObjects = (this._worldFragmentObjects || []).filter(f => f.gfx?.active);

    const desc = this._regionDescriptor(newBaseIdx);
    this._stream = { base: newBaseIdx, next: null, prev: null };
    this._regionIndex = newBaseIdx;
    this._region = desc;
    this._mapData = (this.registry.get('regionMaps') || []).find(e => e.regionIndex === newBaseIdx)?.data || null;
    this._spawnerPositions = desc.spawnerPositions || [];
    ExploredManager.markExplored(newBaseIdx);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.events.emit('region_title', { name: desc.name, subtitle: desc.subtitle });
    this.audio?.startAmbient?.(newBaseIdx);
    console.log(`[stream] committed crossing → region ${newBaseIdx} now at origin`);
    this._streamBusy = false;
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

  // ── Vignette ───────────────────────────────────────────────────────────
  // A texture-based soft radial vignette pinned to the camera. Unlike the old
  // postFX vignette (which read as a hard oval border), this stays fully clear
  // across the play area and only darkens the outer corners. Strength comes
  // from the biome's existing `vig` value.
  _buildVignette(regionIndex) {
    this._vignette = null;
    if (QualitySettings.level === 'low') return;
    let strength = this._biomeGrade(regionIndex).vig || 0;
    if (QualitySettings.level === 'medium') strength *= 0.6;   // subtle on medium
    if (strength <= 0) return;

    this._ensureVignetteTexture();
    const cam = this.cameras.main;
    // Depth 8000: above all gameplay actors (depth = y, ≤ WORLD_H) so corner
    // enemies are framed too, but below cinematic overlays (arena flash 9000,
    // boss intro 99999) and the separate always-on-top UIScene HUD.
    this._vignette = this.add.image(0, 0, 'px_vignette')
      .setOrigin(0, 0).setDisplaySize(cam.width, cam.height)
      .setScrollFactor(0).setDepth(8000)
      .setTint(0x000000).setAlpha(Math.min(0.85, strength));
  }

  _ensureVignetteTexture() {
    if (this.textures.exists('px_vignette')) return;
    const W = 512, H = 512;
    const tex = this.textures.createCanvas('px_vignette', W, H);
    if (!tex) return;
    const ctx = tex.getContext();
    // Transparent across the inner ~58%, easing to opaque white toward the
    // corners (tinted black at use-site → soft dark frame).
    const grd = ctx.createRadialGradient(W / 2, H / 2, W * 0.30, W / 2, H / 2, W * 0.62);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    try { tex.setFilter(Phaser.Textures.FilterMode.LINEAR); } catch (e) {}
    tex.refresh();
  }

  // ── Emissive light-pools ───────────────────────────────────────────────
  // Soft additive glow cast on the ground beneath an emissive prop. Cheaper
  // than Light2D (no per-sprite pipeline) but gives the look of light pooling
  // on the floor. High-quality only, capped by the same glow budget.
  _lightPool(x, y, color, radius = 90) {
    if (!QualitySettings.glow) return;
    if ((this._lightPoolCount || 0) >= QualitySettings.glowMax) return;
    this._ensureLightTexture();
    const pool = this.add.image(x, y, 'px_light')
      .setDisplaySize(radius * 2, radius * 2)
      .setTint(color).setAlpha(0).setDepth(-6).setBlendMode('ADD');
    this._lightPoolCount = (this._lightPoolCount || 0) + 1;
    this.tweens.add({
      targets: pool, alpha: 0.45,
      duration: 1400 + Math.random() * 700, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _ensureLightTexture() {
    if (this.textures.exists('px_light')) return;
    const W = 128;
    const tex = this.textures.createCanvas('px_light', W, W);
    if (!tex) return;
    const ctx = tex.getContext();
    const grd = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    grd.addColorStop(0,   'rgba(255,255,255,0.9)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, W);
    try { tex.setFilter(Phaser.Textures.FilterMode.LINEAR); } catch (e) {}
    tex.refresh();
  }

  // Per-region biome → drives both weather particles and the colour grade.
  _regionBiome(i) {
    const B = ['pollen','pollen','leaves','leaves','sand','mist','ember',   // 0-6 (1-6 legacy)
               'leaves','mist','leaves','cave','pollen',                    // 7-11
               'pollen','leaves','sand',                                    // 12-14  Act I
               'mist','mist','spore','spore',                               // 15-18  Act II
               'ash','sand','sand','ember','gold','ember',                  // 19-24  Act III
               'feather','feather','feather','snow','gold','storm',         // 25-30  Act IV
               'cave','sparkle','dust','cave',                              // 31-34  Act V
               'void','void','void','void',                                 // 35-38  Act VI
               'gold','gold','gold',                                        // 39-41  hidden
               'cave','mist','ash','snow','cave','void','sparkle','gold'];  // 42-49  new spurs
    return B[i] || 'dust';
  }

  _spawnAmbientParticles(regionIndex) {
    this._ambientEmitter = null;
    if (!QualitySettings.weather) return;   // weather disabled on 'low' quality
    if (!this.textures.exists('amb_particle')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('amb_particle', 7, 7);
      g.destroy();
    }
    // grav<0 rises (embers/motes), grav>0 falls (snow/leaves/ash). ang in degrees.
    const P = {
      pollen:  { tints:[0xcfe0a0,0xe8f0c8,0xbcd488], grav:-10, ang:[180,360], spd:[8,20],  life:[6000,10000], freq:360, blend:'NORMAL', scale:[0.45,0.10], alpha:0.40 },
      leaves:  { tints:[0x7fa64a,0xb8923a,0x6f8f3f], grav:12,  ang:[200,340], spd:[10,22], life:[5000,9000],  freq:340, blend:'NORMAL', scale:[0.55,0.15], alpha:0.50 },
      mist:    { tints:[0xbcd0e0,0xa8c4d8,0xd0e0ec], grav:-3,  ang:[160,200], spd:[6,16],  life:[8000,13000], freq:460, blend:'NORMAL', scale:[1.10,0.30], alpha:0.20 },
      spore:   { tints:[0x9fd06a,0x6fae4a,0xbfe08a], grav:-7,  ang:[180,360], spd:[5,14],  life:[7000,12000], freq:380, blend:'ADD',    scale:[0.40,0.05], alpha:0.30 },
      cave:    { tints:[0x6fc0c8,0x4a9aa8,0x88d0d8], grav:-5,  ang:[180,360], spd:[4,12],  life:[8000,13000], freq:440, blend:'ADD',    scale:[0.40,0.05], alpha:0.28 },
      ash:     { tints:[0x9a948c,0x7a726a,0xb0a89e,0xff7a3a], grav:9, ang:[200,340], spd:[8,18], life:[6000,11000], freq:320, blend:'NORMAL', scale:[0.50,0.12], alpha:0.42 },
      sand:    { tints:[0xd8c088,0xc0a064,0xe8d4a0], grav:-6,  ang:[170,210], spd:[12,28], life:[6000,10000], freq:340, blend:'NORMAL', scale:[0.40,0.08], alpha:0.32 },
      ember:   { tints:[0xff7a18,0xffb840,0xff4a18], grav:-24, ang:[180,360], spd:[14,32], life:[3500,7000],  freq:280, blend:'ADD',    scale:[0.50,0.02], alpha:0.70 },
      gold:    { tints:[0xffe08a,0xffc24a,0xfff0c0], grav:-14, ang:[180,360], spd:[8,20],  life:[5000,9000],  freq:320, blend:'ADD',    scale:[0.45,0.05], alpha:0.55 },
      feather: { tints:[0xeef2f8,0xcfe0f0,0xfff4e8], grav:5,   ang:[200,340], spd:[6,16],  life:[8000,13000], freq:400, blend:'NORMAL', scale:[0.55,0.12], alpha:0.32 },
      snow:    { tints:[0xffffff,0xeaf2ff,0xd8e8f8], grav:20,  ang:[230,310], spd:[10,26], life:[6000,11000], freq:220, blend:'NORMAL', scale:[0.55,0.18], alpha:0.60 },
      storm:   { tints:[0xcfe0f5,0x9fc0e8,0xeef4ff], grav:40,  ang:[250,290], spd:[50,90], life:[2500,4500],  freq:180, blend:'ADD',    scale:[0.55,0.10], alpha:0.40 },
      sparkle: { tints:[0xc89af0,0x7fd8e0,0xffd86a,0xff9ad0], grav:-5, ang:[0,360], spd:[3,10], life:[3000,6000], freq:240, blend:'ADD', scale:[0.60,0.00], alpha:0.85 },
      void:    { tints:[0xb070e0,0x8a4ac0,0xd0a0f0], grav:-9,  ang:[180,360], spd:[6,16],  life:[7000,12000], freq:360, blend:'ADD',    scale:[0.50,0.05], alpha:0.45 },
      dust:    { tints:[0xc8c0b0,0xa89e90,0xd8d0c0], grav:-6,  ang:[180,360], spd:[8,18],  life:[7000,12000], freq:420, blend:'NORMAL', scale:[0.40,0.06], alpha:0.28 },
    };
    const cfg = P[this._regionBiome(regionIndex)] || P.dust;
    this._ambientEmitter = this.add.particles(WORLD_W / 2, WORLD_H / 2, 'amb_particle', {
      x:        { min: -WORLD_W / 2 + 150, max: WORLD_W / 2 - 150 },
      y:        { min: -WORLD_H / 2 + 150, max: WORLD_H / 2 - 150 },
      scale:    { start: cfg.scale[0], end: cfg.scale[1] },
      alpha:    { start: cfg.alpha, end: 0 },
      speed:    { min: cfg.spd[0], max: cfg.spd[1] },
      angle:    { min: cfg.ang[0], max: cfg.ang[1] },
      lifespan: { min: cfg.life[0], max: cfg.life[1] },
      frequency: cfg.freq,
      quantity:  1,
      tint:      cfg.tints,
      depth:    -2,
      gravityY:  cfg.grav,
      blendMode: cfg.blend,
    });
  }

  _applyRegionColorOverlay(regionIndex) {
    // subtle per-biome colour grade over the ground (Phaser rect, depth -7)
    const G = {
      pollen:  { color: 0x121a08, alpha: 0.05 },
      leaves:  { color: 0x0a1f0a, alpha: 0.07 },
      mist:    { color: 0x06121f, alpha: 0.08 },
      spore:   { color: 0x0a1606, alpha: 0.11 },
      cave:    { color: 0x05101a, alpha: 0.16 },
      ash:     { color: 0x151214, alpha: 0.12 },
      sand:    { color: 0x1c1406, alpha: 0.08 },
      ember:   { color: 0x1c0700, alpha: 0.13 },
      gold:    { color: 0x1c1606, alpha: 0.06 },
      feather: { color: 0x0c1622, alpha: 0.05 },
      snow:    { color: 0x0e1824, alpha: 0.06 },
      storm:   { color: 0x0a1018, alpha: 0.13 },
      sparkle: { color: 0x0e0a1c, alpha: 0.09 },
      void:    { color: 0x0b0512, alpha: 0.13 },
      dust:    { color: 0x14120e, alpha: 0.07 },
    };
    const ov = G[this._regionBiome(regionIndex)];
    if (!ov) return;
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, ov.color, ov.alpha).setDepth(-7);
  }

  // Per-biome cinematic grade: a real ColorMatrix (saturation / brightness /
  // contrast) gives each province a *colour identity* — warm glowing Emberwastes,
  // desaturated Sunless caves, bright cool Skyward — not just a darker tint of the
  // same image (what the flat rect overlay can do). Paired with a vignette whose
  // strength scales with how enclosed/oppressive the biome should feel.
  // sat: + boosts colour, − drains it.  bri: 1 = neutral multiplier.  con: + adds
  // contrast.  vig: vignette strength (0 = none, ~0.6 = heavy enclosed dark).
  _biomeGrade(i) {
    const G = {
      pollen:  { sat:  0.12, bri: 1.03, con: 0.05, vig: 0.30 },
      leaves:  { sat:  0.15, bri: 0.98, con: 0.08, vig: 0.36 },
      sand:    { sat: -0.05, bri: 1.06, con: 0.06, vig: 0.30 },
      mist:    { sat: -0.22, bri: 0.94, con: 0.04, vig: 0.42 },
      ember:   { sat:  0.22, bri: 1.00, con: 0.14, vig: 0.40 },
      cave:    { sat: -0.42, bri: 0.80, con: 0.10, vig: 0.55 },
      spore:   { sat:  0.05, bri: 0.90, con: 0.08, vig: 0.46 },
      ash:     { sat: -0.35, bri: 0.92, con: 0.06, vig: 0.44 },
      gold:    { sat:  0.18, bri: 1.08, con: 0.08, vig: 0.30 },
      feather: { sat: -0.06, bri: 1.10, con: 0.04, vig: 0.26 },
      snow:    { sat: -0.16, bri: 1.08, con: 0.06, vig: 0.34 },
      storm:   { sat: -0.20, bri: 0.86, con: 0.12, vig: 0.50 },
      sparkle: { sat:  0.20, bri: 1.02, con: 0.06, vig: 0.34 },
      void:    { sat: -0.30, bri: 0.74, con: 0.12, vig: 0.60 },
      dust:    { sat: -0.10, bri: 0.96, con: 0.05, vig: 0.38 },
    };
    return G[this._regionBiome(i)] || G.dust;
  }

  // Global bloom (WebGL only) makes every bright/additive thing — shrine flame,
  // portal fills, lava rivers, crystals, gold, VFX bursts — actually emit light.
  // Plus the per-biome colour grade + vignette above (the cohesion layer).
  _setupPostFx(regionIndex = 0) {
    this._bloomFx = null;
    this._gradeFx = null;
    this._vignetteFx = null;
    if (!QualitySettings.postFx) return;
    const cam = this.cameras?.main;
    if (!cam?.postFX?.addBloom) return;   // WebGL pipeline required
    try { this._bloomFx = cam.postFX.addBloom(0xffffff, 1, 1, 1, 0.8, 4); } catch (e) {}
    const g = this._biomeGrade(regionIndex);
    // ColorMatrix: first call sets the matrix, later ones multiply into it.
    try {
      const cm = cam.postFX.addColorMatrix();
      cm.saturate(g.sat);
      cm.brightness(g.bri, true);
      cm.contrast(g.con, true);
      this._gradeFx = cm;
    } catch (e) {}
    // Vignette disabled: the radial darkening read as an "oval black border"
    // around the screen and obscured the player's view. Keep the colour grade
    // + bloom (the cohesion layer) but let the full frame stay visible.
    // try { this._vignetteFx = cam.postFX.addVignette(0.5, 0.5, 0.55, g.vig); } catch (e) {}
  }

  // Per-object emissive glow. addGlow only works on Sprite/Image/Text in WebGL,
  // so this is for the sprite-based light sources (fire props, gate, projectiles).
  _glow(obj, color, outer = 4) {
    // Per-object glow is a separate WebGL shader pass each — restrict to the
    // high preset and cap the total count so low/mid GPUs aren't flooded.
    if (!QualitySettings.glow || !obj?.postFX?.addGlow) return obj;
    if ((this._glowCount || 0) >= QualitySettings.glowMax) return obj;
    try { obj.postFX.addGlow(color, outer, 0, false, 0.1, 8); this._glowCount = (this._glowCount || 0) + 1; } catch (e) {}
    return obj;
  }

  // ── Combat juice ─────────────────────────────────────────────────────────
  // Quick squash/stretch "pop" that always returns the sprite to its base scale.
  _popSprite(sprite, baseX, baseY, sx = 1.16, sy = 0.84, dur = 80) {
    if (!sprite || !sprite.scene) return;
    if (sprite._popTween) sprite._popTween.stop();
    sprite.setScale(baseX, baseY);
    sprite._popTween = this.tweens.add({
      targets: sprite, scaleX: baseX * sx, scaleY: baseY * sy,
      duration: dur, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { if (sprite.scene) sprite.setScale(baseX, baseY); sprite._popTween = null; },
    });
  }

  // A small kick of dust/spark motes at an impact point.
  _impactDust(x, y, color = 0xfff0d0, n = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const reach = 16 + Math.random() * 16;
      const dot = this.add.circle(x, y, 2 + Math.random() * 2, color, 0.7).setDepth(y + 8);
      this.tweens.add({
        targets: dot, x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach - 6,
        alpha: 0, scale: 0.2, duration: 240 + Math.random() * 140, ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // Very short, subtle camera shake for weighty hits (heavy melee / boss).
  _cameraPunch(amp = 0.004, dur = 70) {
    this.cameras?.main?.shake(dur, amp);
  }

  // Glow a placed map sprite if it is an emissive prop (fire / radiant gate).
  _glowEmissive(obj, sp) {
    const n = (sp.name || '').toLowerCase();
    const d = (sp.dir  || '').toLowerCase();
    let c = null, lightR = 90;
    if (n === 'brazier')            { c = 0xffb24a; lightR = 80;  }
    else if (n === 'torch')         { c = 0xffb24a; lightR = 56;  }  // scattered fire torches
    else if (n === 'tree_gold')     { c = 0xffc24e; lightR = 64;  }  // Sunless Deep: golden glow-trees
    else if (n === 'pond')          { c = 0x5aa0c8; lightR = 70;  }  // still water catches cool sky light
    else if (n === 'gate_arch')     { c = 0xfff0b0; lightR = 150; }
    else if (n === 'mural')         { c = 0xfff0b0; lightR = 70;  }  // Temple of Gods: the five intact halos glow
    else if (n.startsWith('lamp')) {                                 // standing lanterns: cold over the
      const drowned = [8, 9, 15, 17, 18].includes(this._regionIndex);  // Drowned Reach floodwater (16/43
                                                                       // are living villages — warm),
      c = drowned ? 0x8fd4e0 : 0xffd890; lightR = 64;                       // warm firelight elsewhere
    }
    else if (n === 'lava_rock')     { c = 0xff6a1e; lightR = 110; }  // Demon Forge: molten slag emits heat
    else if (n === 'fumarole')      { c = 0xff8a2e; lightR = 64;  }  // Ash Flats: vents breathe ember light
    else if (n === 'crystal_amber') { c = 0xffb24a; lightR = 90;  }  // cooling metal glints
    else if (n === 'crystal_cyan')  { c = 0x6fd0e0; lightR = 90;  }  // ice / gem light
    else if (n === 'void_shard')    { c = 0x9a5cff; lightR = 100; }  // Severance: void shards bleed light
    else if (d.includes('campfire')){ c = 0xff9a3a; lightR = 100; }
    if (c != null) {
      this._glow(obj, c, 5);
      this._lightPool(sp.x, sp.y, c, lightR);
    }
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
      const enemy = new Enemy(this, x, y, type, this._region?.difficulty ?? 1.0);
      this.enemies.push(enemy);
    }
  }

  _createPortals(region) {
    this._portals = {};
    this._portalList = [];

    if (region.portalBack) {
      this._portals.back = this._makePortal(region.portalBack.x, region.portalBack.y, 0x44aaff, 'BACK', true);
    }
    if (region.portalNext) {
      this._portals.next = this._makePortal(region.portalNext.x, region.portalNext.y, 0xffaa44, 'NEXT', true);
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

    const text = this.add.text(x, y - 44, label === 'BACK' ? '← BACK' : label === 'NEXT' ? 'NEXT →' : label, {
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

    const portal = { x, y, color, label, unlocked, visual: gfx, text, glowRing };
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

  // ── Gated shortcuts ─────────────────────────────────────────────────────────
  _allPortals() {
    return [this._portals?.back, this._portals?.next, ...(this._portalList || [])].filter(Boolean);
  }

  _portalReqMet(req) {
    if (!req) return true;
    if (req.lore != null) return (this.loreManager?.count?.() ?? 0) >= req.lore;
    if (req.item) return (this._save?.inventory || []).includes(req.item);
    if (req.boss) return (this._save?.bossKills || []).includes(req.boss);
    return true;
  }

  _applyPortalGates() {
    const gates = PORTAL_GATES[this._regionIndex];
    if (!gates) return;
    for (const gate of gates) {
      const portal = this._allPortals().find(p => p.targetRegion === gate.target);
      if (!portal) continue;
      portal.requires   = gate.requires;
      portal.sealedText = gate.sealedText;
      this._refreshPortalGate(portal);
    }
  }

  _maybeSealedFeedback(portal) {
    if (!portal?.requires || !portal.sealedText) return;
    const near = this.players.some(p => p?.alive && !p.downed &&
      Phaser.Math.Distance.Between(p.x, p.y, portal.x, portal.y) < 55);
    if (!near) return;
    if (this._sealedMsgCd && this.time.now < this._sealedMsgCd) return;
    this._sealedMsgCd = this.time.now + 5000;
    this.events.emit('show_dialogue', { text: '⟨Sealed⟩ ' + portal.sealedText });
    this.time.delayedCall(3200, () => this.events.emit('hide_dialogue'));
  }

  _refreshPortalGate(portal) {
    if (!portal?.requires) return;
    const met = this._portalReqMet(portal.requires);
    portal.locked = !met;
    if (portal.text) {
      portal.text.setText(met ? (portal.label || 'PORTAL') : '🔒 SEALED');
      portal.text.setColor(met ? '#88ffee' : '#cc6655');
    }
    portal.visual?.setAlpha(met ? 1 : 0.4);
  }

  // ── Thread Shrine (bonfire) ─────────────────────────────────────────────────
  _createShrine(region) {
    const sp = region.spawnPos || { x: 380, y: WORLD_H / 2 };
    const x = sp.x + 80, y = sp.y - 110;
    this._shrine = { x, y };

    // Glowing base + a hovering 'thread' flame.
    const base = this.add.graphics().setDepth(y - 2);
    base.fillStyle(0x2a2418, 1); base.fillEllipse(x, y + 10, 70, 26);
    base.fillStyle(0x4a3a22, 1); base.fillRect(x - 9, y - 34, 18, 44);
    base.lineStyle(2, 0xe8c860, 0.5); base.strokeRect(x - 9, y - 34, 18, 44);

    const glow = this.add.circle(x, y + 8, 60, 0xe8c860, 0.10).setDepth(-3);
    this.tweens.add({ targets: glow, alpha: { from: 0.06, to: 0.22 }, scale: { from: 0.85, to: 1.2 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const flame = this.add.circle(x, y - 44, 11, 0xffd870, 0.95).setDepth(y + 1);
    this.tweens.add({ targets: flame, y: y - 52, scaleX: { from: 1, to: 0.7 }, alpha: { from: 0.95, to: 0.7 },
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this._shrine.flame = flame;

    this._shrinePrompt = this.add.text(x, y - 78, '[F] Rest at the Thread Shrine', {
      fontSize: '12px', color: '#ffe9a0', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(120).setVisible(false);
  }

  _playerNearShrine() {
    if (!this._shrine) return false;
    return this.players.some(p => p?.alive && !p.downed && p.isLocal &&
      Phaser.Math.Distance.Between(p.x, p.y, this._shrine.x, this._shrine.y) < 95);
  }

  _checkShrineProximity() {
    if (!this._shrinePrompt) return;
    this._shrinePrompt.setVisible(!this._shrineOpen && this._playerNearShrine());
  }

  openShrine() {
    if (this._shrineOpen) return;
    this._shrineOpen = true;
    this._paused = true;
    this.physics.pause();
    this._shrinePrompt?.setVisible(false);
    this.scene.launch('ShrineScene', {
      regionIndex: this._regionIndex,
      regionName: this._mapData?.regionName || this._region?.name || `Region ${this._regionIndex}`,
      pendingLevels: this._pendingLevels || 0,
    });
    this.scene.bringToTop('ShrineScene');
  }

  closeShrine() {
    if (!this._shrineOpen) return;
    this._shrineOpen = false;
    this._paused = false;
    this.physics.resume();
  }

  restAtShrine() {
    // Recover the party, refill Amrit, and save this shrine as the respawn point.
    for (const p of this.players) {
      if (!p) continue;
      p.hp = p.maxHp;
      p.stamina = p.maxStamina;
      p._updateHpBar?.();
      p.refillAmrit?.(this);
      if (p.downed) p.revive?.();
    }
    this._save.lastShrineRegion = this._regionIndex;
    this._persist(this._regionIndex);
    if (this._shrine?.flame) {
      const burst = this.add.circle(this._shrine.x, this._shrine.y - 44, 14, 0xffe9a0, 0.6).setDepth(9999);
      this.tweens.add({ targets: burst, alpha: 0, scale: 3, duration: 600, onComplete: () => burst.destroy() });
    }
    this.events.emit('show_dialogue', { text: '⟨Thread Shrine⟩ You rest. The thread steadies — wounds close, Amrit replenished, your return point is set here.' });
    this.time.delayedCall(3200, () => this.events.emit('hide_dialogue'));
  }

  attuneAtShrine() {
    if ((this._pendingLevels || 0) > 0) {
      this.events.emit('level_up_available', { source: 'shrine' });
    } else {
      this.events.emit('show_dialogue', { text: '⟨Thread Shrine⟩ You have no attunement to spend. Slay foes to earn it.' });
      this.time.delayedCall(2400, () => this.events.emit('hide_dialogue'));
    }
  }

  // ── Persistence ─────────────────────────────────────────────────────────────
  _persist(regionIndex) {
    const s = this._save;
    if (!s) return;
    if (regionIndex != null) s.regionIndex = regionIndex;
    const p = this.players?.find(x => x) || this.players?.[0];
    if (p) {
      s.playerStats  = { maxHp: p.maxHp, maxStamina: p.maxStamina, abilityPow: p.abilityPow };
      s.playerLevel  = p.level;
      s.playerXP     = p.xp;
      s.amritCharges = p.amritCharges;
      s.amritMax     = p.amritMax;
    }
    s.pendingLevels    = this._pendingLevels || 0;
    s.statTiers        = { ...(this.scene.get('UIScene')?._statTiers || s.statTiers || {}) };
    s.statPoints       = this.scene.get('UIScene')?._statPoints ?? s.statPoints ?? 0;
    s.completedQuests  = [...(this.questManager?.completed ?? s.completedQuests ?? [])];
    s.collectedLoreIds = this.loreManager?.toArray?.() ?? s.collectedLoreIds;
    if (this._encounteredEnemies) s.encounteredEnemyIds = [...this._encounteredEnemies];
    if (this._metNpcs)            s.metNpcs             = [...this._metNpcs.values()];
    SaveManager.save(s);
  }

  // ── Codex tracking ──────────────────────────────────────────────────────────
  _markEnemyEncountered(typeKey) {
    if (!typeKey || !this._encounteredEnemies || this._encounteredEnemies.has(typeKey)) return;
    this._encounteredEnemies.add(typeKey);
    this._persist();
  }

  _markNpcMet(id, name, lore) {
    if (!id || !this._metNpcs || this._metNpcs.has(id)) return;
    this._metNpcs.set(id, { id, name: name || 'Unknown', lore: lore || '' });
    this._persist();
  }

  // ── Death loop: respawn at last shrine, drop a recoverable Lost Echo ─────────
  respawnAfterDeath() {
    if (this._respawning) return;
    this._respawning = true;
    this._dropDeathEcho();
    this._save.amritCharges = this._save.amritMax;  // Amrit refills on death
    const target = this._save.lastShrineRegion ?? this._regionIndex;
    this._persist(target);
    this._fadeAndTransition(target);
  }

  _dropDeathEcho() {
    const p = this.players?.find(x => x?.isLocal) || this.players?.[0];
    const xp = p?.xp ?? 0;
    if (xp <= 0) { this.registry.remove('deathEcho'); return; }
    const pos = p ? { x: p.x, y: p.y } : { x: 400, y: WORLD_H / 2 };
    this.registry.set('deathEcho', { region: this._regionIndex, x: pos.x, y: pos.y, xp });
    if (p) { p.xp = 0; this._save.playerXP = 0; }
  }

  _spawnDeathEcho() {
    const echo = this.registry.get('deathEcho');
    this._deathEchoObj = null;
    if (!echo || echo.region !== this._regionIndex) return;
    const orb = this.add.circle(echo.x, echo.y, 16, 0x66ddff, 0.5).setDepth(echo.y);
    const core = this.add.circle(echo.x, echo.y, 7, 0xccf4ff, 0.95).setDepth(echo.y + 1);
    this.tweens.add({ targets: [orb], alpha: { from: 0.3, to: 0.7 }, scale: { from: 0.8, to: 1.3 },
      duration: 900, yoyo: true, repeat: -1 });
    const prompt = this.add.text(echo.x, echo.y - 34, '[F] Reclaim Lost Echo', {
      fontSize: '11px', color: '#aef2ff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(120).setVisible(false);
    this._deathEchoObj = { x: echo.x, y: echo.y, xp: echo.xp, orb, core, prompt };
  }

  _playerNearEcho() {
    if (!this._deathEchoObj) return false;
    return this.players.some(p => p?.alive && !p.downed && p.isLocal &&
      Phaser.Math.Distance.Between(p.x, p.y, this._deathEchoObj.x, this._deathEchoObj.y) < 70);
  }

  _checkDeathEcho() {
    if (!this._deathEchoObj) return;
    this._deathEchoObj.prompt.setVisible(this._playerNearEcho());
  }

  _reclaimDeathEcho() {
    const e = this._deathEchoObj;
    if (!e) return;
    const p = this.players?.find(x => x?.isLocal) || this.players?.[0];
    if (p?.gainXP) p.gainXP(e.xp);
    this.registry.remove('deathEcho');
    e.orb.destroy(); e.core.destroy(); e.prompt.destroy();
    this._deathEchoObj = null;
    this.events.emit('show_dialogue', { text: `⟨Lost Echo⟩ You reclaim ${e.xp} essence.` });
    this.time.delayedCall(2000, () => this.events.emit('hide_dialogue'));
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

  // Lazily load this region's boss art (frames + anims) the first time the
  // region is entered. Sets this._bossAssetsReady so the trigger can wait for a
  // slow load rather than spawn a textureless boss. Uses a dedicated loader so
  // it never races the map-sprite loader on this.load.
  _ensureBossAssets(bossKey) {
    const base   = BOSSES[bossKey]?.textureBase;
    const family = familyForKey(base);
    if (!family) { this._bossAssetsReady = true; return; } // no lazy assets needed

    if (assetsReady(this, family)) { defineAnims(this, family); this._bossAssetsReady = true; return; }

    // Already streaming this family — don't queue a second loader on retry.
    if (this._bossLoadingFamily === family) return;
    this._bossLoadingFamily = family;

    // Dedicated loader instance — independent of this.load (the map-sprite
    // loader), so the two never clobber each other's 'complete' events.
    this._bossAssetsReady = false;
    const loader = new Phaser.Loader.LoaderPlugin(this);
    let queued = 0;
    for (const { key, url } of familyLoads(family)) {
      if (!this.textures.exists(key)) { loader.image(key, url); queued++; }
    }
    const finish = () => { defineAnims(this, family); this._bossAssetsReady = true; };
    if (queued === 0) { finish(); return; }
    loader.once(Phaser.Loader.Events.COMPLETE, finish);
    loader.once(Phaser.Loader.Events.LOAD_ERROR, () => { /* keep waiting for COMPLETE; missing frame just won't show */ });
    loader.start();
  }

  // Load a family's assets (image frames AND/OR spritesheets) on a dedicated
  // loader, then define its anims. Resolves when ready. Mirrors _ensureBossAssets
  // but handles spritesheet loads too (creatures can be either source type).
  _loadFamilyAssets(family) {
    return new Promise(resolve => {
      if (assetsReady(this, family)) { defineAnims(this, family); resolve(); return; }
      const loader = new Phaser.Loader.LoaderPlugin(this);
      let queued = 0;
      for (const l of familyLoads(family)) {
        if (this.textures.exists(l.key)) continue;
        if (l.frameWidth) loader.spritesheet(l.key, l.url, { frameWidth: l.frameWidth, frameHeight: l.frameHeight });
        else              loader.image(l.key, l.url);
        queued++;
      }
      const finish = () => { defineAnims(this, family); resolve(); };
      if (queued === 0) { finish(); return; }
      loader.once(Phaser.Loader.Events.COMPLETE, finish);
      loader.once(Phaser.Loader.Events.LOAD_ERROR, () => { /* keep waiting for COMPLETE */ });
      loader.start();
    });
  }

  // The creature's animation names (without the `${key}_` prefix), e.g. ['idle','walk',…].
  _creatureAnimNames(key) {
    return familyAnimKeys(key).map(k => k.slice(key.length + 1));
  }

  // Pick the resting animation name for a creature: prefer idle, then walk/run, else first.
  _creatureRestName(key) {
    const names = this._creatureAnimNames(key);
    return names.find(n => n === 'idle')
        || names.find(n => /^(walk|run|move)$/.test(n))
        || names[0] || null;
  }

  // Map the Enemy's logical states (idle/run/attack/dead) to the animation names
  // this creature actually has, so combat plays the right clips.
  _creatureAnimAlias(key, restName) {
    const names = this._creatureAnimNames(key);
    const has = n => names.includes(n);
    const pick = (...opts) => opts.find(has);
    return {
      idle:   pick('idle') || restName,
      run:    pick('run', 'walk', 'move') || restName,
      attack: pick('attack', 'special', 'cast', 'shoot'),
      dead:   pick('death', 'dead'),
    };
  }

  // Spawn map-editor creatures as fighting Enemy instances. Each carries an
  // entity_key resolved against the merged animations.json families, with a
  // synthesized Enemy config (textureBase + anim alias + stats). Best-effort &
  // async: unknown entities (rejected / not yet exported) are skipped. Co-op:
  // only the host spawns/simulates enemies (clients receive them via ENEMY_SYNC).
  async _spawnMapCreatures(mapData) {
    const creatures = mapData?.creatures || [];
    if (!creatures.length) return;
    if (this.network?.connected && !this.network.isHost()) return;
    await loadAnimationsJSON();   // ensure approved families are merged

    const difficulty = (this._region || {}).difficulty ?? 1.0;

    // Load each distinct entity_key once, then spawn all its markers.
    const byKey = new Map();
    for (const c of creatures) {
      if (!byKey.has(c.key)) byKey.set(c.key, []);
      byKey.get(c.key).push(c);
    }
    for (const [key, list] of byKey) {
      const entity = familyForKey(key);
      if (!entity) continue;                       // unknown/rejected — skip
      if (!this.scene.isActive()) return;          // region changed mid-load
      await this._loadFamilyAssets(key);
      const restName = this._creatureRestName(key);
      const restKey  = restName && `${key}_${restName}`;
      if (!restKey || !this.anims.exists(restKey)) continue;

      const stats = statsFor(key, entityType(key) || 'enemy');
      const f0 = this.anims.get(restKey).frames[0];
      const fh = f0?.frame?.height || 64;
      const targetPx = stats.sizePx || 80;
      const scale = Math.min(3, Math.max(0.1, targetPx / fh));   // fit to target height
      const cfg = {
        key,
        textureBase:   key,
        spriteTexture: f0.textureKey,
        animAlias:     this._creatureAnimAlias(key, restName),
        maxHp:       stats.maxHp,
        speed:       stats.speed,
        attackDmg:   stats.attackDmg,
        attackRange: stats.attackRange,
        attackCd:    stats.attackCd,
        xpValue:     stats.xpValue,
        scale,
        tint:    stats.tint ?? null,
        physics: false,
        passive: !!stats.passive,
        label:   key,
        drops:   [],
      };
      for (const c of list) {
        const enemy = new Enemy(this, c.x, c.y, cfg, difficulty);
        this.enemies.push(enemy);
        this._mapCreatures.push(enemy);
      }
    }
  }

  // Debug aid for balancing: print the stats of the enemy nearest the player.
  // Works for both roster enemies and map-editor creatures (creatures carry an
  // animAlias in their cfg, so the readout flags which kind it is).
  _debugPrintNearestCreature() {
    const players = this.players || [];
    const ref = players.find(p => p?.isLocal && p?.active) || players[0];
    if (!ref) return;
    let best = null, bestD = Infinity;
    for (const e of this.enemies || []) {
      if (!e?.alive) continue;
      const d = Phaser.Math.Distance.Between(ref.x, ref.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) { console.log('[creature-debug] no living enemy nearby'); this._flashDebug('no enemy nearby'); return; }

    const c = best.cfg || {};
    const isCreature = !!c.animAlias;
    const anim = best.sprite?.anims?.currentAnim?.key || '—';
    const lines = [
      `${c.key}  ${isCreature ? '(creature)' : '(roster enemy)'}  dist=${bestD | 0}px`,
      `hp ${best.hp | 0}/${best.maxHp}   dmg ${best.damage}   range ${best.range}   cd ${best.attackCd}ms`,
      `speed ${best.speed}   scale ${(c.scale ?? 1).toFixed(2)}   xp ${c.xpValue}   state ${best.state}   anim ${anim}`,
    ];
    if (isCreature) lines.push(`alias ${JSON.stringify(c.animAlias)}`);
    console.log('[creature-debug]\n  ' + lines.join('\n  '));
    this._flashDebug(lines.join('\n'));
  }

  // Brief on-screen readout (top-left), auto-fades. Single reusable text object.
  _flashDebug(msg) {
    if (!this._debugText) {
      this._debugText = this.add.text(12, 12, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#aeffae',
        backgroundColor: '#000000cc', padding: { x: 8, y: 6 }, lineSpacing: 2,
      }).setScrollFactor(0).setDepth(100000);
    }
    this._debugText.setText(msg).setAlpha(1).setVisible(true);
    this.tweens.killTweensOf(this._debugText);
    this.tweens.add({ targets: this._debugText, alpha: 0, delay: 3500, duration: 600,
      onComplete: () => this._debugText?.setVisible(false) });
  }

  _createBossArena(region) {
    // Map editor boss override takes precedence; fall back to region config
    const bossKey = this._mapBossOverride?.key || region.bossKey;
    if (!bossKey) return;

    // Start streaming this boss's (lazily-loaded) art now, while the player is
    // still far from the arena — runs identically on host and client.
    this._ensureBossAssets(bossKey);
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

  _renderMapStrokes(strokes, dx = 0, dy = 0, regionIndex = null) {
    if (!strokes.length) return null;
    // Streamed neighbours use a per-region texture key so they never clobber
    // the active region's baked stroke layer.
    const TEX_KEY = regionIndex != null ? `_map_strokes_${regionIndex}` : '_map_strokes';
    if (this.textures.exists(TEX_KEY)) this.textures.remove(TEX_KEY);
    const canvasTex = this.textures.createCanvas(TEX_KEY, WORLD_W, WORLD_H);
    const ctx = canvasTex.getContext();
    for (const s of strokes) {
      const pts = s.points;
      if (!pts || pts.length < 4) continue;
      ctx.save();
      ctx.globalCompositeOperation = s.composite || 'source-over';
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = s.strokeWidth;
      ctx.lineCap = s.lineCap || 'round';
      ctx.lineJoin = s.lineJoin || 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke();
      ctx.restore();
    }
    canvasTex.refresh();
    return this.add.image(WORLD_W / 2 + dx, WORLD_H / 2 + dy, TEX_KEY).setDepth(-5);
  }

  // `opts` (streaming): { dx, dy, regionIndex, sink } where sink collects the
  // created objects/enemies/no-walk bodies for later unload. Omitted → builds
  // the active region in-place exactly as before.
  _buildFromMapData(mapData, opts = {}) {
    const dx = opts.dx || 0, dy = opts.dy || 0;
    const sink = opts.sink || null;
    const rIdx = opts.regionIndex ?? this._regionIndex;
    const track = (o) => { if (sink && o) { o._streamRegion = rIdx; sink.objects.push(o); } return o; };

    // Build no-walk collision zones (invisible static physics bodies)
    for (const z of (mapData.noWalkZones || [])) {
      const rect = this.add.rectangle(z.x + z.w / 2 + dx, z.y + z.h / 2 + dy, z.w, z.h);
      rect.setVisible(false);
      this.physics.add.existing(rect, true);
      this._noWalkGroup.add(rect);
      if (sink) { rect._streamRegion = rIdx; sink.noWalk.push(rect); }
    }
    if ((mapData.noWalkZones || []).length > 0) this._noWalkGroup.refresh();

    const sprites = mapData.sprites || [];
    const missing = []; // { key, url, isSheet?, frameW?, frameH? }

    for (const sp of sprites) {
      if (!sp.frames) continue; // skip non-image entries (e.g. strokes)
      if (sp.frameW && sp.frameH) {
        const key = _mapSpriteKey(sp.dir, sp.frames[0]);
        if (!this.textures.exists(key)) missing.push({ key, url: sp.dir + '/' + sp.frames[0], isSheet: true, frameW: sp.frameW, frameH: sp.frameH });
      } else {
        const framesToLoad = (sp.animated && sp.frames.length > 1) ? sp.frames : [sp.frames[0]];
        for (const frame of framesToLoad) {
          const key = _mapSpriteKey(sp.dir, frame);
          if (!this.textures.exists(key)) missing.push({ key, url: sp.dir + '/' + frame });
        }
      }
    }

    // Place one map sprite (image / spritesheet anim / frame-sequence anim).
    const placeSprite = (sp) => {
      const key = _mapSpriteKey(sp.dir, sp.frames[0]);
      const depth = sp.spriteLayer === 'above' ? sp.y + 1 : sp.y - 1;
      // Streamed sprites pop in over several frames — a brief fade softens that.
      const reveal = (o) => {
        if (sink) { const a = o.alpha; o.setAlpha(0); this.tweens.add({ targets: o, alpha: a, duration: 220, ease: 'Quad.easeOut' }); }
        return o;
      };

      if (sp.frameW && sp.frameH && sp.frameCount > 1) {
        // Spritesheet animation
        const animKey = key + '_loop';
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: sp.frameCount - 1 }),
            frameRate: 8,
            repeat: -1,
          });
        }
        const spr = track(this.add.sprite(sp.x + dx, sp.y + dy, key))
          .setScale(sp.scaleX ?? 1, sp.scaleY ?? 1)
          .setDepth(depth)
          .setAlpha(sp.alpha ?? 1)
          .play(animKey);
        if (sp.offsetX != null && sp.offsetY != null)
          spr.setOrigin(sp.offsetX / sp.frameW, sp.offsetY / sp.frameH);
        this._glowEmissive(spr, sp);
        reveal(spr);
        return;
      }

      if (sp.animated && sp.frames.length > 1 && !sp.frameW && sp.frames.every(f => /^\d+\.png$/i.test(f))) {
        // Multi-frame sequence animation (separate image files per frame)
        const animKey = key + '_seq';
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: sp.frames.map(f => ({ key: _mapSpriteKey(sp.dir, f) })),
            frameRate: 8,
            repeat: -1,
          });
        }
        const spr = track(this.add.sprite(sp.x + dx, sp.y + dy, key))
          .setScale(sp.scaleX ?? 1, sp.scaleY ?? 1)
          .setDepth(depth)
          .setAlpha(sp.alpha ?? 1)
          .play(animKey);
        if (sp.offsetX != null && sp.offsetY != null) {
          const tex = this.textures.get(key);
          const w = tex.getSourceImage()?.width || sp.offsetX * 2;
          const h = tex.getSourceImage()?.height || sp.offsetY * 2;
          spr.setOrigin(sp.offsetX / w, sp.offsetY / h);
        }
        this._glowEmissive(spr, sp);
        reveal(spr);
        return;
      }

      const img = track(this.add.image(sp.x + dx, sp.y + dy, key))
        .setScale(sp.scaleX ?? 1, sp.scaleY ?? 1)
        .setDepth(depth)
        .setAlpha(sp.alpha ?? 1);
      if (sp.offsetX != null && sp.offsetY != null) {
        const tex = this.textures.get(key);
        const w = tex.getSourceImage()?.width || sp.offsetX * 2;
        const h = tex.getSourceImage()?.height || sp.offsetY * 2;
        img.setOrigin(sp.offsetX / w, sp.offsetY / h);
      }
      this._glowEmissive(img, sp);
      reveal(img);
    };

    const place = () => {
      track(this._renderMapStrokes(sprites.filter(sp => !sp.frames), dx, dy, sink ? rIdx : null));

      const spriteList = sprites.filter(sp => sp.frames);
      if (sink) {
        // Streamed neighbour: spread sprite creation across frames (drained in
        // update()) so a heavy region (800+ sprites) doesn't hitch on stream-in.
        for (const sp of spriteList) this._streamBuildQueue.push({ regionIndex: rIdx, fn: () => placeSprite(sp) });
      } else {
        for (const sp of spriteList) placeSprite(sp);
      }

      // Spawn enemies placed in the map editor.
      // In co-op only the host spawns/simulates enemies; the client receives
      // them via ENEMY_SYNC. Spawning on both sides creates ghost duplicates.
      const mapEnemies = mapData.enemies || [];
      const canSpawnEnemies = !this.network.connected || this.network.isHost();
      if (mapEnemies.length > 0 && canSpawnEnemies) {
        const difficulty = opts.difficulty ?? REGIONS[rIdx]?.difficulty ?? (this._region || {}).difficulty ?? 1.0;
        for (const e of mapEnemies) {
          const enemy = new Enemy(this, e.x + dx, e.y + dy, e.type, difficulty);
          this.enemies.push(enemy);
          if (sink) { enemy._streamRegion = rIdx; sink.enemies.push(enemy); }
        }
      }

      // Spawn NPCs placed in the map editor
      const mapNpcs = mapData.npcs || [];
      for (const n of mapNpcs) {
        const dialogueId = n.config?.id || n.id;
        const npc = new NPC(this, n.x + dx, n.y + dy, { id: dialogueId, type: n.type || 'yellow' });
        npc._embeddedDialogue = n.config || null;
        this._mapNpcs.push(npc);
        if (sink) { npc._streamRegion = rIdx; sink.objects.push(npc); }
      }

      // Spawn animated creatures placed in the map editor (auto-discovered from
      // animations.json). Async + best-effort: missing/rejected entities are skipped.
      // Skipped for streamed neighbours (async lifecycle would outlive a quick unload).
      if (!sink) this._spawnMapCreatures(mapData);

      // _mapBossOverride already set synchronously before _createBossArena was called
    };

    // Override portals from map-editor placement (runs synchronously, before async place())
    // Streamed neighbours don't manage portals — the active region owns them.
    const mapPortals = (sink ? [] : mapData.portals) || [];
    if (mapPortals.length > 0) {
      ['back', 'next'].forEach(dir => {
        const p = this._portals?.[dir];
        if (p) { p.visual.destroy(); p.text?.destroy(); p.glowRing?.destroy(); }
      });
      for (const p of (this._portalList || [])) {
        p.visual?.destroy(); p.text?.destroy(); p.glowRing?.destroy();
      }
      this._portals = {};
      this._portalList = [];
      for (const p of mapPortals) {
        if (p.direction === 'back' || p.direction === 'next') {
          // legacy directional portals — keep working as before
          const isBack = p.direction === 'back';
          const portal = this._makePortal(p.x, p.y, isBack ? 0x44aaff : 0xffaa44, isBack ? 'BACK' : 'NEXT', true);
          portal.targetRegion = p.targetRegion ?? null;
          if (isBack) this._portals.back = portal;
          else        this._portals.next = portal;
        } else {
          // new direction-less portal — just teleports to targetRegion
          const label = p.targetRegion != null ? '→ R' + p.targetRegion : 'PORTAL';
          const portal = this._makePortal(p.x, p.y, 0x88ffee, label, true);
          portal.targetRegion = p.targetRegion ?? null;
          this._portalList.push(portal);
        }
      }
    }

    if (missing.length > 0) {
      missing.forEach(({ key, url, isSheet, frameW, frameH }) => {
        if (isSheet) this.load.spritesheet(key, url, { frameWidth: frameW, frameHeight: frameH });
        else this.load.image(key, url);
      });
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
        if (dx * dx + dy * dy < tree.r * tree.r) {
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

    // ── Boss cutscene freeze ──────────────────────────────────────
    // While the boss intro/name-card plays, hold every actor in place: zero
    // their velocities and skip their AI/input updates so nobody drifts or
    // attacks mid-cinematic. The intro runs on timers/tweens (not this loop),
    // so it still completes and everyone resumes the moment it clears.
    // (The boss itself already self-freezes via Boss `_introActive`.)
    if (this._bossIntroActive) {
      for (const pl of this.players) pl?.body?.setVelocity(0, 0);
      for (const en of this.enemies) en?.body?.setVelocity(0, 0);
    }

    // ── Players ───────────────────────────────────────────────────
    const p1 = this.players[0];
    const p2 = this.players[1];

    if (!this._bossIntroActive) {
      if (p1 && p1.isLocal)  p1.update(time, delta, this._cursors, this._keys, this.enemies, this);
      if (p2 && p2.isLocal)  p2.update(time, delta, this._cursors, this._keys, this.enemies, this);
      // Solo only: Tara follows P1 via AI when there is no network connection
      if (p2 && !p2.isLocal && !this.network.connected) this._taraAI(p1, p2, delta);
    }

    // ── Enemies ───────────────────────────────────────────────────
    // Only host runs enemy AI; client receives positions via ENEMY_SYNC.
    // Cull AI by distance to the NEAREST active player (not just the host's
    // camera) so enemies near the client's player still pursue and attack.
    if (!this._bossIntroActive && (!this.network.connected || this.network.isHost())) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e || !e.active) { this.enemies.splice(i, 1); continue; }
        let nearAnyPlayer = false;
        for (const pl of this.players) {
          if (!pl?.active) continue;
          const dx = e.x - pl.x, dy = e.y - pl.y;
          if (dx * dx + dy * dy <= 640000) { nearAnyPlayer = true; break; }
        }
        if (!nearAnyPlayer) continue;
        e.update(time, delta, this.players, this._treePositions);
      }
    }

    // ── Projectiles ───────────────────────────────────────────────
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p || !p.active) { this.projectiles.splice(i, 1); continue; }
      p.update(time, delta);
      this._checkProjectileCollisions(p);
    }

    // ── World fragment proximity prompts ──────────────────────────
    for (const wf of this._worldFragmentObjects) {
      let nearestSq = Infinity;
      for (const p of this.players) {
        if (!p?.active) continue;
        const dx = wf.x - p.x, dy = wf.y - p.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nearestSq) nearestSq = dSq;
      }
      wf.prompt.setAlpha(nearestSq < 80 * 80 ? 1 : 0);
    }

    // ── Boss ──────────────────────────────────────────────────────
    if (this._boss?.active) {
      this._boss.update(time, delta, this.players, this);
      this._checkBossProjectileHit();
    } else if (!this._bossTriggered && this._bossArenaPos) {
      this._checkBossTrigger();
    }

    // ── Map-editor NPCs ───────────────────────────────────────────
    for (const npc of this._mapNpcs) { if (npc?.active) npc.update(this.players); }

    // ── Revival hold mechanic ─────────────────────────────────────
    this._updateRevival(delta);

    // ── Arena hazards ─────────────────────────────────────────────
    if (this._arenaHazards.length) this._updateArenaHazards(time, delta);

    // ── Throttle counters ─────────────────────────────────────────
    this._uiThrottleCounter++;
    this._slowTickCounter++;

    // ── Frame-chunked streamed-region sprite creation ─────────────
    if (this._streamBuildQueue?.length) this._drainBuildQueue(STREAM_POC.buildPerFrame);

    // ── Adaptive quality: drop a level if FPS stays low ───────────
    this._fpsWatchdog(delta);

    // ── Tree occlusion (High quality only) ────────────────────────
    if (QualitySettings.occlusion) this._updateOcclusionAlpha();

    // ── Slow tick: portals + pressure plates + echoes (every 8 frames)
    if (this._slowTickCounter % 8 === 0) {
      this._checkPressurePlates();
      this._checkStreaming();
      this._checkPortals();
      this._checkEchoTriggers();
      this._checkShrineProximity();
      this._checkDeathEcho();
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

  // Adaptive quality: if the running FPS stays below target for a sustained
  // window, step the quality preset down one level. Runs at most once per
  // scene session. Gives immediate relief by killing the most expensive live
  // effects (bloom + ambient particles); the rest applies on the next region.
  _fpsWatchdog(delta) {
    if (this._autoDowngraded || QualitySettings.level === 'low') return;

    // Use wall-clock elapsed between frames, not Phaser's smoothed `delta` —
    // at very low FPS the smoothed delta lags real time and would never reach
    // the threshold.
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (this._wdLast === undefined) { this._wdLast = now; return; }
    const real = Math.min(1000, now - this._wdLast); // cap a single hitch/tab-switch
    this._wdLast = now;

    if (this._fpsGraceTimer > 0) { this._fpsGraceTimer -= real; return; }

    const fps = this.game.loop.actualFps;
    if (fps < 45) {
      this._lowFpsAccum += real;
    } else {
      this._lowFpsAccum = Math.max(0, this._lowFpsAccum - real * 2); // recover quickly
    }
    if (this._lowFpsAccum < 5000) return; // require ~5s sustained low FPS

    const newLevel = QualitySettings.lowerLevel();
    this._autoDowngraded = true;
    this._lowFpsAccum = 0;
    if (!newLevel) return;

    // Immediate relief for this session (the full preset applies next region).
    if (!QualitySettings.postFx && this._bloomFx) {
      try { this.cameras.main.postFX.remove(this._bloomFx); } catch (e) {}
      this._bloomFx = null;
      if (this._gradeFx)    { try { this.cameras.main.postFX.remove(this._gradeFx); }    catch (e) {} this._gradeFx = null; }
      if (this._vignetteFx) { try { this.cameras.main.postFX.remove(this._vignetteFx); } catch (e) {} this._vignetteFx = null; }
    }
    // Texture vignette is gated to medium+; drop it the moment we fall to low.
    if (QualitySettings.level === 'low' && this._vignette) {
      try { this._vignette.destroy(); } catch (e) {}
      this._vignette = null;
    }
    if (!QualitySettings.weather && this._ambientEmitter) {
      try { this._ambientEmitter.destroy(); } catch (e) {}
      this._ambientEmitter = null;
    }
    try {
      this.scene.get('UIScene')?.toast?.(`Graphics lowered to ${newLevel.toUpperCase()} for performance`, '#ffcc44', 2600);
    } catch (e) {}
  }

  _checkProjectileCollisions(proj) {
    if (!proj.active) return;

    if (proj.fromEnemy) {
      // Hit players
      for (const p of this.players) {
        if (!p?.alive || p.downed) continue;
        const dx = proj.x - p.x, dy = proj.y - p.y;
        if (dx * dx + dy * dy < 24 * 24) {
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
        const dx = proj.x - e.x, dy = proj.y - e.y;
        if (dx * dx + dy * dy < 28 * 28) {
          e.takeDamage(proj.damage, null, this);
          if (!proj.piercing) { proj.hit(); return; }
        }
      }
      // Hit boss
      if (this._boss?.alive) {
        const dx = proj.x - this._boss.x, dy = proj.y - this._boss.y;
        if (dx * dx + dy * dy < 60 * 60) {
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
    const bossKey = this._mapBossOverride?.key || this._region?.bossKey;
    if (!this._bossArenaPos || !bossKey) return;
    // Wait for lazily-loaded boss art before spawning (avoids a textureless boss
    // if the player sprints to the arena before the stream finishes).
    if (this._bossAssetsReady === false) return;
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
    const region = this._region;
    // Map editor override takes precedence for both key and position
    const bossKey = this._mapBossOverride?.key || region.bossKey;
    if (!bossKey) return;
    // Boss art is streamed lazily — don't spawn until it's ready. We retry on a
    // later frame (proximity check) or once the load completes.
    if (this._bossAssetsReady === false) { this._ensureBossAssets(bossKey); return; }
    this._bossTriggered = true;

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

    // Subtle cinematic zoom — camera stays on player, just zooms in slightly
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.18,
      duration: 600,
      ease: 'Sine.easeInOut',
    });
    this.time.delayedCall(3400, () => {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.0,
        duration: 700,
        ease: 'Sine.easeInOut',
      });
    });

    if (boss.cfg.introLines?.length) {
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
    // While streaming, edge/side portals are owned by the streamer, not by
    // scene.restart — suppress them for chained regions so crossings stay seamless.
    if (STREAM_POC.enabled && !this.network?.connected && this._chainPos(this._stream?.base) >= 0) return;
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
    // Re-evaluate gated portals so they open the instant their requirement is met.
    for (const portal of this._allPortals()) {
      if (portal.requires) this._refreshPortalGate(portal);
    }

    if (!this._portalCooldown || this.time.now > this._portalCooldown) {
      check(this._portals?.back, false);
      check(this._portals?.next, true);
      // direction-less portals
      for (const portal of (this._portalList || [])) {
        if (!portal) continue;
        if (portal.locked) { this._maybeSealedFeedback(portal); continue; }
        for (const p of this.players) {
          if (!p?.alive || p.downed) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, portal.x, portal.y) < 40) {
            if (portal.targetRegion != null) this._usePortalDirect(portal.targetRegion);
            return;
          }
        }
      }
    }
  }

  _usePortalDirect(newIndex) {
    this._portalCooldown = this.time.now + 3000;
    if (newIndex < 0) return;
    if (this.network?.connected && this.network.isHost()) this.network.send('REGION_CHANGE', { newIndex });
    this._saveProgress(newIndex);
    this.audio.portal();
    this._fadeAndTransition(newIndex);
  }

  _usePortal(isNext) {
    this._portalCooldown = this.time.now + 3000;
    const portal = isNext ? this._portals?.next : this._portals?.back;
    const newIndex = portal?.targetRegion != null
      ? portal.targetRegion
      : (isNext ? this._regionIndex + 1 : Math.max(0, this._regionIndex - 1));

    if (newIndex < 0) return;

    // In co-op, host broadcasts region change so client transitions simultaneously
    if (this.network?.connected && this.network.isHost()) {
      this.network.send('REGION_CHANGE', { newIndex });
    }

    this._saveProgress(newIndex);
    this.audio.portal();
    this._fadeAndTransition(newIndex);
  }

  _saveProgress(newIndex) {
    // Persist progression as you cross between regions (open-world checkpointing).
    this._persist(newIndex);
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
          const doRestart = () => this.scene.restart({
            regionIndex: newIndex,
            coop: this._isCoop,
            p1Char: this._p1Char,
            p2Char: this._p2Char,
          });
          // Refresh region maps from disk so editor-saved regions are always current
          fetch('/api/regions')
            .then(r => r.json())
            .then(list => { this.registry.set('regionMaps', list); })
            .catch(() => {})
            .finally(doRestart);
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

    // Thread Shrine — rest, attune, fast travel
    if (this._shrine && this._playerNearShrine()) { this.openShrine(); return; }

    // Reclaim a Lost Echo (recovered souls dropped on death)
    if (this._deathEchoObj && this._playerNearEcho()) { this._reclaimDeathEcho(); return; }

    if (this._dialogueActive) {
      this._dialogueActive = false;
      this.events.emit('hide_dialogue');
      return;
    }

    // ── Map editor NPCs ───────────────────────────────────────────
    const npcDialogueMap = this.registry.get('npcDialogue') || {};
    for (const npc of (this._mapNpcs || [])) {
      if (!npc?.active || !npc.isPlayerNear) continue;
      const dlg = npcDialogueMap[npc.npcId] || npc._embeddedDialogue || {};
      const line = dlg.first || dlg.name && `⟨${dlg.name}⟩ "..."` || '⟨NPC⟩ "..."';
      // Record this NPC in the Codex roster (name + lore from their dialogue).
      const npcName = dlg.name || line.match(/⟨([^⟩]+)⟩/)?.[1] || 'Wanderer';
      this._markNpcMet(npc.npcId, npcName, line.replace(/^⟨[^⟩]+⟩\s*/, ''));
      this._dialogueActive = true;
      this.events.emit('show_dialogue', { text: line });
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

  _onLevelBanked() {
    this._pendingLevels = (this._pendingLevels || 0) + 1;
    this._persist();
    this.events.emit('status_flash', { color: 0xffd700, alpha: 0.18, duration: 280 });
    this.events.emit('show_dialogue', { text: `⚔ Attunement earned (${this._pendingLevels} ready) — rest at a Thread Shrine to grow stronger.` });
    this.time.delayedCall(2600, () => this.events.emit('hide_dialogue'));
  }

  _onLevelUpDone(data) {
    // The points panel grants and consumes all banked levels in one session,
    // so clear them together rather than re-opening the panel per level.
    const consumed = data?.levels ?? 1;
    this._pendingLevels = Math.max(0, (this._pendingLevels || 0) - consumed);
    this._persist();
  }

  _onAmritUsed(data) {
    const { x, y } = data;
    this.audio?.heal?.();
    // golden restorative burst
    const ring = this.add.circle(x, y, 30, 0xffcc44, 0.4).setDepth(y + 5);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 2.4, scaleY: 2.4, duration: 520, onComplete: () => ring.destroy() });
    for (let i = 0; i < 6; i++) {
      const ox = Phaser.Math.Between(-18, 18);
      const mote = this.add.circle(x + ox, y + 14, 3, 0xffe07a, 0.9).setDepth(y + 6);
      this.tweens.add({ targets: mote, y: y - 30, alpha: 0, duration: 600, delay: i * 40, onComplete: () => mote.destroy() });
    }
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

    // XP gain
    const e = data.enemy;
    const xpGain = e.cfg?.xpValue ?? 10;
    const primaryPlayer = this.players?.find(p => p?.alive) || this.players?.[0];
    if (primaryPlayer?.gainXP) {
      primaryPlayer.gainXP(xpGain);
      this._save.playerXP = primaryPlayer.xp;
      this._save.playerLevel = primaryPlayer.level;
    }

    // Item drop from enemy loot table
    const drops = e.cfg?.drops || [];
    for (const drop of drops) {
      if (Math.random() < drop.chance) {
        SaveManager.addItem(this._save, drop.item);
        SaveManager.save(this._save);
        const def = ITEM_DEFS[drop.item];
        if (def?.type === 'passive') this._applyPassiveItem(def);
        this.events.emit('item_acquired', { itemId: drop.item, name: def?.name || drop.item });
        break;
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
    if (this._save?.playerStats) {
      if (def.effect.stat === 'maxHp') this._save.playerStats.maxHp = (this._save.playerStats.maxHp || 200) + def.effect.amount;
      if (def.effect.stat === 'abilityPow') this._save.playerStats.abilityPow = Math.round(((this._save.playerStats.abilityPow || 1.0) + def.effect.amount) * 100) / 100;
    }
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
      this._save.playerXP = primaryPlayer.xp;
      this._save.playerLevel = primaryPlayer.level;
    }

    // Boss reward item
    const bossRewardItem = BOSSES[bossKey]?.rewardItem;
    if (bossRewardItem) {
      SaveManager.addItem(this._save, bossRewardItem);
      SaveManager.save(this._save);
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
      // Boss XP is banked via gainXP → level_banked; the boon is chosen at a shrine.
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
    const region = this._region;
    if (!region?.echoTriggers?.length) return;
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

  openWorldMap(opts = {}) {
    if (this._mapOpen) return;
    this._mapOpen = true;
    this._paused  = true;
    this.physics.pause();
    this.scene.launch('WorldMapScene', {
      from: 'game', currentRegion: this._regionIndex, fastTravel: !!opts.fastTravel,
    });
    this.scene.bringToTop('WorldMapScene');
  }

  closeWorldMap() {
    if (!this._mapOpen) return;
    this._mapOpen = false;
    this._paused  = false;
    this.physics.resume();
  }

  // Fast travel from the world map to an explored region's shrine.
  fastTravelTo(regionIndex) {
    if (regionIndex == null || regionIndex === this._regionIndex) { this.closeWorldMap(); return; }
    this._mapOpen = false;   // map scene stops itself
    this._persist(regionIndex);
    this.audio?.portal?.();
    this._fadeAndTransition(regionIndex);
  }

  // Called by Player.js when player melee hits boss
  hitBoss(damage) {
    if (!this._boss?.alive) return;
    this._boss.takeDamage(damage, this);
  }
}
