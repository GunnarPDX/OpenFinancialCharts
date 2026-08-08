// Volatility studies — split out of studies.js; defs are verbatim.
import { ema, wilders, stdev, atr, trueRanges, rollingExtrema } from './math';

export const volatilityStudies = [
  {
    id: 'average_true_range',
    name: 'Average True Range',
    category: 'Volatility',
    color: '#f472b6',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: "Wilder's ATR: the smoothed true range — how much the instrument actually moves per bar, gaps included. The unit of measure behind Supertrend, Keltner, and most stop systems.",
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const a = atr(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (i >= n && isFinite(a[i])) points.push({ date: d.date, rank: d.rank, value: a[i] });
      });
      return points;
    },
  },
  {
    id: 'chaikin_volatility',
    name: 'Chaikin Volatility',
    category: 'Volatility',
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 10, height: 70 },
    info: 'Percent change of the smoothed high-low range over the period — positive when ranges are widening, negative when they contract.',
    compute: (series, { length = 10 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const e = ema(series.map(d => d.high - d.low), n);
      const points = [];
      series.forEach((d, i) => {
        if (i < n || !isFinite(e[i]) || !e[i - n]) return;
        points.push({ date: d.date, rank: d.rank, value: (100 * (e[i] - e[i - n])) / e[i - n] });
      });
      return points;
    },
  },
  {
    id: 'donchian_width',
    name: 'Donchian Width',
    category: 'Volatility',
    color: '#14b8a6',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'The height of the Donchian channel — highest high minus lowest low over the period, in price units.',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const hh = rollingExtrema(series.map(d => d.high), n).max;
      const ll = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        points.push({ date: d.date, rank: d.rank, value: hh[i] - ll[i] });
      });
      return points;
    },
  },
  {
    id: 'gopalakrishnan_range',
    name: 'Gopalakrishnan Range Index',
    category: 'Volatility',
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 5, height: 70 },
    info: 'GAPO: the log of the window range scaled by the log of the window length — a fractal-flavored read on range expansion independent of price level.',
    compute: (series, { length = 5 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const hh = rollingExtrema(series.map(d => d.high), n).max;
      const ll = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        if (hh[i] > ll[i]) {
          points.push({ date: d.date, rank: d.rank, value: Math.log(hh[i] - ll[i]) / Math.log(n) });
        }
      });
      return points;
    },
  },
  {
    id: 'high_minus_low',
    name: 'High Minus Low',
    category: 'Volatility',
    color: '#5eead4',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: "Each bar's raw range, high minus low — volatility at its most literal.",
    compute: (series) => series.map(d => ({
      date: d.date,
      rank: d.rank,
      value: d.high - d.low,
    })),
  },
  {
    id: 'mass_index',
    name: 'Mass Index',
    category: 'Volatility',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 27,
    fields: ['color', 'length'],
    params: { length: 25, height: 70 },
    info: "Dorsey's Mass Index: the sum over the period of the range's EMA divided by its double EMA. A bulge above 27 that falls back below 26.5 is the classic reversal setup.",
    compute: (series, { length = 25 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const hl = series.map(d => d.high - d.low);
      const e1 = ema(hl, 9);
      const e2 = ema(e1, 9);
      const ratio = e1.map((v, i) => (e2[i] ? v / e2[i] : 1));
      const points = [];
      let sum = 0; // rolling sum of the EMA ratio over the window
      series.forEach((d, i) => {
        sum += ratio[i];
        if (i >= n) sum -= ratio[i - n];
        if (i < n + 18) return;
        points.push({ date: d.date, rank: d.rank, value: sum });
      });
      return points;
    },
  },
  {
    id: 'relative_volatility',
    name: 'Relative Volatility',
    category: 'Volatility',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 50,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'An RSI computed on standard deviation instead of price change: volatility on up closes versus down closes (0-100). Above 50, volatility favors the bulls.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const closes = series.map(d => d.close);
      const sd = stdev(closes, 10);
      const up = closes.map((c, i) => (i > 0 && c > closes[i - 1] && isFinite(sd[i]) ? sd[i] : 0));
      const down = closes.map((c, i) => (i > 0 && c < closes[i - 1] && isFinite(sd[i]) ? sd[i] : 0));
      const uAvg = wilders(up, n);
      const dAvg = wilders(down, n);
      const points = [];
      series.forEach((d, i) => {
        if (i < n + 9) return;
        const total = uAvg[i] + dAvg[i];
        if (total > 0) {
          const v = (100 * uAvg[i]) / total;
          points.push({ date: d.date, rank: d.rank, value: Math.max(0, Math.min(100, v)) });
        }
      });
      return points;
    },
  },
  {
    id: 'true_range',
    name: 'True Range',
    category: 'Volatility',
    color: '#f97316',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: "Each bar's true range: the high-low span extended to cover any gap from the prior close — the raw input to ATR.",
    compute: (series) => {
      const tr = trueRanges(series);
      return series.map((d, i) => ({ date: d.date, rank: d.rank, value: tr[i] }));
    },
  },
  {
    id: 'ulcer_index',
    name: 'Ulcer Index',
    category: 'Volatility',
    color: '#ef4444',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Downside pain: the root-mean-square percent drawdown from the running high over the period — unlike stdev, it only punishes declines.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        // each bar's drawdown is measured against the running max from the
        // *window's start*, so the per-bar terms change as the window slides —
        // not a rolling sum; O(n·window) stays (an exact O(n) needs a
        // prefix-max stack over shifting boundaries, not worth it here)
        let maxC = -Infinity;
        let sumSq = 0;
        for (let k = i - n + 1; k <= i; k++) {
          if (series[k].close > maxC) maxC = series[k].close;
          const dd = maxC > 0 ? (100 * (series[k].close - maxC)) / maxC : 0;
          sumSq += dd * dd;
        }
        points.push({ date: d.date, rank: d.rank, value: Math.sqrt(sumSq / n) });
      });
      return points;
    },
  },
];
