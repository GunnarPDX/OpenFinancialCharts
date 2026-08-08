// Memory profile of the live-ticking chart: post-GC heap samples over time
// (slope = genuine retention growth), allocation-rate estimate, and a heap
// sampling profile naming the top allocation sites.
/* eslint-disable no-console */
const puppeteer = require(require('path').resolve(__dirname, '../node_modules/puppeteer-core'));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const EMA_SRC = `study("Bench EMA", overlay=true)
fast = ema(close, 9)
slow = ema(close, 21)
plot(fast, color="#22d3ee")
plot(slow, color="#f59e0b")`;

const HEAVY_STATE = {
  activeStudies: [
    { key: 1, id: 'bollinger_bands', params: { length: 20, mult: 2 } },
    { key: 2, id: 'macd', params: {} },
    { key: 3, id: 'guppy_mma', params: {} },
    { key: 4, id: 'ichimoku', params: {} },
    { key: 5, id: 'volume_display', params: { height: 70 } },
    { key: 6, id: 'heat_profile', params: { length: 24, sidebar: true } },
    { key: 7, id: 'buy_sell_profile', params: { length: 24, sidebar: true } },
    { key: 8, id: 'hot_zone_levels', params: { length: 24 } },
  ],
  customScripts: [{ id: 1, name: 'Bench EMA', enabled: true, source: EMA_SRC }],
};

const run = async (browser, { label, state, minutes, tps }) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 860 });
  await page.evaluateOnNewDocument((st) => {
    localStorage.clear();
    if (st) localStorage.setItem('ofc-chart-state', JSON.stringify(st));
  }, state);
  await page.goto(`http://localhost:3462/?bench&bars=5000&tps=${tps}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  const sample = async () => page.evaluate(() => {
    window.gc(); window.gc();
    return Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10;
  });

  const samples = [];
  const every = 15000;
  const n = Math.round((minutes * 60000) / every);
  for (let i = 0; i <= n; i++) {
    samples.push(await sample());
    if (i < n) await new Promise(r => setTimeout(r, every));
  }
  const slope = ((samples[samples.length - 1] - samples[0]) / minutes).toFixed(2);
  console.log(`\n--- ${label} ---`);
  console.log(`post-GC heap (MB) every 15s: ${samples.join(', ')}`);
  console.log(`net growth: ${(samples[samples.length - 1] - samples[0]).toFixed(1)} MB over ${minutes} min (${slope} MB/min)`);
  await page.close();
};

const allocProfile = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 860 });
  await page.evaluateOnNewDocument((st) => {
    localStorage.clear();
    localStorage.setItem('ofc-chart-state', JSON.stringify(st));
  }, HEAVY_STATE);
  await page.goto('http://localhost:3462/?bench&bars=5000&tps=200', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  const cdp = await page.createCDPSession();
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
  await new Promise(r => setTimeout(r, 45000));
  const { profile } = await cdp.send('HeapProfiler.stopSampling');

  // flatten the call tree: attribute self-size to each function
  const byFn = new Map();
  const walk = (node) => {
    const name = node.callFrame.functionName || '(anonymous)';
    const url = (node.callFrame.url || '').split('/').pop();
    const key = `${name} [${url}]`;
    byFn.set(key, (byFn.get(key) || 0) + node.selfSize);
    (node.children || []).forEach(walk);
  };
  walk(profile.head);
  const total = [...byFn.values()].reduce((a, b) => a + b, 0);
  console.log(`\n--- allocation sampling, heavy + 200tps, 45s (total sampled ${(total / 1048576).toFixed(0)} MB) ---`);
  [...byFn.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .forEach(([k, v]) => console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${(v / 1048576).toFixed(1).padStart(7)} MB  ${k}`));
  await page.close();
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--js-flags=--expose-gc', '--window-size=1600,1000'],
  });
  try {
    await run(browser, { label: 'bare, 5k bars, 4 ticks/sec', state: null, minutes: 3, tps: 4 });
    await run(browser, { label: 'heavy (8 studies + script), 5k bars, 4 ticks/sec', state: HEAVY_STATE, minutes: 3, tps: 4 });
    await allocProfile(browser);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
