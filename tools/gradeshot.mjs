import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const OUT = path.resolve('grade_shots'); fs.mkdirSync(OUT, { recursive: true });
const REGIONS = (process.argv[2] || '6,28,35').split(',').map(s => +s.trim());
const browser = await chromium.launch({ args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('[pageerror]', e.message.split('\n')[0]));
// Force the HIGH preset before any game script runs.
await page.addInitScript(() => localStorage.setItem('akhand_quality', 'high'));
await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });
async function go(ri) {
  await page.evaluate((r) => {
    const g = window.__game;
    ['GameScene','UIScene','MainMenuScene','WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
    g.scene.start('GameScene', { regionIndex: r, playerCount: 1, playerKeys: ['dhruva'] });
  }, ri);
  await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });
  await page.waitForTimeout(3500);
  const info = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    return { quality: window.QualitySettings?.level, gradeFx: !!gs._gradeFx, vignetteFx: !!gs._vignetteFx, bloomFx: !!gs._bloomFx, postFxCount: gs.cameras.main.postFX.list.length };
  });
  console.log(`region ${ri}:`, JSON.stringify(info));
  await page.screenshot({ path: path.join(OUT, `region_${ri}_high.png`) });
}
for (const ri of REGIONS) await go(ri);
await browser.close();
