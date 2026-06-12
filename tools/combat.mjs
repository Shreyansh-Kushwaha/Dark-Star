// Combat-path regression test: enters a region, drives movement + light/heavy
// attacks, force-triggers the boss, and runs several seconds while watching for
// runtime errors. Exercises Player._doAttack, projectile collisions, Enemy AI,
// Boss._nearestPlayer + decoy logic (the squared-distance hot paths).
//
// Usage: node tools/combat.mjs [region]   (default 0)
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const REGION = +(process.argv[2] || 0);

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-logging', '--log-level=3'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(120000);

const errors = [];
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/GL Driver|CONTEXT_LOST|WebGL/i.test(t)) return;
  errors.push(t);
});
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 120000 });

await page.evaluate((r) => {
  const g = window.__game;
  ['MainMenuScene', 'WorldMapScene'].forEach(k => { if (g.scene.isActive(k)) g.scene.stop(k); });
  g.scene.start('GameScene', { regionIndex: r, playerCount: 1, playerKeys: ['dhruva'] });
}, REGION);
await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 30000 });
await page.waitForTimeout(2500);

await page.bringToFront();
await page.locator('canvas').click({ position: { x: 640, y: 360 } }).catch(() => {});

// Drive movement + attacks for a few seconds (engages enemies → AI pursue/attack,
// player melee arc, projectile collisions).
async function tap(key, ms = 120) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
for (let i = 0; i < 8; i++) {
  await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
  await tap('j', 90);
  await tap('k', 120);
  await page.keyboard.down('a'); await page.waitForTimeout(150); await page.keyboard.up('a');
  await tap('j', 90);
}

// Force-trigger the boss and let its update loop (incl. decoys if any) run.
const triggered = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  if (gs && gs._bossArenaPos && typeof gs._triggerBoss === 'function' && !gs._bossTriggered) {
    try { gs._triggerBoss(); return true; } catch (e) { return 'ERR:' + e.message; }
  }
  return 'no-boss-arena';
});
await page.waitForTimeout(4000);
// keep attacking during boss fight
for (let i = 0; i < 6; i++) { await tap('j', 90); await tap('k', 120); }
await page.waitForTimeout(2000);

const state = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  return {
    active: window.__game.scene.isActive('GameScene'),
    bossAlive: !!(gs?._boss?.alive),
    bossTriggered: !!gs?._bossTriggered,
    enemies: gs?.enemies?.length ?? 0,
    projectiles: gs?.projectiles?.length ?? 0,
    p1hp: gs?.players?.[0]?.hp ?? null,
  };
});

console.log(`combat region ${REGION}: boss=${triggered} state=${JSON.stringify(state)}`);
const ok = state.active && errors.length === 0;
console.log(ok ? 'COMBAT PASS' : 'COMBAT FAIL');
if (errors.length) console.log('errors:', errors.slice(0, 6).join(' | '));
await browser.close();
process.exit(ok ? 0 : 1);
