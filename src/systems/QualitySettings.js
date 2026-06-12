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
      // Mobile/tablet GPUs have a tight texture-memory budget. Stacking the
      // bloom + glow postFX passes (medium/high) on top of the boss arena's
      // large lazy-loaded frames + camera zoom can exhaust it and lose the
      // WebGL context — which renders every sprite as a green "missing"
      // placeholder and hard-freezes the game (the FPS watchdog can't even run
      // to recover). deviceMemory is absent on iOS Safari and phones routinely
      // report 4-8 cores, so the signals below would wrongly pick medium/high.
      // Floor touch devices to 'low' (no postFx/glow/shadows); the player can
      // still opt up via the quality toggle and that choice is remembered.
      if (this._isTouchDevice()) return 'low';

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

  // Coarse pointer (finger) + touch points is the most reliable cross-browser
  // "is this a phone/tablet" signal, backed up by a UA check for older engines.
  _isTouchDevice() {
    try {
      const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      const touch  = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
      const uaHit  = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '');
      return (coarse && touch) || uaHit;
    } catch (e) {
      return false;
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
