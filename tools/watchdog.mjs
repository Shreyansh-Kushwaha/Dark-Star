// Tests the adaptive-quality FPS watchdog (#10) and first-run auto-detect (#3).
// Headless software-GL runs well below 45fps, so the watchdog should fire and
// step quality down. We force the stored preset to 'high' so there is room.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-logging', '--log-level=3'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(120000);

const errors = [];
page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/GL Driver|CONTEXT_LOST|WebGL/i.test(t)) errors.push(t); } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

// Seed a high preset before any game code runs.
await page.addInitScript(() => { localStorage.setItem('akhand_quality', 'high'); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });

await page.evaluate(() => {
  const g = window.__game;
  ['MainMenuScene', 'WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
  g.scene.start('GameScene', { regionIndex: 0, playerCount: 1, playerKeys: ['dhruva'] });
});
await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });

// Watchdog: 3s grace + 5s sustained-low → ~8s. Poll up to 25s.
const result = await page.evaluate(async () => {
  const gs = window.__game.scene.getScene('GameScene');
  const start = performance.now();
  while (performance.now() - start < 25000) {
    if (gs._autoDowngraded) break;
    await new Promise(r => setTimeout(r, 500));
  }
  return {
    fps: Math.round(window.__game.loop.actualFps),
    autoDowngraded: !!gs._autoDowngraded,
    storedLevel: localStorage.getItem('akhand_quality'),
    bloomCleared: gs._bloomFx === null,
    sceneActive: window.__game.scene.isActive('GameScene'),
  };
});

console.log('watchdog result:', JSON.stringify(result));
const ok = result.sceneActive && result.autoDowngraded && result.storedLevel !== 'high' && errors.length === 0;
console.log(ok ? 'WATCHDOG PASS' : 'WATCHDOG FAIL');
if (errors.length) console.log('errors:', errors.slice(0, 6).join(' | '));
await browser.close();
process.exit(ok ? 0 : 1);
