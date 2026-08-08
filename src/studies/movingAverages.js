// Moving-average style overlays — split out of studies.js; defs are verbatim.
import { sma, ema, wma, tma, vidya, variable, wilders, timeSeries, hull, dema, tema, linReg } from './math';

const MA_FUNCS = {
  simple: sma,
  exponential: ema,
  triangular: tma,
  vidya,
  weighted: wma,
  wilders,
  variable,
  time_series: timeSeries,
  hull,
  dema,
  tema,
};

export const maTypes = [
  { value: 'simple', label: 'Simple' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'vidya', label: 'VIDYA' },
  { value: 'weighted', label: 'Weighted' },
  { value: 'wilders', label: 'Welles Wilder' },
  { value: 'variable', label: 'Variable' },
  { value: 'time_series', label: 'Time Series' },
  { value: 'hull', label: 'Hull' },
  { value: 'dema', label: 'Double Exponential' },
  { value: 'tema', label: 'Triple Exponential' },
];

export const maFields = [
  { value: 'open', label: 'O' },
  { value: 'high', label: 'H' },
  { value: 'low', label: 'L' },
  { value: 'close', label: 'C' },
];

export const movingAveragesStudies = [
  {
    id: 'moving_average',
    name: 'Moving Average',
    category: 'Moving Averages',
    color: '#0284c7',
    info: 'Average of the selected field over the trailing period, smoothing out short-term noise to show the underlying trend. Type picks the weighting; Offset shifts the line by N bars.',
    fields: ['color', 'length', 'source', 'type', 'offset'],
    params: { length: 20, source: 'close', type: 'simple', offset: 0 },
    compute: (series, { length = 20, source = 'close', type = 'simple', offset = 0 } = {}) => {
      const fn = MA_FUNCS[type] || sma;
      const line = fn(series.map(d => d[source]), Math.max(1, Math.round(length)));
      const points = [];
      line.forEach((v, i) => {
        const j = i + Math.round(offset);
        if (!isFinite(v) || j < 0 || j >= series.length) return;
        points.push({ date: series[j].date, rank: series[j].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'ma_cross',
    name: 'Moving Average Cross',
    category: ['Trend Following', 'Moving Averages'],
    color: '#38bdf8',
    fields: ['length'],
    params: { length: 10 },
    info: 'A fast and a slow simple moving average (Period and 2×Period) drawn on price — the classic crossover system: fast over slow is bullish, under is bearish.',
    lines: [
      { key: 'fast', color: '#38bdf8', label: 'Fast SMA — Period' },
      { key: 'slow', color: '#f59e0b', label: 'Slow SMA — 2× Period' },
    ],
    legend: [
      { color: '#38bdf8', label: 'Fast SMA — Period' },
      { color: '#f59e0b', label: 'Slow SMA — 2× Period' },
    ],
    compute: (series, { length = 10 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const closes = series.map(d => d.close);
      const fast = sma(closes, n);
      const slow = sma(closes, n * 2);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(fast[i])) points.push({ date: d.date, rank: d.rank, value: fast[i], line: 'fast' });
        if (isFinite(slow[i])) points.push({ date: d.date, rank: d.rank, value: slow[i], line: 'slow' });
      });
      return points;
    },
  },
  {
    id: 'linreg_forecast',
    name: 'Linear Reg Forecast',
    category: ['Moving Averages', 'Statistical'],
    color: '#f59e0b',
    fields: ['color', 'length', 'source'],
    params: { length: 14, source: 'close' },
    info: 'The value of a linear regression fitted over the trailing period, evaluated at the current bar — where the trend line says price "should" be now.',
    compute: (series, { length = 14, source = 'close' } = {}) => {
      const n = Math.max(2, Math.round(length));
      const line = linReg(series.map(d => d[source]), n, 'forecast');
      const points = [];
      line.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'linreg_intercept',
    name: 'Linear Reg Intercept',
    category: ['Moving Averages', 'Statistical'],
    color: '#d97706',
    fields: ['color', 'length', 'source'],
    params: { length: 14, source: 'close' },
    info: 'The intercept of a linear regression fitted over the trailing period — the fitted value at the start of the window.',
    compute: (series, { length = 14, source = 'close' } = {}) => {
      const n = Math.max(2, Math.round(length));
      const line = linReg(series.map(d => d[source]), n, 'intercept');
      const points = [];
      line.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'median_price',
    name: 'Median Price',
    category: ['Moving Averages', 'Statistical'],
    color: '#c084fc',
    fields: ['color'],
    params: {},
    info: 'The midpoint of each bar, (high + low) / 2 — the simplest balance line of the price action.',
    compute: (series) => series.map(d => ({
      date: d.date,
      rank: d.rank,
      value: (d.high + d.low) / 2,
    })),
  },
  {
    id: 'alma',
    name: 'Arnaud Legoux Moving Average',
    category: 'Moving Averages',
    color: '#2dd4bf',
    fields: ['color', 'length'],
    // offset: smoothness (→1) vs responsiveness (→0); sigma: window sharpness.
    // TradingView's defaults; the study editor has no inputs for them
    params: { length: 9, offset: 0.85, sigma: 6 },
    info: 'Gaussian-weighted moving average (ALMA): weights peak at offset × (length − 1) with width length ÷ sigma, cutting lag while keeping the line smooth.',
    compute: (series, { length = 9, offset = 0.85, sigma = 6 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const m = offset * (n - 1);
      const s = n / sigma;
      const w = Array.from({ length: n }, (_, k) => Math.exp(-((k - m) ** 2) / (2 * s * s)));
      const norm = w.reduce((a, b) => a + b, 0);
      const points = [];
      for (let i = n - 1; i < series.length; i++) {
        let sum = 0;
        for (let k = 0; k < n; k++) sum += series[i - (n - 1) + k].close * w[k];
        points.push({ date: series[i].date, rank: series[i].rank, value: sum / norm });
      }
      return points;
    },
  },
  {
    id: 'ma_ribbon',
    name: 'Moving Average Ribbon',
    category: 'Moving Averages',
    color: '#fb9800',
    fields: [],
    // TradingView's defaults: four SMAs of close at 20/50/100/200 in a
    // yellow→red gradient. Per-MA type/source/visibility toggles aren't
    // ported — the editor has no fields for them
    params: {},
    info: 'Four moving averages spanning the classic horizons — SMA 20, 50, 100 and 200 — shaded yellow to red by length. Fanned-out and stacked in order means a clean trend; braided means chop; price crossing the ribbon marks regime changes.',
    lines: [
      { key: 'ma20', color: '#f6c309', label: 'SMA 20' },
      { key: 'ma50', color: '#fb9800', label: 'SMA 50' },
      { key: 'ma100', color: '#fb6500', label: 'SMA 100' },
      { key: 'ma200', color: '#f60c0c', label: 'SMA 200' },
    ],
    legend: [
      { color: '#f6c309', label: 'SMA 20' },
      { color: '#fb9800', label: 'SMA 50' },
      { color: '#fb6500', label: 'SMA 100' },
      { color: '#f60c0c', label: 'SMA 200' },
    ],
    compute: (series) => {
      const closes = series.map(d => d.close);
      const mas = [
        ['ma20', sma(closes, 20)],
        ['ma50', sma(closes, 50)],
        ['ma100', sma(closes, 100)],
        ['ma200', sma(closes, 200)],
      ];
      const points = [];
      series.forEach((d, i) => {
        mas.forEach(([key, arr]) => {
          if (isFinite(arr[i])) points.push({ date: d.date, rank: d.rank, value: arr[i], line: key });
        });
      });
      return points;
    },
  },
  {
    id: 'kama',
    name: "Kaufman's Adaptive Moving Average",
    category: 'Moving Averages',
    color: '#2962FF',
    fields: ['color', 'length'],
    // Period = TradingView's ER length; the fast/slow smoothing constants
    // stay at their canonical 2/30 — the editor has no further numeric fields
    params: { length: 10, fast: 2, slow: 30 },
    info: "Kaufman's AMA: an EMA whose smoothing adapts to the efficiency ratio — near the fast constant when price moves cleanly in one direction, near the slow one in chop. Hugs trends, flattens through noise.",
    compute: (series, { length = 10, fast = 2, slow = 30 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const fastA = 2 / (Math.max(1, Math.round(fast)) + 1);
      const slowA = 2 / (Math.max(1, Math.round(slow)) + 1);
      const src = series.map(d => d.close);
      const points = [];
      let kama = null;
      let vol = 0; // rolling sum of |Δclose| over the ER window
      for (let i = 1; i < src.length; i++) {
        vol += Math.abs(src[i] - src[i - 1]);
        if (i > n) vol -= Math.abs(src[i - n] - src[i - n - 1]);
        if (i < n) continue;
        const er = vol > 0 ? Math.abs(src[i] - src[i - n]) / vol : 0;
        const sc = (er * (fastA - slowA) + slowA) ** 2;
        kama = kama == null ? src[i] : kama + sc * (src[i] - kama);
        points.push({ date: series[i].date, rank: series[i].rank, value: kama });
      }
      return points;
    },
  },
  {
    id: 'guppy_mma',
    name: 'Guppy Multiple Moving Average',
    category: 'Moving Averages',
    color: '#2dd4bf',
    fields: [],
    params: {},
    info: 'Twelve EMAs in two ribbons: six short (3–15, traders) and six long (30–60, investors). Ribbon separation shows trend strength and agreement; compression and crossovers flag transitions.',
    lines: [
      ...[3, 5, 8, 10, 12, 15].map(p => ({ key: `s${p}`, color: '#2dd4bf', width: 1, label: `EMA ${p}` })),
      ...[30, 35, 40, 45, 50, 60].map(p => ({ key: `l${p}`, color: '#f97316', width: 1, label: `EMA ${p}` })),
    ],
    legend: [
      { color: '#2dd4bf', label: 'Short group — EMA 3–15 (traders)' },
      { color: '#f97316', label: 'Long group — EMA 30–60 (investors)' },
    ],
    compute: (series) => {
      const closes = series.map(d => d.close);
      const points = [];
      [[3, 's'], [5, 's'], [8, 's'], [10, 's'], [12, 's'], [15, 's'],
       [30, 'l'], [35, 'l'], [40, 'l'], [45, 'l'], [50, 'l'], [60, 'l']]
        .forEach(([p, g]) => {
          const line = ema(closes, p);
          line.forEach((v, i) => {
            if (!isFinite(v)) return;
            points.push({ date: series[i].date, rank: series[i].rank, value: v, line: `${g}${p}` });
          });
        });
      return points;
    },
  },
  {
    id: 'alligator',
    name: 'Alligator',
    category: 'Moving Averages',
    color: '#3b82f6',
    fields: ['length'],
    params: { length: 13 },
    info: "Bill Williams' Alligator: three smoothed moving averages of the median price (H+L)/2, each projected forward — Jaw (13, +8), Teeth (8, +5), Lips (5, +3), scaled off Period. When the lines are intertwined the alligator sleeps (range); when they fan apart in order, it feeds (trend).",
    lines: [
      { key: 'jaw', color: '#3b82f6', label: 'Jaw — slow, shifted +8' },
      { key: 'teeth', color: '#ef4444', label: 'Teeth — medium, shifted +5' },
      { key: 'lips', color: '#22c55e', label: 'Lips — fast, shifted +3' },
    ],
    legend: [
      { color: '#3b82f6', label: 'Jaw — slow, shifted +8' },
      { color: '#ef4444', label: 'Teeth — medium, shifted +5' },
      { color: '#22c55e', label: 'Lips — fast, shifted +3' },
    ],
    compute: (series, { length = 13 } = {}) => {
      if (!series.length) return [];
      const n = Math.max(5, Math.round(length));
      const median = series.map(d => (d.high + d.low) / 2);
      const spec = [
        ['jaw', n, Math.max(1, Math.round(n * 8 / 13))],
        ['teeth', Math.max(2, Math.round(n * 8 / 13)), Math.max(1, Math.round(n * 5 / 13))],
        ['lips', Math.max(2, Math.round(n * 5 / 13)), Math.max(1, Math.round(n * 3 / 13))],
      ];
      // forward projection past the last bar fabricates date/rank beyond
      // the series on the same fixed interval
      const lastIdx = series.length - 1;
      const lastT = +series[lastIdx].date;
      const lastRank = series[lastIdx].rank;
      const interval = series.length > 1 ? Math.abs(lastT - +series[lastIdx - 1].date) : 60000;
      const points = [];
      spec.forEach(([key, period, shift]) => {
        const line = wilders(median, period);
        line.forEach((v, i) => {
          const j = i + shift;
          if (!isFinite(v) || j < 0) return;
          if (j <= lastIdx) {
            points.push({ date: series[j].date, rank: series[j].rank, value: v, line: key });
          } else {
            const k = j - lastIdx;
            points.push({ date: new Date(lastT + interval * k), rank: lastRank + k, value: v, line: key });
          }
        });
      });
      return points;
    },
  },
];
