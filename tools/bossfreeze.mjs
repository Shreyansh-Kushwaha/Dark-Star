import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.on('pageerror', e => console.log('[pageerror]', e.message.split('\n')[0]));
await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });
await page.evaluate(() => {
  const g = window.__game;
  ['GameScene','UIScene','MainMenuScene','WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
  g.scene.start('GameScene', { regionIndex: 8, playerCount: 1, playerKeys: ['dhruva'] });
});
await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  const p = gs.players[0];
  const e = gs.enemies.find(en => en && en.active);
  window.__e = e; window.__p = p; window.__gs = gs; window.__spy = { p: 0, e: 0 };
  const wrap = (obj, key) => { const orig = obj.update.bind(obj); obj.update = function(...a){ window.__spy[key]++; return orig(...a); }; };
  wrap(p, 'p'); if (e) wrap(e, 'e');
  window.__hasEnemy = !!e;
  // keep the enemy adjacent + give both a velocity, so AI is in range and there
  // is motion to suppress; called once per probe (a fresh JS tick each time).
  window.__poke = () => {
    if (window.__e) { window.__e.x = p.x + 80; window.__e.y = p.y; window.__e.body.setVelocity(200, 0); }
    p.body.setVelocity(200, 0);
  };
  window.__vel = () => ({
    pv: Math.hypot(p.body.velocity.x, p.body.velocity.y),
    ev: window.__e ? Math.hypot(window.__e.body.velocity.x, window.__e.body.velocity.y) : null,
  });
});

async function phase(introOn) {
  await page.evaluate(v => { window.__gs._bossIntroActive = v; window.__spy.p = 0; window.__spy.e = 0; }, introOn);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.__poke()); await page.waitForTimeout(170); }
  const spy = await page.evaluate(() => window.__spy);
  // velocity: poke once, let a FULL frame pass, then read (separate ticks)
  await page.evaluate(() => window.__poke());
  await page.waitForTimeout(1100);
  const vel = await page.evaluate(() => window.__vel());
  return { introOn, pUpd: spy.p, eUpd: spy.e, pVel: +vel.pv.toFixed(1), eVel: vel.ev==null?null:+vel.ev.toFixed(1) };
}

const frozen = await phase(true);
const active = await phase(false);
const hasEnemy = await page.evaluate(() => window.__hasEnemy);
console.log('DURING cutscene:', JSON.stringify(frozen));
console.log('AFTER  cutscene:', JSON.stringify(active));
// During: no updates ran AND velocity got pinned to 0 by the freeze branch.
// After: updates ran again (player at minimum; enemy too since kept adjacent).
const pass = frozen.pUpd === 0 && frozen.pVel === 0
  && (!hasEnemy || (frozen.eUpd === 0 && frozen.eVel === 0))
  && active.pUpd > 0 && (!hasEnemy || active.eUpd > 0);
console.log(pass ? 'PASS: actors frozen during cutscene (no updates, velocity=0); resume after'
                 : 'FAIL');
await browser.close();
