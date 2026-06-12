// Boss asset families, split out of PreloadScene so the ~230 large boss frames
// (mino/frost/dslime live in the 81 MB assest2 pack) load lazily when the
// player enters a region that uses them — instead of at initial boot.
//
// Each family lists its image loads ({key,url}) and its animation specs
// ({key, src, nums, fr, rep}); an anim's frame keys are `${src}_${pad(n)}`,
// letting one state's frames back another anim (e.g. slime "run" reuses idle).
//
// loadBossAssets()/defineBossAnims() work with any scene and are idempotent, so
// both the host and the joining client run them on region entry — co-op safe.

const PK = 'THE PACK/Monsters';
const MN = 'assest2/mino_v1.1_free/animations';
const FG = 'assest2/Frost_Guardian_FREE_v1.0/PNG files';
const DS = 'assest2/boss_demon_slime_FREE_v1.0/individual sprites';

const pad   = n => String(n).padStart(2, '0');
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

export const BOSS_FAMILIES = {
  // ── KING SLIME (Nagraj, Viyogasur legacy) ──────────────────────
  slime_boss: {
    loads: [
      ...range(1, 4).map(i => ({ key: `slime_boss_idle_${pad(i)}`,   url: `${PK}/KING SLIME/idel/${pad(i)}.png` })),
      ...range(1, 8).map(i => ({ key: `slime_boss_attack_${pad(i)}`, url: `${PK}/KING SLIME/attack/${pad(i)}.png` })),
      ...range(1, 8).map(i => ({ key: `slime_boss_dead_${pad(i)}`,   url: `${PK}/KING SLIME/Dead/${pad(i)}.png` })),
    ],
    anims: [
      { key: 'slime_boss_idle',   src: 'slime_boss_idle',   nums: [1, 2, 3, 4] },
      { key: 'slime_boss_attack', src: 'slime_boss_attack', nums: [1, 2, 3, 4, 5, 6, 7, 8] },
      { key: 'slime_boss_dead',   src: 'slime_boss_dead',   nums: [1, 2, 3, 4, 5, 6, 7, 8] },
      { key: 'slime_boss_run',    src: 'slime_boss_idle',   nums: [1, 2, 3, 4] }, // run = idle frames
    ],
  },

  // ── Tree Boss (Vanaraksha, Vanasur, Nagraj Kaliya) ─────────────
  // Dead reuses attack frames in reverse; run reuses idle (no run art).
  tree_boss: {
    loads: [
      ...range(1, 10).map(i => ({ key: `tree_boss_attack_${pad(i)}`, url: `${PK}/Tree/attact/${pad(i)}.png` })),
      ...range(1, 11).map(i => ({ key: `tree_boss_idle_${pad(i)}`,   url: `${PK}/Tree/ground Up/${pad(i)}.png` })),
      // dead_01..dead_10 ← attack 10..1 (reverse)
      ...range(1, 10).map(i => ({ key: `tree_boss_dead_${pad(11 - i)}`, url: `${PK}/Tree/attact/${pad(i)}.png` })),
    ],
    anims: [
      { key: 'tree_boss_idle',   src: 'tree_boss_idle',   nums: [11], fr: 10, rep: -1 },
      { key: 'tree_boss_run',    src: 'tree_boss_idle',   nums: [11], fr: 10, rep: -1 }, // dedup: was a duplicate load
      { key: 'tree_boss_attack', src: 'tree_boss_attack', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { key: 'tree_boss_dead',   src: 'tree_boss_dead',   nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  },

  // ── ORC2 as boss (Pashana Daitya, Vayu Rakshasa legacy) ────────
  orc2_boss: {
    loads: [
      ...range(1, 6).map(i  => ({ key: `orc2_boss_idle_${pad(i)}`,   url: `${PK}/ORC2/IDEL/${pad(i)}.png` })),
      ...range(1, 6).map(i  => ({ key: `orc2_boss_run_${pad(i)}`,    url: `${PK}/ORC2/Run/${pad(i)}.png` })),
      ...range(1, 8).map(i  => ({ key: `orc2_boss_attack_${pad(i)}`, url: `${PK}/ORC2/attack/${pad(i)}.png` })),
      ...range(1, 10).map(i => ({ key: `orc2_boss_dead_${pad(i)}`,   url: `${PK}/ORC2/DEAD/${pad(i)}.png` })),
    ],
    anims: [
      { key: 'orc2_boss_idle',   src: 'orc2_boss_idle',   nums: [1, 2, 3, 4, 5, 6] },
      { key: 'orc2_boss_run',    src: 'orc2_boss_run',    nums: [1, 2, 3, 4, 5, 6] },
      { key: 'orc2_boss_attack', src: 'orc2_boss_attack', nums: [1, 2, 3, 4, 5, 6, 7, 8] },
      { key: 'orc2_boss_dead',   src: 'orc2_boss_dead',   nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  },

  // ── Minotaur (Pashana Daitya) ──────────────────────────────────
  mino: {
    loads: [
      ...range(1, 16).map(i => ({ key: `mino_idle_${pad(i)}`,   url: `${MN}/idle/idle_${i}.png` })),
      ...range(1, 12).map(i => ({ key: `mino_run_${pad(i)}`,    url: `${MN}/walk/walk_${i}.png` })),
      ...range(1, 16).map(i => ({ key: `mino_attack_${pad(i)}`, url: `${MN}/atk_1/atk_1_${i}.png` })),
    ],
    anims: [
      { key: 'mino_idle',   src: 'mino_idle',   nums: range(1, 16) },
      { key: 'mino_run',    src: 'mino_run',    nums: range(1, 12) },
      { key: 'mino_attack', src: 'mino_attack', nums: range(1, 16) },
      { key: 'mino_dead',   src: 'mino_idle',   nums: [16, 14, 12, 10, 8, 6, 4, 2, 1], fr: 6, rep: 0 },
    ],
  },

  // ── Frost Guardian (Vayu Rakshasa) ─────────────────────────────
  frost: {
    loads: [
      ...range(1, 6).map(i  => ({ key: `frost_idle_${pad(i)}`,   url: `${FG}/idle/idle_${i}.png` })),
      ...range(1, 10).map(i => ({ key: `frost_run_${pad(i)}`,    url: `${FG}/walk/walk_${i}.png` })),
      ...range(1, 14).map(i => ({ key: `frost_attack_${pad(i)}`, url: `${FG}/1_atk/1_atk_${i}.png` })),
      ...range(1, 16).map(i => ({ key: `frost_dead_${pad(i)}`,   url: `${FG}/death/death_${i}.png` })),
    ],
    anims: [
      { key: 'frost_idle',   src: 'frost_idle',   nums: range(1, 6) },
      { key: 'frost_run',    src: 'frost_run',    nums: range(1, 10) },
      { key: 'frost_attack', src: 'frost_attack', nums: range(1, 14) },
      { key: 'frost_dead',   src: 'frost_dead',   nums: range(1, 16), fr: 10, rep: 0 },
    ],
  },

  // ── Demon Slime (Viyogasur) ────────────────────────────────────
  dslime: {
    loads: [
      ...range(1, 6).map(i  => ({ key: `dslime_idle_${pad(i)}`,   url: `${DS}/01_demon_idle/demon_idle_${i}.png` })),
      ...range(1, 12).map(i => ({ key: `dslime_run_${pad(i)}`,    url: `${DS}/02_demon_walk/demon_walk_${i}.png` })),
      ...range(1, 15).map(i => ({ key: `dslime_attack_${pad(i)}`, url: `${DS}/03_demon_cleave/demon_cleave_${i}.png` })),
      ...range(1, 22).map(i => ({ key: `dslime_dead_${pad(i)}`,   url: `${DS}/05_demon_death/demon_death_${i}.png` })),
    ],
    anims: [
      { key: 'dslime_idle',   src: 'dslime_idle',   nums: range(1, 6) },
      { key: 'dslime_run',    src: 'dslime_run',    nums: range(1, 12) },
      { key: 'dslime_attack', src: 'dslime_attack', nums: range(1, 15) },
      { key: 'dslime_dead',   src: 'dslime_dead',   nums: range(1, 22), fr: 12, rep: 0 },
    ],
  },
};

// Map a boss textureBase to its family key. (They're the same string today, but
// this keeps the lookup explicit.)
export function bossFamilyForTextureBase(textureBase) {
  return BOSS_FAMILIES[textureBase] ? textureBase : null;
}

// True if every image + anim for this family is already present.
export function bossAssetsReady(scene, family) {
  const fam = BOSS_FAMILIES[family];
  if (!fam) return true; // nothing to load (unknown/legacy base)
  for (const a of fam.anims) if (!scene.anims.exists(a.key)) return false;
  for (const l of fam.loads) if (!scene.textures.exists(l.key)) return false;
  return true;
}

// Queue this family's image loads onto the scene loader. Returns the number of
// NEW files queued (0 if everything is already cached). Caller starts the load.
export function queueBossLoads(scene, family) {
  const fam = BOSS_FAMILIES[family];
  if (!fam) return 0;
  let queued = 0;
  for (const { key, url } of fam.loads) {
    if (!scene.textures.exists(key)) { scene.load.image(key, url); queued++; }
  }
  return queued;
}

// Define this family's animations (idempotent). Call only after the textures
// for it have finished loading.
export function defineBossAnims(scene, family) {
  const fam = BOSS_FAMILIES[family];
  if (!fam) return;
  for (const a of fam.anims) {
    if (scene.anims.exists(a.key)) continue;
    scene.anims.create({
      key: a.key,
      frames: a.nums.map(n => ({ key: `${a.src}_${pad(n)}` })),
      frameRate: a.fr ?? 10,
      repeat: a.rep ?? -1,
    });
  }
}
