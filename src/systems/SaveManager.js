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
      completedQuests: [],
      inventory: [],
      loreCount: 0,
      bossKills: [],
    };
  }
}
