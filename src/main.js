import { PreloadScene }     from './scenes/PreloadScene.js';
import { MainMenuScene }    from './scenes/MainMenuScene.js';
import { PrologueScene }    from './scenes/PrologueScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { UIScene }          from './scenes/UIScene.js';
import { PauseScene }       from './scenes/PauseScene.js';
import { WorldMapScene }    from './scenes/WorldMapScene.js';
import { ShrineScene }      from './scenes/ShrineScene.js';
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
      // TEMP(collision-debug): draws every physics body outline — the player's
      // foot circle and the solid-prop circles — for tuning. Set `debug` back to
      // false to turn it off. Velocity arrows disabled to keep it readable.
      debug: true,
      debugShowVelocity: false,
    },
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    PrologueScene,
    GameScene,
    UIScene,
    PauseScene,
    WorldMapScene,
    ShrineScene,
    GameEndingScene,
  ],
};

const game = new Phaser.Game(config);

// Expose for debugging
window.__game = game;

// WebGL context-loss safety net. On mobile GPUs a memory spike (e.g. the boss
// arena's large frames + postFX) can lose the context: every texture turns into
// a green "missing" box and the game hard-freezes. Phaser tries to restore, but
// if it doesn't come back we drop to 'low' (lighter GPU load) and reload ONCE so
// the player isn't stuck on a dead frame. The sessionStorage guard prevents a
// reload loop if the device keeps dropping the context.
try {
  const canvas = game.canvas;
  if (canvas && canvas.addEventListener) {
    canvas.addEventListener('webglcontextlost', (e) => {
      // preventDefault lets the browser attempt to restore the context at all.
      e.preventDefault();
      // Future loads should avoid the postFX that likely caused the spike.
      try { QualitySettings.setLevel('low'); } catch (_) {}
      if (!sessionStorage.getItem('webgl_recovered')) {
        sessionStorage.setItem('webgl_recovered', '1');
        // Give Phaser a chance to restore on its own first; reload if it can't.
        setTimeout(() => {
          if (game.renderer && game.renderer.contextLost) location.reload();
        }, 2500);
      }
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      sessionStorage.removeItem('webgl_recovered');
    }, false);
  }
} catch (_) { /* non-WebGL build or no canvas — nothing to guard */ }
