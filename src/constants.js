export const WORLD_W = 3200;
export const WORLD_H = 2000;
export const GAME_W  = 1280;
export const GAME_H  = 720;

export const PLAYER_SPEED   = 200;

export const LIGHT_DMG      = 20;
export const HEAVY_DMG      = 45;
export const ATTACK_RANGE   = 175;
export const ATTACK_ARC     = 130; // degrees
export const LIGHT_CD       = 500;
export const HEAVY_CD       = 1200;
export const LIGHT_STAMINA  = 12;  // drained per light attack (> regen/cooldown so spam depletes)
export const HEAVY_STAMINA  = 25;  // drained per heavy attack
export const DODGE_CD       = 1000;
export const DODGE_STAMINA  = 25;
export const DODGE_DURATION = 300; // ms

export const PERFECT_DODGE_WINDOW = 200;
export const PERFECT_DODGE_SLOWMO = 0.25;
export const PERFECT_DODGE_DURATION = 500;

// Amrit — the healing flask (Estus equivalent). Limited charges, refilled at Thread Shrines.
export const AMRIT_MAX_DEFAULT = 4;     // starting charges
export const AMRIT_HEAL_FRAC   = 0.55;  // fraction of max HP restored per sip
export const AMRIT_SIP_LOCKOUT = 550;   // ms you're vulnerable while drinking
export const AMRIT_POTENCY_STEP = 0.06; // extra heal fraction per merchant potency upgrade
export const AMRIT_MAX_CAP      = 8;    // hard cap on flask charges (merchant upgrades)
export const AMRIT_POTENCY_CAP  = 5;    // max potency upgrades

// ── Thread Shards — the merchant currency ────────────────────────────────────
export const SHARDS_PER_ENEMY = 5;      // base drop per normal enemy kill
export const SHARDS_PER_BOSS  = 120;    // bonus for felling a boss

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

// XP thresholds per level. Consumers read XP_THRESHOLDS[level - 1], i.e. index 0 is
// the XP needed to go from level 1 → 2 (100), index 1 for 2 → 3 (250), and so on.
export const XP_THRESHOLDS = [100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, Infinity];

// Each banked level grants POINTS_PER_LEVEL skill points, spent in the character
// skill tree (see src/data/skills.js and Player.applySkills).
export const POINTS_PER_LEVEL = 5;

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
  sixth_note:      { name: 'The Sixth Note',  type: 'token',      effect: null, desc: 'The hymn’s missing root note, restored to the sacred grove. The arch stands.' },

  // ── Charms ──────────────────────────────────────────────────────────────────
  // Build-defining tradeoff talismans. Own as many as you like; wear at most
  // CHARM_SLOTS at once (save.equippedCharms, toggled from the inventory).
  // mods are additive fractions aggregated by Player.setCharms():
  //   hp/dmg (+good), def (+ = take less damage, − = take more),
  //   staRegen, amrit (heal per sip), xp, shards (kill payout).
  charm_agni_bead: {
    name: 'Agni Bead', type: 'charm', effect: null,
    mods: { dmg: 0.20, def: -0.15 },
    desc: '+20% damage dealt · +15% damage taken',
  },
  charm_prithvi_seal: {
    name: 'Prithvi Seal', type: 'charm', effect: null,
    mods: { hp: 0.25, dmg: -0.10 },
    desc: '+25% max HP · -10% damage dealt',
  },
  charm_vayu_feather: {
    name: 'Vayu Feather', type: 'charm', effect: null,
    mods: { staRegen: 0.50, hp: -0.15 },
    desc: '+50% stamina regen · -15% max HP',
  },
  charm_jal_pearl: {
    name: 'Jal Pearl', type: 'charm', effect: null,
    mods: { amrit: 0.30, staRegen: -0.15 },
    desc: 'Amrit heals +30% more · -15% stamina regen',
  },
  charm_naga_fang: {
    name: 'Naga Fang', type: 'charm', effect: null,
    mods: { shards: 0.30, def: -0.10 },
    desc: '+30% Thread Shards from kills · +10% damage taken',
  },
  charm_thread_knot: {
    name: 'Thread Knot', type: 'charm', effect: null,
    mods: { xp: 0.25, hp: -0.10 },
    desc: '+25% XP gained · -10% max HP',
  },
};

export const CHARM_SLOTS = 2;
