// Scripted 9:16 trailer for store pages (TapTap etc.): title -> play -> fever -> three evolutions -> big sale -> evolution tree -> title.
// node tools/record-trailer.js <out.mp4> [lang]   (needs the game served at localhost:8766). Randomness is steered via Math.random for the scripted beats.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const launch = require('./pw');
(async () => {
  const out = process.argv[2] || 'trailer.mp4', lang = process.argv[3] || 'zh';
  const w = 360, h = 640, scale = 3;
  const dir = process.env.FRAMES || '/tmp/trailer-frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await launch();
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    const orig = Math.random; window.__rig = null; Math.random = () => (window.__rig != null ? window.__rig : orig());
    localStorage.setItem('ycmm-meta', JSON.stringify({ tutDone: true, seenHelp: true, muted: true, codex: { yu: 80, jian: 12, cong: 9 } }));
  });
  await p.goto(`http://localhost:8766/index.html?lang=${lang}`, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { await document.fonts.ready; });
  const cdp = await c.newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); const f = path.join(dir, `f${String(++n).padStart(6, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, ts: metadata.timestamp }); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: w * scale, maxHeight: h * scale });
  const wait = (ms) => p.waitForTimeout(ms);
  const G = (fn, a) => p.evaluate(fn, a);
  const strike = async (rig, ms = 420) => { await G((r) => { window.__rig = r; }, rig); await p.keyboard.press('Space'); await G(() => { window.__rig = null; }); await wait(ms); };
  // 1. title
  await wait(2200);
  await G(() => document.querySelector('#tNew').click()); await wait(600);
  await G(() => { const g = window.__game, r = g.run; r.sword.shape = 'yu'; r.sword.level = 0; r.stam = 99; g.render(); });
  // 2. a few honest strikes, then a sale
  for (let i = 0; i < 7; i++) await strike(i === 3 ? 0.995 : null, 430);
  await wait(300); await p.keyboard.press('s'); await wait(900);
  // 3. fever: top up the fire meter, land a great success, then 8 fever strikes
  await G(() => { const g = window.__game, r = g.run; r.sword.shape = 'yu'; r.sword.level = 9; r.fire = 9; r.stam = 99; g.render(); }); await wait(500);
  await strike(0.995, 900);
  for (let i = 0; i < 7; i++) await strike(i % 3 === 1 ? 0.995 : 0.9, 360);
  await wait(500);
  // 4. evolutions at +25, +50, +75
  for (const lv of [23, 48, 73]) {
    await G((lv) => { const g = window.__game, r = g.run; r.fever = 0; r.fire = 0; r.sword.shape = 'yu'; r.sword.level = lv; r.stam = 99; g.render(); }, lv); await wait(700);
    await strike(0.995, lv === 73 ? 3600 : 2600);
  }
  // 5. sell the ascended fish for an absurd price
  await G(() => { window.__game.run.gold = 0; }); await p.keyboard.press('s'); await wait(1800);
  // 6. the evolution tree in the codex
  await G(() => document.querySelector('#codexBtn').click()); await wait(700);
  await G(() => { const el = document.querySelector('#codex [data-id="yu"]'); if (el) el.click(); }); await wait(3800);
  await G(() => { const b = document.querySelector('#sheet .btn'); if (b) b.click(); }); await wait(200);
  // 7. end on the title
  await G(() => { document.querySelector('#modal').hidden = true; document.querySelector('#codexBack').click(); }); await wait(300);
  await G(() => document.querySelector('#menuBtn').click()); await wait(250);
  await G(() => document.querySelector('#mHome').click()); await wait(2600);
  await cdp.send('Page.stopScreencast');
  let list = ''; frames.forEach((fr, i) => { const d = frames[i + 1] ? Math.min(1, frames[i + 1].ts - fr.ts) : 0.04; list += `file '${fr.f}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`; }); list += `file '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', out]);
  console.log(out, frames.length, 'frames', errs);
  await b.close();
})();
