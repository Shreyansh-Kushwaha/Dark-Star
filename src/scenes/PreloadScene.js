const TS  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)";
const PK  = "THE PACK/Monsters";
const CP  = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees";

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
    this.load.spritesheet('dhruva_guard',   `${TS}/Units/Purple Units/Warrior/Warrior_Guard.png`,   { frameWidth: W, frameHeight: W });

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

    // ── ORC (Melee enemy) ─────────────────────────────────────────
    for (let i = 1; i <= 4; i++) this.load.image(`orc_idle_${String(i).padStart(2,'0')}`, `${PK}/ORC/Idel/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`orc_run_${String(i).padStart(2,'0')}`,  `${PK}/ORC/Run/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 9; i++) this.load.image(`orc_attack_${String(i).padStart(2,'0')}`,`${PK}/ORC/ATTACK/${String(i).padStart(2,'0')}.png`);
    const orcDeadFrames = [1,2,3,5,6,7,8,9];
    for (const i of orcDeadFrames) this.load.image(`orc_dead_${String(i).padStart(2,'0')}`, `${PK}/ORC/dead/${String(i).padStart(2,'0')}.png`);

    // ── ORC2 (Elite enemy) ────────────────────────────────────────
    for (let i = 1; i <= 6; i++) this.load.image(`orc2_idle_${String(i).padStart(2,'0')}`, `${PK}/ORC2/IDEL/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`orc2_run_${String(i).padStart(2,'0')}`,  `${PK}/ORC2/Run/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 8; i++) this.load.image(`orc2_attack_${String(i).padStart(2,'0')}`,`${PK}/ORC2/attack/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 10; i++) this.load.image(`orc2_dead_${String(i).padStart(2,'0')}`, `${PK}/ORC2/DEAD/${String(i).padStart(2,'0')}.png`);

    // ── KING SLIME (Boss: Nagraj, Viyogasur) ─────────────────────
    for (let i = 1; i <= 4; i++) this.load.image(`slime_boss_idle_${String(i).padStart(2,'0')}`, `${PK}/KING SLIME/idel/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 8; i++) this.load.image(`slime_boss_attack_${String(i).padStart(2,'0')}`, `${PK}/KING SLIME/attack/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 8; i++) this.load.image(`slime_boss_dead_${String(i).padStart(2,'0')}`, `${PK}/KING SLIME/Dead/${String(i).padStart(2,'0')}.png`);

    // ── Tree Boss (Vanaraksha, Vanasur) ───────────────────────────
    for (let i = 1; i <= 10; i++) this.load.image(`tree_boss_attack_${String(i).padStart(2,'0')}`, `${PK}/Tree/attact/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 11; i++) this.load.image(`tree_boss_idle_${String(i).padStart(2,'0')}`,   `${PK}/Tree/ground Up/${String(i).padStart(2,'0')}.png`);
    // Use ground-up as run too
    for (let i = 1; i <= 11; i++) this.load.image(`tree_boss_run_${String(i).padStart(2,'0')}`,    `${PK}/Tree/ground Up/${String(i).padStart(2,'0')}.png`);
    // Dead reuses attack in reverse (no dead folder for tree)
    for (let i = 10; i >= 1; i--) this.load.image(`tree_boss_dead_${String(11-i).padStart(2,'0')}`, `${PK}/Tree/attact/${String(i).padStart(2,'0')}.png`);

    // ── ORC2 as boss (Pashana Daitya, Vayu Rakshasa) ─────────────
    for (let i = 1; i <= 6; i++) this.load.image(`orc2_boss_idle_${String(i).padStart(2,'0')}`,   `${PK}/ORC2/IDEL/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`orc2_boss_run_${String(i).padStart(2,'0')}`,    `${PK}/ORC2/Run/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 8; i++) this.load.image(`orc2_boss_attack_${String(i).padStart(2,'0')}`, `${PK}/ORC2/attack/${String(i).padStart(2,'0')}.png`);
    for (let i = 1; i <= 10; i++) this.load.image(`orc2_boss_dead_${String(i).padStart(2,'0')}`,  `${PK}/ORC2/DEAD/${String(i).padStart(2,'0')}.png`);

    // ── Minotaur (Region 4 Boss) ──────────────────────────────────
    const MN = 'assest2/mino_v1.1_free/animations';
    for (let i = 1; i <= 16; i++) this.load.image(`mino_idle_${String(i).padStart(2,'0')}`,   `${MN}/idle/idle_${i}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`mino_run_${String(i).padStart(2,'0')}`,    `${MN}/walk/walk_${i}.png`);
    for (let i = 1; i <= 16; i++) this.load.image(`mino_attack_${String(i).padStart(2,'0')}`, `${MN}/atk_1/atk_1_${i}.png`);

    // ── Frost Guardian (Region 5 Boss) ───────────────────────────
    const FG = 'assest2/Frost_Guardian_FREE_v1.0/PNG files';
    for (let i = 1; i <= 6;  i++) this.load.image(`frost_idle_${String(i).padStart(2,'0')}`,   `${FG}/idle/idle_${i}.png`);
    for (let i = 1; i <= 10; i++) this.load.image(`frost_run_${String(i).padStart(2,'0')}`,    `${FG}/walk/walk_${i}.png`);
    for (let i = 1; i <= 14; i++) this.load.image(`frost_attack_${String(i).padStart(2,'0')}`, `${FG}/1_atk/1_atk_${i}.png`);
    for (let i = 1; i <= 16; i++) this.load.image(`frost_dead_${String(i).padStart(2,'0')}`,   `${FG}/death/death_${i}.png`);

    // ── Demon Slime (Region 6 Boss) ──────────────────────────────
    const DS = 'assest2/boss_demon_slime_FREE_v1.0/individual sprites';
    for (let i = 1; i <= 6;  i++) this.load.image(`dslime_idle_${String(i).padStart(2,'0')}`,   `${DS}/01_demon_idle/demon_idle_${i}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`dslime_run_${String(i).padStart(2,'0')}`,    `${DS}/02_demon_walk/demon_walk_${i}.png`);
    for (let i = 1; i <= 15; i++) this.load.image(`dslime_attack_${String(i).padStart(2,'0')}`, `${DS}/03_demon_cleave/demon_cleave_${i}.png`);
    for (let i = 1; i <= 22; i++) this.load.image(`dslime_dead_${String(i).padStart(2,'0')}`,   `${DS}/05_demon_death/demon_death_${i}.png`);

    // ── Particle FX ───────────────────────────────────────────────
    this.load.image('explosion_01', `${TS}/Particle FX/Explosion_01.png`);
    this.load.image('explosion_02', `${TS}/Particle FX/Explosion_02.png`);
    this.load.image('fire_01',      `${TS}/Particle FX/Fire_01.png`);
    this.load.image('fire_02',      `${TS}/Particle FX/Fire_02.png`);
    this.load.image('fire_03',      `${TS}/Particle FX/Fire_03.png`);
    this.load.image('dust_01',      `${TS}/Particle FX/Dust_01.png`);
    this.load.image('dust_02',      `${TS}/Particle FX/Dust_02.png`);
    this.load.image('water_splash', `${TS}/Particle FX/Water Splash.png`);

    // ── UI ────────────────────────────────────────────────────────
    this.load.image('bar_big_base',  `${TS}/UI Elements/UI Elements/Bars/BigBar_Base.png`);
    this.load.image('bar_big_fill',  `${TS}/UI Elements/UI Elements/Bars/BigBar_Fill.png`);
    this.load.image('bar_sm_base',   `${TS}/UI Elements/UI Elements/Bars/SmallBar_Base.png`);
    this.load.image('bar_sm_fill',   `${TS}/UI Elements/UI Elements/Bars/SmallBar_Fill.png`);
    this.load.image('btn_blue',      `${TS}/UI Elements/UI Elements/Buttons/BigBlueButton_Regular.png`);
    this.load.image('btn_blue_p',    `${TS}/UI Elements/UI Elements/Buttons/BigBlueButton_Pressed.png`);
    this.load.image('paper_regular', `${TS}/UI Elements/UI Elements/Papers/RegularPaper.png`);
    this.load.image('paper_special', `${TS}/UI Elements/UI Elements/Papers/SpecialPaper.png`);
    this.load.image('banner',        `${TS}/UI Elements/UI Elements/Banners/Banner.png`);
    this.load.image('wood_slots',    `${TS}/UI Elements/UI Elements/Wood Table/WoodTable_Slots.png`);
    this.load.image('ribbon_blue',   `${TS}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Blue.png`);

    // ── Decorations ───────────────────────────────────────────────
    this.load.image('bush1', `${TS}/Terrain/Decorations/Bushes/Bushe1.png`);
    this.load.image('bush2', `${TS}/Terrain/Decorations/Bushes/Bushe2.png`);
    this.load.image('bush3', `${TS}/Terrain/Decorations/Bushes/Bushe3.png`);
    this.load.image('bush4', `${TS}/Terrain/Decorations/Bushes/Bushe4.png`);
    this.load.image('rock1', `${TS}/Terrain/Decorations/Rocks/Rock1.png`);
    this.load.image('rock2', `${TS}/Terrain/Decorations/Rocks/Rock2.png`);
    this.load.image('cloud1', `${TS}/Terrain/Decorations/Clouds/Clouds_01.png`);
    this.load.image('cloud2', `${TS}/Terrain/Decorations/Clouds/Clouds_02.png`);
    this.load.image('water_rock1', `${TS}/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png`);
    this.load.image('water_rock2', `${TS}/Terrain/Decorations/Rocks in the Water/Water Rocks_02.png`);

    // ── Goblin (Melee enemy — regions 0,1,2) ─────────────────────
    const CX  = 'assest2/craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites';
    const GBL = `${CX}/Goblin/PNG/PNG Sequences`;
    for (let i = 1; i <= 18; i++) this.load.image(`goblin_idle_${String(i).padStart(2,'0')}`,   `${GBL}/Idle/0_Goblin_Idle_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`goblin_run_${String(i).padStart(2,'0')}`,    `${GBL}/Running/0_Goblin_Running_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`goblin_attack_${String(i).padStart(2,'0')}`, `${GBL}/Slashing/0_Goblin_Slashing_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 15; i++) this.load.image(`goblin_dead_${String(i).padStart(2,'0')}`,   `${GBL}/Dying/0_Goblin_Dying_${String(i-1).padStart(3,'0')}.png`);

    // ── Orc (Mid enemy — regions 2,3,4) ──────────────────────────
    const ORCP = `${CX}/Orc/PNG/PNG Sequences`;
    for (let i = 1; i <= 18; i++) this.load.image(`orc_new_idle_${String(i).padStart(2,'0')}`,   `${ORCP}/Idle/0_Orc_Idle_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`orc_new_run_${String(i).padStart(2,'0')}`,    `${ORCP}/Running/0_Orc_Running_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 12; i++) this.load.image(`orc_new_attack_${String(i).padStart(2,'0')}`, `${ORCP}/Slashing/0_Orc_Slashing_${String(i-1).padStart(3,'0')}.png`);
    for (let i = 1; i <= 15; i++) this.load.image(`orc_new_dead_${String(i).padStart(2,'0')}`,   `${ORCP}/Dying/0_Orc_Dying_${String(i-1).padStart(3,'0')}.png`);

    // ── Ogre (Elite enemy — regions 2–6) ─────────────────────────
    const OGR = `${CX}/Ogre/PNG/PNG Sequences`;
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
  }

  create() {
    this._defineAnimations();
    this.scene.start('MainMenuScene');
  }

  _defineAnimations() {
    const anims = this.anims;

    // Warrior (Dhruva) animations
    anims.create({ key: 'dhruva_idle',    frames: anims.generateFrameNumbers('dhruva_idle',    { start: 0, end: 7 }), frameRate: 8,  repeat: -1 });
    anims.create({ key: 'dhruva_run',     frames: anims.generateFrameNumbers('dhruva_run',     { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    anims.create({ key: 'dhruva_attack1', frames: anims.generateFrameNumbers('dhruva_attack1', { start: 0, end: 3 }), frameRate: 12, repeat: 0  });
    anims.create({ key: 'dhruva_attack2', frames: anims.generateFrameNumbers('dhruva_attack2', { start: 0, end: 3 }), frameRate: 10, repeat: 0  });
    anims.create({ key: 'dhruva_guard',   frames: anims.generateFrameNumbers('dhruva_guard',   { start: 0, end: 5 }), frameRate: 8,  repeat: -1 });

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

    // ── Build multi-texture animations for THE PACK sprites ─────
    this._buildMultiAnim('orc_idle',   this._frames('orc_idle',   [1,2,3,4]));
    this._buildMultiAnim('orc_run',    this._frames('orc_run',    [1,2,3,4,5,6]));
    this._buildMultiAnim('orc_attack', this._frames('orc_attack', [1,2,3,4,5,6,7,8,9]));
    this._buildMultiAnim('orc_dead',   this._frames('orc_dead',   [1,2,3,5,6,7,8,9]));

    this._buildMultiAnim('orc2_idle',   this._frames('orc2_idle',   [1,2,3,4,5,6]));
    this._buildMultiAnim('orc2_run',    this._frames('orc2_run',    [1,2,3,4,5,6]));
    this._buildMultiAnim('orc2_attack', this._frames('orc2_attack', [1,2,3,4,5,6,7,8]));
    this._buildMultiAnim('orc2_dead',   this._frames('orc2_dead',   [1,2,3,4,5,6,7,8,9,10]));

    this._buildMultiAnim('slime_boss_idle',   this._frames('slime_boss_idle',   [1,2,3,4]));
    this._buildMultiAnim('slime_boss_attack', this._frames('slime_boss_attack', [1,2,3,4,5,6,7,8]));
    this._buildMultiAnim('slime_boss_dead',   this._frames('slime_boss_dead',   [1,2,3,4,5,6,7,8]));
    this._buildMultiAnim('slime_boss_run',    this._frames('slime_boss_idle',   [1,2,3,4]));

    this._buildMultiAnim('tree_boss_idle',   this._frames('tree_boss_idle',   [11]), 10, -1);
    this._buildMultiAnim('tree_boss_run',    this._frames('tree_boss_run',    [11]), 10, -1);
    this._buildMultiAnim('tree_boss_attack', this._frames('tree_boss_attack', [1,2,3,4,5,6,7,8,9,10]));
    this._buildMultiAnim('tree_boss_dead',   this._frames('tree_boss_dead',   [1,2,3,4,5,6,7,8,9,10]));

    this._buildMultiAnim('orc2_boss_idle',   this._frames('orc2_boss_idle',   [1,2,3,4,5,6]));
    this._buildMultiAnim('orc2_boss_run',    this._frames('orc2_boss_run',    [1,2,3,4,5,6]));
    this._buildMultiAnim('orc2_boss_attack', this._frames('orc2_boss_attack', [1,2,3,4,5,6,7,8]));
    this._buildMultiAnim('orc2_boss_dead',   this._frames('orc2_boss_dead',   [1,2,3,4,5,6,7,8,9,10]));

    // ── Minotaur boss animations ───────────────────────────────
    this._buildMultiAnim('mino_idle',   this._frames('mino_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]));
    this._buildMultiAnim('mino_run',    this._frames('mino_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('mino_attack', this._frames('mino_attack', [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]));
    this._buildMultiAnim('mino_dead',   this._frames('mino_idle',   [16,14,12,10,8,6,4,2,1]), 6, 0);

    // ── Frost Guardian boss animations ─────────────────────────
    this._buildMultiAnim('frost_idle',   this._frames('frost_idle',   [1,2,3,4,5,6]));
    this._buildMultiAnim('frost_run',    this._frames('frost_run',    [1,2,3,4,5,6,7,8,9,10]));
    this._buildMultiAnim('frost_attack', this._frames('frost_attack', [1,2,3,4,5,6,7,8,9,10,11,12,13,14]));
    this._buildMultiAnim('frost_dead',   this._frames('frost_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]), 10, 0);

    // ── Demon Slime boss animations ────────────────────────────
    this._buildMultiAnim('dslime_idle',   this._frames('dslime_idle',   [1,2,3,4,5,6]));
    this._buildMultiAnim('dslime_run',    this._frames('dslime_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('dslime_attack', this._frames('dslime_attack', [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));
    this._buildMultiAnim('dslime_dead',   this._frames('dslime_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]), 12, 0);

    // ── Goblin enemy animations ────────────────────────────────
    this._buildMultiAnim('goblin_idle',   this._frames('goblin_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]));
    this._buildMultiAnim('goblin_run',    this._frames('goblin_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('goblin_attack', this._frames('goblin_attack', [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('goblin_dead',   this._frames('goblin_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]), 10, 0);

    // ── Orc enemy animations ───────────────────────────────────
    this._buildMultiAnim('orc_new_idle',   this._frames('orc_new_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]));
    this._buildMultiAnim('orc_new_run',    this._frames('orc_new_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('orc_new_attack', this._frames('orc_new_attack', [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('orc_new_dead',   this._frames('orc_new_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]), 10, 0);

    // ── Ogre enemy animations ──────────────────────────────────
    this._buildMultiAnim('ogre_idle',   this._frames('ogre_idle',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]));
    this._buildMultiAnim('ogre_run',    this._frames('ogre_run',    [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('ogre_attack', this._frames('ogre_attack', [1,2,3,4,5,6,7,8,9,10,11,12]));
    this._buildMultiAnim('ogre_dead',   this._frames('ogre_dead',   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]), 10, 0);

    // ── Rabbit ambient animations ──────────────────────────────
    if (this.textures.exists('rabbit_idle'))  anims.create({ key: 'rabbit_idle',  frames: anims.generateFrameNumbers('rabbit_idle',  { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    if (this.textures.exists('rabbit_move'))  anims.create({ key: 'rabbit_move',  frames: anims.generateFrameNumbers('rabbit_move',  { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    if (this.textures.exists('rabbitH_idle')) anims.create({ key: 'rabbitH_idle', frames: anims.generateFrameNumbers('rabbitH_idle', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
  }

  _frames(prefix, nums) {
    return nums.map(n => ({ key: `${prefix}_${String(n).padStart(2,'0')}` }));
  }

  _buildMultiAnim(key, frames, frameRate = 10, repeat = -1) {
    if (this.anims.exists(key)) return;
    this.anims.create({ key, frames, frameRate, repeat });
  }
}
