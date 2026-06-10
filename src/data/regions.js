import { WORLD_W, WORLD_H } from '../constants.js';

const CX = WORLD_W / 2;
const CY = WORLD_H / 2;

export const REGIONS = [
  // 0 — Gramavana  (green)
  {
    index: 0,
    name: 'Gramavana',
    subtitle: 'The Village of Ash and Memory',
    bgColor:     0x4a7c3f,
    bgColor2:    0x3d6a33,
    borderColor: 0x1e3d18,
    difficulty: 0.4,
    bossKey: null,
    spawnPos: { x: 380, y: CY },
    bossPos:  { x: 2800, y: CY },
    portalBack: { x: 120, y: CY },
    portalNext: { x: WORLD_W - 120, y: CY },

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

    enemyTypes: ['melee', 'rat'],
    echoTriggers: [],
    worldFragments: [
      { fragmentId: 'lore_gramavana_stone', x: 1900, y: 850 },
    ],
    ambientKey: 0,
  },

  // 1 — Mahāvana  (deep green, dense forest)
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
    enemyTypes: ['melee', 'rat'],
    denseForest: true,
    echoTriggers: [
      { id: 'echo_mahavana_voice', x: 1800, y: 950, r: 220,
        text: '⟨Voice in the Trees⟩ "They called me the problem because I refused to become their excuse."' },
    ],
    worldFragments: [
      { fragmentId: 'lore_mahavana_roots', x: 1750, y: 920 },
    ],
    ambientKey: 1,
  },

  // 2 — Vrindavana  (bright green, full forest)
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
    enemyTypes: ['melee', 'ranged', 'orc', 'slimem'],
    echoTriggers: [],
    worldFragments: [
      { fragmentId: 'lore_grove_mural', x: 1800, y: 900 },
    ],
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
    enemyTypes: ['orc', 'ranged', 'flying', 'bat', 'slimem'],
    serpentRealm: true,
    waterAmbient: true,
    echoTriggers: [
      { id: 'echo_nagapatal_prison', x: 1700, y: 1000, r: 200,
        text: '⟨Sealed Prison Echo⟩ "I held the thread together when the heavens began to fear it. I was not rewarded. I was renamed."' },
    ],
    worldFragments: [
      { fragmentId: 'lore_drowned_reliquary', x: 1700, y: 800 },
    ],
    ambientKey: 3,
  },

  // 4 — Deva Mandira  (warm golden amber, temple stone)
  {
    index: 4,
    name: 'Deva Mandira',
    subtitle: 'The Temple of the Gods',
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
    platePositions: [
      { x: 1500, y: 800 },
      { x: 1500, y: 1200 },
    ],
    enemyTypes: ['orc', 'elite', 'flying', 'mimic'],
    echoTriggers: [
      { id: 'echo_devamandira_vault', x: 1500, y: 1000, r: 180,
        text: '⟨Memory Echo⟩ "Ekatmadeva spoke: I asked only for the people to remain whole. Suryadeva replied: Wholeness is power. Power must be governed."' },
    ],
    worldFragments: [
      { fragmentId: 'lore_vault_mural', x: 1500, y: 850 },
    ],
    ambientKey: 4,
  },

  // 5 — Swarga Seema  (pale sky blue, heavenly)
  {
    index: 5,
    name: 'Swarga Seema',
    subtitle: 'The Edge of Heaven',
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
    platePositions: [
      { x: 1600, y: 800 },
      { x: 1600, y: 1200 },
    ],
    enemyTypes: ['ranged', 'elite', 'flying', 'bat'],
    echoTriggers: [
      { id: 'echo_swargaseema_seal', x: 1600, y: 950, r: 200,
        text: '⟨Cloud Seal Inscription⟩ "The higher you climb, the thinner the story becomes. Heaven is not a sanctuary. It is a palace built on omission."' },
    ],
    worldFragments: [
      { fragmentId: 'lore_cloud_inscription', x: 1600, y: 800 },
    ],
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
    platePositions: [
      { x: 1500, y: 850 },
      { x: 1500, y: 1150 },
    ],
    enemyTypes: ['melee', 'elite', 'flying'],
    echoTriggers: [
      { id: 'echo_viyoga_void', x: 1500, y: 1000, r: 240,
        text: '⟨Voice in the Void⟩ "The final prison is not stone. It is belief. You carry the key — you always did."' },
    ],
    worldFragments: [
      { fragmentId: 'lore_prison_stone', x: 1500, y: 1100 },
    ],
    ambientKey: 6,
  },
];
