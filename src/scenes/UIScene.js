import { GAME_W, GAME_H, ITEM_DEFS, XP_THRESHOLDS, POINTS_PER_LEVEL, POINT_PCT } from '../constants.js';

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

    this._createCheatConsole();
    this._createVignette();

    this._statTiers = { ...(this.scene.get('GameScene')?._save?.statTiers || {}) };
    this._statPoints = this.scene.get('GameScene')?._save?.statPoints || 0; // banked, unspent points
    this._levelUpActive = false;

    this._keyEsc       = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._keyHome      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.HOME);
    this._keyBackspace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this._keyU    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this._keyI    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this._keyM    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this._keyF11  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F11);
    this._keyR    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this._keyF    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this._youDiedActive      = false;
    this._youDiedRetryRegion = null;

    const gs = this.scene.get('GameScene');
    gs.events.on('boss_entered',       this._onBossEntered,    this);
    gs.events.on('boss_hp_changed',    this._onBossHpChanged,  this);
    gs.events.on('boss_phase_changed', this._onBossPhase,      this);
    gs.events.on('boss_staggered',     this._onBossStaggered,  this);
    gs.events.on('boss_killed',        this._onBossKilled,     this);
    gs.events.on('boss_armor_changed', this._onBossArmorChanged, this);
    gs.events.on('boss_armor_broken',  this._onBossArmorBroken,  this);
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
    gs.events.on('game_over',          this._onGameOver,       this);
    gs.events.on('lore_collected',     this._onLoreCollected,  this);
    gs.events.on('revival_prompt',     this._onRevivalPrompt,  this);
    gs.events.on('revival_progress',   this._onRevivalProgress, this);
    gs.events.on('level_up_available', this._onLevelUpAvailable, this);
    gs.events.on('kill_combo',         this._onKillCombo,       this);
    gs.events.on('status_flash',       this._onStatusFlash,     this);
    gs.events.on('item_acquired',      this._onItemAcquired,    this);
    gs.events.on('xp_changed',         this._onXpChanged,       this);
    gs.events.on('amrit_changed',      this._onAmritChanged,    this);

    // Cache lore fragment data for the lore tab
    import('/src/data/quests.js').then(m => { this._loreFragCache = m.LORE_FRAGMENTS; });
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

    // Amrit flask pips (one row per player, below the bars)
    this.add.text(pad, 49, '⚕', { fontSize: '10px', color: '#ffcc44', fontFamily: 'monospace' }).setOrigin(0, 0);
    this.add.text(tx,  49, '⚕', { fontSize: '10px', color: '#ffcc44', fontFamily: 'monospace' }).setOrigin(0, 0);
    this._dhruvaAmritPips = this.add.container(pad + 14, 54);
    this._taraAmritPips   = this.add.container(tx  + 14, 54);
    this._renderAmritPips(this._dhruvaAmritPips, 4, 4);
    this._renderAmritPips(this._taraAmritPips,   4, 4);

    this._regionLabel = this.add.text(GAME_W - pad, 10, 'Region 0', {
      fontSize: '13px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    this._loreLabel = this.add.text(GAME_W - pad, 36, '◈ 0 / 20', {
      fontSize: '10px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    this.add.text(GAME_W - pad, 52,
      '[J] Atk [K] Heavy [Q/E/R] Ability [Shift] Dodge [F] Talk/Use [I] Inv [U] Quests', {
        fontSize: '9px', color: '#666', fontFamily: 'monospace',
      }).setOrigin(1, 0.5);

    // XP bar and level badge (below Dhruva's stamina bar)
    const xpBarX = pad, xpBarY = 54, xpBarW = 120, xpBarH = 5;
    this.add.rectangle(xpBarX + xpBarW / 2, xpBarY, xpBarW, xpBarH, 0x222222).setOrigin(0.5, 0.5);
    this._xpBarFill = this.add.rectangle(xpBarX, xpBarY, 0, xpBarH, 0x9966ff).setOrigin(0, 0.5);
    this._levelLabel = this.add.text(xpBarX + xpBarW + 4, xpBarY, 'LVL 1', {
      fontSize: '9px', color: '#bb99ff', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
  }

  // ── Boss bar (Dark Souls style) ────────────────────────────────────────────

  _createBossBar() {
    const nameY = GAME_H - 108;
    const loreY = GAME_H - 91;   // tight gap below name
    const hpY   = GAME_H - 74;
    const postY = GAME_H - 46;
    const barH  = 14;
    const postH = 12;

    // Starts off-screen below; slides up on boss_entered
    this._bossContainer = this.add.container(0, GAME_H + 200).setVisible(false);

    // Boss name — centered, gold serif
    this._bossName = this.add.text(GAME_W / 2, nameY, '', {
      fontSize: '22px', color: '#f0d890', fontFamily: 'serif',
      stroke: '#000000', strokeThickness: 5,
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Subtitle / lore tagline — small italic, tight below name
    this._bossSubtitle = this.add.text(GAME_W / 2, loreY, '', {
      fontSize: '11px', color: '#9a8a6a', fontFamily: 'serif', fontStyle: 'italic',
      stroke: '#000000', strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Phase label — kept for code compatibility, invisible
    this._bossPhaseLabel = this.add.text(GAME_W - 32, nameY, '', {
      fontSize: '13px', color: '#ff8888', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setAlpha(0);

    // Gold border behind bar (Elden Ring gold outline)
    this._bossHpBorder = this.add.rectangle(BAR_L - 1, hpY, BAR_W + 2, barH + 2, 0x8a6a3a).setOrigin(0, 0.5);

    // HP bar stack (bg → ghost → fill)
    this._bossHpBg     = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0x150808).setOrigin(0, 0.5);
    this._bossHpDelay  = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0x882200).setOrigin(0, 0.5);
    this._bossHpFill   = this.add.rectangle(BAR_L, hpY, BAR_W, barH, 0xdd2020).setOrigin(0, 0.5);

    // Gold diamond gems at each end of bar (Elden Ring style)
    this._bossGemL = this.add.rectangle(BAR_L - 7,       hpY, 10, 10, 0xc8a96e).setRotation(Math.PI / 4);
    this._bossGemR = this.add.rectangle(BAR_L + BAR_W + 7, hpY, 10, 10, 0xc8a96e).setRotation(Math.PI / 4);

    // HP number centered on bar
    this._bossHpText = this.add.text(GAME_W / 2, hpY, '', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(1);

    // Posture bar — kept for code compatibility, invisible
    this._bossPostureBg   = this.add.rectangle(POST_L, postY, POST_W, postH, 0x111111).setOrigin(0, 0.5).setVisible(false);
    this._bossPostureFill = this.add.rectangle(POST_L, postY, POST_W, postH, 0xff8800).setOrigin(0, 0.5).setVisible(false);

    // Stone armor bar — kept for code compatibility, invisible
    const armorY = GAME_H - 30;
    this._bossArmorLabel = this.add.text(30, armorY, 'STONE ARMOR', { fontSize: '7px', color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0, 0.5).setVisible(false);
    this._bossArmorBg    = this.add.rectangle(POST_L, armorY, POST_W, postH, 0x111111).setOrigin(0, 0.5).setVisible(false);
    this._bossArmorFill  = this.add.rectangle(POST_L, armorY, POST_W, postH, 0x999999).setOrigin(0, 0.5).setVisible(false);

    this._bossContainer.add([
      this._bossName, this._bossSubtitle, this._bossPhaseLabel,
      this._bossHpBorder, this._bossHpBg, this._bossHpDelay, this._bossHpFill,
      this._bossGemL, this._bossGemR,
      this._bossHpText,
      this._bossPostureBg, this._bossPostureFill,
      this._bossArmorLabel, this._bossArmorBg, this._bossArmorFill,
    ]);

    this._bossHpDelayTween = null;
    this._createBossIntroOverlay();
  }

  _createBossIntroOverlay() {
    // Full-screen overlay that plays before boss bar appears
    this._introOverlay = this.add.container(0, 0).setDepth(9990).setVisible(false);

    const fade    = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0);
    const lineTop = this.add.rectangle(GAME_W / 2, GAME_H / 2 - 58, 660, 2, 0xaa8833, 0).setOrigin(0.5).setScale(0, 1);
    const lineBot = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 60, 660, 2, 0xaa8833, 0).setOrigin(0.5).setScale(0, 1);

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
    const dh = 160, dy = GAME_H - dh - 4;
    this._dialogueContainer = this.add.container(0, 0).setVisible(false).setDepth(9999);

    const bg     = this.add.rectangle(0, dy, GAME_W, dh + 4, 0x0a0a14, 0.96).setOrigin(0, 0);
    const topBar = this.add.rectangle(0, dy, GAME_W, 3, 0xffd700, 1).setOrigin(0, 0);
    const botBar = this.add.rectangle(0, dy + dh + 1, GAME_W, 3, 0xffd700, 0.4).setOrigin(0, 0);

    this._dialogueText = this.add.text(24, dy + 14, '', {
      fontSize: '17px', color: '#ffe8a0', fontFamily: 'serif',
      wordWrap: { width: GAME_W - 48 }, lineSpacing: 8,
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
      fontSize: '9px', color: '#ddaa66', fontFamily: "'Silkscreen', monospace",
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
        fontSize: '11px', fontStyle: 'bold', color: '#' + colors[i].toString(16).padStart(6, '0'),
        fontFamily: "'Silkscreen', monospace",
      }).setOrigin(0.5);
      const cd = this.add.text(x, y, '–', { fontSize: '12px', color: '#ccc', fontFamily: 'monospace' }).setOrigin(0.5);
      this._abilityIcons.push({ bg, border, cd, x, y, cdLeft: 0, cdMax: 1, _lastCdText: null, _lastAlpha: -1 });
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

    this._loreDivider = this.add.text(12, 240, '── LORE FRAGMENTS ──────────────', {
      fontSize: '9px', color: '#664400', fontFamily: 'monospace',
    });
    this._loreCountLabel = this.add.text(12, 254, '0 / 20 collected', {
      fontSize: '9px', color: '#997744', fontFamily: 'monospace',
    });
    this._loreFragTitles = this.add.text(12, 268, '', {
      fontSize: '9px', color: '#ccaa77', fontFamily: 'monospace',
      wordWrap: { width: pw - 24 }, lineSpacing: 2,
    });

    panel.add([bg, border, title, close, this._questText, this._loreDivider, this._loreCountLabel, this._loreFragTitles]);
    return panel;
  }

  _createInventoryPanel() {
    const pw = 300, ph = 320;
    const panel = this.add.container(GAME_W / 2 - pw / 2, GAME_H / 2 - ph / 2);

    const bg     = this.add.rectangle(0, 0, pw, ph, 0x1a1000, 0.96).setOrigin(0, 0);
    const border = this.add.rectangle(0, 0, pw, ph, 0xcc9933, 0).setOrigin(0, 0).setStrokeStyle(2, 0xcc9933);
    const title  = this.add.text(pw / 2, 10, 'INVENTORY', { fontSize: '14px', fontStyle: 'bold', color: '#ffd700', fontFamily: 'serif' }).setOrigin(0.5, 0);
    const close  = this.add.text(pw - 10, 10, '[I] close', { fontSize: '10px', color: '#666', fontFamily: 'monospace' }).setOrigin(1, 0);

    this._invText = this.add.text(12, 36, 'No items yet.', {
      fontSize: '11px', color: '#ddcc99', fontFamily: 'monospace',
      wordWrap: { width: pw - 24 }, lineSpacing: 6,
    });

    this._invUseHint = this.add.text(pw / 2, ph - 14, '', {
      fontSize: '10px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    panel.add([bg, border, title, close, this._invText, this._invUseHint]);
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
        const alpha = 0.25 + 0.75 * (1 - pct);
        if (alpha !== icon._lastAlpha) { icon.border.setAlpha(alpha); icon._lastAlpha = alpha; }
        // Only re-layout the text texture when the rendered value (0.1s steps) changes.
        const txt = icon.cdLeft > 0 ? (icon.cdLeft / 1000).toFixed(1) : '–';
        if (txt !== icon._lastCdText) { icon.cd.setText(txt); icon._lastCdText = txt; }
      } else {
        if (icon._lastCdText !== '–') { icon.cd.setText('–'); icon._lastCdText = '–'; }
        if (icon._lastAlpha !== 0.5) { icon.border.setAlpha(0.5); icon._lastAlpha = 0.5; }
      }
    }

    // YOU DIED input — takes priority over all other keys
    if (this._youDiedRetryRegion !== null) {
      if (Phaser.Input.Keyboard.JustDown(this._keyR)) {
        this._youDiedRetryRegion = null;
        this.scene.get('GameScene')?.respawnAfterDeath();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this._keyEsc)) {
        this._youDiedRetryRegion = null;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('UIScene');
          this.scene.stop('GameScene');
          this.scene.start('MainMenuScene');
        });
        return;
      }
    }

    const escDown       = Phaser.Input.Keyboard.JustDown(this._keyEsc);
    const homeDown      = Phaser.Input.Keyboard.JustDown(this._keyHome);
    const backspaceDown = Phaser.Input.Keyboard.JustDown(this._keyBackspace);
    if (escDown || homeDown || backspaceDown) {
      if (this._questVisible) { this._questPanel.setVisible(false); this._questVisible = false; }
      else if (this._invVisible) { this._invPanel.setVisible(false); this._invVisible = false; }
      else if (!this._levelUpActive && !backspaceDown) this.scene.get('GameScene')?.togglePause();
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyU)) {
      this._questVisible = !this._questVisible;
      this._questPanel.setVisible(this._questVisible);
      if (this._questVisible) {
        this._refreshQuestLog(gs);
        this._refreshLoreTab(gs);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyI)) {
      this._invVisible = !this._invVisible;
      this._invPanel.setVisible(this._invVisible);
      if (this._invVisible) this._refreshInventory(gs);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyF) && this._invVisible) {
      this._useFirstConsumable(gs);
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyM)) {
      gs.audio?.toggleMute();
    }
    if (Phaser.Input.Keyboard.JustDown(this._keyF11)) {
      this._toggleFullscreen();
    }

    // Low-HP vignette pulse
    const localP = gs?.players?.find(p => p?.isLocal) || gs?.players?.[0];
    if (localP && localP.alive && this._hpVignette) {
      const hpPct = localP.hp / localP.maxHp;
      let target;
      if (hpPct < 0.3) {
        this._vigPulse = (this._vigPulse || 0) + delta * 0.0028;
        const pulse = Math.abs(Math.sin(this._vigPulse));
        const base  = (0.3 - hpPct) * 0.85;
        target = base * (0.35 + pulse * 0.65);
      } else {
        target = 0;
        this._vigPulse = 0;
      }
      // Skip the setAlpha (and its render flag dirtying) when nothing visibly changed.
      if (this._vigLastAlpha === undefined || Math.abs(target - this._vigLastAlpha) > 0.01) {
        this._hpVignette.setAlpha(target);
        this._vigLastAlpha = target;
      }
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
    this._introSub.setText(boss.cfg.subtitle || lore).setAlpha(0);
    this._introLineTop.setAlpha(0).setScale(0, 1);
    this._introLineBot.setAlpha(0).setScale(0, 1);
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
    this._bossSubtitle.setText(boss.cfg.subtitle || '');
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
    const { boss, phase } = data;
    const phaseLine = boss?.cfg?.phaseLines?.[phase];
    const isFullLine = boss?.cfg?.isFinal && phaseLine;

    // White flash
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0.6)
      .setOrigin(0.5).setDepth(9980);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 550,
      onComplete: () => flash.destroy(),
    });

    if (isFullLine) {
      // Final boss: show full dialogue line in the bottom dialogue box
      const gs = this.scene.get('GameScene');
      gs.events.emit('show_dialogue', { text: phaseLine });
      this.time.delayedCall(3500, () => gs.events.emit('hide_dialogue'));
      this._bossPhaseLabel.setText('').setAlpha(0);
      return;
    }

    // All other bosses: short atmospheric label
    const label = phaseLine || data.label;
    if (!label) return;

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

    this._bossPhaseLabel.setText(label).setAlpha(1);
    this.tweens.add({ targets: this._bossPhaseLabel, alpha: 0, duration: 1800, delay: 2200 });
  }

  _onBossArmorChanged(data) {
    const { boss } = data;
    const pct = boss.stoneArmor / boss.maxStoneArmor;
    this._bossArmorLabel.setVisible(true);
    this._bossArmorBg.setVisible(true);
    this._bossArmorFill.setVisible(true).setScaleX(Math.max(0, pct));
  }

  _onBossArmorBroken() {
    this._bossArmorFill.setScaleX(0);
    this.toast('STONE ARMOR BROKEN!', '#aaaaff', 2000);

    // Flash the armor bar grey then hide after a moment
    this.tweens.add({
      targets: [this._bossArmorBg, this._bossArmorFill, this._bossArmorLabel],
      alpha: 0, duration: 800, delay: 600,
      onComplete: () => {
        this._bossArmorLabel.setVisible(false).setAlpha(1);
        this._bossArmorBg.setVisible(false).setAlpha(1);
        this._bossArmorFill.setVisible(false).setAlpha(1);
      },
    });
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

  _onBossKilled(data) {
    const boss = data?.boss;

    if (boss?.cfg?.isFinal) {
      // Final boss — show defeat speech; GameScene handles scene transition at 8s
      this._showViyogasurDefeatSpeech(boss.cfg.defeatLines || []);
      return;
    }

    // Normal boss — slide bar off and show "ENEMY FELLED"
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

  _showViyogasurDefeatSpeech(lines) {
    // Slide boss bar off first
    this.tweens.add({
      targets: this._bossContainer, y: GAME_H + 200,
      duration: 600, ease: 'Power2.In',
      onComplete: () => { this._bossContainer.setVisible(false); },
    });

    const depth = 9990;
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0)
      .setOrigin(0).setDepth(depth);
    this.tweens.add({ targets: veil, alpha: 0.85, duration: 1000 });

    let delay = 1200;
    for (const line of lines) {
      this.time.delayedCall(delay, () => {
        const t = this.add.text(GAME_W / 2, GAME_H / 2, line, {
          fontSize: '17px', color: '#ddcc99', fontFamily: 'serif',
          align: 'center', wordWrap: { width: 700 }, lineSpacing: 5,
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
        this.tweens.add({
          targets: t, alpha: 1, duration: 600,
          onComplete: () => {
            this.time.delayedCall(2000, () => {
              this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() });
            });
          },
        });
      });
      delay += 3200;
    }
  }

  _onLoreCollected(data) {
    if (this._loreLabel) {
      this._loreLabel.setText(`◈ ${data.count} / ${data.total}`);
    }
  }

  // ── Player events ──────────────────────────────────────────────────────────

  _onPlayerDamaged() {}

  _onPlayerDowned(data) {
    const name = (data.player?.charKey || (data.player?.isP1 ? 'dhruva' : 'tara')).toUpperCase();
    this.toast(`${name} IS DOWN!  Hold [F] to revive`, '#ff4444', 4000);
  }

  _onPlayerRevived(data) {
    const name = (data.player?.charKey || (data.player?.isP1 ? 'dhruva' : 'tara')).toUpperCase();
    this.toast(`${name} REVIVED!`, '#88ff88', 1500);
  }

  _onPerfectDodge() {
    this.toast('PERFECT DODGE!', '#ffff44', 1200);
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x00ffff, 0.22)
      .setOrigin(0.5).setDepth(9975);
    this.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
  }

  _onRevivalPrompt(data) {
    if (!this._revivalPromptText) {
      this._revivalPromptText = this.add.text(GAME_W / 2, GAME_H - 158, 'Hold [F] to revive ally', {
        fontSize: '15px', color: '#88ff88', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9900).setVisible(false);
    }
    this._revivalPromptText.setVisible(!!data?.show);
  }

  _onRevivalProgress(data) {
    const progress = data?.progress ?? 0;
    if (!this._revivalBarBg) {
      const bw = 200;
      this._revivalBarBg   = this.add.rectangle(GAME_W / 2, GAME_H - 140, bw, 10, 0x333333)
        .setOrigin(0.5).setDepth(9901).setVisible(false);
      this._revivalBarFill = this.add.rectangle(GAME_W / 2 - bw / 2, GAME_H - 140, bw, 10, 0x44ff88)
        .setOrigin(0, 0.5).setDepth(9902).setVisible(false);
    }
    const show = progress > 0;
    this._revivalBarBg.setVisible(show);
    this._revivalBarFill.setVisible(show);
    if (show) this._revivalBarFill.scaleX = progress;
    if (!show && this._revivalPromptText) this._revivalPromptText.setVisible(false);
  }

  _onLevelUpAvailable(data) {
    const gs = this.scene.get('GameScene');
    if (!gs) return;
    if (this._levelUpActive) return;
    this._levelUpActive = true;

    // Grant points for every banked level at once, so the player allocates
    // a single pool instead of re-opening the panel per level.
    const levels = Math.max(1, gs._pendingLevels || 0);
    this._statPoints += levels * POINTS_PER_LEVEL;
    this._levelsConsumed = levels;

    // Quick toast, then pause physics one frame later so the toast renders first.
    this.toast(`⚔  LEVEL UP!  ${this._statPoints} points to spend`, '#ffd700', 1800);
    this.time.delayedCall(16, () => {
      gs._paused = true;
      gs.physics?.pause();
    });

    const depth = 9993;
    const stats = [
      { stat: 'maxHp',      label: 'VITALITY',  blurb: 'Max HP' },
      { stat: 'stamina',    label: 'ENDURANCE', blurb: 'Stamina' },
      { stat: 'abilityPow', label: 'POWER',     blurb: 'Ability Power' },
    ];

    // Points spent this session per stat — used to allow refunds before closing.
    const sessionSpent = { maxHp: 0, stamina: 0, abilityPow: 0 };
    let selected = 0;
    let closed = false;

    // Veil
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0).setDepth(depth);
    this.tweens.add({ targets: veil, alpha: 0.82, duration: 120 });

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 150, '⚔  LEVEL UP', {
      fontSize: '36px', color: '#ffd700', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 6, letterSpacing: 6,
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 150, delay: 60 });

    // Available-points readout
    const pointsLabel = this.add.text(GAME_W / 2, GAME_H / 2 - 104, '', {
      fontSize: '16px', color: '#ffe8a0', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    this.tweens.add({ targets: pointsLabel, alpha: 1, duration: 150, delay: 90 });

    // One row per stat
    const rowH = 64, rowW = 460;
    const rowObjs = [];
    for (let i = 0; i < stats.length; i++) {
      const s  = stats[i];
      const ry = GAME_H / 2 - 56 + i * (rowH + 8);

      const bg = this.add.rectangle(GAME_W / 2, ry, rowW, rowH, 0x1a1000, 0.92)
        .setDepth(depth + 1).setAlpha(0).setStrokeStyle(2, 0x886633)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add.text(GAME_W / 2 - rowW / 2 + 18, ry - 12, s.label, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'serif', fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(depth + 2).setAlpha(0);
      const val = this.add.text(GAME_W / 2 - rowW / 2 + 18, ry + 14, '', {
        fontSize: '12px', color: '#ccaa77', fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setDepth(depth + 2).setAlpha(0);
      // Pip strip showing total invested tiers
      const pips = this.add.text(GAME_W / 2 + rowW / 2 - 18, ry, '', {
        fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(1, 0.5).setDepth(depth + 2).setAlpha(0);

      const rowIdx = i;
      bg.on('pointerover', () => { selected = rowIdx; render(); });
      bg.on('pointerdown', () => { selected = rowIdx; spend(); });

      this.tweens.add({ targets: [bg, lbl, val, pips], alpha: 1, duration: 180, delay: 110 + i * 40 });
      rowObjs.push({ bg, lbl, val, pips, ...s });
    }

    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 150,
      '[↑/↓] Select   [→ / Enter] Spend   [←] Refund   [ESC] Done', {
        fontSize: '12px', color: '#aa8855', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 150, delay: 160 });

    const allObjs = [veil, title, pointsLabel, hint, ...rowObjs.flatMap(r => [r.bg, r.lbl, r.val, r.pips])];

    const render = () => {
      pointsLabel.setText(`Available Points: ${this._statPoints}`);
      pointsLabel.setColor(this._statPoints > 0 ? '#ffe8a0' : '#888888');
      for (let i = 0; i < rowObjs.length; i++) {
        const r = rowObjs[i];
        const tier = this._statTiers?.[r.stat] || 0;
        r.val.setText(`+${tier * POINT_PCT}%  ${r.blurb}`);
        r.pips.setText('◆'.repeat(Math.min(tier, 20)) || '–');
        const isSel = i === selected;
        r.bg.setStrokeStyle(isSel ? 3 : 2, isSel ? 0xffd700 : 0x886633);
        r.bg.setFillStyle(isSel ? 0x2a1c08 : 0x1a1000, isSel ? 0.96 : 0.92);
      }
    };

    const spend = () => {
      if (closed || this._statPoints <= 0) {
        if (this._statPoints <= 0) this.tweens.add({ targets: pointsLabel, alpha: 0.4, duration: 80, yoyo: true });
        return;
      }
      const r = rowObjs[selected];
      const tier = (this._statTiers?.[r.stat] || 0) + 1;
      this._statTiers[r.stat] = tier;
      this._statPoints--;
      sessionSpent[r.stat]++;
      gs.players?.forEach(p => p?.applyStat?.(r.stat, tier));
      this.tweens.add({ targets: r.pips, scale: 1.4, duration: 70, yoyo: true });
      render();
    };

    const refund = () => {
      if (closed) return;
      const r = rowObjs[selected];
      if (sessionSpent[r.stat] <= 0) return; // can't refund points from past levels
      const tier = Math.max(0, (this._statTiers?.[r.stat] || 0) - 1);
      this._statTiers[r.stat] = tier;
      this._statPoints++;
      sessionSpent[r.stat]--;
      gs.players?.forEach(p => p?.applyStat?.(r.stat, tier));
      render();
    };

    const close = () => {
      if (closed) return;
      closed = true;
      keys.forEach(k => { k.removeAllListeners('down'); k.destroy(); });
      rowObjs.forEach(r => r.bg.disableInteractive());
      this.tweens.add({
        targets: allObjs, alpha: 0, duration: 200,
        onComplete: () => {
          allObjs.forEach(o => { try { o.destroy(); } catch {} });
          this._levelUpActive = false;
          gs._paused = false;
          gs.physics?.resume();
          // Consume all banked levels at once and persist the new point pool.
          gs.events.emit('level_up_done', { levels: this._levelsConsumed });
        },
      });
    };

    render();

    // Keyboard bindings — bound after a short delay so the toast's keypress
    // (if any) doesn't leak into the panel.
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kUp    = this.input.keyboard.addKey(KC.UP);
    const kDown  = this.input.keyboard.addKey(KC.DOWN);
    const kW     = this.input.keyboard.addKey(KC.W);
    const kS     = this.input.keyboard.addKey(KC.S);
    const kRight = this.input.keyboard.addKey(KC.RIGHT);
    const kLeft  = this.input.keyboard.addKey(KC.LEFT);
    const kEnter = this.input.keyboard.addKey(KC.ENTER);
    const kSpace = this.input.keyboard.addKey(KC.SPACE);
    const kEsc   = this.input.keyboard.addKey(KC.ESC);
    const keys = [kUp, kDown, kW, kS, kRight, kLeft, kEnter, kSpace, kEsc];

    this.time.delayedCall(180, () => {
      if (closed) return;
      const moveUp   = () => { selected = (selected + stats.length - 1) % stats.length; render(); };
      const moveDown = () => { selected = (selected + 1) % stats.length; render(); };
      kUp.on('down', moveUp);     kW.on('down', moveUp);
      kDown.on('down', moveDown); kS.on('down', moveDown);
      kRight.on('down', spend);   kEnter.on('down', spend);  kSpace.on('down', spend);
      kLeft.on('down', refund);
      kEsc.on('down', close);
    });
  }

  _onQuestStarted(data) {
    this.toast('New Quest: ' + (data.quest?.title || ''), '#88aaff', 2000);
  }

  _onQuestCompleted(data) {
    this.toast('Quest Complete! ' + (data.quest?.title || ''), '#88ff88', 2500);
  }

  _onItemAcquired(data) {
    const name = data.name || data.itemId;
    this.toast(`Item: ${name} obtained!`, '#ffd700', 2500);
  }

  _onXpChanged(data) {
    if (!this._xpBarFill || !this._levelLabel) return;
    const { xp, level, threshold } = data;
    const maxXp = threshold ?? XP_THRESHOLDS[level - 1] ?? 1;
    const targetW = Math.min(120, Math.floor((xp / maxXp) * 120));
    this.tweens.add({ targets: this._xpBarFill, width: targetW, duration: 300, ease: 'Power1.Out' });
    this._levelLabel.setText(`LVL ${level}`);
  }

  _renderAmritPips(container, charges, max) {
    if (!container) return;
    container.removeAll(true);
    const pw = 7, ph = 9, gap = 3;
    for (let i = 0; i < max; i++) {
      const filled = i < charges;
      container.add(this.add.rectangle(i * (pw + gap), 0, pw, ph, filled ? 0xffcc44 : 0x4a3a18)
        .setOrigin(0, 0).setStrokeStyle(1, 0x2a1e08));
    }
  }

  _onAmritChanged(data) {
    const gs = this.scene.get('GameScene');
    const players = gs?.players || [];
    const p = data?.player;
    const isP1 = p ? (p === players[0]) : null;
    if (isP1 === false) this._renderAmritPips(this._taraAmritPips, p.amritCharges, p.amritMax);
    else if (p)         this._renderAmritPips(this._dhruvaAmritPips, p.amritCharges, p.amritMax);
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

  _refreshLoreTab(gs) {
    const lm = gs?.loreManager;
    if (!lm || !this._loreFragTitles) return;
    this._loreCountLabel.setText(`${lm.count()} / ${lm.total()} collected`);
    if (!this._loreFragCache) {
      this._loreFragTitles.setText('Loading...');
      return;
    }
    const lines = this._loreFragCache
      .filter(f => lm.has(f.id))
      .map(f => `◈ ${f.title}`);
    this._loreFragTitles.setText(lines.join('\n') || 'None found yet.');
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
    const items = gs?.saveData?.inventory || [];
    if (!items.length) {
      this._invText.setText('No items yet.');
      this._invUseHint?.setText('');
      return;
    }
    const lines = [];
    let hasConsumable = false;
    const seen = {};
    for (const id of items) {
      seen[id] = (seen[id] || 0) + 1;
    }
    const listed = [];
    for (const [id, count] of Object.entries(seen)) {
      if (listed.includes(id)) continue;
      listed.push(id);
      const def = ITEM_DEFS[id];
      if (!def) { lines.push(`• ${id}`); continue; }
      const typeTag = def.type === 'consumable' ? '[use]' : def.type === 'passive' ? '[passive]' : '[token]';
      const countStr = count > 1 ? ` ×${count}` : '';
      lines.push(`• ${def.name}${countStr}  ${typeTag}`);
      lines.push(`  ${def.desc}`);
      if (def.type === 'consumable') hasConsumable = true;
    }
    this._invText.setText(lines.join('\n'));
    this._invUseHint?.setText(hasConsumable ? '[F] Use first consumable' : '');
  }

  _useFirstConsumable(gs) {
    const saveData = gs?.saveData;
    if (!saveData?.inventory?.length) return;
    const idx = saveData.inventory.findIndex(id => ITEM_DEFS[id]?.type === 'consumable');
    if (idx === -1) return;
    const itemId = saveData.inventory[idx];
    const def = ITEM_DEFS[itemId];
    const player = gs?.players?.find(p => p?.alive) || gs?.players?.[0];
    if (!player) return;

    if (def.effect.stat === 'hp') {
      player.hp = Math.min(player.maxHp, player.hp + def.effect.amount);
      player._updateHpBar?.();
    } else if (def.effect.stat === 'stamina') {
      player.stamina = Math.min(player.maxStamina, player.stamina + def.effect.amount);
    }

    import('../systems/SaveManager.js').then(m => {
      m.SaveManager.removeItem(saveData, itemId);
      m.SaveManager.save(saveData);
    });

    this.toast(`Used ${def.name} — ${def.desc}`, '#88ff88', 2500);
    this.time.delayedCall(50, () => this._refreshInventory(gs));
  }

  // ── YOU DIED screen ────────────────────────────────────────────────────────

  _onGameOver(data) {
    const regionIndex = data?.regionIndex ?? 0;

    // Layer order: overlay → divider lines → main text → subtitle → hint
    const depth = 9995;

    // Full-screen black veil
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0).setDepth(depth);
    this.tweens.add({ targets: veil, alpha: 0.88, duration: 1100, ease: 'Power2.In' });

    // Thin blood-red horizontal lines flanking the text
    const lineL = this.add.rectangle(GAME_W / 2 - 320, GAME_H / 2 - 2, 260, 1, 0x880000, 0)
      .setOrigin(1, 0.5).setDepth(depth + 1);
    const lineR = this.add.rectangle(GAME_W / 2 + 320, GAME_H / 2 - 2, 260, 1, 0x880000, 0)
      .setOrigin(0, 0.5).setDepth(depth + 1);
    this.tweens.add({ targets: [lineL, lineR], alpha: 0.6, duration: 600, delay: 1400 });

    // "YOU DIED" — large, blood red, fades in slowly with slight scale
    const mainTxt = this.add.text(GAME_W / 2, GAME_H / 2 - 4, 'YOU DIED', {
      fontSize: '72px', color: '#cc1111', fontFamily: 'serif',
      stroke: '#220000', strokeThickness: 8,
      letterSpacing: 12,
    }).setOrigin(0.5).setDepth(depth + 2).setAlpha(0).setScale(1.08);

    this.tweens.add({
      targets: mainTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 2200, delay: 300, ease: 'Power2.Out',
    });

    // Subtitle — return to the last Thread Shrine
    const hintTxt = this.add.text(GAME_W / 2, GAME_H / 2 + 54, '[R]  Return to last Shrine      [ESC]  Main Menu', {
      fontSize: '14px', color: '#886666', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(depth + 2).setAlpha(0);

    this.tweens.add({ targets: hintTxt, alpha: 1, duration: 500, delay: 1800 });

    // Key handler — fires once after hint appears; auto-respawns at the shrine.
    this._youDiedActive = true;
    this.time.delayedCall(1800, () => {
      this._youDiedRetryRegion = regionIndex;

      // Auto-respawn at the last shrine after a beat if no key pressed
      this.time.delayedCall(2600, () => {
        if (this._youDiedRetryRegion === null) return; // already handled
        this._youDiedRetryRegion = null;
        this.scene.get('GameScene')?.respawnAfterDeath();
      });
    });
  }

  // ── Low-HP vignette ────────────────────────────────────────────────────────

  _createVignette() {
    this._hpVignette = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xff0000, 0)
      .setDepth(9968).setScrollFactor(0);
    this._vigPulse = 0;
  }

  // ── Cheat console ──────────────────────────────────────────────────────────

  _createCheatConsole() {
    this._cheatOpen  = false;
    this._cheatInput = '';

    const cw = 320, ch = 36;
    this._cheatContainer = this.add.container(GAME_W / 2, GAME_H / 2 - 60)
      .setVisible(false).setDepth(9998);
    const bg     = this.add.rectangle(0, 0, cw, ch, 0x000000, 0.88).setOrigin(0.5);
    const border = this.add.rectangle(0, 0, cw, ch, 0x00ff88, 0).setOrigin(0.5).setStrokeStyle(1, 0x00ff88);
    const label  = this.add.text(-cw / 2 + 10, -6, 'CHEAT', {
      fontSize: '8px', color: '#00aa55', fontFamily: 'monospace',
    }).setOrigin(0, 0);
    this._cheatInputText = this.add.text(-cw / 2 + 10, 6, '> _', {
      fontSize: '13px', color: '#00ff88', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this._cheatContainer.add([bg, border, label, this._cheatInputText]);

    // Active-cheat badges shown below the region label
    this._cheatBadge = this.add.text(GAME_W - 12, 68, '', {
      fontSize: '9px', color: '#00ff88', fontFamily: 'monospace', align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    this.input.keyboard.on('keydown', (event) => {
      if (!this._cheatOpen) {
        if (event.keyCode === 191) {  // '/'
          event.stopPropagation?.();
          this._openCheatConsole();
        }
        return;
      }
      event.stopPropagation?.();
      if (event.keyCode === 13) {           // Enter
        this._processCheat(this._cheatInput.trim().toLowerCase());
        this._closeCheatConsole();
      } else if (event.keyCode === 27) {    // Escape
        this._closeCheatConsole();
      } else if (event.keyCode === 8) {     // Backspace
        this._cheatInput = this._cheatInput.slice(0, -1);
        this._cheatInputText.setText('> ' + this._cheatInput + '_');
      } else if (event.key.length === 1) {
        this._cheatInput += event.key;
        this._cheatInputText.setText('> ' + this._cheatInput + '_');
      }
    });
  }

  _openCheatConsole() {
    this._cheatOpen  = true;
    this._cheatInput = '';
    this._cheatInputText.setText('> _');
    this._cheatContainer.setVisible(true);
    const gs = this.scene.get('GameScene');
    if (gs) gs.cheatConsoleOpen = true;
  }

  _closeCheatConsole() {
    this._cheatOpen = false;
    this._cheatContainer.setVisible(false);
    const gs = this.scene.get('GameScene');
    if (gs) gs.cheatConsoleOpen = false;
  }

  _processCheat(cmd) {
    const gs = this.scene.get('GameScene');
    if (!gs) return;

    if (cmd === 'health') {
      const on = !gs.players?.some(p => p?.godMode);
      gs.players?.forEach(p => { if (p) p.godMode = on; });
      this.toast(on ? 'GOD MODE ON' : 'GOD MODE OFF', '#00ff88', 1800);
    } else if (cmd === 'oneshot') {
      const on = !gs.players?.some(p => p?.oneShotMode);
      gs.players?.forEach(p => { if (p) p.oneShotMode = on; });
      this.toast(on ? 'ONE SHOT ON' : 'ONE SHOT OFF', '#ffaa00', 1800);
    } else if (cmd === 'freeroam') {
      gs.freeroam = !gs.freeroam;
      this.toast(gs.freeroam ? 'FREEROAM ON' : 'FREEROAM OFF', '#88aaff', 1800);
    } else if (cmd.length > 0) {
      this.toast('Unknown: ' + cmd, '#ff6666', 1500);
    }

    this._updateCheatBadge(gs);
  }

  _updateCheatBadge(gs) {
    const badges = [];
    if (gs.players?.some(p => p?.godMode))     badges.push('♥ GODMODE');
    if (gs.players?.some(p => p?.oneShotMode)) badges.push('⚡ ONESHOT');
    if (gs.freeroam)                            badges.push('✦ FREEROAM');
    this._cheatBadge.setText(badges.join('\n'));
  }

  _onKillCombo({ count }) {
    if (this._comboText) { this._comboText.destroy(); this._comboText = null; }
    if (this._comboTween) { this._comboTween.stop(); this._comboTween = null; }

    const palette = ['#ffffff', '#ffff44', '#ffbb22', '#ff7700', '#ff3300'];
    const color   = palette[Math.min(count - 2, palette.length - 1)];
    const size    = 10 + Math.min(count - 2, 5);

    this._comboText = this.add.text(GAME_W / 2, GAME_H / 2 + 90, `×${count} COMBO!`, {
      fontSize: `${size}px`, color,
      fontFamily: "'Silkscreen', monospace",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9960).setAlpha(0).setScale(1.5);

    this._comboTween = this.tweens.add({
      targets: this._comboText, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 150, ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1100, () => {
          if (!this._comboText) return;
          this.tweens.add({
            targets: this._comboText, alpha: 0, y: this._comboText.y - 24,
            duration: 380,
            onComplete: () => { this._comboText?.destroy(); this._comboText = null; },
          });
        });
      },
    });
  }

  _onStatusFlash({ color, alpha, duration }) {
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, color, alpha)
      .setOrigin(0.5).setDepth(9972);
    this.tweens.add({ targets: flash, alpha: 0, duration, onComplete: () => flash.destroy() });
  }

  // ── Toast utility ──────────────────────────────────────────────────────────

  toast(text, color = '#ffffff', duration = 1500) {
    const t = this.add.text(0, 0, text, {
      fontSize: '11px', color, fontFamily: "'Silkscreen', monospace",
      stroke: '#000', strokeThickness: 3,
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
