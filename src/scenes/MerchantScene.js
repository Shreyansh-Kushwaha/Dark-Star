import { GAME_W, GAME_H } from '../constants.js';

// The Thread Weaver — a merchant overlay opened from a Thread Shrine. Spends Thread
// Shards on Amrit upgrades and consumables. All pricing/effects live on GameScene
// (getMerchantOffers / buyOffer); this scene is just the storefront UI.
export class MerchantScene extends Phaser.Scene {
  constructor() { super('MerchantScene'); }

  init(data) {
    this._regionIndex = data?.regionIndex ?? 0;
    this._regionName  = data?.regionName  || `Region ${this._regionIndex}`;
    this._pending     = data?.pendingLevels || 0;
  }

  create() {
    this._gs = this.scene.get('GameScene');
    // Keep GameScene input disabled while trading (the Shrine already disabled it).
    if (this._gs?.input) {
      this._gs.input.enabled = false;
      if (this._gs.input.keyboard) this._gs.input.keyboard.enabled = false;
    }

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05060a, 0.85).setOrigin(0).setInteractive();

    // Entrance: fade in with a slight zoom settle.
    const cam = this.cameras.main;
    cam.alpha = 0; cam.setZoom(1.04);
    this.tweens.add({ targets: cam, alpha: 1, zoom: 1, duration: 160, ease: 'Cubic.easeOut' });

    const glow = this.add.circle(GAME_W / 2, 120, 110, 0x66c8ff, 0.10);
    this.tweens.add({ targets: glow, alpha: 0.20, scale: 1.15, duration: 1300, yoyo: true, repeat: -1 });

    this.add.text(GAME_W / 2, 84, '✦  THE THREAD WEAVER  ✦', {
      fontSize: '28px', fontFamily: 'serif', fontStyle: 'bold', color: '#bfe9ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 118, '"Shards for strength, traveller. The thread provides."', {
      fontSize: '13px', fontFamily: 'serif', fontStyle: 'italic', color: '#6f97ad',
    }).setOrigin(0.5);

    this._balanceText = this.add.text(GAME_W / 2, 148, '', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#8fe3ff',
    }).setOrigin(0.5);

    this._offers = this._gs?.getMerchantOffers?.() || [];
    this._sel = 0;
    this._rows = [];
    const startY = 196, rowH = 54;
    this._offers.forEach((o, i) => {
      const y = startY + i * rowH;
      const bg = this.add.rectangle(GAME_W / 2, y, 560, 48, 0x11151d, 0.95)
        .setStrokeStyle(2, 0x35506a).setInteractive({ useHandCursor: true });
      const name = this.add.text(GAME_W / 2 - 268, y - 9, '', {
        fontSize: '16px', fontFamily: 'serif', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0, 0.5);
      const desc = this.add.text(GAME_W / 2 - 268, y + 12, '', {
        fontSize: '10px', fontFamily: 'monospace', color: '#8a9aa8',
      }).setOrigin(0, 0.5);
      const price = this.add.text(GAME_W / 2 + 268, y, '', {
        fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#8fe3ff',
      }).setOrigin(1, 0.5);
      bg.on('pointerover', () => { this._sel = i; this._refresh(); });
      bg.on('pointerdown', () => bg.setScale(0.98));
      bg.on('pointerout',  () => bg.setScale(1));
      bg.on('pointerup',   () => { bg.setScale(1); this._sel = i; this._buy(); });
      this._rows.push({ bg, name, desc, price });
    });

    this.add.text(GAME_W / 2, GAME_H - 40, '↑ ↓  Navigate     Enter  Buy     Esc / Backspace  Back to Shrine', {
      fontSize: '12px', fontFamily: 'monospace', color: '#5a6276',
    }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-UP',   () => { this._move(-1); });
    kb.on('keydown-DOWN', () => { this._move(1); });
    kb.on('keydown-ENTER', () => this._buy());
    kb.on('keydown-SPACE', () => this._buy());
    kb.on('keydown-ESC',       () => this._back());
    kb.on('keydown-BACKSPACE', () => this._back());

    this._refresh();
  }

  _move(d) {
    this._sel = (this._sel + d + this._offers.length) % this._offers.length;
    this._gs?.audio?.uiClick?.();
    this._refresh();
  }

  _refresh() {
    const shards = this._gs?.shards ?? 0;
    this._balanceText.setText(`✦  ${shards} Thread Shards`);
    this._offers.forEach((o, i) => {
      const r = this._rows[i];
      if (!r) return;   // offers list can outgrow the rows built at create()
      const on = i === this._sel;
      r.name.setText(o.name);
      r.desc.setText(o.desc);
      r.price.setText(o.maxed ? 'MAX' : `✦ ${o.price}`);
      const nameColor  = o.maxed ? '#6a7480' : (o.affordable ? '#ffffff' : '#b06a6a');
      const priceColor = o.maxed ? '#6a7480' : (o.affordable ? '#8fe3ff' : '#b06a6a');
      r.name.setColor(nameColor);
      r.price.setColor(priceColor);
      r.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd700 : 0x35506a);
      r.bg.setFillStyle(on ? 0x1b2230 : 0x11151d, 0.95);
    });
  }

  _buy() {
    const o = this._offers[this._sel];
    if (!o || o.maxed || !o.affordable) { this._gs?.audio?.denied?.(); this._nudge(); return; }
    const res = this._gs?.buyOffer?.(o.id);
    if (res?.ok) {
      this._gs?.audio?.purchase?.();
      // Re-fetch offers so prices/affordability update after the purchase.
      this._offers = this._gs?.getMerchantOffers?.() || this._offers;
      const r = this._rows[this._sel];
      this.tweens.add({ targets: r.bg, scaleY: 1.12, duration: 80, yoyo: true });
      this._refresh();
    } else {
      this._gs?.audio?.denied?.();
      this._nudge();
    }
  }

  _nudge() {
    const r = this._rows[this._sel];
    if (r) this.tweens.add({ targets: r.bg, x: r.bg.x + 6, duration: 40, yoyo: true, repeat: 2 });
  }

  _back() {
    this._gs?.audio?.uiClick?.();
    // Return to the Shrine menu (GameScene stays paused throughout).
    this.scene.launch('ShrineScene', {
      regionIndex: this._regionIndex,
      regionName: this._regionName,
      pendingLevels: this._pending,
    });
    this.scene.bringToTop('ShrineScene');
    this.scene.stop();
  }
}
