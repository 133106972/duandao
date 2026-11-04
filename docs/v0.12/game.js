// 一锤子买卖 / One Hammer Deal v0.12 — forging gamble incremental. Plain JS, no dependencies. See DESIGN.md.
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const R = Math.random;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(R() * a.length)];
const DEMO = location.hash === '#demo';
const DEMO_RISK = +new URLSearchParams(location.search).get('risk') || 0.16; // autopilot sells once the break chance passes this
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAYS = 3, SAVE_V = 3;
const FIRE_MAX = 10, FEVER_LEN = 8, FEVER_GREAT = 0.15; // full fire (10) starts fever: 8 strikes, no stamina, no break/damage, +15% great

// ---------- language ----------
// every visible string goes through T(zh, en); data tables carry `en` / `descEn` fields
// 繁體 is generated from the Simplified text with this character table (built with OpenCC s2twp, see DESIGN.md)
let LANG = 'zh';
const TRAD = {"万":"萬","东":"東","两":"兩","个":"個","么":"麼","乐":"樂","买":"買","于":"於","云":"雲","亿":"億","从":"從","价":"價","优":"優","会":"會","伞":"傘","传":"傳","体":"體","侠":"俠","债":"債","儿":"兒","关":"關","内":"內","军":"軍","冲":"衝","准":"準","凉":"涼","减":"減","几":"機","凤":"鳳","击":"擊","刚":"剛","剑":"劍","动":"動","励":"勵","匀":"勻","单":"單","卖":"賣","历":"曆","厨":"廚","参":"參","变":"變","叠":"疊","号":"號","后":"後","吗":"嗎","听":"聽","咸":"鹹","图":"圖","声":"聲","处":"處","备":"備","够":"夠","头":"頭","奖":"獎","学":"學","宝":"寶","实":"實","对":"對","岳":"嶽","师":"師","带":"帶","干":"幹","庄":"莊","库":"庫","开":"開","弃":"棄","张":"張","归":"歸","录":"錄","态":"態","恒":"恆","惊":"驚","扩":"擴","抢":"搶","护":"護","挂":"掛","挡":"擋","损":"損","捡":"撿","换":"換","摇":"搖","摊":"攤","撑":"撐","数":"數","斩":"斬","断":"斷","无":"無","时":"時","机":"機","杂":"雜","条":"條","来":"來","极":"極","枣":"棗","样":"樣","档":"檔","欢":"歡","气":"氣","沟":"溝","没":"沒","沧":"滄","浏":"瀏","涧":"澗","涨":"漲","滚":"滾","满":"滿","灵":"靈","炉":"爐","点":"點","炼":"煉","现":"現","电":"電","画":"畫","盘":"盤","着":"著","确":"確","礼":"禮","离":"離","种":"種","税":"稅","稳":"穩","笔":"筆","签":"籤","简":"簡","籁":"籟","系":"係","红":"紅","约":"約","级":"級","纪":"紀","纯":"純","纸":"紙","练":"練","细":"細","经":"經","结":"結","给":"給","继":"繼","绩":"績","续":"續","绿":"綠","罗":"羅","胆":"膽","脑":"腦","腊":"臘","艺":"藝","芦":"蘆","药":"藥","葱":"蔥","蓝":"藍","补":"補","见":"見","规":"規","览":"覽","觉":"覺","议":"議","记":"記","设":"設","识":"識","话":"話","语":"語","说":"說","谱":"譜","财":"財","败":"敗","账":"賬","货":"貨","贪":"貪","购":"購","贷":"貸","费":"費","赌":"賭","赏":"賞","轩":"軒","载":"載","辕":"轅","边":"邊","过":"過","运":"運","还":"還","这":"這","进":"進","连":"連","选":"選","采":"採","里":"裡","鉴":"鑑","针":"針","钢":"鋼","钮":"鈕","钱":"錢","钻":"鑽","铁":"鐵","铜":"銅","铸":"鑄","铺":"鋪","锁":"鎖","锅":"鍋","锋":"鋒","锤":"錘","键":"鍵","镇":"鎮","镖":"鏢","长":"長","门":"門","间":"間","陨":"隕","险":"險","随":"隨","难":"難","静":"靜","韧":"韌","项":"項","顾":"顧","额":"額","风":"風","飞":"飛","马":"馬","鱼":"魚","鲲":"鯤","鳞":"鱗","鸟":"鳥","鸡":"雞","鸿":"鴻","黄":"黃","齐":"齊","龙":"龍"};
const TRAD_PHRASES = [['擀面杖', '擀麵杖'], ['激光', '雷射']]; // Taiwan wording that a per-character table can't express
function toTrad(str) { let o = ''; for (const ch of String(str)) o += TRAD[ch] || ch; for (const [a, b] of TRAD_PHRASES) o = o.split(toTradRaw(a)).join(b); return o; }
function toTradRaw(str) { let o = ''; for (const ch of String(str)) o += TRAD[ch] || ch; return o; }
const LANGS = [['zh', '简体中文'], ['zht', '繁體中文'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português (BR)'], ['de', 'Deutsch'], ['ru', 'Русский'], ['ja', '日本語'], ['ko', '한국어']];
// Spanish / German: English text is looked up as a template. Names and numbers are masked first, so
// "Sold +5 Leek for 12" and "Sold +9 Abacus for 3.4K" share one entry: "Sold {0} {1} for {2}". Tables live in i18n.js.
const I18N = window.I18N || {};
const isTbl = () => !!(I18N[LANG] && I18N[LANG].t); // languages translated from English through i18n.js
const isLatin = () => LANG === 'en' || ['es', 'fr', 'pt', 'de', 'ru'].includes(LANG);
const NUM_RE = /[+\-×]?\d+(?:[.,]\d+)*(?:Qa|Qi|Sx|Sp|Oc|No|Dc|[KMBT](?![a-z])|[a-z]{2}(?![a-zA-Z])|(?:[万億兆京垓秭穣溝澗正載極만억조경해자양구간정재극]|恒河沙|阿僧祇|那由他|不可思議|無量大数|항하사|아승기|나유타|불가사의|무량대수)+)?%?/g;
let ENT = null; // [[name as it may appear, translation]] longest first, per language
function entities() {
  if (ENT && ENT.lang === LANG) return ENT.list;
  const tbl = (I18N[LANG] && I18N[LANG].n) || {}, en = new Set();
  [WEAPONS, ITEMS, RELICS, MATS, UPGS, OFFERS, LOANS].forEach((a) => a.forEach((o) => o.en && en.add(o.en)));
  Object.values(FORMS).forEach((f) => f.forEach((x) => en.add(x[1]))); NAMES_EN.forEach((x) => en.add(x));
  const list = [...en].map((k) => [k, tbl[k] || k]); list.forEach(([, v]) => { if (!en.has(v)) list.push([v, v]); });
  list.sort((a, b) => b[0].length - a[0].length); ENT = { lang: LANG, list }; return list;
}
function maskKey(str) {
  // markers use private-use characters (not digits) so number masking can't touch them
  const vals = [], mark = (v) => '\u0001' + String.fromCharCode(0xE000 + vals.push(v) - 1) + '\u0002'; let m = String(str).replace(/[«„「]\s*/g, '"').replace(/\s*[»“」]/g, '"');
  for (const [k, v] of entities()) if (m.includes(k)) m = m.split(k).join(mark(v));
  m = m.replace(NUM_RE, (x) => mark(x));
  const order = []; const key = m.replace(/\u0001([\uE000-\uF8FF])\u0002/g, (_, c) => '{' + (order.push(c.charCodeAt(0) - 0xE000) - 1) + '}');
  return { key, vals: order.map((i) => vals[i]) };
}
function trX(str) {
  const tb = I18N[LANG]; if (!tb || str == null) return str;
  const { key, vals } = maskKey(str), tpl = tb.t[key];
  if (window.__i18nMiss && tpl == null && key !== '{0}' && key) window.__i18nMiss(key, str);
  return (tpl == null ? key : tpl).replace(/\{(\d+)\}/g, (_, j) => vals[+j] ?? '');
}
const nm = (en) => ((I18N[LANG] && I18N[LANG].n[en]) || en);
const T = (zh, en) => (LANG === 'en' ? (window.__i18nCollect && window.__i18nCollect(en), en) : LANG === 'zht' ? toTrad(zh) : isTbl() ? trX(en) : zh);
const N = (o) => (LANG === 'en' && o.en ? o.en : LANG === 'zht' ? toTrad(o.name) : (isTbl()) && o.en ? nm(o.en) : o.name);
const D = (o) => (LANG === 'en' && o.descEn ? o.descEn : LANG === 'zht' ? toTrad(o.desc) : (isTbl()) && o.descEn ? trX(o.descEn) : o.desc);
function inLang(l, fn) { const cur = LANG; LANG = l; try { return fn(); } finally { LANG = cur; } }

// ---------- numbers ----------
// 中文：万进单位用到无量大数，再往上叠「无量大数」；English: K M B T … then aa, ab, ac … like most incrementals
const UNITS = [['无量大数', 1e68], ['不可思议', 1e64], ['那由他', 1e60], ['阿僧祇', 1e56], ['恒河沙', 1e52], ['极', 1e48], ['载', 1e44], ['正', 1e40], ['涧', 1e36], ['沟', 1e32], ['穰', 1e28], ['秭', 1e24], ['垓', 1e20], ['京', 1e16], ['兆', 1e12], ['亿', 1e8], ['万', 1e4]];
const EN_UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const short = (x) => String(+x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2));
function fmtZh(n) {
  if (n >= 1e72) return fmtZh(n / 1e68) + '无量大数';
  for (const [u, v] of UNITS) if (n >= v) return short(n / v) + u;
  return Math.floor(n).toLocaleString('zh-CN');
}
function fmtEn(n) {
  if (n < 1e4) return Math.floor(n).toLocaleString('en-US');
  const k = Math.floor(Math.log10(n) / 3), x = n / Math.pow(10, k * 3);
  if (k < EN_UNITS.length) return short(x) + EN_UNITS[k];
  const j = k - EN_UNITS.length; return short(x) + String.fromCharCode(97 + Math.floor(j / 26) % 26) + String.fromCharCode(97 + j % 26);
}
const MYRIAD = { ja: ['万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極', '恒河沙', '阿僧祇', '那由他', '不可思議', '無量大数'], ko: ['만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극', '항하사', '아승기', '나유타', '불가사의', '무량대수'] };
function fmtMy(n, u) {
  if (n >= 1e72) return fmtMy(n / 1e68, u) + u[16];
  for (let i = 16; i >= 0; i--) { const v = Math.pow(10, 4 * (i + 1)); if (n >= v) return short(n / v) + u[i]; }
  return Math.floor(n).toLocaleString('en-US');
}
function fmt(n) {
  if (!isFinite(n)) return n < 0 ? T('-不可说', '-∞') : T('不可说不可说', 'Beyond Words');
  if (n < 0) return '-' + fmt(-n);
  return MYRIAD[LANG] ? fmtMy(n, MYRIAD[LANG]) : isLatin() ? fmtEn(n) : LANG === 'zht' ? toTrad(fmtZh(n)) : fmtZh(n);
}
const pct = (x) => (x * 100 >= 10 || x === 0 ? (x * 100).toFixed(0) : (x * 100).toFixed(1)) + '%';

// ---------- content ----------
const MATS = [
  { id: 'iron', name: '生铁', en: 'Pig Iron', base: 8, color: '#8E9197', cost: 0, desc: '最便宜的料，起家用', descEn: 'The cheapest stuff, to get started' },
  { id: 'steel', name: '精钢', en: 'Fine Steel', base: 24, color: '#BFC9D3', cost: 60, desc: '底价是生铁的 3 倍', descEn: '3× the base price of pig iron' },
  { id: 'xuan', name: '玄铁', en: 'Dark Iron', base: 80, color: '#5E6C90', cost: 240, desc: '底价是生铁的 10 倍', descEn: '10× the base price of pig iron' },
  { id: 'meteor', name: '陨铁', en: 'Meteorite', base: 300, color: '#8C6BBE', cost: 900, desc: '天上掉下来的，底价 37 倍', descEn: 'Fell from the sky, 37× base price' },
  { id: 'dragon', name: '龙骨', en: 'Dragon Bone', base: 1500, color: '#E3C47C', cost: 3600, desc: '传说中的料，底价 187 倍', descEn: 'The stuff of legend, 187× base price' },
];
const MAT = Object.fromEntries(MATS.map((m) => [m.id, m]));
const TIERS = [[0, '凡品', 'Plain', '#A39C92'], [5, '良品', 'Good', '#86C46A'], [10, '精品', 'Superior', '#4FA6E3'], [15, '名器', 'Renowned', '#B680EC'], [20, '宝器', 'Treasured', '#F2A43C'], [30, '神兵', 'Divine', '#FF5C3E'], [45, '仙兵', 'Immortal', '#FF5FB8'], [60, '天工', 'Heaven-made', '#FFF1A8']];
const tierOf = (L) => { let t = TIERS[0], i = 0; TIERS.forEach((x, k) => { if (L >= x[0]) { t = x; i = k; } }); return { min: t[0], name: T(t[1], t[2]), color: t[3], idx: i }; };
const NAMES = ['青锋', '赤霄', '寒月', '断水', '流光', '照胆', '惊鸿', '听雨', '龙吟', '秋水', '玄霜', '破军', '长风', '落雁', '飞雪', '无咎', '孤鸿', '镇岳', '星河', '沧浪', '归墟', '不语', '照夜', '截云', '二狗', '旺财', '翠花', '铁柱'];
const NAMES_EN = ['Azure Edge', 'Red Sky', 'Cold Moon', 'Stream Cutter', 'Streak', 'Brave Heart', 'Startled Swan', 'Rain Song', 'Dragon Hum', 'Autumn Water', 'Black Frost', 'Army Breaker', 'Long Wind', 'Falling Goose', 'Flying Snow', 'Blameless', 'Lone Crane', 'Mountain Anchor', 'Star River', 'Surge', 'The Abyss', 'Silent', 'Night Lamp', 'Cloud Cutter', 'Doggo', 'Lucky', 'Daisy', 'Ironpillar'];
const sname = (s) => (s.ni == null ? s.name : T(NAMES[s.ni], NAMES_EN[s.ni]));
// rarity: white / green / blue / gold / red. w = chance, bm = base price multiplier
const RARITY = [
  { name: '普通', en: 'Common', key: '白', keyEn: 'White', w: 0.50, color: '#E4DED3', bm: 1 },
  { name: '优秀', en: 'Uncommon', key: '绿', keyEn: 'Green', w: 0.28, color: '#5FD068', bm: 1.3 },
  { name: '稀有', en: 'Rare', key: '蓝', keyEn: 'Blue', w: 0.15, color: '#4FA6FF', bm: 1.8 },
  { name: '传说', en: 'Legendary', key: '金', keyEn: 'Gold', w: 0.06, color: '#F5C542', bm: 2.6 },
  { name: '神话', en: 'Mythic', key: '红', keyEn: 'Red', w: 0.01, color: '#FF4D4D', bm: 4 },
];
const RK = (r) => T(r.key, r.keyEn);
const GRADE_BONUS = [['体力上限 +1', 'Max stamina +1'], ['成功率 +1%', 'Success +1%'], ['卖价 ×1.05', 'Sell price ×1.05'], ['大成功率 +2%', 'Great success +2%'], ['新胚子直接 +1 级', 'New blanks start +1 level']];
const GB = (i) => T(...GRADE_BONUS[i]);

// 兵器: the smith can forge anything. ext = [reach above, below] the centre line, in thickness units
const WEAPONS = [
  { id: 'jian', name: '直剑', en: 'Straight Sword', rar: 0, desc: '四平八稳，没有特点', descEn: 'Balanced, no special trait', col: '#BFC9D3', ext: [1.3, 1.3] },
  { id: 'caidao', name: '菜刀', en: 'Cleaver', rar: 0, desc: '厨房耐造：受损率 -4%', descEn: 'Kitchen-tough: damage chance -4%', col: '#C9D1D8', ext: [1.4, 1.4] },
  { id: 'ganmian', name: '擀面杖', en: 'Rolling Pin', rar: 0, desc: '结实：打到 +12 之前不会碎（底价 ×0.8）', descEn: "Sturdy: can't break before +12 (base ×0.8)", col: '#C8955A', ext: [0.65, 0.65], bm: 0.8 },
  { id: 'tuoxie', name: '人字拖', en: 'Flip-flop', rar: 0, desc: '啪！大成功率 +8%（底价 ×0.5）', descEn: 'Slap! Great success +8% (base ×0.5)', col: '#3D7DD8', ext: [1.4, 1.4], bm: 0.5 },
  { id: 'cong', name: '大葱', en: 'Leek', rar: 0, desc: '韧：受损时一半几率不掉级', descEn: 'Tough: damage has a 50% chance to keep the level', col: '#5BC266', ext: [1.25, 1.2] },
  { id: 'guo', name: '平底锅', en: 'Frying Pan', rar: 0, desc: '锅够硬：碎裂率 ×0.7', descEn: 'Hard as a pan: break chance ×0.7', col: '#3A3A40', ext: [2.1, 2.1] },
  { id: 'san', name: '雨伞', en: 'Umbrella', rar: 1, desc: '下跌的日子（现价低于昨收）卖价 ×1.4', descEn: "On down days (price below yesterday's close) sells for ×1.4", col: '#C0392B', ext: [1, 1.4] },
  { id: 'fagun', name: '法棍', en: 'Baguette', rar: 1, desc: '越放越硬：在剑架上每过一夜估价 +10%', descEn: 'Gets harder with age: +10% value each night on the rack', col: '#D99A45', ext: [0.65, 0.65] },
  { id: 'jitui', name: '鸡腿', en: 'Drumstick', rar: 1, desc: '边啃边打：每锤 40% 几率不花体力', descEn: 'Snack while you work: 40% chance a strike costs no stamina', col: '#B8692B', ext: [1.6, 1.6] },
  { id: 'suanpan', name: '算盘', en: 'Abacus', rar: 1, desc: '精打细算：卖价 ×1.3', descEn: 'Penny-wise: sell price ×1.3', col: '#7A4A26', ext: [1.35, 1.35] },
  { id: 'tanghulu', name: '糖葫芦', en: 'Candied Haws', rar: 1, desc: '每满 5 级，估价再 ×1.3', descEn: 'Every 5 levels, value ×1.3', col: '#D9332B', ext: [0.85, 0.85] },
  { id: 'yu', name: '咸鱼', en: 'Salted Fish', rar: 2, desc: '咸鱼翻身：碎的时候 30% 几率改成大成功', descEn: 'Fish flip: 30% chance a break becomes a great success', col: '#8FA3AA', ext: [1.1, 1.1] },
  { id: 'jiguang', name: '激光剑', en: 'Laser Sword', rar: 2, desc: '每级多涨 12%，碎裂率 +2%', descEn: 'Each level adds 12% more value, break chance +2%', col: '#3DF5FF', ext: [0.7, 0.7], g: 0.12 },
  { id: 'jita', name: '电吉他', en: 'Electric Guitar', rar: 2, desc: '越连越嗨：每连击一次，大成功率 +3%', descEn: 'Shred: +3% great success per combo', col: '#D62828', ext: [1.6, 1.6] },
  { id: 'jianpan', name: '键盘', en: 'Keyboard', rar: 2, desc: '键盘侠：底价 ×3，碎裂率 +3%', descEn: 'Keyboard warrior: base ×3, break chance +3%', col: '#4A4F5A', ext: [1, 1], bm: 3 },
  { id: 'qian', name: '铜钱剑', en: 'Coin Sword', rar: 3, desc: '卖价 ×1.6', descEn: 'Sell price ×1.6', col: '#C99A45', ext: [0.7, 0.7] },
  { id: 'maton', name: '马桶搋子', en: 'Plunger', rar: 3, desc: '受损时 30% 几率「吸」回来，改成成功', descEn: 'Damage has a 30% chance to get sucked back into a success', col: '#E84A3C', ext: [1.4, 1.4] },
  { id: 'dianzuan', name: '电钻', en: 'Power Drill', rar: 3, desc: '成功时 15% 几率连钻两下，再 +1', descEn: '15% chance a success drills twice for +1 more', col: '#F2C14E', ext: [0.8, 2.6] },
  { id: 'jingu', name: '金箍棒', en: 'Golden Staff', rar: 4, desc: '大成功一次多 +1 级', descEn: 'Great success gives +1 more level', col: '#E0B04A', ext: [0.5, 0.5] },
  { id: 'bangbang', name: '彩虹棒棒糖', en: 'Rainbow Lollipop', rar: 4, desc: '每级多涨 15%', descEn: 'Each level adds 15% more value', col: '#FF6FB5', ext: [1.9, 1.9], g: 0.15 },
];
const WP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const FORM_LV = [0, 25, 50, 75];
const STAGES = [['凡形', 'Base'], ['觉醒', 'Awakened'], ['器灵', 'Spirit'], ['神化', 'Ascended']];
const stageOf = (L) => (L >= 75 ? 3 : L >= 50 ? 2 : L >= 25 ? 1 : 0);
const FORMS = {
  jian: [['直剑', 'Straight Sword'], ['青锋剑', 'Azure Blade'], ['龙泉剑', 'Dragon Spring Sword'], ['轩辕剑', 'Xuanyuan Sword']],
  caidao: [['菜刀', 'Cleaver'], ['斩骨刀', 'Bone Chopper'], ['庖丁刀', "Cook Ding's Knife"], ['天厨神刀', 'Celestial Cleaver']],
  ganmian: [['擀面杖', 'Rolling Pin'], ['枣木杖', 'Jujube Pin'], ['定海擀面杖', 'Sea-Calming Pin'], ['擎天一擀', 'Sky Pillar Pin']],
  tuoxie: [['人字拖', 'Flip-flop'], ['老头乐凉鞋', 'Grandpa Sandal'], ['风火拖', 'Wind-Fire Flip-flop'], ['筋斗云拖', 'Cloud-Somersault Slipper']],
  cong: [['大葱', 'Leek'], ['章丘大葱', 'Prize Leek'], ['葱王', 'Leek King'], ['葱仙', 'Leek Immortal']],
  guo: [['平底锅', 'Frying Pan'], ['铁锅', 'Iron Wok'], ['炒天锅', 'Sky-Stir Wok'], ['乾坤锅', 'Cosmic Wok']],
  san: [['雨伞', 'Umbrella'], ['油纸伞', 'Oil-Paper Umbrella'], ['青罗伞', 'Silk Parasol'], ['混元伞', 'Primordial Parasol']],
  fagun: [['法棍', 'Baguette'], ['硬法棍', 'Stale Baguette'], ['金刚法棍', 'Diamond Baguette'], ['永恒法棍', 'Eternal Baguette']],
  jitui: [['鸡腿', 'Drumstick'], ['烤鸡腿', 'Roast Drumstick'], ['凤凰腿', 'Phoenix Leg'], ['不死鸟腿', 'Undying Phoenix Leg']],
  suanpan: [['算盘', 'Abacus'], ['铁算盘', 'Iron Abacus'], ['玉算盘', 'Jade Abacus'], ['天机算盘', 'Abacus of Fate']],
  tanghulu: [['糖葫芦', 'Candied Haws'], ['冰糖葫芦', 'Rock-Sugar Haws'], ['琉璃葫芦', 'Glazed Gourds'], ['七宝葫芦', 'Seven-Treasure Gourds']],
  yu: [['咸鱼', 'Salted Fish'], ['腊鱼', 'Cured Fish'], ['翻身鱼', 'Flipping Fish'], ['北冥之鲲', 'Kun of the Northern Sea']],
  jiguang: [['激光剑', 'Laser Sword'], ['光能剑', 'Photon Blade'], ['等离子剑', 'Plasma Blade'], ['星河光剑', 'Galaxy Saber']],
  jita: [['电吉他', 'Electric Guitar'], ['失真吉他', 'Distortion Guitar'], ['摇滚之魂', 'Soul of Rock'], ['天籁神琴', 'Heavenly Shredder']],
  jianpan: [['键盘', 'Keyboard'], ['机械键盘', 'Mechanical Keyboard'], ['RGB 键盘', 'RGB Keyboard'], ['键神', 'The Keymaster']],
  qian: [['铜钱剑', 'Coin Sword'], ['五帝钱剑', 'Five-Emperor Coin Sword'], ['金钱剑', 'Golden Coin Sword'], ['聚宝剑', 'Treasure-Gathering Sword']],
  maton: [['马桶搋子', 'Plunger'], ['疏通神器', 'Unclogger'], ['真空搋子', 'Vacuum Plunger'], ['吞天搋', 'Sky-Swallowing Plunger']],
  dianzuan: [['电钻', 'Power Drill'], ['冲击钻', 'Hammer Drill'], ['钻地龙', 'Earth Dragon Drill'], ['穿天钻', 'Heaven-Piercing Drill']],
  jingu: [['金箍棒', 'Golden Staff'], ['如意棒', 'Ruyi Staff'], ['定海神针', 'Sea-Pinning Pillar'], ['如意金箍棒', 'Ruyi Jingu Bang']],
  bangbang: [['彩虹棒棒糖', 'Rainbow Lollipop'], ['七彩棒棒糖', 'Prism Lollipop'], ['极光糖', 'Aurora Pop'], ['宇宙棒棒糖', 'Cosmic Lollipop']],
};
const formName = (shape, L) => { const f = FORMS[shape][stageOf(L)]; return T(f[0], f[1]); };
const MILES = [{ n: 5, desc: '体力上限 +2', descEn: 'Max stamina +2' }, { n: 10, desc: '成功率 +2%', descEn: 'Success +2%' }, { n: 15, desc: '卖价 ×1.1', descEn: 'Sell price ×1.1' }, { n: 20, desc: '新胚子直接 +2 级', descEn: 'New blanks start at +2' }];

// 秘籍 (seals): one picked after every repaid period, lasts the whole run
const RELICS = [
  { id: 'cuihuo', ch: '淬', name: '淬火油', en: 'Quench Oil', desc: '碎裂率 ×0.7', descEn: 'Break chance ×0.7', mod: (m) => { m.breakMul *= 0.7; } },
  { id: 'zhen', ch: '砧', name: '老铁砧', en: 'Old Anvil', desc: '体力上限 +4', descEn: 'Max stamina +4', mod: (m) => { m.stamAdd += 4; } },
  { id: 'yan', ch: '眼', name: '火眼', en: 'Keen Eye', desc: '大成功率 +6%', descEn: 'Great success +6%', mod: (m) => { m.greatAdd += 0.06; } },
  { id: 'jiang', ch: '匠', name: '匠心', en: "Craftsman's Heart", desc: '成功率 +6%（从“无变化”里匀过来）', descEn: 'Success +6% (taken from "No change")', mod: (m) => { m.succAdd += 0.06; } },
  { id: 'lin', ch: '鳞', name: '龙鳞锤', en: 'Dragon-Scale Hammer', desc: '每升一级，估价多涨 10%', descEn: 'Each level adds 10% more value', mod: (m) => { m.growthAdd += 0.1; } },
  { id: 'he', ch: '吆', name: '吆喝', en: 'Street Hawker', desc: '卖价 ×1.3', descEn: 'Sell price ×1.3', mod: (m) => { m.sellMul *= 1.3; } },
  { id: 'lu', ch: '炉', name: '回炉', en: 'Recycler', desc: '东西碎了，拿回估价的 40%', descEn: 'Get 40% of the value back when something breaks' },
  { id: 'gu', ch: '骨', name: '反骨', en: 'Contrarian', desc: '受损时返还 1 点体力', descEn: 'Damage refunds 1 stamina' },
  { id: 'lian', ch: '连', name: '连击谱', en: 'Combo Manual', desc: '连续成功 3 次，下一锤必定大成功', descEn: 'After 3 successes in a row, the next strike is a great success' },
  { id: 'feng', ch: '锋', name: '开锋', en: 'Pre-sharpened', desc: '新胚子直接从 +3 开始', descEn: 'New blanks start at +3', mod: (m) => { m.startLevel += 3; } },
  { id: 'qi', ch: '契', name: '地契', en: 'Land Deed', desc: '欠款 ×0.85', descEn: 'Debt ×0.85', mod: (m) => { m.quotaMul *= 0.85; } },
  { id: 'ke', ch: '客', name: '熟客', en: 'Regulars', desc: '现价低于 ×1.00 时，熟客按 ×1.00 收', descEn: 'When the price is below ×1.00, regulars still pay ×1.00' },
  { id: 'du', ch: '骰', name: '赌徒骰', en: "Gambler's Die", desc: '大成功多 +1 级，碎裂率 +2%', descEn: 'Great success gives +1 more level, break chance +2%', mod: (m) => { m.greatStep += 1; m.breakAdd += 0.02; } },
  { id: 'fu', ch: '符', name: '护身符', en: 'Charm', desc: '每期第一次碎裂，变成受损', descEn: 'The first break each period becomes damage' },
  { id: 'ye', ch: '夜', name: '夜市', en: 'Night Market', desc: '睡觉时，砧上和剑架上的东西估价 +8%', descEn: 'When you sleep, everything on the anvil and rack gains 8% value' },
  { id: 'mo', ch: '磨', name: '磨刀石', en: 'Whetstone', desc: '“无变化”时 35% 几率改成成功', descEn: '"No change" has a 35% chance to become a success' },
  { id: 'shu', ch: '熟', name: '钱庄熟人', en: 'Friend at the Bank', desc: '每次还款，返还 15%', descEn: 'Get 15% back every time you repay' },
  { id: 'pu', ch: '谱', name: '名剑谱', en: 'Famous Blades', desc: '+10 及以上的东西，卖价 ×1.6', descEn: 'Items at +10 or higher sell for ×1.6' },
  { id: 'hao', ch: '号', name: '打铁号子', en: 'Work Song', desc: '每天第一锤必定成功', descEn: 'The first strike each day always succeeds' },
  { id: 'chun', ch: '纯', name: '炉火纯青', en: 'Perfect Fire', desc: '+15 以后，每级估价再多涨 15%', descEn: 'After +15, each level adds 15% more value', mod: (m) => { m.lateGrowth += 0.15; } },
  { id: 'jin', ch: '算', name: '金算盘', en: 'Golden Abacus', desc: '每次还完款，剩下的金子生 10% 利息', descEn: 'After each repayment, leftover gold earns 10% interest' },
  { id: 'zhuang', ch: '庄', name: '坐庄', en: 'Market Maker', desc: '剑价波动翻倍，利好利空消息更常见', descEn: 'Price swings doubled, news more often' },
  { id: 'xin', ch: '信', name: '内幕消息', en: 'Insider Tip', desc: '提前知道明天是高开还是低开', descEn: 'Know whether tomorrow opens up or down' },
  { id: 'chi', ch: '痴', name: '剑痴', en: 'Collector', desc: '剑架上每放一件，成功率 +1.5%', descEn: 'Each item on the rack gives +1.5% success' },
  { id: 'tun', ch: '吞', name: '饕餮', en: 'Glutton', desc: '熔炼的效果翻倍', descEn: 'Smelting is twice as strong' },
  { id: 'huo2', ch: '货', name: '货郎', en: 'Peddler', desc: '杂货铺每天多上一件货，东西便宜 20%', descEn: 'One extra item in the store each day, everything 20% cheaper' },
];
const RMAP = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// 道具 (items): bought at the general store (stock changes daily) or dropped by big wins
const ITEMS = [
  { id: 'bao', ch: '包', name: '肉包子', en: 'Meat Bun', desc: '体力 +6', descEn: '+6 stamina', price: 0.05 },
  { id: 'shen', ch: '参', name: '老山参', en: 'Wild Ginseng', desc: '体力回满', descEn: 'Full stamina', price: 0.16 },
  { id: 'hu', ch: '护', name: '护剑符', en: 'Ward', desc: '下一锤不会碎（碎裂变成受损）。吃几张管几锤', descEn: "The next strike can't break (break becomes damage). Stacks: one per strike", price: 0.22 },
  { id: 'zhu', ch: '祝', name: '祝福油', en: 'Blessing Oil', desc: '下一锤成功率 +25%。用几瓶管几锤', descEn: 'Next strike +25% success. Stacks: one per strike', price: 0.14 },
  { id: 'tian', ch: '天', name: '天工锤', en: 'Heaven Hammer', desc: '下一锤必定成功。用 7 个就管接下来 7 锤', descEn: 'The next strike always succeeds. Use 7 and the next 7 strikes all succeed', price: 0.38 },
  { id: 'cui', ch: '淬', name: '淬火水', en: 'Quench Water', desc: '接下来 5 锤碎裂率减半（可以叠加）', descEn: 'Break chance halved for the next 5 strikes (stacks)', price: 0.28 },
  { id: 'bu', ch: '补', name: '补铁膏', en: 'Iron Patch', desc: '砧上的东西直接 +1 级', descEn: 'The item on the anvil gets +1 level', price: 0.3 },
  { id: 'qi', ch: '漆', name: '金漆', en: 'Gold Lacquer', desc: '砧上的东西估价 ×1.5（每件只能刷一次）', descEn: 'The item on the anvil is worth ×1.5 (once per item)', price: 0.32 },
  { id: 'ya', ch: '牙', name: '牙行帖', en: "Broker's Note", desc: '下一次卖东西多卖 40%', descEn: 'The next sale earns 40% more', price: 0.18 },
  { id: 'xia', ch: '匣', name: '剑匣', en: 'Sword Case', desc: '剑架多一格（这一局有效）', descEn: 'One more rack slot (this run)', price: 0.45 },
  { id: 'li', ch: '历', name: '黄历', en: 'Almanac', desc: '明天开盘至少 ×1.40', descEn: 'Tomorrow opens at ×1.40 or higher', price: 0.3 },
  { id: 'rong', ch: '焰', name: '三昧真火', en: 'Samadhi Fire', desc: '下一次熔剑一定成功。用几个管几次', descEn: 'The next smelt always succeeds. Stacks: one per smelt', price: 0.2 },
  { id: 'hui', ch: '悔', name: '后悔药', en: 'Regret Pill', desc: '把刚碎掉的东西原样找回来（要在下一锤之前吃）', descEn: 'Bring back the item that just broke, exactly as it was (before your next strike)', price: 0.6 },
];
const IMAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const UPGS = [
  { id: 'hands', name: '起早贪黑', en: 'Early Riser', desc: '体力上限 +2', descEn: 'Max stamina +2', max: 5, cost: (l) => Math.round(25 * Math.pow(2, l)) },
  { id: 'craft', name: '祖传手艺', en: 'Family Craft', desc: '成功率 +1.5%', descEn: 'Success +1.5%', max: 6, cost: (l) => Math.round(30 * Math.pow(1.9, l)) },
  { id: 'bank', name: '钱庄关系', en: 'Bank Connections', desc: '欠款 -4%', descEn: 'Debt -4%', max: 5, cost: (l) => Math.round(40 * Math.pow(2, l)) },
  { id: 'rack', name: '大剑架', en: 'Bigger Rack', desc: '剑架多一格', descEn: 'One more rack slot', max: 3, cost: (l) => Math.round(50 * Math.pow(2.2, l)) },
  { id: 'eye', name: '识货', en: 'Good Eye', desc: '挑秘籍时多一个选项', descEn: 'One more choice when picking a seal', max: 1, cost: () => 150 },
  { id: 'luck', name: '好料运', en: 'Lucky Finds', desc: '稀有和传说兵器出现率提高', descEn: 'Rare weapons show up more often', max: 3, cost: (l) => Math.round(80 * Math.pow(2.5, l)) },
  { id: 'charm', name: '祖传护身符', en: 'Heirloom Charm', desc: '每局开张自带「护身符」', descEn: 'Start every run with the Charm seal', max: 1, cost: () => 300 },
];
// 集市: opens after every repaid period. Prices are a share of the next debt, so surplus gold always has somewhere to go.
// The loan is the only leverage in the game and is deliberately small: borrow 50% of the next debt, pay back 65% with it.
const OFFERS = [
  { id: 'seal', ch: '籍', name: '多一本秘籍', en: 'An extra seal', price: 0.8 },
  { id: 'mat', ch: '料', name: '换好料', en: 'Better material', price: 1.0, desc: '这一局之后的新胚子换成「@」', descEn: 'New blanks this run use @' },
  { id: 'stam', ch: '力', name: '练力气', en: 'Strength training', price: 0.45, desc: '这一局体力上限 +3', descEn: 'Max stamina +3 this run' },
  { id: 'succ', ch: '师', name: '拜师学艺', en: 'Apprenticeship', price: 0.6, desc: '这一局成功率 +3%', descEn: 'Success +3% this run' },
  { id: 'slot', ch: '架', name: '扩建剑架', en: 'Rack extension', price: 0.35, desc: '剑架 +1 格', descEn: '+1 rack slot' },
  { id: 'pack', ch: '包', name: '道具礼包', en: 'Item bundle', price: 0.35, desc: '随机 3 件道具', descEn: '3 random items' },
  { id: 'fire', ch: '火', name: '火种', en: 'Kindling', price: 0.25, desc: '火候 +6 格', descEn: 'Fire meter +6' },
  { id: 'luck', ch: '签', name: '上上签', en: 'Lucky draw', price: 0.5, desc: '这一局稀有兵器更容易出', descEn: 'Rare weapons show up more often this run' },
];
// leverage: borrow a share of the next debt; bigger loans carry higher interest. One loan per bazaar.
const LOANS = [{ x: 0.5, rate: 0.3, name: '小额借款', en: 'Small loan' }, { x: 1, rate: 0.45, name: '大额借款', en: 'Big loan' }, { x: 2, rate: 0.7, name: '高利贷', en: 'Loan shark' }];
const NEWS_UP = [['城里来了个大主顾，见剑就收', 'A big buyer is in town, buying every blade'], ['武林大会要开了，兵器抢手', 'The tournament is coming, weapons are hot'], ['镖局大批采购', 'The escort agency is buying in bulk'], ['隔壁铁匠铺失火了，货都涨价', 'The smithy next door burned down'], ['有人说你家的东西能辟邪', 'Word is your work wards off evil']];
const NEWS_DOWN = [['官府查禁私铸', 'The magistrate banned private forging'], ['有人在城门口甩卖库存', 'Someone is dumping stock at the city gate'], ['传言兵器要加税', 'Rumor of a weapons tax'], ['江湖太平了，没人买剑', 'Peace broke out, nobody needs blades'], ['对门新开了一家铁匠铺', 'A new smithy opened across the street']];

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const META_DEFAULT = { fame: 0, totalFame: 0, upg: {}, mats: ['iron'], mat: 'iron', runs: 0, best: { period: 0, level: 0, sale: 0 }, codex: {}, forged: {}, seenHelp: false, tutDone: false, asked: false, diff: 'easy', muted: false, vibe: true, lang: null };
let meta = Object.assign({}, META_DEFAULT, DEMO ? {} : store.get('ycmm-v0.12-meta', {}));
if (!meta.codex) meta.codex = {};
if (!meta.forged) meta.forged = {};
for (const k of Object.keys(meta.codex)) if (!WP[k]) delete meta.codex[k];
if (meta.vibe === undefined) meta.vibe = true;
{ const nl = (navigator.language || 'zh').toLowerCase(); const two = nl.slice(0, 2); LANG = meta.lang || (/^zh-(tw|hk|mo|hant)/.test(nl) ? 'zht' : two === 'zh' ? 'zh' : I18N[two] ? two : 'en'); }
{ const q = new URLSearchParams(location.search).get('lang'); if (LANGS.some(([k]) => k === q)) LANG = q; }
if (!['zh', 'zht', 'en'].includes(LANG) && !(I18N[LANG] && I18N[LANG].t)) LANG = 'en';
let run = DEMO ? null : store.get('ycmm-v0.12-run', null);
if (run && run.v !== SAVE_V) run = null;
if (run) { run.boost = run.boost || { stam: 0, succ: 0, luck: 0 }; run.loan = run.loan || 0; run.fire = run.fire || 0; run.fever = run.fever || 0; }
const saveMeta = () => { if (!DEMO) store.set('ycmm-v0.12-meta', meta); };
const saveRun = () => { if (!DEMO && run) store.set('ycmm-v0.12-run', run); };

// ---------- rules ----------
const has = (id) => !!run && run.relics.includes(id);
const ulv = (id) => meta.upg[id] || 0;
const codexN = () => Object.keys(meta.codex).length;
const gradesDone = () => RARITY.map((_, r) => WEAPONS.filter((w) => w.rar === r).every((w) => meta.codex[w.id] !== undefined));
function mods() {
  const cn = codexN(), gd = gradesDone();
  const m = { breakMul: 1, breakAdd: 0, greatAdd: gd[3] ? 0.02 : 0, succAdd: ulv('craft') * 0.015 + (cn >= 10 ? 0.02 : 0) + (gd[1] ? 0.01 : 0), growthAdd: 0, lateGrowth: 0,
    stamAdd: ulv('hands') * 2 + (cn >= 5 ? 2 : 0) + (gd[0] ? 1 : 0), sellMul: (cn >= 15 ? 1.1 : 1) * (gd[2] ? 1.05 : 1), quotaMul: Math.pow(0.96, ulv('bank')), startLevel: (cn >= 20 ? 2 : 0) + (gd[4] ? 1 : 0), greatStep: 2 };
  if (run) {
    for (const id of run.relics) if (RMAP[id] && RMAP[id].mod) RMAP[id].mod(m);
    if (has('chi')) m.succAdd += 0.015 * run.rack.length;
    if (run.boost) { m.stamAdd += run.boost.stam; m.succAdd += run.boost.succ; }
  }
  return m;
}
function odds(s, withBuffs = true) {
  const m = mods(), L = s.level, w = s.shape, b = withBuffs && run ? run.buffs : {};
  let brk = L <= 3 ? 0 : Math.min(dif().brkCap, (L - 3) * dif().brk) * m.breakMul + m.breakAdd;
  if (w === 'guo') brk *= 0.7;
  if (L > 3 && w === 'jiguang') brk += 0.02;
  if (L > 3 && w === 'jianpan') brk += 0.03;
  if (w === 'ganmian' && L < 12) brk = 0;
  let dmg = Math.min(0.25, 0.10 + L * 0.008); if (w === 'caidao') dmg = Math.max(0.02, dmg - 0.04);
  let keep = 0.18;
  let great = Math.max(0.04, 0.20 - L * 0.008) + m.greatAdd + (w === 'tuoxie' ? 0.08 : 0) + (w === 'jita' && run ? Math.min(0.3, 0.03 * run.streak) : 0);
  const sk = Math.min(keep, m.succAdd); keep -= sk;
  if (b.cui > 0) { keep += brk / 2; brk /= 2; }
  if (b.zhu) { let need = 0.25; const t1 = Math.min(brk, need); brk -= t1; need -= t1; const t2 = Math.min(dmg, need); dmg -= t2; need -= t2; keep -= Math.min(keep, need); }
  if (b.hu) { dmg += brk; brk = 0; }
  if (run && run.fever > 0) { if (run.fever > 1) { keep += brk + dmg; brk = dmg = 0; } const add = Math.min(FEVER_GREAT, keep); keep -= add; great += add; }
  let succ = 1 - brk - dmg - keep - great;
  if (succ < 0.03) { const tot = brk + dmg + keep + great, k = 0.97 / tot; brk *= k; dmg *= k; keep *= k; great *= k; succ = 0.03; }
  if (run && run.forceGreat) return { brk: 0, dmg: 0, keep: 0, succ: 0, great: 1 };
  if (b.tian) { succ = 1 - great; brk = dmg = keep = 0; }
  return { brk, dmg, keep, succ, great };
}
const stepUp = (s) => mods().greatStep + (s.shape === 'jingu' ? 1 : 0);
function value(s) {
  const m = mods(), wp = WP[s.shape], g = 1.6 + m.growthAdd + (wp.g || 0);
  let v = MAT[s.mat].base * (wp.bm || 1) * RARITY[wp.rar].bm * Math.pow(g, s.level);
  if (m.lateGrowth && s.level > 15) v *= Math.pow((g + m.lateGrowth) / g, s.level - 15);
  if (s.shape === 'tanghulu') v *= Math.pow(1.3, Math.floor(s.level / 5));
  return v * s.mul;
}
const mkNow = () => (has('ke') ? Math.max(1, run.mk.now) : run.mk.now);
function priceOf(s, withTicket = true) {
  if (!s || s.level < 1) return 0;
  let p = value(s) * mkNow() * mods().sellMul;
  if (has('pu') && s.level >= 10) p *= 1.6;
  if (s.shape === 'suanpan') p *= 1.3; if (s.shape === 'qian') p *= 1.6;
  if (s.shape === 'san' && run.mk.now < run.mk.prevClose) p *= 1.4;
  if (withTicket && run.buffs.ya) p *= 1.4;
  return p;
}
const maxStam = () => 18 + mods().stamAdd;
const rackCap = () => 3 + ulv('rack') + (run ? run.extraSlots : 0);
// two difficulties, picked when a run starts. Hard: debt starts at 1000 and grows ×5 a period, breaks come sooner, loans cost more, fame ×1.5.
// tuned with tools/sim-balance.js: the autopilot (no items, loans or bazaar) goes broke before period 5 in roughly a third of hard runs.
const DIFF = { easy: { base: 50, growth: 2.5, brk: 0.015, brkCap: 0.45, loanMul: 1, fame: 1 }, hard: { base: 1000, growth: 5, brk: 0.02, brkCap: 0.5, loanMul: 1.5, fame: 1.5, sellCap: 0 } }; // sellCap: max sales a day (0 = no limit). Simulated in v0.12: a cap of 3-5 did not make hard harder, so it is off
const dif = () => DIFF[(run && run.diff) || 'easy'] || DIFF.easy;
const diffName = (d) => (d === 'hard' ? T('困难', 'Hard') : T('新手', 'Easy'));
const loanRate = (ln) => ln.rate * dif().loanMul;
// hard only: buyers are limited, so only a few sales a day (the collector's seizures don't count)
const sellCap = () => dif().sellCap || 0;
const salesLeft = () => (sellCap() ? Math.max(0, sellCap() - (run.soldToday || 0)) : Infinity);
function canSell() { if (salesLeft() > 0) return true; toast(T('今天的买家走光了（每天最多卖 ' + sellCap() + ' 件），明天再来', 'No more buyers today (max ' + sellCap() + ' sales a day). Come back tomorrow')); return false; }
const baseQuota = (n = run.period) => Math.round(dif().base * Math.pow(dif().growth, n - 1) * mods().quotaMul);
const quota = () => baseQuota() + Math.round(run.loan || 0); // what the collector takes this period, loan included
const itemPrice = (id) => Math.max(5, Math.round(baseQuota() * IMAP[id].price * (has('huo2') ? 0.8 : 1)));

// market: price ticks every strike, closes when you sleep, gaps at the next open
function newMarket() {
  const mk = { now: 1, open: 1, hi: 1, lo: 1, prevClose: 1, candles: [], ticks: [1], gap: 1, news: '', li: false };
  let p = clamp(1 + gauss() * 0.1, 0.7, 1.3);
  for (let i = 0; i < 8; i++) { const o = p, c = clamp(o * Math.exp(gauss() * 0.12), 0.55, 1.8); mk.candles.push({ o, c, h: Math.max(o, c) * (1 + R() * 0.06), l: Math.min(o, c) * (1 - R() * 0.06) }); p = c * Math.exp(gauss() * 0.05); }
  mk.prevClose = mk.candles[mk.candles.length - 1].c; mk.now = mk.open = mk.hi = mk.lo = clamp(mk.prevClose * Math.exp(gauss() * 0.05), 0.6, 1.6); mk.ticks = [mk.now];
  return mk;
}
const nextGap = () => Math.exp(gauss() * 0.13 * (has('zhuang') ? 2 : 1) + (R() < 0.07 ? 0.4 : 0));
const newsText = (n) => (!n ? '' : typeof n === 'string' ? n : (n.up ? T('利好：', 'Good news: ') : T('利空：', 'Bad news: ')) + T(...(n.up ? NEWS_UP : NEWS_DOWN)[n.i]));
function tickMarket() {
  const mk = run.mk, vol = 0.035 * (has('zhuang') ? 2 : 1);
  let x = Math.log(mk.now);
  x += gauss() * vol - x * 0.015 - (x - Math.log(mk.open)) * 0.04;
  if (R() < (has('zhuang') ? 0.05 : 0.025)) {
    const up = R() < 0.5, j = 0.12 + R() * 0.13; x += up ? j : -j;
    mk.news = { up, i: Math.floor(R() * (up ? NEWS_UP : NEWS_DOWN).length) }; const nw = mk.news;
    addLog(() => newsText(nw) + (up ? T('，剑价拉升 ', ', prices jump ') : T('，剑价下挫 ', ', prices drop ')) + pct(Math.exp(j) - 1), up ? 'b' : 's');
    toast(newsText(nw));
  }
  mk.now = clamp(Math.exp(x), 0.35, 4); mk.hi = Math.max(mk.hi, mk.now); mk.lo = Math.min(mk.lo, mk.now);
  mk.ticks.push(mk.now); if (mk.ticks.length > 60) mk.ticks.shift();
}
function closeMarket() {
  const mk = run.mk;
  mk.candles.push({ o: mk.open, h: mk.hi, l: mk.lo, c: mk.now }); if (mk.candles.length > 9) mk.candles.shift();
  mk.prevClose = mk.now;
  let open = mk.now * mk.gap * Math.exp(-Math.log(mk.now) * 0.2);
  if (mk.li) open = Math.max(open, 1.4);
  mk.open = mk.now = mk.hi = mk.lo = clamp(open, 0.35, 4); mk.ticks = [mk.now]; mk.gap = nextGap(); mk.news = ''; mk.li = false;
}
function rarityWeights() { const lk = ulv('luck') + (run && run.boost ? run.boost.luck : 0); return RARITY.map((r, i) => Math.max(0.02, r.w + lk * [-0.06, 0.02, 0.02, 0.015, 0.005][i])); }
function rollShape() {
  const w = rarityWeights(); let x = R() * w.reduce((a, b) => a + b, 0), r = 0;
  while (r < 4 && (x -= w[r]) > 0) r++;
  return pick(WEAPONS.filter((s) => s.rar === r)).id;
}
function makeSword(shape) {
  const ni = Math.floor(R() * NAMES.length);
  const s = { mat: run.mat, shape: shape || rollShape(), level: mods().startLevel, mul: 1, gilded: false, name: NAMES[ni], ni };
  meta.forged[s.shape] = (meta.forged[s.shape] || 0) + 1; noteCodex(s); return s;
}
function noteCodex(s) {
  const was = meta.codex[s.shape];
  if (was === undefined) { meta.codex[s.shape] = s.level; saveMeta(); if (run) { addLog(() => T('图鉴新收录：', 'New in the codex: ') + N(WP[s.shape]) + ' (' + N(RARITY[WP[s.shape].rar]) + ')', 'g'); checkMiles(); } }
  else if (s.level > was) { meta.codex[s.shape] = s.level; saveMeta(); }
}
let milesSeen = null, gradesSeen = null;
function checkMiles() {
  const n = codexN(); if (milesSeen === null) milesSeen = n; for (const ml of MILES) if (n >= ml.n && milesSeen < ml.n) toast(T('图鉴收集 ' + ml.n + ' 种：', 'Codex ' + ml.n + ' collected: ') + D(ml)); milesSeen = n;
  const gd = gradesDone(); if (gradesSeen) gd.forEach((d, i) => { if (d && !gradesSeen[i]) toast(T('集齐' + RARITY[i].key + '色' + RARITY[i].name + '：', 'All ' + RARITY[i].keyEn + ' collected: ') + GB(i)); }); gradesSeen = gd;
}
function newBlank() {
  run.sword = makeSword(); run.streak = 0; fx.born = performance.now();
  const r = WP[run.sword.shape].rar; if (r >= 2) setTimeout(() => fx.reveal(r, N(WP[run.sword.shape])), 380);
}
function restock() { const n = 3 + (has('huo2') ? 1 : 0); run.stock = shuffle(ITEMS.map((i) => i.id)).slice(0, n).map((id) => ({ id, sold: false })); }
function newRun(mat, diff = 'easy') {
  run = { v: SAVE_V, mat, diff, period: 1, day: 1, gold: 0, relics: [], stam: 0, streak: 0, forceGreat: false, firstOfDay: true, charmUsed: false,
    rack: [], extraSlots: 0, bag: { bao: 1 }, buffs: {}, stock: [], mk: null, fire: 0, fever: 0, boost: { stam: 0, succ: 0, luck: 0 }, loan: 0,
    stats: { strikes: 0, breaks: 0, sold: 0, maxSale: 0, maxLevel: 0 }, log: [] };
  if (ulv('charm')) run.relics.push('fu');
  run.mk = newMarket(); run.mk.gap = nextGap();
  newBlank(); run.stam = maxStam(); restock();
  meta.runs++; saveMeta();
  addLog(() => T('开张了。钱庄说：三天后来收 ', 'Open for business. The bank will collect ') + fmt(quota()) + T('。', ' in three days.'));
  saveRun();
}
const addItem = (id, n = 1) => { run.bag[id] = (run.bag[id] || 0) + n; };
function dropItem(why) { const w = typeof why === 'function' ? why : () => why, id = pick(ITEMS.filter((i) => i.id !== 'xia').map((i) => i.id)); addItem(id); addLog(() => w() + T('，捡到「', ': found ') + N(IMAP[id]) + T('」', ''), 'c'); fx.pop2(T('捡到「' + N(IMAP[id]) + '」', 'Found: ' + N(IMAP[id])), '#F2C14E'); }
const wname = (s) => formName(s.shape, s.level) + T('「' + sname(s) + '」', ' "' + sname(s) + '"');

// ---------- actions ----------
let lastStrike = 0;
function strike() {
  if (!run || modalOpen()) return;
  if (run.stam <= 0 && !(run.fever > 0)) { toast(run.bag.bao || run.bag.shen ? T('没力气了。背包里有吃的，或者睡一觉', 'Out of stamina. Eat something from the bag, or sleep') : T('没力气了，睡一觉明天再打', 'Out of stamina. Sleep and try tomorrow')); return; }
  const now = performance.now(); if (now - lastStrike < 140) return; lastStrike = now;
  ensureAudio();
  run.lastBroken = null;
  const feverStrike = run.fever > 0, lastFever = run.fever === 1;
  const s = run.sword, L = s.level, o = odds(s), b = run.buffs; // odds first: the fever counter must still count this strike
  if (feverStrike) run.fever--; else run.stam--;
  run.stats.strikes++;
  const cum = [o.brk, o.brk + o.dmg, o.brk + o.dmg + o.keep, o.brk + o.dmg + o.keep + o.succ, 1];
  const seg = { brk: 0, dmg: 1, keep: 2, succ: 3, great: 4 };
  let r, roll;
  if (run.forceGreat) { r = 'great'; run.forceGreat = false; }
  else if (has('hao') && run.firstOfDay) r = R() < o.great / (o.great + o.succ) ? 'great' : 'succ';
  else { roll = R(); r = roll < cum[0] ? 'brk' : roll < cum[1] ? 'dmg' : roll < cum[2] ? 'keep' : roll < cum[3] ? 'succ' : 'great'; }
  if (roll === undefined) { const i = seg[r], a = i ? cum[i - 1] : 0; roll = a + (cum[i] - a) * (0.2 + 0.6 * R()); }
  const nearBreak = o.brk > 0 && r !== 'brk' && roll - o.brk < 0.03;
  run.firstOfDay = false;
  if (b.cui > 0) b.cui--;
  for (const k of ['zhu', 'tian', 'hu']) if (b[k]) { b[k] = (b[k] === true ? 1 : b[k]) - 1; if (b[k] <= 0) delete b[k]; } // one charge per strike
  const raw = r; let note = '';
  if (r === 'keep' && has('mo') && R() < 0.35) { r = 'succ'; note = () => T('磨刀石：改成成功', 'Whetstone: turned into a success'); }
  if (r === 'brk' && s.shape === 'yu' && R() < 0.3) { r = 'great'; note = () => T('咸鱼翻身！', 'Fish flip!'); }
  if (r === 'brk' && has('fu') && !run.charmUsed) { r = 'dmg'; run.charmUsed = true; note = () => T('护身符替你挡了一次碎裂', 'The Charm stopped a break'); }
  if (r === 'dmg' && s.shape === 'maton' && R() < 0.3) { r = 'succ'; note = () => T('吸回来了！', 'Sucked back!'); }
  if (s.shape === 'jitui' && !feverStrike && R() < 0.4) { run.stam++; note = note || (() => T('啃了口鸡腿，没花体力', 'Took a bite, no stamina spent')); }
  let delta = 0;
  if (r === 'succ') { delta = 1; if (s.shape === 'dianzuan' && R() < 0.15) { delta = 2; note = note || (() => T('电钻连钻两下！', 'Double drill!')); } run.streak++; }
  else if (r === 'great') { delta = stepUp(s); run.streak++; }
  else if (r === 'keep') run.streak = 0;
  else if (r === 'dmg') {
    run.streak = 0;
    if (s.shape === 'cong' && R() < 0.5) note = note || (() => T('大葱很韧：没掉级', 'Tough leek: kept the level')); else delta = L > 0 ? -1 : 0;
    if (has('gu')) { run.stam++; note = note || (() => T('反骨：返还 1 点体力', 'Contrarian: +1 stamina back')); }
  } else if (r === 'brk') {
    run.streak = 0; run.stats.breaks++;
    if (has('lu')) { const g = value(s) * 0.4; run.gold += g; note = () => T('回炉：拿回 ', 'Recycler: got back ') + fmt(g); }
  }
  if (has('lian') && run.streak >= 3 && (r === 'succ' || r === 'great')) { run.forceGreat = true; note = note || (() => T('连击谱：下一锤必定大成功', 'Combo Manual: next strike is a great success')); }
  const oldTier = tierOf(L).idx, nm = wname(s), streakNow = run.streak;
  if (has('lian') && run.forceGreat && run.streak >= 3) run.streak = 0;
  if (r === 'brk') { fx.ghost = { ...s }; run.lastBroken = { ...s }; newBlank(); fx.born = performance.now() + 450; }
  else { s.level = Math.max(0, L + delta); noteCodex(s); }
  run.stats.maxLevel = Math.max(run.stats.maxLevel, run.sword.level);
  const after = run.sword.level, tierUp = r !== 'brk' && tierOf(after).idx > oldTier;
  const msgOf = () => ({ succ: [T('成功 +' + L + ' → +' + after, 'Success +' + L + ' → +' + after), 's'], great: [T('大成功！+' + L + ' → +' + after, 'Great! +' + L + ' → +' + after), 'g'], keep: [T('无变化，还是 +' + L, 'No change, still +' + L), ''], dmg: [T('受损 +' + L + ' → +' + after, 'Damaged +' + L + ' → +' + after), 'd'], brk: [T('碎了！+' + L + ' 的' + wname(s) + '没了', 'Shattered! The +' + L + ' ' + wname(s) + ' is gone'), 'b'] })[r];
  addLog(() => msgOf()[0], msgOf()[1]); if (note) addLog(note, 'c');
  if (nearBreak) addLog(() => T('好险！差 ' + pct(roll - o.brk) + ' 就碎了', 'Close call! ' + pct(roll - o.brk) + ' from breaking'), 'd');
  if (r === 'great' && R() < 0.12) dropItem(() => T('大成功的火星里', 'In the sparks'));
  const evolved = r !== 'brk' && stageOf(after) > stageOf(L);
  if (evolved) addLog(() => T('形态进化！' + FORMS[s.shape][stageOf(L)][0] + ' → ' + FORMS[s.shape][stageOf(after)][0], 'Evolution! ' + FORMS[s.shape][stageOf(L)][1] + ' → ' + FORMS[s.shape][stageOf(after)][1]), 'g');
  let feverStart = false;
  if (!feverStrike) {
    run.fire = clamp((run.fire || 0) + ({ succ: 1, great: 2, keep: 0, dmg: -2 }[r] ?? -99), 0, FIRE_MAX);
    if (run.fire >= FIRE_MAX) { run.fire = 0; run.fever = FEVER_LEN; feverStart = true; addLog(() => T('火候满了，上头时刻！接下来 ' + FEVER_LEN + ' 锤不花体力、不会碎', 'The fire is roaring: FEVER! Next ' + FEVER_LEN + ' strikes cost nothing and never break'), 'g'); }
  } else if (!run.fever) addLog(() => T('上头时刻结束，冷静下来了', 'Fever over, cooling down'));
  tickMarket();
  if (run.fever === 1) addLog(() => T('注意：上头时刻只剩最后一锤，这一锤会碎！', 'Careful: one fever strike left, and it CAN break!'), 'd');
  fx.strike({ r, raw, delta, roll, seg: seg[raw], nearBreak, tierUp, note, level: after, streak: streakNow, feverStart, feverEnd: feverStrike && !run.fever, lastWarn: run.fever === 1, lastFever, evolved, broke: r === 'brk' && !!run.bag.hui });
  sfx('hit');
  render(); saveRun();
}
function sellSword(s, where) {
  const p = priceOf(s), rack = !!where; delete run.buffs.ya;
  run.gold += p; run.stats.sold++; run.soldToday = (run.soldToday || 0) + 1; run.stats.maxSale = Math.max(run.stats.maxSale, p);
  addLog(() => T('卖出' + (rack ? '剑架上的' : '') + ' +' + s.level + ' ' + N(WP[s.shape]) + '，得 ', 'Sold +' + s.level + ' ' + N(WP[s.shape]) + (rack ? ' from the rack' : '') + ' for ') + fmt(p) + T('（现价 ×', ' (price ×') + run.mk.now.toFixed(2) + T('）', ')'), 'c');
  if (s.level >= 20) { dropItem(() => T('大主顾打赏', 'A big tip')); dropItem(() => T('大主顾打赏', 'A big tip')); } else if (s.level >= 10) dropItem(() => T('主顾打赏', 'A tip'));
  fx.sold(p, s.level >= 15); sfx('coin'); vib(25);
  return p;
}
function sell() {
  if (!run || modalOpen()) return;
  if (run.sword.level < 1) { toast(T('至少打到 +1 才有人收', 'Nobody buys a blank. Get it to +1 first')); return; }
  if (!canSell()) return;
  ensureAudio(); sellSword(run.sword, false); newBlank(); render(); saveRun();
}
function storeSword() {
  if (!run || modalOpen()) return;
  if (run.sword.level < 1) { toast(T('胚子不用上架，打到 +1 再说', 'Blanks stay on the anvil. Get it to +1 first')); return; }
  if (run.rack.length >= rackCap()) { toast(T('剑架满了。卖掉或者熔掉一件再放', 'The rack is full. Sell or smelt something first')); setTab('rack'); return; }
  ensureAudio(); run.rack.push(run.sword); addLog(() => T('把 +' + run.sword.level + ' ' + N(WP[run.sword.shape]) + ' 挂上剑架', 'Hung the +' + run.sword.level + ' ' + N(WP[run.sword.shape]) + ' on the rack'));
  sfx('keep'); newBlank(); render(); saveRun();
}
// smelting can fail: the rack item melts away, the anvil item is untouched. Samadhi Fire makes it sure.
const smeltFail = (s) => (+run.buffs.rong > 0 ? 0 : Math.min(0.6, 0.15 + 0.02 * s.level));
function feedMul(s) { return 1 + 0.05 * s.level * (s.shape === run.sword.shape ? 2 : 1) * (has('tun') ? 2 : 1); }
function rackAction(i) {
  const s = run.rack[i]; if (!s) return;
  const anvil = run.sword, fm = feedMul(s), wp = WP[s.shape], sf = smeltFail(s);
  openSheet(`<h2>${wname(s)} +${s.level}</h2><canvas class="big-sword" id="bigSword"></canvas>
    <p>${N(MAT[s.mat])} · <span style="color:${RARITY[wp.rar].color}">${N(RARITY[wp.rar])}</span> · ${D(wp)}</p>
    ${linesHtml([[T('估价', 'Value'), fmt(value(s))], [T('按现价能卖', 'Sells now for'), fmt(priceOf(s))]])}
    <div class="btns">
      <button class="btn" id="rSell" type="button">${T('卖掉', 'Sell')} · ${fmt(priceOf(s))}</button>
      <button class="btn ghost" id="rTake" type="button">${anvil.level >= 1 ? T('和砧上的换一换', 'Swap with the anvil') : T('拿下来接着打', 'Put it back on the anvil')}</button>
      <button class="btn ghost" id="rFeed" type="button">${T('熔进砧上那件', 'Smelt into the anvil item')} · ${T('估价', 'value')} ×${fm.toFixed(2)} · ${sf ? `<b style="color:var(--o-brk);white-space:nowrap">${T('失败率 ', 'fail ') + pct(sf)}</b>` : `<b style="color:var(--gold)">${T('必成', 'sure')}</b>`}</button>
      <button class="btn ghost" id="rBack" type="button">${T('先放着', 'Leave it')}</button>
    </div>`);
  drawIcon($('#bigSword'), s);
  $('#rSell').onclick = () => { if (!canSell()) return; run.rack.splice(i, 1); sellSword(s, true); closeSheet(); render(); saveRun(); };
  $('#rTake').onclick = () => { if (anvil.level >= 1) run.rack[i] = anvil; else run.rack.splice(i, 1); run.sword = s; fx.born = performance.now(); run.streak = 0; addLog(() => T('把 +' + s.level + ' ' + N(wp) + ' 拿上砧子', 'Put the +' + s.level + ' ' + N(wp) + ' on the anvil')); closeSheet(); render(); saveRun(); };
  $('#rFeed').onclick = () => {
    run.rack.splice(i, 1); if (+run.buffs.rong > 0) run.buffs.rong--;
    if (R() < sf) {
      fx.pop(T('熔炸了', 'Melted away'), '#FF4D4D'); sfx('fail'); vib([60, 40, 90]);
      addLog(() => T('熔剑失败：+' + s.level + ' ' + N(wp) + ' 化成了铁水', 'Smelting failed: the +' + s.level + ' ' + N(wp) + ' melted away'), 'b');
    } else {
      run.sword.mul *= fm; fx.feed(); sfx('great'); vib([20, 30, 40]);
      addLog(() => T('大鱼吃小鱼：熔掉 +' + s.level + ' ' + N(wp) + '，砧上那件估价 ×', 'Big fish eats small fish: smelted the +' + s.level + ' ' + N(wp) + ', anvil item value ×') + fm.toFixed(2), 'g');
    }
    closeSheet(); render(); saveRun();
  };
  $('#rBack').onclick = closeSheet;
}
function useItem(id) {
  if (!run.bag[id]) return;
  const it = IMAP[id], s = run.sword, b = run.buffs;
  if (id === 'qi' && s.gilded) { toast(T('这件已经刷过金漆了', 'This one is already lacquered')); return; }
  if ((id === 'bao' || id === 'shen') && run.stam >= maxStam()) { toast(T('体力是满的，先留着', 'Stamina is full, save it')); return; }
  if (id === 'hui' && !run.lastBroken) { toast(T('现在没有刚碎掉的东西，先留着', 'Nothing just broke. Save it for when it does')); return; }
  run.bag[id]--; if (!run.bag[id]) delete run.bag[id];
  if (id === 'bao') run.stam = Math.min(maxStam(), run.stam + 6);
  else if (id === 'shen') run.stam = maxStam();
  else if (id === 'hu') b.hu = (+b.hu || 0) + 1;
  else if (id === 'zhu') b.zhu = (+b.zhu || 0) + 1;
  else if (id === 'tian') b.tian = (+b.tian || 0) + 1;
  else if (id === 'cui') b.cui = (b.cui || 0) + 5;
  else if (id === 'rong') b.rong = (+b.rong || 0) + 1;
  else if (id === 'hui') { run.sword = run.lastBroken; run.lastBroken = null; fx.born = performance.now(); fx.regret(); }
  else if (id === 'bu') { const st0 = stageOf(s.level); s.level++; noteCodex(s); fx.pop('+1', '#8BD06A'); if (stageOf(s.level) > st0) setTimeout(() => fx.evolve(s), 200); }
  else if (id === 'qi') { s.mul *= 1.5; s.gilded = true; fx.pop(T('金漆 ×1.5', 'Lacquer ×1.5'), '#F2C14E'); }
  else if (id === 'ya') b.ya = true;
  else if (id === 'xia') run.extraSlots++;
  else if (id === 'li') run.mk.li = true;
  addLog(() => T('用了「' + N(it) + '」：', 'Used ' + N(it) + ': ') + D(it), 'c'); sfx('succ');
  closeSheet(); render(); saveRun();
}
function itemSheet(id) {
  const it = IMAP[id];
  openSheet(`<h2>${N(it)} ×${run.bag[id]}</h2><p>${D(it)}</p><div class="btns"><button class="btn" id="iUse" type="button">${T('用', 'Use')}</button><button class="btn ghost" id="iBack" type="button">${T('先留着', 'Keep it')}</button></div>`);
  $('#iUse').onclick = () => useItem(id); $('#iBack').onclick = closeSheet;
}
function shopSheet() {
  const rows = run.stock.map((st, k) => { const it = IMAP[st.id], p = itemPrice(st.id);
    return `<div class="shopitem"><span class="chipi">${it.ch}</span><b>${N(it)}</b><button class="btn${st.sold ? ' ghost' : ''}" type="button" data-k="${k}" ${st.sold || run.gold < p ? 'disabled' : ''}>${st.sold ? T('卖完了', 'Sold out') : fmt(p)}</button><span>${D(it)}</span></div>`; }).join('');
  openSheet(`<h2>${T('杂货铺', 'General Store')}</h2><p>${T('每天进的货不一样，价钱跟着欠款涨。你有 ', 'New stock every day; prices follow the debt. You have ')}<b style="color:var(--gold)">${fmt(run.gold)}</b>${T(' 金。', ' gold.')}</p><div class="cards">${rows}</div><div class="btns"><button class="btn ghost" id="sBack" type="button">${T('走了', 'Leave')}</button></div>`);
  $('#sheet').querySelectorAll('[data-k]').forEach((bt) => bt.onclick = () => {
    const st = run.stock[+bt.dataset.k], p = itemPrice(st.id); if (st.sold || run.gold < p) return;
    run.gold -= p; st.sold = true; addItem(st.id); addLog(() => T('买了「' + N(IMAP[st.id]) + '」，花 ', 'Bought ' + N(IMAP[st.id]) + ' for ') + fmt(p), 'c'); sfx('coin'); render(); saveRun(); shopSheet();
  });
  $('#sBack').onclick = closeSheet;
}
let restArmed = -1e9; // time the sleep button was armed for confirmation
function rest() {
  if (!run || modalOpen()) return;
  if (run.stam > 0 && performance.now() - restArmed > 2500) { restArmed = performance.now(); $('#btnRest').textContent = T('还有 ' + run.stam + ' 点体力，确定睡觉？', run.stam + ' stamina left. Sleep anyway?'); setTimeout(render, 2500); return; }
  restArmed = 0; endDay();
}
function endDay() {
  if (has('ye')) { let n = 0; for (const s of [run.sword, ...run.rack]) if (s.level > 0) { s.mul *= 1.08; n++; } if (n) addLog(() => T('夜市：' + n + ' 件东西估价 +8%', 'Night Market: ' + n + ' items gained 8% value'), 'c'); }
  for (const s of run.rack) if (s.shape === 'fagun') { s.mul *= 1.1; addLog(() => T('剑架上的法棍又硬了一点：估价 +10%', 'The baguette on the rack got harder: +10% value'), 'c'); }
  if (run.fever > 0) { run.fever = 0; addLog(() => T('睡了一觉，上头时刻没了', 'Slept it off. Fever is over')); }
  run.lastBroken = null;
  const close = run.mk.now; closeMarket();
  run.day++; run.stam = maxStam(); run.firstOfDay = true; run.soldToday = 0; restock();
  ensureAudio();
  if (run.day > DAYS) { settle(); return; }
  const chg = run.mk.open / close - 1;
  addLog(() => T('第 ' + run.day + ' 天，' + (chg >= 0 ? '高开 ' : '低开 ') + pct(Math.abs(chg)) + '，开盘 ×' + run.mk.open.toFixed(2) + '。杂货铺进了新货', 'Day ' + run.day + ': opened ' + (chg >= 0 ? 'up ' : 'down ') + pct(Math.abs(chg)) + ' at ×' + run.mk.open.toFixed(2) + '. New stock at the store'), chg >= 0 ? 'b' : 's');
  fx.pop(T('第 ' + run.day + ' 天', 'Day ' + run.day), '#F3E9DC'); sfx('day');
  render(); saveRun();
}
function settle() {
  const q = quota(); const lines = [[T('欠款', 'Debt'), fmt(q)], [T('手上的金子', 'Gold on hand'), fmt(run.gold)]];
  if (run.loan) lines.splice(1, 0, [T('其中借款本息', 'Incl. loan + interest'), fmt(run.loan)]);
  if (run.gold < q) {
    const pool = run.rack.map((s) => ({ s, p: priceOf(s, false) })).sort((a, b) => a.p - b.p);
    for (const it of pool) { if (run.gold >= q) break; run.gold += it.p; it.s.taken = true; lines.push([T('剑架上的 +' + it.s.level + ' ' + N(WP[it.s.shape]) + ' 抵债', 'Rack +' + it.s.level + ' ' + N(WP[it.s.shape]) + ' seized'), fmt(it.p)]); }
    run.rack = run.rack.filter((s) => !s.taken);
    if (run.gold < q && run.sword.level >= 1) { const p = priceOf(run.sword, false); run.gold += p; lines.push([T('砧上的 +' + run.sword.level + ' 抵债', 'Anvil +' + run.sword.level + ' seized'), fmt(p)]); newBlank(); }
  }
  if (run.gold >= q) {
    run.gold -= q; run.loan = 0;
    if (has('shu')) { const b = q * 0.15; run.gold += b; lines.push([T('钱庄熟人返还', 'Friend at the Bank'), fmt(b)]); }
    if (has('jin')) { const it = run.gold * 0.1; run.gold += it; lines.push([T('金算盘利息', 'Golden Abacus interest'), fmt(it)]); }
    lines.push([T('还完剩下', 'Left after paying'), fmt(run.gold)]);
    const cleared = run.period;
    run.period++; run.day = 1; run.charmUsed = false; run.stam = maxStam(); run.firstOfDay = true;
    sfx('pay'); vib([30, 40, 30]); saveRun(); render();
    openSheet(`<h2>${T('第 ' + cleared + ' 期 · 还清了', 'Period ' + cleared + ' · Paid off')}</h2><p>${T('钱庄的人点了点钱，走了。下一期要还 ', 'The collector counts the coins and leaves. Next period: ')}<b>${fmt(quota())}</b>${T('。', '.')}</p>${linesHtml(lines)}<div class="btns"><button class="btn" id="mGo" type="button">${T('挑一本秘籍', 'Pick a seal')}</button></div>`);
    $('#mGo').onclick = () => draft(market);
    if (DEMO) setTimeout(() => $('#mGo') && $('#mGo').click(), 1600);
  } else { lines.push([T('还差', 'Short by'), fmt(q - run.gold)]); gameOver(lines); }
}
function draft(after) {
  const pool = shuffle(RELICS.filter((r) => !run.relics.includes(r.id))).slice(0, 3 + ulv('eye'));
  if (!pool.length) { if (after) after(); else closeSheet(); return; }
  openSheet(`<h2>${T('挑一本秘籍', 'Pick a seal')}</h2><p>${T('只能拿一本，整局有效。', 'Take one. It lasts the whole run.')}</p><div class="cards">${pool.map((r) => `<button class="card" type="button" data-id="${r.id}"><span class="seal">${r.ch}</span><b>${N(r)}</b><span>${D(r)}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => {
    run.relics.push(b.dataset.id); addLog(() => T('得到秘籍「' + N(RMAP[b.dataset.id]) + '」', 'Got the seal: ' + N(RMAP[b.dataset.id])), 'c');
    if (b.dataset.id === 'huo2') restock();
    sfx('succ'); render(); saveRun();
    if (after) after(); else closeSheet();
  });
  if (DEMO) setTimeout(() => { const c = $('#sheet .card'); if (c) c.click(); }, 1400);
}
// ---------- 集市 (period market): spend surplus gold between periods ----------
function rollMarket() {
  const pool = OFFERS.filter((o) => (o.id !== 'mat' || nextMat()) && (o.id !== 'seal' || RELICS.some((r) => !run.relics.includes(r.id))));
  const offers = shuffle(pool.slice()).slice(0, 4).map((o) => ({ id: o.id, bought: false, seal: o.id === 'seal' ? pick(RELICS.filter((r) => !run.relics.includes(r.id))).id : null }));
  run.fair = { offers, rerolls: 0, loaned: false };
}
const nextMat = () => { const i = MATS.findIndex((m) => m.id === run.mat); return MATS[i + 1] || null; };
const offerPrice = (o) => Math.round(baseQuota() * OFFERS.find((x) => x.id === o.id).price);
function offerText(o) {
  const d = OFFERS.find((x) => x.id === o.id);
  if (o.id === 'seal') { const r = RMAP[o.seal]; return [T('秘籍「' + N(r) + '」', 'Seal: ' + N(r)), D(r), r.ch]; }
  if (o.id === 'mat') { const m = nextMat(); return [N(d), D(d).replace('@', m ? N(m) : '—'), d.ch]; }
  return [N(d), D(d), d.ch];
}
function market() {
  if (!run.fair) rollMarket();
  const f = run.fair, Q = baseQuota(), reroll = Math.round(Q * 0.1 * Math.pow(1.6, f.rerolls));
  const rows = f.offers.map((o, k) => { const [nm, ds, ch] = offerText(o), p = offerPrice(o);
    return `<div class="offer${o.bought ? ' bought' : ''}"><span class="seal">${ch}</span><b>${nm}</b><button class="btn${o.bought ? ' ghost' : ''}" type="button" data-o="${k}" ${o.bought || run.gold < p ? 'disabled' : ''}>${o.bought ? T('买了', 'Bought') : fmt(p)}</button><span>${ds}</span></div>`; }).join('');
  const loan = LOANS.map((ln, k) => { const amt = Math.round(Q * ln.x), due = Math.round(amt * (1 + loanRate(ln)));
    return `<div class="offer loan${f.loaned ? ' bought' : ''}"><span class="seal">贷</span><b>${T(ln.name, ln.en)} · ${T('利息', 'interest')} ${pct(loanRate(ln))}</b><button class="btn ghost" type="button" data-loan="${k}" ${f.loaned ? 'disabled' : ''}>${T('借 ', 'Borrow ') + fmt(amt)}</button><span>${T('现在拿 ' + fmt(amt) + '，下一期连本带利多还 ' + fmt(due) + '。还不上照样收铺子。', 'Get ' + fmt(amt) + ' now, owe ' + fmt(due) + ' more next period. Miss it and you lose the shop.')}</span></div>`; }).join('') + (f.loaned ? `<p class="foot">${T('这次集市已经借过了，一次只能借一笔。', 'You already took a loan at this bazaar. One per visit.')}</p>` : '');
  openSheet(`<h2>${T('集市', 'Bazaar')}</h2><p>${T('每还清一期开一次集，价钱跟着下一期欠款走。你有 ', 'Opens after every repaid period; prices follow the next debt. You have ')}<b class="gold-now">${fmt(run.gold)}</b></p><div class="cards">${rows}${loan}</div><div class="btns"><button class="btn ghost" id="fRe" type="button" ${run.gold < reroll ? 'disabled' : ''}>${T('换一批货', 'Reroll')} · ${fmt(reroll)}</button><button class="btn" id="fGo" type="button">${T('离开，开始第 ' + run.period + ' 期', 'Leave and start period ' + run.period)}</button></div>`);
  $('#sheet').querySelectorAll('[data-o]').forEach((bt) => bt.onclick = () => buyOffer(+bt.dataset.o));
  $('#sheet').querySelectorAll('[data-loan]').forEach((bt) => bt.onclick = () => { if (f.loaned) return; const ln = LOANS[+bt.dataset.loan], amt = Math.round(Q * ln.x), due = Math.round(amt * (1 + loanRate(ln))); f.loaned = true; run.gold += amt; run.loan += due; addLog(() => T('向钱庄借了 ' + fmt(amt) + '，下期多还 ' + fmt(due), 'Borrowed ' + fmt(amt) + ' from the bank; ' + fmt(due) + ' more due next period'), 'd'); sfx('coin'); saveRun(); render(); market(); });
  $('#fRe').onclick = () => { if (run.gold < reroll) return; run.gold -= reroll; const r2 = f.rerolls + 1; rollMarket(); run.fair.rerolls = r2; run.fair.loaned = f.loaned; sfx('keep'); saveRun(); render(); market(); };
  $('#fGo').onclick = () => { run.fair = null; closeSheet(); render(); saveRun(); };
  if (DEMO) setTimeout(() => $('#fGo') && $('#fGo').click(), 1400);
}
function buyOffer(k) {
  const o = run.fair.offers[k], p = offerPrice(o); if (o.bought || run.gold < p) return;
  run.gold -= p; o.bought = true;
  const b = run.boost;
  if (o.id === 'seal') { run.relics.push(o.seal); if (o.seal === 'huo2') restock(); }
  else if (o.id === 'mat') { const m = nextMat(); if (m) run.mat = m.id; }
  else if (o.id === 'stam') { b.stam += 3; run.stam += 3; }
  else if (o.id === 'succ') b.succ += 0.03;
  else if (o.id === 'slot') run.extraSlots++;
  else if (o.id === 'pack') for (let i = 0; i < 3; i++) addItem(pick(ITEMS.map((x) => x.id)));
  else if (o.id === 'fire') run.fire = Math.min(FIRE_MAX - 1, (run.fire || 0) + 6);
  else if (o.id === 'luck') b.luck += 1;
  addLog(() => T('集市：买了「' + offerText(o)[0] + '」，花 ', 'Bazaar: bought ' + offerText(o)[0] + ' for ') + fmt(p), 'c');
  sfx('pay'); saveRun(); render(); market();
}
function gameOver(lines, retired) {
  const st = run.stats, cleared = run.period - 1, firstEnd = !shopOpen();
  const fame = Math.round((3 * cleared + 0.5 * cleared * cleared + 3 * Math.log10(1 + st.maxSale)) * dif().fame);
  meta.fame += fame; meta.totalFame += fame;
  const b = meta.best, rec = cleared > b.period || st.maxSale > b.sale;
  b.period = Math.max(b.period, cleared); b.level = Math.max(b.level, st.maxLevel); b.sale = Math.max(b.sale, st.maxSale);
  meta.ends = (meta.ends || 0) + 1;
  saveMeta(); store.del('ycmm-v0.12-run'); sfx('fail'); vib([100, 60, 160]);
  const L2 = [[T('撑过', 'Survived'), T(cleared + ' 期', cleared + ' periods')], [T('最高打到', 'Highest level'), '+' + st.maxLevel], [T('单件最高卖价', 'Best single sale'), fmt(st.maxSale)], [T('一共打了', 'Strikes'), T(st.strikes + ' 锤', String(st.strikes))], [T('碎掉', 'Broken'), T(st.breaks + ' 件', String(st.breaks))], [T('图鉴', 'Codex'), codexN() + '/' + WEAPONS.length]];
  run = null;
  openSheet(`<h2>${retired ? T('收摊了', 'Shop closed') : T('铺子被钱庄收走了', 'The bank took your shop')}</h2>${linesHtml(lines)}${linesHtml(L2)}<p>${T('名望', 'Fame')} <b style="color:var(--gold)">+${fame}</b>${rec ? T(' · 新纪录', ' · New record') : ''}${T('，可以去铺子里升级。', '. Spend it on upgrades in the workshop.')}${firstEnd ? `<p class="newshop">${T('铺子开张了！以后在主菜单点「铺子」，用名望买永久升级和新料子。', 'The workshop is open! From the main menu, spend fame on permanent upgrades and new materials.')}</p>` : ''}</p><div class="btns"><button class="btn" id="mAgain" type="button">${T('再开一家', 'Open a new shop')}</button><button class="btn ghost" id="mShop" type="button">${T('去铺子', 'Workshop')}</button></div>`);
  $('#mAgain').onclick = () => { closeSheet(); startRun(); };
  $('#mShop').onclick = () => { closeSheet(); showShop(); };
}
function closeShop() {
  if (!run) return;
  openSheet(`<h2>${T('收摊？', 'Close the shop?')}</h2><p>${T('这一局就到这里。按撑过的期数和最高卖价拿名望，回铺子买永久升级。', 'This run ends here. You get fame for periods survived and your best sale, to spend on permanent upgrades.')}</p><div class="btns"><button class="btn" id="qYes" type="button">${T('收摊', 'Close shop')}</button><button class="btn ghost" id="qNo" type="button">${T('接着打', 'Keep going')}</button></div>`);
  $('#qYes').onclick = () => gameOver([[T('手上的金子', 'Gold on hand'), fmt(run.gold)]], true);
  $('#qNo').onclick = closeSheet;
}
// new run: pick a difficulty (and whether to walk through the tutorial), then a material if more than one is owned
function startRun() {
  if (tutForce) { tutForce = false; return startRun2('easy', true); }
  openSheet(`<h2>${T('这一局怎么打？', 'How hard?')}</h2><div class="cards">
    <button class="card" type="button" data-d="easy"><span class="seal" style="background:#5FD068;color:#120E0C">新</span><b>${T('新手', 'Easy')}</b><span>${T('欠款涨得慢，第一次玩选这个', 'Debt grows slowly. Pick this for your first run')}</span></button>
    <button class="card" type="button" data-d="hard"><span class="seal">难</span><b>${T('困难', 'Hard')}</b><span>${DIFF.hard.sellCap ? T('欠款涨得快，更容易碎，每天最多卖 ' + DIFF.hard.sellCap + ' 件，借钱更贵 · 名望 ×1.5', 'Debt grows fast, breaks come sooner, max ' + DIFF.hard.sellCap + ' sales a day, loans cost more · Fame ×1.5') : T('欠款涨得快，东西更容易碎，借钱利息更高 · 名望 ×1.5', 'Debt grows fast, items break sooner, loans cost more · Fame ×1.5')}</span></button></div>
    <label class="chk"><input type="checkbox" id="dTut" ${meta.tutDone ? '' : 'checked'}> ${T('先走一遍新手教程', 'Walk me through the tutorial first')}</label>
    <div class="btns"><button class="btn ghost" id="dBack" type="button">${T('回去', 'Back')}</button></div>`);
  $('#sheet').querySelectorAll('[data-d]').forEach((b) => b.onclick = () => startRun2(b.dataset.d, $('#dTut').checked));
  $('#dBack').onclick = closeSheet;
}
function startRun2(diff, tut) {
  const owned = MATS.filter((m) => meta.mats.includes(m.id));
  const begin = (id) => { meta.mat = id; meta.diff = diff; saveMeta(); closeSheet(); hideScreens(); newRun(id, diff); setTab('market'); render(); if (tut && !DEMO) startTut(); };
  if (owned.length < 2) return begin('iron');
  openSheet(`<h2>${T('今天打什么料？', 'Which material today?')}</h2><div class="cards">${owned.map((m) => `<button class="card" type="button" data-id="${m.id}"><span class="seal" style="background:${m.color};color:#120E0C">${N(m)[0]}</span><b>${N(m)} · ${T('底价', 'base')} ${m.base}</b><span>${D(m)}</span></button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('.card').forEach((b) => b.onclick = () => begin(b.dataset.id));
}

// ---------- UI ----------
const linesHtml = (ls) => `<div class="lines">${ls.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
const modalOpen = () => !$('#modal').hidden || !$('#titleScreen').hidden || !$('#shopScreen').hidden || !$('#codexScreen').hidden;
// free canvas memory right away (phone webviews cap total canvas memory and kill the page when it runs out)
function freeCanvases(root) { root.querySelectorAll('canvas').forEach((c) => { c.width = 0; c.height = 0; }); }
// only touch the DOM when the markup really changed
function setHTML(el, html) { if (el._html === html) return false; el._html = html; freeCanvases(el); el.innerHTML = html; return true; }
function openSheet(html) { freeCanvases($('#sheet')); $('#sheet').innerHTML = html; $('#modal').hidden = false; const f = $('#sheet button'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { $('#modal').hidden = true; }
function hideScreens() { $('#titleScreen').hidden = true; $('#shopScreen').hidden = true; $('#codexScreen').hidden = true; }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }
// log entries are rendered once per language when they happen, so switching language later shows them translated
function addLog(t, cls = '') {
  if (!run) return;
  const e = typeof t === 'function' ? [inLang('zh', t), inLang('en', t), cls, Object.fromEntries(Object.keys(I18N).map((l) => [l, inLang(l, t)]))] : [t, t, cls];
  run.log.unshift(e); run.log.length = Math.min(run.log.length, 5);
}
const logText = (e) => { const [zh, en] = e.length >= 3 ? e : [e[0], e[0]]; return LANG === 'en' ? en : LANG === 'zht' ? toTrad(zh) : isTbl() ? (e[3] && e[3][LANG]) || trX(en) : zh; };
let tab = 'market';
function setTab(t) { tab = t; document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t)); ['rack', 'bag', 'market', 'seals'].forEach((k) => { $('#pane-' + k).hidden = k !== t; }); if (run) render(); }
document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
// static page text
function applyStatic() {
  document.documentElement.lang = LANG === 'zht' ? 'zh-Hant' : LANG === 'zh' ? 'zh-CN' : LANG === 'pt' ? 'pt-BR' : LANG;
  const rs = document.documentElement.style;
  if (LANG === 'zht') {
    if (!$('#tcfonts')) { const l = document.createElement('link'); l.id = 'tcfonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@700;900&display=swap'; document.head.appendChild(l); }
    rs.setProperty('--sans', '"Noto Sans TC","Noto Sans SC",system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif'); rs.setProperty('--serif', '"Noto Serif TC","Noto Serif SC","Songti TC",serif');
  } else { rs.removeProperty('--sans'); rs.removeProperty('--serif'); }
  document.title = T('一锤子买卖', 'One Hammer Deal');
  const set = (id, zh, en) => { const el = $(id); if (el) el.textContent = T(zh, en); };
  set('#debtLbl', '欠钱庄', 'Debt'); set('#goldLbl', '金', 'Gold'); set('#valLbl', '估价', 'Value');
  set('#strikeLbl', '锤', 'Strike'); set('#sellLbl', '出售', 'Sell'); set('#storeLbl', '上架', 'Rack');
  set('#mLbl', '剑市 · 现价', 'Blade market · now');
  set('#tTag', '打铁 · 赌运气 · 还高利贷', 'Forge · Gamble · Pay the loan shark');
  set('#tNew', '开张', 'New run'); set('#tCont', '接着打', 'Continue'); set('#tHelp', '规矩', 'How to play'); set('#tLang', '语言 · Language', 'Language · 语言');
  set('#tShopLbl', '铺子 · 名望', 'Workshop · Fame'); set('#tCodexLbl', '兵器图鉴 ·', 'Weapon codex ·');
  set('#shopH', '铺子', 'Workshop'); set('#sFameLbl', '名望', 'Fame'); set('#shopFoot', '每局结束按撑过的期数和最高卖价得名望。升级永久有效。', 'Each run ends with fame based on periods survived and your best sale. Upgrades are permanent.');
  set('#secMat', '料子', 'Materials'); set('#secUpg', '手艺', 'Skills'); set('#shopBack', '回去', 'Back');
  set('#codexFoot', '打出过的兵器会记在这里。收集得越多，铺子的永久加成越多。', 'Every weapon you forge is recorded here. Collect more for permanent bonuses.'); set('#codexBack', '回去', 'Back');
  const en = !['zh', 'zht'].includes(LANG), logo = $('.logo'); logo.textContent = T('一锤子买卖', 'One Hammer Deal');
  Object.assign(logo.style, { fontFamily: en || LANG === 'zht' ? 'var(--serif)' : '', fontSize: en ? 'clamp(34px,9.5vw,64px)' : '', whiteSpace: en ? 'normal' : '', fontWeight: en ? '900' : '' });
  $('#tTag').style.letterSpacing = en ? '.08em' : '';
  $('#strikeLbl').style.font = en ? '900 26px var(--serif)' : '';
  $('#codexBtn').textContent = T('鉴', 'Dex'); $('#codexBtn').style.font = en ? '700 12px var(--sans)' : '400 19px var(--brush)';
  $('#codexBtn').setAttribute('aria-label', T('兵器图鉴', 'Weapon codex')); $('#menuBtn').setAttribute('aria-label', T('设置', 'Settings'));
  const tl = { market: ['行情', 'Market'], rack: ['剑架', 'Rack'], bag: ['背包', 'Bag'], seals: ['秘籍', 'Seals'] };
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => { b.textContent = T(...tl[b.dataset.tab]); });
}
function setLang(l) {
  LANG = l; meta.lang = l; saveMeta(); applyStatic();
  if (!$('#titleScreen').hidden) showTitle(); if (!$('#shopScreen').hidden) showShop(); if (!$('#codexScreen').hidden) showCodex();
  render(); if (run && tab === 'rack') render();
}
function langSheet(back) {
  openSheet(`<h2>语言 · 語言 · Language</h2><div class="btns">${LANGS.map(([k, n]) => `<button class="btn${k === LANG ? '' : ' ghost'}" type="button" data-l="${k}">${n}${k === LANG ? ' ✓' : ''}</button>`).join('')}</div>`);
  $('#sheet').querySelectorAll('[data-l]').forEach((b) => b.onclick = () => { setLang(b.dataset.l); if (back) back(); else closeSheet(); });
}
const shopOpen = () => !!(meta.ends || meta.totalFame > 0 || meta.best.period > 0);
function showTitle() {
  hideScreens(); closeSheet(); $('#titleScreen').hidden = false; $('#tShop').hidden = !shopOpen();
  $('#tCont').hidden = !run; $('#tFame').textContent = fmt(meta.fame); $('#tCodexN').textContent = codexN() + '/' + WEAPONS.length;
  $('#tFoot').textContent = meta.best.period ? T(`最好成绩：撑过 ${meta.best.period} 期 · 最高 +${meta.best.level} · 单件 ${fmt(meta.best.sale)}`, `Best: ${meta.best.period} periods · +${meta.best.level} · best sale ${fmt(meta.best.sale)}`) : T('v0.12 · 存档在这台设备的浏览器里', 'v0.12 · saved in this browser');
}
function showShop() {
  hideScreens(); $('#shopScreen').hidden = false; $('#sFame').textContent = fmt(meta.fame);
  $('#matList').innerHTML = MATS.filter((m) => m.cost > 0).map((m) => {
    const own = meta.mats.includes(m.id);
    return `<div class="item"><b>${N(m)} · ${T('底价', 'base')} ${m.base}</b><button class="btn${own ? ' ghost' : ''}" type="button" data-mat="${m.id}" ${own || meta.fame < m.cost ? 'disabled' : ''}>${own ? T('已有', 'Owned') : m.cost + T(' 名望', ' fame')}</button><span>${D(m)}</span></div>`;
  }).join('');
  $('#upgList').innerHTML = UPGS.map((u) => {
    const l = ulv(u.id), maxed = l >= u.max, c = maxed ? 0 : u.cost(l);
    return `<div class="item"><b>${N(u)}${u.max > 1 ? ` · ${l}/${u.max}` : ''}</b><button class="btn${maxed ? ' ghost' : ''}" type="button" data-upg="${u.id}" ${maxed || meta.fame < c ? 'disabled' : ''}>${maxed ? T('满了', 'Maxed') : c + T(' 名望', ' fame')}</button><span>${D(u)}</span></div>`;
  }).join('');
}
$('#shopScreen').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled || !(b.dataset.mat || b.dataset.upg)) return; // the Back button has its own handler
  if (b.dataset.mat) { const m = MAT[b.dataset.mat]; if (meta.fame >= m.cost) { meta.fame -= m.cost; meta.mats.push(m.id); ensureAudio(); sfx('pay'); } }
  if (b.dataset.upg) { const u = UPGS.find((x) => x.id === b.dataset.upg), l = ulv(u.id), c = u.cost(l); if (l < u.max && meta.fame >= c) { meta.fame -= c; meta.upg[u.id] = l + 1; ensureAudio(); sfx('pay'); } }
  saveMeta(); showShop();
});
function showCodex() {
  hideScreens(); $('#codexScreen').hidden = false; freeCanvases($('#codexScreen'));
  const n = codexN(), gd = gradesDone(), w = rarityWeights(), tw = w.reduce((x, y) => x + y, 0);
  $('#cCount').textContent = n + '/' + WEAPONS.length;
  $('#codexScreen h2').textContent = T('兵器图鉴', 'Weapon Codex');
  $('#miles').innerHTML = MILES.map((ml) => `<div class="${n >= ml.n ? 'on' : ''}"><span>${T('收集 ' + ml.n + ' 种', 'Collect ' + ml.n)}</span><span>${D(ml)}${n >= ml.n ? T(' · 已生效', ' · active') : ''}</span></div>`).join('');
  const stars = (lv) => [5, 10, 20].map((t) => `<i class="${lv >= t ? 'on' : ''}">★</i>`).join('');
  $('#codex').innerHTML = RARITY.map((rq, r) => {
    const list = WEAPONS.filter((x) => x.rar === r), got = list.filter((x) => meta.codex[x.id] !== undefined).length;
    return `<div class="cgrade" style="--rq:${rq.color}"><div class="chead"><b>${RK(rq)} · ${N(rq)}</b><span>${T('出现率 ', 'Drop rate ')}${pct(w[r] / tw)} · ${T('底价', 'base')} ×${rq.bm}</span><span>${got}/${list.length} · ${gd[r] ? T('集齐：', 'Complete: ') : T('集齐奖励：', 'Set bonus: ')}${GB(r)}</span></div><div class="cgrid">` +
      list.map((x) => { const has1 = meta.codex[x.id] !== undefined, lv = meta.codex[x.id] || 0;
        const fm = has1 ? `<span class="forms">${FORMS[x.id].map((f, i) => `<i class="${lv >= FORM_LV[i] ? 'on' : ''}${i === 3 ? ' top' : ''}" title="+${FORM_LV[i]}">${lv >= FORM_LV[i] ? T(f[0], f[1]) : '+' + FORM_LV[i]}</i>`).join('')}</span>` : '';
        return `<div class="cx${has1 ? '' : ' lock'}"><canvas data-shape="${x.id}"></canvas><b>${has1 ? N(x) : '???'}</b><span class="stars">${has1 ? stars(lv) : ''}</span>${fm}<span>${has1 ? T('最高 +' + lv + ' · 打过 ' + (meta.forged[x.id] || 1) + ' 件', 'Best +' + lv + ' · forged ' + (meta.forged[x.id] || 1)) : T('还没打出来过', 'Not found yet')}</span>${has1 ? `<span>${D(x)}</span>` : ''}</div>`; }).join('') + '</div></div>';
  }).join('') + `<p class="foot">${T('★ 打到 +5　★★ 打到 +10　★★★ 打到 +20。每件兵器打到 +25、+50、+75 会进化成新形态，最后一次变化最大。', '★ reach +5　★★ reach +10　★★★ reach +20. Every weapon evolves at +25, +50 and +75; the last change is the biggest.')}</p>`;
  $('#codex').querySelectorAll('.cx').forEach((el, i) => { const id = el.querySelector('canvas').dataset.shape; el.dataset.id = id; el.tabIndex = 0; el.setAttribute('role', 'button'); });
  $('#codex').querySelectorAll('canvas').forEach((c) => { const id = c.dataset.shape, got = meta.codex[id] !== undefined; drawIcon(c, { mat: 'steel', shape: id, level: got ? Math.min(meta.codex[id], 25) : 0, mul: 1 }, !got); });
}
$('#codex').addEventListener('click', (e) => { const el = e.target.closest('.cx[data-id]'); if (el) evoSheet(el.dataset.id); });
$('#codex').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const el = e.target.closest('.cx[data-id]'); if (el) evoSheet(el.dataset.id); } });
// evolution tree for one weapon: its four forms, what unlocks each, and how far you've got
let evoRaf = 0;
function evoSheet(id) {
  const w = WP[id], got = meta.codex[id] !== undefined, best = meta.codex[id] || 0, rq = RARITY[w.rar];
  const rows = FORMS[id].map((f, i) => {
    const open = got && best >= FORM_LV[i], next = !open && (i === 0 || best >= FORM_LV[i - 1]);
    return `<div class="evo${open ? ' open' : ''}${i === 3 ? ' top' : ''}"><canvas data-i="${i}"></canvas><div class="evo-t"><b>${open ? T(f[0], f[1]) : '？？？'}</b><span>${T(STAGES[i][0], STAGES[i][1])} · +${FORM_LV[i]}</span><span class="${open ? 'ok' : ''}">${open ? T('已解锁', 'Unlocked') : got && next ? T('还差 ' + (FORM_LV[i] - best) + ' 级', (FORM_LV[i] - best) + ' levels to go') : T('未解锁', 'Locked')}</span></div></div>${i < 3 ? '<div class="evo-arrow">↓</div>' : ''}`;
  }).join('');
  openSheet(`<h2><span class="rq" style="color:${rq.color};border-color:${rq.color}">${isLatin() || isTbl() ? N(rq) : RK(rq) + '·' + N(rq)}</span>${got ? N(w) : '？？？'}</h2>
    <p>${got ? D(w) : T('还没打出来过。先在砧上遇到它。', 'Not found yet. You need to get it on the anvil first.')}</p>
    ${got ? linesHtml([[T('最高等级', 'Best level'), '+' + best], [T('打过', 'Forged'), String(meta.forged[id] || 1)], [T('稀有度', 'Rarity'), N(rq)]]) : ''}
    <div class="evotree">${rows}</div>
    <div class="btns"><button class="btn ghost" id="evoBack" type="button">${T('回去', 'Back')}</button></div>`);
  $('#evoBack').onclick = closeSheet;
  const cvs = [...$('#sheet').querySelectorAll('.evo canvas')];
  cancelAnimationFrame(evoRaf);
  const draw = (t) => {
    if ($('#modal').hidden || !cvs[0].isConnected) return;
    cvs.forEach((c) => { const i = +c.dataset.i, open = got && best >= FORM_LV[i]; drawEvo(c, { mat: 'steel', shape: id, level: Math.max(FORM_LV[i], i === 0 ? 6 : FORM_LV[i]), mul: 1 }, !open, t); });
    evoRaf = requestAnimationFrame(draw);
  };
  evoRaf = requestAnimationFrame(draw);
}
$('#codexBack').onclick = () => { if (run && $('#titleScreen').dataset.from === 'game') { hideScreens(); render(); } else showTitle(); };
function showHelp() {
  meta.seenHelp = true; saveMeta();
  const c = (col, t) => `<b style="color:${col}">${t}</b>`;
  // one short line per rule; the evolution example below is drawn, not described
  const items = (isTbl()) && I18N[LANG] && I18N[LANG].help ? I18N[LANG].help(c, DAYS) : isLatin() ? [
    `Tap ${c('#FFF6E0', 'Strike')}: the item may level up… or break.`,
    `The needle on the rainbow bar is your result: ${c('var(--o-succ)', 'success')} +1, ${c('var(--o-great)', 'great')} +2, ${c('var(--o-brk)', 'break')}.`,
    'Higher level = worth more, breaks easier. No level cap.',
    'The price moves with every strike. Sell high.',
    `Pay the bank every ${DAYS} days, or lose the shop.`,
    `${c('#FFD23F', 'Fire')} full = ${c('#FFD23F', 'Fever')}: 8 free strikes. ${c('#FF6A4D', 'The last one can break.')}`,
    'Rack: store items. Regret Pill: undo a break.',
    'Weapons evolve at +25, +50 and +75:',
    `20 weapons, 5 rarities: ${c('#E4DED3', 'white')} · ${c('#5FD068', 'green')} · ${c('#4FA6FF', 'blue')} · ${c('#F5C542', 'gold')} · ${c('#FF4D4D', 'red')}. Collect them for permanent bonuses.`,
  ] : [
    `点「${c('#FFF6E0', '锤')}」打铁：可能升级，也可能碎。`,
    `彩虹条上的指针就是结果：${c('var(--o-succ)', '成功')} +1、${c('var(--o-great)', '大成功')} +2、${c('var(--o-brk)', '碎')}。`,
    '等级越高越值钱，也越容易碎。没有上限。',
    '剑价每锤都在跳，涨了再卖。',
    `每 ${DAYS} 天还一期债，还不上铺子就倒。`,
    `${c('#FFD23F', '火候')}满 10 格 = ${c('#FFD23F', '上头时刻')}：8 锤免费，${c('#FF6A4D', '最后一锤可能碎')}。`,
    '剑架能存剑，后悔药能救回碎掉的剑。',
    '兵器打到 +25、+50、+75 会进化：',
    `20 种兵器 5 档：${c('#E4DED3', '白')} · ${c('#5FD068', '绿')} · ${c('#4FA6FF', '蓝')} · ${c('#F5C542', '金')} · ${c('#FF4D4D', '红')}，集齐有永久加成。`,
  ];
  const li = items.map((x, i) => `<li>${LANG === 'zht' ? toTrad(x) : x}${i === 7 ? evoStripHtml() : ''}</li>`);
  openSheet(`<h2>${T('规矩', 'How to play')}</h2><ol class="help">${li.join('')}</ol><p class="keys">${T('电脑上：空格 = 锤，S = 出售，A = 上架，E = 睡觉', 'Keyboard: Space = strike, S = sell, A = rack, E = sleep')}</p><div class="btns"><button class="btn" id="mOk" type="button">${T('开干', "Let's go")}</button><button class="btn ghost" id="mTut" type="button">${T('重看新手教程', 'Replay tutorial')}</button></div>`);
  startEvoStrip($('#sheet'));
  $('#mOk').onclick = closeSheet;
  $('#mTut').onclick = () => { closeSheet(); if (run) { hideScreens(); render(); startTut(); } else { tutForce = true; startRun(); } };
}

// the salted-fish example: four forms, one per 25 levels (used by the tutorial and the rules)
const EVO_DEMO = 'yu';
function evoStripHtml() {
  return `<div class="estrip">${FORM_LV.map((lv, i) => `${i ? '<i class="earr">↓</i>' : ''}<div class="erow"><b class="elv">+${lv}</b><canvas data-i="${i}"></canvas><span>${formName(EVO_DEMO, lv)}</span></div>`).join('')}</div>`;
}
let stripRaf = 0;
function startEvoStrip(root) {
  cancelAnimationFrame(stripRaf);
  const cvs = [...root.querySelectorAll('.estrip canvas')];
  const draw = (t) => {
    if (!cvs.length || !cvs[0].isConnected) return;
    cvs.forEach((c) => { const i = +c.dataset.i; drawEvo(c, { mat: 'steel', shape: EVO_DEMO, level: i ? FORM_LV[i] : 6, mul: 1 }, false, t); });
    stripRaf = requestAnimationFrame(draw);
  };
  stripRaf = requestAnimationFrame(draw);
}

// ---------- first-run tutorial: a pointing hand and one short line per step; can be skipped ----------
let tut = null, tutForce = false;
const HAND_SVG = '<svg viewBox="0 0 64 72" width="54" height="61" aria-hidden="true"><g fill="#FFF6E0" stroke="#1A0E06" stroke-width="2.5" stroke-linejoin="round"><rect x="22" y="2" width="13" height="38" rx="6.5"/><rect x="34" y="22" width="11" height="22" rx="5.5"/><rect x="44" y="26" width="10" height="20" rx="5"/><path d="M12 38c-4-4-2-10 3-9l8 5v-2h31v14c0 13-8 22-20 22s-17-6-22-14z"/></g><path d="M26 10h5" stroke="#E2560F" stroke-width="2.5" stroke-linecap="round"/></svg>';
function tutSteps() {
  return [
    { el: '#btnStrike', text: T('点这里打铁', 'Tap to strike'), strike: 1, dim: 0.45 },
    { el: '.owrap', text: T('指针落在哪，结果就是哪', 'Where the needle lands is what you get'), pad: 26 },
    { el: '#btnStrike', text: T('再锤两下', 'Strike twice more'), strike: 2, dim: 0.45 },
    { el: '#sLevel', text: T('等级越高越值钱，也越容易碎', 'Higher level: worth more, breaks easier') },
    { el: '#btnSell', text: T('值钱了就卖', 'Sell when the price is right') },
    { el: '.bar .debt', text: T(`每 ${DAYS} 天还一次债`, `Repay the bank every ${DAYS} days`) },
    { el: '#fire', text: T(`火候满 ${FIRE_MAX} 格 = 上头时刻，免费锤`, `Fill ${FIRE_MAX} = Fever: free strikes`) },
    { evo: true },
  ];
}
function startTut() {
  endTut(true);
  const o = document.createElement('div'); o.id = 'tut';
  o.innerHTML = `<div class="tut-hole"></div><div class="tut-hand">${HAND_SVG}</div><div class="tut-tip"><p></p><small></small></div><div class="tut-card" hidden></div><div class="tut-dots"></div><button class="tut-skip" type="button">${T('跳过', 'Skip')}</button>`;
  document.body.appendChild(o);
  tut = { o, steps: tutSteps(), i: -1, n: 0, t0: 0, raf: 0 };
  o.addEventListener('pointerdown', tutDown);
  o.addEventListener('click', (e) => { if (e.target.closest('#tutGo, .tut-skip')) endTut(); });
  tutGo(0);
  const loop = () => { if (!tut) return; tutPlace(); tut.raf = requestAnimationFrame(loop); };
  tut.raf = requestAnimationFrame(loop);
}
function endTut(silent) {
  if (!tut) return;
  cancelAnimationFrame(tut.raf); cancelAnimationFrame(stripRaf); tut.o.remove(); tut = null;
  if (!silent) { meta.tutDone = true; meta.seenHelp = true; saveMeta(); render(); }
}
function tutGo(i) {
  if (!tut) return;
  if (i >= tut.steps.length) return endTut();
  tut.i = i; tut.n = 0; tut.t0 = performance.now();
  const st = tut.steps[i], o = tut.o;
  o.querySelector('.tut-dots').innerHTML = tut.steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  o.classList.toggle('isevo', !!st.evo);
  const card = o.querySelector('.tut-card');
  card.hidden = !st.evo;
  if (st.evo) {
    card.innerHTML = `<h3>${T('每 25 级进化一次', 'Evolves every 25 levels')}</h3>${evoStripHtml()}<button class="btn" type="button" id="tutGo">${T('开打！', "Let's forge!")}</button>`;
    startEvoStrip(card);
    return;
  }
  o.querySelector('.tut-tip p').textContent = st.text;
  o.querySelector('.tut-tip small').textContent = st.strike ? '' : T('点任意处继续', 'Tap anywhere to continue');
  const el = document.querySelector(st.el); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
function tutRect() {
  const st = tut.steps[tut.i], el = st.el && document.querySelector(st.el);
  if (!el) return null;
  const r = el.getBoundingClientRect(), p = st.pad || 8;
  return { x: r.left - p, y: r.top - p, w: r.width + p * 2, h: r.height + p * 2 };
}
function tutPlace() {
  const st = tut.steps[tut.i]; if (st.evo) return;
  const r = tutRect(); if (!r) return;
  const o = tut.o, hole = o.querySelector('.tut-hole'), hand = o.querySelector('.tut-hand'), tip = o.querySelector('.tut-tip');
  Object.assign(hole.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', boxShadow: `0 0 0 200vmax rgba(8,6,5,${st.dim || 0.66})` });
  const vh = innerHeight, vw = innerWidth, below = r.y + r.h / 2 < vh * 0.55;
  // the hand sits just under the target (or over it, near the bottom of the screen) and taps toward it
  const hx = Math.min(vw - 58, Math.max(4, r.x + r.w / 2 - (below ? 24 : 30)));
  const hy = below ? r.y + r.h - 4 : r.y - 57;
  Object.assign(hand.style, { left: hx + 'px', top: hy + 'px' });
  hand.classList.toggle('down', !below);
  const tw = Math.min(vw - 32, 320), tx = Math.min(vw - tw - 16, Math.max(16, r.x + r.w / 2 - tw / 2));
  Object.assign(tip.style, { width: tw + 'px', left: tx + 'px', top: below ? (r.y + r.h + 64) + 'px' : '', bottom: below ? '' : (vh - r.y + 64) + 'px' });
}
function tutDown(e) {
  if (!tut) return;
  const st = tut.steps[tut.i];
  if (e.target.closest('.tut-skip')) { e.preventDefault(); return endTut(); }
  if (st.evo) { if (e.target.closest('#tutGo')) { e.preventDefault(); endTut(); } return; }
  e.preventDefault();
  if (st.strike) {
    const r = tutRect();
    if (!r || e.clientX < r.x || e.clientX > r.x + r.w || e.clientY < r.y || e.clientY > r.y + r.h) { tut.o.querySelector('.tut-hole').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], 260); return; }
    ensureAudio(); strike();
    if (++tut.n >= st.strike) { const i = tut.i; setTimeout(() => { if (tut && tut.i === i) tutGo(i + 1); }, 700); }
    return;
  }
  if (performance.now() - tut.t0 > 350) tutGo(tut.i + 1);
}
addEventListener('keydown', (e) => {
  if (!tut) return;
  if (e.key === 'Escape') return endTut();
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault(); e.stopImmediatePropagation();
    const st = tut.steps[tut.i];
    if (st.evo) return endTut();
    if (st.strike) { strike(); if (++tut.n >= st.strike) { const i = tut.i; setTimeout(() => { if (tut && tut.i === i) tutGo(i + 1); }, 700); } }
    else tutGo(tut.i + 1);
  } else e.stopImmediatePropagation();
}, true);
addEventListener('resize', () => { if (tut) tutPlace(); });

$('#tNew').onclick = () => { if (run && !confirmNew()) return; startRun(); };
let newArmed = 0;
function confirmNew() { if (performance.now() - newArmed < 3000) return true; newArmed = performance.now(); $('#tNew').textContent = T('会放弃现在这一局，再点一次', 'This abandons your current run. Tap again'); setTimeout(() => { $('#tNew').textContent = T('开张', 'New run'); }, 3000); return false; }
$('#tCont').onclick = () => { hideScreens(); render(); };
$('#tShop').onclick = showShop;
$('#tCodex').onclick = () => { $('#titleScreen').dataset.from = 'title'; showCodex(); };
$('#codexBtn').onclick = () => { if (!run) return; $('#titleScreen').dataset.from = 'game'; showCodex(); };
$('#tHelp').onclick = showHelp;
$('#tLang').onclick = () => langSheet();
$('#shopBack').onclick = showTitle;
$('#menuBtn').onclick = () => {
  openSheet(`<h2>${T('设置', 'Settings')}</h2>${run ? `<p>${T('这一局：', 'This run: ')}<b>${diffName(run.diff)}</b> · ${T('第 ' + run.period + ' 期', 'Period ' + run.period)}</p>` : ''}<div class="btns"><button class="btn" id="mRes" type="button">${T('接着打', 'Resume')}</button><button class="btn ghost" id="mCodex" type="button">${T('兵器图鉴', 'Weapon codex')} · ${codexN()}/${WEAPONS.length}</button><button class="btn ghost" id="mLang" type="button">${T('语言 · Language：', 'Language · 语言: ')}${LANGS.find(([k]) => k === LANG)[1]}</button><button class="btn ghost" id="mSnd" type="button">${T('声音：', 'Sound: ')}${meta.muted ? T('关', 'off') : T('开', 'on')}</button><button class="btn ghost" id="mVib" type="button">${T('震动：', 'Vibration: ')}${meta.vibe ? T('开', 'on') : T('关', 'off')}</button><button class="btn ghost" id="mRules" type="button">${T('规矩', 'How to play')}</button><button class="btn ghost" id="mHome" type="button">${T('回到门口（自动存档）', 'Main menu (auto-saved)')}</button></div>`);
  $('#mRes').onclick = closeSheet;
  $('#mCodex').onclick = () => { closeSheet(); $('#titleScreen').dataset.from = 'game'; showCodex(); };
  $('#mLang').onclick = () => langSheet(() => $('#menuBtn').onclick());
  $('#mSnd').onclick = () => { meta.muted = !meta.muted; saveMeta(); $('#mSnd').textContent = T('声音：', 'Sound: ') + (meta.muted ? T('关', 'off') : T('开', 'on')); };
  $('#mVib').onclick = () => { meta.vibe = !meta.vibe; saveMeta(); vib(30); $('#mVib').textContent = T('震动：', 'Vibration: ') + (meta.vibe ? T('开', 'on') : T('关', 'off')); };
  $('#mRules').onclick = showHelp;
  $('#mHome').onclick = showTitle;
  const q = document.createElement('button'); q.className = 'btn ghost danger'; q.type = 'button'; q.id = 'mQuit'; q.textContent = T('收摊 · 结束这一局', 'Close shop · end this run'); q.onclick = closeShop;
  if (run) $('#sheet .btns').appendChild(q);
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#sheet .card') && !$('#sheet .offer') && !$('#mAgain') && !$('#mGo')) closeSheet(); });

let holdT = 0;
const btnS = $('#btnStrike');
btnS.addEventListener('pointerdown', (e) => { e.preventDefault(); strike(); clearInterval(holdT); holdT = setInterval(strike, 260); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btnS.addEventListener(ev, () => clearInterval(holdT)));
btnS.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); strike(); } });
$('#btnSell').onclick = sell;
$('#btnStore').onclick = storeSword;
$('#btnRest').onclick = rest;
$('#regretBtn').onclick = () => { if (run && run.lastBroken && run.bag.hui) { ensureAudio(); useItem('hui'); } };
$('#seals').addEventListener('click', (e) => { const b = e.target.closest('.seal'); if (b) toast(N(RMAP[b.dataset.id]) + T('：', ': ') + D(RMAP[b.dataset.id])); });
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

let lastLevel = null;
let rackDrawn = false;
function render() {
  if (!run) return;
  const s = run.sword, t = tierOf(s.level), q = quota(), wp = WP[s.shape], mk = run.mk;
  $('#periodLbl').textContent = T('第 ' + run.period + ' 期', 'Period ' + run.period) + (run.diff === 'hard' ? T(' · 困难', ' · Hard') : '');
  $('#days').innerHTML = Array.from({ length: DAYS }, (_, i) => `<i class="${i < run.day ? 'on' : ''}"></i>`).join('');
  $('#quota').textContent = fmt(q) + (run.loan ? T('（含借款）', ' (incl. loan)') : '');
  $('#gold').textContent = fmt(run.gold);
  const left = DAYS - run.day;
  $('#gap').textContent = run.gold >= q ? T('够还了', 'Covered') : T((left ? `${left} 天后` : '明早') + '收账，还差 ', (left ? `Due in ${left} days, ` : 'Due tomorrow, ') + 'short ') + fmt(q - run.gold);
  $('#meter').style.width = clamp(run.gold / q * 100, 0, 100) + '%';
  const tierEl = $('#sTier'); tierEl.textContent = t.name; tierEl.style.color = t.color;
  const rq = RARITY[wp.rar]; $('#sName').innerHTML = `<span class="rq" style="color:${rq.color};border-color:${rq.color}">${isLatin() ? N(rq) : RK(rq) + '·' + N(rq)}</span>${N(MAT[s.mat])} · <span style="color:${rq.color}">${wname(s)}</span>${s.gilded ? T(' · 金漆', ' · lacquered') : ''}`;
  const lv = $('#sLevel'); lv.textContent = '+' + s.level; lv.style.color = s.level ? t.color : '#F3E9DC';
  const lk = s.level + ':' + s.name;
  if (lastLevel !== null && lastLevel !== lk) { lv.classList.remove('punch'); void lv.offsetWidth; lv.classList.add('punch'); }
  lastLevel = lk;
  $('#sVal').textContent = fmt(value(s));
  const o = odds(s), parts = [o.brk, o.dmg, o.keep, o.succ, o.great];
  $('#obar').querySelectorAll('i').forEach((el, i) => { el.style.width = (parts[i] * 100) + '%'; });
  const labels = [T('碎裂', 'Break'), T('受损', 'Damage'), T('无变化', 'No change'), T('成功', 'Success'), run.forceGreat ? T('必大成功', 'Sure great') : T('大成功 +', 'Great +') + stepUp(s)];
  const colors = ['--o-brk', '--o-dmg', '--o-keep', '--o-succ', '--o-great'];
  $('#olegend').innerHTML = parts.map((p, i) => `<span><b style="color:var(${colors[i]})">${pct(p)}</b>${labels[i]}</span>`).join('');
  const bf = [], b = run.buffs;
  if (b.hu) bf.push(T('护剑符：接下来 ' + (+b.hu) + ' 锤不会碎', "Ward: next " + (+b.hu) + " strikes can't break")); if (b.zhu) bf.push(T('祝福油：接下来 ' + (+b.zhu) + ' 锤成功率 +25%', 'Blessing: next ' + (+b.zhu) + ' strikes +25%')); if (b.tian) bf.push(T('天工锤：接下来 ' + (+b.tian) + ' 锤必成', 'Heaven Hammer: next ' + (+b.tian) + ' strikes succeed')); if (b.cui > 0) bf.push(T('淬火水：还剩 ' + b.cui + ' 锤', 'Quench Water: ' + b.cui + ' strikes left')); if (b.ya) bf.push(T('牙行帖：下次卖 +40%', "Broker's Note: next sale +40%")); if (b.rong) bf.push(T('三昧真火：接下来 ' + (+b.rong) + ' 次熔剑必成', 'Samadhi Fire: next ' + (+b.rong) + ' smelts succeed'));
  bf.push(N(wp) + T('：', ': ') + D(wp).replace(/^[^：:]*[：:]\s*/, ''));
  $('#buffs').innerHTML = bf.map((x) => `<span>${x}</span>`).join('');
  $('#stam').textContent = run.fever === 1 ? T('最后一锤 · 会碎！', 'Last one · can break!') : run.fever > 0 ? T('上头！还剩 ' + run.fever + ' 锤不花体力', 'FEVER! ' + run.fever + ' free strikes') : T('体力 ', 'Stamina ') + run.stam + '/' + maxStam();
  btnS.disabled = run.stam <= 0 && !(run.fever > 0);
  const fe = $('#fire'), fr = run.fire || 0;
  if (run.fever === 1) fe.innerHTML = `<b>${T('最后一锤', 'LAST STRIKE')}</b><span>${T('这一锤会碎！碎裂率 ', 'This one can break! Break chance ')}${pct(o.brk)}${T(' · 想稳就先卖掉或上架', ' · sell or rack it to play safe')}</span>`;
  else if (run.fever > 0) fe.innerHTML = `<b>${T('上头时刻', 'FEVER')}</b><span>${T('还剩 ' + run.fever + ' 锤 · 不花体力 · 不会碎 · 大成功 +', run.fever + ' strikes left · free · no breaks · great +')}${pct(FEVER_GREAT)}</span>`;
  else fe.innerHTML = `<b>${T('火候', 'Fire')}</b><span class="segs">${Array.from({ length: FIRE_MAX }, (_, i) => `<i class="${i < fr ? 'on' : ''}"></i>`).join('')}</span><span>${fr}/${FIRE_MAX} · ${T('满了进入上头时刻', 'full = Fever')}</span>`;
  fe.classList.toggle('hot', run.fever > 1); fe.classList.toggle('last', run.fever === 1); $('#app').classList.toggle('fever', run.fever > 0); $('#app').classList.toggle('lastfever', run.fever === 1);
  $('#btnSell').disabled = s.level < 1;
  $('#sellPrice').textContent = (s.level < 1 ? T('+1 起收', 'from +1') : fmt(priceOf(s))) + (sellCap() ? T(' · 今天还能卖 ', ' · left today ') + salesLeft() : '');
  $('#btnStore').disabled = s.level < 1 || run.rack.length >= rackCap();
  $('#rackCount').textContent = T('剑架 ', 'Rack ') + run.rack.length + '/' + rackCap();
  const rb = $('#btnRest');
  if (performance.now() - restArmed > 2500) rb.textContent = run.day >= DAYS ? T('睡一觉 · 收盘 · 明早还款', 'Sleep · close · payment tomorrow') : T('睡一觉 · 收盘', 'Sleep · close the day');
  rb.classList.toggle('hot', run.stam <= 0 && !(run.fever > 0));
  const chg = mk.now / mk.prevClose - 1, up = chg >= 0, cl = up ? 'up' : 'down';
  $('#sMk').innerHTML = `· ${T('剑市', 'Market')} <span class="${cl}">×${mk.now.toFixed(2)} ${up ? '▲' : '▼'}${pct(Math.abs(chg))}</span>`;
  $('#mNow').textContent = '×' + mk.now.toFixed(2); $('#mNow').className = cl;
  const mc = $('#mChg'); mc.textContent = (up ? '▲ ' : '▼ ') + pct(Math.abs(chg)) + T(' 比昨收', ' vs close'); mc.className = 'mchg ' + cl;
  $('#mStats').innerHTML = `<span>${T('今开', 'Open')} <b>${mk.open.toFixed(2)}</b></span><span>${T('昨收', 'Prev')} <b>${mk.prevClose.toFixed(2)}</b></span><span>${T('最高', 'High')} <b class="up">${mk.hi.toFixed(2)}</b></span><span>${T('最低', 'Low')} <b class="down">${mk.lo.toFixed(2)}</b></span>`;
  $('#mNews').textContent = newsText(mk.news);
  $('#mTip').textContent = has('xin') ? T(`内幕消息：明天${mk.gap >= 1 ? '高开' : '低开'}，大约 ${mk.gap >= 1 ? '+' : '-'}${pct(Math.abs(mk.gap - 1))}${mk.li ? '（黄历保底 ×1.40）' : ''}`, `Insider: tomorrow opens ${mk.gap >= 1 ? 'up' : 'down'} about ${pct(Math.abs(mk.gap - 1))}${mk.li ? ' (Almanac floor ×1.40)' : ''}`) : mk.li ? T('黄历：明天开盘至少 ×1.40', 'Almanac: tomorrow opens at ×1.40 or higher') : (has('ke') && mk.now < 1 ? T('熟客按 ×1.00 收。', 'Regulars still pay ×1.00.') : T('每打一锤剑价跳一下；睡觉收盘，明天跳空开盘。', 'The price moves every strike; sleeping closes the day.'));
  if (tab === 'market') drawMarket();
  const cap = rackCap();
  const rackNew = setHTML($('#rack'), Array.from({ length: cap }, (_, i) => { const r = run.rack[i];
    return r ? `<button class="slot" type="button" data-i="${i}" style="border-color:${RARITY[WP[r.shape].rar].color}66"><canvas></canvas><b style="color:${tierOf(r.level).color}">+${r.level}</b><span style="color:${RARITY[WP[r.shape].rar].color}">${N(WP[r.shape])}</span><span class="rp"></span></button>` : `<div class="slot empty">${T('空位', 'Empty')}</div>`; }).join(''));
  if (rackNew) rackDrawn = false;
  $('#rack').querySelectorAll('.slot[data-i]').forEach((el) => { el.querySelector('.rp').textContent = fmt(priceOf(run.rack[+el.dataset.i], false)); }); // prices move every strike; the pictures don't
  if (tab === 'rack' && !rackDrawn) { rackDrawn = true; $('#rack').querySelectorAll('.slot[data-i]').forEach((el) => drawIcon(el.querySelector('canvas'), run.rack[+el.dataset.i])); }
  const ids = Object.keys(run.bag);
  setHTML($('#bag'), ids.map((id) => `<button class="chip" type="button" data-id="${id}"><i>${IMAP[id].ch}</i>${N(IMAP[id])} ×${run.bag[id]}</button>`).join('') + `<button class="chip shopbtn" type="button" data-shop="1"><i>铺</i>${T('逛杂货铺', 'General store')}</button>`);
  const cnt = ids.reduce((a, k) => a + run.bag[k], 0);
  document.querySelector('[data-tab="bag"]').innerHTML = T('背包', 'Bag') + (cnt ? `<span class="n">${cnt}</span>` : '');
  document.querySelector('[data-tab="rack"]').innerHTML = T('剑架', 'Rack') + (run.rack.length ? `<span class="n">${run.rack.length}</span>` : '');
  setHTML($('#seals'), run.relics.length ? run.relics.map((id) => `<button class="seal" type="button" data-id="${id}" title="${N(RMAP[id])}: ${D(RMAP[id])}" aria-label="${N(RMAP[id])}">${RMAP[id].ch}</button>`).join('') : `<span class="empty">${T('还没有秘籍。每还清一期能挑一本。', 'No seals yet. You get one after each payment.')}</span>`);
  $('#log').innerHTML = run.log.map((e) => `<div class="${e.length >= 3 ? e[2] : e[1]}">${logText(e)}</div>`).join('');
  const rg = $('#regretBtn'), canUndo = !!(run.lastBroken && run.bag.hui);
  rg.hidden = !canUndo; if (canUndo) rg.textContent = T('吃后悔药 ×' + run.bag.hui + '：找回 +' + run.lastBroken.level + ' ' + formName(run.lastBroken.shape, run.lastBroken.level), 'Regret Pill ×' + run.bag.hui + ': undo +' + run.lastBroken.level + ' ' + formName(run.lastBroken.shape, run.lastBroken.level));
  const cb = $('#combo');
  if (run.streak >= 2) { const was = cb.dataset.n; cb.innerHTML = `×${run.streak}<small>${T('连击', 'COMBO')}</small>`; cb.classList.add('on'); if (was !== String(run.streak)) { cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); } cb.dataset.n = run.streak; }
  else { cb.classList.remove('on'); cb.dataset.n = ''; }
  const sr = $('#scene').getBoundingClientRect(), ib = $('.sinfo').getBoundingClientRect(); if (sr.height) infoBottom = ib.bottom - sr.top; // keep the resting hammer clear of the (possibly wrapped) title
}
function drawMarket() {
  const c = $('#mcv'), r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  if (!r.width) return;
  c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  const mk = run.mk, w = r.width, h = r.height, cs = [...mk.candles, { o: mk.open, h: mk.hi, l: mk.lo, c: mk.now, live: true }];
  let lo = Math.min(...cs.map((x) => x.l), ...mk.ticks, 0.9), hi = Math.max(...cs.map((x) => x.h), ...mk.ticks, 1.1);
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const Y = (v) => h - 6 - (v - lo) / (hi - lo) * (h - 12);
  const split = w * 0.62, UP = '#E5483B', DN = '#3FB37F';
  g.strokeStyle = 'rgba(168,152,138,.25)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(0, Y(1)); g.lineTo(w, Y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(168,152,138,.6)'; g.font = '10px sans-serif'; g.fillText(T('日K', 'Daily'), 2, 10); g.fillText(T('今日分时', 'Today'), split + 6, 10);
  const cw = split / cs.length;
  cs.forEach((k, i) => {
    const x = i * cw + cw / 2, col = k.c >= k.o ? UP : DN;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, Y(k.h)); g.lineTo(x, Y(k.l)); g.stroke();
    const yt = Y(Math.max(k.o, k.c)), yb = Y(Math.min(k.o, k.c)), bw = Math.max(3, cw * 0.56);
    if (k.c >= k.o) { g.lineWidth = 1.4; g.strokeRect(x - bw / 2, yt, bw, Math.max(1.5, yb - yt)); } else g.fillRect(x - bw / 2, yt, bw, Math.max(1.5, yb - yt));
    if (k.live) { g.strokeStyle = 'rgba(255,246,224,.6)'; g.lineWidth = 1; g.strokeRect(x - bw / 2 - 2, Y(k.h) - 2, bw + 4, Y(k.l) - Y(k.h) + 4); }
  });
  g.strokeStyle = 'rgba(168,152,138,.25)'; g.beginPath(); g.moveTo(split + 2, 4); g.lineTo(split + 2, h - 4); g.stroke();
  const tk = mk.ticks, n = Math.max(12, tk.length), X = (i) => split + 6 + i * (w - split - 12) / (n - 1);
  const col = mk.now >= mk.open ? UP : DN;
  g.strokeStyle = 'rgba(168,152,138,.35)'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(split + 4, Y(mk.prevClose)); g.lineTo(w, Y(mk.prevClose)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); tk.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(X(tk.length - 1), Y(mk.now), 3.5, 0, 7); g.fill();
}

// ---------- weapons: one drawing routine per type ----------
// local coords: x from 0 (business end, left) to L (handle end, right), centred on y = 0; u = thickness unit
const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); else c.rect(x, y, w, h); };
const lg = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const metal = (c, s, u) => lg(c, -u, u, [[0, '#FFFFFF'], [0.45, MAT[s.mat].color], [1, '#2A2D33']]);
const WOOD = (c, u) => lg(c, -u, u, [[0, '#B98552'], [0.5, '#7A4A26'], [1, '#4A2A14']]);
function hilt(c, L, u, s, x) {
  const gold = s.level >= 15 ? '#D9A93F' : '#4A4440';
  c.fillStyle = gold; c.fillRect(x, -1.3 * u, 0.4 * u, 2.6 * u);
  c.fillStyle = '#3B2A20'; c.fillRect(x + 0.4 * u, -0.36 * u, L - x - 1.2 * u, 0.72 * u);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(1, u * 0.12);
  for (let k = x + 0.4 * u + 4; k < L - 0.9 * u; k += Math.max(5, u * 0.6)) { c.beginPath(); c.moveTo(k, -0.36 * u); c.lineTo(k + u * 0.35, 0.36 * u); c.stroke(); }
  c.fillStyle = gold; c.beginPath(); c.arc(L - 0.5 * u, 0, 0.5 * u, 0, 7); c.fill();
}
const WDRAW = {
  jian(c, L, u, s) {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(1.2 * u, -0.5 * u); c.lineTo(0.7 * L, -0.5 * u); c.lineTo(0.7 * L, 0.5 * u); c.lineTo(1.2 * u, 0.5 * u); c.closePath(); c.fillStyle = metal(c, s, u); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = Math.max(1, u * 0.1); c.beginPath(); c.moveTo(2 * u, 0); c.lineTo(0.68 * L, 0); c.stroke();
    hilt(c, L, u, s, 0.7 * L);
  },
  caidao(c, L, u, s) {
    c.beginPath(); c.moveTo(0.16 * L, -1.4 * u); c.lineTo(0.68 * L, -1.4 * u); c.lineTo(0.68 * L, 1.4 * u); c.lineTo(0.22 * L, 1.4 * u); c.quadraticCurveTo(0.14 * L, 1.3 * u, 0.15 * L, 0.6 * u); c.closePath();
    c.fillStyle = metal(c, s, 1.4 * u); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(0.2 * L, 1.15 * u, 0.48 * L, 0.18 * u);
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0.62 * L, -0.85 * u, 0.28 * u, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
    rr(c, 0.68 * L, -0.45 * u, 0.3 * L, 0.9 * u, 0.4 * u); c.fillStyle = WOOD(c, 0.5 * u); c.fill();
    c.fillStyle = '#D9D2C5'; for (const x of [0.76, 0.86]) { c.beginPath(); c.arc(x * L, 0, 0.14 * u, 0, 7); c.fill(); }
  },
  ganmian(c, L, u) {
    rr(c, 0.12 * L, -0.65 * u, 0.76 * L, 1.3 * u, 0.65 * u); c.fillStyle = lg(c, -0.65 * u, 0.65 * u, [[0, '#F3D6A4'], [0.45, '#C8955A'], [1, '#8A5A2E']]); c.fill();
    c.fillStyle = lg(c, -0.35 * u, 0.35 * u, [[0, '#B98552'], [1, '#6A3E1E']]);
    rr(c, 0.01 * L, -0.33 * u, 0.12 * L, 0.66 * u, 0.33 * u); c.fill(); rr(c, 0.87 * L, -0.33 * u, 0.12 * L, 0.66 * u, 0.33 * u); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 7; i++) c.fillRect((0.2 + i * 0.09) * L, (-0.3 + ((i * 37) % 5) * 0.12) * u, 2, 2);
  },
  tuoxie(c, L, u) {
    c.beginPath(); c.moveTo(0.1 * L, 0); c.bezierCurveTo(0.1 * L, -1.55 * u, 0.42 * L, -1.4 * u, 0.58 * L, -1.0 * u); c.bezierCurveTo(0.74 * L, -0.75 * u, 0.9 * L, -1.05 * u, 0.9 * L, 0);
    c.bezierCurveTo(0.9 * L, 1.05 * u, 0.74 * L, 0.75 * u, 0.58 * L, 1.0 * u); c.bezierCurveTo(0.42 * L, 1.4 * u, 0.1 * L, 1.55 * u, 0.1 * L, 0); c.closePath();
    c.fillStyle = lg(c, -1.4 * u, 1.4 * u, [[0, '#7FB2FF'], [0.5, '#3D7DD8'], [1, '#1F4A8C']]); c.fill();
    c.strokeStyle = '#173A6E'; c.lineWidth = Math.max(1, u * 0.15); c.stroke();
    c.strokeStyle = '#FFD43B'; c.lineWidth = Math.max(2, u * 0.32); c.lineCap = 'round';
    c.beginPath(); c.moveTo(0.24 * L, 0); c.quadraticCurveTo(0.4 * L, -0.6 * u, 0.56 * L, -1.0 * u); c.moveTo(0.24 * L, 0); c.quadraticCurveTo(0.4 * L, 0.6 * u, 0.56 * L, 1.0 * u); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#FFD43B'; c.beginPath(); c.arc(0.24 * L, 0, 0.25 * u, 0, 7); c.fill();
  },
  cong(c, L, u) {
    rr(c, 0.44 * L, -0.45 * u, 0.52 * L, 0.9 * u, 0.45 * u); c.fillStyle = lg(c, -0.45 * u, 0.45 * u, [[0, '#FFFFFF'], [0.6, '#EEF6E2'], [1, '#C9DDB0']]); c.fill();
    c.fillStyle = 'rgba(140,190,90,.55)'; c.fillRect(0.44 * L, -0.45 * u, 0.1 * L, 0.9 * u);
    const leaf = (y1, col) => { c.beginPath(); c.moveTo(0.5 * L, -0.3 * u + y1 * 0.3); c.quadraticCurveTo(0.25 * L, y1 * 0.6 - 0.4 * u, 0, y1); c.quadraticCurveTo(0.25 * L, y1 * 0.6 + 0.3 * u, 0.5 * L, 0.3 * u + y1 * 0.3); c.closePath(); c.fillStyle = col; c.fill(); };
    leaf(-1.15 * u, '#2F8F3E'); leaf(1.1 * u, '#3FA34D'); leaf(0, '#5BC266');
    c.strokeStyle = '#D8CFAE'; c.lineWidth = 1; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(0.96 * L, i * 0.1 * u); c.lineTo(L, i * 0.28 * u); c.stroke(); }
  },
  guo(c, L, u) {
    const R0 = Math.min(2.1 * u, 0.21 * L), cx = 0.23 * L;
    rr(c, cx + R0 * 0.8, -0.38 * u, 0.62 * L - R0 * 0.8, 0.76 * u, 0.38 * u); c.fillStyle = '#1F1F22'; c.fill();
    rr(c, 0.82 * L, -0.42 * u, 0.17 * L, 0.84 * u, 0.42 * u); c.fillStyle = WOOD(c, 0.5 * u); c.fill();
    c.fillStyle = '#121214'; c.beginPath(); c.arc(0.95 * L, 0, 0.15 * u, 0, 7); c.fill();
    c.fillStyle = '#4A4A52'; c.beginPath(); c.arc(cx, 0, R0, 0, 7); c.fill();
    const g = c.createRadialGradient(cx - R0 * 0.3, -R0 * 0.3, R0 * 0.1, cx, 0, R0 * 0.88); g.addColorStop(0, '#55555E'); g.addColorStop(1, '#1A1A1E');
    c.fillStyle = g; c.beginPath(); c.arc(cx, 0, R0 * 0.86, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = Math.max(1, u * 0.12); c.beginPath(); c.arc(cx, 0, R0 * 0.7, 3.6, 4.6); c.stroke();
  },
  yu(c, L, u) {
    c.beginPath(); c.moveTo(0.04 * L, 0); c.quadraticCurveTo(0.08 * L, -1.1 * u, 0.33 * L, -1.05 * u); c.quadraticCurveTo(0.64 * L, -0.92 * u, 0.8 * L, -0.25 * u); c.lineTo(0.8 * L, 0.25 * u);
    c.quadraticCurveTo(0.64 * L, 0.92 * u, 0.33 * L, 1.05 * u); c.quadraticCurveTo(0.08 * L, 1.1 * u, 0.04 * L, 0); c.closePath();
    c.fillStyle = lg(c, -1.1 * u, 1.1 * u, [[0, '#E3EAEC'], [0.5, '#9FB1B7'], [1, '#5D6E75']]); c.fill();
    c.beginPath(); c.moveTo(0.79 * L, -0.25 * u); c.lineTo(0.99 * L, -1.05 * u); c.lineTo(0.92 * L, 0); c.lineTo(0.99 * L, 1.05 * u); c.lineTo(0.79 * L, 0.25 * u); c.closePath(); c.fillStyle = '#7F9198'; c.fill();
    c.beginPath(); c.moveTo(0.36 * L, -1.0 * u); c.lineTo(0.46 * L, -1.55 * u); c.lineTo(0.56 * L, -0.92 * u); c.fillStyle = '#7F9198'; c.fill();
    c.strokeStyle = 'rgba(60,75,82,.45)'; c.lineWidth = 1;
    for (let x = 0.26 * L; x < 0.74 * L; x += Math.max(6, u * 0.55)) { c.beginPath(); c.arc(x, 0, u * 0.5, -1.1, 1.1); c.stroke(); }
    c.strokeStyle = '#4A5A60'; c.lineWidth = Math.max(1, u * 0.12); c.beginPath(); c.arc(0.2 * L, 0, u * 0.75, -1.2, 1.2); c.stroke();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0.12 * L, -0.32 * u, 0.26 * u, 0, 7); c.fill();
    c.strokeStyle = '#1B1B1B'; c.lineWidth = Math.max(1, u * 0.1); const ex = 0.12 * L, ey = -0.32 * u, k = 0.14 * u; c.beginPath(); c.moveTo(ex - k, ey - k); c.lineTo(ex + k, ey + k); c.moveTo(ex + k, ey - k); c.lineTo(ex - k, ey + k); c.stroke();
    c.strokeStyle = '#B3261E'; c.lineWidth = Math.max(1, u * 0.14); c.beginPath(); c.arc(0.9 * L, 0, 0.35 * u, 0, 7); c.stroke();
  },
  jiguang(c, L, u, s) {
    const beam = s.level >= 5 ? tierOf(s.level).color : '#3DF5FF';
    c.save(); c.shadowColor = beam; c.shadowBlur = u * 1.2; rr(c, 0, -0.55 * u, 0.72 * L, 1.1 * u, 0.55 * u); c.fillStyle = beam; c.globalAlpha = 0.55; c.fill(); c.restore();
    rr(c, 0.01 * L, -0.24 * u, 0.7 * L, 0.48 * u, 0.24 * u); c.fillStyle = '#FFFFFF'; c.fill();
    rr(c, 0.7 * L, -0.5 * u, 0.28 * L, 1.0 * u, 0.2 * u); c.fillStyle = lg(c, -0.5 * u, 0.5 * u, [[0, '#C9CED6'], [0.5, '#6B7380'], [1, '#30353D']]); c.fill();
    c.fillStyle = '#20242B'; for (const x of [0.78, 0.82, 0.86]) c.fillRect(x * L, -0.5 * u, 2, 1.0 * u);
    c.fillStyle = '#E5483B'; c.beginPath(); c.arc(0.92 * L, -0.15 * u, 0.15 * u, 0, 7); c.fill();
  },
  san(c, L, u) {
    c.beginPath(); c.moveTo(0.02 * L, 0); c.lineTo(0.08 * L, -0.14 * u); c.quadraticCurveTo(0.42 * L, -0.55 * u, 0.6 * L, -0.95 * u); c.lineTo(0.7 * L, -0.2 * u); c.lineTo(0.7 * L, 0.2 * u); c.lineTo(0.6 * L, 0.95 * u); c.quadraticCurveTo(0.42 * L, 0.55 * u, 0.08 * L, 0.14 * u); c.closePath();
    c.fillStyle = lg(c, -u, u, [[0, '#F06A5C'], [0.5, '#C0392B'], [1, '#7A1E15']]); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(0.1 * L, k * 0.1 * u); c.lineTo(0.64 * L, k * 1.3 * u); c.stroke(); }
    c.fillStyle = '#F2C14E'; c.fillRect(0.42 * L, -0.45 * u, 0.04 * L, 0.9 * u);
    c.fillStyle = '#9AA0A6'; c.fillRect(0.7 * L, -0.12 * u, 0.16 * L, 0.24 * u);
    c.strokeStyle = '#6B4226'; c.lineWidth = Math.max(2, u * 0.42); c.lineCap = 'round'; c.beginPath(); c.moveTo(0.85 * L, 0); c.lineTo(0.9 * L, 0); c.arc(0.9 * L, 0.65 * u, 0.65 * u, -Math.PI / 2, Math.PI / 2); c.stroke(); c.lineCap = 'butt';
  },
  fagun(c, L, u) {
    rr(c, 0.02 * L, -0.65 * u, 0.96 * L, 1.3 * u, 0.65 * u); c.fillStyle = lg(c, -0.65 * u, 0.65 * u, [[0, '#F7D38E'], [0.5, '#D99A45'], [1, '#8E561E']]); c.fill();
    c.fillStyle = 'rgba(255,236,190,.75)'; for (let i = 0; i < 6; i++) { c.save(); c.translate((0.12 + i * 0.14) * L, -0.08 * u); c.rotate(-0.5); c.beginPath(); c.ellipse(0, 0, 0.55 * u, 0.13 * u, 0, 0, 7); c.fill(); c.restore(); }
  },
  jitui(c, L, u) {
    c.fillStyle = '#F4EEDC'; c.fillRect(0.52 * L, -0.28 * u, 0.4 * L, 0.56 * u);
    for (const y of [-0.36, 0.36]) { c.beginPath(); c.arc(0.94 * L, y * u, 0.38 * u, 0, 7); c.fill(); }
    c.beginPath(); c.moveTo(0.56 * L, -0.38 * u); c.bezierCurveTo(0.45 * L, -1.6 * u, 0.04 * L, -1.7 * u, 0.03 * L, 0); c.bezierCurveTo(0.04 * L, 1.7 * u, 0.45 * L, 1.6 * u, 0.56 * L, 0.38 * u); c.closePath();
    c.fillStyle = lg(c, -1.6 * u, 1.6 * u, [[0, '#F0B46A'], [0.5, '#B8692B'], [1, '#6E3612']]); c.fill();
    c.fillStyle = 'rgba(255,240,200,.45)'; c.beginPath(); c.ellipse(0.22 * L, -0.7 * u, 0.12 * L, 0.3 * u, -0.2, 0, 7); c.fill();
  },
  suanpan(c, L, u) {
    rr(c, 0.06 * L, -1.35 * u, 0.64 * L, 2.7 * u, 0.2 * u); c.fillStyle = WOOD(c, 1.35 * u); c.fill();
    c.fillStyle = '#2B1A10'; c.fillRect(0.08 * L, -1.15 * u, 0.6 * L, 2.3 * u);
    c.fillStyle = '#7A4A26'; c.fillRect(0.08 * L, -0.55 * u, 0.6 * L, 0.2 * u);
    const n = 7; for (let i = 0; i < n; i++) { const x = (0.12 + i * 0.52 / (n - 1)) * L; c.fillStyle = '#C9A66B'; c.fillRect(x - 0.5, -1.15 * u, 1, 2.3 * u);
      c.fillStyle = i % 2 ? '#B5482E' : '#E0B04A'; c.beginPath(); c.ellipse(x, -0.85 * u, 0.28 * u, 0.2 * u, 0, 0, 7); c.fill();
      for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(x, (0.05 + k * 0.42 + (i % 3 === 0 ? 0 : 0.1)) * u, 0.28 * u, 0.2 * u, 0, 0, 7); c.fill(); } }
    rr(c, 0.7 * L, -0.3 * u, 0.28 * L, 0.6 * u, 0.3 * u); c.fillStyle = WOOD(c, 0.3 * u); c.fill();
  },
  tanghulu(c, L, u) {
    c.fillStyle = '#D9B98A'; c.fillRect(0, -0.12 * u, 0.99 * L, 0.24 * u);
    for (let i = 0; i < 6; i++) { const x = (0.07 + i * 0.1) * L, r = 0.78 * u, y = (i % 2 ? 0.08 : -0.08) * u;
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#FF9A8A'); g.addColorStop(0.6, '#D9332B'); g.addColorStop(1, '#8E1510');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.12, -0.6, 0, 7); c.fill(); }
  },
  jita(c, L, u) {
    c.fillStyle = '#7A4A26'; c.fillRect(0.3 * L, -0.28 * u, 0.56 * L, 0.56 * u);
    c.fillStyle = '#C9A66B'; for (let x = 0.34; x < 0.86; x += 0.05) c.fillRect(x * L, -0.28 * u, 1, 0.56 * u);
    rr(c, 0.85 * L, -0.48 * u, 0.13 * L, 0.96 * u, 0.2 * u); c.fillStyle = '#222'; c.fill();
    c.fillStyle = '#DDD'; for (const y of [-0.3, 0.3]) for (const x of [0.88, 0.93]) { c.beginPath(); c.arc(x * L, y * u, 0.1 * u, 0, 7); c.fill(); }
    c.beginPath(); c.arc(0.12 * L, -0.45 * u, 1.05 * u, 0, 7); c.arc(0.21 * L, 0.45 * u, 1.2 * u, 0, 7); c.fillStyle = lg(c, -1.5 * u, 1.6 * u, [[0, '#FF6B6B'], [0.5, '#D62828'], [1, '#7A0E0E']]); c.fill();
    c.fillRect(0.1 * L, -0.6 * u, 0.12 * L, 1.2 * u);
    c.fillStyle = '#F4F4F4'; rr(c, 0.15 * L, -0.15 * u, 0.12 * L, 0.9 * u, 0.3 * u); c.fill();
    c.fillStyle = '#222'; c.fillRect(0.17 * L, -0.25 * u, 0.03 * L, 0.5 * u); c.fillRect(0.23 * L, -0.25 * u, 0.03 * L, 0.5 * u);
    c.strokeStyle = 'rgba(230,230,230,.8)'; c.lineWidth = 0.8; for (const y of [-0.15, -0.05, 0.05, 0.15]) { c.beginPath(); c.moveTo(0.15 * L, y * u); c.lineTo(0.88 * L, y * u); c.stroke(); }
  },
  qian(c, L, u) {
    const r = 0.62 * u, n = Math.max(3, Math.floor(0.72 * L / (r * 1.7)));
    c.strokeStyle = '#B3261E'; c.lineWidth = Math.max(1, u * 0.1); c.beginPath(); c.moveTo(0, 0); c.lineTo(0.75 * L, 0); c.stroke();
    for (let i = 0; i < n; i++) { const x = 0.72 * L - r - i * (0.72 * L - r) / (n - 0.6);
      c.fillStyle = lg(c, -r, r, [[0, '#FFE6A0'], [0.5, '#C99A45'], [1, '#6E4F1B']]); c.beginPath(); c.arc(x, 0, r, 0, 7); c.fill();
      c.fillStyle = '#4A320E'; const hs = r * 0.32; c.fillRect(x - hs, -hs, hs * 2, hs * 2); }
    rr(c, 0.74 * L, -0.38 * u, 0.22 * L, 0.76 * u, 0.2 * u); c.fillStyle = '#B3261E'; c.fill();
    c.strokeStyle = '#7A1410'; c.lineWidth = 1; for (let x = 0.76 * L; x < 0.95 * L; x += Math.max(4, u * 0.4)) { c.beginPath(); c.moveTo(x, -0.38 * u); c.lineTo(x + u * 0.3, 0.38 * u); c.stroke(); }
  },
  jingu(c, L, u) {
    rr(c, 0.02 * L, -0.42 * u, 0.96 * L, 0.84 * u, 0.42 * u); c.fillStyle = lg(c, -0.42 * u, 0.42 * u, [[0, '#FF6B5B'], [0.5, '#C0201A'], [1, '#6E0E0A']]); c.fill();
    const gold = lg(c, -0.5 * u, 0.5 * u, [[0, '#FFF1B0'], [0.5, '#D9A93F'], [1, '#7A5A10']]);
    for (const x of [0.02, 0.85]) { rr(c, x * L, -0.5 * u, 0.13 * L, 1.0 * u, 0.3 * u); c.fillStyle = gold; c.fill(); c.strokeStyle = 'rgba(90,60,0,.5)'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo((x + k * 0.032) * L, -0.5 * u); c.lineTo((x + k * 0.032) * L, 0.5 * u); c.stroke(); } }
  },
  maton(c, L, u) {
    rr(c, 0.2 * L, -0.25 * u, 0.79 * L, 0.5 * u, 0.25 * u); c.fillStyle = WOOD(c, 0.3 * u); c.fill();
    c.beginPath(); c.moveTo(0.23 * L, -1.35 * u); c.quadraticCurveTo(-0.02 * L, -1.45 * u, 0.02 * L, 0); c.quadraticCurveTo(-0.02 * L, 1.45 * u, 0.23 * L, 1.35 * u); c.closePath();
    c.fillStyle = lg(c, -1.4 * u, 1.4 * u, [[0, '#FF8A7D'], [0.5, '#E84A3C'], [1, '#8E1A10']]); c.fill();
    c.fillStyle = '#9E1B12'; c.fillRect(0.21 * L, -1.35 * u, 0.025 * L, 2.7 * u);
  },
  bangbang(c, L, u) {
    const r = Math.min(1.9 * u, 0.17 * L), cx = 0.18 * L, cols = ['#FF4D4D', '#FF9F1C', '#FFE14D', '#4CD964', '#3DA5FF', '#9B59FF'];
    c.fillStyle = '#F5F5F5'; rr(c, cx + r * 0.85, -0.18 * u, 0.8 * L - r * 0.85, 0.36 * u, 0.18 * u); c.fill();
    for (let k = 6; k >= 1; k--) { c.fillStyle = cols[k % 6]; c.beginPath(); c.arc(cx, 0, r * k / 6, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.5, u * 0.18); c.beginPath(); for (let a = 0; a < 14; a += 0.2) { const rad = r * a / 14, x = cx + Math.cos(a) * rad, y = Math.sin(a) * rad; if (a) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    c.fillStyle = '#FF6FB5'; c.beginPath(); c.moveTo(cx + r, 0); c.lineTo(cx + r + 0.5 * u, -0.6 * u); c.lineTo(cx + r + 0.5 * u, 0.6 * u); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx - r * 0.35, -r * 0.4, r * 0.35, r * 0.16, -0.6, 0, 7); c.fill();
  },
  dianzuan(c, L, u, s) {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0.38 * L, -0.28 * u); c.lineTo(0.38 * L, 0.28 * u); c.closePath(); c.fillStyle = metal(c, s, 0.4 * u); c.fill();
    c.strokeStyle = 'rgba(40,40,40,.55)'; c.lineWidth = 1; for (let x = 0.05 * L; x < 0.37 * L; x += Math.max(4, u * 0.45)) { const hg = 0.28 * u * x / (0.38 * L); c.beginPath(); c.moveTo(x, -hg); c.lineTo(x + u * 0.25, hg); c.stroke(); }
    rr(c, 0.36 * L, -0.5 * u, 0.1 * L, 1.0 * u, 0.15 * u); c.fillStyle = '#333'; c.fill();
    rr(c, 0.62 * L, 0.4 * u, 0.13 * L, 1.7 * u, 0.2 * u); c.fillStyle = '#222'; c.fill();
    rr(c, 0.58 * L, 1.95 * u, 0.22 * L, 0.6 * u, 0.15 * u); c.fillStyle = '#F2C14E'; c.fill();
    rr(c, 0.45 * L, -0.75 * u, 0.4 * L, 1.4 * u, 0.4 * u); c.fillStyle = lg(c, -0.75 * u, 0.65 * u, [[0, '#FFE08A'], [0.5, '#F2C14E'], [1, '#A87A10']]); c.fill();
    c.fillStyle = '#222'; c.fillRect(0.66 * L, -0.75 * u, 0.12 * L, 1.4 * u);
    c.fillStyle = '#E5483B'; c.fillRect(0.6 * L, 0.55 * u, 0.025 * L, 0.45 * u);
  },
  jianpan(c, L, u) {
    rr(c, 0.03 * L, -1.0 * u, 0.9 * L, 2.0 * u, 0.25 * u); c.fillStyle = '#2A2D34'; c.fill();
    const rows = 3, cols = 12, kw = 0.84 * L / cols, kh = 1.8 * u / rows, rgb = ['#FF4D4D', '#FF9F1C', '#FFE14D', '#4CD964', '#3DA5FF', '#9B59FF'];
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols - (r === 2 ? 4 : 0); k++) { const x = 0.06 * L + k * kw + (r === 2 ? kw * 2 : 0); rr(c, x + 1, -0.9 * u + r * kh + 1, kw - 2, kh - 2, 2); c.fillStyle = '#4A4F5A'; c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 1, -0.9 * u + r * kh + 1, kw - 2, 1.5); }
    rr(c, 0.06 * L + kw * 2 + 1, -0.9 * u + 2 * kh + 1, kw * 8 - 2, kh - 2, 2); c.fillStyle = '#5D636F'; c.fill();
    c.strokeStyle = '#111'; c.lineWidth = Math.max(1.5, u * 0.15); c.beginPath(); c.moveTo(0.93 * L, 0); c.quadraticCurveTo(0.98 * L, 0, L, 0.7 * u); c.stroke();
    c.globalAlpha = 0.5; for (let k = 0; k < cols; k++) { c.fillStyle = rgb[k % 6]; c.fillRect(0.06 * L + k * kw + 1, 0.88 * u, kw - 2, 1.5); } c.globalAlpha = 1;
  },
};
// renders a weapon through an offscreen canvas so overlays (heat, white flash, silhouette) follow any outline
const off = document.createElement('canvas'), octx = off.getContext('2d');
const off2 = document.createElement('canvas'), octx2 = off2.getContext('2d');
const RUNES = ['天', '道', '神', '龙', '玄', '灵', '金', '雷'];
function renderWeapon(c, s, X, Y, L, u, o = {}) {
  const st = o.sil ? 0 : stageOf(s.level), t0 = o.t || 0;
  if (st >= 3) { const k = o.icon ? 1.08 : 1.18; X -= L * (k - 1) / 2; L *= k; u *= k; } // ascended forms grow
  if (st >= 3 && !o.icon) drawWings(c, X + L * 0.42, Y, L, u, t0, o.alpha ?? 1);
  const pad = u * 2, w = L + pad * 2, h = u * 9.5, d = o.dpr || Math.min(devicePixelRatio || 1, 2);
  off.width = Math.ceil(w * d); off.height = Math.ceil(h * d);
  octx.setTransform(d, 0, 0, d, 0, 0); octx.clearRect(0, 0, w, h);
  octx.save(); octx.translate(pad, h / 2); (WDRAW[s.shape] || WDRAW.jian)(octx, L, u, s, o.t || 0); octx.restore();
  octx.globalCompositeOperation = 'source-atop';
  if (o.sil) { octx.fillStyle = '#2E2723'; octx.fillRect(0, 0, w, h); }
  else {
    if (o.heat > 0.02) { octx.fillStyle = `rgba(255,${(120 + 80 * o.heat) | 0},40,${o.heat * 0.5})`; octx.fillRect(0, 0, w, h); }
    if (st >= 2) { const gg = octx.createLinearGradient(0, 0, w, 0), ph = (t0 / 1600) % 1; // spirit wash; ascended forms get a moving rainbow sheen
      if (st >= 3) ['#FF8FD8', '#FFE38A', '#8FFFD2', '#8FC8FF', '#D9A2FF', '#FF8FD8'].forEach((col, i) => gg.addColorStop(((i / 5) + ph) % 1, col));
      else { const tc = tierOf(s.level).color; gg.addColorStop(0, tc); gg.addColorStop(0.5, '#FFFFFF'); gg.addColorStop(1, tc); }
      octx.globalAlpha = st >= 3 ? 0.42 : 0.26; octx.fillStyle = gg; octx.fillRect(0, 0, w, h); octx.globalAlpha = 1; }
    if (o.white > 0.01) { octx.fillStyle = `rgba(255,255,255,${o.white})`; octx.fillRect(0, 0, w, h); }
  }
  octx.globalCompositeOperation = 'source-over';
  const tier = tierOf(s.level);
  if (st >= 1) { // gold (or white-gold) outline around any silhouette: tint a copy and stamp it around the weapon
    off2.width = off.width; off2.height = off.height; octx2.setTransform(1, 0, 0, 1, 0, 0); octx2.clearRect(0, 0, off2.width, off2.height);
    octx2.drawImage(off, 0, 0); octx2.globalCompositeOperation = 'source-in'; octx2.fillStyle = st >= 3 ? '#FFF6D0' : st >= 2 ? '#E2C2FF' : '#F2C14E'; octx2.fillRect(0, 0, off2.width, off2.height); octx2.globalCompositeOperation = 'source-over';
    const r1 = Math.max(1, u * (st >= 3 ? 0.16 : 0.1)); c.save(); c.globalAlpha = (o.alpha ?? 1) * 0.95;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.drawImage(off2, X - pad + Math.cos(a) * r1, Y - h / 2 + Math.sin(a) * r1, w, h); }
    c.restore();
  }
  c.save(); c.globalAlpha = o.alpha ?? 1;
  if (!o.sil && s.level >= 5) { c.shadowColor = tier.color; c.shadowBlur = Math.min(46, 6 + s.level * 1.1) * (o.glow ?? 1) * (0.85 + 0.15 * Math.sin((o.t || 0) / 300)); }
  c.drawImage(off, X - pad, Y - h / 2, w, h);
  c.restore();
  if (st >= 2 && o.motes !== false) { // spirit wisps orbit the blade
    const n = st >= 3 ? 6 : 3;
    for (let i = 0; i < n; i++) { const a = t0 / 700 + i * 6.283 / n, x = X + L * 0.42 + Math.cos(a) * L * 0.46, y = Y + Math.sin(a * 1.3) * u * 2.6;
      const rg = c.createRadialGradient(x, y, 0, x, y, u * 0.9); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(1, st >= 3 ? 'rgba(255,200,120,0)' : 'rgba(182,128,236,0)');
      c.fillStyle = rg; c.globalAlpha = o.alpha ?? 1; c.beginPath(); c.arc(x, y, u * 0.9, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
  if (st >= 3 && o.motes !== false) { // halo + orbiting runes for the final form
    c.save(); c.globalAlpha = (o.alpha ?? 1) * (0.7 + 0.3 * Math.sin(t0 / 300)); c.strokeStyle = '#FFE9A8'; c.lineWidth = Math.max(2, u * 0.18); c.shadowColor = '#FFD27A'; c.shadowBlur = 18;
    c.beginPath(); c.ellipse(X + L * 0.42, Y - u * 3.2, L * 0.16, u * 0.7, 0, 0, 7); c.stroke(); c.restore();
    c.save(); c.font = `400 ${Math.max(10, u * 1.1)}px "Ma Shan Zheng", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    RUNES.forEach((ch, i) => { const a = -t0 / 1400 + i * 6.283 / RUNES.length; c.fillStyle = '#FFE9A8'; c.globalAlpha = (o.alpha ?? 1) * (0.55 + 0.45 * Math.sin(t0 / 250 + i)); c.fillText(ch, X + L * 0.42 + Math.cos(a) * L * 0.6, Y + Math.sin(a) * u * 3.4); });
    c.restore();
  }
  if (!o.sil && s.level >= 30 && o.motes !== false) {
    const n = Math.min(14, 4 + ((s.level - 30) >> 2)), t = o.t || 0;
    for (let i = 0; i < n; i++) { const a = t / 900 + i * 6.283 / n; c.fillStyle = tier.color; c.globalAlpha = (o.alpha ?? 1) * (0.5 + 0.5 * Math.sin(t / 200 + i)); c.beginPath(); c.arc(X + L * 0.4 + Math.cos(a) * L * 0.5, Y + Math.sin(a) * u * 2.4, Math.max(1.2, u * 0.12), 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
}
function drawWings(c, cx, cy, L, u, t, alpha) { // ascended forms: two fans of light feathers behind the weapon
  c.save(); c.globalAlpha = alpha * 0.85;
  for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
    const flap = Math.sin(t / 420) * 0.12, a = -Math.PI / 2 + side * (0.35 + k * 0.17 + flap), len = L * (0.42 - k * 0.025);
    const x2 = cx + Math.cos(a) * len, y2 = cy - u + Math.sin(a) * len * 0.62, g = c.createLinearGradient(cx, cy, x2, y2);
    g.addColorStop(0, 'rgba(255,240,200,.0)'); g.addColorStop(0.5, 'rgba(255,236,180,.55)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
    c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy - u); c.quadraticCurveTo((cx + x2) / 2 + side * u * 1.2, (cy + y2) / 2 - u, x2, y2); c.quadraticCurveTo((cx + x2) / 2, (cy + y2) / 2 + u * 0.8, cx, cy - u * 0.4); c.fill();
  }
  c.restore();
}
function drawEvo(cvs, s, sil, t) { // bigger, animated rendering with wings and runes, for the evolution tree
  const r = cvs.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), w = r.width || 300, h = r.height || 96;
  if (cvs.width !== Math.round(w * d)) { cvs.width = Math.round(w * d); cvs.height = Math.round(h * d); }
  const c = cvs.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
  const ext = WP[s.shape].ext, L = w * 0.82, u = Math.max(3, Math.min(L * 0.06, (h * 0.6) / (ext[0] + ext[1])));
  renderWeapon(c, s, (w - L) / 2, h / 2 + (ext[0] - ext[1]) * u / 2 + (stageOf(s.level) >= 3 && !sil ? u * 0.8 : 0), L, u, { sil, glow: 0.6, t, dpr: d });
}
function drawIcon(cvs, s, sil = false) {
  if (!cvs) return;
  const r = cvs.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), w = r.width || 100, h = r.height || 40;
  cvs.width = Math.round(w * d); cvs.height = Math.round(h * d);
  const c = cvs.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
  const ext = WP[s.shape].ext, L = w * 0.86, u = Math.max(3, Math.min(L * 0.06, (h * 0.86) / (ext[0] + ext[1])));
  renderWeapon(c, s, (w - L) / 2, h / 2 + (ext[0] - ext[1]) * u / 2, L, u, { sil, glow: 0.35, motes: false, dpr: d, icon: true });
}

// ---------- scene ----------
const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, infoBottom = 110;
function resize() {
  const r = cv.parentElement.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
  const ib = document.querySelector('.sinfo').getBoundingClientRect(); infoBottom = ib.bottom - r.top;
  if (run) render();
}
new ResizeObserver(resize).observe(cv.parentElement);
const embers = Array.from({ length: 28 }, () => ({ x: R(), y: R(), v: 0.02 + R() * 0.05, s: 1 + R() * 2, p: R() * 6 }));
const pop2 = document.createElement('div'); pop2.className = 'pop'; pop2.style.cssText = 'top:76%;font-size:16px'; $('#scene').appendChild(pop2);
// game feel: hit-stop, shake, white flash, debris, squash & stretch, hammer trail, rising combo pitch, slow-mo + zoom on big moments
const fx = {
  parts: [], chips: [], shards: [], shake: 0, heat: 0, flash: 0, white: 0, sq: 0, born: 0, ghost: null,
  gt: 0, stopUntil: 0, slowUntil: 0, zoom: 1, zoomTo: 1, swing: null, pending: null, phi: null,
  strike(ev) { if (this.pending) this.impact(); this.pending = ev; this.swing = { t0: this.gt, phi0: this.phi }; needle(ev.roll, ev.seg); },
  impact() {
    const ev = this.pending; this.pending = null; if (!ev) return; const { r } = ev;
    const g = geo(), x = g.hx, y = g.hitY;
    const conf = { keep: [10, '#FF9D4D', 0.15, 30], succ: [24, '#FFD27A', 0.35, 45], great: [60, '#FFF3B0', 0.8, 95], dmg: [16, '#FF6A3D', 0.5, 60], brk: [36, '#FF4D2E', 1, 120] }[r];
    const now = performance.now();
    this.stopUntil = now + (REDUCE ? 0 : conf[3]);
    for (let i = 0; i < conf[0] * (REDUCE ? 0.4 : 1); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.6, sp = 120 + R() * (r === 'great' ? 520 : 340); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0.5 + R() * 0.6, c: R() < 0.3 && run ? tierOf(run.sword.level).color : conf[1], s: 1.5 + R() * 2 }); }
    for (let i = 0; i < (r === 'keep' ? 3 : 7); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.2, sp = 90 + R() * 220; this.chips.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: R() * 6, vr: (R() - 0.5) * 20, l: 1.6, s: 2 + R() * 3, c: '#6E6560' }); }
    this.heat = Math.min(1, this.heat + conf[2]); this.shake = REDUCE ? 0 : conf[2] * (r === 'brk' ? 1.5 : 0.9);
    this.white = 1; this.sq = 1;
    if (r === 'great') this.flash = 0.35;
    if (!REDUCE && (r === 'brk' || ev.tierUp)) { this.slowUntil = now + 520; this.zoomTo = 1.14; }
    if (r === 'brk' && this.ghost) {
      const n = 10, col = WP[this.ghost.shape].col; for (let i = 0; i < n; i++) this.shards.push({ x: g.x0 + g.L * (i + 0.5) / n, y: g.y, vx: (R() - 0.5) * 460, vy: -180 - R() * 340, rot: R() * 6, vr: (R() - 0.5) * 16, w: g.L / n, h: g.u * 1.2, l: 1.3, c: col });
      this.ghost = null;
    }
    const txt = { succ: [T('成功 +', 'Success +') + ev.delta, '#8BD06A'], great: [T('大成功！+', 'GREAT! +') + ev.delta, '#F2C14E'], keep: [T('无变化', 'No change'), '#A8988A'], dmg: [ev.delta ? T('受损 -1', 'Damaged -1') : T('受损', 'Damaged'), '#F08A3C'], brk: [T('碎了', 'SHATTERED'), '#E5483B'] }[r];
    this.pop(ev.tierUp ? tierOf(ev.level).name + '!' : txt[0], ev.tierUp ? tierOf(ev.level).color : txt[1], r === 'great' || r === 'brk' || ev.tierUp);
    if (ev.note) this.pop2(typeof ev.note === 'function' ? ev.note() : ev.note, '#F2C14E'); else if (ev.nearBreak) this.pop2(T('好险！差一点就碎了', 'Close call!'), '#F08A3C');
    if (ev.feverStart) setTimeout(() => this.feverOn(), 160);
    if (ev.evolved && run) setTimeout(() => this.evolve(run.sword), 220);
    if (ev.broke) this.pop2(T('还有后悔药，点画面上的按钮能救回来', 'You have a Regret Pill: tap the button to undo'), '#B680EC');
    if (ev.lastWarn) this.pop2(T('最后一锤！这一锤会碎', 'Last fever strike: it can break!'), '#FF6A4D');
    else if (ev.feverEnd) this.pop2(r === 'brk' ? T('上头一时爽……', 'Rode it too far…') : T('冷静下来了', 'Cooling down'), '#A8988A');
    sfx(r, ev.streak);
    vib({ keep: 8, succ: 18, great: [25, 30, 60], dmg: 45, brk: [90, 40, 140] }[r]);
  },
  sold(p, big) { const g = geo(); for (let i = 0; i < (big ? 50 : 26); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.8, sp = 200 + R() * 300; this.parts.push({ x: g.cx, y: g.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 0.9 + R() * 0.4, c: '#F2C14E', s: 3, coin: true }); } this.pop('+' + fmt(p), '#F2C14E', true); if (big && !REDUCE) { this.slowUntil = performance.now() + 400; this.zoomTo = 1.08; } },
  feed() { const g = geo(); this.heat = 1; this.flash = 0.2; this.sq = 1; for (let i = 0; i < 40; i++) { const a = R() * 6.283, sp = 60 + R() * 200; this.parts.push({ x: g.x0 + R() * g.L, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, l: 0.8 + R() * 0.5, c: R() < 0.5 ? '#B680EC' : '#FFD27A', s: 2.5 }); } this.pop(T('熔了！', 'Smelted!'), '#B680EC', true); },
  feverOn() {
    const g = geo(); this.flash = 0.4; this.heat = 1; if (!REDUCE) { this.slowUntil = performance.now() + 600; this.zoomTo = 1.12; this.shake = 1; }
    for (let i = 0; i < 80; i++) { const a = R() * 6.283, sp = 150 + R() * 380; this.parts.push({ x: g.cx, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, l: 0.9 + R() * 0.6, c: R() < 0.5 ? '#FFD23F' : '#FF7A1A', s: 3 }); }
    this.pop(T('上头时刻！', 'FEVER!'), '#FFD23F', true); sfx('fever'); vib([40, 30, 40, 30, 120]);
  },
  evolve(sw) {
    const st = stageOf(sw.level), g = geo(), big = st >= 3;
    this.flash = big ? 0.7 : 0.45; this.heat = 1; if (!REDUCE) { this.slowUntil = performance.now() + (big ? 1100 : 700); this.zoomTo = big ? 1.22 : 1.14; this.shake = big ? 1.4 : 0.8; }
    const cols = big ? ['#FFFFFF', '#FFE38A', '#FF8FD8', '#8FE8FF'] : st === 2 ? ['#B680EC', '#FFFFFF', '#8FE8FF'] : ['#F2C14E', '#FFFFFF'];
    for (let i = 0; i < (big ? 160 : 90); i++) { const a = R() * 6.283, sp = 120 + R() * (big ? 520 : 360); this.parts.push({ x: g.cx, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, l: 1 + R() * 0.8, c: pick(cols), s: big ? 3.5 : 2.5 }); }
    this.pop(T('进化！', 'EVOLVED!') + formName(sw.shape, sw.level), big ? '#FFE38A' : st === 2 ? '#C9A2FF' : '#F2C14E', true);
    this.pop2(T(STAGES[st][0] + '形态', STAGES[st][1] + ' form'), '#FFFFFF');
    sfx('evolve', st); vib(big ? [60, 40, 60, 40, 200] : [40, 30, 90]);
  },
  regret() { const g = geo(); this.flash = 0.25; for (let i = 0; i < 50; i++) { const a = R() * 6.283, sp = 80 + R() * 240; this.parts.push({ x: g.cx + Math.cos(a) * 140, y: g.y + Math.sin(a) * 60, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, l: 0.6 + R() * 0.4, c: R() < 0.5 ? '#B680EC' : '#E8D8FF', s: 2.5 }); } this.pop(T('后悔药！回来了', 'Regret Pill: it is back!'), '#C9A2FF', true); sfx('rare', 2); },
  reveal(r, name) {
    const rq = RARITY[r]; this.pop2((r >= 4 ? T('神话！', 'MYTHIC! ') : r >= 3 ? T('传说！', 'LEGENDARY! ') : T('稀有！', 'Rare! ')) + name, rq.color);
    if (r >= 3) { const g = geo(); this.flash = 0.25; if (!REDUCE) { this.slowUntil = performance.now() + 450; this.zoomTo = 1.1; }
      for (let i = 0; i < (r >= 4 ? 90 : 50); i++) { const a = R() * 6.283, sp = 120 + R() * 320; this.parts.push({ x: g.cx, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, l: 0.8 + R() * 0.6, c: R() < 0.6 ? rq.color : '#FFFFFF', s: 2.5 }); }
      sfx('rare', r); vib(r >= 4 ? [40, 40, 40, 40, 120] : [30, 40, 80]); }
    else sfx('succ', 3);
  },
  pop(t, c, big) { const el = $('#pop'); el.textContent = t; el.style.color = c; el.classList.toggle('big', !!big); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); },
  pop2(t, c) { pop2.textContent = t; pop2.style.color = c; pop2.classList.remove('go'); void pop2.offsetWidth; pop2.classList.add('go'); },
};
let needleT = 0;
function needle(roll, seg) {
  const n = $('#needle'), bar = $('#obar'); if (!n) return;
  n.style.left = (clamp(roll, 0.005, 0.995) * 100) + '%';
  const segs = bar.querySelectorAll('i'); segs.forEach((el) => el.classList.remove('hit')); if (segs[seg]) segs[seg].classList.add('hit');
  clearTimeout(needleT); needleT = setTimeout(() => segs.forEach((el) => el.classList.remove('hit')), 260);
}
function geo() {
  const cx = W / 2, top = H * 0.72, L = Math.min(W * 0.84, 560), lvl = run ? run.sword.level : 0, ti = tierOf(lvl).idx;
  const u = Math.min(24, 10 + ti * 1.5 + Math.min(lvl, 40) * 0.07), ext = run ? WP[run.sword.shape].ext : [1, 1];
  const x0 = cx - L / 2, y = top - 3 - ext[1] * u;
  return { cx, top, L, u, x0, y, hx: x0 + L * 0.45, hitY: y - ext[0] * u };
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
// hammer: swung by a smith off-screen to the right; rotates about the hand: rest → wind-up → slam → recover
const HL = 54, HT = 26;
function hammerPose(g) {
  const Lh = Math.max(170, W - g.hx + 40), P = { x: g.hx + Lh, y: g.hitY - HL / 2 };
  const room = P.y - (infoBottom + 6 + HL / 2);
  const rest = clamp(Math.asin(clamp(room / Lh, 0, 0.9)), 0.05, 0.42), wind = Math.min(rest + 0.5, 1.15);
  return { Lh, P, rest, wind };
}
function phiAt(hp) {
  const sw = fx.swing; if (!sw) return hp.rest;
  const fast = run && run.fever > 0, t = fx.gt - sw.t0, from = sw.phi0 ?? hp.rest, A = fast ? 40 : 55, B = fast ? 78 : 100, C = fast ? 220 : 290;
  if (t < A) { const k = t / A; return from + (hp.wind - from) * (1 - (1 - k) * (1 - k)); }
  if (t < B) { const k = (t - A) / (B - A); return hp.wind * (1 - k * k); }
  if (fx.pending) fx.impact();
  if (t < C) { const k = (t - B) / (C - B); return hp.rest * (1 - (1 - k) * (1 - k)); }
  fx.swing = null; return hp.rest;
}
function drawHammerAt(hp, phi, alpha, squash) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(hp.P.x, hp.P.y); ctx.rotate(phi);
  ctx.fillStyle = '#6B4A33'; ctx.fillRect(-hp.Lh, -5, hp.Lh + 60, 10);
  ctx.fillStyle = '#86603F'; ctx.fillRect(-hp.Lh, -5, hp.Lh + 60, 3);
  ctx.fillStyle = '#2E2A28'; ctx.fillRect(-hp.Lh + HT / 2, -7, 10, 14);
  ctx.translate(-hp.Lh, 0); ctx.scale(1 + 0.12 * squash, 1 - 0.14 * squash);
  ctx.fillStyle = '#3D3936'; ctx.fillRect(-HT / 2, -HL / 2, HT, HL);
  ctx.fillStyle = '#5A5450'; ctx.fillRect(-HT / 2, -HL / 2, 5, HL);
  ctx.fillStyle = '#7D7671'; ctx.fillRect(-HT / 2, HL / 2 - 5, HT, 5); ctx.fillRect(-HT / 2, -HL / 2, HT, 4);
  ctx.restore();
}
function frame(now) {
  const real = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
  const scale = now < fx.stopUntil ? 0 : now < fx.slowUntil ? 0.3 : 1, dt = real * scale;
  fx.gt += dt * 1000;
  if (now >= fx.slowUntil) fx.zoomTo = 1;
  fx.zoom += (fx.zoomTo - fx.zoom) * Math.min(1, real * 10);
  if (W && H) {
    const g = geo();
    ctx.save();
    if (fx.shake > 0) ctx.translate((R() - 0.5) * 7 * fx.shake, (R() - 0.3) * 16 * fx.shake);
    if (fx.zoom > 1.001) { ctx.translate(g.cx, g.y); ctx.scale(fx.zoom, fx.zoom); ctx.translate(-g.cx, -g.y); }
    ctx.fillStyle = '#130F0D'; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let r = 0, y = 0; y < g.top; r++, y += 26) for (let x = (r % 2) * -30; x < W; x += 60) ctx.fillRect(x + 2, y + 2, 56, 22);
    const glow = ctx.createRadialGradient(g.cx, H * 1.05, 10, g.cx, H * 1.05, H * 0.95);
    glow.addColorStop(0, `rgba(255,106,26,${0.32 + fx.heat * 0.25})`); glow.addColorStop(1, 'rgba(255,106,26,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    for (const e of embers) { e.y -= e.v * dt; if (e.y < -0.05) { e.y = 1.05; e.x = R(); } ctx.fillStyle = `rgba(255,${(140 + 60 * Math.sin(now / 300 + e.p)) | 0},60,${0.35 + 0.3 * Math.sin(now / 400 + e.p)})`; ctx.fillRect(e.x * W, e.y * H, e.s, e.s); }
    drawAnvil(g);
    if (run) {
      const a = clamp((now - fx.born) / 300, 0, 1);
      if (a > 0) {
        const sy = 1 - 0.2 * fx.sq * Math.cos((1 - fx.sq) * 7), sx = 1 + 0.06 * fx.sq;
        ctx.save(); ctx.translate(g.cx, g.top); ctx.scale(sx, sy); ctx.translate(-g.cx, -g.top);
        renderWeapon(ctx, run.sword, g.x0, g.y, g.L, g.u, { t: now, alpha: a, heat: fx.heat, white: fx.white });
        ctx.restore();
      }
    }
    for (const p of fx.shards) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.rot += p.vr * dt; p.l -= dt; ctx.save(); ctx.globalAlpha = clamp(p.l, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(-p.w / 2, -p.h / 2); ctx.lineTo(p.w / 2, -p.h / 3); ctx.lineTo(p.w / 3, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 3); ctx.fill(); ctx.restore(); }
    fx.shards = fx.shards.filter((p) => p.l > 0);
    for (const p of fx.chips) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1100 * dt; p.rot += p.vr * dt; p.l -= dt; if (p.y > g.top - 1 && p.vy > 0) { p.y = g.top - 1; p.vy *= -0.38; p.vx *= 0.7; p.vr *= 0.6; } ctx.save(); ctx.globalAlpha = clamp(p.l, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore(); }
    fx.chips = fx.chips.filter((p) => p.l > 0);
    if (!run || run.stam > 0 || run.fever > 0 || fx.swing) {
      const hp = hammerPose(g), phi = phiAt(hp);
      const ts = fx.swing ? fx.gt - fx.swing.t0 : -1;
      if (ts > 50 && ts < 112) for (let k = 3; k >= 1; k--) drawHammerAt(hp, phi + 0.07 * k, 0.12 * (4 - k), 0);
      drawHammerAt(hp, phi, 1, fx.sq * 0.8);
      fx.phi = phi;
    } else if (fx.pending) fx.impact();
    for (const p of fx.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.coin ? 700 : 520) * dt; p.l -= dt; ctx.globalAlpha = clamp(p.l * 1.6, 0, 1); ctx.fillStyle = p.c; if (p.coin) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 4 * Math.abs(Math.sin(now / 90 + p.vx)), 0, 0, 7); ctx.fill(); } else ctx.fillRect(p.x, p.y, p.s, p.s); }
    ctx.globalAlpha = 1; fx.parts = fx.parts.filter((p) => p.l > 0 && p.y < H + 20);
    if (run && run.fever > 0) {
      const k = 0.5 + 0.5 * Math.sin(now / 160), vg = ctx.createRadialGradient(g.cx, g.y, Math.min(W, H) * 0.2, g.cx, g.y, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(255,210,63,0)'); vg.addColorStop(1, `rgba(255,170,40,${0.22 + 0.12 * k})`); ctx.fillStyle = vg; ctx.fillRect(-40, -40, W + 80, H + 80);
      if (R() < 0.5) fx.parts.push({ x: R() * W, y: H + 5, vx: (R() - 0.5) * 40, vy: -200 - R() * 220, l: 1.2, c: '#FFD23F', s: 2 });
    }
    if (fx.flash > 0) { ctx.fillStyle = `rgba(255,243,176,${fx.flash})`; ctx.fillRect(-40, -40, W + 80, H + 80); }
    ctx.restore();
  }
  fx.heat = Math.max(0, fx.heat - dt * 0.9); fx.shake = Math.max(0, fx.shake - real * 2.6); fx.flash = Math.max(0, fx.flash - real * 1.2);
  fx.white = Math.max(0, fx.white - real * 11); fx.sq = Math.max(0, fx.sq - dt * 5);
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
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]; // do re mi sol la: each success in a row climbs one step
const comboPitch = (n) => PENTA[(Math.max(1, n) - 1) % 5] * Math.pow(2, Math.min(2, Math.floor((Math.max(1, n) - 1) / 5)));
function sfx(k, streak = 0) {
  if (meta.muted || !ac) return;
  const t = ac.currentTime + 0.01;
  try {
    switch (k) {
      case 'hit': if (run && run.fever > 0) { tone(55, t, 0.22, 'sine', 0.28); noise(t, 0.05, 0.2, 9000, 0.7); } noise(t, 0.08, 0.32, 2600, 0.8); tone(70, t, 0.18, 'sine', 0.18); [1, 2.76, 5.4].forEach((r, i) => tone(400 * r * (1 + R() * 0.02), t, 0.32 - i * 0.08, 'triangle', 0.06)); break;
      case 'succ': { const p = comboPitch(streak); tone(660 * p, t, 0.25, 'sine', 0.09); tone(990 * p, t + 0.06, 0.3, 'sine', 0.06); break; }
      case 'great': { const p = comboPitch(streak); [784, 988, 1175, 1568].forEach((f, i) => tone(f * p, t + i * 0.06, 0.6, 'sine', 0.07)); noise(t, 0.5, 0.05, 6000, 0.5); break; }
      case 'keep': tone(220, t, 0.12, 'triangle', 0.05); break;
      case 'fever': [392, 494, 587, 784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.5, 'sawtooth', 0.035)); [0, 0.12, 0.24, 0.36].forEach((d) => tone(55, t + d, 0.15, 'sine', 0.3)); noise(t, 0.8, 0.08, 5000, 0.4, 12000); break;
      case 'evolve': { const top = streak >= 3; [262, 330, 392, 523, 659, 784, 1046, 1318].slice(0, top ? 8 : 6).forEach((f, i) => tone(f * (top ? 1 : 1.5), t + i * 0.08, 0.9, 'triangle', 0.07)); [0, 0.16, 0.32].forEach((d) => tone(49, t + d, 0.3, 'sine', 0.3)); noise(t, 1.2, 0.08, 4000, 0.4, 14000); break; }
      case 'rare': [523, 659, 784, 1046, 1318, 1568].slice(0, streak >= 4 ? 6 : 5).forEach((f, i) => tone(f, t + i * 0.07, 0.7, 'triangle', 0.07)); noise(t, 0.6, 0.06, 7000, 0.5); break;
      case 'dmg': tone(110, t, 0.35, 'sawtooth', 0.05); noise(t, 0.25, 0.14, 700, 1); break;
      case 'brk': noise(t, 0.7, 0.45, 3000, 0.6, 300); tone(60, t, 0.6, 'sawtooth', 0.08); break;
      case 'coin': [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.045, 0.18, 'square', 0.025)); break;
      case 'day': tone(392, t, 0.4, 'sine', 0.05); tone(523, t + 0.12, 0.5, 'sine', 0.05); break;
      case 'pay': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 'triangle', 0.06)); break;
      case 'fail': [392, 311, 262, 196].forEach((f, i) => tone(f, t + i * 0.16, 0.6, 'sawtooth', 0.035)); break;
    }
  } catch (e) { /* audio is optional */ }
}
function vib(p) { if (!meta.vibe || DEMO || !p) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* not supported */ } }

// ---------- demo autopilot (for trailers: #demo, optional ?w=<weapon id>&lang=en) ----------
function demoTick() {
  if (!run || modalOpen() || fx.swing) return;
  const s = run.sword, o = odds(s), q = quota(), need = q - run.gold;
  if (run.stam <= 0 && !(run.fever > 0)) { if (run.bag.bao) { useItem('bao'); return; } if (run.day >= DAYS && s.level >= 1 && run.gold < q) sell(); rest(); return; }
  const p = priceOf(s), enough = p >= need * 1.05 && need > 0;
  if (s.level >= 1 && !(run.fever > 1) && (o.brk > DEMO_RISK || (enough && o.brk > 0.04))) {
    if (s.level >= 8 && run.rack.length < rackCap() && !enough) { storeSword(); return; }
    if (salesLeft() > 0) { sell(); return; }
    if (run.rack.length < rackCap()) { storeSword(); return; }
  }
  strike();
}
applyStatic();
if (DEMO) {
  meta.seenHelp = true; meta.muted = true;
  const qp = new URLSearchParams(location.search);
  if (qp.get('hb')) DIFF.hard.base = +qp.get('hb'); if (qp.get('hg')) DIFF.hard.growth = +qp.get('hg'); if (qp.get('hk')) DIFF.hard.brk = +qp.get('hk'); if (qp.get('hc') != null) DIFF.hard.sellCap = +qp.get('hc'); // balance sweeps
  hideScreens(); newRun('iron', qp.get('diff') === 'hard' ? 'hard' : 'easy'); if (!qp.get('plain')) run.relics.push('lian', 'yan');
  const w = new URLSearchParams(location.search).get('w'); run.sword = makeSword(WP[w] ? w : 'yu'); setTab('market');
  setInterval(demoTick, 380);
} else if (run) { showTitle(); render(); } else { showTitle(); if (!meta.asked && !meta.runs) welcome(); }
function welcome() {
  openSheet(`<h2>${T('欢迎来到一锤子买卖', 'Welcome to One Hammer Deal')}</h2><p>${T('第一次玩吗？', 'First time here?')}</p><div class="btns"><button class="btn" id="wNew" type="button">${T('我是新手，带我玩一遍', "I'm new, show me how")}</button><button class="btn ghost" id="wOld" type="button">${T('我是老手，直接开始', "I've played, let me in")}</button></div>`);
  $('#wNew').onclick = () => { meta.asked = true; saveMeta(); tutForce = true; startRun(); };
  $('#wOld').onclick = () => { meta.asked = true; meta.tutDone = true; saveMeta(); startRun(); };
}
window.__game = { maskKey, inLang, get run() { return run; }, get meta() { return meta; }, odds, quota, value, fmt, WEAPONS, drawIcon, render, renderWeapon, setLang, market, settle };
})();
