export class AudioManager {
  constructor() {
    this._ctx = null;
    this._muted = false;
    this._masterGain = null;
    this._ambientNode = null;
    this._ambientGain = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.4;
      this._masterGain.connect(this._ctx.destination);
    }
    return this._ctx;
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : 0.4;
    }
    return this._muted;
  }

  // `delay` (seconds) schedules the tone in the future via the AudioContext
  // clock — more accurate than setTimeout and creates no JS timers.
  _tone(freq, type, duration, gain = 0.3, attack = 0.01, decay = 0.1, delay = 0) {
    if (this._muted) return;
    const ctx = this._getCtx();
    const t0  = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  _noise(duration, gain = 0.2) {
    if (this._muted) return;
    const ctx = this._getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(g);
    g.connect(this._masterGain);
    src.start();
  }

  hit() {
    this._tone(220, 'sawtooth', 0.12, 0.25);
    this._noise(0.08, 0.15);
  }

  heavyHit() {
    this._tone(110, 'sawtooth', 0.25, 0.4);
    this._noise(0.15, 0.25);
    const ctx = this._getCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }

  dodge() {
    this._tone(600, 'sine', 0.15, 0.2);
    this._tone(900, 'sine', 0.10, 0.1);
  }

  perfectDodge() {
    this._tone(880, 'sine', 0.05, 0.3);
    this._tone(1100, 'sine', 0.08, 0.3);
    this._tone(1320, 'sine', 0.12, 0.2);
  }

  ability() {
    this._tone(440, 'square', 0.2, 0.3);
    this._tone(660, 'square', 0.15, 0.2);
  }

  playerDamage() {
    this._tone(180, 'sawtooth', 0.18, 0.3);
    this._noise(0.1, 0.2);
  }

  enemyDeath() {
    this._tone(200, 'sawtooth', 0.3, 0.2);
    this._tone(150, 'sawtooth', 0.4, 0.15);
  }

  bossPhase() {
    [200, 300, 400, 300, 200].forEach((f, i) => {
      this._tone(f, 'sawtooth', 0.3, 0.35, 0.01, 0.1, i * 0.12);
    });
  }

  questComplete() {
    [440, 550, 660, 880].forEach((f, i) => {
      this._tone(f, 'sine', 0.25, 0.25, 0.01, 0.1, i * 0.08);
    });
  }

  portal() {
    const ctx = this._getCtx();
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300 + i * 80, ctx.currentTime + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(600 + i * 100, ctx.currentTime + i * 0.05 + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.4);
      osc.connect(g);
      g.connect(this._masterGain);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + i * 0.05 + 0.5);
    }
  }

  victory() {
    [440, 550, 660, 550, 440, 660, 880].forEach((f, i) => {
      this._tone(f, 'square', 0.3, 0.3, 0.01, 0.1, i * 0.1);
    });
  }

  interact() {
    this._tone(700, 'sine', 0.08, 0.2);
  }

  startAmbient(regionIndex) {
    this.stopAmbient();
    if (this._muted) return;
    const ctx = this._getCtx();
    const freqs = [60, 80, 55, 45, 70, 50, 40];
    const types = ['sine', 'sine', 'triangle', 'sine', 'sine', 'triangle', 'sine'];
    const freq = freqs[regionIndex] || 60;
    const type = types[regionIndex] || 'sine';

    this._ambientNode = ctx.createOscillator();
    this._ambientNode.type = type;
    this._ambientNode.frequency.value = freq;

    this._ambientGain = ctx.createGain();
    this._ambientGain.gain.value = 0;
    this._ambientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);

    this._ambientNode.connect(this._ambientGain);
    this._ambientGain.connect(this._masterGain);
    this._ambientNode.start();
  }

  stopAmbient() {
    if (this._ambientNode) {
      try { this._ambientNode.stop(); } catch {}
      this._ambientNode = null;
    }
    if (this._ambientGain) {
      this._ambientGain.disconnect();
      this._ambientGain = null;
    }
  }

  pressurePlate() {
    this._tone(330, 'sine', 0.3, 0.25);
    this._tone(440, 'sine', 0.25, 0.25);
  }

  uiClick() {
    this._tone(500, 'sine', 0.06, 0.2);
  }

  bossStagger() {
    this._noise(0.3, 0.3);
    this._tone(120, 'sawtooth', 0.4, 0.3, 0.01, 0.1, 0.1);
  }
}
