// Haptic feedback across both browser channels: navigator.vibrate on touch
// devices and Gamepad dual-rumble where a pad is connected. Everything is
// feature-detected and fire-and-forget — a silent no-op where unsupported.
// (navigator.vibrate needs a prior user gesture; early calls just return false.)

const PATTERNS = {
  lightHit:     { vib: 15,           weak: 0.35, strong: 0.0, ms: 60 },
  heavyHit:     { vib: 35,           weak: 0.4,  strong: 0.7, ms: 110 },
  kill:         { vib: 25,           weak: 0.3,  strong: 0.5, ms: 90 },
  playerDamage: { vib: [30, 40, 30], weak: 0.5,  strong: 0.8, ms: 160 },
  perfectDodge: { vib: [10, 30, 60], weak: 0.6,  strong: 0.2, ms: 140 },
  bossPhase:    { vib: [80, 60, 80], weak: 0.8,  strong: 1.0, ms: 300 },
  bossDeath:    { vib: [120, 60, 160], weak: 1.0, strong: 1.0, ms: 500 },
  death:        { vib: 200,          weak: 1.0,  strong: 1.0, ms: 400 },
  unlock:       { vib: [10, 20, 10], weak: 0.3,  strong: 0.0, ms: 80 },
};

export class HapticsManager {
  constructor() {
    this.enabled = true;
  }

  play(name) {
    if (!this.enabled) return;
    const p = PATTERNS[name];
    if (!p) return;

    try { navigator.vibrate?.(p.vib); } catch (e) { /* unsupported */ }

    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        pad?.vibrationActuator?.playEffect?.('dual-rumble', {
          duration: p.ms,
          weakMagnitude: p.weak,
          strongMagnitude: p.strong,
        })?.catch?.(() => {});
      }
    } catch (e) { /* unsupported */ }
  }
}
