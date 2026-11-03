// 一锤子买卖 v0.2 — forging gamble incremental. Plain JS, no dependencies.
// Rules live in the "content" + "rules" sections; drawing in "swords" + "scene"; DESIGN.md explains the loop.
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const R = Math.random;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(R() * a.length)];
const DEMO = location.hash === '#demo';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAYS = 3, SAVE_V = 2;

// ---------- numbers: Chinese large units ----------
const UNITS = [['极', 1e48], ['载', 1e44], ['正', 1e40], ['涧', 1e36], ['沟', 1e32], ['穰', 1e28], ['秭', 1e24], ['垓', 1e20], ['京', 1e16], ['兆', 1e12], ['亿', 1e8], ['万', 1e4]];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n >= 1e52) return n.toExponential(2).replace('e+', 'e');
  for (const [u, v] of UNITS) if (n >= v) { const x = n / v; return String(+x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)) + u; }
  return Math.floor(n).toLocaleString('zh-CN');
}
const pct = (x) => (x * 100 >= 10 || x === 0 ? (x * 100).toFixed(0) : (x * 100).toFixed(1)) + '%';

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
const NAMES = ['青锋', '赤霄', '寒月', '断水', '流光', '照胆', '惊鸿', '听雨', '龙吟', '秋水', '玄霜', '破军', '长风', '落雁', '飞雪', '无咎', '孤鸿', '镇岳', '星河', '沧浪', '归墟', '不语', '照夜', '截云'];
const RARITY = [{ name: '常见', w: 0.62, color: '#A39C92' }, { name: '稀有', w: 0.30, color: '#4FA6E3' }, { name: '传说', w: 0.08, color: '#F2A43C' }];

// 形制 (sword shapes): every blank rolls one. Each has its own silhouette and one trait.
const SHAPES = [
  { id: 'jian', name: '直剑', rar: 0, desc: '四平八稳，没有特点' },
  { id: 'huan', name: '环首刀', rar: 0, desc: '受损率 -4%' },
  { id: 'bi', name: '匕首', rar: 0, desc: '底价 ×0.6，每级多涨 8%', bm: 0.6, g: 0.08 },
  { id: 'zhong', name: '重剑', rar: 0, desc: '碎裂率 ×0.8，大成功率 -3%' },
  { id: 'wan', name: '弯刀', rar: 0, desc: '卖价 ×1.15' },
  { id: 'miao', name: '苗刀', rar: 1, desc: '大成功率 +5%' },
  { id: 'she', name: '蛇形剑', rar: 1, desc: '受损时一半几率不掉级' },
  { id: 'ju', name: '锯齿刀', rar: 1, desc: '成功率 +4%' },
  { id: 'qixing', name: '七星剑', rar: 1, desc: '每满 7 级，估价再 ×1.3' },
  { id: 'gu', name: '骨刃', rar: 1, desc: '碎了能拿回估价的 25%' },
  { id: 'tao', name: '桃木剑', rar: 1, desc: '打到 +10 之前不会碎' },
  { id: 'qian', name: '铜钱剑', rar: 2, desc: '卖价 ×1.6' },
  { id: 'yu', name: '玉剑', rar: 2, desc: '大成功一次 +3 级' },
  { id: 'huo', name: '火纹剑', rar: 2, desc: '每级多涨 15%', g: 0.15 },
  { id: 'duan', name: '断剑', rar: 2, desc: '底价 ×3，碎裂率 +3%', bm: 3 },
  { id: 'long', name: '龙鳞剑', rar: 2, desc: '碎裂率 ×0.6' },
];
const SH = Object.fromEntries(SHAPES.map((s) => [s.id, s]));
const MILES = [
  { n: 4, desc: '体力上限 +2' }, { n: 8, desc: '成功率 +2%' }, { n: 12, desc: '卖价 ×1.1' }, { n: 16, desc: '新剑胚直接 +2 级' },
];

// 秘籍 (seals): pick one after every repaid period, lasts the whole run
const RELICS = [
  { id: 'cuihuo', ch: '淬', name: '淬火油', desc: '碎裂率 ×0.7', mod: (m) => { m.breakMul *= 0.7; } },
  { id: 'zhen', ch: '砧', name: '老铁砧', desc: '体力上限 +4', mod: (m) => { m.stamAdd += 4; } },
  { id: 'yan', ch: '眼', name: '火眼', desc: '大成功率 +6%', mod: (m) => { m.greatAdd += 0.06; } },
  { id: 'jiang', ch: '匠', name: '匠心', desc: '成功率 +6%（从“无变化”里匀过来）', mod: (m) => { m.succAdd += 0.06; } },
  { id: 'lin', ch: '鳞', name: '龙鳞锤', desc: '每升一级，估价多涨 10%', mod: (m) => { m.growthAdd += 0.1; } },
  { id: 'he', ch: '吆', name: '吆喝', desc: '卖价 ×1.3', mod: (m) => { m.sellMul *= 1.3; } },
  { id: 'lu', ch: '炉', name: '回炉', desc: '剑碎了，拿回估价的 40%' },
  { id: 'gu', ch: '骨', name: '反骨', desc: '受损时返还 1 点体力' },
  { id: 'lian', ch: '连', name: '连击谱', desc: '连续成功 3 次，下一锤必定大成功' },
  { id: 'feng', ch: '锋', name: '开锋', desc: '新剑胚直接从 +3 开始', mod: (m) => { m.startLevel += 3; } },
  { id: 'qi', ch: '契', name: '地契', desc: '欠款 ×0.85', mod: (m) => { m.quotaMul *= 0.85; } },
  { id: 'ke', ch: '客', name: '熟客', desc: '行情低于 ×1.00 时，熟客按 ×1.00 收' },
  { id: 'du', ch: '骰', name: '赌徒骰', desc: '大成功多 +1 级，碎裂率 +2%', mod: (m) => { m.greatStep += 1; m.breakAdd += 0.02; } },
  { id: 'fu', ch: '符', name: '护身符', desc: '每期第一次碎裂，变成受损' },
  { id: 'ye', ch: '夜', name: '夜市', desc: '睡觉时，砧上和剑架上的剑估价 +8%' },
  { id: 'mo', ch: '磨', name: '磨刀石', desc: '“无变化”时 35% 几率改成成功' },
  { id: 'shu', ch: '熟', name: '钱庄熟人', desc: '每次还款，返还 15%' },
  { id: 'pu', ch: '谱', name: '名剑谱', desc: '+10 及以上的剑，卖价 ×1.6' },
  { id: 'hao', ch: '号', name: '打铁号子', desc: '每天第一锤必定成功' },
  { id: 'chun', ch: '纯', name: '炉火纯青', desc: '+15 以后，每级估价再多涨 15%', mod: (m) => { m.lateGrowth += 0.15; } },
  { id: 'jin', ch: '算', name: '金算盘', desc: '每次还完款，剩下的金子生 10% 利息' },
  { id: 'zhuang', ch: '庄', name: '坐庄', desc: '行情涨跌幅度翻倍' },
  { id: 'xin', ch: '信', name: '内幕消息', desc: '提前一天知道明天的行情' },
  { id: 'chi', ch: '痴', name: '剑痴', desc: '剑架上每放一把剑，成功率 +1.5%' },
  { id: 'tun', ch: '吞', name: '饕餮', desc: '熔剑的效果翻倍' },
  { id: 'huo2', ch: '货', name: '货郎', desc: '杂货铺每天多上一件货，东西便宜 20%' },
];
const RMAP = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// 道具 (items): bought at the general store (stock changes daily) or dropped by big wins
const ITEMS = [
  { id: 'bao', ch: '包', name: '肉包子', desc: '体力 +6', price: 0.05 },
  { id: 'shen', ch: '参', name: '老山参', desc: '体力回满', price: 0.16 },
  { id: 'hu', ch: '护', name: '护剑符', desc: '下一锤不会碎（碎裂变成受损）', price: 0.22 },
  { id: 'zhu', ch: '祝', name: '祝福油', desc: '下一锤成功率 +25%', price: 0.14 },
  { id: 'tian', ch: '天', name: '天工锤', desc: '下一锤必定成功', price: 0.38 },
  { id: 'cui', ch: '淬', name: '淬火水', desc: '接下来 5 锤碎裂率减半', price: 0.28 },
  { id: 'bu', ch: '补', name: '补铁膏', desc: '砧上的剑直接 +1 级', price: 0.3 },
  { id: 'qi', ch: '漆', name: '金漆', desc: '砧上的剑估价 ×1.5（每把只能刷一次）', price: 0.32 },
  { id: 'ya', ch: '牙', name: '牙行帖', desc: '下一次卖剑多卖 40%', price: 0.18 },
  { id: 'xia', ch: '匣', name: '剑匣', desc: '剑架多一格（这一局有效）', price: 0.45 },
  { id: 'li', ch: '历', name: '黄历', desc: '明天的行情至少 ×1.40', price: 0.3 },
];
const IMAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const UPGS = [
  { id: 'hands', name: '起早贪黑', desc: '体力上限 +2', max: 5, cost: (l) => Math.round(25 * Math.pow(2, l)) },
  { id: 'craft', name: '祖传手艺', desc: '成功率 +1.5%', max: 6, cost: (l) => Math.round(30 * Math.pow(1.9, l)) },
  { id: 'bank', name: '钱庄关系', desc: '欠款 -4%', max: 5, cost: (l) => Math.round(40 * Math.pow(2, l)) },
  { id: 'rack', name: '大剑架', desc: '剑架多一格', max: 3, cost: (l) => Math.round(50 * Math.pow(2.2, l)) },
  { id: 'eye', name: '识货', desc: '挑秘籍时多一个选项', max: 1, cost: () => 150 },
  { id: 'luck', name: '好料运', desc: '稀有和传说剑型出现率提高', max: 3, cost: (l) => Math.round(80 * Math.pow(2.5, l)) },
  { id: 'charm', name: '祖传护身符', desc: '每局开张自带「护身符」', max: 1, cost: () => 300 },
];

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const META_DEFAULT = { fame: 0, totalFame: 0, upg: {}, mats: ['iron'], mat: 'iron', runs: 0, best: { period: 0, level: 0, sale: 0 }, codex: {}, seenHelp: false, muted: false };
let meta = Object.assign({}, META_DEFAULT, DEMO ? {} : store.get('ycmm-v0.2-meta', {}));
if (!meta.codex) meta.codex = {};
let run = DEMO ? null : store.get('ycmm-v0.2-run', null);
if (run && run.v !== SAVE_V) run = null; // old save format
const saveMeta = () => { if (!DEMO) store.set('ycmm-v0.2-meta', meta); };
const saveRun = () => { if (!DEMO && run) store.set('ycmm-v0.2-run', run); };

// ---------- rules ----------
const has = (id) => !!run && run.relics.includes(id);
const ulv = (id) => meta.upg[id] || 0;
const codexN = () => Object.keys(meta.codex).length;
function mods() {
  const cn = codexN();
  const m = { breakMul: 1, breakAdd: 0, greatAdd: 0, succAdd: ulv('craft') * 0.015 + (cn >= 8 ? 0.02 : 0), growthAdd: 0, lateGrowth: 0,
    stamAdd: ulv('hands') * 2 + (cn >= 4 ? 2 : 0), sellMul: cn >= 12 ? 1.1 : 1, quotaMul: Math.pow(0.96, ulv('bank')), startLevel: cn >= 16 ? 2 : 0, greatStep: 2 };
  if (run) {
    for (const id of run.relics) if (RMAP[id] && RMAP[id].mod) RMAP[id].mod(m);
    if (has('chi')) m.succAdd += 0.015 * run.rack.length;
  }
  return m;
}
// odds for a sword on the anvil, including its shape and active item buffs
function odds(s, withBuffs = true) {
  const m = mods(), L = s.level, sh = s.shape, b = withBuffs && run ? run.buffs : {};
  let brk = L <= 3 ? 0 : Math.min(0.45, (L - 3) * 0.015) * m.breakMul + m.breakAdd;
  if (sh === 'zhong') brk *= 0.8; if (sh === 'long') brk *= 0.6; if (sh === 'duan' && L > 3) brk += 0.03; if (sh === 'tao' && L < 10) brk = 0;
  let dmg = Math.min(0.25, 0.10 + L * 0.008); if (sh === 'huan') dmg = Math.max(0.02, dmg - 0.04);
  let keep = 0.18;
  let great = Math.max(0.04, 0.20 - L * 0.008) + m.greatAdd + (sh === 'miao' ? 0.05 : 0) - (sh === 'zhong' ? 0.03 : 0);
  great = Math.max(0.01, great);
  const sk = Math.min(keep, m.succAdd + (sh === 'ju' ? 0.04 : 0)); keep -= sk;
  if (b.cui > 0) { keep += brk / 2; brk /= 2; }
  if (b.zhu) { let need = 0.25; for (const k of ['brk', 'dmg', 'keep']) { const cur = { brk, dmg, keep }[k], take = Math.min(cur, need); need -= take; if (k === 'brk') brk -= take; else if (k === 'dmg') dmg -= take; else keep -= take; } }
  if (b.hu) { dmg += brk; brk = 0; }
  let succ = 1 - brk - dmg - keep - great;
  if (succ < 0.03) { const tot = brk + dmg + keep + great, k = 0.97 / tot; brk *= k; dmg *= k; keep *= k; great *= k; succ = 0.03; }
  if (b.tian || run && run.forceGreat) { if (run.forceGreat) return { brk: 0, dmg: 0, keep: 0, succ: 0, great: 1 }; succ = 1 - great; brk = dmg = keep = 0; }
  return { brk, dmg, keep, succ, great };
}
const stepUp = (s) => mods().greatStep + (s.shape === 'yu' ? 1 : 0);
function value(s) {
  const m = mods(), sh = SH[s.shape], g = 1.6 + m.growthAdd + (sh.g || 0);
  let v = MAT[s.mat].base * (sh.bm || 1) * Math.pow(g, s.level);
  if (m.lateGrowth && s.level > 15) v *= Math.pow((g + m.lateGrowth) / g, s.level - 15);
  if (s.shape === 'qixing') v *= Math.pow(1.3, Math.floor(s.level / 7));
  return v * s.mul;
}
const marketEff = () => (has('ke') ? Math.max(1, run.market) : run.market);
function priceOf(s, withTicket = true) {
  if (!s || s.level < 1) return 0;
  let p = value(s) * marketEff() * mods().sellMul;
  if (has('pu') && s.level >= 10) p *= 1.6;
  if (s.shape === 'wan') p *= 1.15; if (s.shape === 'qian') p *= 1.6;
  if (withTicket && run.buffs.ya) p *= 1.4;
  return p;
}
const maxStam = () => 18 + mods().stamAdd;
const rackCap = () => 3 + ulv('rack') + (run ? run.extraSlots : 0);
const quota = (n = run.period) => Math.round(50 * Math.pow(2.25, n - 1) * mods().quotaMul);
const itemPrice = (id) => Math.max(5, Math.round(quota() * IMAP[id].price * (has('huo2') ? 0.8 : 1)));
function stepMarket(mk) {
  let x = Math.log(mk) * 0.7 + gauss() * 0.22 * (has('zhuang') ? 2 : 1);
  if (R() < 0.07) x += 0.55; // festival day
  return clamp(Math.exp(x), 0.45, 3);
}
function rollShape() {
  const lk = ulv('luck'), w = [RARITY[0].w - lk * 0.08, RARITY[1].w + lk * 0.05, RARITY[2].w + lk * 0.03];
  let x = R() * (w[0] + w[1] + w[2]), r = 0; while (r < 2 && (x -= w[r]) > 0) r++;
  return pick(SHAPES.filter((s) => s.rar === r)).id;
}
function makeSword(shape) {
  const s = { mat: run.mat, shape: shape || rollShape(), level: mods().startLevel, mul: 1, gilded: false, name: pick(NAMES) };
  noteCodex(s); return s;
}
function noteCodex(s) {
  const was = meta.codex[s.shape];
  if (was === undefined) { meta.codex[s.shape] = s.level; saveMeta(); if (run) { addLog('剑谱新收录：' + SH[s.shape].name + '（' + RARITY[SH[s.shape].rar].name + '）', 'g'); checkMiles(); } }
  else if (s.level > was) { meta.codex[s.shape] = s.level; saveMeta(); }
}
let milesSeen = null;
function checkMiles() {
  const n = codexN(); if (milesSeen === null) milesSeen = n;
  for (const ml of MILES) if (n >= ml.n && milesSeen < ml.n) toast('剑谱收集 ' + ml.n + ' 种：' + ml.desc);
  milesSeen = n;
}
function newBlank() { run.sword = makeSword(); run.streak = 0; fx.born = performance.now(); }
function restock() { const n = 3 + (has('huo2') ? 1 : 0); run.stock = shuffle(ITEMS.map((i) => i.id)).slice(0, n).map((id) => ({ id, sold: false })); }
function newRun(mat) {
  run = { v: SAVE_V, mat, period: 1, day: 1, gold: 0, relics: [], market: 1, next: 1, mhist: [], stam: 0, streak: 0, forceGreat: false, firstOfDay: true, charmUsed: false,
    rack: [], extraSlots: 0, bag: {}, buffs: {}, stock: [], stats: { strikes: 0, breaks: 0, sold: 0, maxSale: 0, maxLevel: 0 }, log: [] };
  if (ulv('charm')) run.relics.push('fu');
  for (let i = 0; i < 9; i++) run.mhist.push(clamp(1 + gauss() * 0.15, 0.6, 1.5));
  run.mhist.push(1);
  run.next = stepMarket(1);
  run.bag.bao = 1; // a snack to start with
  newBlank(); run.stam = maxStam(); restock();
  meta.runs++; saveMeta();
  addLog('开张了。钱庄说：三天后来收 ' + fmt(quota()) + '。');
  saveRun();
}
const addItem = (id, n = 1) => { run.bag[id] = (run.bag[id] || 0) + n; };
function dropItem(why) { const id = pick(ITEMS.filter((i) => i.id !== 'xia').map((i) => i.id)); addItem(id); addLog(why + '，捡到「' + IMAP[id].name + '」', 'c'); toast('捡到「' + IMAP[id].name + '」'); }

// ---------- actions ----------
let lastStrike = 0;
function strike() {
  if (!run || modalOpen()) return;
  if (run.stam <= 0) { toast(run.bag.bao || run.bag.shen ? '没力气了。背包里有吃的，或者睡一觉' : '没力气了，睡一觉明天再打'); return; }
  const now = performance.now(); if (now - lastStrike < 140) return; lastStrike = now;
  ensureAudio();
  run.stam--; run.stats.strikes++;
  const s = run.sword, L = s.level, o = odds(s), b = run.buffs;
  let r;
  if (run.forceGreat) { r = 'great'; run.forceGreat = false; }
  else if (has('hao') && run.firstOfDay) r = R() < o.great / (o.great + o.succ) ? 'great' : 'succ';
  else {
    let x = R();
    if ((x -= o.brk) < 0) r = 'brk'; else if ((x -= o.dmg) < 0) r = 'dmg'; else if ((x -= o.keep) < 0) r = 'keep'; else if ((x -= o.succ) < 0) r = 'succ'; else r = 'great';
  }
  run.firstOfDay = false;
  // single-strike buffs are used up by this strike
  if (b.cui > 0) b.cui--; delete b.zhu; delete b.tian; delete b.hu;
  if (r === 'keep' && has('mo') && R() < 0.35) r = 'succ';
  let note = '';
  if (r === 'brk' && has('fu') && !run.charmUsed) { r = 'dmg'; run.charmUsed = true; note = '护身符替你挡了一次碎裂'; }
  let delta = 0;
  if (r === 'succ') { delta = 1; run.streak++; }
  else if (r === 'great') { delta = stepUp(s); run.streak++; }
  else if (r === 'keep') run.streak = 0;
  else if (r === 'dmg') {
    run.streak = 0;
    if (s.shape === 'she' && R() < 0.5) note = note || '蛇形剑：没掉级'; else delta = L > 0 ? -1 : 0;
    if (has('gu')) { run.stam++; note = note || '反骨：返还 1 点体力'; }
  } else if (r === 'brk') {
    run.streak = 0; run.stats.breaks++;
    let back = 0; if (has('lu')) back += 0.4; if (s.shape === 'gu') back += 0.25;
    if (back) { const g = value(s) * back; run.gold += g; note = '拿回 ' + fmt(g); }
  }
  if (has('lian') && run.streak >= 3 && (r === 'succ' || r === 'great')) { run.forceGreat = true; run.streak = 0; note = note || '连击谱：下一锤必定大成功'; }
  const name = SH[s.shape].name + '「' + s.name + '」';
  if (r === 'brk') { fx.ghost = { ...s }; newBlank(); fx.born = performance.now() + 450; }
  else { s.level = Math.max(0, L + delta); noteCodex(s); }
  run.stats.maxLevel = Math.max(run.stats.maxLevel, run.sword.level);
  const after = run.sword.level;
  const msg = { succ: ['成功 +' + L + ' → +' + after, 's'], great: ['大成功！+' + L + ' → +' + after, 'g'], keep: ['无变化，还是 +' + L, ''], dmg: ['受损 +' + L + ' → +' + after, 'd'], brk: ['碎了！+' + L + ' 的' + name + '没了', 'b'] }[r];
  addLog(msg[0], msg[1]); if (note) addLog(note, 'c');
  if (r === 'great' && R() < 0.12) dropItem('大成功的火星里');
  fx.strike(r, delta);
  sfx('hit');
  render(); saveRun();
}
function sellSword(s, where) {
  const p = priceOf(s); delete run.buffs.ya;
  run.gold += p; run.stats.sold++; run.stats.maxSale = Math.max(run.stats.maxSale, p);
  addLog('卖出' + where + ' +' + s.level + ' ' + SH[s.shape].name + '，得 ' + fmt(p), 'c');
  if (s.level >= 20) { dropItem('大主顾打赏'); dropItem('大主顾打赏'); } else if (s.level >= 10) dropItem('主顾打赏');
  fx.sold(p); sfx('coin');
  return p;
}
function sell() {
  if (!run || modalOpen()) return;
  if (run.sword.level < 1) { toast('至少打到 +1 才有人收'); return; }
  ensureAudio(); sellSword(run.sword, ''); newBlank(); render(); saveRun();
}
function storeSword() {
  if (!run || modalOpen()) return;
  if (run.sword.level < 1) { toast('剑胚不用上架，打到 +1 再说'); return; }
  if (run.rack.length >= rackCap()) { toast('剑架满了。卖掉或者熔掉一把再放'); setTab('rack'); return; }
  ensureAudio(); run.rack.push(run.sword); addLog('把 +' + run.sword.level + ' ' + SH[run.sword.shape].name + ' 挂上剑架');
  sfx('keep'); newBlank(); setTab('rack'); render(); saveRun();
}
function rackAction(i) {
  const s = run.rack[i]; if (!s) return;
  const anvil = run.sword, feedGain = feedMul(s);
  openSheet(`<h2>${SH[s.shape].name}「${s.name}」 +${s.level}</h2><canvas class="big-sword" id="bigSword"></canvas>
    <p>${MAT[s.mat].name} · <span style="color:${RARITY[SH[s.shape].rar].color}">${RARITY[SH[s.shape].rar].name}</span> · ${SH[s.shape].desc}</p>
    ${linesHtml([['估价', fmt(value(s))], ['今天能卖', fmt(priceOf(s))]])}
    <div class="btns">
      <button class="btn" id="rSell" type="button">卖掉 · ${fmt(priceOf(s))}</button>
      <button class="btn ghost" id="rTake" type="button">${anvil.level >= 1 ? '和砧上的剑换一换' : '拿下来接着打'}</button>
      <button class="btn ghost" id="rFeed" type="button">熔进砧上的剑 · 估价 ×${feedGain.toFixed(2)}</button>
      <button class="btn ghost" id="rBack" type="button">先放着</button>
    </div>`);
  drawIcon($('#bigSword'), s);
  $('#rSell').onclick = () => { run.rack.splice(i, 1); sellSword(s, '剑架上的'); closeSheet(); render(); saveRun(); };
  $('#rTake').onclick = () => { if (anvil.level >= 1) run.rack[i] = anvil; else run.rack.splice(i, 1); run.sword = s; fx.born = performance.now(); run.streak = 0; addLog('把 +' + s.level + ' ' + SH[s.shape].name + ' 拿上砧子'); closeSheet(); render(); saveRun(); };
  $('#rFeed').onclick = () => {
    if (s.level < 1) return;
    run.rack.splice(i, 1); run.sword.mul *= feedGain; fx.feed(); sfx('great');
    addLog('大鱼吃小鱼：熔掉 +' + s.level + ' ' + SH[s.shape].name + '，砧上的剑估价 ×' + feedGain.toFixed(2), 'g');
    closeSheet(); render(); saveRun();
  };
  $('#rBack').onclick = closeSheet;
}
// feeding a stored sword into the anvil sword: +5% value per level of the eaten sword, doubled for the same shape
function feedMul(s) { let k = 0.05 * s.level * (s.shape === run.sword.shape ? 2 : 1) * (has('tun') ? 2 : 1); return 1 + k; }
function useItem(id) {
  if (!run.bag[id]) return;
  const it = IMAP[id], s = run.sword, b = run.buffs;
  if (id === 'qi' && s.gilded) { toast('这把已经刷过金漆了'); return; }
  if ((id === 'bao' || id === 'shen') && run.stam >= maxStam()) { toast('体力是满的，先留着'); return; }
  run.bag[id]--; if (!run.bag[id]) delete run.bag[id];
  if (id === 'bao') run.stam = Math.min(maxStam(), run.stam + 6);
  else if (id === 'shen') run.stam = maxStam();
  else if (id === 'hu') b.hu = true;
  else if (id === 'zhu') b.zhu = true;
  else if (id === 'tian') b.tian = true;
  else if (id === 'cui') b.cui = 5;
  else if (id === 'bu') { s.level++; noteCodex(s); fx.pop('+1', '#8BD06A'); }
  else if (id === 'qi') { s.mul *= 1.5; s.gilded = true; fx.pop('金漆 ×1.5', '#F2C14E'); }
  else if (id === 'ya') b.ya = true;
  else if (id === 'xia') run.extraSlots++;
  else if (id === 'li') { run.next = Math.max(run.next, 1.4); run.usedLi = true; }
  addLog('用了「' + it.name + '」：' + it.desc, 'c'); sfx('succ');
  closeSheet(); render(); saveRun();
}
function itemSheet(id) {
  const it = IMAP[id];
  openSheet(`<h2>${it.name} ×${run.bag[id]}</h2><p>${it.desc}</p><div class="btns"><button class="btn" id="iUse" type="button">用</button><button class="btn ghost" id="iBack" type="button">先留着</button></div>`);
  $('#iUse').onclick = () => useItem(id); $('#iBack').onclick = closeSheet;
}
function shopSheet() {
  const rows = run.stock.map((st, k) => { const it = IMAP[st.id], p = itemPrice(st.id);
    return `<div class="shopitem"><span class="chipi">${it.ch}</span><b>${it.name}</b><button class="btn${st.sold ? ' ghost' : ''}" type="button" data-k="${k}" ${st.sold || run.gold < p ? 'disabled' : ''}>${st.sold ? '卖完了' : fmt(p)}</button><span>${it.desc}</span></div>`; }).join('');
  openSheet(`<h2>杂货铺</h2><p>每天进的货不一样，价钱跟着欠款涨。你有 <b style="color:var(--gold)">${fmt(run.gold)}</b> 金。</p><div class="cards">${rows}</div><div class="btns"><button class="btn ghost" id="sBack" type="button">走了</button></div>`);
  $('#sheet').querySelectorAll('[data-k]').forEach((bt) => bt.onclick = () => {
    const st = run.stock[+bt.dataset.k], p = itemPrice(st.id); if (st.sold || run.gold < p) return;
    run.gold -= p; st.sold = true; addItem(st.id); addLog('买了「' + IMAP[st.id].name + '」，花 ' + fmt(p), 'c'); sfx('coin'); render(); saveRun(); shopSheet();
  });
  $('#sBack').onclick = closeSheet;
}
let restArmed = 0;
function rest() {
  if (!run || modalOpen()) return;
  if (run.stam > 0 && performance.now() - restArmed > 2500) { restArmed = performance.now(); $('#btnRest').textContent = '还有 ' + run.stam + ' 点体力，确定睡觉？'; setTimeout(render, 2500); return; }
  restArmed = 0; endDay();
}
function endDay() {
  if (has('ye')) { let n = 0; for (const s of [run.sword, ...run.rack]) if (s.level > 0) { s.mul *= 1.08; n++; } if (n) addLog('夜市：' + n + ' 把剑估价 +8%', 'c'); }
  const prev = run.market;
  run.market = run.next; run.next = stepMarket(run.market);
  run.mhist.push(run.market); if (run.mhist.length > 14) run.mhist.shift();
  run.day++; run.stam = maxStam(); run.firstOfDay = true; run.usedLi = false; restock();
  ensureAudio();
  if (run.day > DAYS) { settle(); return; }
  const chg = run.market / prev - 1;
  addLog('第 ' + run.day + ' 天，行情 ×' + run.market.toFixed(2) + (chg >= 0 ? '，涨 ' : '，跌 ') + pct(Math.abs(chg)) + '。杂货铺进了新货');
  fx.pop('第 ' + run.day + ' 天', '#F3E9DC'); sfx('day');
  render(); saveRun();
}
function settle() {
  const q = quota(); const lines = [['欠款', fmt(q)], ['手上的金子', fmt(run.gold)]];
  // not enough: the collector takes swords, cheapest first, until the debt is covered
  if (run.gold < q) {
    const pool = run.rack.map((s, i) => ({ s, i, p: priceOf(s, false) })).sort((a, b) => a.p - b.p);
    for (const it of pool) { if (run.gold >= q) break; run.gold += it.p; it.s.taken = true; lines.push(['剑架上的 +' + it.s.level + ' ' + SH[it.s.shape].name + ' 抵债', fmt(it.p)]); }
    run.rack = run.rack.filter((s) => !s.taken);
    if (run.gold < q && run.sword.level >= 1) { const p = priceOf(run.sword, false); run.gold += p; lines.push(['砧上的 +' + run.sword.level + ' 抵债', fmt(p)]); newBlank(); }
  }
  if (run.gold >= q) {
    run.gold -= q;
    if (has('shu')) { const b = q * 0.15; run.gold += b; lines.push(['钱庄熟人返还', fmt(b)]); }
    if (has('jin')) { const it = run.gold * 0.1; run.gold += it; lines.push(['金算盘利息', fmt(it)]); }
    lines.push(['还完剩下', fmt(run.gold)]);
    const cleared = run.period;
    run.period++; run.day = 1; run.charmUsed = false; run.stam = maxStam(); run.firstOfDay = true;
    sfx('pay'); saveRun(); render();
    openSheet(`<h2>第 ${cleared} 期 · 还清了</h2><p>钱庄的人点了点钱，走了。下一期要还 <b>${fmt(quota())}</b>。</p>${linesHtml(lines)}<div class="btns"><button class="btn" id="mGo" type="button">挑一本秘籍</button></div>`);
    $('#mGo').onclick = draft;
    if (DEMO) setTimeout(() => $('#mGo') && $('#mGo').click(), 1600);
  } else { lines.push(['还差', fmt(q - run.gold)]); gameOver(lines); }
}
function draft() {
  const pool = shuffle(RELICS.filter((r) => !run.relics.includes(r.id))).slice(0, 3 + ulv('eye'));
  if (!pool.length) { closeSheet(); return; }
  openSheet(`<h2>挑一本秘籍</h2><p>只能拿一本，整局有效。</p><div class="cards">${pool.map((r) => `<button class="card" type="button" data-id="${r.id}"><span class="seal">${r.ch}</span><b>${r.name}</b><span>${r.desc}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => {
    run.relics.push(b.dataset.id); addLog('得到秘籍「' + RMAP[b.dataset.id].name + '」', 'c');
    if (b.dataset.id === 'huo2') restock();
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
  saveMeta(); store.del('ycmm-v0.2-run'); sfx('fail');
  const L2 = [['撑过', cleared + ' 期'], ['最高打到', '+' + st.maxLevel], ['单把最高卖价', fmt(st.maxSale)], ['一共打了', st.strikes + ' 锤'], ['碎掉', st.breaks + ' 把'], ['剑谱', codexN() + '/' + SHAPES.length]];
  run = null;
  openSheet(`<h2>铺子被钱庄收走了</h2>${linesHtml(lines)}${linesHtml(L2)}<p>名望 <b style="color:var(--gold)">+${fame}</b>${rec ? ' · 新纪录' : ''}，可以去铺子里升级。</p><div class="btns"><button class="btn" id="mAgain" type="button">再开一家</button><button class="btn ghost" id="mShop" type="button">去铺子</button></div>`);
  $('#mAgain').onclick = () => { closeSheet(); startRun(); };
  $('#mShop').onclick = () => { closeSheet(); showShop(); };
}
function startRun() {
  const owned = MATS.filter((m) => meta.mats.includes(m.id));
  const begin = (id) => { meta.mat = id; saveMeta(); closeSheet(); hideScreens(); newRun(id); setTab('rack'); render(); if (!meta.seenHelp) showHelp(); };
  if (owned.length < 2) return begin('iron');
  openSheet(`<h2>今天打什么料？</h2><div class="cards">${owned.map((m) => `<button class="card" type="button" data-id="${m.id}"><span class="seal" style="background:${m.color};color:#120E0C">${m.name[0]}</span><b>${m.name} · 底价 ${m.base}</b><span>${m.desc}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => begin(b.dataset.id));
}

// ---------- UI ----------
const linesHtml = (ls) => `<div class="lines">${ls.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
const modalOpen = () => !$('#modal').hidden || !$('#titleScreen').hidden || !$('#shopScreen').hidden || !$('#codexScreen').hidden;
function openSheet(html) { $('#sheet').innerHTML = html; $('#modal').hidden = false; const f = $('#sheet button'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { $('#modal').hidden = true; }
function hideScreens() { $('#titleScreen').hidden = true; $('#shopScreen').hidden = true; $('#codexScreen').hidden = true; }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2000); }
function addLog(t, cls = '') { if (!run) return; run.log.unshift([t, cls]); run.log.length = Math.min(run.log.length, 5); }
let tab = 'rack';
function setTab(t) { tab = t; document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t)); ['rack', 'bag', 'market', 'seals'].forEach((k) => { $('#pane-' + k).hidden = k !== t; }); if (run) render(); }
document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
function showTitle() {
  hideScreens(); closeSheet(); $('#titleScreen').hidden = false;
  $('#tCont').hidden = !run; $('#tFame').textContent = fmt(meta.fame); $('#tCodexN').textContent = codexN() + '/' + SHAPES.length;
  $('#tFoot').textContent = meta.best.period ? `最好成绩：撑过 ${meta.best.period} 期 · 最高 +${meta.best.level} · 单把 ${fmt(meta.best.sale)}` : 'v0.2 · 存档在这台设备的浏览器里';
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
  if (b.dataset.mat) { const m = MAT[b.dataset.mat]; if (meta.fame >= m.cost) { meta.fame -= m.cost; meta.mats.push(m.id); ensureAudio(); sfx('pay'); } }
  if (b.dataset.upg) { const u = UPGS.find((x) => x.id === b.dataset.upg), l = ulv(u.id), c = u.cost(l); if (l < u.max && meta.fame >= c) { meta.fame -= c; meta.upg[u.id] = l + 1; ensureAudio(); sfx('pay'); } }
  saveMeta(); showShop();
});
function showCodex() {
  hideScreens(); $('#codexScreen').hidden = false;
  const n = codexN(); $('#cCount').textContent = n + '/' + SHAPES.length;
  $('#miles').innerHTML = MILES.map((ml) => `<div class="${n >= ml.n ? 'on' : ''}"><span>收集 ${ml.n} 种</span><span>${ml.desc}${n >= ml.n ? ' · 已生效' : ''}</span></div>`).join('');
  $('#codex').innerHTML = SHAPES.map((s) => { const got = meta.codex[s.id] !== undefined, rr = RARITY[s.rar];
    return `<div class="cx r${s.rar}${got ? '' : ' lock'}"><canvas data-shape="${s.id}"></canvas><b>${got ? s.name : '？？？'}</b><span style="color:${rr.color}">${rr.name}</span><span>${got ? '最高 +' + meta.codex[s.id] : '还没打出来过'}</span>${got ? `<span>${s.desc}</span>` : ''}</div>`; }).join('');
  $('#codex').querySelectorAll('canvas').forEach((c) => { const id = c.dataset.shape, got = meta.codex[id] !== undefined; drawIcon(c, { mat: 'steel', shape: id, level: got ? Math.min(meta.codex[id], 25) : 0, mul: 1 }, !got); });
}
$('#codexBack').onclick = () => { if (run && $('#titleScreen').dataset.from === 'game') { hideScreens(); render(); } else showTitle(); };
function showHelp() {
  meta.seenHelp = true; saveMeta();
  openSheet(`<h2>规矩</h2><ol class="help">
    <li>你开了间铁匠铺，欠了钱庄的钱。每 ${DAYS} 天还一期，一期比一期多。</li>
    <li>点「锤」打铁，每锤花 1 点体力。可能<b style="color:var(--o-succ)">成功</b> +1、<b style="color:var(--o-great)">大成功</b> +2，也可能受损 -1，甚至<b style="color:var(--o-brk)">碎掉</b>。</li>
    <li>等级越高越值钱（每级涨 60%），也越容易碎。碎了就什么都没了。</li>
    <li>剑可以挂上<b>剑架</b>先存着，等买到护剑符、天工锤再拿下来接着打；也可以把小剑<b>熔进</b>大剑里。</li>
    <li>卖价 = 估价 × 当天行情，行情每天变。没力气了吃包子，或者睡一觉。</li>
    <li>还款日钱不够，剑架上的剑会先被拿去抵债。每还清一期挑一本秘籍。</li>
    <li>每把新剑胚的形制是随机的，一共 16 种，收进<b>剑谱</b>有永久加成。</li>
  </ol><p>电脑上：空格 = 锤，S = 出售，A = 上架，E = 睡觉</p><div class="btns"><button class="btn" id="mOk" type="button">开干</button></div>`);
  $('#mOk').onclick = closeSheet;
}
$('#tNew').onclick = () => { if (run && !confirmNew()) return; startRun(); };
let newArmed = 0;
function confirmNew() { if (performance.now() - newArmed < 3000) return true; newArmed = performance.now(); $('#tNew').textContent = '会放弃现在这一局，再点一次'; setTimeout(() => { $('#tNew').textContent = '开张'; }, 3000); return false; }
$('#tCont').onclick = () => { hideScreens(); render(); };
$('#tShop').onclick = showShop;
$('#tCodex').onclick = () => { $('#titleScreen').dataset.from = 'title'; showCodex(); };
$('#tHelp').onclick = showHelp;
$('#shopBack').onclick = showTitle;
$('#menuBtn').onclick = () => {
  openSheet(`<h2>歇会儿</h2><div class="btns"><button class="btn" id="mRes" type="button">接着打</button><button class="btn ghost" id="mCodex" type="button">剑谱 · ${codexN()}/${SHAPES.length}</button><button class="btn ghost" id="mSnd" type="button">声音：${meta.muted ? '关' : '开'}</button><button class="btn ghost" id="mRules" type="button">规矩</button><button class="btn ghost" id="mHome" type="button">回到门口（自动存档）</button></div>`);
  $('#mRes').onclick = closeSheet;
  $('#mCodex').onclick = () => { closeSheet(); $('#titleScreen').dataset.from = 'game'; showCodex(); };
  $('#mSnd').onclick = () => { meta.muted = !meta.muted; saveMeta(); $('#mSnd').textContent = '声音：' + (meta.muted ? '关' : '开'); };
  $('#mRules').onclick = showHelp;
  $('#mHome').onclick = showTitle;
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#sheet .card') && !$('#mAgain') && !$('#mGo')) closeSheet(); });

// hold-to-strike
let holdT = 0;
const btnS = $('#btnStrike');
btnS.addEventListener('pointerdown', (e) => { e.preventDefault(); strike(); clearInterval(holdT); holdT = setInterval(strike, 260); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btnS.addEventListener(ev, () => clearInterval(holdT)));
btnS.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); strike(); } });
$('#btnSell').onclick = sell;
$('#btnStore').onclick = storeSword;
$('#btnRest').onclick = rest;
$('#seals').addEventListener('click', (e) => { const b = e.target.closest('.seal'); if (b) toast(RMAP[b.dataset.id].name + '：' + RMAP[b.dataset.id].desc); });
$('#rack').addEventListener('click', (e) => { const b = e.target.closest('.slot[data-i]'); if (b) rackAction(+b.dataset.i); });
$('#bag').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; if (b.dataset.shop) shopSheet(); else itemSheet(b.dataset.id); });
addEventListener('keydown', (e) => {
  if (e.repeat && e.code !== 'Space') return;
  if (modalOpen()) return;
  if (e.code === 'Space') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); strike(); }
  else if (e.key === 's' || e.key === 'S') sell();
  else if (e.key === 'a' || e.key === 'A') storeSword();
  else if (e.key === 'e' || e.key === 'E') rest();
});

function render() {
  if (!run) return;
  const s = run.sword, t = tierOf(s.level), q = quota(), sh = SH[s.shape];
  $('#period').textContent = run.period;
  $('#days').innerHTML = Array.from({ length: DAYS }, (_, i) => `<i class="${i < run.day ? 'on' : ''}"></i>`).join('');
  $('#quota').textContent = fmt(q);
  $('#gold').textContent = fmt(run.gold);
  const left = DAYS - run.day;
  $('#gap').textContent = run.gold >= q ? '够还了' : (left ? `${left} 天后` : '明早') + '收账，还差 ' + fmt(q - run.gold);
  $('#meter').style.width = clamp(run.gold / q * 100, 0, 100) + '%';
  const tierEl = $('#sTier'); tierEl.textContent = t.name; tierEl.style.color = t.color;
  $('#sName').innerHTML = `${MAT[s.mat].name} · ${sh.name}「${s.name}」${s.gilded ? ' · 金漆' : ''}`;
  const lv = $('#sLevel'); lv.textContent = '+' + s.level; lv.style.color = s.level ? t.color : '#F3E9DC';
  $('#sVal').textContent = fmt(value(s));
  $('#sVal').parentElement.title = sh.desc;
  const o = odds(s), parts = [o.brk, o.dmg, o.keep, o.succ, o.great];
  $('#obar').querySelectorAll('i').forEach((el, i) => { el.style.width = (parts[i] * 100) + '%'; });
  const labels = ['碎裂', '受损', '无变化', '成功', run.forceGreat ? '必大成功' : '大成功 +' + stepUp(s)];
  const colors = ['--o-brk', '--o-dmg', '--o-keep', '--o-succ', '--o-great'];
  $('#olegend').innerHTML = parts.map((p, i) => `<span><b style="color:var(${colors[i]})">${pct(p)}</b>${labels[i]}</span>`).join('');
  const bf = [], b = run.buffs;
  if (b.hu) bf.push('护剑符：下一锤不会碎'); if (b.zhu) bf.push('祝福油：下一锤成功率 +25%'); if (b.tian) bf.push('天工锤：下一锤必成'); if (b.cui > 0) bf.push('淬火水：还剩 ' + b.cui + ' 锤'); if (b.ya) bf.push('牙行帖：下次卖剑 +40%');
  bf.push('剑型：' + sh.desc);
  $('#buffs').innerHTML = bf.map((x) => `<span>${x}</span>`).join('');
  $('#stam').textContent = '体力 ' + run.stam + '/' + maxStam();
  btnS.disabled = run.stam <= 0;
  $('#btnSell').disabled = s.level < 1;
  $('#sellPrice').textContent = s.level < 1 ? '+1 起收' : fmt(priceOf(s));
  $('#btnStore').disabled = s.level < 1 || run.rack.length >= rackCap();
  $('#rackCount').textContent = '剑架 ' + run.rack.length + '/' + rackCap();
  const rb = $('#btnRest');
  if (performance.now() - restArmed > 2500) rb.textContent = run.day >= DAYS ? '睡一觉 · 明早还款' : '睡一觉 · 明天再打';
  rb.classList.toggle('hot', run.stam <= 0);
  // rack
  const cap = rackCap();
  $('#rack').innerHTML = Array.from({ length: cap }, (_, i) => { const r = run.rack[i];
    return r ? `<button class="slot" type="button" data-i="${i}"><canvas></canvas><b style="color:${tierOf(r.level).color}">+${r.level}</b><span>${SH[r.shape].name} · ${fmt(priceOf(r, false))}</span></button>` : '<div class="slot empty">空位</div>'; }).join('');
  $('#rack').querySelectorAll('.slot[data-i]').forEach((el) => drawIcon(el.querySelector('canvas'), run.rack[+el.dataset.i]));
  // bag
  const ids = Object.keys(run.bag);
  $('#bag').innerHTML = ids.map((id) => `<button class="chip" type="button" data-id="${id}"><i>${IMAP[id].ch}</i>${IMAP[id].name} ×${run.bag[id]}</button>`).join('') + `<button class="chip shopbtn" type="button" data-shop="1"><i>铺</i>逛杂货铺</button>`;
  const cnt = ids.reduce((a, k) => a + run.bag[k], 0);
  document.querySelector('[data-tab="bag"]').innerHTML = '背包' + (cnt ? `<span class="n">${cnt}</span>` : '');
  document.querySelector('[data-tab="rack"]').innerHTML = '剑架' + (run.rack.length ? `<span class="n">${run.rack.length}</span>` : '');
  // market
  const mk = run.market, prev = run.mhist[run.mhist.length - 2] || 1, chg = mk / prev - 1;
  $('#mNow').textContent = '×' + mk.toFixed(2);
  const mc = $('#mChg'); mc.textContent = (chg >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(chg)); mc.className = 'mchg ' + (chg >= 0 ? 'up' : 'down');
  $('#mTip').textContent = has('xin') || run.next >= 1.4 && run.usedLi ? `明天 ×${run.next.toFixed(2)}${run.next > mk ? '，要涨' : '，要跌'}` : (has('ke') && mk < 1 ? '熟客按 ×1.00 收。' : '卖价 = 估价 × 当天行情。行情每天变，剑可以先放剑架上等涨价。');
  if (tab === 'market') drawMarket();
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
  const last = h[h.length - 1], col = last >= (h[h.length - 2] || 1) ? '#E5483B' : '#3FB37F';
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); h.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)))); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x(h.length - 1), y(last), 3.5, 0, 7); g.fill();
}

// ---------- swords: one drawing routine per shape ----------
// G: { x0: tip x, gx: guard x, y: blade centre line, bh: blade height, grip: grip length, t: time ms, alpha, heat, sil: silhouette only }
function bladePath(c, sh, G) {
  const { x0, gx, y, bh } = G, Lb = gx - x0;
  c.beginPath();
  switch (sh) {
    case 'huan': c.moveTo(gx, y - bh / 2); c.lineTo(x0 + bh * 0.3, y - bh / 2); c.lineTo(x0, y + bh * 0.05); c.quadraticCurveTo(x0 + Lb * 0.3, y + bh / 2, gx, y + bh / 2); break;
    case 'bi': { const a = gx - Lb * 0.55; c.moveTo(gx, y - bh * 0.55); c.quadraticCurveTo(a + Lb * 0.2, y - bh * 0.95, a, y); c.quadraticCurveTo(a + Lb * 0.2, y + bh * 0.95, gx, y + bh * 0.55); break; }
    case 'zhong': c.moveTo(gx, y - bh * 0.85); c.lineTo(x0 + bh * 0.6, y - bh * 0.85); c.lineTo(x0, y - bh * 0.25); c.lineTo(x0, y + bh * 0.25); c.lineTo(x0 + bh * 0.6, y + bh * 0.85); c.lineTo(gx, y + bh * 0.85); break;
    case 'wan': c.moveTo(gx, y - bh / 2); c.quadraticCurveTo(x0 + Lb * 0.45, y - bh * 0.55, x0, y - bh * 2.4); c.quadraticCurveTo(x0 + Lb * 0.3, y + bh * 1.1, gx, y + bh / 2); break;
    case 'miao': c.moveTo(gx, y - bh * 0.32); c.quadraticCurveTo(x0 + Lb * 0.5, y - bh * 0.42, x0, y - bh * 1.1); c.quadraticCurveTo(x0 + Lb * 0.5, y + bh * 0.42, gx, y + bh * 0.32); break;
    case 'she': { const n = 6, step = (Lb - bh * 1.2) / n; c.moveTo(gx, y - bh / 2);
      for (let i = 1; i <= n; i++) c.quadraticCurveTo(gx - step * (i - 0.5), y - bh / 2 + (i % 2 ? -1 : 1) * bh * 0.45, gx - step * i, y - bh / 2);
      c.lineTo(x0, y); c.lineTo(x0 + bh * 1.2, y + bh / 2);
      for (let i = n - 1; i >= 0; i--) c.quadraticCurveTo(gx - step * (i + 0.5), y + bh / 2 + (i % 2 ? -1 : 1) * bh * 0.45, gx - step * i, y + bh / 2); break; }
    case 'ju': { c.moveTo(gx, y - bh / 2); const tooth = Math.max(5, bh * 0.45); let x = gx, up = true; while (x > x0 + bh) { x -= tooth; c.lineTo(Math.max(x, x0 + bh), up ? y - bh / 2 - tooth * 0.6 : y - bh / 2); up = !up; }
      c.lineTo(x0, y + bh * 0.1); c.quadraticCurveTo(x0 + Lb * 0.3, y + bh / 2, gx, y + bh / 2); break; }
    case 'gu': { c.moveTo(gx, y - bh / 2); const n = 9; for (let i = 1; i <= n; i++) { const x = gx - (Lb - bh) * i / n; c.lineTo(x, y - bh / 2 + ((i * 37) % 7 - 3) * bh * 0.07 - (i % 3 === 0 ? bh * 0.35 : 0)); }
      c.lineTo(x0, y + bh * 0.2); for (let i = n; i >= 0; i--) { const x = gx - (Lb - bh) * i / n; c.lineTo(x, y + bh / 2 + ((i * 53) % 5 - 2) * bh * 0.06); } break; }
    case 'tao': c.moveTo(gx, y - bh / 2); c.lineTo(x0 + bh * 1.6, y - bh / 2); c.quadraticCurveTo(x0, y - bh / 2, x0, y); c.quadraticCurveTo(x0, y + bh / 2, x0 + bh * 1.6, y + bh / 2); c.lineTo(gx, y + bh / 2); break;
    case 'qian': { const r = bh * 0.62, n = Math.max(3, Math.floor(Lb / (r * 1.7))); for (let i = 0; i < n; i++) { const cx = gx - r - i * (Lb - r) / (n - 0.6); c.moveTo(cx + r, y); c.arc(cx, y, r, 0, Math.PI * 2); } break; }
    case 'huo': { const n = 7, step = (Lb - bh) / n; c.moveTo(gx, y - bh / 2);
      for (let i = 0; i < n; i++) { const xa = gx - step * i, xb = xa - step; c.quadraticCurveTo(xa - step * 0.2, y - bh * 1.25, xb, y - bh / 2); }
      c.lineTo(x0, y); c.lineTo(x0 + bh, y + bh / 2);
      for (let i = n - 1; i >= 0; i--) { const xb = gx - step * i, xa = xb - step; c.quadraticCurveTo(xa + step * 0.8, y + bh * 1.05, xb, y + bh / 2); } break; }
    case 'duan': { const xb = gx - Lb * 0.55; c.moveTo(gx, y - bh / 2); c.lineTo(xb, y - bh / 2); c.lineTo(xb - bh * 0.5, y - bh * 0.15); c.lineTo(xb + bh * 0.3, y + bh * 0.05); c.lineTo(xb - bh * 0.3, y + bh / 2); c.lineTo(gx, y + bh / 2); break; }
    default: c.moveTo(gx, y - bh / 2); c.lineTo(x0 + bh * 1.2, y - bh / 2); c.lineTo(x0, y); c.lineTo(x0 + bh * 1.2, y + bh / 2); c.lineTo(gx, y + bh / 2); // jian, qixing, yu, long
  }
  c.closePath();
}
const SKIN = { gu: ['#FFFDF5', '#E6DCC6', '#9C9078'], tao: ['#E3A16B', '#A0663A', '#5C3419'], qian: ['#FFE6A0', '#C99A45', '#6E4F1B'], yu: ['#E9FFF2', '#6FD3A0', '#1F6E4C'], huo: ['#FFF0C2', '#FF8A3D', '#7A2410'], long: ['#F4F6FF', '#7FA3C8', '#22304A'] };
function drawSwordAt(c, s, G) {
  const tier = tierOf(s.level), mat = MAT[s.mat], { x0, gx, y, bh, t = 0, alpha = 1, heat = 0, sil = false } = G, Lb = gx - x0;
  c.save(); c.globalAlpha = alpha;
  if (!sil && s.level >= 5) { c.shadowColor = tier.color; c.shadowBlur = Math.min(46, 6 + s.level * 1.1) * (G.glow ?? 1) * (0.85 + 0.15 * Math.sin(t / 300)); }
  bladePath(c, s.shape, G);
  if (sil) c.fillStyle = '#2E2723';
  else { const sk = SKIN[s.shape], grad = c.createLinearGradient(0, y - bh, 0, y + bh); grad.addColorStop(0, sk ? sk[0] : '#FFFFFF'); grad.addColorStop(0.45, sk ? sk[1] : mat.color); grad.addColorStop(1, sk ? sk[2] : '#2A2D33'); c.fillStyle = grad; }
  c.fill(); c.shadowBlur = 0;
  if (!sil) {
    if (heat > 0.02) { c.fillStyle = `rgba(255,${(120 + 80 * heat) | 0},40,${heat * 0.55})`; c.fill(); }
    if (s.level >= 10) { c.strokeStyle = tier.color; c.globalAlpha = alpha * 0.8; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = alpha; }
    // per-shape details
    c.lineWidth = Math.max(1, bh * 0.1);
    if (['jian', 'qixing', 'yu', 'long', 'tao', 'zhong'].includes(s.shape)) { c.strokeStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(gx - 8, y); c.lineTo(x0 + bh * 2, y); c.stroke(); }
    if (s.shape === 'qixing') { c.fillStyle = '#FFE38A'; for (let i = 0; i < 7; i++) { const px = gx - Lb * 0.12 - i * Lb * 0.11, py = y + (i % 2 ? -1 : 1) * bh * 0.18; c.beginPath(); c.arc(px, py, Math.max(1.2, bh * 0.11), 0, 7); c.fill(); } }
    if (s.shape === 'long') { c.strokeStyle = 'rgba(20,30,60,.45)'; for (let x = gx - bh * 0.6; x > x0 + bh * 1.5; x -= bh * 0.7) for (const dy of [-0.22, 0.22]) { c.beginPath(); c.arc(x, y + dy * bh, bh * 0.28, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); } }
    if (s.shape === 'qian') { c.fillStyle = '#5A3B12'; const r = bh * 0.62, n = Math.max(3, Math.floor(Lb / (r * 1.7))); for (let i = 0; i < n; i++) { const cx = gx - r - i * (Lb - r) / (n - 0.6), hs = r * 0.32; c.fillRect(cx - hs, y - hs, hs * 2, hs * 2); } c.strokeStyle = '#B3261E'; c.lineWidth = Math.max(1, bh * 0.08); c.beginPath(); c.moveTo(gx, y); c.lineTo(x0 + r, y); c.stroke(); }
    if (s.shape === 'yu') { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x0 + Lb * 0.55, y - bh * 0.15, Lb * 0.3, bh * 0.16, 0, 0, 7); c.fill(); }
    if (s.shape === 'huo') { c.fillStyle = `rgba(255,200,80,${0.25 + 0.15 * Math.sin(t / 120)})`; c.beginPath(); c.moveTo(gx, y); c.lineTo(x0 + bh * 1.5, y - bh * 0.1); c.lineTo(gx, y + bh * 0.2); c.fill(); }
  }
  // hilt: guard, grip, pommel — varies by shape
  const gold = !sil && s.level >= 15, steelC = sil ? '#2E2723' : gold ? '#D9A93F' : '#4A4440', grip = G.grip;
  const guard = { miao: 'disc', huan: 'bar', qian: 'none', tao: 'none', bi: 'bar', wan: 'curve', gu: 'none' }[s.shape] || 'cross';
  c.fillStyle = steelC; c.strokeStyle = steelC;
  if (guard === 'cross') c.fillRect(gx, y - bh * 1.35, Math.max(4, bh * 0.45), bh * 2.7);
  else if (guard === 'bar') c.fillRect(gx, y - bh * 0.8, Math.max(4, bh * 0.4), bh * 1.6);
  else if (guard === 'disc') { c.beginPath(); c.ellipse(gx + bh * 0.2, y, bh * 0.3, bh * 1.1, 0, 0, 7); c.fill(); }
  else if (guard === 'curve') { c.lineWidth = Math.max(3, bh * 0.35); c.beginPath(); c.moveTo(gx - bh * 0.6, y - bh * 1.3); c.quadraticCurveTo(gx + bh * 0.6, y, gx - bh * 0.6, y + bh * 1.3); c.stroke(); }
  const gx2 = gx + (guard === 'none' ? 0 : Math.max(4, bh * 0.45));
  c.fillStyle = sil ? '#2E2723' : s.shape === 'qian' ? '#B3261E' : s.shape === 'tao' ? '#7A4A26' : s.shape === 'gu' ? '#CFC4AA' : '#3B2A20';
  c.fillRect(gx2, y - bh * 0.36, grip, bh * 0.72);
  if (!sil && !['tao', 'gu'].includes(s.shape)) { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(1, bh * 0.12); for (let k = gx2 + 6; k < gx2 + grip; k += Math.max(5, bh * 0.6)) { c.beginPath(); c.moveTo(k, y - bh * 0.36); c.lineTo(k + bh * 0.35, y + bh * 0.36); c.stroke(); } }
  const px = gx2 + grip;
  c.fillStyle = steelC; c.strokeStyle = steelC;
  if (s.shape === 'huan') { c.lineWidth = Math.max(2, bh * 0.28); c.beginPath(); c.arc(px + bh * 0.55, y, bh * 0.55, 0, 7); c.stroke(); }
  else if (s.shape === 'wan') { c.lineWidth = Math.max(2, bh * 0.3); c.beginPath(); c.moveTo(px, y); c.quadraticCurveTo(px + bh * 0.9, y, px + bh * 0.6, y + bh * 0.9); c.stroke(); }
  else if (!['tao', 'gu'].includes(s.shape)) { c.beginPath(); c.arc(px + bh * 0.2, y, bh * 0.5, 0, 7); c.fill(); }
  // talisman on the peach-wood sword, tassel on high tiers
  if (!sil && s.shape === 'tao') { c.fillStyle = '#F2D36B'; c.save(); c.translate(gx + bh * 0.3, y + bh * 0.4); c.rotate(0.08 * Math.sin(t / 500)); c.fillRect(-bh * 0.35, 0, bh * 0.7, bh * 2.2); c.fillStyle = '#B3261E'; c.fillRect(-bh * 0.12, bh * 0.3, bh * 0.24, bh * 1.5); c.restore(); }
  if (!sil && s.level >= 20) { c.strokeStyle = tier.color; c.lineWidth = Math.max(1.5, bh * 0.14); c.beginPath(); c.moveTo(px, y); c.quadraticCurveTo(px + bh * 0.9, y + bh + 0.3 * bh * Math.sin(t / 400), px + bh * 0.4, y + bh * 2.2); c.stroke(); }
  c.restore();
  if (!sil && s.level >= 30) {
    const n = Math.min(14, 4 + ((s.level - 30) >> 2));
    for (let i = 0; i < n; i++) { const a = t / 900 + i * 6.283 / n; c.fillStyle = tier.color; c.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(t / 200 + i)); c.beginPath(); c.arc(x0 + Lb / 2 + Math.cos(a) * Lb * 0.55, y + Math.sin(a) * bh * 2.2, Math.max(1.2, bh * 0.1), 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
}
// small static rendering for rack slots, the codex and sheets
function drawIcon(cvs, s, sil = false) {
  if (!cvs) return;
  const r = cvs.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), w = r.width || 100, h = r.height || 40;
  cvs.width = Math.round(w * d); cvs.height = Math.round(h * d);
  const c = cvs.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
  const total = w * 0.9, grip = total * 0.17, bh = Math.max(5, Math.min(h * 0.2, total * 0.05)), x0 = (w - total) / 2 + bh * 0.2, gx = x0 + total * 0.72;
  drawSwordAt(c, s, { x0, gx, y: h / 2 + (s.shape === 'wan' ? bh * 0.6 : 0), bh, grip, alpha: 1, sil, glow: 0.35 });
}

// ---------- scene ----------
const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() {
  const r = cv.parentElement.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
  if (run && tab === 'market') drawMarket();
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
      const n = 9, sk = SKIN[this.ghost.shape]; for (let i = 0; i < n; i++) this.shards.push({ x: g.x0 + g.bl * (i + 0.5) / n, y: g.top - g.bh / 2, vx: (R() - 0.5) * 420, vy: -160 - R() * 320, rot: R() * 6, vr: (R() - 0.5) * 14, w: g.bl / n, h: g.bh, l: 1.1, c: sk ? sk[1] : MAT[this.ghost.mat].color });
      this.ghost = null;
    }
    const txt = { succ: ['成功 +' + delta, '#8BD06A'], great: ['大成功！+' + delta, '#F2C14E'], keep: ['无变化', '#A8988A'], dmg: [delta ? '受损 -1' : '受损', '#F08A3C'], brk: ['碎了', '#E5483B'] }[r];
    this.pop(txt[0], txt[1], r === 'great' || r === 'brk');
    sfx(r);
  },
  sold(p) { const g = geo(); for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.8, sp = 200 + R() * 260; this.parts.push({ x: g.cx, y: g.top - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0.9 + R() * 0.4, c: '#F2C14E', s: 3, coin: true }); } this.pop('+' + fmt(p), '#F2C14E', true); },
  feed() { const g = geo(); this.heat = 1; this.flash = 0.2; for (let i = 0; i < 40; i++) { const a = R() * 6.283, sp = 60 + R() * 200; this.parts.push({ x: g.x0 + R() * g.bl, y: g.top - g.bh, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, l: 0.8 + R() * 0.5, c: R() < 0.5 ? '#B680EC' : '#FFD27A', s: 2.5 }); } this.pop('熔了！', '#B680EC', true); },
  pop(t, c, big) { const el = $('#pop'); el.textContent = t; el.style.color = c; el.classList.toggle('big', !!big); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); },
};
function geo() {
  const cx = W / 2, top = H * 0.7, total = Math.min(W * 0.84, 560), bl = total * 0.7, lvl = run ? run.sword.level : 0, ti = tierOf(lvl).idx;
  const bh = Math.min(26, 11 + ti * 1.6 + Math.min(lvl, 40) * 0.08);
  const x0 = cx - total / 2;
  return { cx, top, total, bl, bh, x0, gx: x0 + bl, hx: x0 + bl * 0.55 };
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
// hammer: upright, handle centred on the head; rests off to the right and drops straight onto the blade
function drawHammer(g, now) {
  const restX = g.cx + Math.min(W * 0.33, 205), restY = g.top - Math.min(84, H * 0.22) - Math.sin(now / 500) * 3;
  const hitX = g.hx, hitY = g.top - g.bh - 17;
  let k = 0;
  if (fx.hamT > 0) {
    const t = now - fx.hamT;
    if (t < 70) k = (t / 70) * (t / 70);
    else { if (fx.pending) fx.impact(); const u = Math.min(1, (t - 70) / 200); k = (1 - u) * (1 - u); if (u >= 1) fx.hamT = -1; }
  }
  if (run && run.stam <= 0 && fx.hamT < 0) return;
  const x = restX + (hitX - restX) * k, y = restY + (hitY - restY) * k;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.22 * Math.sin(Math.PI * k));
  ctx.fillStyle = '#6B4A33'; ctx.fillRect(-4.5, -104, 9, 92);
  ctx.fillStyle = '#80593D'; ctx.fillRect(-4.5, -104, 3, 92);
  ctx.fillStyle = '#3D3936'; ctx.fillRect(-30, -14, 60, 28);
  ctx.fillStyle = '#5A5450'; ctx.fillRect(-30, -14, 60, 5);
  ctx.fillStyle = '#2A2725'; ctx.fillRect(-30, 9, 60, 5);
  ctx.restore();
}
function frame(now) {
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
  if (W && H) {
    const g = geo();
    ctx.save();
    if (fx.shake > 0) ctx.translate((R() - 0.5) * 14 * fx.shake, (R() - 0.5) * 14 * fx.shake);
    ctx.fillStyle = '#130F0D'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let r = 0, y = 0; y < g.top; r++, y += 26) for (let x = (r % 2) * -30; x < W; x += 60) ctx.fillRect(x + 2, y + 2, 56, 22);
    const glow = ctx.createRadialGradient(g.cx, H * 1.05, 10, g.cx, H * 1.05, H * 0.95);
    glow.addColorStop(0, `rgba(255,106,26,${0.32 + fx.heat * 0.25})`); glow.addColorStop(1, 'rgba(255,106,26,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    for (const e of embers) { e.y -= e.v * dt; if (e.y < -0.05) { e.y = 1.05; e.x = R(); } ctx.fillStyle = `rgba(255,${(140 + 60 * Math.sin(now / 300 + e.p)) | 0},60,${0.35 + 0.3 * Math.sin(now / 400 + e.p)})`; ctx.fillRect(e.x * W, e.y * H, e.s, e.s); }
    drawAnvil(g);
    if (run) { const a = clamp((now - fx.born) / 300, 0, 1); if (a > 0) drawSwordAt(ctx, run.sword, { x0: g.x0, gx: g.gx, y: g.top - g.bh / 2 - 3 - (run.sword.shape === 'zhong' ? g.bh * 0.35 : 0), bh: g.bh, grip: g.total - g.bl - 30, t: now, alpha: a, heat: fx.heat }); }
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
  const s = run.sword, o = odds(s), q = quota(), need = q - run.gold;
  if (run.stam <= 0) { if (run.bag.bao) { useItem('bao'); return; } if (run.day >= DAYS && s.level >= 1 && run.gold < q) sell(); rest(); return; }
  const p = priceOf(s), enough = p >= need * 1.05 && need > 0;
  if (s.level >= 1 && (o.brk > 0.16 || (enough && o.brk > 0.04))) {
    if (s.level >= 8 && run.rack.length < rackCap() && !enough) { storeSword(); return; }
    sell(); return;
  }
  strike();
}
if (DEMO) {
  meta.seenHelp = true; meta.muted = true;
  hideScreens(); newRun('iron'); run.relics.push('lian', 'yan'); render();
  setInterval(demoTick, 420);
} else if (run) { showTitle(); render(); } else showTitle();
window.__game = { get run() { return run; }, get meta() { return meta; }, odds, quota, value, fmt, SHAPES, drawIcon, render };
})();
