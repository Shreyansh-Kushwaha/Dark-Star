import { GAME_W, GAME_H } from '../constants.js';

const LINES = [
  'Before the world had name, before the stars had fire, there was only the thread.',
  'It bound all souls into one song.',
  'And within that song, six gods sang the world into being.',
  'But unity is a power that frightens the proud.',
  'And the gods who feared the future chose betrayal.',
  'They called him Viyogasur. They called him demon. They called truth a crime.',
  'Now the thread weakens. And two souls will walk the broken road.',
];

const LINE_DELAY = 1800;
const FADE_DUR   = 700;
const HOLD_DUR   = 1000;
const SKIP_TIMEOUT = 16000;

export class PrologueScene extends Phaser.Scene {
  constructor() { super('PrologueScene'); }

  init(data) {
    this._regionIndex = data?.regionIndex ?? 0;
    this._coop        = data?.coop ?? false;
  }

  create() {
    this._skipped = false;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000).setOrigin(0, 0);

    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0xcccccc, 0.25);
    gfx.lineBetween(GAME_W * 0.2, GAME_H / 2, GAME_W * 0.8, GAME_H / 2);

    this._titleGroup = this._buildTitleCard();
    this._titleGroup.setAlpha(0);

    this._showLines(() => {
      if (this._skipped) return;
      this._showTitleCard();
    });

    this.input.keyboard.once('keydown', () => this._skip());
    this.input.once('pointerdown', () => this._skip());
    this.time.delayedCall(SKIP_TIMEOUT, () => this._skip());
  }

  _buildTitleCard() {
    const group = this.add.container(GAME_W / 2, GAME_H / 2 - 20);
    const title = this.add.text(0, -20, 'AKHAND SUTRA', {
      fontSize: '42px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 6, letterSpacing: 10,
    }).setOrigin(0.5);
    const sub = this.add.text(0, 30, 'The Unbroken Thread', {
      fontSize: '18px', color: '#ccaa66', fontFamily: 'serif', fontStyle: 'italic',
    }).setOrigin(0.5);
    group.add([title, sub]);
    return group;
  }

  _showLines(onComplete) {
    let delay = 600;
    for (let i = 0; i < LINES.length; i++) {
      this.time.delayedCall(delay, () => {
        if (this._skipped) return;
        this._showLine(LINES[i], i === LINES.length - 1 ? onComplete : null);
      });
      delay += LINE_DELAY;
    }
  }

  _showLine(text, onComplete) {
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 60, text, {
      fontSize: '16px', color: '#ddddcc', fontFamily: 'serif',
      align: 'center', wordWrap: { width: GAME_W * 0.65 }, lineSpacing: 6,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: t, alpha: 1, duration: FADE_DUR,
      onComplete: () => {
        this.time.delayedCall(HOLD_DUR, () => {
          this.tweens.add({
            targets: t, alpha: 0, duration: FADE_DUR,
            onComplete: () => {
              t.destroy();
              if (onComplete) onComplete();
            },
          });
        });
      },
    });
  }

  _showTitleCard() {
    this.tweens.add({
      targets: this._titleGroup, alpha: 1, duration: 800,
      onComplete: () => {
        this.time.delayedCall(2200, () => this._transition());
      },
    });
  }

  _skip() {
    if (this._skipped) return;
    this._skipped = true;
    this.tweens.killAll();
    this._transition();
  }

  _transition() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { regionIndex: this._regionIndex, coop: this._coop });
    });
  }
}
