import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,300)));
await p.goto('http://localhost:8080/', { waitUntil:'domcontentloaded' });
for (let i=0;i<20;i++){
  await p.waitForTimeout(2000);
  const st = await p.evaluate(() => {
    const g = window.__game; if(!g) return {none:true};
    const pre = g.scene.getScene('PreloadScene');
    return { t:Math.round(performance.now()/1000),
      active: g.scene.scenes.filter(s=>s.scene.isActive()).map(s=>s.scene.key),
      preProgress: pre?.load?.progress, totalToLoad: pre?.load?.totalToLoad, done: pre?.load?.totalComplete,
      regionMaps:(g.scene.scenes[0]?.registry.get('regionMaps')||[]).length };
  });
  console.log(JSON.stringify(st));
  if (st.active?.includes('MainMenuScene')) break;
}
await b.close();
