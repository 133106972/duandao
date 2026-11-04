// Raw 1080x1920 game screenshots for store pages: node tools/store-shots.js <outdir> [lang]
const launch = require('./pw');
(async () => {
  const out = process.argv[2] || '.', lang = process.argv[3] || 'zh';
  const b = await launch(); const c = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const codex = { yu: 80, jian: 31, cong: 12, guo: 26, jitui: 9, jiguang: 52, dianzuan: 40, maton: 8, jingu: 77, suanpan: 15, tanghulu: 20, jita: 60, caidao: 18, qian: 27 };
  await p.addInitScript((cx) => { const o = Math.random; window.__rig = null; Math.random = () => (window.__rig != null ? window.__rig : o()); localStorage.setItem('ycmm-meta', JSON.stringify({ asked: true, tutDone: true, seenHelp: true, muted: true, ends: 1, codex: cx })); }, codex);
  await p.goto(`http://localhost:8766/index.html?lang=${lang}`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const wait = (ms) => p.waitForTimeout(ms), G = (fn, a) => p.evaluate(fn, a);
  const strike = async (rig, ms = 420) => { await G((r) => { window.__rig = r; }, rig); await p.keyboard.press('Space'); await G(() => { window.__rig = null; }); await wait(ms); };
  const shot = (n) => p.screenshot({ path: `${out}/raw-${n}.png` });
  await wait(1200); await shot('title');
  await G(() => document.querySelector('#tNew').click()); await wait(300); await G(() => document.querySelector('[data-d="easy"]').click()); await wait(500);
  await G(() => { const g = window.__game, r = g.run; r.sword.shape = 'jiguang'; r.sword.level = 7; r.stam = +((document.querySelector('#stam').textContent.match(/\/(\d+)/) || [0, 18])[1]); r.gold = 2600; g.render(); });
  for (let i = 0; i < 4; i++) await strike(null, 450);
  await strike(0.86, 260); await shot('strike');
  await G(() => { const g = window.__game, r = g.run; r.sword.shape = 'jingu'; r.sword.level = 18; r.fire = 9; g.render(); }); await wait(400);
  await strike(0.995, 300); await strike(0.995, 240); await shot('fever');
  await G(() => { const g = window.__game, r = g.run; r.fever = 0; r.fire = 0; r.sword.shape = 'yu'; r.sword.level = 73; g.render(); }); await wait(500);
  await strike(0.995, 2600); await shot('ascend');
  await G(() => document.querySelector('#codexBtn').click()); await wait(800); await shot('codex');
  await G(() => document.querySelector('#codex [data-id="yu"]').click()); await wait(1500); await shot('evo');
  console.log('ok', errs); await b.close();
})();
