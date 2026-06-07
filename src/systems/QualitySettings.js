const LEVELS = ['low', 'medium', 'high'];
const PRESETS = {
  low:    { shadows: false, occlusion: false, maxEnemies: 8,  rabbits: 0  },
  medium: { shadows: true,  occlusion: false, maxEnemies: 12, rabbits: 12 },
  high:   { shadows: true,  occlusion: true,  maxEnemies: 18, rabbits: 12 },
};
const STORAGE_KEY = 'akhand_quality';

export const QualitySettings = {
  level: 'medium',
  shadows: true,
  occlusion: false,
  maxEnemies: 12,
  rabbits: 12,

  load() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this._apply(LEVELS.includes(saved) ? saved : 'medium');
  },

  cycle() {
    const next = LEVELS[(LEVELS.indexOf(this.level) + 1) % LEVELS.length];
    this._apply(next);
    localStorage.setItem(STORAGE_KEY, this.level);
    return this.level;
  },

  _apply(level) {
    this.level = level;
    Object.assign(this, PRESETS[level]);
  },
};
