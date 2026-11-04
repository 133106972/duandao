// TapTap store images from the clean renders of tools/store-art.js: crops each render around the glowing weapon
// and adds the brush title only where the store rules allow it.
// node tools/store-kit.js <renders dir> <out dir>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const src = process.argv[2], out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const data = (n) => 'data:image/png;base64,' + fs.readFileSync(`${src}/${n}.png`).toString('base64');
  const HEAD = '<meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=block"><style>*{margin:0;box-sizing:border-box}body{background:transparent}.t{font-family:"Ma Shan Zheng",serif;color:#FBE9D8;white-space:nowrap;line-height:1;text-shadow:0 0 .2em rgba(255,122,26,.6),0 .04em 0 #5A1F06}</style>';
  // [file, w, h, render, subject width as a share of the image, subject centre x, y, title {size, x, y} or null]
  const jobs = [
    ['宣传图-1920x1080', 1920, 1080, 'big-wide-plain', 0.6, 0.62, 0.6, { size: 150, x: 0.07, y: 0.14 }],
    ['无LOGO宣传图-横版-1920x1080', 1920, 1080, 'big-wide-plain', 0.6, 0.6, 0.52, null],
    ['无LOGO宣传图-竖版-1080x1440', 1080, 1440, 'big-tall-plain', 0.92, 0.5, 0.52, null],
    ['游戏库背景壁纸-3840x1240', 3840, 1240, 'big-wall-plain', 0.4, 0.64, 0.58, null],
    ['横版封面-1380x645', 1380, 645, 'big-wide-plain', 0.46, 0.7, 0.64, { size: 104, x: 0.05, y: 0.1 }],
    ['竖版封面-1000x1500', 1000, 1500, 'big-tall-plain', 0.95, 0.5, 0.64, { size: 150, x: 'c', y: 0.12 }],
  ];
  for (const [file, w, h, render, frac, ax, ay, title] of jobs) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head>${HEAD}</head><body><canvas id="c" width="${w}" height="${h}" style="display:block"></canvas>${title ? `<div class="t" id="t" style="position:absolute;font-size:${title.size}px;top:${title.y * h}px;${title.x === 'c' ? 'left:0;right:0;text-align:center' : `left:${title.x * w}px`}">一锤子买卖</div>` : ''}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(async ([url, w, h, frac, ax, ay]) => {
      await document.fonts.ready;
      const img = new Image(); img.src = url; await img.decode();
      const t = document.createElement('canvas'); t.width = img.width; t.height = img.height; const tc = t.getContext('2d'); tc.drawImage(img, 0, 0);
      const d = tc.getImageData(0, 0, t.width, t.height).data; let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
      for (let y = 0; y < t.height; y += 2) for (let x = 0; x < t.width; x += 2) { const i = (y * t.width + x) * 4; if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 > 150) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      let s = (w * frac) / (x1 - x0); s = Math.max(s, w / img.width, h / img.height); // never leave uncovered edges
      let dx = ax * w - ((x0 + x1) / 2) * s, dy = ay * h - ((y0 + y1) / 2) * s;
      dx = Math.min(0, Math.max(w - img.width * s, dx)); dy = Math.min(0, Math.max(h - img.height * s, dy));
      const c = document.getElementById('c').getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(img, dx, dy, img.width * s, img.height * s);
    }, [data(render), w, h, frac, ax, ay]);
    await p.screenshot({ path: `${out}/${file}.png` });
  }
  // the logo: brush title on transparent, cropped tight
  await p.setViewportSize({ width: 1800, height: 520 });
  await p.setContent(`<!doctype html><html><head>${HEAD}</head><body><div class="t" id="t" style="display:inline-block;font-size:330px;padding:40px 30px 50px">一锤子买卖</div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await (await p.$('#t')).screenshot({ path: `${out}/游戏LOGO.png`, omitBackground: true });
  console.log('ok'); await b.close();
})();
