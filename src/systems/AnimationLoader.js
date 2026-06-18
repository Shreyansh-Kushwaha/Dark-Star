// AnimationLoader — generic, data-driven animation loader.
//
// Idea2 "Tier 2/3": instead of per-entity code, animation wiring lives in data.
// This module owns the generic load/define logic that used to sit in
// src/data/bossAssets.js, and merges two data sources into one family registry:
//
//   1. BOSS_FAMILIES (src/data/bossAssets.js) — the exact, hand-tuned legacy
//      boss specs (frame reuse, reversed death frames, single-frame idles…).
//      Kept verbatim so the 6 shipping bosses behave byte-identically.
//   2. docs/animations.json (served at /api/animations) — entities APPROVED in
//      animation_reviewer.html. Both frame_folder and spritesheet animations are
//      converted into the { loads, anims } family shape. NEW entities need no
//      code — just data.
//
// A "family" is { loads:[…], anims:[…] } supporting two animation sources:
//   • frame_folder — load is {key,url} (one image per frame); anim is
//     {key,src,nums,fr,rep} whose frame keys are `${src}_${pad(n)}`, letting one
//     state's frames back another (e.g. slime "run" reuses idle).
//   • spritesheet — load is {key,url,frameWidth,frameHeight} (one sheet sliced by
//     Phaser into a grid); anim is {key,sheet,start,end,fr,rep} built from frame
//     indices via generateFrameNumbers.
// All functions are idempotent and scene-scoped, so host and joining client can
// both run them on region entry — co-op safe.

import { BOSS_FAMILIES } from '../data/bossAssets.js';

const pad = n => String(n).padStart(2, '0');

// Merged registry. Legacy boss families are seeded first and never overwritten.
const FAMILIES = { ...BOSS_FAMILIES };

// entity_key -> entity_type ('boss'|'enemy'|'npc'|…) for merged JSON entities.
// Lets callers (e.g. creature spawning) pick stats without re-reading the JSON.
const ENTITY_TYPES = {};

// Convert one approved animations.json pack into a { loads, anims } family.
// Handles both frame_folder animations (embedded ordered `frames` list) and
// spritesheet animations (sliced by Phaser using `frame_size`). Exported for
// unit testing.
export function familyFromPack(pack) {
  const loadMap = new Map();   // key -> load (dedupes a sheet shared by many rows)
  const anims = [];
  const addLoad = l => { if (!loadMap.has(l.key)) loadMap.set(l.key, l); };
  for (const a of pack.animations || []) {
    const key = `${pack.entity_key}_${a.name}`;
    if (a.source === 'spritesheet') {
      const [fw, fh] = a.frame_size || [];
      const n = a.frame_count || 0;
      if (!fw || !fh || n < 1 || !a.spritesheet) continue;
      // One texture per sheet FILE (shared across rows of the same grid), so a
      // multi-row sheet (e.g. directional animals) isn't reloaded per row.
      const sheet = `sheet::${a.spritesheet}::${fw}x${fh}`;
      const start = a.frame_start ?? 0;   // first frame index (row offset in a grid)
      addLoad({ key: sheet, url: a.spritesheet, frameWidth: fw, frameHeight: fh });
      anims.push({
        key,
        sheet,
        start,
        end: start + n - 1,
        fr: a.framerate ?? 8,
        rep: a.loop ? -1 : 0,
      });
    } else {
      if (!Array.isArray(a.frames) || !a.frames.length) continue;
      a.frames.forEach((file, i) => {
        addLoad({ key: `${key}_${pad(i + 1)}`, url: a.dir + '/' + file });
      });
      anims.push({
        key,
        src: key,
        nums: a.frames.map((_, i) => i + 1),
        fr: a.framerate ?? 8,
        rep: a.loop ? -1 : 0,
      });
    }
  }
  const loads = [...loadMap.values()];
  return (loads.length || anims.length) ? { loads, anims } : null;
}

// Merge approved entities from an animations.json object. Legacy boss families
// (and anything already registered) take precedence — never clobbered.
export function mergeAnimationPacks(json) {
  let added = 0;
  for (const pack of json?.packs || []) {
    if (!pack.entity_key || FAMILIES[pack.entity_key]) continue;
    const fam = familyFromPack(pack);
    if (fam) {
      FAMILIES[pack.entity_key] = fam;
      if (pack.entity_type) ENTITY_TYPES[pack.entity_key] = pack.entity_type;
      added++;
    }
  }
  return added;
}

// Fetch + merge approved definitions once at boot. Best-effort: any failure
// leaves the legacy boss families fully intact, so the game never depends on it.
// Returns a cached promise so later callers (e.g. creature spawning) can await
// the same in-flight load instead of racing it.
let _loadPromise = null;
export function loadAnimationsJSON() {
  if (!_loadPromise) {
    _loadPromise = (async () => {
      try {
        const res = await fetch('/api/animations');
        if (res.ok) mergeAnimationPacks(await res.json());
      } catch { /* keep legacy families */ }
    })();
  }
  return _loadPromise;
}

// ── Generic per-scene API (logic identical to the old bossAssets.js helpers) ──

// Map an entity key (boss textureBase or approved entity_key) to a known family.
export function familyForKey(key) {
  return FAMILIES[key] ? key : null;
}

// The image loads for a family ([] if unknown) — used by the scene's dedicated loader.
export function familyLoads(key) {
  return FAMILIES[key]?.loads || [];
}

// The animation keys defined for a family ([] if unknown). Lets a caller pick
// which state to play (e.g. prefer the idle/walk anim) without knowing its specs.
export function familyAnimKeys(key) {
  return (FAMILIES[key]?.anims || []).map(a => a.key);
}

// The entity_type for a merged JSON entity (undefined for legacy bosses / unknown).
export function entityType(key) {
  return ENTITY_TYPES[key];
}

// True if every image + anim for this family is already present.
export function assetsReady(scene, key) {
  const fam = FAMILIES[key];
  if (!fam) return true; // nothing to load (unknown/legacy base)
  for (const a of fam.anims) if (!scene.anims.exists(a.key)) return false;
  for (const l of fam.loads) if (!scene.textures.exists(l.key)) return false;
  return true;
}

// Queue this family's image loads onto the scene loader. Returns the number of
// NEW files queued (0 if everything is already cached). Caller starts the load.
export function queueLoads(scene, key) {
  const fam = FAMILIES[key];
  if (!fam) return 0;
  let queued = 0;
  for (const l of fam.loads) {
    if (scene.textures.exists(l.key)) continue;
    if (l.frameWidth) {
      scene.load.spritesheet(l.key, l.url, { frameWidth: l.frameWidth, frameHeight: l.frameHeight });
    } else {
      scene.load.image(l.key, l.url);
    }
    queued++;
  }
  return queued;
}

// Define this family's animations (idempotent). Call only after its textures
// have finished loading.
export function defineAnims(scene, key) {
  const fam = FAMILIES[key];
  if (!fam) return;
  for (const a of fam.anims) {
    if (scene.anims.exists(a.key)) continue;
    const frames = a.sheet
      ? scene.anims.generateFrameNumbers(a.sheet, { start: a.start, end: a.end })
      : a.nums.map(n => ({ key: `${a.src}_${pad(n)}` }));
    scene.anims.create({
      key: a.key,
      frames,
      frameRate: a.fr ?? 10,
      repeat: a.rep ?? -1,
    });
  }
}
