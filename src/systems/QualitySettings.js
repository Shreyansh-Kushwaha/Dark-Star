const LEVELS = ['low', 'medium', 'high'];
// postFx   = camera bloom (single full-screen pass — affordable on medium).
// glow     = per-object emissive glow shader (one extra pass PER prop — high only).
// glowMax  = hard cap on how many props may receive a glow pass, even on high.
const PRESETS = {
  low:    { shadows: false, occlusion: false, maxEnemies: 8,  rabbits: 0,  weather: false, postFx: false, glow: false, glowMax: 0  },
  medium: { shadows: true,  occlusion: false, maxEnemies: 12, rabbits: 12, weather: true,  postFx: true,  glow: false, glowMax: 0  },
  high:   { shadows: true,  occlusion: true,  maxEnemies: 18, rabbits: 12, weather: true,  postFx: true,  glow: true,  glowMax: 12 },
};
const STORAGE_KEY = 'akhand_quality';

export const QualitySettings = {
  level: 'medium',
  shadows: true,
  occlusion: false,
  maxEnemies: 12,
  rabbits: 12,
  weather: true,
  postFx: true,
  glow: false,
  glowMax: 0,

  load() {
    const saved = localStorage.getItem(STORAGE_KEY);
    // First run (no saved choice): pick a sensible default from device capability
    // so weak phones/laptops don't open on a preset they can't sustain.
    this._apply(LEVELS.includes(saved) ? saved : this._autoDetect());
  },

  // Heuristic first-run default. deviceMemory (GB) and hardwareConcurrency
  // (logical cores) are the most widely-supported signals; both are absent on
  // some browsers, in which case we fall back to 'medium'.
  _autoDetect() {
    try {
      const mem   = navigator.deviceMemory || 0;        // 0 = unknown
      const cores = navigator.hardwareConcurrency || 0; // 0 = unknown
      if ((mem && mem <= 2) || (cores && cores <= 2)) return 'low';
      if ((mem && mem <= 4) || (cores && cores <= 4)) return 'medium';
      if (mem >= 8 && cores >= 8) return 'high';
      return 'medium';
    } catch (e) {
      return 'medium';
    }
  },

  cycle() {
    const next = LEVELS[(LEVELS.indexOf(this.level) + 1) % LEVELS.length];
    this._apply(next);
    localStorage.setItem(STORAGE_KEY, this.level);
    return this.level;
  },

  // Used by the in-game FPS watchdog to step quality down automatically.
  // Returns the new level, or null if already at the floor / invalid.
  setLevel(level) {
    if (!LEVELS.includes(level) || level === this.level) return null;
    this._apply(level);
    localStorage.setItem(STORAGE_KEY, this.level);
    return this.level;
  },

  // One step down from the current level, or null if already 'low'.
  lowerLevel() {
    const idx = LEVELS.indexOf(this.level);
    if (idx <= 0) return null;
    return this.setLevel(LEVELS[idx - 1]);
  },

  _apply(level) {
    this.level = level;
    Object.assign(this, PRESETS[level]);
  },
};
