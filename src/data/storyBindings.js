// Reconnects the hand-authored story script (NPC_DIALOGUE / QUESTS /
// LORE_FRAGMENTS in quests.js) to the shipped 44-region map-editor world.
// The script was written against the legacy 7-region layout (regions 1-6),
// which no portal in the editor world ever reaches — so the story characters,
// main-quest starts, world fragments and ambient echoes are bound here to the
// regions that actually exist.

// map-NPC id (region JSON `npcs[].id`) → story character id (NPC_DIALOGUE key).
// Bound NPCs speak the full quest-aware script instead of their one map line.
export const STORY_NPC_BINDINGS = {
  npc0_elder:   'elder_mahesh',        // Ash Village — story opener
  npc0_warrior: 'village_warrior',     // Ash Village — combat tutorial (Arjun)
  npc12_1:      'gramavana_villager',  // Withered Fields — Rukmini
  npc12_2:      'village_child',       // Withered Fields — Kavi
  npc14_1:      'village_healer',      // Stone Gate — Devi
  npc13_1:      'mahavana_hermit',     // Hunter's Thicket — Veda (vanaraksha)
  npc13_2:      'forest_scholar',      // Hunter's Thicket — Priya
  npc15_1:      'lost_merchant',       // Sunken Road — Gopal
  npc42_1:      'vrindavana_sage',     // Root Hollows — Ananta
  npc16_2:      'vrindavana_dancer',   // Ferry Village — Ishani
  npc18_1:      'naga_oracle',         // Serpent Marsh — before Serpent Court
  npc_m_1781188398131_fvu: 'naga_merchant', // Serpent Court
  npc23_1:      'temple_priest',       // Temple of Gods — Vamadeva
  npc23_2:      'deva_guardian',       // Temple of Gods
  npc29_1:      'apsara_guide',        // Heaven's Edge
  npc27_1:      'deva_warrior',        // The Eyrie
  npc41_1:      'akhand_voice',        // Silent Shrine — Voice in the Void
};

// regionIndex → main quest auto-started on entry. The old table assumed the
// quest lived at region 0-6; these are the regions where each boss actually
// spawns (plus the approach region so the quest reads as a goal, not a recap).
export const MAIN_QUEST_BY_REGION = {
  12: 'mahavana_main',    13: 'mahavana_main',
  18: 'nagapatal_main',    8: 'nagapatal_main',
  23: 'devamandira_main',  9: 'devamandira_main',
  29: 'swargaseema_main', 30: 'swargaseema_main',
  36: 'vrindavana_main',  37: 'vrindavana_main',
  33: 'viyogadurga_main', 38: 'viyogadurga_main',
  10: 'viyogadurga_main', 40: 'viyogadurga_main', 41: 'viyogadurga_main',
};

// regionIndex → world lore-fragment pickups relocated from the unreachable
// legacy regions. Positions sit on the walkable band the regions' NPCs use.
export const STORY_FRAGMENTS = {
  13: [{ fragmentId: 'lore_mahavana_roots',     x: 760, y: 1010 }],
  42: [{ fragmentId: 'lore_grove_mural',        x: 700, y: 1090 }],
  46: [{ fragmentId: 'lore_drowned_reliquary',  x: 720, y: 1060 }],
  23: [{ fragmentId: 'lore_vault_mural',        x: 760, y: 1050 }],
  29: [{ fragmentId: 'lore_cloud_inscription',  x: 700, y: 1040 }],
  38: [{ fragmentId: 'lore_prison_stone',       x: 720, y: 1070 }],
};

// regionIndex → ambient echo lines (one-shot proximity whispers). The editor
// world shipped with zero of these — _regionDescriptor hard-coded [].
export const STORY_ECHOES = {
  0:  [{ id: 'echo_ash_village', x: 1100, y: 1000, r: 280,
         text: '⟨Echo⟩ The village shrine has six pedestals. Only five are carved. The sixth is worn smooth — not by weather, by hands.' }],
  7:  [{ id: 'echo_memory_grove', x: 1300, y: 1000, r: 300,
         text: '⟨Echo⟩ The grove hums a hymn with a missing note. The trees lean toward a clearing where nothing stands anymore.' }],
  11: [{ id: 'echo_broken_bridge', x: 1400, y: 1050, r: 300,
         text: '⟨Echo⟩ Pilgrims once crossed here toward a temple no map remembers. The road still knows the way.' }],
  16: [{ id: 'echo_ferry_village', x: 1300, y: 1050, r: 300,
         text: '⟨Echo⟩ A ferryman\'s song, half-forgotten: "…six oars pulled the first boat, and one was thrown to the deep…"' }],
  19: [{ id: 'echo_ash_flats', x: 1200, y: 1000, r: 300,
         text: '⟨Echo⟩ Ash falls where the temples burned their own records. Some pages refused to burn. They are still out there.' }],
  21: [{ id: 'echo_glass_desert', x: 1300, y: 1000, r: 320,
         text: '⟨Echo⟩ The sand fused to glass in a single instant. Whatever the gods erased here, they erased it with fire.' }],
  26: [{ id: 'echo_wind_cliffs', x: 1200, y: 1000, r: 300,
         text: '⟨Echo⟩ The wind carries a name up the cliffs and loses it before the summit. It has been trying for a thousand years.' }],
  32: [{ id: 'echo_gem_hollows', x: 1300, y: 1050, r: 300,
         text: '⟨Echo⟩ The crystals grow in pairs down here, always touching. Miners say they refuse to grow alone.' }],
  34: [{ id: 'echo_forgotten_well', x: 1250, y: 1000, r: 300,
         text: '⟨Echo⟩ Coins in the well, older than any temple. Each one stamped with six figures. Someone has been fishing them out.' }],
  36: [{ id: 'echo_the_between', x: 1300, y: 1000, r: 320,
         text: '⟨Echo⟩ This is where the thread was cut. The land on either side has been drifting apart ever since, an inch a year.' }],
  39: [{ id: 'echo_sixth_gate', x: 1200, y: 1000, r: 320,
         text: '⟨Echo⟩ The gate does not ask for a key. It asks whether you believed the story they told you. Answer with what you have gathered.' }],
  40: [{ id: 'echo_soul_sanctum', x: 1250, y: 1000, r: 300,
         text: '⟨Echo⟩ Here the erased god waited, not in anger. In hope. A thousand years of hope wears a shape into stone.' }],
  48: [{ id: 'echo_threshold', x: 1200, y: 1000, r: 320,
         text: '⟨Echo⟩ Every name they buried is carved here, in the old script. One name repeats, over and over: Ekatmadeva. Ekatmadeva.' }],
  49: [{ id: 'echo_first_loom', x: 1300, y: 1000, r: 340,
         text: '⟨Echo⟩ This is where the first thread was spun. It remembers every hand that ever held it. It is waiting to be held again.' }],
};
