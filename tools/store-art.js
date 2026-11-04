// Clean key art rendered by the game itself (no UI): the forge scene at any size with a chosen weapon on the anvil.
// node tools/store-art.js <outdir>   -> big-*.png (2x renders); tools/store-kit.py turns them into the store sizes
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  // big renders (2x) that tools/store-kit.py crops around the glowing weapon
  const shots = [['big-wide', 1200, 1000, 'yu', 80], ['big-tall', 900, 1200, 'yu', 80], ['big-wall', 2000, 1300, 'jingu', 80], ['big-wide-plain', 1200, 1000, 'yu', 80, 1], ['big-tall-plain', 900, 1200, 'yu', 80, 1], ['big-wall-plain', 2000, 1300, 'jingu', 80, 1]]; // *-plain: no rune glyphs (for images that may not contain any text)
  for (const [name, w, h, shape, level, plain] of shots) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
    await p.addInitScript(() => { const o = Math.random; window.__rig = null; Math.random = () => (window.__rig != null ? window.__rig : o()); localStorage.setItem('ycmm-meta', JSON.stringify({ asked: true, tutDone: true, seenHelp: true, muted: true })); });
    await p.goto('http://localhost:8766/index.html?lang=zh', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('#tNew').click()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('[data-d="easy"]').click()); await p.waitForTimeout(300);
    await p.addStyleTag({ content: '#scene{position:fixed!important;inset:0!important;height:100vh!important;max-height:none!important;width:100vw!important;z-index:50;border:0!important;border-radius:0!important} #scene>:not(canvas){display:none!important} body{overflow:hidden}' });
    await p.evaluate(([shape, level]) => { const g = window.__game, r = g.run; r.sword.shape = shape; r.sword.level = level; g.render(); window.dispatchEvent(new Event('resize')); }, [shape, level]);
    await p.evaluate((pl) => { window.__noRunes = !!pl; }, plain); await p.waitForTimeout(1600);
    await p.screenshot({ path: `${out}/${name}.png` });
    await p.context().close();
  }
  console.log('ok'); await b.close();
})();
