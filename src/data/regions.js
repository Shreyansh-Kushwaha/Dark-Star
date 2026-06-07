import { WORLD_W, WORLD_H } from '../constants.js';

const CX = WORLD_W / 2;
const CY = WORLD_H / 2;

export const REGIONS = [
  // 0 — Gramavana  (green)
  {
    index: 0,
    name: 'Gramavana',
    subtitle: 'The Forest Village',
    bgColor:     0x4a7c3f,
    bgColor2:    0x3d6a33,
    borderColor: 0x1e3d18,
    difficulty: 0.4,           // tutorial difficulty — very easy
    bossKey: null,
    spawnPos: { x: 380, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },

    // Village zone: x 160–860, y 500–1500
    // Forest / tutorial zone: x 900+
    villageZone: { x: 160, y: 500, w: 700, h: 1000 },

    // Five villagers clustered in the village
    npcPositions: [
      { x: 460, y: 900,  id: 'elder_mahesh',       type: 'yellow' },
      { x: 340, y: 780,  id: 'gramavana_villager',  type: 'blue'   },
      { x: 600, y: 780,  id: 'village_warrior',     type: 'yellow' },
      { x: 340, y: 1150, id: 'village_child',       type: 'blue'   },
      { x: 620, y: 1150, id: 'village_healer',      type: 'blue'   },
    ],

    // Spawners deep in the forest — well away from the village
    spawnerPositions: [
      { x: 1200, y: 700  },
      { x: 1600, y: 1350 },
      { x: 2200, y: 850  },
      { x: 2500, y: 1300 },
    ],

    platePositions: [
      { x: 1900, y: 850  },
      { x: 1900, y: 1150 },
    ],

    enemyTypes: ['melee'],
    ambientKey: 0,
  },

  // 1 — Mahāvana  (deep green, half-village half-dense-forest)
  {
    index: 1,
    name: 'Mahāvana',
    subtitle: 'The Great Forest',
    bgColor:     0x2e5c1e,
    bgColor2:    0x244d16,
    borderColor: 0x122610,
    difficulty: 0.5,
    bossKey: null,
    spawnPos: { x: 380, y: CY },
    bossPos:  null,
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },

    villageZone: { x: 120, y: 500, w: 780, h: 1000 },
    villageStyle: 'hermit',

    npcPositions: [
      { x: 520, y: 900,  id: 'mahavana_hermit',  type: 'blue'   },
      { x: 360, y: 780,  id: 'forest_scholar',   type: 'yellow' },
      { x: 640, y: 1100, id: 'lost_merchant',    type: 'blue'   },
    ],

    enemySpawnMode: 'fixed',
    fixedEnemies: [
      { x: 1500, y: 750,  type: 'melee' },
      { x: 1850, y: 1300, type: 'melee' },
      { x: 2150, y: 680,  type: 'melee' },
      { x: 2220, y: 720,  type: 'melee' },
      { x: 2190, y: 800,  type: 'melee' },
      { x: 2650, y: 1150, type: 'melee' },
    ],

    spawnerPositions: [],
    platePositions: [],
    enemyTypes: ['melee'],
    portalUnlock: 'npc_talk:mahavana_hermit',
    denseForest: true,
    ambientKey: 1,
  },

  // 2 — Vrindavana  (bright green, full forest, kill-all unlock)
  {
    index: 2,
    name: 'Vrindavana',
    subtitle: 'The Sacred Grove',
    bgColor:     0x5a8c3a,
    bgColor2:    0x4a7a2e,
    borderColor: 0x2a4a1a,
    difficulty: 1.4,
    bossKey: null,
    spawnPos: { x: 380, y: CY },
    bossPos:  null,
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },

    npcPositions: [
      { x: 560, y: 900,  id: 'vrindavana_sage',    type: 'blue'   },
      { x: 720, y: 1250, id: 'vrindavana_dancer',  type: 'yellow' },
    ],

    enemySpawnMode: 'fixed',
    fixedEnemies: [
      { x: 900,  y: 650,  type: 'melee'  },
      { x: 1100, y: 1380, type: 'ranged' },
      { x: 1350, y: 820,  type: 'melee'  },
      { x: 1600, y: 700,  type: 'ranged' },
      { x: 1680, y: 760,  type: 'ranged' },
      { x: 1640, y: 820,  type: 'ranged' },
      { x: 1900, y: 1300, type: 'melee'  },
      { x: 2100, y: 950,  type: 'elite'  },
      { x: 2350, y: 700,  type: 'melee'  },
      { x: 2420, y: 750,  type: 'melee'  },
      { x: 2390, y: 820,  type: 'melee'  },
      { x: 2650, y: 1200, type: 'ranged' },
      { x: 2800, y: 900,  type: 'elite'  },
    ],

    spawnerPositions: [],
    platePositions: [
      { x: 1500, y: 850 },
      { x: 1500, y: 1150 },
    ],
    enemyTypes: ['melee', 'ranged', 'orc'],
    portalUnlock: 'kill_all',
    ambientKey: 2,
  },

  // 3 — Nāga Pātāl  (orange-brown, serpent realm, first boss)
  {
    index: 3,
    name: 'Nāga Pātāl',
    subtitle: 'The Serpent Realm',
    bgColor:     0x8b5a1a,
    bgColor2:    0x7a4c12,
    borderColor: 0x3d2408,
    difficulty: 1.8,
    bossKey: 'nagraj_kaliya',
    spawnPos: { x: 380, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },

    npcPositions: [
      { x: 560, y: 900,  id: 'naga_oracle',   type: 'blue'   },
      { x: 720, y: 1200, id: 'naga_merchant', type: 'yellow' },
    ],

    enemySpawnMode: 'spawner',
    fixedEnemies: [
      { x: 700, y: 820,  type: 'melee'  },
      { x: 700, y: 1180, type: 'flying' },
    ],
    spawnerPositions: [
      { x: 1300, y: 700  },
      { x: 1300, y: 1350 },
      { x: 2000, y: 950  },
    ],
    platePositions: [
      { x: 1700, y: 800  },
      { x: 1700, y: 1200 },
    ],
    enemyTypes: ['orc', 'ranged', 'flying'],
    serpentRealm: true,

    portalUnlock: 'boss_kill',
    waterAmbient: true,
    ambientKey: 3,
  },

  // 4 — Deva Mandira  (warm golden amber, temple stone)
  {
    index: 4,
    name: 'Deva Mandira',
    subtitle: 'Temple of the Gods',
    bgColor:     0xc47a28,
    bgColor2:    0xaa6820,
    borderColor: 0x5c3410,
    difficulty: 2.3,
    bossKey: 'pashana_daitya',
    spawnPos: { x: 400, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },
    spawnerPositions: [
      { x: 900,  y: 700 },
      { x: 1500, y: CY },
      { x: 2100, y: 1300 },
    ],
    npcPositions: [
      { x: 600, y: 900,  id: 'temple_priest', type: 'blue' },
      { x: 700, y: 1200, id: 'deva_guardian', type: 'yellow' },
    ],
    platePositions: [
      { x: 1500, y: 800 },
      { x: 1500, y: 1200 },
    ],
    enemyTypes: ['orc', 'elite', 'flying'],
    ambientKey: 4,
  },

  // 5 — Swarga Seema  (pale sky blue, heavenly)
  {
    index: 5,
    name: 'Swarga Seema',
    subtitle: 'Edge of Heaven',
    bgColor:     0x8ab4d4,
    bgColor2:    0x7aa0c0,
    borderColor: 0x3a5a7a,
    difficulty: 2.8,
    bossKey: 'vayu_rakshasa',
    spawnPos: { x: 400, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },
    spawnerPositions: [
      { x: 900,  y: 700 },
      { x: 1500, y: 1300 },
      { x: 2100, y: CY },
    ],
    npcPositions: [
      { x: 600, y: 900,  id: 'apsara_guide', type: 'blue' },
      { x: 750, y: 1200, id: 'deva_warrior', type: 'yellow' },
    ],
    platePositions: [
      { x: 1600, y: 800 },
      { x: 1600, y: 1200 },
    ],
    enemyTypes: ['ranged', 'elite', 'flying'],
    ambientKey: 5,

  },

  // 6 — Viyoga Durga  (void black-purple)
  {
    index: 6,
    name: 'Viyoga Durga',
    subtitle: 'Fortress of Separation',
    bgColor:     0x12080a,
    bgColor2:    0x1a0e14,
    borderColor: 0x0a0008,
    darkOverlay: true,
    difficulty: 3.5,
    bossKey: 'viyogasur',
    spawnPos: { x: 400, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: null,
    spawnerPositions: [
      { x: 900,  y: 700 },
      { x: 1500, y: CY },
      { x: 2100, y: 1300 },
    ],
    npcPositions: [
      { x: 600, y: 900, id: 'akhand_voice', type: 'blue' },
    ],
    platePositions: [
      { x: 1500, y: 850 },
      { x: 1500, y: 1150 },
    ],
    enemyTypes: ['melee', 'elite', 'flying'],
    ambientKey: 6,

  },
];
