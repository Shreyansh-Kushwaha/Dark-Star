// Tracks which regions the player has set foot in. Persisted to localStorage so
// the world map stays filled in across reloads/sessions (the main game save is
// session-only, but exploration is permanent fog-of-war progress).
const KEY = 'akhand_sutra_explored';

export class ExploredManager {
  static _read() {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  /** Set of region indices the player has visited. */
  static get() {
    return new Set(this._read());
  }

  static isExplored(idx) {
    return this._read().includes(idx);
  }

  /** Record a region as explored. Returns true if it was newly discovered. */
  static markExplored(idx) {
    if (idx == null || idx < 0) return false;
    const arr = this._read();
    if (arr.includes(idx)) return false;
    arr.push(idx);
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('ExploredManager: save failed', e);
    }
    return true;
  }

  static count() {
    return this._read().length;
  }

  static clear() {
    try { localStorage.removeItem(KEY); } catch {}
  }
}
