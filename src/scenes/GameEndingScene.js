import { GAME_W, GAME_H } from '../constants.js';
import { SaveManager } from '../systems/SaveManager.js';

const ENDINGS = [
  {
    key: 'restore',
    label: 'Restore the Thread',
    alwaysAvailable: true,
    viyogasurLine: '"Then you choose their world."',
    narratorLines: [
      'The thread returns.',
      'The skies brighten. The world is whole again.',
      'Every soul can feel every other soul.',
      'Peace returns. Privacy vanishes.',
      'The world is safe.',
      'But never alone.',
    ],
  },
  {
    key: 'break',
    label: 'Break the Thread',
    alwaysAvailable: true,
    viyogasurLine: '"Then let them be free. Even if freedom wounds them."',
    narratorLines: [
      'The thread shatters.',
      'The world becomes separate.',
      'Souls stand alone.',
      'Humanity is truly free.',
      'But loneliness, conflict, and uncertainty remain.',
    ],
  },
  {
    key: 'rewrite',
    label: 'Rewrite the Thread',
    alwaysAvailable: false,
    requiresAllFragments: true,
    dhruvaLine: '"The old world was built on control. The broken world was built on pain. We need neither."',
    taraLine:   '"Then let connection be chosen, not forced."',
    viyogasurLine: '"At last... someone understood."',
    narratorLines: [
      'Dhruva and Tara weave a new thread.',
      'Not a chain. Not a prison.',
      'A bond made by choice.',
      'The gods lose their grip.',
      'Humanity keeps its freedom.',
      'And the world finally learns to connect without being consumed.',
      '',
      'The Unbroken Thread was never restored.',
      'It was remade.',
    ],
  },
];

const CREDITS_LINES = [
  'Some say the old gods still watch from beyond the sky.',
  'Some say Viyogasur was never a demon at all.',
  'Some say the thread still hums beneath the earth,',
  'waiting for those brave enough to choose each other freely.',
];

export class GameEndingScene extends Phaser.Scene {
  constructor() { super('GameEndingScene'); }

  init(data) {
    this._loreCount     = data?.loreCount     ?? 0;
    this._loreTotal     = data?.loreTotal      ?? 20;
    this._canTrueEnding = data?.canTrueEnding  ?? false;
  }

  create() {
    SaveManager.clear();

    // Co-op: the session's socket would otherwise stay open forever. Both
    // players enter the ending within a sync tick of each other, so a short
    // delay guarantees the partner's GameScene (and its disconnect handlers)
    // is gone before the close — nothing interrupts their finale.
    const net = this.scene.get('GameScene')?.network;
    if (net?.connected) this.time.delayedCall(3000, () => net.disconnect());

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000008, 0x000008, 0x1a0030, 0x1a0030, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H);
      const r = Math.random() * 1.5 + 0.4;
      const star = this.add.circle(x, y, r, 0xffffff, 0.3 + Math.random() * 0.5);
      this.tweens.add({
        targets: star, alpha: 0.1 + Math.random() * 0.3,
        duration: 1200 + Math.random() * 2000, yoyo: true, repeat: -1,
      });
    }

    this._selectedIdx      = 0;
    this._choiceConfirmed  = false;
    this._panels           = [];

    // Title
    const titleTxt = this.add.text(GAME_W / 2, 52, 'CHOOSE YOUR PATH', {
      fontSize: '22px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4, letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: titleTxt, alpha: 1, duration: 800, delay: 400 });

    // Lore count
    const loreTxt = this.add.text(GAME_W / 2, 90, `Lore Fragments: ${this._loreCount} / ${this._loreTotal}`, {
      fontSize: '12px', color: this._canTrueEnding ? '#88ff88' : '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: loreTxt, alpha: 1, duration: 800, delay: 700 });

    // Choice panels
    const panelW = 500, panelH = 72, panelX = GAME_W / 2, startY = 160, gap = 88;
    for (let i = 0; i < ENDINGS.length; i++) {
      const ending = ENDINGS[i];
      const py = startY + i * gap;
      const locked = !ending.alwaysAvailable && !this._canTrueEnding;

      const bg2 = this.add.rectangle(panelX, py, panelW, panelH, locked ? 0x111111 : 0x1a1000, locked ? 0.6 : 0.9)
        .setOrigin(0.5).setAlpha(0);
      const border = this.add.rectangle(panelX, py, panelW, panelH, locked ? 0x333333 : 0xffd700, 0)
        .setOrigin(0.5).setStrokeStyle(2, locked ? 0x333333 : 0xffd700).setAlpha(0);

      const icon = locked ? '  ' : '◈';
      const label = this.add.text(panelX, py - 10, `${icon}  ${ending.label}`, {
        fontSize: '16px', color: locked ? '#555555' : '#ffd700',
        fontFamily: 'serif', fontStyle: locked ? 'normal' : 'bold',
      }).setOrigin(0.5).setAlpha(0);

      const subText = locked ? `Requires all ${this._loreTotal} lore fragments` : '';
      const sub = this.add.text(panelX, py + 14, subText, {
        fontSize: '10px', color: '#664444', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: [bg2, border, label, sub], alpha: 1, duration: 600, delay: 900 + i * 200 });
      this._panels.push({ bg: bg2, border, label, sub, locked, endingIdx: i, py });

      // Touch/mouse: hover highlights, tap on the highlighted panel confirms.
      if (!locked) {
        bg2.setInteractive({ useHandCursor: true });
        bg2.on('pointerover', () => {
          if (this._choiceConfirmed) return;
          this._selectedIdx = i;
          this._updateSelection();
        });
        bg2.on('pointerup', () => {
          if (this._choiceConfirmed) return;
          this._selectedIdx = i;
          this._updateSelection();
          this._confirmChoice();
        });
      }
    }

    // Navigation hint
    this._navHint = this.add.text(GAME_W / 2, startY + ENDINGS.length * gap + 20,
      '[W/S] Navigate    [Enter] Confirm    (or tap a path)', {
        fontSize: '11px', color: '#666', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this._navHint, alpha: 1, duration: 600, delay: 1600 });

    // Keys
    this._keyW     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this._keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this._keyUp    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this._keyDown  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this._keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this._updateSelection();
  }

  update() {
    if (this._choiceConfirmed) return;

    if (Phaser.Input.Keyboard.JustDown(this._keyW) || Phaser.Input.Keyboard.JustDown(this._keyUp)) {
      this._navigate(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyS) || Phaser.Input.Keyboard.JustDown(this._keyDown)) {
      this._navigate(1);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyEnter)) {
      this._confirmChoice();
    }
  }

  _navigate(dir) {
    const prev = this._selectedIdx;
    let next = (this._selectedIdx + dir + ENDINGS.length) % ENDINGS.length;
    // Skip locked panels
    if (this._panels[next].locked) {
      next = (next + dir + ENDINGS.length) % ENDINGS.length;
    }
    if (next !== prev) {
      this._selectedIdx = next;
      this._updateSelection();
    }
  }

  _updateSelection() {
    for (let i = 0; i < this._panels.length; i++) {
      const p = this._panels[i];
      const sel = i === this._selectedIdx && !p.locked;
      p.bg.setFillStyle(sel ? 0x2a1800 : (p.locked ? 0x111111 : 0x1a1000), sel ? 1 : (p.locked ? 0.6 : 0.9));
      p.border.setStrokeStyle(sel ? 3 : 2, p.locked ? 0x333333 : (sel ? 0xffee88 : 0xffd700));
    }
  }

  _confirmChoice() {
    const panel = this._panels[this._selectedIdx];
    if (panel.locked) return;
    this._choiceConfirmed = true;
    this._navHint.setAlpha(0);
    this._playEnding(ENDINGS[panel.endingIdx]);
  }

  _playEnding(ending) {
    const depth = 9500;
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0, 0).setDepth(depth);
    this.tweens.add({ targets: veil, alpha: 1, duration: 1200 });

    let delay = 1400;

    if (ending.key === 'rewrite') {
      this._scheduleEpilogueLine(ending.dhruvaLine, delay, depth + 1, '#aad4ff');
      delay += 3000;
      this._scheduleEpilogueLine(ending.taraLine, delay, depth + 1, '#aad4ff');
      delay += 3000;
    }

    this._scheduleEpilogueLine(ending.viyogasurLine, delay, depth + 1, '#ddcc99');
    delay += 3200;

    for (const line of ending.narratorLines) {
      this._scheduleEpilogueLine(line, delay, depth + 1, '#bbbbaa');
      delay += 2600;
    }

    delay += 1000;
    for (const line of CREDITS_LINES) {
      this._scheduleEpilogueLine(line, delay, depth + 1, '#777766');
      delay += 2200;
    }

    this.time.delayedCall(delay + 1000, () => {
      this.cameras.main.fadeOut(1200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  _scheduleEpilogueLine(text, delay, depth, color) {
    if (!text) return;
    this.time.delayedCall(delay, () => {
      const t = this.add.text(GAME_W / 2, GAME_H / 2, text, {
        fontSize: '16px', color, fontFamily: 'serif',
        align: 'center', wordWrap: { width: 680 }, lineSpacing: 5,
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(depth).setAlpha(0);
      this.tweens.add({
        targets: t, alpha: 1, duration: 600,
        onComplete: () => {
          this.time.delayedCall(1800, () => {
            this.tweens.add({
              targets: t, alpha: 0, duration: 500,
              onComplete: () => t.destroy(),
            });
          });
        },
      });
    });
  }
}
