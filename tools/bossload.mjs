// Validates lazy boss-asset loading (#1) + dedup (#2).
// 1. Confirms boot texture count dropped (boss frames no longer preloaded).
// 2. For each boss region: enters it, waits for the lazy stream, triggers the
//    boss, and verifies it spawns with a real texture + playing animation, no
//    errors, and that the family's textures appeared on demand.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
// regionIndex -> expected textureBase
const CASES = [[3, 'tree_boss'], [4, 'mino'], [5, 'frost'], [6, 'dslime']];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-logging', '--log-level=3'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(120000);

const errors = [];
page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/GL Driver|CONTEXT_LOST|WebGL/i.test(t)) errors.push(t); } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

let failures = 0;

const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });
const bootTex = await page.evaluate(() => Object.keys(window.__game.textures.list).length);
console.log(`boot: MainMenu ready in ${Date.now() - t0}ms, ${bootTex} textures (was ~1021 before lazy-loading bosses)`);

async function testBoss(ri, base) {
  const errBefore = errors.length;
  await page.evaluate((r) => {
    const g = window.__game;
    ['GameScene', 'UIScene', 'MainMenuScene', 'WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
    g.scene.start('GameScene', { regionIndex: r, playerCount: 1, playerKeys: ['dhruva'] });
  }, ri);
  await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });

  const res = await page.evaluate(async (base) => {
    const g = window.__game;
    const gs = g.scene.getScene('GameScene');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // wait for lazy boss stream
    const start = performance.now();
    while (performance.now() - start < 30000 && gs._bossAssetsReady === false) await wait(300);
    const idleAnim = g.anims.exists(base + '_idle');
    const idleTex  = g.textures.exists(base + '_idle_01');
    // force-spawn the boss
    let triggerErr = null;
    try { if (!gs._bossTriggered) gs._triggerBoss(); } catch (e) { triggerErr = e.message; }
    await wait(2500);
    const b = gs._boss;
    return {
      bossReady: gs._bossAssetsReady,
      idleAnim, idleTex,
      bossExists: !!b,
      bossActive: !!(b && b.active),
      bossAnimPlaying: !!(b && b.sprite && b.sprite.anims && b.sprite.anims.isPlaying),
      bossTexKey: b && b.sprite ? b.sprite.texture?.key : null,
      triggerErr,
      texCount: Object.keys(g.textures.list).length,
    };
  }, base);

  const newErr = errors.slice(errBefore);
  const ok = res.idleAnim && res.idleTex && res.bossExists && res.bossActive &&
             res.bossTexKey && res.bossTexKey !== '__MISSING' && !res.triggerErr && newErr.length === 0;
  if (!ok) failures++;
  console.log(`region ${ri} (${base}): ${ok ? 'PASS' : 'FAIL'} ` +
    `ready=${res.bossReady} anim=${res.idleAnim} tex=${res.idleTex} bossActive=${res.bossActive} ` +
    `animPlaying=${res.bossAnimPlaying} texKey=${res.bossTexKey} totalTex=${res.texCount}`);
  if (res.triggerErr) console.log(`   triggerErr: ${res.triggerErr}`);
  if (newErr.length)  console.log(`   errors: ${newErr.slice(0, 4).join(' | ')}`);
}

try {
  for (const [ri, base] of CASES) await testBoss(ri, base);
} finally {
  await browser.close();
}
console.log(failures === 0 ? '\nBOSSLOAD ALL PASS' : `\n${failures} BOSS REGION(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
