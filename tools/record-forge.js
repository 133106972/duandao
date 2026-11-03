// Records the forge game's autopilot (#demo) as a 9:16 clip: node tools/record-forge.js <seconds> <out.mp4> [w h]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const launch = require('./pw');
(async () => {
  const secs = +(process.argv[2] || 40), out = process.argv[3] || 'forge-demo.mp4';
  const w = +(process.argv[4] || 360), h = +(process.argv[5] || 640), scale = 1080 / w;
  const dir = process.env.FRAMES || '/tmp/forge-frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await launch();
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html' + (process.env.Q || '') + '#demo', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { await Promise.all(['400 40px "Ma Shan Zheng"', '900 40px "Noto Serif SC"', '700 40px "Noto Serif SC"', '700 40px "Noto Sans SC"', '400 40px "Noto Sans SC"'].map(f => document.fonts.load(f, document.body.innerText + '0123456789万亿成功大受损碎裂无变化挑一本秘籍还清了期'))); });
  const cdp = await c.newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); const f = path.join(dir, `f${String(++n).padStart(6, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, ts: metadata.timestamp }); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: Math.round(w * scale), maxHeight: Math.round(h * scale) });
  await p.waitForTimeout(secs * 1000);
  await cdp.send('Page.stopScreencast');
  const st = await p.evaluate(() => { const r = window.__game.run; return r && { period: r.period, day: r.day, gold: r.gold, lvl: r.sword.level, relics: r.relics, stats: r.stats }; });
  let list = ''; frames.forEach((fr, i) => { const d = frames[i + 1] ? Math.min(1, frames[i + 1].ts - fr.ts) : 0.04; list += `file '${fr.f}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`; }); list += `file '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const W = Math.round(w * scale / 2) * 2, H = Math.round(h * scale / 2) * 2;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', `scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', out]);
  console.log(out, frames.length, 'frames', JSON.stringify(st), errs);
  await b.close();
})();
