// Performance/regression smoke test for Akhand Sutra.
// Loads the page ONCE, then switches between regions via scene.start (textures
// stay cached). Checks console errors, missing textures, that the scene built
// live objects, and samples FPS per region.
//
// Usage: node tools/smoke.mjs [regionList]   e.g. node tools/smoke.mjs 0,8,13,30
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const REGIONS = (process.argv[2] || '0,8,13,30').split(',').map(s => +s.trim());

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-logging', '--log-level=3'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(120000);

const errors = [];
const missingTex = [];
page.on('console', m => {
  const type = m.type();
  if (type !== 'error' && type !== 'warning') return; // ignore log/info flood
  const t = m.text();
  if (/GL Driver|CONTEXT_LOST|WebGL/i.test(t)) return; // ignore swiftshader/GL noise
  if (type === 'error') errors.push(t);
  if (/Texture.*not found|Missing|frame.*missing|cannot read/i.test(t)) missingTex.push(t);
});
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

let failures = 0;

async function loadOnce() {
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });
  const tex = await page.evaluate(() => Object.keys(window.__game.textures.list).length);
  console.log(`boot: MainMenu ready in ${Date.now() - t0}ms, ${tex} textures loaded`);
}

async function testRegion(ri) {
  const errBefore = errors.length, mtBefore = missingTex.length;
  await page.evaluate((r) => {
    const g = window.__game;
    ['GameScene', 'UIScene', 'MainMenuScene', 'WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
    g.scene.start('GameScene', { regionIndex: r, playerCount: 1, playerKeys: ['dhruva'] });
  }, ri);
  await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });
  await page.waitForTimeout(3500); // let region assets stream in + animations run

  const stats = await page.evaluate(async () => {
    const g = window.__game;
    const gs = g.scene.getScene('GameScene');
    const fpsSamples = [];
    await new Promise(res => {
      let n = 0;
      const id = setInterval(() => { fpsSamples.push(Math.round(g.loop.actualFps)); if (++n >= 12) { clearInterval(id); res(); } }, 100);
    });
    return {
      sceneActive: g.scene.isActive('GameScene'),
      displayObjects: gs?.children?.list?.length ?? 0,
      enemies: gs?.enemies?.length ?? 0,
      players: gs?.players?.filter(p => p)?.length ?? 0,
      textureCount: Object.keys(g.textures.list).length,
      avgFps: Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length),
      minFps: Math.min(...fpsSamples),
    };
  });

  const newErr = errors.slice(errBefore), newMt = missingTex.slice(mtBefore);
  const ok = stats.sceneActive && stats.displayObjects > 5 && stats.players >= 1 && newErr.length === 0 && newMt.length === 0;
  if (!ok) failures++;
  console.log(`region ${String(ri).padStart(2)}  ${ok ? 'PASS' : 'FAIL'}  ` +
    `objs=${stats.displayObjects} enemies=${stats.enemies} players=${stats.players} tex=${stats.textureCount} fps=${stats.avgFps}(min ${stats.minFps})`);
  if (newErr.length) console.log(`   errors: ${newErr.slice(0, 4).join(' | ')}`);
  if (newMt.length)  console.log(`   missingTex: ${newMt.slice(0, 4).join(' | ')}`);
}

try {
  await loadOnce();
  for (const r of REGIONS) await testRegion(r);
} finally {
  await browser.close();
}
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} REGION(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
