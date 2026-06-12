// Hand-authored node positions for the World Map, on a virtual canvas that the
// WorldMapScene pans/zooms over. The actual edges are read live from each
// region's portals (/api/regions); this file only fixes WHERE each node sits.
//
// Lanes (vertical): the critical-path spine runs along the centre, optional
// spurs sit just above/below it, the Sunless Deep branch runs lower, and the
// secret Erased Path runs lowest. Columns advance left→right with progression.

const COL  = 230;   // horizontal spacing between progression steps
const LANE = 210;   // vertical spacing between lanes
const OX   = 160;   // origin x
const CY   = 560;   // centre (spine) y

const P = (col, lane) => ({ x: OX + col * COL, y: CY + lane * LANE });

// act → element-themed colour used for node borders / edges grouping
export const ACT_COLORS = {
  1: 0x6bbf4a, // Mortal Vale — Prithvi / earth (green)
  2: 0x49a6d6, // Drowned Reach — Jal / water (blue)
  3: 0xe08a3c, // Emberwastes — Agni / fire (orange)
  4: 0x7fd4e0, // Skyward Climb — Vayu / wind (cyan)
  5: 0x9a6cd0, // Sunless Deep — Patala (purple)
  6: 0xc0432f, // The Severance — Void (red)
  7: 0xe8c860, // The Erased Path — Ekatmadeva (gold, secret)
};

// regionIndex → { ...pos, act, tag }
//   tag: 'start' | 'hub' | 'boss' | 'end' | 'secret' (optional, drives node icon)
export const MAP_LAYOUT = {
  // ── Act I — The Mortal Vale (spine + early spurs) ───────────────────────────
  0:  { ...P(0, 0),    act: 1, tag: 'start' },
  7:  { ...P(1, 0),    act: 1 },
  11: { ...P(2, 0),    act: 1, tag: 'hub' },
  12: { ...P(1.6, -1), act: 1 },
  13: { ...P(2.4, 1),  act: 1 },
  14: { ...P(3, 0),    act: 1 },

  // ── Act II — The Drowned Reach ─────────────────────────────────────────────
  15: { ...P(4, 0),    act: 2 },
  16: { ...P(5, 0),    act: 2, tag: 'hub' },
  9:  { ...P(5, -1),   act: 2 },
  17: { ...P(5, 1),    act: 2 },
  18: { ...P(6, 0),    act: 2 },
  8:  { ...P(7, 0),    act: 2, tag: 'boss' },

  // ── Act III — The Emberwastes ──────────────────────────────────────────────
  19: { ...P(8, 0),    act: 3 },
  20: { ...P(9, 0),    act: 3, tag: 'hub' },
  21: { ...P(9, 1),    act: 3 },
  22: { ...P(10, 0),   act: 3 },
  23: { ...P(11, 0),   act: 3 },
  24: { ...P(12, 0),   act: 3, tag: 'boss' },

  // ── Act IV — The Skyward Climb ─────────────────────────────────────────────
  25: { ...P(13, 0),   act: 4 },
  26: { ...P(14, 0),   act: 4 },
  27: { ...P(15, 0),   act: 4, tag: 'hub' },
  28: { ...P(15, -1),  act: 4 },
  29: { ...P(16, 0),   act: 4 },
  30: { ...P(17, 0),   act: 4, tag: 'boss' },

  // ── Act V — The Sunless Deep (lower branch off Setubandha) ──────────────────
  31: { ...P(3.5, 2),  act: 5 },
  32: { ...P(6, 2),    act: 5 },
  10: { ...P(8.5, 2),  act: 5 },
  33: { ...P(11, 2),   act: 5 },
  34: { ...P(13.5, 2), act: 5 },

  // ── Act VI — The Severance (finale spine) ──────────────────────────────────
  35: { ...P(18, 0),   act: 6 },
  36: { ...P(19, 0),   act: 6 },
  37: { ...P(20, 0),   act: 6, tag: 'boss' },
  38: { ...P(21, 0),   act: 6, tag: 'end' },

  // ── The Erased Path (secret, lowest lane) ──────────────────────────────────
  39: { ...P(14.5, 3), act: 7, tag: 'secret' },
  40: { ...P(16, 3),   act: 7, tag: 'secret' },
  41: { ...P(17.5, 3), act: 7, tag: 'secret' },
};

// Fallback grid position for any region not in MAP_LAYOUT (keeps the map robust
// if new regions are added before this table is updated).
export function fallbackPos(index, ordinal) {
  return { x: OX + (ordinal % 8) * COL, y: CY + 4 * LANE + Math.floor(ordinal / 8) * LANE, act: 1 };
}
