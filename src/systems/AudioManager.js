export class AudioManager {
  constructor() {
    this._ctx = null;
    this._muted = false;
    this._masterGain = null;
    this._ambientNode = null;
    this._ambientGain = null;
    this._music = null;
    this._noiseBuf = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      // Respect a mute toggled before the context was lazily created.
      this._masterGain.gain.value = this._muted ? 0 : 0.4;
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
    // Deterministic teardown — thousands of fire-and-forget nodes otherwise
    // pile up for GC to find, showing up as periodic main-thread pauses.
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // One shared 2s white-noise buffer for every noise-based sound. Building a
  // fresh buffer per call meant tens of thousands of Math.random() samples on
  // the main thread at the exact frame of a death sting or boss stagger.
  _getNoiseBuf() {
    if (!this._noiseBuf) {
      const ctx = this._getCtx();
      this._noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this._noiseBuf;
  }

  _noise(duration, gain = 0.2) {
    if (this._muted) return;
    const ctx = this._getCtx();
    const buf = this._getNoiseBuf();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // Random window into the shared buffer so overlapping noises don't phase.
    const offset = Math.random() * Math.max(0.001, buf.duration - duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(g);
    g.connect(this._masterGain);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    src.start(0, offset, Math.min(duration, buf.duration));
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
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
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

  uiClick() {
    this._tone(500, 'sine', 0.06, 0.2);
  }

  // Per-character tick for the dialogue typewriter — quiet and pitch-jittered so
  // a stream of them reads as a murmur rather than beeping.
  dialogueBlip() {
    this._tone(600 + Math.random() * 180, 'triangle', 0.035, 0.05, 0.002, 0.02);
  }

  // Bright coin/chime for a successful purchase; soft thud when you can't afford it.
  purchase() {
    this._tone(660, 'sine', 0.1, 0.25);
    this._tone(990, 'sine', 0.14, 0.2, 0.01, 0.1, 0.06);
  }

  denied() {
    this._tone(160, 'square', 0.14, 0.2);
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
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + i * 0.05 + 0.5);
    }
  }

  victory() {
    [440, 550, 660, 550, 440, 660, 880].forEach((f, i) => {
      this._tone(f, 'square', 0.3, 0.3, 0.01, 0.1, i * 0.1);
    });
  }

  startAmbient(regionIndex) {
    this.stopAmbient();
    if (this._muted) return;
    const ctx = this._getCtx();
    const freqs = [60, 80, 55, 45, 70, 50, 40];
    const types = ['sine', 'sine', 'triangle', 'sine', 'sine', 'triangle', 'sine'];
    // Wrap instead of falling through so regions 7+ don't all share one drone.
    const freq = freqs[regionIndex % freqs.length] || 60;
    const type = types[regionIndex % types.length] || 'sine';

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
      try { this._ambientNode.stop(); this._ambientNode.disconnect(); } catch {}
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

  interact() {
    this._tone(700, 'sine', 0.08, 0.2);
  }

  bossStagger() {
    this._noise(0.3, 0.3);
    this._tone(120, 'sawtooth', 0.4, 0.3, 0.01, 0.1, 0.1);
  }

  // ── Stingers ───────────────────────────────────────────────────────────────

  heal() {
    [420, 560, 700].forEach((f, i) => this._tone(f, 'sine', 0.22, 0.16, 0.02, 0.1, i * 0.07));
  }

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'triangle', 0.3, 0.2, 0.01, 0.12, i * 0.09));
  }

  shrineRest() {
    this._tone(110, 'sine', 1.2, 0.18, 0.3, 0.5);
    [660, 880].forEach((f, i) => this._tone(f, 'triangle', 0.5, 0.12, 0.02, 0.2, 0.3 + i * 0.25));
  }

  deathSting() {
    [220, 174, 147, 110].forEach((f, i) => this._tone(f, 'sawtooth', 0.9, 0.12, 0.05, 0.4, i * 0.45));
    this._noise(1.6, 0.05);
  }

  uiHover() {
    this._tone(700, 'sine', 0.03, 0.08);
  }

  // Browsers create the AudioContext suspended until a user gesture; call this
  // from a first pointer/key handler so queued music starts.
  resume() {
    try { this._ctx?.resume?.(); } catch (e) { /* ignore */ }
  }

  // ── Generative music ───────────────────────────────────────────────────────
  // A lookahead scheduler over the shared AudioContext (schedule ~0.2s ahead on
  // a 40ms JS timer — the standard WebAudio pattern). Each mood is a chord
  // progression + tempo + layer recipe; every voice is synthesized, no files.
  // Chords are semitone offsets from the mood's root; steps are 8th notes and
  // the chord advances every 16 steps (2 bars).

  _moodRecipe(mood, act = 1) {
    // Per-act roots walk darker as the story descends (A, G, B♭, B, F, A♭, F♯).
    const roots = { 1: 110.0, 2: 98.0, 3: 116.54, 4: 123.47, 5: 87.31, 6: 103.83, 7: 92.5 };
    if (mood === 'menu') return {
      root: 110, bpm: 54, gain: 0.16,
      prog: [[0, 3, 7, 12], [8, 12, 15, 20], [3, 7, 10, 15], [10, 14, 17, 22]],
      pad: 'triangle', arpEvery: 2, arpType: 'sine', drums: false,
    };
    if (mood === 'boss') return {
      root: 92.5, bpm: 132, gain: 0.2,
      prog: [[0, 3, 6, 12], [1, 4, 7, 13], [0, 3, 6, 12], [6, 9, 13, 18]],
      pad: 'sawtooth', arpEvery: 1, arpType: 'square', drums: true,
    };
    return {
      root: roots[act] || 110, bpm: 58 + act * 2, gain: 0.14,
      prog: [[0, 3, 7, 12], [5, 8, 12, 17], [8, 12, 15, 20], [7, 10, 14, 19]],
      pad: act >= 5 ? 'sawtooth' : 'triangle', arpEvery: 2,
      arpType: act >= 3 ? 'triangle' : 'sine', drums: false,
    };
  }

  playMusic(mood, opts = {}) {
    const act = opts.act ?? 1;
    if (this._music && this._music.mood === mood && this._music.act === act) return;
    const ctx = this._getCtx();
    this.stopMusic(1.2);

    const recipe = this._moodRecipe(mood, act);
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(recipe.gain, ctx.currentTime + 1.5);
    bus.connect(this._masterGain);

    const m = {
      mood, act, bus, recipe,
      step: 0, chordIdx: -1,
      nextTime: ctx.currentTime + 0.1,
      stepDur: 60 / recipe.bpm / 2,
    };
    m.timer = setInterval(() => this._musicTick(m), 40);
    this._music = m;
  }

  stopMusic(fadeSec = 1) {
    const m = this._music;
    if (!m) return;
    this._music = null;
    clearInterval(m.timer);
    const ctx = this._ctx;
    if (ctx && m.bus) {
      const t = ctx.currentTime;
      m.bus.gain.cancelScheduledValues(t);
      m.bus.gain.setValueAtTime(Math.max(m.bus.gain.value, 0.0001), t);
      m.bus.gain.exponentialRampToValueAtTime(0.0001, t + fadeSec);
      setTimeout(() => { try { m.bus.disconnect(); } catch (e) {} }, fadeSec * 1000 + 100);
    }
  }

  _musicTick(m) {
    if (this._music !== m) return;
    const ctx = this._ctx;
    if (!ctx || ctx.state !== 'running') return;   // waiting for gesture resume
    // 0.5s lookahead: a throttled/backgrounded tab fires the 40ms interval
    // late, and a short lookahead would leave audible gaps on return.
    while (m.nextTime < ctx.currentTime + 0.5) {
      if (!this._muted) this._musicStep(m, m.nextTime);
      m.nextTime += m.stepDur;
      m.step++;
    }
  }

  _musicStep(m, t) {
    const r = m.recipe;
    const semiF = (s) => r.root * Math.pow(2, s / 12);

    if (m.step % 16 === 0) {
      m.chordIdx = (m.chordIdx + 1) % r.prog.length;
      const chord = r.prog[m.chordIdx];
      const chordDur = 16 * m.stepDur;
      for (const s of chord) this._musicVoice(m, semiF(s) * 2, r.pad, t, chordDur, 0.028, 1.0);
      this._musicVoice(m, semiF(chord[0]) / 2, 'sine', t, chordDur, 0.06, 0.4);
    }

    const chord = r.prog[m.chordIdx < 0 ? 0 : m.chordIdx];

    if (m.step % r.arpEvery === 0) {
      // Deterministic wander through the chord — repeats, but never loops short.
      const pick = chord[(m.step * 7 + m.chordIdx * 3) % chord.length];
      const oct = ((m.step >> 2) % 2) + 1;
      this._musicVoice(m, semiF(pick) * Math.pow(2, oct), r.arpType, t, m.stepDur * 1.8, 0.03, 0.01);
    }

    if (r.drums) {
      if (m.step % 4 === 0) this._musicKick(m, t);
      else if (m.step % 2 === 0) this._musicHat(m, t);
      const bs = m.step % 8 < 4 ? chord[0] : chord[2] - 12;
      this._musicVoice(m, semiF(bs), 'sawtooth', t, m.stepDur * 0.9, 0.045, 0.005);
    }
  }

  _musicVoice(m, freq, type, t, dur, gain, attack = 0.02) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(m.bus);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _musicKick(m, t) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(m.bus);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start(t);
    osc.stop(t + 0.15);
  }

  _musicHat(m, t) {
    const ctx = this._ctx;
    const dur = 0.04;
    // Shared noise buffer + a gain envelope replaces the per-hat buffer
    // synthesis (a fresh 1920-sample buffer ~2x/sec for a whole boss fight).
    const buf = this._getNoiseBuf();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(m.bus);
    src.onended = () => { src.disconnect(); hp.disconnect(); g.disconnect(); };
    src.start(t, Math.random() * 1.5, dur);
  }
}
