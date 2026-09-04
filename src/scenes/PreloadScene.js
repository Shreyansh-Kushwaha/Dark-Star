import { loadAnimationsJSON } from '../systems/AnimationLoader.js';
import { RegionCatalog } from '../systems/RegionCatalog.js';

const TS  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)";
const PK  = "THE PACK/Monsters";
const CP  = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees";
const A3  = "assets3";

export function _mapSpriteKey(dir, frame) {
  return 'ms_' + (dir + '/' + frame).replace(/[^a-zA-Z0-9]/g, '_');
}

// Warrior: 192×192 frames
const W = 192;
// Lancer: 320×320 frames
const L = 320;

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    // ── Progress bar ──────────────────────────────────────────────
    const cam  = this.cameras.main;
    const barW = 400, barH = 16;
    const bx   = (cam.width - barW) / 2;
    const by   = cam.height / 2 + 20;
    const bg   = this.add.rectangle(cam.width / 2, by, barW + 4, barH + 4, 0x333333).setOrigin(0.5);
    const fill = this.add.rectangle(bx, by - barH / 2, 0, barH, 0xffcc44).setOrigin(0, 0);
    this.add.text(cam.width / 2, by - 36, 'AKHAND SUTRA', {
      fontSize: '26px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(cam.width / 2, by + 32, 'Loading...', {
      fontSize: '14px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.load.on('progress', v => { fill.width = barW * v; });

    // ── Player: Dhruva (Purple Warrior) ──────────────────────────
    this.load.spritesheet('dhruva_idle',    `${TS}/Units/Purple Units/Warrior/Warrior_Idle.png`,    { frameWidth: W, frameHeight: W });
    this.load.spritesheet('dhruva_run',     `${TS}/Units/Purple Units/Warrior/Warrior_Run.png`,     { frameWidth: W, frameHeight: W });
    this.load.spritesheet('dhruva_attack1', `${TS}/Units/Purple Units/Warrior/Warrior_Attack1.png`, { frameWidth: W, frameHeight: W });
    this.load.spritesheet('dhruva_attack2', `${TS}/Units/Purple Units/Warrior/Warrior_Attack2.png`, { frameWidth: W, frameHeight: W });

    // ── Player: Tara (Blue Monk) ──────────────────────────────────
    this.load.spritesheet('tara_idle',    `${TS}/Units/Blue Units/Monk/Idle.png`,       { frameWidth: W, frameHeight: W });
    this.load.spritesheet('tara_run',     `${TS}/Units/Blue Units/Monk/Run.png`,        { frameWidth: W, frameHeight: W });
    this.load.spritesheet('tara_attack1', `${TS}/Units/Blue Units/Monk/Heal.png`,       { frameWidth: W, frameHeight: W });
    this.load.spritesheet('tara_attack2', `${TS}/Units/Blue Units/Monk/Heal_Effect.png`, { frameWidth: W, frameHeight: W });

    // ── NPCs ──────────────────────────────────────────────────────
    this.load.spritesheet('npc_yellow_raw', `${TS}/Units/Yellow Units/Pawn/Pawn_Idle.png`, { frameWidth: W, frameHeight: W });
    this.load.spritesheet('npc_blue_raw',   `${TS}/Units/Blue Units/Pawn/Pawn_Idle.png`,   { frameWidth: W, frameHeight: W });

    // ── Ranged enemy: Archer (Yellow) ─────────────────────────────
    this.load.spritesheet('archer_idle',  `${TS}/Units/Yellow Units/Archer/Archer_Idle.png`,  { frameWidth: W, frameHeight: W });
    this.load.spritesheet('archer_run',   `${TS}/Units/Yellow Units/Archer/Archer_Run.png`,   { frameWidth: W, frameHeight: W });
    this.load.spritesheet('archer_shoot', `${TS}/Units/Yellow Units/Archer/Archer_Shoot.png`, { frameWidth: W, frameHeight: W });
    this.load.image('arrow', `${TS}/Units/Yellow Units/Archer/Arrow.png`);

    // ── Flying enemy: Lancer (Black, tinted teal) ─────────────────
    this.load.spritesheet('lancer_idle', `${TS}/Units/Black Units/Lancer/Lancer_Idle.png`, { frameWidth: L, frameHeight: L });
    this.load.spritesheet('lancer_run',  `${TS}/Units/Black Units/Lancer/Lancer_Run.png`,  { frameWidth: L, frameHeight: L });

    // ── THE PACK ORC / ORC2 packs are NOT loaded here: no roster enemy uses them
    // (the melee/elite enemies use goblin_*/ogre_*), and the ORC2 boss lazy-loads
    // its own orc2_boss_* keys from src/data/bossAssets.js on region entry. These
    // ~57 boot images were dead weight, so they've been removed.

    // ── Boss frames (slime_boss, tree_boss, orc2_boss, mino, frost, dslime) ──
    // Loaded lazily per-region via src/data/bossAssets.js when the player enters
    // a region that uses them — keeps ~230 large boss textures (mino/frost/dslime
    // live in the 81 MB assest2 pack) out of the initial boot load.

    // ── Particle FX ───────────────────────────────────────────────
    this.load.image('explosion_01', `${TS}/Particle FX/Explosion_01.png`);
    this.load.image('fire_01',      `${TS}/Particle FX/Fire_01.png`);
    this.load.image('dust_01',      `${TS}/Particle FX/Dust_01.png`);

    // ── Decorations ───────────────────────────────────────────────
    this.load.image('bush1', `${TS}/Terrain/Decorations/Bushes/Bushe1.png`);
    this.load.image('bush2', `${TS}/Terrain/Decorations/Bushes/Bushe2.png`);
    this.load.image('bush3', `${TS}/Terrain/Decorations/Bushes/Bushe3.png`);
    this.load.image('bush4', `${TS}/Terrain/Decorations/Bushes/Bushe4.png`);
    this.load.image('rock1', `${TS}/Terrain/Decorations/Rocks/Rock1.png`);
    this.load.image('rock2', `${TS}/Terrain/Decorations/Rocks/Rock2.png`);
    this.load.image('cloud1', `${TS}/Terrain/Decorations/Clouds/Clouds_01.png`);
    this.load.image('cloud2', `${TS}/Terrain/Decorations/Clouds/Clouds_02.png`);

    // ── Goblin (Melee enemy — regions 0,1,2) ─────────────────────
    // 256px downscales of the craftpix 900x900 chibi frames (assets_opt/ is
    // generated from assest2/ — the originals stay untouched). The raw frames
    // cost ~3 MB of GPU texture EACH; at render scale ~0.2 that VRAM (350+ MB
    // across the packs) was pure waste and the prime WebGL context-loss risk
    // on low-memory machines.
    const GBL = 'assets_opt/chibi256/Goblin';
    for (let i = 1; i <= 18; i++) this.load.image(`goblin_idle_${String(i).padStart(2,'0')}`,   `${GBL}/Idle/0_Goblin_Idle_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`goblin_run_${String(i).padStart(2,'0')}`,    `${GBL}/Running/0_Goblin_Running_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`goblin_attack_${String(i).padStart(2,'0')}`, `${GBL}/Slashing/0_Goblin_Slashing_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 15; i++) this.load.image(`goblin_dead_${String(i).padStart(2,'0')}`,   `${GBL}/Dying/0_Goblin_Dying_${String(i-1).padStart(3,'0')}.png`);

    // ── Orc (orc_new) is loaded lazily per-region — see src/data/enemyAssets.js
    // + GameScene._ensureEnemyAssets. It's a heavy pack (~5 MB of 900×900 frames)
    // used in only a few regions, so it no longer bloats the boot load.

    // ── Ogre (Elite enemy — regions 2–6) ─────────────────────────
    const OGR = 'assets_opt/chibi256/Ogre';
    for (let i = 1; i <= 18; i++) this.load.image(`ogre_idle_${String(i).padStart(2,'0')}`,   `${OGR}/Idle/0_Ogre_Idle_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`ogre_run_${String(i).padStart(2,'0')}`,    `${OGR}/Running/0_Ogre_Running_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`ogre_attack_${String(i).padStart(2,'0')}`, `${OGR}/Slashing/0_Ogre_Slashing_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 15; i++) this.load.image(`ogre_dead_${String(i).padStart(2,'0')}`,   `${OGR}/Dying/0_Ogre_Dying_${String(i-1).padStart(3,'0')}.png`);

    // ── Rabbit decoration (forest ambient, not enemies) ───────────
    const RB = 'assest2/Monster Pack (Free)/Spritesheets';
    this.load.spritesheet('rabbit_idle',  `${RB}/Updated Rabbit/Rabbit_Brown_Idle.png`,         { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('rabbit_move',  `${RB}/Updated Rabbit/Rabbit_Brown_Move.png`,         { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('rabbitH_idle', `${RB}/Updated Rabbit Horned/Rabbit_Horned_Idle.png`, { frameWidth: 128, frameHeight: 128 });

    // ── Craftpix Trees ───────────────────────────────────────────
    const treeFiles = [
      'jungle_tree_1','jungle_tree_2','jungle_tree_3','jungle_tree_4','jungle_tree_5',
      'jungle_tree_6','jungle_tree_7','jungle_tree_8','jungle_tree_9','jungle_tree_10',
      'jungle_tree_11','jungle_tree_12','jungle_tree_13','jungle_tree_14',
      'fir_tree_1','fir_tree_2','fir_tree_3','fir_tree_4','fir_tree_5',
      'fir_tree_6','fir_tree_7','fir_tree_8','fir_tree_9','fir_tree_10',
      'fir_tree_11',
    ];
    for (const name of treeFiles) {
      this.load.image(name, `${CP}/${name}.png`);
    }

    // ── Tiny Swords Stumps (broken/dead trees) ───────────────────
    for (let i = 1; i <= 4; i++) {
      this.load.image(`ts_stump_${i}`, `${TS}/Terrain/Resources/Wood/Trees/Stump ${i}.png`);
    }

    // ── VFX: White Smoke (s1=7, s2=5, s3=9, s4=6 frames) ───────
    for (let i = 1; i <= 7; i++) this.load.image(`vfx_s1_${i}`, `${A3}/vfx/smoke/s1_${i}.png`);
    for (let i = 1; i <= 5; i++) this.load.image(`vfx_s2_${i}`, `${A3}/vfx/smoke/s2_${i}.png`);
    for (let i = 1; i <= 9; i++) this.load.image(`vfx_s3_${i}`, `${A3}/vfx/smoke/s3_${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`vfx_s4_${i}`, `${A3}/vfx/smoke/s4_${i}.png`);

    // ── VFX: Yellow Power (y1=8, y2=11, y3=12 frames) ───────────
    for (let i = 1; i <= 8;  i++) this.load.image(`vfx_y1_${i}`, `${A3}/vfx/yellow/y1_${i}.png`);
    for (let i = 1; i <= 11; i++) this.load.image(`vfx_y2_${i}`, `${A3}/vfx/yellow/y2_${i}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`vfx_y3_${i}`, `${A3}/vfx/yellow/y3_${i}.png`);

    // ── VFX: Green Attack (g1=9,g2=6,g3=9,g4=8,g5=17 frames) ───
    for (let i = 1; i <= 9;  i++) this.load.image(`vfx_g1_${i}`, `${A3}/vfx/green/g1_${i}.png`);
    for (let i = 1; i <= 6;  i++) this.load.image(`vfx_g2_${i}`, `${A3}/vfx/green/g2_${i}.png`);
    for (let i = 1; i <= 9;  i++) this.load.image(`vfx_g3_${i}`, `${A3}/vfx/green/g3_${i}.png`);
    for (let i = 1; i <= 8;  i++) this.load.image(`vfx_g4_${i}`, `${A3}/vfx/green/g4_${i}.png`);
    for (let i = 1; i <= 17; i++) this.load.image(`vfx_g5_${i}`, `${A3}/vfx/green/g5_${i}.png`);

    // ── VFX: Blue Lightning (l1=4,l2=4,l3=5,l4=5,l5=4,l6=7) ────
    for (let i = 1; i <= 4; i++) this.load.image(`vfx_l1_${i}`, `${A3}/vfx/lightning/l1_${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`vfx_l2_${i}`, `${A3}/vfx/lightning/l2_${i}.png`);
    for (let i = 1; i <= 5; i++) this.load.image(`vfx_l3_${i}`, `${A3}/vfx/lightning/l3_${i}.png`);
    for (let i = 1; i <= 5; i++) this.load.image(`vfx_l4_${i}`, `${A3}/vfx/lightning/l4_${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`vfx_l5_${i}`, `${A3}/vfx/lightning/l5_${i}.png`);
    for (let i = 1; i <= 7; i++) this.load.image(`vfx_l6_${i}`, `${A3}/vfx/lightning/l6_${i}.png`);

    // ── VFX: Frost (fr1=14,fr2=9,fr3=11 frames) ─────────────────
    for (let i = 1; i <= 14; i++) this.load.image(`vfx_fr1_${i}`, `${A3}/vfx/frost/fr1_${i}.png`);
    for (let i = 1; i <= 9;  i++) this.load.image(`vfx_fr2_${i}`, `${A3}/vfx/frost/fr2_${i}.png`);
    for (let i = 1; i <= 11; i++) this.load.image(`vfx_fr3_${i}`, `${A3}/vfx/frost/fr3_${i}.png`);

    // ── VFX: Red Fireball (fb1s=8,fb1l=5,fb1e=6,fb2=12,fb3=4) ──
    for (let i = 1; i <= 8;  i++) this.load.image(`vfx_fb1s_${i}`, `${A3}/vfx/fireball/fb1s_${i}.png`);
    for (let i = 1; i <= 5;  i++) this.load.image(`vfx_fb1l_${i}`, `${A3}/vfx/fireball/fb1l_${i}.png`);
    for (let i = 1; i <= 6;  i++) this.load.image(`vfx_fb1e_${i}`, `${A3}/vfx/fireball/fb1e_${i}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`vfx_fb2_${i}`,  `${A3}/vfx/fireball/fb2_${i}.png`);
    for (let i = 1; i <= 4;  i++) this.load.image(`vfx_fb3_${i}`,  `${A3}/vfx/fireball/fb3_${i}.png`);

    // ── Monsters bat / rat / slime / mimic are loaded lazily per-region
    // (src/data/enemyAssets.js + GameScene._ensureEnemyAssets). Each appears in
    // only a handful of regions, so their spritesheets stay off the boot load.

  }

  create() {
    this._defineAnimations();
    loadAnimationsJSON();   // best-effort merge of reviewer-approved entities (AnimationLoader)
    this._loadNpcDialogue();
    this._loadRegionMaps();
  }

  _loadNpcDialogue() {
    fetch('/api/npc-dialogue')
      .then(r => r.json())
      .then(list => {
        const mapObj = {};
        for (const entry of list) {
          if (entry.id) mapObj[entry.id] = entry;
        }
        this.registry.set('npcDialogue', mapObj);
      })
      .catch(() => {
        this.registry.set('npcDialogue', {});
      });
  }

  _loadRegionMaps() {
    // We used to eagerly preload the sprite textures for ALL 44 regions here —
    // ~370 extra HTTP requests that blocked the main menu on every boot. That was
    // pure redundancy: GameScene._buildRegionFromMap loads whatever a region needs
    // on entry (its `missing` loader self-heals any not-yet-cached texture). So we
    // now only stash the region JSON in the registry and open the menu immediately.
    RegionCatalog.get().then(list => {
      this.registry.set('regionMaps', list);
      if (RegionCatalog.failed) this._showLoadError();
      else this.scene.start('MainMenuScene');
    });
  }

  // The editor world (regions 7+) only exists behind the dev server's /api
  // endpoints; on a plain static host every fetch used to .catch() into an
  // empty array and the player got a silently empty world. Say so instead.
  _showLoadError() {
    const cam = this.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    const objs = [];
    objs.push(this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.85));
    objs.push(this.add.text(cx, cy - 70, '⚠  COULD NOT LOAD WORLD DATA', {
      fontSize: '22px', color: '#ff8866', fontFamily: 'serif', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5));
    objs.push(this.add.text(cx, cy - 24,
      'The game server (/api/regions) did not respond.\n' +
      'Run "node server/combined_server.js" and open the game through it —\n' +
      'a plain static file host cannot serve the world.', {
        fontSize: '13px', color: '#ccbbaa', fontFamily: 'monospace', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5));

    const mkBtn = (y, label, onTap) => {
      const bg = this.add.rectangle(cx, y, 260, 40, 0x1a1a2e, 0.95).setStrokeStyle(2, 0xffd700, 0.8)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(cx, y, label, {
        fontSize: '14px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
      }).setOrigin(0.5);
      bg.on('pointerup', onTap);
      objs.push(bg, txt);
    };
    mkBtn(cy + 48, 'RETRY', () => {
      objs.forEach(o => o.destroy());
      RegionCatalog.refresh();
      this._loadRegionMaps();
    });
    mkBtn(cy + 100, 'CONTINUE ANYWAY', () => this.scene.start('MainMenuScene'));
  }

  _defineAnimations() {
    const anims = this.anims;

    // Warrior (Dhruva) animations
    anims.create({ key: 'dhruva_idle',    frames: anims.generateFrameNumbers('dhruva_idle',    { start: 0, end: 7 }), frameRate: 8,  repeat: -1 });
    anims.create({ key: 'dhruva_run',     frames: anims.generateFrameNumbers('dhruva_run',     { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    anims.create({ key: 'dhruva_attack1', frames: anims.generateFrameNumbers('dhruva_attack1', { start: 0, end: 3 }), frameRate: 12, repeat: 0  });
    anims.create({ key: 'dhruva_attack2', frames: anims.generateFrameNumbers('dhruva_attack2', { start: 0, end: 3 }), frameRate: 10, repeat: 0  });

    // Monk (Tara) animations
    anims.create({ key: 'tara_idle',    frames: anims.generateFrameNumbers('tara_idle',    { start: 0, end: 5 }), frameRate: 8,  repeat: -1 });
    anims.create({ key: 'tara_run',     frames: anims.generateFrameNumbers('tara_run',     { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    anims.create({ key: 'tara_attack1', frames: anims.generateFrameNumbers('tara_attack1', { start: 0, end: 10}), frameRate: 12, repeat: 0  });
    anims.create({ key: 'tara_attack2', frames: anims.generateFrameNumbers('tara_attack2', { start: 0, end: 10}), frameRate: 12, repeat: 0  });

    // NPC animations (just first frame looped)
    anims.create({ key: 'npc_yellow_idle', frames: anims.generateFrameNumbers('npc_yellow_raw', { start: 0, end: 7 }), frameRate: 6, repeat: -1 });
    anims.create({ key: 'npc_blue_idle',   frames: anims.generateFrameNumbers('npc_blue_raw',   { start: 0, end: 7 }), frameRate: 6, repeat: -1 });

    // Archer animations
    anims.create({ key: 'archer_idle',  frames: anims.generateFrameNumbers('archer_idle',  { start: 0, end: 5 }), frameRate: 8,  repeat: -1 });
    anims.create({ key: 'archer_run',   frames: anims.generateFrameNumbers('archer_run',   { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    anims.create({ key: 'archer_shoot', frames: anims.generateFrameNumbers('archer_shoot', { start: 0, end: 7 }), frameRate: 12, repeat: 0  });

    // Lancer animations
    anims.create({ key: 'lancer_idle', frames: anims.generateFrameNumbers('lancer_idle', { start: 0, end: 11 }), frameRate: 10, repeat: -1 });
    anims.create({ key: 'lancer_run',  frames: anims.generateFrameNumbers('lancer_run',  { start: 0, end: 5  }), frameRate: 12, repeat: -1 });

    // (THE PACK orc_*/orc2_* animations removed — their textures are no longer
    // loaded at boot; nothing in the game references these anim keys.)

    // ── Boss animations (slime_boss/tree_boss/orc2_boss/mino/frost/dslime) ──
    // Defined lazily alongside their textures in src/data/bossAssets.js when a
    // region that uses them is entered (see GameScene._ensureBossAssets).

    // ── Goblin enemy animations ────────────────────────────────
    this._buildMultiAnim('goblin_idle',   this._frames('goblin_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]));
    this._buildMultiAnim('goblin_run',    this._frames('goblin_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('goblin_attack', this._frames('goblin_attack', [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('goblin_dead',   this._frames('goblin_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]), 10, 0);

    // (Orc/orc_new animations are defined lazily by defineAnims() when the pack
    // loads on region entry — see src/data/enemyAssets.js.)

    // ── Ogre enemy animations ──────────────────────────────────
    this._buildMultiAnim('ogre_idle',   this._frames('ogre_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]));
    this._buildMultiAnim('ogre_run',    this._frames('ogre_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('ogre_attack', this._frames('ogre_attack', [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('ogre_dead',   this._frames('ogre_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]), 10, 0);

    // ── Rabbit ambient animations ──────────────────────────────
    if (this.textures.exists('rabbit_idle'))  anims.create({ key: 'rabbit_idle',  frames: anims.generateFrameNumbers('rabbit_idle',  { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    if (this.textures.exists('rabbit_move'))  anims.create({ key: 'rabbit_move',  frames: anims.generateFrameNumbers('rabbit_move',  { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    if (this.textures.exists('rabbitH_idle')) anims.create({ key: 'rabbitH_idle', frames: anims.generateFrameNumbers('rabbitH_idle', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });

    // ── VFX animations (multi-image, single-play) ─────────────
    const _vfx = (key, prefix, n, fps = 14) => {
      this._buildMultiAnim(key, Array.from({length: n}, (_, i) => ({ key: `${prefix}${i + 1}` })), fps, 0);
    };
    _vfx('vfx_smoke1', 'vfx_s1_', 7);
    _vfx('vfx_smoke2', 'vfx_s2_', 5);
    _vfx('vfx_smoke3', 'vfx_s3_', 9);
    _vfx('vfx_smoke4', 'vfx_s4_', 6);
    _vfx('vfx_yellow1', 'vfx_y1_', 8);
    _vfx('vfx_yellow2', 'vfx_y2_', 11);
    _vfx('vfx_yellow3', 'vfx_y3_', 12);
    _vfx('vfx_green1', 'vfx_g1_', 9);
    _vfx('vfx_green2', 'vfx_g2_', 6);
    _vfx('vfx_green3', 'vfx_g3_', 9);
    _vfx('vfx_green4', 'vfx_g4_', 8);
    _vfx('vfx_green5', 'vfx_g5_', 17);
    _vfx('vfx_lightning1', 'vfx_l1_', 4, 18);
    _vfx('vfx_lightning2', 'vfx_l2_', 4, 18);
    _vfx('vfx_lightning3', 'vfx_l3_', 5, 18);
    _vfx('vfx_lightning4', 'vfx_l4_', 5, 18);
    _vfx('vfx_lightning5', 'vfx_l5_', 4, 18);
    _vfx('vfx_lightning6', 'vfx_l6_', 7, 18);
    _vfx('vfx_frost1', 'vfx_fr1_', 14, 14);
    _vfx('vfx_frost2', 'vfx_fr2_', 9,  14);
    _vfx('vfx_frost3', 'vfx_fr3_', 11, 14);
    _vfx('vfx_fire1s', 'vfx_fb1s_', 8,  16);
    _vfx('vfx_fire1l', 'vfx_fb1l_', 5,  16);
    _vfx('vfx_fire1e', 'vfx_fb1e_', 6,  16);
    _vfx('vfx_fire2',  'vfx_fb2_',  12, 16);
    _vfx('vfx_fire3',  'vfx_fb3_',  4,  16);

    // (Bat / Rat / Slime / Mimic animations are defined lazily by defineAnims()
    // when each pack loads on region entry — see src/data/enemyAssets.js.)

  }

  _frames(prefix, nums) {
    return nums.map(n => ({ key: `${prefix}_${String(n).padStart(2,'0')}` }));
  }

  _buildMultiAnim(key, frames, frameRate = 10, repeat = -1) {
    if (this.anims.exists(key)) return;
    this.anims.create({ key, frames, frameRate, repeat });
  }
}
