// Lazy-loaded enemy sprite families — the narrow-footprint roster packs that used
// to load at boot but are only needed in a handful of regions. Same { loads, anims }
// shape as BOSS_FAMILIES (src/data/bossAssets.js); AnimationLoader seeds these into
// its family registry, and GameScene loads + defines them on region entry via
// _loadFamilyAssets/defineAnims (see _ensureEnemyAssets). The ubiquitous packs
// (goblin/ogre/archer/lancer) stay in PreloadScene — nearly every region uses them.
//
// Family keys equal the enemy's textureBase (src/data/enemies.js), so the anim keys
// this produces (`${base}_idle`, …) and the frame texture keys (`${base}_idle_01`, …)
// are byte-identical to what PreloadScene used to build. Frame ranges / framerates /
// repeats below mirror the removed _defineAnimations() calls exactly.

const A3   = 'assets3';
const CX   = 'assest2/craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites';
const ORCP = `${CX}/Orc/PNG/PNG Sequences`;

const pad2  = n => String(n).padStart(2, '0');
const pad3  = n => String(n).padStart(3, '0');
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

// Image-frame pack: key `${base}_${state}_NN` (1-based) ← `${dir}/${prefix}${i-1 padded to 3}.png`.
// Mirrors the removed PreloadScene loops, e.g. orc_new_idle_01 ← Idle/0_Orc_Idle_000.png
const frameLoads = (base, state, dir, prefix, count) =>
  range(1, count).map(i => ({ key: `${base}_${state}_${pad2(i)}`, url: `${dir}/${prefix}${pad3(i - 1)}.png` }));

// Spritesheet load descriptor (Phaser slices `url` into frameWidth×frameHeight cells).
const sheet = (key, file, fw, fh) => ({ key, url: `${A3}/monsters/${file}`, frameWidth: fw, frameHeight: fh });

export const ENEMY_FAMILIES = {
  // ── Vana Raksha (orc) — craftpix chibi Orc, 900×900 frame images (heavy: ~5 MB) ──
  orc_new: {
    loads: [
      ...frameLoads('orc_new', 'idle',   `${ORCP}/Idle`,     '0_Orc_Idle_',     18),
      ...frameLoads('orc_new', 'run',    `${ORCP}/Running`,  '0_Orc_Running_',  12),
      ...frameLoads('orc_new', 'attack', `${ORCP}/Slashing`, '0_Orc_Slashing_', 12),
      ...frameLoads('orc_new', 'dead',   `${ORCP}/Dying`,    '0_Orc_Dying_',    15),
    ],
    anims: [
      { key: 'orc_new_idle',   src: 'orc_new_idle',   nums: range(1, 18), fr: 10, rep: -1 },
      { key: 'orc_new_run',    src: 'orc_new_run',    nums: range(1, 12), fr: 10, rep: -1 },
      { key: 'orc_new_attack', src: 'orc_new_attack', nums: range(1, 12), fr: 10, rep: -1 },
      { key: 'orc_new_dead',   src: 'orc_new_dead',   nums: range(1, 15), fr: 10, rep:  0 },
    ],
  },

  // ── Vayu Pakshi (bat) — 87×87 spritesheets ──
  bat: {
    loads: [
      sheet('bat_ss_fly',    'bat/fly.png',    87, 87),
      sheet('bat_ss_attack', 'bat/attack.png', 87, 87),
      sheet('bat_ss_hurt',   'bat/hurt.png',   87, 87),
      sheet('bat_ss_death',  'bat/death.png',  87, 87),
    ],
    anims: [
      { key: 'bat_idle',   sheet: 'bat_ss_fly',    start: 0, end: 10, fr: 12, rep: -1 },
      { key: 'bat_run',    sheet: 'bat_ss_fly',    start: 0, end: 10, fr: 14, rep: -1 },
      { key: 'bat_attack', sheet: 'bat_ss_attack', start: 0, end: 10, fr: 14, rep:  0 },
      { key: 'bat_hurt',   sheet: 'bat_ss_hurt',   start: 0, end:  2, fr: 12, rep:  0 },
      { key: 'bat_dead',   sheet: 'bat_ss_death',  start: 0, end:  3, fr: 10, rep:  0 },
    ],
  },

  // ── Kshetra Mooshak (rat) — 70×70 spritesheets ──
  rat: {
    loads: [
      sheet('rat_ss_idle',   'rat/idle.png',   70, 70),
      sheet('rat_ss_run',    'rat/run.png',    70, 70),
      sheet('rat_ss_attack', 'rat/attack.png', 70, 70),
      sheet('rat_ss_hurt',   'rat/hurt.png',   70, 70),
      sheet('rat_ss_dead',   'rat/dead.png',   70, 70),
    ],
    anims: [
      { key: 'rat_idle',   sheet: 'rat_ss_idle',   start: 0, end:  9, fr: 10, rep: -1 },
      { key: 'rat_run',    sheet: 'rat_ss_run',    start: 0, end:  7, fr: 12, rep: -1 },
      { key: 'rat_attack', sheet: 'rat_ss_attack', start: 0, end: 11, fr: 14, rep:  0 },
      { key: 'rat_hurt',   sheet: 'rat_ss_hurt',   start: 0, end:  2, fr: 12, rep:  0 },
      { key: 'rat_dead',   sheet: 'rat_ss_dead',   start: 0, end:  5, fr: 10, rep:  0 },
    ],
  },

  // ── Vikrit Kshira (slime) — 156×156 spritesheets ──
  slimem: {
    loads: [
      sheet('slimem_ss_idle',   'slime/idle.png',   156, 156),
      sheet('slimem_ss_walk',   'slime/walk.png',   156, 156),
      sheet('slimem_ss_attack', 'slime/attack.png', 156, 156),
      sheet('slimem_ss_hurt',   'slime/hurt.png',   156, 156),
      sheet('slimem_ss_death',  'slime/death.png',  156, 156),
    ],
    anims: [
      { key: 'slimem_idle',   sheet: 'slimem_ss_idle',   start: 0, end: 13, fr: 10, rep: -1 },
      { key: 'slimem_run',    sheet: 'slimem_ss_walk',   start: 0, end:  5, fr: 10, rep: -1 },
      { key: 'slimem_attack', sheet: 'slimem_ss_attack', start: 0, end: 18, fr: 14, rep:  0 },
      { key: 'slimem_hurt',   sheet: 'slimem_ss_hurt',   start: 0, end:  2, fr: 12, rep:  0 },
      { key: 'slimem_dead',   sheet: 'slimem_ss_death',  start: 0, end: 10, fr: 10, rep:  0 },
    ],
  },

  // ── Mayavi Peti (mimic) — 146×146 spritesheets ──
  mimic: {
    loads: [
      sheet('mimic_ss_closed',    'mimic/closed.png',    146, 146),
      sheet('mimic_ss_opening',   'mimic/opening.png',   146, 146),
      sheet('mimic_ss_transform', 'mimic/transform.png', 146, 146),
      sheet('mimic_ss_attack1',   'mimic/attack1.png',   146, 146),
      sheet('mimic_ss_hurt',      'mimic/hurt.png',      146, 146),
      sheet('mimic_ss_death',     'mimic/death.png',     146, 146),
      sheet('mimic_ss_walk',      'mimic/walk.png',      146, 146),
    ],
    anims: [
      { key: 'mimic_idle',      sheet: 'mimic_ss_closed',    start: 0, end:  0, fr:  4, rep: -1 },
      { key: 'mimic_run',       sheet: 'mimic_ss_walk',      start: 0, end:  5, fr:  8, rep: -1 },
      { key: 'mimic_opening',   sheet: 'mimic_ss_opening',   start: 0, end:  5, fr:  8, rep:  0 },
      { key: 'mimic_transform', sheet: 'mimic_ss_transform', start: 0, end:  6, fr:  8, rep:  0 },
      { key: 'mimic_attack',    sheet: 'mimic_ss_attack1',   start: 0, end: 13, fr: 14, rep:  0 },
      { key: 'mimic_hurt',      sheet: 'mimic_ss_hurt',      start: 0, end:  2, fr: 12, rep:  0 },
      { key: 'mimic_dead',      sheet: 'mimic_ss_death',     start: 0, end:  5, fr: 10, rep:  0 },
    ],
  },
};
