// Data-driven boss cutscene interpreter.
//
// A cutscene is a plain array of step objects authored in `data/bosses.js`
// (`boss.cfg.cutscene`). This player runs the list IN the GameScene: it freezes
// the world (GameScene._bossIntroActive — the update loop already holds every
// actor still while that flag is set), drives the camera + boss sprite directly,
// and emits GameScene events for every screen-space overlay so they render on
// UIScene's fixed layer (never scrolling with the world). When the list is done
// (or the player skips) it unfreezes and hands control to boss.beginFight().
//
// STEP REFERENCE (every field optional unless noted):
//   { type: 'reveal' }                                  boss entrance (scale-up + shake); waits for it
//   { type: 'namecard', ms }                            gold name-card overlay (default 3200ms)
//   { type: 'letterbox', on, wait }                     cinematic black bars in/out
//   { type: 'blackout', on, alpha, ms }                 full-screen black veil (VN / "separate scene" feel)
//   { type: 'flash', color, ms, wait }                  screen flash
//   { type: 'shake', ms, intensity, wait }              camera shake
//   { type: 'pan', to, ms, ease, wait }                 pan camera; to = 'boss' | 'player' | {x,y}
//   { type: 'zoom', to, ms, ease, wait }                zoom camera (1 = default)
//   { type: 'anim', who, key, wait }                    play a boss animation state (idle/run/attack…)
//   { type: 'say', text, who, speaker, portrait, ms }   dialogue line; portrait = a texture key
//   { type: 'hide', wait }                              hide the dialogue box
//   { type: 'wait', ms }                                pause
//
// `say`: pass `who:'boss'` to auto-fill the portrait with the boss's idle frame.
// Otherwise give an explicit `portrait` texture key (e.g. 'dhruva_idle' for a
// player line). `speaker` renders a name label above the text.

const DEFAULT_LINE_MS = 3000;

export class CutscenePlayer {
  constructor(scene) {
    this.scene = scene;
    this._pending = new Set();   // live Phaser timers, cancelled on skip
    this._resolvers = [];        // pending waits, force-resolved on skip
    this._skip = false;
    this._done = false;
    this.ctx = null;
  }

  // steps: step array. ctx: { boss }. Resolves once the sequence (or a skip)
  // finishes and the fight has been handed off.
  async play(steps, ctx) {
    const scene = this.scene;
    this.ctx = ctx;
    scene._bossIntroActive = true;
    if (ctx?.boss) ctx.boss._introActive = true;

    // SPACE / ENTER skip the rest of the cinematic. Player input is frozen for
    // the duration, so these keys are free to repurpose here.
    this._onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') this.skip(); };
    scene.input.keyboard.on('keydown', this._onKey);

    for (const step of steps || []) {
      if (this._skip) break;
      try { await this._run(step); } catch (_) { /* never strand the fight */ }
    }
    this._finalize();
  }

  _run(step) {
    const scene = this.scene;
    const boss  = this.ctx?.boss;
    switch (step?.type) {
      case 'reveal':
        return boss?.reveal ? boss.reveal(scene) : Promise.resolve();

      case 'namecard':
        scene.events.emit('boss_namecard', { boss });
        return this._delay(step.ms ?? 3200);

      case 'letterbox':
        scene.events.emit('cutscene_letterbox', { on: step.on !== false });
        return this._delay(step.wait ?? 0);

      case 'blackout':
        scene.events.emit('cutscene_blackout', {
          on: step.on !== false, alpha: step.alpha ?? 0.94, ms: step.ms ?? 400,
        });
        return this._delay(step.ms ?? 400);

      case 'flash':
        scene.events.emit('cutscene_flash', { color: step.color ?? 0xffffff, ms: step.ms ?? 500 });
        return this._delay(step.wait ?? 0);

      case 'shake': {
        const ms = step.ms ?? 400;
        scene.cameras.main.shake(ms, step.intensity ?? 0.015);
        return this._delay(step.wait ?? ms);
      }

      case 'pan': {
        const t  = this._resolveTarget(step.to);
        const ms = step.ms ?? 900;
        scene.cameras.main.pan(t.x, t.y, ms, step.ease ?? 'Sine.easeInOut');
        return this._delay(step.wait ?? ms);
      }

      case 'zoom': {
        const ms = step.ms ?? 600;
        scene.cameras.main.zoomTo(step.to ?? 1, ms, step.ease ?? 'Sine.easeInOut');
        return this._delay(step.wait ?? ms);
      }

      case 'anim':
        if (step.who !== 'player') boss?._playAnim?.(step.key);
        return this._delay(step.wait ?? 0);

      case 'say': {
        let portrait = step.portrait;
        if (!portrait && step.who === 'boss' && boss) portrait = boss.cfg.textureBase + '_idle_01';
        scene.events.emit('show_dialogue', { text: step.text || '', portrait, speaker: step.speaker });
        return this._delay(step.ms ?? DEFAULT_LINE_MS);
      }

      case 'hide':
        scene.events.emit('hide_dialogue');
        return this._delay(step.wait ?? 0);

      case 'wait':
        return this._delay(step.ms ?? 500);

      default:
        return Promise.resolve();
    }
  }

  _resolveTarget(to) {
    const scene = this.scene;
    if (to === 'player') { const p = scene.players?.[0]; return { x: p?.x ?? 0, y: p?.y ?? 0 }; }
    if (to && typeof to === 'object') return { x: to.x ?? 0, y: to.y ?? 0 };
    const b = this.ctx?.boss;  // 'boss' or unset
    return { x: b?.x ?? 0, y: b?.y ?? 0 };
  }

  // A cancellable delay: on skip we remove the timer and resolve immediately so
  // the awaiting step unblocks and the loop can bail out.
  _delay(ms) {
    if (!ms || ms <= 0 || this._skip) return Promise.resolve();
    return new Promise(resolve => {
      const ev = this.scene.time.delayedCall(ms, () => { this._pending.delete(ev); resolve(); });
      this._pending.add(ev);
      this._resolvers.push(resolve);
    });
  }

  skip() {
    if (this._skip || this._done) return;
    this._skip = true;
    for (const ev of this._pending) { try { ev.remove(false); } catch (_) {} }
    this._pending.clear();
    const rs = this._resolvers; this._resolvers = [];
    for (const r of rs) { try { r(); } catch (_) {} }
  }

  _finalize() {
    if (this._done) return;
    this._done = true;
    const scene = this.scene;

    if (this._onKey) { scene.input.keyboard.off('keydown', this._onKey); this._onKey = null; }

    // Clear anything a cutscene (or a mid-way skip) may have left on screen.
    scene.events.emit('hide_dialogue');
    scene.events.emit('cutscene_letterbox', { on: false });
    scene.events.emit('cutscene_blackout', { on: false, ms: 300 });
    scene.cameras.main.zoomTo(1, 260, 'Sine.easeInOut');

    scene._bossIntroActive = false;
    this.ctx?.boss?.beginFight?.(scene);
  }
}

// Synthesises the classic reveal → name-card → intro-lines flow for any boss
// that doesn't author its own `cutscene`. Reads whichever intro field the boss
// already has (introLines[] or a single introLine).
export function defaultBossCutscene(boss) {
  const cfg   = boss.cfg;
  const lines = cfg.introLines?.length ? cfg.introLines
              : (cfg.introLine ? [cfg.introLine] : []);
  const steps = [{ type: 'reveal' }, { type: 'namecard' }];
  if (lines.length) {
    steps.push({ type: 'wait', ms: 300 });
    for (const text of lines) steps.push({ type: 'say', text, ms: DEFAULT_LINE_MS });
    steps.push({ type: 'hide' });
  }
  return steps;
}
