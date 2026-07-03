// Merchant catalog + pricing for the Thread Weaver (opened from a Thread Shrine).
// Prices are in Thread Shards. Upgrade prices scale with how many you've already
// bought so each successive tier costs more. GameScene.getMerchantOffers() turns
// these into concrete, priced offers using live player state.

export const AMRIT_CHARGE_BASE = 100;   // first extra flask charge
export const AMRIT_CHARGE_STEP = 70;    // added per charge already bought
export const AMRIT_POTENCY_BASE = 90;   // first potency upgrade
export const AMRIT_POTENCY_STEP = 70;   // added per potency tier already bought

// Consumables/passives the merchant restocks. Items are defined in constants.ITEM_DEFS.
export const CONSUMABLE_STOCK = [
  { item: 'forest_totem',  price: 40  },
  { item: 'jal_tear',      price: 70  },
  { item: 'prithvi_shard', price: 220 }, // passive: +20 max HP
  { item: 'agni_ember',    price: 260 }, // passive: +10% ability power
];

export function amritChargePrice(currentMax, baseMax) {
  return AMRIT_CHARGE_BASE + AMRIT_CHARGE_STEP * Math.max(0, currentMax - baseMax);
}

export function amritPotencyPrice(tier) {
  return AMRIT_POTENCY_BASE + AMRIT_POTENCY_STEP * Math.max(0, tier);
}
