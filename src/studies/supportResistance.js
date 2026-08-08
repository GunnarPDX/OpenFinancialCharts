// Support / resistance studies — split out of studies.js; defs are verbatim.
import { groupByDay, primeAbove, primeBelow, atr, rollingExtrema } from './math';

export const supportResistanceStudies = [
  {
    id: 'darvas_box',
    name: 'Darvas Box',
    category: 'Support Resistance',
    color: '#22c55e',
    fields: ['length'],
    params: { length: 3 },
    info: "Darvas boxes: a top forms when a high survives unbroken for the confirmation period, then a bottom from the subsequent lows — the box holds until price closes out of it. Period sets the confirmation bars.",
    lines: [
      { key: 'top', color: '#22c55e', label: 'Box top — resistance' },
      { key: 'bottom', color: '#ef4444', label: 'Box bottom — support' },
    ],
    legend: [
      { color: '#22c55e', label: 'Box top — resistance' },
      { color: '#ef4444', label: 'Box bottom — support' },
    ],
    compute: (series, { length = 3 } = {}) => {
      const conf = Math.max(2, Math.round(length));
      const points = [];
      let state = 'seekTop', boxTop = NaN, boxBottom = NaN;
      let curHigh = -Infinity, curLow = Infinity, count = 0;
      series.forEach((d) => {
        if (state === 'seekTop') {
          if (d.high > curHigh) { curHigh = d.high; count = 0; }
          else if (++count >= conf) {
            boxTop = curHigh;
            state = 'seekBottom';
            curLow = d.low;
            count = 0;
          }
        } else if (state === 'seekBottom') {
          if (d.high > boxTop) {
            state = 'seekTop'; curHigh = d.high; count = 0; boxTop = NaN;
          } else if (d.low < curLow) { curLow = d.low; count = 0; }
          else if (++count >= conf) { boxBottom = curLow; state = 'active'; }
        } else if (d.close > boxTop || d.close < boxBottom) {
          state = 'seekTop'; curHigh = d.high; count = 0; boxTop = NaN; boxBottom = NaN;
        }
        if (isFinite(boxTop)) points.push({ date: d.date, rank: d.rank, value: boxTop, line: 'top' });
        if (state === 'active') points.push({ date: d.date, rank: d.rank, value: boxBottom, line: 'bottom' });
      });
      return points;
    },
  },
  {
    id: 'pivot_points',
    name: 'Pivot Points',
    category: 'Support Resistance',
    color: '#e5e7eb',
    fields: [],
    params: {},
    info: "Classic floor-trader pivots from the prior day's high, low, and close: the pivot P with resistance levels R1–R3 above and support S1–S3 below, stepping at each new session. Needs at least two days of intraday history.",
    lines: [
      { key: 'r3', color: '#15803d', width: 1, label: 'R3' },
      { key: 'r2', color: '#16a34a', width: 1, label: 'R2' },
      { key: 'r1', color: '#22c55e', width: 1, label: 'R1' },
      { key: 'p', color: '#e5e7eb', label: 'Pivot' },
      { key: 's1', color: '#ef4444', width: 1, label: 'S1' },
      { key: 's2', color: '#dc2626', width: 1, label: 'S2' },
      { key: 's3', color: '#b91c1c', width: 1, label: 'S3' },
    ],
    legend: [
      { color: '#e5e7eb', label: 'Pivot — (H+L+C)/3 of prior day' },
      { color: '#22c55e', label: 'R1–R3 — resistance levels' },
      { color: '#ef4444', label: 'S1–S3 — support levels' },
    ],
    compute: (series) => {
      const { dayOrder, byDay } = groupByDay(series);
      const points = [];
      dayOrder.forEach((k, di) => {
        if (di === 0) return;
        const prev = byDay.get(dayOrder[di - 1]);
        const H = Math.max(...prev.map(b => b.high));
        const L = Math.min(...prev.map(b => b.low));
        const C = prev[prev.length - 1].close;
        const P = (H + L + C) / 3;
        const levels = [
          ['p', P],
          ['r1', 2 * P - L], ['s1', 2 * P - H],
          ['r2', P + (H - L)], ['s2', P - (H - L)],
          ['r3', H + 2 * (P - L)], ['s3', L - 2 * (H - P)],
        ];
        byDay.get(k).forEach(b => {
          levels.forEach(([line, value]) =>
            points.push({ date: b.date, rank: b.rank, value, line }));
        });
      });
      return points;
    },
  },
  {
    id: 'prime_number_bands',
    name: 'Prime Number Bands',
    category: ['Support Resistance', 'Bands & Channels'],
    color: '#fbbf24',
    fields: [],
    params: {},
    info: 'Bands at the nearest prime number above each high and below each low — the prime-level counterpart of the Prime Number Oscillator.',
    lines: [
      { key: 'upper', color: '#fbbf24', width: 1, label: 'Upper — prime above high' },
      { key: 'lower', color: '#e0653e', width: 1, label: 'Lower — prime below low' },
    ],
    legend: [
      { color: '#fbbf24', label: 'Upper — prime above high' },
      { color: '#e0653e', label: 'Lower — prime below low' },
    ],
    compute: (series) => {
      const points = [];
      series.forEach(d => {
        points.push({ date: d.date, rank: d.rank, value: primeAbove(d.high), line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: primeBelow(d.low), line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'chande_kroll_stop',
    name: 'Chande Kroll Stop',
    category: ['Support Resistance', 'Trend Following'],
    color: '#2962FF',
    fields: ['length', 'mult'],
    // Pine's p (ATR Length) → Period, x (ATR Coefficient) → Multiplier;
    // q (Stop Length) fixed at 9 — the editor has no third numeric field
    params: { length: 10, mult: 1, stopLength: 9 },
    info: 'ATR-based trailing stops: the short stop tracks the highest high minus x·ATR, the long stop the lowest low plus x·ATR, each smoothed by taking the extreme over the last q bars. Price crossing a stop suggests the trend has flipped.',
    lines: [
      { key: 'long', color: '#2962FF', label: 'Stop Long — lowest(low, p) + x·ATR, min over q' },
      { key: 'short', color: '#FF6D00', label: 'Stop Short — highest(high, p) − x·ATR, max over q' },
    ],
    legend: [
      { color: '#2962FF', label: 'Stop Long' },
      { color: '#FF6D00', label: 'Stop Short' },
    ],
    compute: (series, { length = 10, mult = 1, stopLength = 9 } = {}) => {
      const p = Math.max(1, Math.round(length));
      const q = Math.max(1, Math.round(stopLength));
      if (!series.length) return [];
      const a = atr(series, p);
      const hMax = rollingExtrema(series.map(d => d.high), p).max;
      const lMin = rollingExtrema(series.map(d => d.low), p).min;
      const firstHigh = [], firstLow = [];
      series.forEach((_, i) => {
        firstHigh.push(isFinite(a[i]) ? hMax[i] - mult * a[i] : NaN);
        firstLow.push(isFinite(a[i]) ? lMin[i] + mult * a[i] : NaN);
      });
      const stopShort = rollingExtrema(firstHigh, q).max;
      const stopLong = rollingExtrema(firstLow, q).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < p + q - 2 || !isFinite(a[i])) return;
        points.push({ date: d.date, rank: d.rank, value: stopLong[i], line: 'long' });
        points.push({ date: d.date, rank: d.rank, value: stopShort[i], line: 'short' });
      });
      return points;
    },
  },
  {
    id: 'multi_time_period',
    name: 'Multi Time Period Charts',
    category: 'Support Resistance',
    color: '#009688',
    renderAs: 'boxes',
    fields: [],
    // auto-timeframe only (TV's default): intraday bars box by day, daily by
    // week, weekly+ by month. Manual TF, Heikin Ashi, daily-based values and
    // the OC/TR/OHLC calculation modes aren't ported
    params: {},
    info: 'Boxes each higher-timeframe period over the chart — days on intraday charts, weeks on daily, months on weekly — spanning the period\'s high/low range, green when it closed up, red when down. The developing period extends as bars print; box edges double as period support/resistance.',
    compute: (series) => {
      if (series.length < 2) return [];
      // median of the first ~20 bar deltas — a single leading weekend/session
      // gap must not misclassify the whole chart's timeframe
      const deltas = [];
      for (let i = 1; i < Math.min(series.length, 21); i++) {
        deltas.push(+series[i].date - +series[i - 1].date);
      }
      deltas.sort((a, b) => a - b);
      const spacing = deltas[Math.floor(deltas.length / 2)];
      const keyFor = spacing < 86400e3
        ? (d) => d.toDateString()
        : spacing < 604800e3
          ? (d) => {
            const t = new Date(d);
            t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // back to Monday
            return t.toDateString();
          }
          : (d) => `${d.getFullYear()}-${d.getMonth()}`;
      const boxes = [];
      let cur = null;
      series.forEach(d => {
        const key = keyFor(d.date);
        if (!cur || cur.key !== key) {
          cur = {
            key, rank: d.rank, value: d.high, start: d.rank, end: d.rank,
            top: d.high, bottom: d.low, open: d.open, up: true,
          };
          boxes.push(cur);
        } else {
          cur.end = d.rank;
          cur.top = Math.max(cur.top, d.high);
          cur.bottom = Math.min(cur.bottom, d.low);
        }
        cur.up = d.close >= cur.open;
      });
      return boxes;
    },
  },
  {
    id: 'gaps',
    name: 'Gaps',
    category: 'Support Resistance',
    color: '#22c55e',
    renderAs: 'boxes',
    fields: [],
    params: {},
    info: 'Boxes over price gaps: green where a bar opened above the prior high, red where it opened below the prior low. A box extends right until price trades back into the zone; still-open boxes mark unfilled gaps acting as support/resistance.',
    compute: (series) => {
      const MAX_GAPS = 15; // TradingView's default box limit
      const gaps = [];
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const d = series[i];
        // any trade back into the zone closes a gap (TV's default mode)
        gaps.forEach(g => {
          if (g.end == null && (g.up ? d.low < g.top : d.high > g.bottom)) g.end = d.rank;
        });
        if (d.low > prev.high) {
          gaps.push({ rank: d.rank, value: d.low, start: prev.rank, end: null, top: d.low, bottom: prev.high, up: true });
        } else if (d.high < prev.low) {
          gaps.push({ rank: d.rank, value: prev.low, start: prev.rank, end: null, top: prev.low, bottom: d.high, up: false });
        }
        if (gaps.length > MAX_GAPS) gaps.shift();
      }
      return gaps;
    },
  },
  {
    id: 'chandelier_exit',
    name: 'Chandelier Exit',
    category: ['Support Resistance', 'Trend Following'],
    color: '#2962FF',
    fields: ['length', 'mult'],
    // Pine has separate Length and ATR Length inputs, both defaulting to 22 —
    // the editor's single Period drives both
    params: { length: 22, mult: 3 },
    info: "Chuck LeBeau's trailing exits hung from the trend's extreme: the long exit trails highest(high, n) − mult·ATR below the highs, the short exit trails lowest(low, n) + mult·ATR above the lows. Price closing past an exit signals the trend is done.",
    lines: [
      { key: 'long', color: '#2962FF', label: 'Long exit — highest(high, n) − mult·ATR' },
      { key: 'short', color: '#ff6d00', label: 'Short exit — lowest(low, n) + mult·ATR' },
    ],
    legend: [
      { color: '#2962FF', label: 'Long exit' },
      { color: '#ff6d00', label: 'Short exit' },
    ],
    compute: (series, { length = 22, mult = 3 } = {}) => {
      const n = Math.max(1, Math.round(length));
      if (!series.length) return [];
      const a = atr(series, n);
      const hh = rollingExtrema(series.map(d => d.high), n).max;
      const ll = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1 || !isFinite(a[i])) return;
        points.push({ date: d.date, rank: d.rank, value: hh[i] - mult * a[i], line: 'long' });
        points.push({ date: d.date, rank: d.rank, value: ll[i] + mult * a[i], line: 'short' });
      });
      return points;
    },
  },
];
