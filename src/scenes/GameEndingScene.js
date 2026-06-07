import { GAME_W, GAME_H } from '../constants.js';
import { SaveManager } from '../systems/SaveManager.js';

export class GameEndingScene extends Phaser.Scene {
  constructor() { super('GameEndingScene'); }

  init(data) {
    this._loreCount = data?.loreCount || 0;
    this._questsCompleted = data?.questsCompleted || 0;
  }

  create() {
    SaveManager.clear();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000008, 0x000008, 0x1a0030, 0x1a0030, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * GAME_W;
      const y = Math.random() * GAME_H;
      const r = Math.random() * 1.5 + 0.5;
      const star = this.add.circle(x, y, r, 0xffffff, 0.4 + Math.random() * 0.6);
      this.tweens.add({
        targets: star, alpha: 0.1 + Math.random() * 0.4,
        duration: 1000 + Math.random() * 2000,
        yoyo: true, repeat: -1,
      });
    }

    const cx = GAME_W / 2;

    this.add.text(cx, 80, '✦ AKHAND SUTRA ✦', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 1, duration: 1500, delay: 200 });

    this.add.text(cx, 140, 'The Unbroken Thread — Restored', {
      fontSize: '18px', color: '#cc9933', fontFamily: 'serif', fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 1, duration: 1500, delay: 700 });

    const story = [
      'Viyogasur has fallen.',
      'The demon who severed the Akhand Sutra',
      'lies defeated at last.',
      '',
      'Dhruva and Tara, bound by the Unbroken Thread,',
      'have restored the sacred connection',
      'between all living souls.',
      '',
      'The forests breathe. The waters flow.',
      'The heavens sing again.',
    ];

    let storyText = this.add.text(cx, 220, '', {
      fontSize: '14px', color: '#ddcc99', fontFamily: 'serif',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: storyText, alpha: 1, duration: 1000, delay: 1200 });
    storyText.setText(story.join('\n'));

    // Stats
    const statsY = 470;
    this.add.text(cx, statsY, '— Journey Complete —', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 1, duration: 800, delay: 2000 });

    this.add.text(cx, statsY + 32, `Lore Fragments: ${this._loreCount} / 7`, {
      fontSize: '13px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 1, duration: 800, delay: 2300 });

    this.add.text(cx, statsY + 54, `Quests Completed: ${this._questsCompleted}`, {
      fontSize: '13px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 1, duration: 800, delay: 2600 });

    // Return to menu button
    const btn = this.add.rectangle(cx, GAME_H - 80, 240, 44, 0x1a1000, 0.9).setOrigin(0.5);
    btn.setStrokeStyle(2, 0xffd700);
    this.add.text(cx, GAME_H - 80, 'RETURN TO MENU', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.zone(cx, GAME_H - 80, 240, 44).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'));

    // Also any key returns after 4 seconds
    this.time.delayedCall(5000, () => {
      this.input.keyboard.once('keydown', () => this.scene.start('MainMenuScene'));
    });
  }
}
