// Full-region screenshots via the map editor (Konva). For each region it calls
// the editor's own loadRegionData() (which awaits every sprite image), then
// renders the whole 3200x2000 stage to PNG. Deterministic and reliable.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('region_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const WORLD_W = 3200, WORLD_H = 2000;

const only = (process.argv[2] || '').split(',').filter(Boolean).map(Number);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(60000);
page.on('pageerror', e => console.log('  [pageerror]', e.message.split('\n')[0]));

await page.goto('http://localhost:8080/map_editor.html', { waitUntil: 'load' });
await page.waitForFunction(() => typeof S !== 'undefined' && S.stage && typeof loadRegionData === 'function');

let regions = await page.evaluate(async () => {
  const list = await (await fetch('/api/regions')).json();
  window.__REG = {};
  for (const r of list) window.__REG[r.regionIndex] = { data: r.data, filename: r.filename };
  return list.map(r => ({ idx: r.regionIndex, name: r.data?.regionName || `Region ${r.regionIndex}` }))
             .filter(r => r.idx != null).sort((a, b) => a.idx - b.idx);
});
if (only.length) regions = regions.filter(r => only.includes(r.idx));
console.log(`Capturing ${regions.length} regions -> ${OUT}\n`);

const slug = s => String(s).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 50);

for (const r of regions) {
  const t0 = Date.now();
  try {
    const dataURL = await page.evaluate(async ({ idx, W, H }) => {
      const { data, filename } = window.__REG[idx];
      await loadRegionData(data, filename, idx);
      // Render the full world to an image (mirrors exportPNG)
      S.stage.scale({ x: 1, y: 1 });
      S.stage.position({ x: 0, y: 0 });
      S.stage.size({ width: W, height: H });
      if (S.noWalkLayer) S.noWalkLayer.visible(false);
      if (S.markerLayer) S.markerLayer.visible(false);
      S.stage.batchDraw();
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      return S.stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 });
    }, { idx: r.idx, W: WORLD_W, H: WORLD_H });

    const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
    const file = path.join(OUT, `region_${String(r.idx).padStart(2, '0')}_${slug(r.name)}.png`);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    const kb = (fs.statSync(file).size / 1024).toFixed(0);
    console.log(`  OK  ${String(r.idx).padStart(2)}  ${r.name}  (${kb}KB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    console.log(`  XX  ${String(r.idx).padStart(2)}  ${r.name} — ${e.message.split('\n')[0]}`);
  }
}

await browser.close();
console.log('\nDone.');
