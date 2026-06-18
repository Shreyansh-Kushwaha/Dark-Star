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

// Optional per-name collider-radius overrides (world px). When absent the circle
// is auto-sized from the sprite's on-screen width. Tune these if a prop blocks
// too much (smaller r) or lets the player clip its trunk (larger r).
const FOOTPRINTS = {
  pillar:  { r: 15 },
  cypress: { r: 11 },
  tree:    { r: 12 },
  rock:    { r: 13 },
  basalt:  { r: 13 },
  crate:   { r: 14 },
  brazier: { r: 12 },
};

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

// Explicit footprint for a prop name, or null to auto-size from the sprite.
export function propFootprint(sp) {
  if (!sp?.name) return null;
  const key = Object.keys(FOOTPRINTS).find(k => sp.name.toLowerCase().includes(k));
  return key ? FOOTPRINTS[key] : null;
}
