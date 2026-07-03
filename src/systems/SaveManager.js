const KEY = 'akhand_sutra_save';

export class SaveManager {
  static save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('SaveManager: save failed', e);
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('SaveManager: load failed', e);
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(KEY);
  }

  static defaults() {
    return {
      regionIndex: 0,
      playerStats: {
        maxHp: 200,
        maxStamina: 100,
        abilityPow: 1.0,
      },
      statTiers: { maxHp: 0, stamina: 0, abilityPow: 0 },
      statPoints: 0,
      playerLevel: 1,
      playerXP: 0,
      completedQuests: [],
      inventory: [],
      collectedLoreIds: [],
      encounteredEnemyIds: [],
      metNpcs: [],
      bossKills: [],
      amritCharges: 4,
      amritMax: 4,
      amritPotencyTier: 0,   // each tier = +AMRIT_POTENCY_STEP heal fraction (bought from the merchant)
      threadShards: 0,       // currency earned from kills; spent at the merchant
      skillNodes: [],        // unlocked skill-tree node ids
      lastShrineRegion: null,
    };
  }

  static addItem(saveData, itemId) {
    if (!saveData.inventory) saveData.inventory = [];
    saveData.inventory.push(itemId);
  }

  static removeItem(saveData, itemId) {
    if (!saveData.inventory) return;
    const idx = saveData.inventory.indexOf(itemId);
    if (idx > -1) saveData.inventory.splice(idx, 1);
  }
}
