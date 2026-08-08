// Momentum studies — split out of studies.js; defs are verbatim.
import { sma, ema, wma, macdOf, macdHistColor, roc } from './math';

export const momentumStudies = [
  {
    id: 'awesome_oscillator',
    name: 'Awesome Oscillator',
    category: 'Momentum',
    color: '#22c55e',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color'],
    params: { height: 70 },
    info: "Bill Williams' Awesome Oscillator: the 5-period SMA of the bar midpoint minus the 34-period SMA — momentum of the market's driving force around zero.",
    compute: (series) => {
      const med = series.map(d => (d.high + d.low) / 2);
      const fast = sma(med, 5);
      const slow = sma(med, 34);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(fast[i]) || !isFinite(slow[i])) return;
        points.push({ date: d.date, rank: d.rank, value: fast[i] - slow[i] });
      });
      return points;
    },
  },
  {
    id: 'balance_of_power',
    name: 'Balance Of Power',
    category: 'Momentum',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Where the close lands within the bar, (close − open) / (high − low), smoothed over the period — sustained positive readings mean buyers close bars near their highs.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const raw = series.map(d => (d.high === d.low ? 0 : (d.close - d.open) / (d.high - d.low)));
      const line = sma(raw, n);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(line[i])) points.push({ date: d.date, rank: d.rank, value: line[i] });
      });
      return points;
    },
  },
  {
    id: 'bull_bear_power',
    name: 'Bull Bear Power',
    category: 'Momentum',
    color: '#089981',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 0,
    fields: ['length'],
    params: { length: 13, height: 70 },
    info: "Elder's Bull Power (high − EMA) plus Bear Power (low − EMA): how far the bar's extremes stretch from the EMA consensus. Green columns above zero mean bulls dominate, red below zero mean bears; darker shades mark momentum fading.",
    compute: (series, { length = 13 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const e = ema(series.map(d => d.close), n);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(e[i])) points.push({ date: d.date, rank: d.rank, value: d.high + d.low - 2 * e[i] });
      });
      return points;
    },
  },
  {
    id: 'coppock_curve',
    name: 'Coppock Curve',
    category: 'Momentum',
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color'],
    params: { height: 70 },
    info: 'A weighted moving average (10) of the sum of two rates of change (14 and 11) — a long-horizon momentum curve whose upturns from below zero are the classic buy signal.',
    compute: (series) => {
      const closes = series.map(d => d.close);
      const r14 = roc(closes, 14), r11 = roc(closes, 11);
      const summed = closes.map((_, i) => r14[i] + r11[i]);
      const line = wma(summed, 10);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(line[i])) points.push({ date: d.date, rank: d.rank, value: line[i] });
      });
      return points;
    },
  },
  {
    id: 'elder_ray',
    name: 'Elder Ray Index',
    category: 'Momentum',
    color: '#22c55e',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: ['length'],
    params: { length: 13, height: 70 },
    info: 'Bull Power (high minus EMA) and Bear Power (low minus EMA): how far the extremes push above and below consensus value. Bull fading while price rises — or bear fading while it falls — flags exhaustion.',
    lines: [
      { key: 'bull', color: '#22c55e', label: 'Bull Power — high − EMA' },
      { key: 'bear', color: '#ef4444', label: 'Bear Power — low − EMA' },
    ],
    legend: [
      { color: '#22c55e', label: 'Bull Power — high − EMA' },
      { color: '#ef4444', label: 'Bear Power — low − EMA' },
    ],
    compute: (series, { length = 13 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const e = ema(series.map(d => d.close), n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(e[i])) return;
        points.push({ date: d.date, rank: d.rank, value: d.high - e[i], line: 'bull' });
        points.push({ date: d.date, rank: d.rank, value: d.low - e[i], line: 'bear' });
      });
      return points;
    },
  },
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence',
    category: 'Momentum',
    color: '#2962FF',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 0,
    fields: [],
    // TradingView's canonical 12/26/9 EMA setup; the SMA variants and custom
    // lengths aren't exposed — the editor has no fields for them
    params: { fast: 12, slow: 26, signal: 9, height: 70 },
    info: 'The classic MACD: EMA(12) minus EMA(26), a 9-bar EMA signal line, and their gap as the histogram — teal/pale-teal above zero (rising/fading), pink/red below (recovering/falling). Signal crosses and zero crosses are the standard triggers.',
    lines: [
      { key: 'hist', color: '#26a69a', label: 'Histogram — MACD − signal' },
      { key: 'macd', color: '#2962FF', label: 'MACD — EMA(12) − EMA(26)' },
      { key: 'signal', color: '#ff6d00', width: 1, label: 'Signal — EMA(9) of MACD' },
    ],
    legend: [
      { color: '#2962FF', label: 'MACD — EMA(12) − EMA(26)' },
      { color: '#ff6d00', label: 'Signal — EMA(9) of MACD' },
      { color: '#26a69a', label: 'Histogram — MACD − signal' },
    ],
    compute: (series, { fast = 12, slow = 26, signal = 9 } = {}) => {
      const closes = series.map(d => d.close);
      const { macd: macdArr, signal: sigArr } =
        macdOf(closes, Math.max(1, Math.round(fast)), Math.max(1, Math.round(slow)), Math.max(1, Math.round(signal)));
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(macdArr[i]) || !isFinite(sigArr[i])) return;
        const hist = macdArr[i] - sigArr[i];
        const prev = i > 0 ? macdArr[i - 1] - sigArr[i - 1] : NaN;
        points.push({ date: d.date, rank: d.rank, value: hist, line: 'hist', color: macdHistColor(hist, prev) });
        points.push({ date: d.date, rank: d.rank, value: macdArr[i], line: 'macd' });
        points.push({ date: d.date, rank: d.rank, value: sigArr[i], line: 'signal' });
      });
      return points;
    },
  },
  {
    id: 'ppo',
    name: 'Percentage Price Oscillator',
    category: 'Momentum',
    color: '#2962FF',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 0,
    fields: [],
    // the canonical 12/26/9 EMA setup, like MACD — no editor fields for the
    // lengths per the usual convention
    params: { fast: 12, slow: 26, signal: 9, height: 70 },
    info: 'MACD normalized to percent: (EMA12 − EMA26) ÷ EMA26 × 100, with a 9-bar EMA signal and histogram. Reads identically to MACD but comparable across symbols and price levels since it\'s percentage-based.',
    lines: [
      { key: 'hist', color: '#26a69a', label: 'Histogram — PPO − signal' },
      { key: 'ppo', color: '#2962FF', label: 'PPO — (EMA12 − EMA26) / EMA26 × 100' },
      { key: 'signal', color: '#ff6d00', width: 1, label: 'Signal — EMA(9) of PPO' },
    ],
    legend: [
      { color: '#2962FF', label: 'PPO — (EMA12 − EMA26) / EMA26 × 100' },
      { color: '#ff6d00', label: 'Signal — EMA(9) of PPO' },
      { color: '#26a69a', label: 'Histogram — PPO − signal' },
    ],
    compute: (series, { fast = 12, slow = 26, signal = 9 } = {}) => {
      const closes = series.map(d => d.close);
      const f = ema(closes, Math.max(1, Math.round(fast)));
      const s = ema(closes, Math.max(1, Math.round(slow)));
      const ppoArr = closes.map((_, i) => (s[i] ? ((f[i] - s[i]) / s[i]) * 100 : NaN));
      const sigArr = ema(ppoArr, Math.max(1, Math.round(signal)));
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(ppoArr[i]) || !isFinite(sigArr[i])) return;
        const hist = ppoArr[i] - sigArr[i];
        const prev = i > 0 ? ppoArr[i - 1] - sigArr[i - 1] : NaN;
        points.push({ date: d.date, rank: d.rank, value: hist, line: 'hist', color: macdHistColor(hist, prev) });
        points.push({ date: d.date, rank: d.rank, value: ppoArr[i], line: 'ppo' });
        points.push({ date: d.date, rank: d.rank, value: sigArr[i], line: 'signal' });
      });
      return points;
    },
  },
  {
    id: 'know_sure_thing',
    name: 'Know Sure Thing',
    category: 'Momentum',
    color: '#009688',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: [],
    // Pring's nine lengths at their canonical defaults — the editor has no
    // fields for them and they're rarely tuned individually
    params: { height: 70 },
    info: "Martin Pring's Know Sure Thing: four smoothed rates of change (10/15/20/30-bar, each SMA-smoothed) summed with weights 1–4, plus a 9-bar signal line. KST crossing its signal — especially near zero — marks momentum turns across timeframes.",
    lines: [
      { key: 'kst', color: '#009688', label: 'KST — weighted sum of four smoothed ROCs' },
      { key: 'sig', color: '#F44336', width: 1, label: 'Signal — SMA(9) of KST' },
    ],
    legend: [
      { color: '#009688', label: 'KST' },
      { color: '#F44336', label: 'Signal — SMA(9) of KST' },
    ],
    compute: (series) => {
      const closes = series.map(d => d.close);
      const smaroc = (rocLen, smaLen) => sma(roc(closes, rocLen), smaLen);
      const a = smaroc(10, 10), b = smaroc(15, 10), c = smaroc(20, 10), d4 = smaroc(30, 15);
      const kst = closes.map((_, i) => a[i] + 2 * b[i] + 3 * c[i] + 4 * d4[i]);
      const sig = sma(kst, 9);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(kst[i])) return;
        points.push({ date: d.date, rank: d.rank, value: kst[i], line: 'kst' });
        if (isFinite(sig[i])) points.push({ date: d.date, rank: d.rank, value: sig[i], line: 'sig' });
      });
      return points;
    },
  },
];
