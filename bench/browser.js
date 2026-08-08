// Browser benchmark: drives the production demo build in headless Chrome.
// Metrics per scenario: time to first chart paint, idle FPS, pan FPS (one
// keyboard pan dispatched per frame — measures how fast the full re-render
// loop keeps up), and live-tick idle FPS.
/* eslint-disable no-console */
const puppeteer = require(require('path').resolve(__dirname, '../node_modules/puppeteer-core'));

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3462';

const EMA_SRC = `study("Bench EMA", overlay=true)
fast = ema(close, 9)
slow = ema(close, 21)
plot(fast, color="#22d3ee")
plot(slow, color="#f59e0b")
plotshape(crossover(fast, slow), shape="triangleup", location="belowbar", color="#22c55e")
plotshape(crossunder(fast, slow), shape="triangledown", location="abovebar", color="#ef4444")`;

// 8 studies incl. two sidebar profiles, a pane, ichimoku cloud + an enabled
// theta-script — a realistically maxed-out chart
const HEAVY_STATE = {
  symbol: 'BENCH',
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

const measureFps = (page, { durationMs, panPerFrame }) => page.evaluate(({ durationMs, panPerFrame }) =>
  new Promise((resolve) => {
    let frames = 0;
    const longFrames = [];
    let last = performance.now();
    const start = last;
    const tick = () => {
      const now = performance.now();
      if (frames > 0 && now - last > 32) longFrames.push(Math.round(now - last));
      last = now;
      frames++;
      if (panPerFrame) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      }
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve({
        fps: +(frames / ((now - start) / 1000)).toFixed(1),
        worstFrameMs: longFrames.length ? Math.max(...longFrames) : null,
        framesOver32ms: longFrames.length,
      });
    };
    requestAnimationFrame(tick);
  }), { durationMs, panPerFrame });

const runScenario = async (browser, { label, bars, tps = 0, state = null, zoomIns = 0 }) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 860 });
  await page.evaluateOnNewDocument((st) => {
    try { localStorage.clear(); } catch {}
    if (st) localStorage.setItem('ofc-chart-state', JSON.stringify(st));
    window.__bench = { firstCandle: null };
    const check = () => {
      if (!window.__bench.firstCandle
          && document.querySelectorAll('.ofc-base-content-wrapper svg :is(path, rect, line)').length > 200) {
        window.__bench.firstCandle = performance.now();
        return true;
      }
      return false;
    };
    const poll = () => { if (!check()) requestAnimationFrame(poll); };
    window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(poll));
  }, state);

  const url = `${BASE}/?bench&bars=${bars}${tps ? `&tps=${tps}` : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__bench && window.__bench.firstCandle != null', { timeout: 30000 });
  const firstPaint = await page.evaluate(() => Math.round(window.__bench.firstCandle));

  // settle, then measure
  await new Promise(r => setTimeout(r, 700));
  if (zoomIns > 0) {
    await page.evaluate(async (n) => {
      for (let i = 0; i < n; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
        await new Promise(r => setTimeout(r, 40));
      }
    }, zoomIns);
    await new Promise(r => setTimeout(r, 500));
  }
  const idle = await measureFps(page, { durationMs: 3000, panPerFrame: false });
  const pan = await measureFps(page, { durationMs: 5000, panPerFrame: true });

  const jsHeap = await page.evaluate(() =>
    performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);

  console.log(`\n--- ${label} ---`);
  console.log(`first chart paint: ${firstPaint} ms from navigation`);
  console.log(`idle: ${idle.fps} fps (frames >32ms: ${idle.framesOver32ms})`);
  console.log(`pan (1 pan/frame): ${pan.fps} fps, worst frame ${pan.worstFrameMs ?? '-'} ms, frames >32ms: ${pan.framesOver32ms}`);
  if (jsHeap != null) console.log(`JS heap: ${jsHeap} MB`);
  await page.close();
  return { label, firstPaint, idle, pan, jsHeap };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1600,1000', '--force-device-scale-factor=1'],
  });
  try {
    await runScenario(browser, { label: 'bare / 780 bars (2-day 1m)', bars: 780 });
    await runScenario(browser, { label: 'bare / 5k bars', bars: 5000 });
    await runScenario(browser, { label: 'bare / 20k bars', bars: 20000 });
    await runScenario(browser, { label: 'heavy (8 studies + script + 2 sidebars) / 5k bars', bars: 5000, state: HEAVY_STATE });
    await runScenario(browser, { label: 'heavy / 20k bars', bars: 20000, state: HEAVY_STATE });
    await runScenario(browser, { label: 'heavy / 5k bars, zoomed to ~typical window', bars: 5000, state: HEAVY_STATE, zoomIns: 18 });
    await runScenario(browser, { label: 'live ticks 200/s, bare / 5k bars', bars: 5000, tps: 200 });
    await runScenario(browser, { label: 'live ticks 200/s, heavy / 5k bars', bars: 5000, tps: 200, state: HEAVY_STATE });
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
