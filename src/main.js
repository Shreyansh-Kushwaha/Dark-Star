import { PreloadScene }     from './scenes/PreloadScene.js';
import { MainMenuScene }    from './scenes/MainMenuScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { UIScene }          from './scenes/UIScene.js';
import { PauseScene }       from './scenes/PauseScene.js';
import { GameEndingScene }  from './scenes/GameEndingScene.js';
import { GAME_W, GAME_H }   from './constants.js';
import { QualitySettings }  from './systems/QualitySettings.js';

QualitySettings.load();

const config = {
  type: Phaser.AUTO,
  width:  GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0a0a',
  parent: document.body,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    powerPreference: 'high-performance',
    batchSize: 4096,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    GameScene,
    UIScene,
    PauseScene,
    GameEndingScene,
  ],
};

const game = new Phaser.Game(config);

// Expose for debugging
window.__game = game;
