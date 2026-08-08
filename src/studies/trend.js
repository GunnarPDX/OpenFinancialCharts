// Trend strength / trend following studies — split out of studies.js; defs are verbatim.
import { ema, atr, trueRanges, rollingExtrema, adxParts, aroonUpDown, typicalPrice } from './math';

export const trendStudies = [
  {
    id: 'adx_dms',
    name: 'ADX/DMS',
    category: 'Trend Strength',
    color: '#e5e7eb',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['length'],
    params: { length: 14, height: 70 },
    info: 'Directional movement system: +DI and -DI measure up/down directional pressure; ADX (Wilder-smoothed DX) measures trend strength regardless of direction — rising ADX above ~25 marks a trending market.',
    lines: [
      { key: 'adx', color: '#e5e7eb', label: 'ADX — trend strength' },
      { key: 'plus', color: '#22c55e', width: 1, label: '+DI' },
      { key: 'minus', color: '#ef4444', width: 1, label: '-DI' },
    ],
    legend: [
      { color: '#e5e7eb', label: 'ADX — trend strength' },
      { color: '#22c55e', label: '+DI' },
      { color: '#ef4444', label: '-DI' },
    ],
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      if (series.length < 2) return [];
      const { pdi, mdi, adx } = adxParts(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (i >= n) {
          points.push({ date: d.date, rank: d.rank, value: pdi[i], line: 'plus' });
          points.push({ date: d.date, rank: d.rank, value: mdi[i], line: 'minus' });
        }
      });
      series.forEach((d, i) => {
        if (i >= 2 * n) points.push({ date: d.date, rank: d.rank, value: adx[i], line: 'adx' });
      });
      return points;
    },
  },
  {
    id: 'accumulative_swing_index',
    name: 'Accumulative Swing Index',
    category: 'Trend Following',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: "Wilder's Swing Index accumulated over time: a running score of each bar's directional strength built from its open/high/low/close against the prior bar. The line should confirm price's swings — divergence warns of failing trends. (Limit-move scaling simplified for equities.)",
    compute: (series) => {
      const points = [];
      let asi = 0;
      series.forEach((d, i) => {
        if (i === 0) return;
        const p = series[i - 1];
        const hc = Math.abs(d.high - p.close);
        const lc = Math.abs(d.low - p.close);
        const hl = Math.abs(d.high - d.low);
        const co = Math.abs(p.close - p.open);
        let R;
        if (hc >= lc && hc >= hl) R = hc - 0.5 * lc + 0.25 * co;
        else if (lc >= hc && lc >= hl) R = lc - 0.5 * hc + 0.25 * co;
        else R = hl + 0.25 * co;
        if (R > 0) {
          asi += (50 * ((d.close - p.close) + 0.5 * (d.close - d.open) + 0.25 * (p.close - p.open))) / R;
        }
        points.push({ date: d.date, rank: d.rank, value: asi });
      });
      return points;
    },
  },
  {
    id: 'aroon',
    name: 'Aroon',
    category: 'Trend Strength',
    color: '#22c55e',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['length'],
    params: { length: 25, height: 70 },
    info: 'Aroon Up and Aroon Down (0–100): how recently the window made its high and its low. The up line near 100 with the down line near 0 is a strong uptrend; both mid-range means no trend.',
    lines: [
      { key: 'up', color: '#22c55e', label: 'Aroon Up' },
      { key: 'down', color: '#ef4444', label: 'Aroon Down' },
    ],
    legend: [
      { color: '#22c55e', label: 'Aroon Up' },
      { color: '#ef4444', label: 'Aroon Down' },
    ],
    compute: (series, { length = 25 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const { up, down } = aroonUpDown(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (i < n) return;
        points.push({ date: d.date, rank: d.rank, value: up[i], line: 'up' });
        points.push({ date: d.date, rank: d.rank, value: down[i], line: 'down' });
      });
      return points;
    },
  },
  {
    id: 'choppiness_index',
    name: 'Choppiness Index',
    category: ['Trend Strength', 'Volatility'],
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 61.8,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Is the market trending or chopping? Total true range over the period versus the net range, log-scaled 0–100: above 61.8 reads as chop, below 38.2 as a strong trend.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const tr = trueRanges(series);
      const hhArr = rollingExtrema(series.map(d => d.high), n).max;
      const llArr = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      let sum = 0; // rolling sum of TR over the window
      series.forEach((d, i) => {
        sum += tr[i];
        if (i >= n) sum -= tr[i - n];
        if (i < n) return;
        const hh = hhArr[i], ll = llArr[i];
        if (hh > ll && sum > 0) {
          points.push({
            date: d.date,
            rank: d.rank,
            value: (100 * Math.log10(sum / (hh - ll))) / Math.log10(n),
          });
        }
      });
      return points;
    },
  },
  {
    id: 'parabolic_sar',
    name: 'Parabolic SAR',
    category: ['Trend Following', 'Support Resistance'],
    color: '#fbbf24',
    dots: true,
    fields: ['color'],
    params: {},
    info: "Wilder's Parabolic SAR: an accelerating trailing stop drawn as dots below price in uptrends and above it in downtrends (0.02 step, 0.2 max). Price touching the dots flips the trend.",
    compute: (series) => {
      if (series.length < 2) return [];
      const points = [];
      let up = series[1].close >= series[0].close;
      let sar = up ? series[0].low : series[0].high;
      let ep = up ? series[0].high : series[0].low;
      let af = 0.02;
      for (let i = 1; i < series.length; i++) {
        const d = series[i];
        sar = sar + af * (ep - sar);
        if (up) {
          sar = Math.min(sar, series[i - 1].low, i > 1 ? series[i - 2].low : series[i - 1].low);
          if (d.low < sar) {
            up = false; sar = ep; ep = d.low; af = 0.02;
          } else if (d.high > ep) { ep = d.high; af = Math.min(0.2, af + 0.02); }
        } else {
          sar = Math.max(sar, series[i - 1].high, i > 1 ? series[i - 2].high : series[i - 1].high);
          if (d.high > sar) {
            up = true; sar = ep; ep = d.high; af = 0.02;
          } else if (d.low < ep) { ep = d.low; af = Math.min(0.2, af + 0.02); }
        }
        points.push({ date: d.date, rank: d.rank, value: sar });
      }
      return points;
    },
  },
  {
    id: 'supertrend',
    name: 'Supertrend',
    category: ['Trend Following', 'Support Resistance'],
    color: '#22c55e',
    segmented: true,
    fields: ['length', 'mult'],
    params: { length: 10, mult: 3 },
    info: 'An ATR trailing stop that ratchets with the trend: the line rides below price (green) in uptrends and above it (red) in downtrends, flipping when price closes through it. Period sets the ATR window; Multiplier the distance.',
    legend: [
      { color: '#22c55e', label: 'Uptrend — support below price' },
      { color: '#ef4444', label: 'Downtrend — resistance above price' },
    ],
    compute: (series, { length = 10, mult = 3 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const a = atr(series, n);
      const points = [];
      let up = true;
      let finalUpper = NaN, finalLower = NaN;
      series.forEach((d, i) => {
        if (!isFinite(a[i])) return;
        const mid = (d.high + d.low) / 2;
        const basicUpper = mid + mult * a[i];
        const basicLower = mid - mult * a[i];
        const prevClose = i > 0 ? series[i - 1].close : d.close;
        finalUpper = !isFinite(finalUpper) || basicUpper < finalUpper || prevClose > finalUpper
          ? basicUpper : finalUpper;
        finalLower = !isFinite(finalLower) || basicLower > finalLower || prevClose < finalLower
          ? basicLower : finalLower;
        if (up && d.close < finalLower) up = false;
        else if (!up && d.close > finalUpper) up = true;
        points.push({
          date: d.date,
          rank: d.rank,
          value: up ? finalLower : finalUpper,
          color: up ? '#22c55e' : '#ef4444',
        });
      });
      return points;
    },
  },
  {
    id: 'chop_zone',
    name: 'Chop Zone',
    category: 'Trend Strength',
    color: '#FDD835',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 0,
    fields: [],
    params: { height: 70 },
    info: 'Colors each bar by the slope angle of the EMA-34, normalized to the last 30 bars\' range: turquoise→lime for steepening uptrends, dark red→pale orange for downtrends, yellow for chop. Sustained yellow means no trend worth trading.',
    compute: (series) => {
      const PERIODS = 30;
      const e = ema(series.map(d => d.close), 34);
      const hhArr = rollingExtrema(series.map(b => b.high), PERIODS).max;
      const llArr = rollingExtrema(series.map(b => b.low), PERIODS).min;
      const points = [];
      for (let i = 1; i < series.length; i++) {
        const hh = hhArr[i];
        const ll = llArr[i];
        if (!(hh > ll) || !isFinite(e[i]) || !isFinite(e[i - 1])) continue;
        const span = (25 / (hh - ll)) * ll;
        const avg = typicalPrice(series[i]);
        const y2 = ((e[i - 1] - e[i]) / avg) * span;
        const c = Math.sqrt(1 + y2 * y2);
        let angle = Math.round((180 * Math.acos(1 / c)) / Math.PI);
        if (y2 > 0) angle = -angle;
        const color = angle >= 5 ? '#26C6DA'
          : angle >= 3.57 ? '#43A047'
            : angle >= 2.14 ? '#A5D6A7'
              : angle >= 0.71 ? '#009688'
                : angle <= -5 ? '#D50000'
                  : angle <= -3.57 ? '#E91E63'
                    : angle <= -2.14 ? '#FF6D00'
                      : angle <= -0.71 ? '#FFB74D'
                        : '#FDD835';
        points.push({ date: series[i].date, rank: series[i].rank, value: 1, color });
      }
      return points;
    },
  },
  {
    id: 'adx',
    name: 'Average Directional Index',
    category: 'Trend Strength',
    color: '#ef4444',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    // TradingView's ADX has separate DI Length and ADX Smoothing inputs, both
    // defaulting to 14 — the editor's single Period drives both (Wilder's
    // classic single-period form; identical to TV at the defaults)
    params: { length: 14, height: 70 },
    info: "Wilder's trend-strength gauge: the smoothed spread between +DI and -DI, regardless of direction. Rising ADX above ~25 marks a trending market; low ADX means chop.",
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      if (series.length < 2) return [];
      const { adx } = adxParts(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (i >= 2 * n) points.push({ date: d.date, rank: d.rank, value: adx[i] });
      });
      return points;
    },
  },
];
