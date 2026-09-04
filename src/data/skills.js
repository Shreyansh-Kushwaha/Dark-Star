// Per-character skill trees. Points come from levelling (POINTS_PER_LEVEL per
// banked level — the same pool the old flat allocation used). Each character has
// two branches of four nodes; within a branch a node unlocks only after the one
// above it (tier-1) is owned. Node ids are namespaced per character so a shared
// save.skillNodes list can hold both characters' picks; each Player applies only
// the nodes belonging to its own charKey.
//
// mods (all optional, all additive across owned nodes):
//   hpPct       — +% max HP
//   staminaPct  — +% max stamina
//   abilityPct  — +% ability power
//   dmgPct      — +% melee attack damage
//   defensePct  — % incoming damage reduced
//   staRegenPct — +% stamina regen rate
//
// effect (capstones only) — a behavior flag the ability code checks via
// Player._skillEffects (built in applySkills). See AbilityManager:
//   shield_burst — Agni Shield detonates when it expires
//   slam_burn    — Prithvi Slam leaves a burning field
//   dash_shock   — Vayu Dash's wake shocks enemies a beat later
//   mend_wave    — Jal Mend also releases a damaging tide

export const SKILL_TREES = {
  dhruva: {
    name: 'Dhruva',
    branches: [
      { key: 'adamant', name: 'Adamant', color: 0x8fbf6a, nodes: [
        { id: 'dh_ada_1', tier: 0, cost: 2, name: 'Stone Skin',   desc: '+10% Max HP',            mods: { hpPct: 0.10 } },
        { id: 'dh_ada_2', tier: 1, cost: 3, name: 'Iron Guard',   desc: '-12% damage taken',      mods: { defensePct: 0.12 } },
        { id: 'dh_ada_3', tier: 2, cost: 4, name: 'Bulwark',      desc: '+15% Max HP',            mods: { hpPct: 0.15 } },
        { id: 'dh_ada_4', tier: 3, cost: 5, name: 'Unbreakable',  desc: '-15% dmg, +10% Max HP',  mods: { defensePct: 0.15, hpPct: 0.10 } },
        { id: 'dh_ada_5', tier: 4, cost: 6, name: 'Aegis Detonation', desc: 'Agni Shield explodes when it fades', mods: {}, effect: 'shield_burst' },
      ]},
      { key: 'ember', name: 'Emberheart', color: 0xe08040, nodes: [
        { id: 'dh_emb_1', tier: 0, cost: 2, name: 'Kindling',        desc: '+10% Ability Power',   mods: { abilityPct: 0.10 } },
        { id: 'dh_emb_2', tier: 1, cost: 3, name: 'Searing Strikes', desc: '+12% attack damage',   mods: { dmgPct: 0.12 } },
        { id: 'dh_emb_3', tier: 2, cost: 4, name: 'Wildfire',        desc: '+18% attack damage',   mods: { dmgPct: 0.18 } },
        { id: 'dh_emb_4', tier: 3, cost: 5, name: 'Inferno',         desc: '+25% Ability Power',   mods: { abilityPct: 0.25 } },
        { id: 'dh_emb_5', tier: 4, cost: 6, name: 'Scorched Earth',  desc: 'Prithvi Slam leaves a burning field', mods: {}, effect: 'slam_burn' },
      ]},
    ],
  },
  tara: {
    name: 'Tara',
    branches: [
      { key: 'zephyr', name: 'Zephyr', color: 0x7cd0e0, nodes: [
        { id: 'ta_zep_1', tier: 0, cost: 2, name: 'Fleetfoot',    desc: '+12% Max Stamina',     mods: { staminaPct: 0.12 } },
        { id: 'ta_zep_2', tier: 1, cost: 3, name: 'Second Wind',  desc: '+30% stamina regen',   mods: { staRegenPct: 0.30 } },
        { id: 'ta_zep_3', tier: 2, cost: 4, name: 'Gale Force',   desc: '+15% attack damage',   mods: { dmgPct: 0.15 } },
        { id: 'ta_zep_4', tier: 3, cost: 5, name: 'Perfect Flow', desc: '+18% Stam, +30% regen', mods: { staminaPct: 0.18, staRegenPct: 0.30 } },
        { id: 'ta_zep_5', tier: 4, cost: 6, name: 'Storm Wake',   desc: "Vayu Dash's trail shocks enemies", mods: {}, effect: 'dash_shock' },
      ]},
      { key: 'tide', name: 'Tidecaller', color: 0x66aaff, nodes: [
        { id: 'ta_tid_1', tier: 0, cost: 2, name: 'Wellspring',   desc: '+10% Ability Power',   mods: { abilityPct: 0.10 } },
        { id: 'ta_tid_2', tier: 1, cost: 3, name: 'Mending',      desc: '-10% damage taken',    mods: { defensePct: 0.10 } },
        { id: 'ta_tid_3', tier: 2, cost: 4, name: 'Deep Current', desc: '+18% Ability Power',   mods: { abilityPct: 0.18 } },
        { id: 'ta_tid_4', tier: 3, cost: 5, name: 'Monsoon',      desc: '+25% Ability Power',   mods: { abilityPct: 0.25 } },
        { id: 'ta_tid_5', tier: 4, cost: 6, name: 'Cleansing Tide', desc: 'Jal Mend also damages nearby foes', mods: {}, effect: 'mend_wave' },
      ]},
    ],
  },
};

// Flat list of every node for a character (or [] if unknown).
export function nodesFor(charKey) {
  const tree = SKILL_TREES[charKey];
  if (!tree) return [];
  return tree.branches.flatMap(b => b.nodes);
}

// Look up a single node across all characters.
export function nodeById(id) {
  for (const char of Object.keys(SKILL_TREES)) {
    const n = nodesFor(char).find(x => x.id === id);
    if (n) return n;
  }
  return null;
}
