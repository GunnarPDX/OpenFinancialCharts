// Micro-benchmarks for the chart's compute-bound hot paths, run against the
// dist/cjs build (Node 22 can require() the ESM theta-script dependency).
/* eslint-disable no-console */
const path = require('path');
const ROOT = require('path').resolve(__dirname, '..');
const { studies } = require(path.join(ROOT, 'dist/cjs/studies/index.js'));
const { normalizeQuotes, applyTicks, candleSizeToMs } = require(path.join(ROOT, 'dist/cjs/utils/quotes.js'));
const { runScript } = require(path.join(ROOT, 'node_modules/theta-script/src/interpreter.js'));

// deterministic random walk (mulberry32) so runs are comparable
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeBars = (n) => {
  const rand = rng(42);
  const bars = [];
  let price = 300;
  const start = Date.UTC(2026, 0, 5, 14, 30);
  for (let i = 0; i < n; i++) {
    const drift = (rand() - 0.5) * 0.6;
    const open = price;
    const close = price + drift;
    const high = Math.max(open, close) + rand() * 0.25;
    const low = Math.min(open, close) - rand() * 0.25;
    bars.push({
      date: new Date(start + i * 60000),
      open, high, low, close,
      volume: Math.round(5000 + rand() * 50000),
      rank: i,
    });
    price = close;
  }
  return bars;
};

const timeIt = (fn, reps = 5) => {
  const times = [];
  for (let i = 0; i < reps; i++) {
    const t0 = process.hrtime.bigint();
    fn();
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)]; // median ms
};

const SIZES = [780, 5000, 20000];
const fmt = (ms) => (ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms.toFixed(2));

for (const n of SIZES) {
  const bars = makeBars(n);
  const series = normalizeQuotes(bars);
  console.log(`\n=== ${n} bars ===`);

  console.log(`normalizeQuotes: ${fmt(timeIt(() => normalizeQuotes(bars)))} ms`);

  // every study, default params — the "user adds everything" worst case
  const perStudy = [];
  let total = 0;
  for (const def of studies) {
    if (!def.compute) continue;
    try {
      const ms = timeIt(() => def.compute(series, { ...def.params }), 3);
      perStudy.push([def.id, ms]);
      total += ms;
    } catch (e) {
      perStudy.push([def.id, NaN]);
      console.log(`  (compute failed: ${def.id}: ${e.message.slice(0, 80)})`);
    }
  }
  console.log(`ALL ${perStudy.length} studies, one pass: ${fmt(total)} ms`);
  const worst = perStudy.filter(([, ms]) => !isNaN(ms)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  worst.forEach(([id, ms]) => console.log(`  slowest: ${id.padEnd(28)} ${fmt(ms)} ms`));

  // side profiles: bucketize the full window at default 24 rows
  let lo = Infinity, hi = -Infinity;
  series.forEach(b => { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high; });
  for (const id of ['volume_profile', 'heat_profile', 'buy_sell_profile', 'acceptance_profile', 'hot_zone_levels']) {
    const def = studies.find(s => s.id === id);
    const ms = timeIt(() => def.profile(series, 24, lo, hi));
    console.log(`profile ${id.padEnd(20)}: ${fmt(ms)} ms`);
  }

  // live tick folding: 1000 ticks batched 4/bar into the last candle
  const intervalMs = candleSizeToMs('1m');
  const lastDate = series[series.length - 1].date;
  const batch = Array.from({ length: 250 }, (_, i) => ([
    { price: 300 + Math.sin(i / 10), time: new Date(+lastDate + 1000 + i * 40), volume: 1e6 + i * 500 },
    500,
  ]));
  console.log(`applyTicks 250-tick batch: ${fmt(timeIt(() => applyTicks(series, batch, intervalMs)))} ms`);

  // theta-script: the demo EMA-cross script end to end
  const src = `study("Bench", overlay=true)
fast = ema(close, 9)
slow = ema(close, 21)
plot(fast, color="#22d3ee")
plot(slow, color="#f59e0b")
plotshape(crossover(fast, slow), shape="triangleup", location="belowbar", color="#22c55e")
plotshape(crossunder(fast, slow), shape="triangledown", location="abovebar", color="#ef4444")`;
  const ms = timeIt(() => {
    const res = runScript(src, series, {});
    if (res.error) throw new Error(res.error);
  });
  console.log(`runScript EMA-cross:       ${fmt(ms)} ms`);
}
