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
//      animation_reviewer.html. Each frame_folder animation is converted into the
//      same { loads, anims } family shape. NEW entities need no code — just data.
//
// A "family" is { loads:[{key,url}], anims:[{key,src,nums,fr,rep}] }; an anim's
// frame keys are `${src}_${pad(n)}`, letting one state's frames back another
// (e.g. slime "run" reuses idle). All functions are idempotent and scene-scoped,
// so host and joining client can both run them on region entry — co-op safe.

import { BOSS_FAMILIES } from '../data/bossAssets.js';

const pad = n => String(n).padStart(2, '0');

// Merged registry. Legacy boss families are seeded first and never overwritten.
const FAMILIES = { ...BOSS_FAMILIES };

// Convert one approved animations.json pack into a { loads, anims } family.
// Only frame_folder animations with an embedded ordered `frames` list become
// runtime families; spritesheet entities are editor-only for now (the image-frame
// loader below can't slice a sheet). Exported for unit testing.
export function familyFromPack(pack) {
  const loads = [];
  const anims = [];
  for (const a of pack.animations || []) {
    if (a.source !== 'frame_folder' || !Array.isArray(a.frames) || !a.frames.length) continue;
    const src = `${pack.entity_key}_${a.name}`;
    a.frames.forEach((file, i) => {
      loads.push({ key: `${src}_${pad(i + 1)}`, url: a.dir + '/' + file });
    });
    anims.push({
      key: src,
      src,
      nums: a.frames.map((_, i) => i + 1),
      fr: a.framerate ?? 8,
      rep: a.loop ? -1 : 0,
    });
  }
  return (loads.length || anims.length) ? { loads, anims } : null;
}

// Merge approved entities from an animations.json object. Legacy boss families
// (and anything already registered) take precedence — never clobbered.
export function mergeAnimationPacks(json) {
  let added = 0;
  for (const pack of json?.packs || []) {
    if (!pack.entity_key || FAMILIES[pack.entity_key]) continue;
    const fam = familyFromPack(pack);
    if (fam) { FAMILIES[pack.entity_key] = fam; added++; }
  }
  return added;
}

// Fetch + merge approved definitions once at boot. Best-effort: any failure
// leaves the legacy boss families fully intact, so the game never depends on it.
let _loaded = false;
export async function loadAnimationsJSON() {
  if (_loaded) return;
  _loaded = true;
  try {
    const res = await fetch('/api/animations');
    if (res.ok) mergeAnimationPacks(await res.json());
  } catch { /* keep legacy families */ }
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
  for (const { key: k, url } of fam.loads) {
    if (!scene.textures.exists(k)) { scene.load.image(k, url); queued++; }
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
    scene.anims.create({
      key: a.key,
      frames: a.nums.map(n => ({ key: `${a.src}_${pad(n)}` })),
      frameRate: a.fr ?? 10,
      repeat: a.rep ?? -1,
    });
  }
}
