// Balance check: runs the autopilot (#demo) on a fake clock and reports the period each run dies in.
// node tools/sim-balance.js <runs> <diff easy|hard> <risk e.g. 0.16|0.25> [maxPeriod=8] [parallel=4]
const launch = require('./pw');
(async () => {
  const N = +process.argv[2] || 20, diff = process.argv[3] || 'easy', risk = process.argv[4] || '0.16', maxP = +process.argv[5] || 8, par = +process.argv[6] || 4;
  const b = await launch(); const results = [];
  const one = async () => {
    const c = await b.newContext({ viewport: { width: 360, height: 640 } }); const p = await c.newPage();
    await p.clock.install({ time: 0 });
    await p.goto(`http://localhost:8766/index.html?diff=${diff}&risk=${risk}&plain=1${process.env.EXTRA || ""}#demo`, { waitUntil: 'domcontentloaded' });
    let last = 1, steps = 0;
    while (steps++ < 20000) {
      await p.clock.fastForward(400);
      const st = await p.evaluate(() => { const r = window.__game.run; return r ? r.period : 0; });
      if (!st) break; last = st; if (st > maxP) break;
    }
    await c.close(); return last - 1; // periods cleared
  };
  const queue = Array.from({ length: N }, (_, i) => i);
  await Promise.all(Array.from({ length: par }, async () => { while (queue.length) { queue.pop(); results.push(await one()); } }));
  results.sort((a, b) => a - b);
  const by5 = results.filter((x) => x < 5).length / N, by3 = results.filter((x) => x < 3).length / N;
  console.log(JSON.stringify({ diff, risk, N, diedBefore3: by3.toFixed(2), diedBefore5: by5.toFixed(2), median: results[Math.floor(N / 2)], results }));
  await b.close();
})();
