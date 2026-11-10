// Composes store art from raw shots: captioned 1080x1920 screenshots and the 512 icon.
// node tools/store-compose.js <rawdir> <outdir>
const launch = require('./pw'); const fs = require('fs');
(async () => {
  const raw = process.argv[2], out = process.argv[3];
  const img = (n) => 'data:image/png;base64,' + fs.readFileSync(`${raw}/raw-${n}.png`).toString('base64');
  const HEAD = `<meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@900&family=Noto+Sans+SC:wght@700&display=block">
  <style>*{box-sizing:border-box}body{margin:0;background:#120E0C}
  .bg{background:radial-gradient(ellipse at 50% 0%,rgba(255,106,26,.38),transparent 60%),radial-gradient(ellipse at 50% 100%,rgba(200,16,46,.22),transparent 55%),#120E0C;color:#FBE9D8;position:relative;overflow:hidden}
  .brush{font-family:"Ma Shan Zheng",serif;text-shadow:0 0 30px rgba(255,122,26,.55),0 5px 0 #5A1F06}
  .phone{border-radius:44px;overflow:hidden;box-shadow:0 0 0 6px #2A211C,0 0 0 8px #4A3A30,0 30px 60px rgba(0,0,0,.6);display:block}
  .seal{display:inline-grid;place-items:center;background:#C8102E;color:#FBE9D8;font-family:"Ma Shan Zheng";border-radius:10px;transform:rotate(-6deg)}</style>`;
  const b = await launch(); const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const render = async (w, h, body, file) => { await p.setViewportSize({ width: w, height: h }); await p.setContent(`<!doctype html><html><head>${HEAD}</head><body>${body}</body></html>`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${file}` }); };
  const caps = [['title', '打铁 · 赌运气 · 还高利贷'], ['strike', '一锤升级，一锤碎'], ['fever', '火候满了，上头！'], ['ascend', '咸鱼翻身，进化成鲲'], ['evo', '每 25 级进化一次'], ['codex', '20 种奇葩兵器等你收集']];
  for (const [i, [n, cap]] of caps.entries()) {
    await render(1080, 1920, `<div class="bg" style="width:1080px;height:1920px;display:grid;justify-items:center;align-content:start;padding-top:70px;gap:56px">
      <div class="brush" style="font-size:${Math.min(116, Math.floor(980 / [...cap].length))}px;line-height:1.1;text-align:center;white-space:nowrap">${cap}</div>
      <img class="phone" src="${img(n)}" style="width:860px;height:1529px;object-fit:cover;object-position:top"></div>`, `screenshot-${i + 1}-${n}.png`);
  }
  // icon: brush 锤 on an ember tile with the shop seal
  await render(512, 512, `<div class="bg" style="width:512px;height:512px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#FF8E35 0%,#C2410C 38%,#3A1206 78%,#120E0C 100%)">
    <div class="brush" style="font-size:330px;line-height:1;color:#FFF6E0;text-shadow:0 0 40px rgba(255,200,120,.8),0 10px 0 #5A1F06;margin-top:-10px">锤</div>
    <span class="seal" style="position:absolute;right:46px;bottom:46px;width:96px;height:96px;font-size:62px;box-shadow:0 6px 0 #6B0717">铺</span></div>`, 'icon-512.png');
  // covers, key art and the logo are made by tools/store-keyart.js (TapTap rejects screenshot collages and taglines on them)
  console.log('ok'); await b.close();
})();
