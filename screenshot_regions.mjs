import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

async function screenshotRegion(regionIndex, outPath) {
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(m.text()));
  
  await page.goto(`http://localhost:3000`);

  // Wait for PreloadScene to finish (MainMenuScene becomes active)
  await page.waitForFunction(() => window.__game?.scene?.isActive('MainMenuScene'), { timeout: 20000 });

  // Start game at region
  await page.evaluate((ri) => {
    const g = window.__game;
    g.scene.stop('MainMenuScene');
    g.scene.start('GameScene', { regionIndex: ri, playerCount: 1, playerKeys: ['dhruva'] });
  }, regionIndex);
  
  // Wait for scene to be active and first frame drawn
  await page.waitForFunction(() => window.__game?.scene?.isActive('GameScene'), { timeout: 8000 });
  await page.waitForTimeout(2500);
  
  await page.screenshot({ path: outPath });
  await page.close();
  console.log(`Region ${regionIndex} screenshot saved: ${outPath}`);
}

try {
  await screenshotRegion(0, '/tmp/r0_new.png');
  await screenshotRegion(1, '/tmp/r1_new.png');
  await screenshotRegion(2, '/tmp/r2_new.png');
  await screenshotRegion(3, '/tmp/r3_new.png');
} finally {
  await browser.close();
}
