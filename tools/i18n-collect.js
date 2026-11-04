// Plays the English build through as many paths as possible and records every masked template T() sees.
const launch = require('./pw');
const fs = require('fs');
(async () => {
  const b = await launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__raw = new Set(); window.__i18nCollect = (s) => window.__raw.add(s); });
  await p.goto('http://localhost:8766/index.html?lang=en', { waitUntil: 'networkidle' });
  const G = (fn, arg) => p.evaluate(fn, arg);
  const clickIf = async (sel) => { const e = await p.$(sel); if (e && await e.isVisible()) { await e.evaluate((el) => el.click()); await p.waitForTimeout(60); return true; } return false; };
  await clickIf('#tHelp'); await clickIf('#mOk'); await clickIf('#tShop'); await clickIf('#shopBack'); await clickIf('#tCodex'); await clickIf('#codexBack'); await clickIf('#tLang'); await clickIf('#sheet [data-l="en"]');
  for (let i = 0; i < 3; i++) { if (await G(() => !!window.__game.run)) break; await p.waitForTimeout(200); await clickIf('#modal:not([hidden]) #sheet button'); await clickIf('#tNew'); await p.waitForTimeout(200); await clickIf('#mOk'); }
  console.log('run?', await G(() => !!window.__game.run), await G(() => [!document.querySelector('#titleScreen').hidden, !document.querySelector('#modal').hidden]));
  const WEAP = await G(() => window.__game.WEAPONS.map(w => w.id));
  const ITEMS = ['bao','shen','hu','zhu','tian','cui','bu','qi','ya','xia','li','hui'];
  const RELICS = ['cuihuo','zhen','yan','jiang','lin','he','lu','gu','lian','feng','qi','ke','du','fu','ye','mo','shu','pu','hao','chun','jin','zhuang','xin','chi','tun','huo2'];
  await G((rl) => { const r = window.__game.run; r.relics = rl; window.__game.render(); }, RELICS);
  for (const tab of ['market','rack','bag','seals']) { await p.click(`[data-tab="${tab}"]`); }
  for (const w of WEAP) {
    for (let k = 0; k < 26; k++) {
      await G((w) => { const r = window.__game.run; if (r.sword.shape !== w || r.sword.level > 45) { r.sword.shape = w; r.sword.level = 8 + Math.floor(Math.random() * 30); } r.stam = 20; r.gold = 1e6; r.bag.hui = 1; window.__game.render(); }, w);
      await p.keyboard.press('Space'); await p.waitForTimeout(150);
      if (await clickIf('#regretBtn')) {}
    }
    await p.keyboard.press('s'); await p.waitForTimeout(80);
  }
  // items, store, rack
  for (const id of ITEMS) { await G((id) => { const r = window.__game.run; r.bag[id] = 2; window.__game.render(); }, id); await p.click('[data-tab="bag"]'); await clickIf(`.chip[data-id="${id}"]`); await clickIf('#iUse'); await clickIf('#iBack'); }
  await p.click('[data-tab="bag"]'); await clickIf('.chip.shopbtn'); for (let i = 0; i < 4; i++) await clickIf(`#sheet [data-k="${i}"]:not([disabled])`); await clickIf('#sBack');
  await G(() => { const r = window.__game.run; r.sword.level = 6; window.__game.render(); }); await p.keyboard.press('a'); await p.click('[data-tab="rack"]'); await clickIf('.slot[data-i="0"]'); await clickIf('#rBack');
  await clickIf('.slot[data-i="0"]'); await clickIf('#rTake'); await p.keyboard.press('a'); await clickIf('.slot[data-i="0"]'); await clickIf('#rFeed');
  await G(() => { const r = window.__game.run; r.sword.level = 5; window.__game.render(); }); await p.keyboard.press('a'); await clickIf('.slot[data-i="0"]'); await clickIf('#rSell');
  // fever, last strike, evolution
  await G(() => { const r = window.__game.run; r.sword.level = 20; r.fire = 9; r.buffs.tian = 1; r.stam = 20; window.__game.render(); });
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(160); }
  await G(() => { const r = window.__game.run; r.sword.level = 24; r.bag.bu = 1; window.__game.render(); }); await p.click('[data-tab="bag"]'); await clickIf('.chip[data-id="bu"]'); await clickIf('#iUse');
  // days, settle, draft, bazaar with every offer type, loans, reroll
  for (let d = 0; d < 3; d++) { await G(() => { const r = window.__game.run; r.stam = 0; r.gold = 1e6; window.__game.render(); }); await clickIf('#btnRest'); await p.waitForTimeout(80); }
  await clickIf('#mGo'); await clickIf('#sheet .card');
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 4; i++) await clickIf(`#sheet [data-o="${i}"]:not([disabled])`);
    if (round === 0) await clickIf('#sheet [data-loan="1"]');
    await G(() => { window.__game.run.gold = 1e6; }); await clickIf('#fRe');
  }
  await clickIf('#fGo');
  await G(() => { const r = window.__game.run; r.mat = 'iron'; r.fair = null; r.gold = 1e6; window.__game.market(); }); await clickIf('#sheet [data-o="0"]'); await clickIf('#fGo');
  // menu, codex in game, language, sound/vibration toggles, rest confirmation
  await clickIf('#menuBtn'); await clickIf('#mSnd'); await clickIf('#mVib'); await clickIf('#mCodex'); await clickIf('#codexBack');
  await clickIf('#menuBtn'); await clickIf('#mLang'); await clickIf('#sheet [data-l="en"]'); await clickIf('#mRules'); await clickIf('#mOk');
  await G(() => { const r = window.__game.run; r.stam = 5; window.__game.render(); }); await clickIf('#btnRest');
  await G(() => { const r = window.__game.run; r.stam = 0; r.bag = {}; window.__game.render(); }); await p.keyboard.press('Space');
  await G(() => { const r = window.__game.run; r.sword.level = 0; window.__game.render(); }); await p.keyboard.press('s'); await p.keyboard.press('a');
  // game over
  for (let d = 0; d < 4; d++) { await G(() => { const r = window.__game.run; if (!r) return; r.stam = 0; r.gold = 0; r.rack = []; r.sword.level = 0; window.__game.render(); }); await clickIf('#btnRest'); await p.waitForTimeout(80); }
  await clickIf('#mShop'); await clickIf('#shopBack'); await clickIf('#tNew');
  // material choice sheet + title after progress
  await G(() => { window.__game.meta.mats = ['iron','steel']; window.__game.meta.best.period = 3; }); await clickIf('#menuBtn'); await clickIf('#mHome'); await clickIf('#tNew'); await clickIf('#tNew'); await clickIf('#sheet .card');
  const raw = await G(() => [...window.__raw]);
  const keys = new Set(); for (const s of raw) keys.add(await G((s) => window.__game.maskKey(s).key, s));
  // data descriptions (D) and names (N) are enumerated from the source
  const src = fs.readFileSync('../forge/game.js', 'utf8');
  for (const m of src.matchAll(/descEn: (['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(await G((s) => window.__game.maskKey(s).key, m[2].replace(/\\'/g, "'")));
  fs.writeFileSync('keys.json', JSON.stringify([...keys].sort(), null, 1));
  console.log('raw', raw.length, 'keys', keys.size, 'errors', errs.slice(0, 3));
  await b.close();
})();
