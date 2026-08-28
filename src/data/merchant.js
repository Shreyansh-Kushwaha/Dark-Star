// Merchant catalog + pricing for the Thread Weaver (opened from a Thread Shrine).
// Prices are in Thread Shards. Upgrade prices scale with how many you've already
// bought so each successive tier costs more. GameScene.getMerchantOffers() turns
// these into concrete, priced offers using live player state.

// Amrit upgrades are steep, escalating sinks — the first is an early reward (~1
// region of shards), maxing either track is a whole-playthrough goal. Charge track
// (4 buys to the cap of 8): 120/210/300/390 = 1020. Potency track (5 buys):
// 110/190/270/350/430 = 1350.
export const AMRIT_CHARGE_BASE = 120;   // first extra flask charge
export const AMRIT_CHARGE_STEP = 90;    // added per charge already bought
export const AMRIT_POTENCY_BASE = 110;  // first potency upgrade
export const AMRIT_POTENCY_STEP = 80;   // added per potency tier already bought

// Consumables/passives the merchant restocks. Items are defined in constants.ITEM_DEFS.
// Consumables are cheap and repeatable; the two permanent passives are premium.
export const CONSUMABLE_STOCK = [
  { item: 'forest_totem',  price: 50  },
  { item: 'jal_tear',      price: 90  },
  { item: 'prithvi_shard', price: 300 }, // passive: +20 max HP
  { item: 'agni_ember',    price: 350 }, // passive: +10% ability power
];

// Charms — one-time purchases (owning a second copy does nothing, so the
// merchant greys them out once bought). Priced as mid-game build pivots:
// cheaper than a permanent passive, dear enough to be a decision.
export const CHARM_STOCK = [
  { item: 'charm_agni_bead',    price: 220 },
  { item: 'charm_prithvi_seal', price: 220 },
  { item: 'charm_vayu_feather', price: 180 },
  { item: 'charm_jal_pearl',    price: 180 },
  { item: 'charm_naga_fang',    price: 260 },
  { item: 'charm_thread_knot',  price: 200 },
];

export function amritChargePrice(currentMax, baseMax) {
  return AMRIT_CHARGE_BASE + AMRIT_CHARGE_STEP * Math.max(0, currentMax - baseMax);
}

export function amritPotencyPrice(tier) {
  return AMRIT_POTENCY_BASE + AMRIT_POTENCY_STEP * Math.max(0, tier);
}
