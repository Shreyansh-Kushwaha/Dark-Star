import { LORE_FRAGMENTS } from '../data/quests.js';

const TOTAL = LORE_FRAGMENTS.length;

export class LoreManager {
  constructor() {
    this._collected = new Set();
  }

  load(ids = []) {
    ids.forEach(id => this._collected.add(id));
  }

  collect(fragmentId) {
    this._collected.add(fragmentId);
  }

  has(fragmentId) {
    return this._collected.has(fragmentId);
  }

  count() {
    return this._collected.size;
  }

  total() {
    return TOTAL;
  }

  canTrueEnding() {
    return this._collected.size >= TOTAL;
  }

  toArray() {
    return Array.from(this._collected);
  }
}
