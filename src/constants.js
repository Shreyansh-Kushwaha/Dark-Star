export const WORLD_W = 3200;
export const WORLD_H = 2000;
export const GAME_W  = 1280;
export const GAME_H  = 720;

export const PLAYER_SPEED   = 200;
export const ENEMY_SPEED    = 110;
export const FLYING_SPEED   = 135;
export const ELITE_SPEED    = 95;

export const LIGHT_DMG      = 20;
export const HEAVY_DMG      = 45;
export const ATTACK_RANGE   = 175;
export const ATTACK_ARC     = 130; // degrees
export const LIGHT_CD       = 500;
export const HEAVY_CD       = 1200;
export const DODGE_CD       = 1000;
export const DODGE_STAMINA  = 25;
export const DODGE_DURATION = 300; // ms

export const PERFECT_DODGE_WINDOW = 200;
export const PERFECT_DODGE_SLOWMO = 0.25;
export const PERFECT_DODGE_DURATION = 500;

export const SPAWNER_INTERVAL = 25000; // ms
export const BOSS_TRIGGER_DIST = 300;
export const TETHER_DIST = 360;
export const TETHER_SPEED = 80;

export const NET_HZ = 8;
export const NET_INTERVAL = 1000 / NET_HZ;

export const REGION_NAMES = [
  'Gramavana — The Forest Village',
  'Mahāvana — The Great Forest',
  'Vrindavana — The Sacred Grove',
  'Nāga Pātāl — The Serpent Realm',
  'Deva Mandira — Temple of the Gods',
  'Swarga Seema — Edge of Heaven',
  'Viyoga Durga — Fortress of Separation',
];

// Tiny Swords spritesheet frame sizes
export const WARRIOR_FRAME = 192;
export const LANCER_FRAME  = 320;

// THE PACK frame sizes
export const PACK_FRAME_W = 100;
export const PACK_FRAME_H = 120;

// XP thresholds per level (index = current level, value = XP needed to reach next)
export const XP_THRESHOLDS = [100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, Infinity];

// Item definitions — type: 'consumable' | 'passive' | 'token'
// consumable: used from inventory for immediate effect
// passive: auto-applied on pickup (permanent stat boost)
// token: story/lore item with no mechanical effect
export const ITEM_DEFS = {
  forest_totem:    { name: 'Forest Totem',    type: 'consumable', effect: { stat: 'stamina',  amount: 50  }, desc: 'Restores 50 Stamina' },
  jal_tear:        { name: 'Jal Tear',        type: 'consumable', effect: { stat: 'stamina',  amount: 80  }, desc: 'Restores 80 Stamina' },
  prithvi_shard:   { name: 'Prithvi Shard',   type: 'passive',    effect: { stat: 'maxHp',    amount: 20  }, desc: '+20 Max HP (permanent)' },
  agni_ember:      { name: 'Agni Ember',      type: 'passive',    effect: { stat: 'abilityPow', amount: 0.1 }, desc: '+10% Ability Power (permanent)' },
  merchants_coin:  { name: "Merchant's Coin", type: 'token',      effect: null, desc: 'A rare gold coin. Worth a fortune.' },
  ashram_blessing: { name: 'Ashram Blessing', type: 'token',      effect: null, desc: 'A blessing from the hermit’s ashram.' },
  naga_scale:      { name: 'Naga Scale',      type: 'token',      effect: null, desc: 'A scale shed by the serpent king.' },
  temple_offering: { name: 'Temple Offering', type: 'token',      effect: null, desc: 'Sacred offering left at Deva Mandira.' },
  vayu_note:       { name: 'Vayu Note',       type: 'token',      effect: null, desc: 'A fragment of wind-inscribed scripture.' },
  cloud_crystal:   { name: 'Cloud Crystal',   type: 'token',      effect: null, desc: 'A crystallised shard of storm cloud.' },
  akhand_fragment: { name: 'Akhand Fragment', type: 'token',      effect: null, desc: 'A piece of the Akhand Sutra itself.' },
};
