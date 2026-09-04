// Player-facing options, persisted separately from the save so clearing a run
// (or the ending wiping the save) never resets someone's volumes.
// Volumes are 0..1; AudioManager.applyVolumes() folds them into its buses.
// reducedMotion turns off camera shake/kick and hitstop for players sensitive
// to sudden screen movement — checked at the effect sites in GameScene.
const KEY = 'akhand_settings';

export const Settings = {
  masterVol: 1,
  musicVol: 1,
  sfxVol: 1,
  reducedMotion: false,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.masterVol === 'number') this.masterVol = Math.min(1, Math.max(0, s.masterVol));
      if (typeof s.musicVol === 'number') this.musicVol = Math.min(1, Math.max(0, s.musicVol));
      if (typeof s.sfxVol === 'number') this.sfxVol = Math.min(1, Math.max(0, s.sfxVol));
      this.reducedMotion = !!s.reducedMotion;
    } catch (e) { /* corrupt settings — keep defaults */ }
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        masterVol: this.masterVol,
        musicVol: this.musicVol,
        sfxVol: this.sfxVol,
        reducedMotion: this.reducedMotion,
      }));
    } catch (e) { /* quota — settings just won't persist */ }
  },

  set(key, value) {
    this[key] = value;
    this.save();
  },
};
