import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('console', m => console.log('[console]', m.type(), m.text().slice(0,200)));
p.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,300)));
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForTimeout(6000);
const st = await p.evaluate(() => {
  const g = window.__game;
  if (!g) return { game:false };
  return {
    booted: g.isBooted,
    renderType: g.renderer?.type, // 1=canvas 2=webgl
    active: g.scene.getScenes(true).map(s=>s.scene.key),
    all: g.scene.scenes.map(s=>({k:s.scene.key, active:s.scene.isActive()})),
    regionMaps: (g.scene.scenes[0]?.registry.get('regionMaps')||[]).length,
  };
});
console.log('STATE', JSON.stringify(st,null,2));
await p.screenshot({ path:'/tmp/boot.png' });
await b.close();
