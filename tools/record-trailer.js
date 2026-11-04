// Scripted 9:16 gameplay videos for store pages, with the real in-game sound effects (no text, no voice).
// node tools/record-trailer.js <out.mp4> [lang=zh] [script=main|promo]   (needs the game served at localhost:8766)
//   main  : starts straight in gameplay (TapTap wants core gameplay in the first 5 s): strikes, fever, the fish's three evolutions, a big sale, the evolution tree
//   promo : different footage for a separate promo cut: other weapons evolving, the market, the codex
// Randomness is steered through Math.random for the scripted beats; sound is tapped from WebAudio (tools/audio-tap.js).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || 'trailer.mp4', lang = process.argv[3] || 'zh', script = process.argv[4] || 'main';
  const w = 360, h = 640, scale = 3;
  const dir = process.env.FRAMES || '/tmp/trailer-frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript({ path: path.join(__dirname, 'audio-tap.js') });
  await p.addInitScript(() => {
    const o = Math.random; window.__rig = null; Math.random = () => (window.__rig != null ? window.__rig : o());
    localStorage.setItem('ycmm-meta', JSON.stringify({ asked: true, tutDone: true, seenHelp: true, muted: false, codex: { yu: 80, jingu: 78, maton: 52, dianzuan: 40, jian: 31, cong: 12, guo: 26, jiguang: 30, jita: 60, qian: 27, suanpan: 15, tanghulu: 20 } }));
  });
  await p.goto(`http://localhost:8766/index.html?lang=${lang}`, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { await document.fonts.ready; });
  const wait = (ms) => p.waitForTimeout(ms), G = (fn, a) => p.evaluate(fn, a);
  const strike = async (rig, ms = 420) => { await G((r) => { window.__rig = r; }, rig); await p.keyboard.press('Space'); await G(() => { window.__rig = null; }); await wait(ms); };
  const setSword = (shape, level, extra) => G(([shape, level, extra]) => { const g = window.__game, r = g.run; r.fever = 0; r.fire = (extra && extra.fire) || 0; r.sword.shape = shape; r.sword.level = level; r.stam = +((document.querySelector('#stam').textContent.match(/\/(\d+)/) || [0, 18])[1]); g.render(); }, [shape, level, extra]);
  // open a run before the camera rolls, so the video starts on the anvil
  await G(() => document.querySelector('#tNew').click()); await wait(300);
  await G(() => document.querySelector('[data-d="easy"]').click()); await wait(500);
  await G(() => { const g = window.__game, r = g.run; r.stam = +((document.querySelector('#stam').textContent.match(/\/(\d+)/) || [0, 18])[1]); r.gold = 0; g.render(); });
  const cdp = await c.newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); const f = path.join(dir, `f${String(++n).padStart(6, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, ts: metadata.timestamp }); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: w * scale, maxHeight: h * scale });
  if (script === 'main') {
    await setSword('yu', 0);
    for (let i = 0; i < 7; i++) await strike(i === 3 ? 0.995 : null, 430);       // honest strikes from the first second
    await wait(200); await p.keyboard.press('s'); await wait(900);                // a sale
    await setSword('yu', 9, { fire: 9 }); await wait(400);                        // fever
    await strike(0.995, 900);
    for (let i = 0; i < 7; i++) await strike(i % 3 === 1 ? 0.995 : 0.9, 360);
    await wait(500);
    for (const lv of [23, 48, 73]) { await setSword('yu', lv); await wait(600); await strike(0.995, lv === 73 ? 3600 : 2600); } // evolutions
    await G(() => { window.__game.run.gold = 0; }); await p.keyboard.press('s'); await wait(1800);                               // big sale
    await G(() => document.querySelector('#codexBtn').click()); await wait(700);
    await G(() => document.querySelector('#codex [data-id="yu"]').click()); await wait(3600);                                  // evolution tree
  } else {
    await setSword('jingu', 6);
    for (let i = 0; i < 6; i++) await strike(i === 2 ? 0.995 : null, 420);
    await setSword('jingu', 23); await wait(500); await strike(0.995, 2400);
    await setSword('maton', 48); await wait(500); await strike(0.995, 2400);
    await setSword('dianzuan', 12, { fire: 9 }); await wait(400); await strike(0.995, 800);
    for (let i = 0; i < 7; i++) await strike(i % 2 ? 0.995 : 0.9, 340);
    await setSword('jingu', 73); await wait(600); await strike(0.995, 3400);
    await p.keyboard.press('s'); await wait(1500);
    await G(() => document.querySelector('#codexBtn').click()); await wait(2200);                                                // the codex
    await G(() => document.querySelector('#codex [data-id="jingu"]').click()); await wait(3200);
  }
  await cdp.send('Page.stopScreencast');
  const aud = await G(() => window.__audDump());
  let list = ''; frames.forEach((fr, i) => { const d = frames[i + 1] ? Math.min(1, frames[i + 1].ts - fr.ts) : 0.04; list += `file '${fr.f}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`; }); list += `file '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt')];
  if (aud) {
    const af = path.join(dir, 'audio.webm'); fs.writeFileSync(af, Buffer.from(aud.b64, 'base64'));
    const off = aud.t0 / 1000 - frames[0].ts; // seconds from the first video frame to the start of the sound
    args.push(...(off >= 0 ? ['-itsoffset', off.toFixed(3), '-i', af] : ['-ss', (-off).toFixed(3), '-i', af]));
    args.push('-map', '0:v', '-map', '1:a', '-af', 'apad', '-shortest');
    console.log('audio offset', off.toFixed(3), 's');
  } else args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest');
  args.push('-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args);
  console.log(out, frames.length, 'frames', errs);
  await b.close();
})();
