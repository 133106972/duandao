// Key art for store pages, composed (not a screenshot): the game's own weapon art rendered large on a painted forge
// background, with the brush title where the store rules allow one. TapTap rejects raw screenshots and any text but the title.
// node tools/store-keyart.js <outdir> [title=再锤一下]     (needs the game served at localhost:8766 for the weapon renders)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.', TITLE = process.argv[3] || '再锤一下'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  // 1. transparent renders of ascended weapons, straight from the game's renderer (no rune glyphs: no stray text allowed)
  const g = await (await b.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 })).newPage();
  await g.addInitScript(() => localStorage.setItem('ycmm-meta', JSON.stringify({ asked: true, tutDone: true, seenHelp: true, muted: true })));
  await g.goto('http://localhost:8766/index.html?lang=zh', { waitUntil: 'networkidle' });
  const art = await g.evaluate(() => {
    window.__noRunes = true;
    const G = window.__game, mk = (shape, level, W, t) => {
      const w = G.WEAPONS.find((x) => x.id === shape), H = Math.round(W * 0.62), c = document.createElement('canvas'); c.width = W; c.height = H;
      const L = W * 0.62, u = Math.min(L * 0.06, (H * 0.34) / (w.ext[0] + w.ext[1]));
      G.renderWeapon(c.getContext('2d'), { mat: 'steel', shape, level, mul: 1 }, (W - L) / 2, H * 0.56, L, u, { glow: 0.7, t, dpr: 1 });
      return c.toDataURL('image/png');
    };
    return { yu: mk('yu', 80, 2400, 900), jingu: mk('jingu', 55, 1800, 300), jiguang: mk('jiguang', 55, 1600, 2000), maton: mk('maton', 30, 1400, 700) };
  });
  // 2. compose
  const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const HEAD = '<meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=block"><style>*{margin:0;box-sizing:border-box}body{background:#130F0D;overflow:hidden}.t{position:absolute;font-family:"Ma Shan Zheng",serif;color:#FFF1DE;white-space:nowrap;line-height:1;text-shadow:0 0 .12em rgba(255,170,80,.9),0 0 .5em rgba(255,110,20,.55),0 .05em 0 #5A1F06,0 .09em .12em rgba(0,0,0,.6)}</style>';
  // layouts: hero = [centre x, centre y, width, rotation]; title = [x ('c' = centred), y, font size]; all as fractions of the image
  const jobs = [
    // title = [x ('c' = centred), y, font size as a share of the image height, lines]
    ['宣传图-1920x1080', 1920, 1080, { hero: [0.68, 0.66, 0.56, -7], title: [0.055, 0.2, 0.3, 2] }],
    ['横版封面-1380x645', 1380, 645, { hero: [0.7, 0.68, 0.5, -6], title: [0.05, 0.16, 0.34, 2] }],
    ['竖版封面-1000x1500', 1000, 1500, { hero: [0.5, 0.74, 0.94, -9], title: ['c', 0.1, 0.15, 1] }],
    ['无LOGO宣传图-横版-1920x1080', 1920, 1080, { hero: [0.56, 0.64, 0.6, -7], title: null }],
    ['无LOGO宣传图-竖版-1080x1440', 1080, 1440, { hero: [0.5, 0.7, 0.94, -9], title: null }],
    ['游戏库背景壁纸-3840x1240', 3840, 1240, { hero: [0.66, 0.64, 0.3, -6], title: null }],
  ];
  for (const [file, W, H, lay] of jobs) {
    await p.setViewportSize({ width: W, height: H });
    const ts = lay.title ? lay.title[2] * H : 0, tt = lay.title && lay.title[3] === 2 ? TITLE.slice(0, 2) + '<br>' + TITLE.slice(2) : TITLE;
    await p.setContent(`<!doctype html><html><head>${HEAD}</head><body><canvas id="c" width="${W}" height="${H}" style="display:block"></canvas>${lay.title ? `<div class="t" style="font-size:${ts}px;top:${lay.title[1] * H}px;${lay.title[0] === 'c' ? 'left:0;right:0;text-align:center' : `left:${lay.title[0] * W}px`};line-height:1.12">${tt}</div>` : ''}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(async ([art, W, H, lay]) => {
      await document.fonts.ready;
      const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
      const im = {}; for (const k in art) im[k] = await load(art[k]);
      const c = document.getElementById('c').getContext('2d'); let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const [hx, hy, hw, hr] = lay.hero, cx = hx * W, cy = hy * H, S = Math.min(W, H * 1.9) / 1920;
      // wall: bricks, forge glow from below, vignette
      c.fillStyle = '#15100D'; c.fillRect(0, 0, W, H);
      const bw = 120 * S, bh = 52 * S; c.fillStyle = 'rgba(255,255,255,.028)';
      for (let r = 0, y = 0; y < H; r++, y += bh) for (let x = (r % 2) * -bw / 2; x < W; x += bw) c.fillRect(x + 4 * S, y + 4 * S, bw - 8 * S, bh - 8 * S);
      let gl = c.createRadialGradient(cx, cy + H * 0.25, 10, cx, cy + H * 0.25, Math.max(W, H) * 0.75);
      gl.addColorStop(0, 'rgba(255,120,30,.62)'); gl.addColorStop(0.35, 'rgba(210,70,16,.3)'); gl.addColorStop(1, 'rgba(255,106,26,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
      // supporting weapons fanned out behind the hero, dimmer
      const place = (img, x, y, w, rot, a) => { c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot * Math.PI / 180); const h = w * img.height / img.width; c.drawImage(img, -w / 2, -h / 2, w, h); c.restore(); };
      const HW = hw * W;
      place(im.jingu, cx + HW * 0.08, cy - HW * 0.3, HW * 1.5, -28, 0.75);
      place(im.jiguang, cx - HW * 0.02, cy - HW * 0.28, HW * 1.35, 24, 0.75);
      place(im.maton, cx - HW * 0.36, cy - HW * 0.34, HW * 0.9, -66, 0.7);
      // a soft halo so the hero separates from what is behind it
      gl = c.createRadialGradient(cx, cy, 10, cx, cy, HW * 0.55); gl.addColorStop(0, 'rgba(255,214,150,.5)'); gl.addColorStop(0.5, 'rgba(255,150,60,.18)'); gl.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
      // anvil under the hero
      const aw = HW * 0.5, ax = cx - aw * 0.46, at = cy + HW * 0.085, k = aw / 420;
      c.fillStyle = '#2B2522'; c.beginPath(); c.moveTo(ax - 40 * k, at); c.lineTo(ax + aw, at); c.lineTo(ax + aw, at + 26 * k); c.lineTo(ax + aw * 0.78, at + 40 * k); c.lineTo(ax + aw * 0.22, at + 40 * k); c.lineTo(ax, at + 26 * k); c.quadraticCurveTo(ax - 30 * k, at + 22 * k, ax - 40 * k, at); c.fill();
      c.fillStyle = '#5A4E46'; c.fillRect(ax - 30 * k, at, aw + 30 * k, 4 * k);
      c.fillStyle = '#221D1A'; c.fillRect(ax + aw * 0.3, at + 40 * k, aw * 0.4, 60 * k); c.fillStyle = '#2B2522'; c.fillRect(ax + aw * 0.14, at + 100 * k, aw * 0.72, 22 * k);
      const fl = c.createLinearGradient(0, at + 122 * k, 0, H); fl.addColorStop(0, 'rgba(18,13,10,.96)'); fl.addColorStop(1, 'rgba(10,7,6,1)'); c.fillStyle = fl; c.fillRect(0, at + 122 * k, W, H);
      // hero
      place(im.yu, cx, cy, HW * 1.37, hr, 1);
      // hammer coming down from the upper right
      c.save(); c.translate(cx + HW * 0.34, cy - HW * 0.2); c.rotate(-0.42); const hk = HW / 760;
      c.fillStyle = '#6B4A33'; c.fillRect(0, -7 * hk, W, 14 * hk); c.fillStyle = '#86603F'; c.fillRect(0, -7 * hk, W, 4 * hk);
      c.fillStyle = '#3D3936'; c.fillRect(-20 * hk, -44 * hk, 40 * hk, 88 * hk); c.fillStyle = '#5A5450'; c.fillRect(-20 * hk, -44 * hk, 8 * hk, 88 * hk); c.fillStyle = '#8A827C'; c.fillRect(-20 * hk, 36 * hk, 40 * hk, 8 * hk); c.fillRect(-20 * hk, -44 * hk, 40 * hk, 6 * hk);
      c.restore();
      // sparks
      for (let i = 0; i < 150; i++) { const a = -Math.PI * R(), d = HW * (0.08 + 0.6 * R() * R()), x = cx + Math.cos(a) * d * 1.25, y = cy + Math.sin(a) * d * 0.8 + HW * 0.03, s = (1.5 + 5 * R()) * S; c.fillStyle = `rgba(255,${150 + Math.floor(90 * R())},${40 + Math.floor(60 * R())},${0.35 + 0.6 * R()})`; c.fillRect(x, y, s, s); }
      for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,${130 + Math.floor(70 * R())},60,${0.12 + 0.3 * R()})`; const s = (1 + 3 * R()) * S; c.fillRect(R() * W, R() * H, s, s); }
      // vignette, a little darker behind the title
      gl = c.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.max(W, H) * 0.85); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,.62)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
      if (lay.title) { const t = document.querySelector('.t').getBoundingClientRect(); gl = c.createRadialGradient(t.x + t.width / 2, t.y + t.height / 2, 10, t.x + t.width / 2, t.y + t.height / 2, t.width * 0.75); gl.addColorStop(0, 'rgba(10,6,4,.6)'); gl.addColorStop(1, 'rgba(10,6,4,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H); }
    }, [art, W, H, lay]);
    await p.screenshot({ path: `${out}/${file}.png` });
  }
  // the logo alone: transparent background, cropped tight
  await p.setViewportSize({ width: 1800, height: 560 });
  await p.setContent(`<!doctype html><html><head>${HEAD}<style>body{background:transparent}</style></head><body><div class="t" id="t" style="position:static;display:inline-block;font-size:330px;padding:50px 40px 70px">${TITLE}</div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await (await p.$('#t')).screenshot({ path: `${out}/游戏LOGO.png`, omitBackground: true });
  console.log('ok'); await b.close();
})();
