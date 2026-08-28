import { NPC_DIALOGUE } from '../data/quests.js';

export class NPC extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config) {
    super(scene, x, y);
    scene.add.existing(this);

    this.npcId   = config.id;
    this.npcType = config.type; // 'yellow' | 'blue'

    const rawKey  = config.type === 'yellow' ? 'npc_yellow_raw' : 'npc_blue_raw';
    const animKey = config.type === 'yellow' ? 'npc_yellow_idle' : 'npc_blue_idle';

    this.sprite = scene.add.sprite(0, 0, rawKey, 0);
    if (scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    }
    this.sprite.setScale(1.0);
    this.add(this.sprite);

    // Interaction indicator
    this._indicator = scene.add.text(0, -50, '[F]', {
      fontSize: '14px',
      color: '#ffe44d',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setAlpha(0);
    this.add(this._indicator);

    // Name label just below the [F] prompt; fades in/out with it.
    if (config.name) {
      this._nameLabel = scene.add.text(0, -34, String(config.name).replace(/_/g, ' '), {
        fontSize: '10px',
        color: '#ffe8a0',
        fontFamily: 'serif',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5, 1).setAlpha(0);
      this.add(this._nameLabel);
    }

    this._playerNear = false;
    this.setDepth(y);

    // Gentle bob
    scene.tweens.add({
      targets: this.sprite,
      y: -4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(players) {
    let nearestSq = Infinity;
    for (const p of players) {
      if (!p || !p.active) continue;
      const dx = this.x - p.x, dy = this.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < nearestSq) nearestSq = dSq;
    }

    const wasNear = this._playerNear;
    this._playerNear = nearestSq < 100 * 100;

    if (this._playerNear && !wasNear) {
      this.scene.tweens.add({
        targets: [this._indicator, this._nameLabel].filter(Boolean),
        alpha: 1,
        duration: 200,
      });
    } else if (!this._playerNear && wasNear) {
      this.scene.tweens.add({
        targets: [this._indicator, this._nameLabel].filter(Boolean),
        alpha: 0,
        duration: 200,
      });
    }

    this.setDepth(this.y);
  }

  interact(questManager, questData) {
    if (!this._playerNear) return false;

    const dialogue = NPC_DIALOGUE[this.npcId];
    if (!dialogue) return false;

    let line = dialogue.first;
    const questId = questData?.id;

    if (questId) {
      if (questManager.isComplete(questId)) {
        line = dialogue.completed;
      } else if (questManager.isActive(questId)) {
        line = dialogue.active;
      } else {
        // Trigger quest on first talk
        questManager.start(questId, questData);
        questManager.onNpcTalk(this.npcId);
      }
    } else {
      // Region main quest trigger
      questManager.onNpcTalk(this.npcId);
    }

    return line;
  }

  get isPlayerNear() { return this._playerNear; }
}
