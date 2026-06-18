// Per-creature combat stats for map-editor creatures (the 🎬 Creatures tab),
// keyed by the animations.json `entity_key`. GameScene._spawnMapCreatures merges
// these over the entity_type default, so any field omitted here falls back.
//
// Fields (all optional per entry):
//   maxHp, speed, attackDmg, attackRange, attackCd (ms), xpValue
//   sizePx  — target on-screen height in px (overrides the ~80px auto-fit so a
//             boss can tower over a rat regardless of source frame size)
//   tint    — Phaser colour int, e.g. 0xff8888
//
// Add a new creature: approve it in the reviewer, find its entity_key in the
// Creatures tab, and drop a row here. No code changes needed beyond this table.

// Baseline by entity_type — used when an entity_key has no explicit row.
export const CREATURE_TYPE_DEFAULTS = {
  boss:  { maxHp: 320, speed: 80,  attackDmg: 30, attackRange: 80, attackCd: 1400, xpValue: 50, sizePx: 120 },
  enemy: { maxHp: 90,  speed: 110, attackDmg: 16, attackRange: 60, attackCd: 1200, xpValue: 14, sizePx: 80 },
  npc:   { maxHp: 60,  speed: 95,  attackDmg: 8,  attackRange: 55, attackCd: 1300, xpValue: 8,  sizePx: 80 },
};

// Curated per-creature overrides. Only the fields that differ from the type
// default need to be listed.
export const CREATURE_STATS = {
  // ── Bosses ────────────────────────────────────────────────────────────────
  boss_demon_slime:       { maxHp: 400, speed: 70, attackDmg: 35, attackRange: 90, xpValue: 70, sizePx: 150 },
  frost_guardian:         { maxHp: 380, speed: 75, attackDmg: 32, xpValue: 65, sizePx: 140 },
  enemy_4_giant_goblin:   { maxHp: 460, speed: 65, attackDmg: 40, attackRange: 95, xpValue: 80, sizePx: 170 },
  enemy_4_caveman_boss:   { maxHp: 420, speed: 70, attackDmg: 36, xpValue: 75, sizePx: 160 },
  enemy_4_viking_leader:  { maxHp: 430, speed: 72, attackDmg: 38, xpValue: 75, sizePx: 160 },
  the_monsters_king_slime:{ maxHp: 300, speed: 60, attackDmg: 26, xpValue: 55, sizePx: 130 },
  minotaur_minotaur_1:    { maxHp: 350, speed: 85, attackDmg: 30, xpValue: 60, sizePx: 130 },
  minotaur_minotaur_2:    { maxHp: 360, speed: 85, attackDmg: 31, xpValue: 60, sizePx: 130 },
  minotaur_minotaur_3:    { maxHp: 370, speed: 85, attackDmg: 32, xpValue: 62, sizePx: 130 },
  mino_enemy:             { maxHp: 200, speed: 95, attackDmg: 24, xpValue: 35, sizePx: 110 }, // boss art, mid enemy

  // ── Enemies ───────────────────────────────────────────────────────────────
  slime1:                 { maxHp: 40,  speed: 70,  attackDmg: 8,  attackRange: 45, xpValue: 6,  sizePx: 60 },
  slime2:                 { maxHp: 45,  speed: 72,  attackDmg: 9,  attackRange: 45, xpValue: 7,  sizePx: 62 },
  slime3:                 { maxHp: 50,  speed: 74,  attackDmg: 10, attackRange: 45, xpValue: 8,  sizePx: 64 },
  monsters_slime:         { maxHp: 60,  speed: 80,  attackDmg: 11, xpValue: 10, sizePx: 70 },
  monsters_rat:           { maxHp: 35,  speed: 160, attackDmg: 9,  attackRange: 50, attackCd: 900, xpValue: 9, sizePx: 55 },
  monsters_bat:           { maxHp: 40,  speed: 150, attackDmg: 10, attackRange: 55, attackCd: 1000, xpValue: 11, sizePx: 58 },
  monsters_mimic:         { maxHp: 130, speed: 70,  attackDmg: 22, attackRange: 65, xpValue: 22, sizePx: 80 },
  enemy_skeleton:         { maxHp: 70,  speed: 100, attackDmg: 14, xpValue: 13, sizePx: 78 },
  enemy_fire_spirit:      { maxHp: 55,  speed: 120, attackDmg: 16, attackRange: 70, xpValue: 14, sizePx: 72, tint: 0xff9955 },
  enemy_plent:            { maxHp: 110, speed: 60,  attackDmg: 15, xpValue: 15, sizePx: 85 },
  craftpix_064112_orc_ogre_and_goblin_chibi_orc:    { maxHp: 110, speed: 100, attackDmg: 20, xpValue: 18, sizePx: 80 },
  craftpix_064112_orc_ogre_and_goblin_chibi_ogre:   { maxHp: 180, speed: 85,  attackDmg: 28, attackRange: 70, xpValue: 26, sizePx: 95 },
  craftpix_064112_orc_ogre_and_goblin_chibi_goblin: { maxHp: 70,  speed: 120, attackDmg: 14, xpValue: 12, sizePx: 70 },
  enemy_2_aztec_leader:   { maxHp: 150, speed: 95, attackDmg: 22, xpValue: 24, sizePx: 90 },
  enemy_2_nordic_leader:  { maxHp: 160, speed: 92, attackDmg: 24, xpValue: 26, sizePx: 90 },
  enemy_2_maya_leader:    { maxHp: 150, speed: 95, attackDmg: 22, xpValue: 24, sizePx: 90 },
  enemy_3_seer_1:         { maxHp: 90,  speed: 100, attackDmg: 18, attackRange: 75, xpValue: 16, sizePx: 80 },
  enemy_3_seer_2:         { maxHp: 95,  speed: 100, attackDmg: 19, attackRange: 75, xpValue: 17, sizePx: 80 },
  enemy_3_seer_3:         { maxHp: 100, speed: 100, attackDmg: 20, attackRange: 75, xpValue: 18, sizePx: 80 },
  the_monsters_orc:       { maxHp: 120, speed: 100, attackDmg: 20, xpValue: 18, sizePx: 80 },
  the_monsters_orc2:      { maxHp: 130, speed: 100, attackDmg: 22, xpValue: 20, sizePx: 80 },
  the_monsters_slime:     { maxHp: 55,  speed: 75,  attackDmg: 10, attackRange: 45, xpValue: 8, sizePx: 65 },
  the_monsters_slime_2:   { maxHp: 60,  speed: 75,  attackDmg: 11, attackRange: 45, xpValue: 9, sizePx: 66 },
  the_monsters_tree:      { maxHp: 160, speed: 40,  attackDmg: 18, xpValue: 18, sizePx: 110 },
};

// Resolve final stats for an entity: type default merged with any per-key override.
export function statsFor(entityKey, entityType) {
  const base = CREATURE_TYPE_DEFAULTS[entityType] || CREATURE_TYPE_DEFAULTS.enemy;
  return { ...base, ...(CREATURE_STATS[entityKey] || {}) };
}
