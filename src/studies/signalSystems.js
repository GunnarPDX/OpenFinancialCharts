// Signal-system studies (YesNo family, impulse, pressure) — split out of studies.js; defs are verbatim.
import { sma, ema, rsi, atr, macdOf, stochasticK } from './math';

// YesNo-style trend states, strongest bullish → strongest bearish
export const yesnoColors = {
  strong_yes: '#26c6da',
  yes: '#8adcea',
  amber: '#f5b942',
  no: '#ec407a',
  strong_no: '#7e57c2',
};

const yesnoLegend = [
  { color: yesnoColors.strong_yes, label: '"Yes" — strong uptrend' },
  { color: yesnoColors.yes, label: '"Yes" — weakening' },
  { color: yesnoColors.amber, label: 'Uncertain' },
  { color: yesnoColors.no, label: '"No" — weakening' },
  { color: yesnoColors.strong_no, label: '"No" — strong downtrend' },
];

// the ensemble computations are shared across studies (yesno_icons reuses
// yesnoPoints and momentumPoints wholesale) — memoize per series array,
// keyed weakly so old series are collectable
const ensembleMemo = new WeakMap();
const memoized = (series, key, fn) => {
  let bySeries = ensembleMemo.get(series);
  if (!bySeries) {
    bySeries = new Map();
    ensembleMemo.set(series, bySeries);
  }
  if (!bySeries.has(key)) bySeries.set(key, fn());
  return bySeries.get(key);
};

// ponytail: mimic — the indicator this mimics keeps its blend proprietary. A vote ensemble of
// standard trend measures, all scaled off `length`, mapped to 5 states.
const computeYesnoPoints = (series, length) => {
  const closes = series.map(d => d.close);
  const n = Math.max(2, Math.round(length));
  const emaFast = ema(closes, Math.max(2, Math.round(n * 0.43)));
  const emaSlow = ema(closes, n);
  const smaTrend = sma(closes, Math.round(n * 2.4));
  const rsiArr = rsi(closes, 14);
  const { macd, signal } = macdOf(closes, 12, 26, 9);
  const momLag = 10;

  const points = [];
  series.forEach((d, i) => {
    const votes = [
      [closes[i], emaSlow[i]],
      [emaFast[i], emaSlow[i]],
      [macd[i], signal[i]],
      [rsiArr[i], 50],
      [closes[i], smaTrend[i]],
      [closes[i], i >= momLag ? closes[i - momLag] : NaN],
    ].filter(([a, b]) => isFinite(a) && isFinite(b));
    if (votes.length < 4) return;
    const ratio = votes.filter(([a, b]) => a > b).length / votes.length;
    const state =
      ratio >= 0.85 ? 'strong_yes' :
      ratio >= 0.6 ? 'yes' :
      ratio > 0.4 ? 'amber' :
      ratio > 0.15 ? 'no' : 'strong_no';
    points.push({ date: d.date, rank: d.rank, value: closes[i], state, color: yesnoColors[state] });
  });
  return points;
};

const yesnoPoints = (series, length) =>
  memoized(series, `yesno:${length}`, () => computeYesnoPoints(series, length));

// ponytail: mimic — the indicator this mimics keeps its blend proprietary. Six momentum votes
// (RSI, MACD, rate of change, stochastic, two EMAs) summed to -6…+6, shaded
// with the heavy color when volume beats 1.25× its 20-bar average.
const computeMomentumPoints = (series, length, [normalColor, heavyColor], max = 6) => {
  const n = Math.max(2, Math.round(length));
  const closes = series.map(d => d.close);
  const vols = series.map(d => d.volume || 0);
  const rsiArr = rsi(closes, n);
  const { macd, signal } = macdOf(closes, 12, 26, 9);
  const emaFast = ema(closes, Math.max(2, Math.round(n * 0.7)));
  const emaSlow = ema(closes, Math.max(3, Math.round(n * 1.4)));
  const volAvg = sma(vols, 20);
  const { k: stochArr, hi: hiArr, lo: loArr } = stochasticK(series, n);

  const points = [];
  let q = 0;
  series.forEach((d, i) => {
    if (!isFinite(rsiArr[i]) || i < n) return;
    const lo = loArr[i], hi = hiArr[i];
    const stochK = stochArr[i];
    const roc = i >= 10 && closes[i - 10] ? (closes[i] - closes[i - 10]) / closes[i - 10] : 0;

    // neutrality deadband (fraction of price): without it the votes never
    // read exactly neutral and the oscillator can't rest at zero
    const eps = 0.0025;
    const band = eps * Math.abs(closes[i]);
    // ponytail: volatility gate — when the lookback range is under 1% of
    // price, the scale-free votes (RSI, stochastic, RoC) only read noise, so
    // they go neutral; this is what lets the oscillator rest at zero in
    // compressed markets. Tune the threshold per timeframe if needed.
    const compressed = closes[i] ? (hi - lo) / Math.abs(closes[i]) < 0.01 : true;

    const scaleFree = compressed ? 0 :
      (rsiArr[i] > 55 ? 1 : rsiArr[i] < 45 ? -1 : 0) +
      (roc > eps ? 1 : roc < -eps ? -1 : 0) +
      (stochK > 60 ? 1 : stochK < 40 ? -1 : 0);

    const value = scaleFree +
      (macd[i] - signal[i] > band ? 1 : signal[i] - macd[i] > band ? -1 : 0) +
      (closes[i] - emaFast[i] > band ? 1 : emaFast[i] - closes[i] > band ? -1 : 0) +
      (closes[i] - emaSlow[i] > band ? 1 : emaSlow[i] - closes[i] > band ? -1 : 0);

    // Squeeze: count consecutive bars resting at zero
    q = value === 0 ? q + 1 : 0;

    const heavy = isFinite(volAvg[i]) && volAvg[i] > 0 && vols[i] > 1.25 * volAvg[i];
    points.push({
      date: d.date,
      rank: d.rank,
      value: value * (max / 6),
      heavy,
      squeeze: q,
      color: heavy ? heavyColor : normalColor,
    });
  });
  return points;
};

const momentumPoints = (series, length, colors, max = 6) =>
  memoized(series, `momentum:${length}:${max}:${colors.join(',')}`, () =>
    computeMomentumPoints(series, length, colors, max));

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const hexLerp = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + ((((pb >> sh) & 255) - ((pa >> sh) & 255)) * t));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

const HEAT_STOPS = [
  [0.55, '#8a8a8a'], // neutral and below: medium grey
  [0.72, '#eab308'], // warming: yellow
  [0.84, '#f97316'], // hot: orange
  [0.95, '#ef4444'], // overbought: red
];

const heatColor = (h) => {
  if (h <= HEAT_STOPS[0][0]) return HEAT_STOPS[0][1];
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    if (h <= HEAT_STOPS[i][0]) {
      const [t0, c0] = HEAT_STOPS[i - 1];
      const [t1, c1] = HEAT_STOPS[i];
      return hexLerp(c0, c1, (h - t0) / (t1 - t0));
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
};

// continuous 0..1 pressure: RSI + stochastic + ATR-normalized extension above
// trend + volatility-normalized momentum, blended and lightly smoothed
const pressurePoints = (series, length) => {
  const n = Math.max(2, Math.round(length));
  const closes = series.map(d => d.close);
  const rsiArr = rsi(closes, n);
  const emaSlow = ema(closes, Math.round(n * 1.5));
  const atrArr = atr(series, n);
  const { k: stochArr, hi: hiArr, lo: loArr } = stochasticK(series, n);

  const points = [];
  let smooth = null;
  series.forEach((d, i) => {
    if (i < n || !isFinite(rsiArr[i])) return;
    const lo = loArr[i], hi = hiArr[i];
    const stochN = stochArr[i] / 100;
    const a = atrArr[i] || (hi - lo) || 1e-9;
    const extN = sigmoid((closes[i] - emaSlow[i]) / (2 * a));
    const roc = i >= 10 && closes[i - 10] ? (closes[i] - closes[i - 10]) / closes[i - 10] : 0;
    const momN = sigmoid(roc / (3 * (a / closes[i])));

    const heat = 0.35 * (rsiArr[i] / 100) + 0.25 * stochN + 0.25 * extN + 0.15 * momN;
    smooth = smooth == null ? heat : smooth + (heat - smooth) * 0.4;
    const h = Math.max(0, Math.min(1, smooth));
    points.push({ date: d.date, rank: d.rank, value: closes[i], heat: h, color: heatColor(h) });
  });
  return points;
};

export const signalSystemsStudies = [
  {
    id: 'elder_impulse',
    name: 'Elder Impulse System',
    category: 'Signal Systems',
    color: '#22c55e',
    renderAs: 'recolor',
    fields: ['length'],
    params: { length: 13 },
    info: "Elder's Impulse System paints the chart's main line by two engines: green when both the EMA and the MACD histogram are rising (momentum and trend agree up), red when both fall, blue when they disagree — trade only with the color.",
    legend: [
      { color: '#22c55e', label: 'Green — trend and momentum rising' },
      { color: '#ef4444', label: 'Red — trend and momentum falling' },
      { color: '#3b82f6', label: 'Blue — mixed / stand aside' },
    ],
    compute: (series, { length = 13 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const closes = series.map(d => d.close);
      const e = ema(closes, n);
      const { macd, signal } = macdOf(closes, 12, 26, 9);
      const hist = macd.map((v, i) => v - signal[i]);
      const points = [];
      series.forEach((d, i) => {
        if (i < 1 || !isFinite(e[i])) return;
        const emaUp = e[i] > e[i - 1];
        const emaDown = e[i] < e[i - 1];
        const histUp = hist[i] > hist[i - 1];
        const histDown = hist[i] < hist[i - 1];
        const color = emaUp && histUp ? '#22c55e' : emaDown && histDown ? '#ef4444' : '#3b82f6';
        points.push({ date: d.date, rank: d.rank, value: d.close, color });
      });
      return points;
    },
  },
  {
    id: 'yesno_trend',
    name: 'YesNo Strip',
    category: 'Signal Systems',
    color: yesnoColors.strong_yes,
    renderAs: 'ribbon',
    fields: ['length'],
    params: { length: 21 },
    legend: yesnoLegend,
    compute: (series, { length = 21 } = {}) => yesnoPoints(series, length),
  },
  {
    id: 'yesno_line',
    name: 'YesNo Trend',
    category: 'Signal Systems',
    color: yesnoColors.strong_yes,
    renderAs: 'recolor',
    fields: ['length'],
    params: { length: 21 },
    info: "Recolors the chart's main line (candles, bars, dots, …) with the YesNo trend state of each bar.",
    legend: yesnoLegend,
    compute: (series, { length = 21 } = {}) => yesnoPoints(series, length),
  },
  {
    id: 'yesno_oscillator',
    name: 'YesNo Oscillator',
    category: 'Signal Systems',
    color: '#67dbe3',
    renderAs: 'pane',
    fields: ['length'],
    params: { length: 14, height: 70 },
    info: 'Momentum blend ranging -6 to +6 around zero, drawn as a line over banded overbought/oversold zones: extreme readings are overbought/oversold, and a break through zero flags momentum divergent from the trend. The line turns dark blue when volume runs heavier than normal. While momentum rests at zero, the orange Squeeze grid climbs — prolonged volatility compression that often precedes a breakout.',
    legend: [
      { color: '#67dbe3', label: 'Momentum — normal volume' },
      { color: '#1731e0', label: 'Momentum — heavy volume' },
      { color: '#d9822b', label: 'Squeeze grid — volatility compression' },
      { heading: 'Background zones' },
      { color: 'rgba(70, 90, 255, 0.45)', label: '+4…+6 — overbought' },
      { color: 'rgba(20, 184, 166, 0.45)', label: '+2…+4 — strong momentum' },
      { color: 'rgba(190, 180, 20, 0.45)', label: '-2…+2 — neutral' },
      { color: 'rgba(168, 60, 220, 0.45)', label: '-4…-2 — weak momentum' },
      { color: 'rgba(190, 24, 130, 0.45)', label: '-6…-4 — oversold' },
    ],
    compute: (series, { length = 14 } = {}) =>
      momentumPoints(series, length, ['#67dbe3', '#1731e0']),
  },
  {
    id: 'momentum_oscillator',
    name: 'Momentum Oscillator',
    category: ['Momentum', 'Oscillators'],
    color: '#5aa9dc',
    renderAs: 'pane',
    fields: ['length'],
    params: { length: 14, height: 70 },
    info: 'Momentum blend ranging -10 to +10 around zero, drawn as bars from the zero line: extreme positive readings are overbought, extreme negative oversold, and a break through zero flags momentum divergent from the trend. Bars turn dark blue when volume runs heavier than normal.',
    legend: [
      { color: '#5aa9dc', label: 'Momentum — normal volume' },
      { color: '#1e5fa8', label: 'Momentum — heavy volume' },
    ],
    compute: (series, { length = 14 } = {}) =>
      momentumPoints(series, length, ['#5aa9dc', '#1e5fa8'], 10),
  },
  {
    id: 'pressure_trend',
    name: 'PressureTrend',
    category: 'Signal Systems',
    color: '#f97316',
    renderAs: 'recolor',
    fields: ['length'],
    params: { length: 14 },
    info: "Paints the chart's main line by buying pressure: medium grey while conditions are neutral or oversold, warming through yellow and orange to red as the stock gets overbought. The heat is a continuous blend of RSI, stochastic position, ATR-normalized extension above trend, and volatility-normalized momentum.",
    legend: [
      { color: '#8a8a8a', label: 'Neutral / oversold' },
      { color: '#eab308', label: 'Warming' },
      { color: '#f97316', label: 'Hot' },
      { color: '#ef4444', label: 'Overbought' },
    ],
    compute: (series, { length = 14 } = {}) => pressurePoints(series, length),
  },
  {
    id: 'yesno_icons',
    name: 'YesNo Icons',
    category: 'Signal Systems',
    color: '#059669',
    renderAs: 'icons',
    fields: ['length'],
    params: { length: 14 },
    info: 'Marks low-risk trend-participation points and countertrend warnings directly in the price action: in a "Yes" trend a green circle appears above price when momentum finds support at zero; in a "No" trend a red circle appears below price when momentum is rejected at the zero line from below. Amber triangles flag momentum retreating from overbought/oversold extremes — a possible countertrend correction.',
    legend: [
      { color: '#059669', label: 'Yes trend — momentum resurgence' },
      { color: '#e11d48', label: 'No trend — momentum rejection' },
      { color: '#f5b942', label: 'Countertrend correction warning' },
    ],
    compute: (series, { length = 14 } = {}) => {
      const trendByRank = new Map(yesnoPoints(series, 21).map(p => [p.rank, p.state]));
      const oscByRank = new Map(
        momentumPoints(series, length, ['#000', '#000']).map(p => [p.rank, p.value])
      );
      const out = [];
      series.forEach((d) => {
        const st = trendByRank.get(d.rank);
        const v = oscByRank.get(d.rank);
        const pv = oscByRank.get(d.rank - 1);
        if (st == null || v == null || pv == null) return;
        const inYes = st === 'yes' || st === 'strong_yes';
        const inNo = st === 'no' || st === 'strong_no';
        if (inYes && pv <= 0 && v > 0) {
          out.push({ date: d.date, rank: d.rank, value: d.high, price: d.high, icon: 'yes' });
        } else if (inNo && pv >= 0 && v < 0) {
          out.push({ date: d.date, rank: d.rank, value: d.low, price: d.low, icon: 'no' });
        } else if (inYes && pv >= 4 && v < 4) {
          out.push({ date: d.date, rank: d.rank, value: d.high, price: d.high, icon: 'ct_down' });
        } else if (inNo && pv <= -4 && v > -4) {
          out.push({ date: d.date, rank: d.rank, value: d.low, price: d.low, icon: 'ct_up' });
        }
      });
      return out;
    },
  },
];
