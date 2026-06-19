// Prop classification for top-down depth-sorting and collision.
//
// Every map-editor sprite is classified into one "kind" that drives BOTH how it
// is depth-sorted against actors AND whether it blocks movement:
//
//   'solid'  → Y-sorts by its ground base (player goes behind the top, in front
//              of the base) AND gets a small footprint collider at its base.
//              Trees, pillars, rocks, statues, crates, braziers…
//   'decor'  → Y-sorts by its base so actors can stand behind it, but you can
//              walk through it. Bushes, reeds, shrubs, loose crystals/bones…
//   'ground' → always drawn under actors and never blocks. Flat ground dressing:
//              grass, flowers, lily pads, shadows, dirt, pebbles…
//
// Matching is by the sprite's `name` first (most specific), then its `dir`.
// Unknown props default to 'decor' — they sort correctly (fixing "the character
// walks on top of it") but never silently wall off a path. Make something block
// by adding it to the solid rules below or drawing a noWalkZone in the editor.

import { PROP_FOOTPRINTS } from './propFootprints.js';

// name-based rules, evaluated in order (first match wins)
const NAME_RULES = [
  [/grass|flower|lily[_ ]?pad|shadow|pebble|puddle|\bdirt\b|footprint|decal/i, 'ground'],
  [/tree|pillar|column|\brock|basalt|boulder|\bstone|gold[_ ]?stone|\bware\b|crate|\bbox\b|barrel|brazier|statue|cypress|cactus/i, 'solid'],
  [/bush|reed|shrub|grass_tuft|fern|vine/i, 'decor'],
];

// dir-based fallback when the name is empty/ambiguous.
// NOTE: deliberately omits ambiguous dirs like "structures" (bridges/floors you
// walk on vs. walls) — those stay walk-through and use hand-drawn noWalkZones.
const DIR_RULES = [
  [/grass|flower|shadow|decal/i, 'ground'],
  [/rocks?_|\/rocks\b|\/trees?\b|gold stones/i, 'solid'],
  [/cropped|bush/i, 'decor'],
];

function matchRules(rules, str) {
  if (!str) return null;
  for (const [re, kind] of rules) if (re.test(str)) return kind;
  return null;
}

// Classify a placed sprite descriptor → 'solid' | 'decor' | 'ground'.
export function classifyProp(sp) {
  return (
    matchRules(NAME_RULES, sp.name) ||
    matchRules(DIR_RULES, sp.dir) ||
    'decor'
  );
}

// Image-alpha footprint for a placed sprite, in SOURCE-IMAGE pixel space
// ({ cx, cy, w, h }), or null to fall back to an auto-sized box. Keyed by the
// sprite's `dir + '/' + frame` (see src/data/propFootprints.js). Trees resolve
// to a narrow box at the trunk base; rocks to a box covering most of the body.
export function propFootprint(sp) {
  if (!sp?.dir || !sp.frames?.[0]) return null;
  return PROP_FOOTPRINTS[sp.dir + '/' + sp.frames[0]] || null;
}
