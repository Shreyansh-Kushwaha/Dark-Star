// Per-creature combat stats for map-editor creatures (the 🎬 Creatures tab),
// keyed by the animations.json `entity_key`. GameScene._spawnMapCreatures merges
// these over the entity_type default, so any field omitted here falls back.
//
// Fields (all optional per entry):
//   maxHp, speed, attackDmg, attackRange, attackCd (ms), xpValue
//   sizePx  — target on-screen height in px (overrides the ~80px auto-fit so a
//             boss can tower over a rat regardless of source frame size)
//   tint    — Phaser colour int, e.g. 0xff8888
//   passive — true for wildlife: never attacks the player; wanders calmly and
//             bolts (flees) when the player gets close or hits it. Still huntable.
//
// ── Balance anchor ──────────────────────────────────────────────────────────
// Values are tuned against the shipping, already-balanced ENEMY_TYPES roster and
// the player's real output (200 HP; light 20 dmg/500ms ≈ 40 DPS; heavy 45/1200).
// Reference tiers (HP / dmg / attackCd / DPS / time-to-kill at 40 player DPS):
//   T0 vermin  30  /  8 /  850 /  ~9  / 0.8s   (rat)
//   T1 flyer   45  / 11 /  950 / ~12  / 1.1s   (bat)
//   T2 grunt   75  / 14 / 1300 / ~11  / 1.9s   (melee, slimem)
//   T3 bruiser 130 / 22 / 1300 / ~17  / 3.3s   (orc)
//   T4 elite   190 / 28 / 1500 / ~19  / 4.7s   (ogre, mimic)
//   T5 mini    320 / 32 / 1500 / ~21  / 8.0s
//   T6 boss    450 / 38 / 1600 / ~24  / 11.3s
// Each creature below is snapped to the nearest tier (slimes slower, vermin
// faster, trees stationary). Re-tune to taste after playtesting — these are
// roster-anchored starting points, not live-observed values.

// Baseline by entity_type — used when an entity_key has no explicit row.
export const CREATURE_TYPE_DEFAULTS = {
  boss:  { maxHp: 380, speed: 72, attackDmg: 34, attackRange: 85, attackCd: 1550, xpValue: 60, sizePx: 130 }, // T5/6
  enemy: { maxHp: 80,  speed: 110, attackDmg: 15, attackRange: 60, attackCd: 1300, xpValue: 12, sizePx: 80 }, // T2
  npc:   { maxHp: 60,  speed: 95,  attackDmg: 8,  attackRange: 55, attackCd: 1300, xpValue: 8,  sizePx: 80 },
};

// Curated per-creature overrides. Only the fields that differ from the type
// default need to be listed. Tier shown in the trailing comment.
export const CREATURE_STATS = {
  // ── Bosses (T5 mini-boss / T6 boss) ─────────────────────────────────────────
  enemy_4_giant_goblin:   { maxHp: 450, speed: 65, attackDmg: 38, attackRange: 95, attackCd: 1600, xpValue: 80, sizePx: 170 }, // T6 hardest
  enemy_4_viking_leader:  { maxHp: 410, speed: 72, attackDmg: 36, attackCd: 1550, xpValue: 74, sizePx: 160 }, // T6
  enemy_4_caveman_boss:   { maxHp: 400, speed: 70, attackDmg: 35, attackCd: 1550, xpValue: 72, sizePx: 160 }, // T6
  boss_demon_slime:       { maxHp: 380, speed: 68, attackDmg: 34, attackRange: 90, attackCd: 1500, xpValue: 70, sizePx: 150 }, // T6
  frost_guardian:         { maxHp: 360, speed: 74, attackDmg: 32, attackCd: 1500, xpValue: 66, sizePx: 140, tint: 0x99ddff }, // T5/6
  minotaur_minotaur_3:    { maxHp: 370, speed: 85, attackDmg: 32, attackCd: 1450, xpValue: 62, sizePx: 130 }, // T5
  minotaur_minotaur_2:    { maxHp: 350, speed: 85, attackDmg: 31, attackCd: 1450, xpValue: 60, sizePx: 130 }, // T5
  minotaur_minotaur_1:    { maxHp: 340, speed: 85, attackDmg: 30, attackCd: 1450, xpValue: 58, sizePx: 130 }, // T5
  the_monsters_king_slime:{ maxHp: 300, speed: 58, attackDmg: 28, attackRange: 80, attackCd: 1500, xpValue: 54, sizePx: 130 }, // T5
  mino_enemy:             { maxHp: 200, speed: 92, attackDmg: 26, attackCd: 1450, xpValue: 32, sizePx: 110 }, // T4 (boss art, elite role)

  // ── Elite enemies (T4) ──────────────────────────────────────────────────────
  craftpix_064112_orc_ogre_and_goblin_chibi_ogre: { maxHp: 185, speed: 88, attackDmg: 28, attackRange: 70, attackCd: 1500, xpValue: 28, sizePx: 95 }, // T4
  monsters_mimic:         { maxHp: 160, speed: 80, attackDmg: 26, attackRange: 70, attackCd: 1600, xpValue: 32, sizePx: 80 }, // T4 (mirrors mimic)
  the_monsters_tree:      { maxHp: 180, speed: 38, attackDmg: 18, attackRange: 70, attackCd: 1500, xpValue: 20, sizePx: 110 }, // T4 stationary tank
  enemy_2_nordic_leader:  { maxHp: 170, speed: 92, attackDmg: 26, attackCd: 1350, xpValue: 26, sizePx: 90 }, // T3/4 leader
  enemy_2_aztec_leader:   { maxHp: 160, speed: 95, attackDmg: 24, attackCd: 1350, xpValue: 24, sizePx: 90 }, // T3/4
  enemy_2_maya_leader:    { maxHp: 160, speed: 95, attackDmg: 24, attackCd: 1350, xpValue: 24, sizePx: 90 }, // T3/4

  // ── Bruisers (T3) ───────────────────────────────────────────────────────────
  craftpix_064112_orc_ogre_and_goblin_chibi_orc: { maxHp: 130, speed: 105, attackDmg: 22, attackRange: 65, attackCd: 1300, xpValue: 18, sizePx: 80 }, // T3 (mirrors orc)
  the_monsters_orc2:      { maxHp: 130, speed: 102, attackDmg: 22, attackCd: 1300, xpValue: 20, sizePx: 80 }, // T3
  the_monsters_orc:       { maxHp: 120, speed: 102, attackDmg: 20, attackCd: 1300, xpValue: 18, sizePx: 80 }, // T3
  enemy_plent:            { maxHp: 110, speed: 60,  attackDmg: 18, attackCd: 1400, xpValue: 16, sizePx: 85 }, // T3 slow
  enemy_3_seer_3:         { maxHp: 105, speed: 100, attackDmg: 20, attackRange: 75, attackCd: 1250, xpValue: 18, sizePx: 80 }, // T3
  enemy_3_seer_2:         { maxHp: 100, speed: 100, attackDmg: 19, attackRange: 75, attackCd: 1250, xpValue: 17, sizePx: 80 }, // T3
  enemy_3_seer_1:         { maxHp: 95,  speed: 100, attackDmg: 18, attackRange: 75, attackCd: 1250, xpValue: 16, sizePx: 80 }, // T3

  // ── Grunts (T2) ─────────────────────────────────────────────────────────────
  enemy_skeleton:         { maxHp: 75,  speed: 105, attackDmg: 14, attackCd: 1200, xpValue: 13, sizePx: 78 }, // T2
  monsters_slime:         { maxHp: 70,  speed: 75,  attackDmg: 14, attackRange: 55, attackCd: 1400, xpValue: 10, sizePx: 70 }, // T2 (mirrors slimem)
  craftpix_064112_orc_ogre_and_goblin_chibi_goblin: { maxHp: 70, speed: 120, attackDmg: 14, attackCd: 1100, xpValue: 12, sizePx: 70 }, // T2
  enemy_fire_spirit:      { maxHp: 60,  speed: 120, attackDmg: 16, attackRange: 70, attackCd: 1100, xpValue: 14, sizePx: 72, tint: 0xff9955 }, // T2 aggressive

  // ── Low-tier slimes & vermin (T0/T1) ────────────────────────────────────────
  the_monsters_slime_2:   { maxHp: 60,  speed: 76, attackDmg: 11, attackRange: 48, attackCd: 1350, xpValue: 9, sizePx: 66 }, // T1/2
  the_monsters_slime:     { maxHp: 55,  speed: 75, attackDmg: 10, attackRange: 48, attackCd: 1350, xpValue: 8, sizePx: 65 }, // T1
  slime3:                 { maxHp: 55,  speed: 74, attackDmg: 10, attackRange: 45, attackCd: 1350, xpValue: 8, sizePx: 64 }, // T1
  slime2:                 { maxHp: 45,  speed: 72, attackDmg: 9,  attackRange: 45, attackCd: 1350, xpValue: 7, sizePx: 62 }, // T1
  slime1:                 { maxHp: 38,  speed: 70, attackDmg: 8,  attackRange: 45, attackCd: 1350, xpValue: 6, sizePx: 60 }, // T0/1
  monsters_bat:           { maxHp: 45,  speed: 155, attackDmg: 11, attackRange: 60, attackCd: 950, xpValue: 12, sizePx: 58 }, // T1 (mirrors bat)
  monsters_rat:           { maxHp: 30,  speed: 170, attackDmg: 8,  attackRange: 42, attackCd: 850, xpValue: 7,  sizePx: 55 }, // T0 (mirrors rat)

  // ── Passive wildlife (never attack; flee when approached or hit) ────────────
  // assets6 animal 2 (wild animals)
  boar:         { maxHp: 90, speed: 120, attackDmg: 16, attackRange: 58, attackCd: 1200, xpValue: 16, sizePx: 56 }, // AGGRESSIVE (has attack anim)
  deer:         { maxHp: 50, speed: 155, xpValue: 12, sizePx: 60, passive: true },
  fox:          { maxHp: 40, speed: 165, xpValue: 10, sizePx: 50, passive: true },
  hare:         { maxHp: 25, speed: 195, xpValue: 8,  sizePx: 42, passive: true },
  black_grouse: { maxHp: 30, speed: 140, xpValue: 10, sizePx: 46, passive: true },
  // assets6 animal 1 (farm animals)
  bull:    { maxHp: 130, speed: 95,  xpValue: 16, sizePx: 70, passive: true },
  calf:    { maxHp: 55,  speed: 115, xpValue: 10, sizePx: 52, passive: true },
  sheep:   { maxHp: 60,  speed: 95,  xpValue: 10, sizePx: 58, passive: true },
  lamb:    { maxHp: 35,  speed: 125, xpValue: 8,  sizePx: 46, passive: true },
  piglet:  { maxHp: 35,  speed: 125, xpValue: 8,  sizePx: 46, passive: true },
  rooster: { maxHp: 25,  speed: 135, xpValue: 7,  sizePx: 44, passive: true },
  chick:   { maxHp: 12,  speed: 115, xpValue: 4,  sizePx: 30, passive: true },
  turkey:  { maxHp: 35,  speed: 125, xpValue: 8,  sizePx: 48, passive: true },
};

// Resolve final stats for an entity: type default merged with any per-key override.
export function statsFor(entityKey, entityType) {
  const base = CREATURE_TYPE_DEFAULTS[entityType] || CREATURE_TYPE_DEFAULTS.enemy;
  return { ...base, ...(CREATURE_STATS[entityKey] || {}) };
}
