import { GAME_W, GAME_H } from '../constants.js';

const BAR_L     = 52;          // HP bar left x
const BAR_R     = GAME_W - 30; // HP bar right x
const BAR_W     = BAR_R - BAR_L;   // 1198px
const POST_L    = 86;          // posture bar left x
const POST_W    = BAR_R - POST_L;  // 1164px
const PANEL_TOP = GAME_H - 120;

export class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    this._createTopHUD();
    this._createBossBar();
    this._createDialogueBox();
    this._createRegionTitle();

    this._toasts = [];
    this._toastContainer = this.add.container(GAME_W / 2, GAME_H / 2 - 50);

    this._createAbilityBar();

    this._questPanel = this._createQuestPanel();
    this._questPanel.setVisible(false);
    this._questVisible = false;

    this._invPanel = this._createInventoryPanel();
    this._invPanel.setVisible(false);
    this._invVisible = false;

    this._keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._keyU   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this._keyI   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this._keyM   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this._keyF11 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F11);

    const gs = this.scene.get('GameScene');
    gs.events.on('boss_entered',       this._onBossEntered,    this);
    gs.events.on('boss_hp_changed',    this._onBossHpChanged,  this);
    gs.events.on('boss_phase_changed', this._onBossPhase,      this);
    gs.events.on('boss_staggered',     this._onBossStaggered,  this);
    gs.events.on('boss_killed',        this._onBossKilled,     this);
    gs.events.on('player_damaged',     this._onPlayerDamaged,  this);
    gs.events.on('player_downed',      this._onPlayerDowned,   this);
    gs.events.on('player_revived',     this._onPlayerRevived,  this);
    gs.events.on('perfect_dodge',      this._onPerfectDodge,   this);
    gs.events.on('quest_started',      this._onQuestStarted,   this);
    gs.events.on('quest_completed',    this._onQuestCompleted, this);
    gs.events.on('show_dialogue',      this._showDialogue,     this);
    gs.events.on('hide_dialogue',      this._hideDialogue,     this);
    gs.events.on('region_title',       this._showRegionTitle,  this);
    gs.events.on('update_ui',          this._updateHUD,        this);
    gs.events.on('ability_used',       this._onAbilityUsed,    this);
    gs.events.on('show_inventory',     this._showInventory,    this);
  }

  // ── Top HUD ────────────────────────────────────────────────────────────────

  _createTopHUD() {
    const pad = 12;
    const barW = 180, barH = 14, smW = 120, smH = 8;

    this.add.rectangle(0, 0, GAME_W, 64, 0x0a0a0a, 0.75).setOrigin(0, 0);

    this._d1Label = this.add.text(pad, 10, 'DHRUVA', { fontSize: '11px', color: '#cc99ff', fontFamily: 'monospace', fontStyle: 'bold' });
    this._dhruvaHpBg   = this.add.rectangle(pad, 26, barW, barH, 0x333333).setOrigin(0, 0.5);
    this._dhruvaHpFill = this.add.rectangle(pad, 26, barW, barH, 0x22cc66).setOrigin(0, 0.5);
    this._dhruvaHpText = this.add.text(pad + barW + 4, 26, '200/200', { fontSize: '10px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0, 0.5);
    this._dhruvaStamBg   = this.add.rectangle(pad, 40, smW, smH, 0x333333).setOrigin(0, 0.5);
    this._dhruvaStamFill = this.add.rectangle(pad, 40, smW, smH, 0x4499ff).setOrigin(0, 0.5);

    const tx = pad + barW + 80;
    this._d2Label = this.add.text(tx, 10, 'TARA', { fontSize: '11px', color: '#88ccff', fontFamily: 'monospace', fontStyle: 'bold' });
    this._taraHpBg   = this.add.rectangle(tx, 26, barW, barH, 0x333333).setOrigin(0, 0.5);
    this._taraHpFill = this.add.rectangle(tx, 26, barW, barH, 0x22aaee).setOrigin(0, 0.5);
    this._taraHpText = this.add.text(tx + barW + 4, 26, '200/200', { fontSize: '10px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0, 0.5);
    this._taraStamBg   = this.add.rectangle(tx, 40, smW, smH, 0x333333).setOrigin(0, 0.5);
    this._taraStamFill = this.add.rectangle(tx, 40, smW, smH, 0x66ccff).setOrigin(0, 0.5);

    this._regionLabel = this.add.text(GAME_W - pad, 10, 'Region 0', {
      fontSize: '13px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    this.add.text(GAME_W - pad, 52,
      '[J] Atk [K] Heavy [Q/E/R] Ability [Shift] Dodge [F] Talk [I] Inv [U] Quests', {
        fontSize: '9px', color: '#666', fontFamily: 'monospace',
      }).setOrigin(1, 0.5);
  }

  // ── Boss bar (Dark Souls style) ────────────────────────────────────────────

  _createBossBar() {
    const hpY   = GAME_H - 78;
    const postY = GAME_H - 46;
    const nameY = GAME_H - 102;
    const barH  = 26;
    const postH = 12;

    // Starts off-screen below; slides up on boss_entered
    this._bossContainer = this.add.container(0, GAME_H + 200).setVisible(false);

    // Dark semi-transparent panel behind everything
    const panelBg = this.add.rectangle(GAME_W / 2, GAME_H - 60, GAME_W, 122, 0x000000, 0.90).setOrigin(0.5);

    // Gold top border lines
    const borderLine  = this.add.rectangle(GAME_W / 2, PANEL_TOP,     GAME_W, 2, 0xaa8833, 1).setOrigin(0.5, 0);
    const borderLine2 = this.add.rectangle(GAME_W / 2, PANEL_TOP + 5, GAME_W, 1, 0x664400, 0.5).setOrigin(0.5, 0);

    // Boss name — centered, gold serif
    this._bossName = this.add.text(GAME_W / 2, nameY, '', {
      fontSize: '22px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 5,
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Phase label — right side, fades in/out
    this._bossPhaseLabel = this.add.text(GAME_W - 32, nameY, '', {
      fontSize: '13px', color: '#ff8888', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setAlpha(0);

    // HP bar stack (bg → ghost → fill, so fill renders on top)
    const hpLabel      = this.add.text(30, hpY, 'HP', { fontSize: '9px', color: '#777', fontFamily: 'monospace' }).setOrigin(0, 0.5);
    this._bossHpBg     = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0x1a0808).setOrigin(0, 0.5);
    this._bossHpDelay  = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0x882200).setOrigin(0, 0.5);
    this._bossHpFill   = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0xcc1111).setOrigin(0, 0.5);

    // HP bar inner highlight (top edge glint)
    const hpGlint = this.add.rectangle(BAR_L, hpY - barH / 2 + 2, BAR_W, 3, 0xff5555, 0.3).setOrigin(0, 0);

    // Phase separator notches (at 50% and 30% of bar)
    const notch50 = this.add.rectangle(BAR_L + BAR_W * 0.50, hpY, 3, barH + 8, 0xffd700, 0.9).setOrigin(0.5);
    const notch30 = this.add.rectangle(BAR_L + BAR_W * 0.30, hpY, 3, barH + 8, 0xff6600, 0.9).setOrigin(0.5);

    // HP number
    this._bossHpText = this.add.text(GAME_W - 32, hpY, '', {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    // Posture bar
    const postLabel       = this.add.text(30, postY, 'POSTURE', { fontSize: '7px', color: '#555', fontFamily: 'monospace' }).setOrigin(0, 0.5);
    this._bossPostureBg   = this.add.rectangle(POST_L, postY, POST_W, postH, 0x111111).setOrigin(0, 0.5);
    this._bossPostureFill = this.add.rectangle(POST_L, postY, POST_W, postH, 0xff8800).setOrigin(0, 0.5);

    this._bossContainer.add([
      panelBg, borderLine, borderLine2,
      this._bossName, this._bossPhaseLabel,
      hpLabel, this._bossHpBg, this._bossHpDelay, this._bossHpFill,
      hpGlint, notch50, notch30, this._bossHpText,
      postLabel, this._bossPostureBg, this._bossPostureFill,
    ]);

    this._bossHpDelayTween = null;
    this._createBossIntroOverlay();
  }

  _createBossIntroOverlay() {
    // Full-screen overlay that plays before boss bar appears
    this._introOverlay = this.add.container(0, 0).setDepth(9990).setVisible(false);

    const fade    = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0);
    const lineTop = this.add.rectangle(GAME_W / 2, GAME_H / 2 - 58, 660, 2, 0xaa8833, 0).setOrigin(0.5).setScaleX(0);
    const lineBot = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 60, 660, 2, 0xaa8833, 0).setOrigin(0.5).setScaleX(0);

    this._introName = this.add.text(GAME_W / 2 - 80, GAME_H / 2 - 22, '', {
      fontSize: '44px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 7,
      letterSpacing: 10,
    }).setOrigin(0.5).setAlpha(0);

    this._introSub = this.add.text(GAME_W / 2, GAME_H / 2 + 26, '', {
      fontSize: '14px', color: '#ccaa66', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    this._introOverlay.add([fade, lineTop, lineBot, this._introName, this._introSub]);
    this._introFade    = fade;
    this._introLineTop = lineTop;
    this._introLineBot = lineBot;
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────

  _createDialogueBox() {
    const dh = 110, dy = GAME_H - dh - 4;
    this._dialogueContainer = this.add.container(0, 0).setVisible(false).setDepth(9999);

    const bg     = this.add.rectangle(0, dy, GAME_W, dh + 4, 0x0a0a14, 0.96).setOrigin(0, 0);
    const topBar = this.add.rectangle(0, dy, GAME_W, 3, 0xffd700, 1).setOrigin(0, 0);
    const botBar = this.add.rectangle(0, dy + dh + 1, GAME_W, 3, 0xffd700, 0.4).setOrigin(0, 0);

    this._dialogueText = this.add.text(24, dy + 12, '', {
      fontSize: '15px', color: '#ffe8a0', fontFamily: 'serif',
      wordWrap: { width: GAME_W - 48 }, lineSpacing: 6,
    });
    const hint = this.add.text(GAME_W - 16, dy + dh - 8, '[F] close', {
      fontSize: '10px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(1, 1);

    this._dialogueContainer.add([bg, topBar, botBar, this._dialogueText, hint]);
  }

  // ── Region title ───────────────────────────────────────────────────────────

  _createRegionTitle() {
    this._regionTitle = this.add.container(GAME_W / 2, GAME_H / 2 - 60).setAlpha(0);
    const bg = this.add.rectangle(0, 0, 600, 60, 0x000000, 0.6).setOrigin(0.5);
    this._regionTitleText = this.add.text(0, -8, '', {
      fontSize: '28px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    this._regionSubText = this.add.text(0, 16, '', {
      fontSize: '14px', color: '#ddaa66', fontFamily: 'serif',
    }).setOrigin(0.5, 0.5);
    this._regionTitle.add([bg, this._regionTitleText, this._regionSubText]);
  }

  // ── Ability bar ────────────────────────────────────────────────────────────

  _createAbilityBar() {
    const y = GAME_H - 28;
    const labels = ['Q', 'E', 'R'];
    const colors = [0xff8800, 0x44aaff, 0x88ee44];
    this._abilityIcons = [];

    for (let i = 0; i < 3; i++) {
      const x      = GAME_W / 2 - 60 + i * 60;
      const bg     = this.add.rectangle(x, y, 48, 48, 0x111111, 0.85).setOrigin(0.5);
      const border = this.add.rectangle(x, y, 48, 48, colors[i], 0.5).setOrigin(0.5).setStrokeStyle(2, colors[i]);
      this.add.text(x, y - 14, labels[i], {
        fontSize: '13px', fontStyle: 'bold', color: '#' + colors[i].toString(16).padStart(6, '0'), fontFamily: 'monospace',
      }).setOrigin(0.5);
      const cd = this.add.text(x, y, '–', { fontSize: '12px', color: '#ccc', fontFamily: 'monospace' }).setOrigin(0.5);
      this._abilityIcons.push({ bg, border, cd, x, y, cdLeft: 0, cdMax: 1 });
    }
  }

  // ── Quest + Inventory ──────────────────────────────────────────────────────

  _createQuestPanel() {
    const pw = 320, ph = 380;
    const px = GAME_W - pw - 10, py = 70;
    const panel = this.add.container(px, py);

    const bg     = this.add.rectangle(0, 0, pw, ph, 0x111111, 0.92).setOrigin(0, 0);
    const border = this.add.rectangle(0, 0, pw, ph, 0xffd700, 0).setOrigin(0, 0).setStrokeStyle(2, 0xffd700);
    const title  = this.add.text(pw / 2, 12, 'QUEST LOG', { fontSize: '14px', fontStyle: 'bold', color: '#ffd700', fontFamily: 'serif' }).setOrigin(0.5, 0);
    const close  = this.add.text(pw - 10, 12, '[U]', { fontSize: '11px', color: '#666', fontFamily: 'monospace' }).setOrigin(1, 0);

    this._questText = this.add.text(12, 36, '', {
      fontSize: '11px', color: '#ddcc99', fontFamily: 'monospace',
      wordWrap: { width: pw - 24 }, lineSpacing: 3,
    });

    panel.add([bg, border, title, close, this._questText]);
    return panel;
  }

  _createInventoryPanel() {
    const pw = 260, ph = 280;
    const panel = this.add.container(GAME_W / 2 - pw / 2, GAME_H / 2 - ph / 2);

    const bg     = this.add.rectangle(0, 0, pw, ph, 0x1a1000, 0.95).setOrigin(0, 0);
    const border = this.add.rectangle(0, 0, pw, ph, 0xcc9933, 0).setOrigin(0, 0).setStrokeStyle(2, 0xcc9933);
    const title  = this.add.text(pw / 2, 10, 'INVENTORY', { fontSize: '14px', fontStyle: 'bold', color: '#ffd700', fontFamily: 'serif' }).setOrigin(0.5, 0);
    const close  = this.add.text(pw - 10, 10, '[I] close', { fontSize: '10px', color: '#666', fontFamily: 'monospace' }).setOrigin(1, 0);

    this._invText = this.add.text(12, 36, 'No items yet.', {
      fontSize: '11px', color: '#ddcc99', fontFamily: 'monospace',
      wordWrap: { width: pw - 24 }, lineSpacing: 4,
    });

    panel.add([bg, border, title, close, this._invText]);
    return panel;
  }

  // ── Update loop ────────────────────────────────────────────────────────────

  update(time, delta) {
    const gs = this.scene.get('GameScene');
    if (!gs || !gs.players) return;

    for (const icon of this._abilityIcons) {
      if (icon.cdLeft > 0) {
        icon.cdLeft = Math.max(0, icon.cdLeft - delta);
        const pct = icon.cdLeft / icon.cdMax;
        icon.border.setAlpha(0.25 + 0.75 * (1 - pct));
        icon.cd.setText(icon.cdLeft > 0 ? (icon.cdLeft / 1000).toFixed(1) : '–');
      } else {
        icon.cd.setText('–');
        icon.border.setAlpha(0.5);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this._keyEsc)) {
      if (this._questVisible) { this._questPanel.setVisible(false); this._questVisible = false; }
      else if (this._invVisible) { this._invPanel.setVisible(false); this._invVisible = false; }
      else this.scene.get('GameScene')?.togglePause();
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyU)) {
      this._questVisible = !this._questVisible;
      this._questPanel.setVisible(this._questVisible);
      if (this._questVisible) this._refreshQuestLog(gs);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyI)) {
      this._invVisible = !this._invVisible;
      this._invPanel.setVisible(this._invVisible);
      if (this._invVisible) this._refreshInventory(gs);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyM)) {
      gs.audio?.toggleMute();
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyF11)) {
      this._toggleFullscreen();
    }
  }

  _toggleFullscreen() {
    const scale = this.scale;
    if (scale.isFullscreen) scale.stopFullscreen();
    else scale.startFullscreen();
  }

  // ── HUD updates ────────────────────────────────────────────────────────────

  _updateHUD(data) {
    const { players } = data;
    if (!players) return;

    const p1 = players[0];
    const p2 = players[1];

    if (p1) {
      const hpPct = Math.max(0, p1.hp / p1.maxHp);
      this._dhruvaHpFill.scaleX = hpPct;
      this._dhruvaHpFill.setFillStyle(hpPct > 0.5 ? 0x22cc66 : hpPct > 0.25 ? 0xffcc00 : 0xff4444);
      this._dhruvaHpText.setText(`${Math.ceil(p1.hp)}/${p1.maxHp}`);
      this._dhruvaStamFill.scaleX = p1.stamina / p1.maxStamina;
      this._dhruvaStamFill.setAlpha(p1.downed ? 0.3 : 1);
    }

    if (p2) {
      const hpPct = Math.max(0, p2.hp / p2.maxHp);
      this._taraHpFill.scaleX = hpPct;
      this._taraHpFill.setFillStyle(hpPct > 0.5 ? 0x22aaee : hpPct > 0.25 ? 0xffcc00 : 0xff4444);
      this._taraHpText.setText(`${Math.ceil(p2.hp)}/${p2.maxHp}`);
      this._taraStamFill.scaleX = p2.stamina / p2.maxStamina;
    }

    if (data.boss && this._bossContainer.visible) {
      this._bossHpFill.scaleX = data.boss.getHpPct();
      this._bossPostureFill.scaleX = data.boss.getPosturePct();
    }
  }

  // ── Boss events ────────────────────────────────────────────────────────────

  _onBossEntered(data) {
    const { boss } = data;
    const name = boss.cfg.name.toUpperCase();
    const lore = boss.cfg.lore || '';

    // Reset intro elements
    this._introName.setText(name).setAlpha(0).setX(GAME_W / 2 - 80);
    this._introSub.setText(lore).setAlpha(0);
    this._introLineTop.setAlpha(0).setScaleX(0);
    this._introLineBot.setAlpha(0).setScaleX(0);
    this._introFade.setAlpha(0);
    this._introOverlay.setVisible(true);

    // 1. Fade in dark veil
    this.tweens.add({ targets: this._introFade, alpha: 0.88, duration: 380 });

    // 2. Slide name in from left
    this.tweens.add({
      targets: this._introName, x: GAME_W / 2, alpha: 1,
      duration: 520, delay: 220, ease: 'Power2.Out',
    });

    // 3. Decorative gold lines expand outward
    this.tweens.add({
      targets: [this._introLineTop, this._introLineBot],
      alpha: 0.9, scaleX: 1,
      duration: 600, delay: 360, ease: 'Power2.Out',
    });

    // 4. Lore subtitle fades in
    this.tweens.add({
      targets: this._introSub, alpha: 1,
      duration: 400, delay: 750,
    });

    // 5. After 2.8s fade out overlay, then slide bar up
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: [this._introFade, this._introName, this._introSub, this._introLineTop, this._introLineBot],
        alpha: 0, duration: 420,
        onComplete: () => {
          this._introOverlay.setVisible(false);
          this._showBossBar(boss);
        },
      });
    });
  }

  _showBossBar(boss) {
    this._bossName.setText(boss.cfg.name.toUpperCase());
    this._bossHpFill.scaleX  = 1;
    this._bossHpDelay.scaleX = 1;
    this._bossPostureFill.scaleX = 0;
    this._bossHpText.setText(`${boss.maxHp} / ${boss.maxHp}`);
    this._bossPhaseLabel.setText('').setAlpha(0);
    this._bossContainer.y = GAME_H + 200;
    this._bossContainer.setVisible(true);
    // Slide up from off-screen bottom
    this.tweens.add({
      targets: this._bossContainer, y: 0,
      duration: 520, ease: 'Back.Out',
    });
  }

  _onBossHpChanged(data) {
    const { boss } = data;
    if (!this._bossContainer.visible) return;

    const hpPct     = boss.getHpPct();
    const posturePct = boss.getPosturePct();

    // HP fill snaps immediately; ghost trails with delay
    this._bossHpFill.scaleX     = hpPct;
    this._bossPostureFill.scaleX = posturePct;
    this._bossHpText.setText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`);

    if (this._bossHpDelayTween) this._bossHpDelayTween.stop();
    this._bossHpDelayTween = this.tweens.add({
      targets: this._bossHpDelay, scaleX: hpPct,
      duration: 720, delay: 380, ease: 'Power2.In',
    });
  }

  _onBossPhase(data) {
    const label = data.label;

    // White flash
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0.6)
      .setOrigin(0.5).setDepth(9980);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 550,
      onComplete: () => flash.destroy(),
    });

    // Giant center phase text scales in
    const phaseTxt = this.add.text(GAME_W / 2, GAME_H / 2 - 44, label, {
      fontSize: '54px', color: '#ff4444', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 8, letterSpacing: 8,
    }).setOrigin(0.5).setDepth(9981).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: phaseTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 380, ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1400, () => {
          this.tweens.add({
            targets: phaseTxt, alpha: 0, y: phaseTxt.y - 30, duration: 440,
            onComplete: () => phaseTxt.destroy(),
          });
        });
      },
    });

    // Update phase label on the bar
    this._bossPhaseLabel.setText(label).setAlpha(1);
    this.tweens.add({ targets: this._bossPhaseLabel, alpha: 0, duration: 1800, delay: 2200 });
  }

  _onBossStaggered() {
    this._bossPostureFill.scaleX = 0;

    const txt = this.add.text(GAME_W / 2, GAME_H / 2 - 58, 'POSTURE BROKEN', {
      fontSize: '36px', color: '#ffaa00', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 6, letterSpacing: 5,
    }).setOrigin(0.5).setDepth(9982).setAlpha(0);

    const sub = this.add.text(GAME_W / 2, GAME_H / 2 - 16, '— VULNERABLE —', {
      fontSize: '17px', color: '#ffdd88', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9982).setAlpha(0);

    this.tweens.add({ targets: [txt, sub], alpha: 1, duration: 180 });
    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: [txt, sub], alpha: 0, y: '-=28',
        duration: 460,
        onComplete: () => { txt.destroy(); sub.destroy(); },
      });
    });
  }

  _onBossKilled() {
    // Slide bar off-screen after a beat
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: this._bossContainer, y: GAME_H + 200,
        duration: 640, ease: 'Power2.In',
        onComplete: () => {
          this._bossContainer.setVisible(false);
          this._bossContainer.y = GAME_H + 200;
        },
      });
    });

    // "ENEMY FELLED" text
    this.time.delayedCall(300, () => {
      const victor = this.add.text(GAME_W / 2, GAME_H / 2 - 64, 'ENEMY FELLED', {
        fontSize: '40px', color: '#ffd700', fontFamily: 'serif',
        stroke: '#000', strokeThickness: 7, letterSpacing: 8,
      }).setOrigin(0.5).setDepth(9983).setAlpha(0);

      this.tweens.add({
        targets: victor, alpha: 1, duration: 320,
        onComplete: () => {
          this.time.delayedCall(1600, () => {
            this.tweens.add({
              targets: victor, alpha: 0, y: victor.y - 36, duration: 540,
              onComplete: () => victor.destroy(),
            });
          });
        },
      });
    });
  }

  // ── Player events ──────────────────────────────────────────────────────────

  _onPlayerDamaged() {}

  _onPlayerDowned(data) {
    const name = data.player?.isP1 ? 'DHRUVA' : 'TARA';
    this.toast(`${name} IS DOWN! (12s)`, '#ff4444', 3000);
  }

  _onPlayerRevived(data) {
    const name = data.player?.isP1 ? 'DHRUVA' : 'TARA';
    this.toast(`${name} REVIVED!`, '#88ff88', 1500);
  }

  _onPerfectDodge() {
    this.toast('PERFECT DODGE!', '#ffff44', 1200);
  }

  _onQuestStarted(data) {
    this.toast('New Quest: ' + (data.quest?.title || ''), '#88aaff', 2000);
  }

  _onQuestCompleted(data) {
    this.toast('Quest Complete! ' + (data.quest?.title || ''), '#88ff88', 2500);
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────

  _showDialogue(data) {
    this._dialogueContainer.setVisible(true);
    this._dialogueText.setText(data.text || '');
  }

  _hideDialogue() {
    this._dialogueContainer.setVisible(false);
  }

  // ── Region title ───────────────────────────────────────────────────────────

  _showRegionTitle(data) {
    this._regionTitleText.setText(data.name);
    this._regionSubText.setText(data.subtitle || '');
    this._regionLabel.setText(data.name);
    this.tweens.add({
      targets: this._regionTitle, alpha: 1, duration: 400,
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({ targets: this._regionTitle, alpha: 0, duration: 400 });
        });
      },
    });
  }

  // ── Ability cooldowns ──────────────────────────────────────────────────────

  _onAbilityUsed(data) {
    const idx = ['Q', 'E', 'R'].indexOf(data.key);
    if (idx < 0 || !this._abilityIcons[idx]) return;
    const icon = this._abilityIcons[idx];
    icon.cdLeft = data.cd;
    icon.cdMax  = data.cd;

    if (!data.name) return;
    if (icon._nameText) { icon._nameText.destroy(); icon._nameText = null; }
    const nameText = this.add.text(icon.x, icon.y - 36, data.name, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(200);
    icon._nameText = nameText;
    this.tweens.add({
      targets: nameText, alpha: 0, y: icon.y - 54,
      duration: 1500, ease: 'Power2',
      onComplete: () => { nameText.destroy(); icon._nameText = null; },
    });
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  _showInventory(data) {
    this._refreshInventory({ saveData: data });
    this._invVisible = true;
    this._invPanel.setVisible(true);
  }

  _refreshQuestLog(gs) {
    const qm = gs.questManager;
    if (!qm) return;
    const lines = [];
    for (const [, q] of qm.active) {
      lines.push(`▶ ${q.title}`);
      if (q.desc) lines.push(`  ${q.desc.substring(0, 60)}...`);
    }
    for (const id of qm.completed) {
      lines.push(`✓ ${id.replace(/_/g, ' ')}`);
    }
    this._questText.setText(lines.join('\n') || 'No active quests.');
  }

  _refreshInventory(gs) {
    const items = gs?.saveData?.inventory || gs?.players?.[0]?.inventory || [];
    this._invText.setText(items.length ? items.join('\n') : 'No items yet.');
  }

  // ── Toast utility ──────────────────────────────────────────────────────────

  toast(text, color = '#ffffff', duration = 1500) {
    const t = this.add.text(0, 0, text, {
      fontSize: '18px', color, fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    const offsetY = -30 * this._toasts.length;
    t.setPosition(GAME_W / 2, GAME_H / 2 - 40 + offsetY);
    this._toasts.push(t);
    this.tweens.add({
      targets: t, y: t.y - 40, alpha: 0,
      duration, ease: 'Power1',
      onComplete: () => {
        const idx = this._toasts.indexOf(t);
        if (idx > -1) this._toasts.splice(idx, 1);
        t.destroy();
      },
    });
  }
}
