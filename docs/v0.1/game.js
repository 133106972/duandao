// 一锤子买卖 — a forging gamble incremental. Plain JS, no dependencies.
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const R = Math.random;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DEMO = location.hash === '#demo';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAYS = 3;

// ---------- numbers: Chinese large units ----------
const UNITS = [['极', 1e48], ['载', 1e44], ['正', 1e40], ['涧', 1e36], ['沟', 1e32], ['穰', 1e28], ['秭', 1e24], ['垓', 1e20], ['京', 1e16], ['兆', 1e12], ['亿', 1e8], ['万', 1e4]];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n >= 1e52) return n.toExponential(2).replace('e+', 'e');
  for (const [u, v] of UNITS) if (n >= v) { const x = n / v; return String(+x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)) + u; }
  return Math.floor(n).toLocaleString('zh-CN');
}
const pct = (x) => (x * 100 >= 10 ? (x * 100).toFixed(0) : (x * 100).toFixed(1)) + '%';

// ---------- content ----------
const MATS = [
  { id: 'iron', name: '生铁', base: 8, color: '#8E9197', cost: 0, desc: '最便宜的料，起家用' },
  { id: 'steel', name: '精钢', base: 24, color: '#BFC9D3', cost: 60, desc: '底价是生铁的 3 倍' },
  { id: 'xuan', name: '玄铁', base: 80, color: '#5E6C90', cost: 240, desc: '底价是生铁的 10 倍' },
  { id: 'meteor', name: '陨铁', base: 300, color: '#8C6BBE', cost: 900, desc: '天上掉下来的，底价 37 倍' },
  { id: 'dragon', name: '龙骨', base: 1500, color: '#E3C47C', cost: 3600, desc: '传说中的料，底价 187 倍' },
];
const MAT = Object.fromEntries(MATS.map((m) => [m.id, m]));
const TIERS = [[0, '凡品', '#A39C92'], [5, '良品', '#86C46A'], [10, '精品', '#4FA6E3'], [15, '名器', '#B680EC'], [20, '宝器', '#F2A43C'], [30, '神兵', '#FF5C3E'], [45, '仙兵', '#FF5FB8'], [60, '天工', '#FFF1A8']];
const tierOf = (L) => { let t = TIERS[0], i = 0; TIERS.forEach((x, k) => { if (L >= x[0]) { t = x; i = k; } }); return { min: t[0], name: t[1], color: t[2], idx: i }; };
const NAMES = ['青锋', '赤霄', '寒月', '断水', '流光', '照胆', '惊鸿', '听雨', '龙吟', '秋水', '玄霜', '破军', '长风', '落雁', '飞雪', '无咎', '孤鸿', '镇岳', '星河', '沧浪'];

// Seals (秘籍): one picked after every repaid period
const RELICS = [
  { id: 'cuihuo', ch: '淬', name: '淬火油', desc: '碎裂率 ×0.7', mod: (m) => { m.breakMul *= 0.7; } },
  { id: 'zhen', ch: '砧', name: '老铁砧', desc: '每天多 3 锤', mod: (m) => { m.strikesAdd += 3; } },
  { id: 'yan', ch: '眼', name: '火眼', desc: '大成功率 +6%', mod: (m) => { m.greatAdd += 0.06; } },
  { id: 'jiang', ch: '匠', name: '匠心', desc: '成功率 +6%（从“无变化”里匀过来）', mod: (m) => { m.succAdd += 0.06; } },
  { id: 'lin', ch: '鳞', name: '龙鳞锤', desc: '每升一级，估价多涨 10%', mod: (m) => { m.growthAdd += 0.1; } },
  { id: 'he', ch: '吆', name: '吆喝', desc: '卖价 ×1.3', mod: (m) => { m.sellMul *= 1.3; } },
  { id: 'lu', ch: '炉', name: '回炉', desc: '剑碎了，拿回估价的 40%' },
  { id: 'gu', ch: '骨', name: '反骨', desc: '受损时返还 1 锤' },
  { id: 'lian', ch: '连', name: '连击谱', desc: '连续成功 3 次，下一锤必定大成功' },
  { id: 'feng', ch: '锋', name: '开锋', desc: '新剑胚直接从 +3 开始', mod: (m) => { m.startLevel += 3; } },
  { id: 'qi', ch: '契', name: '地契', desc: '欠款 ×0.85', mod: (m) => { m.quotaMul *= 0.85; } },
  { id: 'ke', ch: '客', name: '熟客', desc: '行情低于 ×1.00 时，熟客按 ×1.00 收' },
  { id: 'du', ch: '骰', name: '赌徒骰', desc: '大成功 +3 级（原本 +2），碎裂率 +2%', mod: (m) => { m.greatStep = 3; m.breakAdd += 0.02; } },
  { id: 'fu', ch: '符', name: '护身符', desc: '每期第一次碎裂，变成受损' },
  { id: 'ye', ch: '夜', name: '夜市', desc: '收工时砧上有剑，这把剑估价 +12%' },
  { id: 'mo', ch: '磨', name: '磨刀石', desc: '“无变化”时 35% 几率改成成功' },
  { id: 'shu', ch: '熟', name: '钱庄熟人', desc: '每次还款，返还 15%' },
  { id: 'pu', ch: '谱', name: '名剑谱', desc: '+10 及以上的剑，卖价 ×1.6' },
  { id: 'hao', ch: '号', name: '打铁号子', desc: '每天第一锤必定成功' },
  { id: 'chun', ch: '纯', name: '炉火纯青', desc: '+15 以后，每级估价再多涨 15%', mod: (m) => { m.lateGrowth += 0.15; } },
  { id: 'jin', ch: '算', name: '金算盘', desc: '每次还完款，剩下的金子生 10% 利息' },
  { id: 'zhuang', ch: '庄', name: '坐庄', desc: '行情涨跌幅度翻倍' },
  { id: 'xin', ch: '信', name: '内幕消息', desc: '提前一天知道明天的行情' },
];
const RMAP = Object.fromEntries(RELICS.map((r) => [r.id, r]));

const UPGS = [
  { id: 'hands', name: '起早贪黑', desc: '每天 +1 锤', max: 5, cost: (l) => Math.round(25 * Math.pow(2, l)) },
  { id: 'craft', name: '祖传手艺', desc: '成功率 +1.5%', max: 6, cost: (l) => Math.round(30 * Math.pow(1.9, l)) },
  { id: 'bank', name: '钱庄关系', desc: '欠款 -4%', max: 5, cost: (l) => Math.round(40 * Math.pow(2, l)) },
  { id: 'eye', name: '识货', desc: '挑秘籍时多一个选项', max: 1, cost: () => 150 },
  { id: 'charm', name: '祖传护身符', desc: '每局开张自带「护身符」', max: 1, cost: () => 300 },
];

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const META_DEFAULT = { fame: 0, totalFame: 0, upg: {}, mats: ['iron'], mat: 'iron', runs: 0, best: { period: 0, level: 0, sale: 0 }, seenHelp: false, muted: false };
let meta = Object.assign({}, META_DEFAULT, DEMO ? {} : store.get('ycmm-v0.1-meta', {}));
let run = DEMO ? null : store.get('ycmm-v0.1-run', null);
const saveMeta = () => { if (!DEMO) store.set('ycmm-v0.1-meta', meta); };
const saveRun = () => { if (!DEMO && run) store.set('ycmm-v0.1-run', run); };

// ---------- rules ----------
const has = (id) => !!run && run.relics.includes(id);
const ulv = (id) => meta.upg[id] || 0;
function mods() {
  const m = { breakMul: 1, breakAdd: 0, greatAdd: 0, succAdd: ulv('craft') * 0.015, growthAdd: 0, lateGrowth: 0, strikesAdd: ulv('hands'), sellMul: 1, quotaMul: Math.pow(0.96, ulv('bank')), startLevel: 0, greatStep: 2 };
  if (run) for (const id of run.relics) if (RMAP[id] && RMAP[id].mod) RMAP[id].mod(m);
  return m;
}
function odds(L) {
  const m = mods();
  let brk = L <= 3 ? 0 : Math.min(0.45, (L - 3) * 0.015) * m.breakMul + m.breakAdd;
  let dmg = Math.min(0.25, 0.10 + L * 0.008);
  let keep = 0.18;
  let great = Math.max(0.04, 0.20 - L * 0.008) + m.greatAdd;
  const sk = Math.min(keep, m.succAdd); keep -= sk;
  let succ = 1 - brk - dmg - keep - great;
  if (succ < 0.03) { const tot = brk + dmg + keep + great, k = 0.97 / tot; brk *= k; dmg *= k; keep *= k; great *= k; succ = 0.03; }
  return { brk, dmg, keep, succ, great };
}
function value(s) {
  const m = mods(), g = 1.6 + m.growthAdd;
  let v = MAT[s.mat].base * Math.pow(g, s.level);
  if (m.lateGrowth && s.level > 15) v *= Math.pow((g + m.lateGrowth) / g, s.level - 15);
  return v * s.mul;
}
const marketEff = () => (has('ke') ? Math.max(1, run.market) : run.market);
function salePrice() {
  const s = run.sword; if (s.level < 1) return 0;
  let p = value(s) * marketEff() * mods().sellMul;
  if (has('pu') && s.level >= 10) p *= 1.6;
  return p;
}
const perDay = () => 12 + mods().strikesAdd;
const quota = (n = run.period) => Math.round(50 * Math.pow(2.1, n - 1) * mods().quotaMul);
function stepMarket(mk) {
  let x = Math.log(mk) * 0.7 + gauss() * 0.22 * (has('zhuang') ? 2 : 1);
  if (R() < 0.07) x += 0.55; // festival day
  return clamp(Math.exp(x), 0.45, 3);
}
function newBlank() {
  run.sword = { mat: run.mat, level: mods().startLevel, mul: 1, name: NAMES[Math.floor(R() * NAMES.length)] };
  run.streak = 0; fx.born = performance.now();
}
function newRun(mat) {
  run = { mat, period: 1, day: 1, gold: 0, relics: [], market: 1, next: 1, mhist: [], strikes: 0, streak: 0, forceGreat: false, firstOfDay: true, charmUsed: false,
    stats: { strikes: 0, breaks: 0, sold: 0, maxSale: 0, maxLevel: 0 }, log: [] };
  if (ulv('charm')) run.relics.push('fu');
  for (let i = 0; i < 9; i++) run.mhist.push(clamp(1 + gauss() * 0.15, 0.6, 1.5));
  run.mhist.push(1);
  run.next = stepMarket(1);
  newBlank(); run.strikes = perDay();
  meta.runs++; saveMeta();
  addLog('开张了。钱庄说：三天后来收 ' + fmt(quota()) + '。');
  saveRun();
}

// ---------- actions ----------
let lastStrike = 0;
function strike() {
  if (!run || modalOpen() || run.strikes <= 0) return;
  const now = performance.now(); if (now - lastStrike < 140) return; lastStrike = now;
  ensureAudio();
  run.strikes--; run.stats.strikes++;
  const s = run.sword, L = s.level, o = odds(L), m = mods();
  let r;
  if (run.forceGreat) { r = 'great'; run.forceGreat = false; }
  else if (has('hao') && run.firstOfDay) r = R() < o.great / (o.great + o.succ) ? 'great' : 'succ';
  else {
    let x = R();
    if ((x -= o.brk) < 0) r = 'brk'; else if ((x -= o.dmg) < 0) r = 'dmg'; else if ((x -= o.keep) < 0) r = 'keep'; else if ((x -= o.succ) < 0) r = 'succ'; else r = 'great';
  }
  run.firstOfDay = false;
  if (r === 'keep' && has('mo') && R() < 0.35) r = 'succ';
  let note = '';
  if (r === 'brk' && has('fu') && !run.charmUsed) { r = 'dmg'; run.charmUsed = true; note = '护身符替你挡了一次碎裂'; }
  let delta = 0;
  if (r === 'succ') { delta = 1; run.streak++; }
  else if (r === 'great') { delta = m.greatStep; run.streak++; }
  else if (r === 'keep') run.streak = 0;
  else if (r === 'dmg') { delta = L > 0 ? -1 : 0; run.streak = 0; if (has('gu')) { run.strikes++; note = note || '反骨：返还 1 锤'; } }
  else if (r === 'brk') { run.streak = 0; run.stats.breaks++; if (has('lu')) { const back = value(s) * 0.4; run.gold += back; note = '回炉：拿回 ' + fmt(back); } }
  if (has('lian') && run.streak >= 3 && (r === 'succ' || r === 'great')) { run.forceGreat = true; run.streak = 0; note = note || '连击谱：下一锤必定大成功'; }
  const name = s.name;
  if (r === 'brk') { fx.ghost = { ...s }; newBlank(); fx.born = performance.now() + 450; }
  else s.level = Math.max(0, L + delta);
  run.stats.maxLevel = Math.max(run.stats.maxLevel, run.sword.level);
  const after = run.sword.level;
  const msg = { succ: ['成功 +' + L + ' → +' + after, 's'], great: ['大成功！+' + L + ' → +' + after, 'g'], keep: ['无变化，还是 +' + L, ''], dmg: ['受损 +' + L + ' → +' + after, 'd'], brk: ['碎了！+' + L + ' 的' + name + '没了', 'b'] }[r];
  addLog(msg[0], msg[1]); if (note) addLog(note, 'c');
  fx.strike(r, delta);
  sfx('hit');
  render(); saveRun();
}
function sell() {
  if (!run || modalOpen()) return;
  const s = run.sword;
  if (s.level < 1) { toast('至少打到 +1 才有人收'); return; }
  ensureAudio();
  const p = salePrice();
  run.gold += p; run.stats.sold++; run.stats.maxSale = Math.max(run.stats.maxSale, p);
  addLog('卖出 +' + s.level + ' ' + s.name + '，得 ' + fmt(p), 'c');
  fx.sold(p); sfx('coin');
  newBlank(); render(); saveRun();
}
let restArmed = 0;
function rest() {
  if (!run || modalOpen()) return;
  if (run.strikes > 0 && performance.now() - restArmed > 2500) { restArmed = performance.now(); $('#btnRest').textContent = '还剩 ' + run.strikes + ' 锤，确定？'; setTimeout(render, 2500); return; }
  restArmed = 0; endDay();
}
function endDay() {
  const s = run.sword;
  if (has('ye') && s.level > 0) { s.mul *= 1.12; addLog('夜市：砧上的剑估价 +12%', 'c'); }
  const prev = run.market;
  run.market = run.next; run.next = stepMarket(run.market);
  run.mhist.push(run.market); if (run.mhist.length > 14) run.mhist.shift();
  run.day++; run.strikes = perDay(); run.firstOfDay = true;
  ensureAudio();
  if (run.day > DAYS) { settle(); return; }
  const chg = run.market / prev - 1;
  addLog('第 ' + run.day + ' 天，行情 ×' + run.market.toFixed(2) + (chg >= 0 ? '，涨 ' : '，跌 ') + pct(Math.abs(chg)));
  fx.pop('第 ' + run.day + ' 天', '#F3E9DC'); sfx('day');
  render(); saveRun();
}
function settle() {
  const q = quota(); const lines = [['欠款', fmt(q)], ['手上的金子', fmt(run.gold)]];
  if (run.gold < q && run.sword.level >= 1) {
    const liq = salePrice(); run.gold += liq; run.stats.maxSale = Math.max(run.stats.maxSale, liq);
    lines.push(['砧上的 +' + run.sword.level + ' 按 ×' + marketEff().toFixed(2) + ' 抵债', fmt(liq)]);
    newBlank();
  }
  if (run.gold >= q) {
    run.gold -= q;
    if (has('shu')) { const b = q * 0.15; run.gold += b; lines.push(['钱庄熟人返还', fmt(b)]); }
    if (has('jin')) { const it = run.gold * 0.1; run.gold += it; lines.push(['金算盘利息', fmt(it)]); }
    lines.push(['还完剩下', fmt(run.gold)]);
    const cleared = run.period;
    run.period++; run.day = 1; run.charmUsed = false; run.strikes = perDay(); run.firstOfDay = true;
    sfx('pay'); saveRun(); render();
    openSheet(`<h2>第 ${cleared} 期 · 还清了</h2><p>钱庄的人点了点钱，走了。下一期要还 <b>${fmt(quota())}</b>。</p>${linesHtml(lines)}<div class="btns"><button class="btn" id="mGo" type="button">挑一本秘籍</button></div>`);
    $('#mGo').onclick = draft;
    if (DEMO) setTimeout(() => $('#mGo') && $('#mGo').click(), 1600);
  } else {
    lines.push(['还差', fmt(q - run.gold)]);
    gameOver(lines);
  }
}
function draft() {
  const pool = shuffle(RELICS.filter((r) => !run.relics.includes(r.id))).slice(0, 3 + ulv('eye'));
  if (!pool.length) { closeSheet(); return; }
  openSheet(`<h2>挑一本秘籍</h2><p>只能拿一本，整局有效。</p><div class="cards">${pool.map((r) => `<button class="card" type="button" data-id="${r.id}"><span class="seal">${r.ch}</span><b>${r.name}</b><span>${r.desc}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => {
    run.relics.push(b.dataset.id); addLog('得到秘籍「' + RMAP[b.dataset.id].name + '」', 'c');
    closeSheet(); render(); saveRun(); sfx('succ');
  });
  if (DEMO) setTimeout(() => { const c = $('#sheet .card'); if (c) c.click(); }, 1400);
}
function gameOver(lines) {
  const st = run.stats, cleared = run.period - 1;
  const fame = Math.round(3 * cleared + 0.5 * cleared * cleared + 3 * Math.log10(1 + st.maxSale));
  meta.fame += fame; meta.totalFame += fame;
  const b = meta.best, rec = cleared > b.period || st.maxSale > b.sale;
  b.period = Math.max(b.period, cleared); b.level = Math.max(b.level, st.maxLevel); b.sale = Math.max(b.sale, st.maxSale);
  saveMeta(); store.del('ycmm-v0.1-run'); sfx('fail');
  const L2 = [['撑过', cleared + ' 期'], ['最高打到', '+' + st.maxLevel], ['单把最高卖价', fmt(st.maxSale)], ['一共打了', st.strikes + ' 锤'], ['碎掉', st.breaks + ' 把']];
  run = null; render();
  openSheet(`<h2>铺子被钱庄收走了</h2>${linesHtml(lines)}${linesHtml(L2)}<p>名望 <b style="color:var(--gold)">+${fame}</b>${rec ? ' · 新纪录' : ''}，可以去铺子里升级。</p><div class="btns"><button class="btn" id="mAgain" type="button">再开一家</button><button class="btn ghost" id="mShop" type="button">去铺子</button></div>`);
  $('#mAgain').onclick = () => { closeSheet(); startRun(); };
  $('#mShop').onclick = () => { closeSheet(); showShop(); };
}
function startRun() {
  const owned = MATS.filter((m) => meta.mats.includes(m.id));
  const begin = (id) => { meta.mat = id; saveMeta(); closeSheet(); hideScreens(); newRun(id); render(); if (!meta.seenHelp) showHelp(); };
  if (owned.length < 2) return begin('iron');
  openSheet(`<h2>今天打什么料？</h2><div class="cards">${owned.map((m) => `<button class="card" type="button" data-id="${m.id}"><span class="seal" style="background:${m.color};color:#120E0C">${m.name[0]}</span><b>${m.name} · 底价 ${m.base}</b><span>${m.desc}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => begin(b.dataset.id));
}

// ---------- UI ----------
const linesHtml = (ls) => `<div class="lines">${ls.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
const modalOpen = () => !$('#modal').hidden || !$('#titleScreen').hidden || !$('#shopScreen').hidden;
function openSheet(html) { $('#sheet').innerHTML = html; $('#modal').hidden = false; const f = $('#sheet button'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { $('#modal').hidden = true; }
function hideScreens() { $('#titleScreen').hidden = true; $('#shopScreen').hidden = true; }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800); }
function addLog(t, cls = '') { if (!run) return; run.log.unshift([t, cls]); run.log.length = Math.min(run.log.length, 5); }
function showTitle() {
  hideScreens(); closeSheet(); $('#titleScreen').hidden = false;
  $('#tCont').hidden = !run; $('#tFame').textContent = fmt(meta.fame);
  $('#tFoot').textContent = meta.best.period ? `最好成绩：撑过 ${meta.best.period} 期 · 最高 +${meta.best.level} · 单把 ${fmt(meta.best.sale)}` : 'v0.1 · 存档在这台设备的浏览器里';
}
function showShop() {
  hideScreens(); $('#shopScreen').hidden = false; $('#sFame').textContent = fmt(meta.fame);
  $('#matList').innerHTML = MATS.filter((m) => m.cost > 0).map((m) => {
    const own = meta.mats.includes(m.id);
    return `<div class="item"><b>${m.name} · 底价 ${m.base}</b><button class="btn${own ? ' ghost' : ''}" type="button" data-mat="${m.id}" ${own || meta.fame < m.cost ? 'disabled' : ''}>${own ? '已有' : m.cost + ' 名望'}</button><span>${m.desc}</span></div>`;
  }).join('');
  $('#upgList').innerHTML = UPGS.map((u) => {
    const l = ulv(u.id), maxed = l >= u.max, c = maxed ? 0 : u.cost(l);
    return `<div class="item"><b>${u.name}${u.max > 1 ? ` · ${l}/${u.max}` : ''}</b><button class="btn${maxed ? ' ghost' : ''}" type="button" data-upg="${u.id}" ${maxed || meta.fame < c ? 'disabled' : ''}>${maxed ? '满了' : c + ' 名望'}</button><span>${u.desc}</span></div>`;
  }).join('');
}
$('#shopScreen').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.mat) { const m = MAT[b.dataset.mat]; if (meta.fame >= m.cost) { meta.fame -= m.cost; meta.mats.push(m.id); sfx('pay'); } }
  if (b.dataset.upg) { const u = UPGS.find((x) => x.id === b.dataset.upg), l = ulv(u.id), c = u.cost(l); if (l < u.max && meta.fame >= c) { meta.fame -= c; meta.upg[u.id] = l + 1; sfx('pay'); } }
  saveMeta(); showShop();
});
function showHelp() {
  meta.seenHelp = true; saveMeta();
  openSheet(`<h2>规矩</h2><ol class="help">
    <li>你开了间铁匠铺，欠了钱庄的钱。每 ${DAYS} 天还一期，一期比一期多。</li>
    <li>点「锤」打铁。每一锤可能<b style="color:var(--o-succ)">成功</b> +1、<b style="color:var(--o-great)">大成功</b> +2，也可能受损 -1，甚至<b style="color:var(--o-brk)">碎掉</b>。</li>
    <li>等级越高越值钱（每级涨 60%），也越容易碎。碎了就什么都没了。</li>
    <li>觉得够了就「出售」。卖价 = 估价 × 当天行情，行情每天变。</li>
    <li>每天锤数有限，用完就「收工」。还款日钱不够，砧上的剑会被拿去抵债。</li>
    <li>每还清一期，挑一本秘籍。铺子倒了会得名望，拿去永久升级。</li>
  </ol><p>电脑上：空格 = 锤，S = 出售，E = 收工</p><div class="btns"><button class="btn" id="mOk" type="button">开干</button></div>`);
  $('#mOk').onclick = closeSheet;
}
$('#tNew').onclick = () => { if (run && !confirmNew()) return; startRun(); };
let newArmed = 0;
function confirmNew() { if (performance.now() - newArmed < 3000) return true; newArmed = performance.now(); $('#tNew').textContent = '会放弃现在这一局，再点一次'; setTimeout(() => { $('#tNew').textContent = '开张'; }, 3000); return false; }
$('#tCont').onclick = () => { hideScreens(); render(); };
$('#tShop').onclick = showShop;
$('#tHelp').onclick = showHelp;
$('#shopBack').onclick = showTitle;
$('#menuBtn').onclick = () => {
  openSheet(`<h2>歇会儿</h2><div class="btns"><button class="btn" id="mRes" type="button">接着打</button><button class="btn ghost" id="mSnd" type="button">声音：${meta.muted ? '关' : '开'}</button><button class="btn ghost" id="mRules" type="button">规矩</button><button class="btn ghost" id="mHome" type="button">回到门口（自动存档）</button></div>`);
  $('#mRes').onclick = closeSheet;
  $('#mSnd').onclick = () => { meta.muted = !meta.muted; saveMeta(); $('#mSnd').textContent = '声音：' + (meta.muted ? '关' : '开'); };
  $('#mRules').onclick = showHelp;
  $('#mHome').onclick = showTitle;
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && $('#sheet .card') === null && !$('#mAgain') && !$('#mGo')) closeSheet(); });

// hold-to-strike
let holdT = 0;
const btnS = $('#btnStrike');
btnS.addEventListener('pointerdown', (e) => { e.preventDefault(); strike(); clearInterval(holdT); holdT = setInterval(strike, 260); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btnS.addEventListener(ev, () => clearInterval(holdT)));
btnS.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); strike(); } });
$('#btnSell').onclick = sell;
$('#btnRest').onclick = rest;
$('#seals').addEventListener('click', (e) => { const b = e.target.closest('.seal'); if (b) toast(RMAP[b.dataset.id].name + '：' + RMAP[b.dataset.id].desc); });
addEventListener('keydown', (e) => {
  if (e.repeat && e.code !== 'Space') return;
  if (modalOpen()) return;
  if (e.code === 'Space') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); strike(); }
  else if (e.key === 's' || e.key === 'S') sell();
  else if (e.key === 'e' || e.key === 'E') rest();
});

function render() {
  if (!run) return;
  const s = run.sword, t = tierOf(s.level), q = quota();
  $('#period').textContent = run.period;
  $('#days').innerHTML = Array.from({ length: DAYS }, (_, i) => `<i class="${i < run.day ? 'on' : ''}"></i>`).join('');
  $('#quota').textContent = fmt(q);
  $('#gold').textContent = fmt(run.gold);
  const left = DAYS - run.day;
  $('#gap').textContent = run.gold >= q ? '够还了' : (left ? `${left} 天后` : '明早') + '收账，还差 ' + fmt(q - run.gold);
  $('#meter').style.width = clamp(run.gold / q * 100, 0, 100) + '%';
  const tierEl = $('#sTier'); tierEl.textContent = t.name; tierEl.style.color = t.color;
  $('#sName').textContent = MAT[s.mat].name + ' · ' + s.name;
  const lv = $('#sLevel'); lv.textContent = '+' + s.level; lv.style.color = s.level ? t.color : '#F3E9DC';
  $('#sVal').textContent = fmt(value(s));
  const o = odds(s.level), parts = [o.brk, o.dmg, o.keep, o.succ, o.great];
  $('#obar').querySelectorAll('i').forEach((el, i) => { el.style.width = (parts[i] * 100) + '%'; });
  const labels = ['碎裂', '受损', '无变化', '成功', run.forceGreat ? '必大成功' : '大成功 +' + mods().greatStep];
  const colors = ['--o-brk', '--o-dmg', '--o-keep', '--o-succ', '--o-great'];
  $('#olegend').innerHTML = parts.map((p, i) => `<span><b style="color:var(${colors[i]})">${pct(p)}</b>${labels[i]}</span>`).join('');
  $('#strikes').textContent = run.strikes > 0 ? '剩 ' + run.strikes + ' 锤' : '今天打完了';
  btnS.disabled = run.strikes <= 0;
  const sp = $('#btnSell'); sp.disabled = s.level < 1;
  $('#sellPrice').textContent = s.level < 1 ? '+1 起收' : fmt(salePrice());
  const rb = $('#btnRest');
  if (performance.now() - restArmed > 2500) rb.textContent = run.day >= DAYS ? '收工 · 还款' : '收工';
  rb.classList.toggle('hot', run.strikes <= 0);
  const mk = run.market, prev = run.mhist[run.mhist.length - 2] || 1, chg = mk / prev - 1;
  $('#mNow').textContent = '×' + mk.toFixed(2);
  const mc = $('#mChg'); mc.textContent = (chg >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(chg)); mc.className = 'mchg ' + (chg >= 0 ? 'up' : 'down');
  $('#mTip').textContent = has('xin') ? `内幕消息：明天 ×${run.next.toFixed(2)}${run.next > mk ? '，要涨' : '，要跌'}` : (has('ke') && mk < 1 ? '熟客按 ×1.00 收。' : '卖价 = 估价 × 当天行情。行情每天变，可以留着剑等明天。');
  drawMarket();
  $('#seals').innerHTML = run.relics.length ? run.relics.map((id) => `<button class="seal" type="button" data-id="${id}" title="${RMAP[id].name}：${RMAP[id].desc}" aria-label="${RMAP[id].name}">${RMAP[id].ch}</button>`).join('') : '<span class="empty">还没有秘籍。每还清一期能挑一本。</span>';
  $('#log').innerHTML = run.log.map(([tx, c]) => `<div class="${c}">${tx}</div>`).join('');
}
function drawMarket() {
  const c = $('#mcv'), r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  if (!r.width) return;
  c.width = r.width * d; c.height = r.height * d;
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  const h = run.mhist, w = r.width, hh = r.height, lo = Math.min(0.8, ...h), hi = Math.max(1.3, ...h);
  const y = (v) => hh - 4 - (v - lo) / (hi - lo) * (hh - 8), x = (i) => 4 + i * (w - 12) / (h.length - 1);
  g.strokeStyle = 'rgba(168,152,138,.35)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(0, y(1)); g.lineTo(w, y(1)); g.stroke(); g.setLineDash([]);
  const upCol = '#E5483B', dnCol = '#3FB37F', last = h[h.length - 1], col = last >= (h[h.length - 2] || 1) ? upCol : dnCol;
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); h.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)))); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x(h.length - 1), y(last), 3.5, 0, 7); g.fill();
}

// ---------- scene ----------
const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() {
  const r = cv.parentElement.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
  if (run) drawMarket();
}
new ResizeObserver(resize).observe(cv.parentElement);
const embers = Array.from({ length: 28 }, () => ({ x: R(), y: R(), v: 0.02 + R() * 0.05, s: 1 + R() * 2, p: R() * 6 }));
const fx = {
  parts: [], shards: [], shake: 0, heat: 0, flash: 0, hamT: -1, pending: null, ghost: null, born: 0,
  strike(r, delta) { this.hamT = performance.now(); this.pending = { r, delta }; },
  impact() {
    const { r, delta } = this.pending; this.pending = null;
    const g = geo(), x = g.hx, y = g.top - g.bh;
    const conf = { keep: [10, '#FF9D4D', 0.15], succ: [24, '#FFD27A', 0.35], great: [60, '#FFF3B0', 0.8], dmg: [16, '#FF6A3D', 0.5], brk: [36, '#FF4D2E', 1] }[r];
    for (let i = 0; i < conf[0] * (REDUCE ? 0.4 : 1); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.6, sp = 120 + R() * (r === 'great' ? 520 : 340); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0.5 + R() * 0.6, c: R() < 0.3 && run ? tierOf(run.sword.level).color : conf[1], s: 1.5 + R() * 2 }); }
    this.heat = Math.min(1, this.heat + conf[2]); this.shake = REDUCE ? 0 : conf[2] * (r === 'brk' ? 1.4 : 0.8);
    if (r === 'great') this.flash = 0.35;
    if (r === 'brk' && this.ghost) {
      const n = 9; for (let i = 0; i < n; i++) this.shards.push({ x: g.x0 + g.bl * (i + 0.5) / n, y: g.top - g.bh / 2, vx: (R() - 0.5) * 420, vy: -160 - R() * 320, rot: R() * 6, vr: (R() - 0.5) * 14, w: g.bl / n, h: g.bh, l: 1.1, c: MAT[this.ghost.mat].color });
      this.ghost = null;
    }
    const txt = { succ: ['成功 +' + delta, '#8BD06A'], great: ['大成功！+' + delta, '#F2C14E'], keep: ['无变化', '#A8988A'], dmg: [delta ? '受损 -1' : '受损', '#F08A3C'], brk: ['碎了', '#E5483B'] }[r];
    this.pop(txt[0], txt[1], r === 'great' || r === 'brk');
    sfx(r);
  },
  sold(p) { const g = geo(); for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.8, sp = 200 + R() * 260; this.parts.push({ x: g.cx, y: g.top - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0.9 + R() * 0.4, c: '#F2C14E', s: 3, coin: true }); } this.pop('+' + fmt(p), '#F2C14E', true); },
  pop(t, c, big) { const el = $('#pop'); el.textContent = t; el.style.color = c; el.classList.toggle('big', !!big); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); },
};
function geo() {
  const cx = W / 2, top = H * 0.7, total = Math.min(W * 0.86, 560), bl = total * 0.7, lvl = run ? run.sword.level : 0, ti = tierOf(lvl).idx;
  const bh = Math.min(26, 11 + ti * 1.6 + Math.min(lvl, 40) * 0.08);
  const x0 = cx - total / 2;
  return { cx, top, total, bl, bh, x0, gx: x0 + bl, hx: x0 + bl * 0.55 };
}
function drawSword(s, g, alpha, t) {
  const tier = tierOf(s.level), mat = MAT[s.mat], y = g.top - g.bh / 2 - 3, bh = g.bh;
  ctx.save(); ctx.globalAlpha = alpha;
  // aura
  if (s.level >= 5) { ctx.shadowColor = tier.color; ctx.shadowBlur = Math.min(46, 6 + s.level * 1.1) * (0.85 + 0.15 * Math.sin(t / 300)); }
  const grad = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
  grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.35, mat.color); grad.addColorStop(1, '#2A2D33');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(g.gx, y - bh / 2); ctx.lineTo(g.x0 + bh * 1.2, y - bh / 2); ctx.lineTo(g.x0, y); ctx.lineTo(g.x0 + bh * 1.2, y + bh / 2); ctx.lineTo(g.gx, y + bh / 2); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // heat glow
  if (fx.heat > 0.02) { ctx.fillStyle = `rgba(255,${120 + 80 * fx.heat | 0},40,${fx.heat * 0.55})`; ctx.fill(); }
  // tier tint along the edge
  if (s.level >= 10) { ctx.strokeStyle = tier.color; ctx.globalAlpha = alpha * 0.8; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = alpha; }
  // fuller
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.gx - 8, y); ctx.lineTo(g.x0 + bh * 2, y); ctx.stroke();
  // guard, grip, pommel
  const gold = s.level >= 15;
  ctx.fillStyle = gold ? '#D9A93F' : '#4A4440'; ctx.fillRect(g.gx, y - bh * 1.35, 10, bh * 2.7);
  ctx.fillStyle = '#3B2A20'; const gl = g.total - g.bl - 30; ctx.fillRect(g.gx + 10, y - bh * 0.36, gl, bh * 0.72);
  ctx.strokeStyle = '#5A4030'; ctx.lineWidth = 2; for (let k = g.gx + 16; k < g.gx + 10 + gl; k += 9) { ctx.beginPath(); ctx.moveTo(k, y - bh * 0.36); ctx.lineTo(k + 5, y + bh * 0.36); ctx.stroke(); }
  ctx.fillStyle = gold ? '#D9A93F' : '#4A4440'; ctx.beginPath(); ctx.arc(g.gx + 14 + gl, y, bh * 0.55, 0, 7); ctx.fill();
  // tassel for high tiers
  if (s.level >= 20) { ctx.strokeStyle = tier.color; ctx.lineWidth = 3; ctx.beginPath(); const px = g.gx + 14 + gl; ctx.moveTo(px, y); ctx.quadraticCurveTo(px + 18, y + 20 + 6 * Math.sin(t / 400), px + 8, y + 46); ctx.stroke(); }
  ctx.restore();
  // orbiting motes for 神兵+
  if (s.level >= 30) {
    const n = Math.min(14, 4 + ((s.level - 30) >> 2));
    for (let i = 0; i < n; i++) { const a = t / 900 + i * 6.283 / n, rx = g.bl * 0.55, ry = bh * 2.2; ctx.fillStyle = tier.color; ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(t / 200 + i)); ctx.beginPath(); ctx.arc(g.x0 + g.bl / 2 + Math.cos(a) * rx, y + Math.sin(a) * ry, 2.2, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function drawAnvil(g) {
  const w = Math.min(W * 0.62, 420), x = g.cx - w / 2, top = g.top;
  ctx.fillStyle = '#2B2522';
  ctx.beginPath(); ctx.moveTo(x - 40, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w, top + 26); ctx.lineTo(x + w * 0.78, top + 40); ctx.lineTo(x + w * 0.22, top + 40); ctx.lineTo(x, top + 26); ctx.quadraticCurveTo(x - 30, top + 22, x - 40, top); ctx.fill();
  ctx.fillStyle = '#4C433D'; ctx.fillRect(x - 30, top, w + 30, 3);
  ctx.fillStyle = '#221D1A'; ctx.fillRect(x + w * 0.3, top + 40, w * 0.4, 46);
  ctx.fillStyle = '#2B2522'; ctx.fillRect(x + w * 0.16, top + 86, w * 0.68, 18);
  ctx.fillStyle = '#1A1512'; ctx.fillRect(0, top + 104, W, H);
}
function drawHammer(g, now) {
  // rests raised off to the right (clear of the level readout), swings down onto the blade
  const restX = g.cx + Math.min(W * 0.34, 210), restY = g.top - Math.min(90, H * 0.24) - Math.sin(now / 500) * 3;
  const hitX = g.hx, hitY = g.top - g.bh * 2 - 6;
  let k = 0;
  if (fx.hamT > 0) {
    const t = now - fx.hamT;
    if (t < 70) k = (t / 70) * (t / 70);
    else { if (fx.pending) fx.impact(); const u = Math.min(1, (t - 70) / 200); k = (1 - u) * (1 - u); if (u >= 1) fx.hamT = -1; }
  }
  if (run && run.strikes <= 0 && fx.hamT < 0) return;
  const x = restX + (hitX - restX) * k, y = restY + (hitY - restY) * k;
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.35 * (1 - k) - 0.12);
  ctx.fillStyle = '#6B4A33'; ctx.fillRect(10, -110, 9, 112);
  ctx.fillStyle = '#3D3936'; ctx.fillRect(-30, -10, 60, 26);
  ctx.fillStyle = '#5A5450'; ctx.fillRect(-30, -10, 60, 5);
  ctx.restore();
}
function frame(now) {
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
  if (W && H) {
    const g = geo();
    ctx.save();
    if (fx.shake > 0) { ctx.translate((R() - 0.5) * 14 * fx.shake, (R() - 0.5) * 14 * fx.shake); }
    ctx.fillStyle = '#130F0D'; ctx.fillRect(-20, -20, W + 40, H + 40);
    // brick wall
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let r = 0, y = 0; y < g.top; r++, y += 26) for (let x = (r % 2) * -30; x < W; x += 60) ctx.fillRect(x + 2, y + 2, 56, 22);
    const glow = ctx.createRadialGradient(g.cx, H * 1.05, 10, g.cx, H * 1.05, H * 0.95);
    glow.addColorStop(0, `rgba(255,106,26,${0.32 + fx.heat * 0.25})`); glow.addColorStop(1, 'rgba(255,106,26,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    for (const e of embers) { e.y -= e.v * dt; if (e.y < -0.05) { e.y = 1.05; e.x = R(); } ctx.fillStyle = `rgba(255,${140 + 60 * Math.sin(now / 300 + e.p) | 0},60,${0.35 + 0.3 * Math.sin(now / 400 + e.p)})`; ctx.fillRect(e.x * W, e.y * H, e.s, e.s); }
    drawAnvil(g);
    if (run) { const a = clamp((now - fx.born) / 300, 0, 1); if (a > 0) drawSword(run.sword, g, a, now); }
    for (const p of fx.shards) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.rot += p.vr * dt; p.l -= dt; ctx.save(); ctx.globalAlpha = clamp(p.l, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(-p.w / 2, -p.h / 2); ctx.lineTo(p.w / 2, -p.h / 3); ctx.lineTo(p.w / 3, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 3); ctx.fill(); ctx.restore(); }
    fx.shards = fx.shards.filter((p) => p.l > 0);
    drawHammer(g, now);
    for (const p of fx.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.coin ? 700 : 520) * dt; p.l -= dt; ctx.globalAlpha = clamp(p.l * 1.6, 0, 1); ctx.fillStyle = p.c; if (p.coin) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 4 * Math.abs(Math.sin(now / 90 + p.vx)), 0, 0, 7); ctx.fill(); } else ctx.fillRect(p.x, p.y, p.s, p.s); }
    ctx.globalAlpha = 1; fx.parts = fx.parts.filter((p) => p.l > 0 && p.y < H + 20);
    if (fx.flash > 0) { ctx.fillStyle = `rgba(255,243,176,${fx.flash})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  fx.heat = Math.max(0, fx.heat - dt * 0.9); fx.shake = Math.max(0, fx.shake - dt * 2.5); fx.flash = Math.max(0, fx.flash - dt * 1.2);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- sound (synthesized, no files) ----------
let ac = null, noiseBuf = null;
function ensureAudio() {
  if (meta.muted) return;
  try { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; ac = new A(); } if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
}
function env(gn, t, a, d, peak) { gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, t, d, type, peak) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(gn); gn.connect(ac.destination); env(gn, t, 0.004, d, peak); o.start(t); o.stop(t + d + 0.05); }
function noise(t, d, peak, freq, q, sweep) {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = R() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + d); f.Q.value = q;
  s.connect(f); f.connect(gn); gn.connect(ac.destination); env(gn, t, 0.002, d, peak); s.start(t); s.stop(t + d + 0.05);
}
function sfx(k) {
  if (meta.muted || !ac) return;
  const t = ac.currentTime + 0.01;
  try {
    switch (k) {
      case 'hit': noise(t, 0.08, 0.3, 2600, 0.8); [1, 2.76, 5.4].forEach((r, i) => tone(400 * r * (1 + R() * 0.02), t, 0.32 - i * 0.08, 'triangle', 0.06)); break;
      case 'succ': tone(988, t, 0.25, 'sine', 0.08); tone(1480, t + 0.07, 0.3, 'sine', 0.06); break;
      case 'great': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.6, 'sine', 0.07)); noise(t, 0.5, 0.05, 6000, 0.5); break;
      case 'keep': tone(220, t, 0.12, 'triangle', 0.05); break;
      case 'dmg': tone(110, t, 0.35, 'sawtooth', 0.05); noise(t, 0.25, 0.14, 700, 1); break;
      case 'brk': noise(t, 0.7, 0.4, 3000, 0.6, 300); tone(70, t, 0.6, 'sawtooth', 0.07); break;
      case 'coin': [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.045, 0.18, 'square', 0.025)); break;
      case 'day': tone(392, t, 0.4, 'sine', 0.05); tone(523, t + 0.12, 0.5, 'sine', 0.05); break;
      case 'pay': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 'triangle', 0.06)); break;
      case 'fail': [392, 311, 262, 196].forEach((f, i) => tone(f, t + i * 0.16, 0.6, 'sawtooth', 0.035)); break;
    }
  } catch (e) { /* audio is optional */ }
}

// ---------- demo autopilot (for trailers: open with #demo) ----------
function demoTick() {
  if (!run || modalOpen()) return;
  const s = run.sword, o = odds(s.level), q = quota(), need = q - run.gold;
  const lastDay = run.day >= DAYS;
  if (run.strikes <= 0) { if (lastDay && s.level >= 1 && run.gold < q) sell(); rest(); return; }
  const p = salePrice();
  const enough = p >= need * 1.05 && need > 0;
  if (s.level >= 1 && (o.brk > 0.16 || (enough && o.brk > 0.04))) { sell(); return; }
  strike();
}
if (DEMO) {
  meta.seenHelp = true; meta.muted = true;
  hideScreens(); newRun('iron'); run.relics.push('lian', 'yan'); render();
  setInterval(demoTick, 420);
} else if (run) { showTitle(); render(); } else showTitle();
window.__game = { get run() { return run; }, get meta() { return meta; }, odds, quota, value, fmt };
})();
