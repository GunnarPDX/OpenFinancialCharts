// Bands, channels and Bollinger studies — split out of studies.js; defs are verbatim.
import { sma, ema, tma, stdev, atr, rollingExtrema, fractalFlags } from './math';

export const bandsStudies = [
  {
    id: 'bollinger_pct_b',
    name: 'Bollinger %b',
    category: 'Bollinger',
    color: '#0284c7',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0.5,
    fields: ['color', 'length', 'mult'],
    params: { length: 20, mult: 2, height: 70 },
    info: 'Where the close sits within the Bollinger Bands: 0 at the lower band, 1 at the upper. Readings outside 0–1 mean price has escaped the bands.',
    compute: (series, { length = 20, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const closes = series.map(d => d.close);
      const mid = sma(closes, n);
      const sd = stdev(closes, n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i]) || !isFinite(sd[i]) || sd[i] === 0) return;
        const upper = mid[i] + mult * sd[i];
        const lower = mid[i] - mult * sd[i];
        points.push({ date: d.date, rank: d.rank, value: (d.close - lower) / (upper - lower) });
      });
      return points;
    },
  },
  {
    id: 'bb_trend',
    name: 'BB Trend',
    category: 'Bollinger',
    color: '#0284c7',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 0,
    fields: ['length', 'mult'],
    params: { length: 20, mult: 2, height: 70 },
    info: "John Bollinger's BBTrend: compares a short (Period) and a 50-bar Bollinger Band set, drawn as green columns above zero (uptrend) and red below (downtrend); magnitude reads as trend strength.",
    // ponytail: long period fixed at the standard 50 — the study editor only
    // has one Period field; make it configurable if anyone asks
    compute: (series, { length = 20, mult = 2 } = {}) => {
      const nS = Math.max(2, Math.round(length));
      const nL = 50;
      const closes = series.map(d => d.close);
      const midS = sma(closes, nS);
      const sdS = stdev(closes, nS);
      const midL = sma(closes, nL);
      const sdL = stdev(closes, nL);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(midS[i]) || !isFinite(sdS[i]) || !isFinite(midL[i]) || !isFinite(sdL[i]) || !midS[i]) return;
        const lowerS = midS[i] - mult * sdS[i];
        const upperS = midS[i] + mult * sdS[i];
        const lowerL = midL[i] - mult * sdL[i];
        const upperL = midL[i] + mult * sdL[i];
        const value = (Math.abs(lowerS - lowerL) - Math.abs(upperS - upperL)) / midS[i] * 100;
        points.push({ date: d.date, rank: d.rank, value });
      });
      return points;
    },
  },
  {
    id: 'bollinger_bandwidth',
    name: 'Bollinger Bandwidth',
    category: 'Bollinger',
    color: '#0284c7',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['length', 'mult'],
    params: { length: 20, mult: 2, height: 70 },
    info: 'Width between the upper and lower Bollinger Bands, normalized by the midline: (upper − lower) / mid. The classic squeeze detector — bandwidth pinching toward the green contraction line precedes expansions toward the red one.',
    lines: [
      { key: 'bbw', color: '#0284c7', label: 'Bandwidth — (upper − lower) / mid' },
      { key: 'high', color: '#ef4444', width: 1, label: 'Highest Expansion — 125-bar max' },
      { key: 'low', color: '#22c55e', width: 1, label: 'Lowest Contraction — 125-bar min' },
    ],
    legend: [
      { color: '#0284c7', label: 'Bandwidth — (upper − lower) / mid' },
      { color: '#ef4444', label: 'Highest Expansion — 125-bar max' },
      { color: '#22c55e', label: 'Lowest Contraction — 125-bar min' },
    ],
    compute: (series, { length = 20, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const LOOKBACK = 125; // TradingView's expansion/contraction lookback
      const closes = series.map(d => d.close);
      const mid = sma(closes, n);
      const sd = stdev(closes, n);
      // (upper − lower) / mid = 2·mult·σ / mid — TradingView's BBW scaling
      const bbw = series.map((_, i) =>
        (isFinite(mid[i]) && isFinite(sd[i]) && mid[i]) ? (2 * mult * sd[i]) / mid[i] : NaN);
      const { max: hi, min: lo } = rollingExtrema(bbw, LOOKBACK);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(bbw[i])) return;
        points.push({ date: d.date, rank: d.rank, value: bbw[i], line: 'bbw' });
        points.push({ date: d.date, rank: d.rank, value: hi[i], line: 'high' });
        points.push({ date: d.date, rank: d.rank, value: lo[i], line: 'low' });
      });
      return points;
    },
  },
  {
    id: 'starc_bands',
    name: 'STARC Bands',
    category: ['Bands & Channels', 'Volatility'],
    color: '#8b5cf6',
    fields: ['length', 'mult'],
    params: { length: 5, mult: 2 },
    info: "Stoller Average Range Channels: an SMA midline with bands offset by a multiple of the ATR (ATR window = 3x Period) — trades against the band edges assume reversion inside the channel.",
    lines: [
      { key: 'upper', color: '#a78bda', width: 1, label: 'Upper — mid + mult*ATR' },
      { key: 'mid', color: '#8b5cf6', label: 'Midline — SMA' },
      { key: 'lower', color: '#a78bda', width: 1, label: 'Lower — mid - mult*ATR' },
    ],
    legend: [
      { color: '#8b5cf6', label: 'Midline — SMA' },
      { color: '#a78bda', label: 'Bands — midline +/- mult*ATR' },
    ],
    compute: (series, { length = 5, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const mid = sma(series.map(d => d.close), n);
      const a = atr(series, Math.max(2, n * 3));
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i]) || !isFinite(a[i])) return;
        points.push({ date: d.date, rank: d.rank, value: mid[i], line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] + mult * a[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] - mult * a[i], line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'high_low_bands',
    name: 'High Low Bands',
    category: ['Bands & Channels', 'Statistical'],
    color: '#0284c7',
    fields: ['length'],
    params: { length: 14 },
    info: 'Triangular moving averages of the highs and of the lows form the bands, with a midline halfway between — a smoothed price envelope.',
    lines: [
      { key: 'upper', color: '#5e8ca8', label: 'Upper — TMA of highs' },
      { key: 'mid', color: '#0284c7', label: 'Midline' },
      { key: 'lower', color: '#5e8ca8', label: 'Lower — TMA of lows' },
    ],
    legend: [
      { color: '#5e8ca8', label: 'Bands — TMA of highs / lows' },
      { color: '#0284c7', label: 'Midline' },
    ],
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const upper = tma(series.map(d => d.high), n);
      const lower = tma(series.map(d => d.low), n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(upper[i]) || !isFinite(lower[i])) return;
        points.push({ date: d.date, rank: d.rank, value: upper[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: (upper[i] + lower[i]) / 2, line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: lower[i], line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'highest_high',
    name: 'Highest High Value',
    category: ['Bands & Channels', 'Statistical'],
    color: '#22c55e',
    fields: ['color', 'length'],
    params: { length: 14 },
    info: 'The highest high reached over the trailing period — a stepping resistance reference.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const hi = rollingExtrema(series.map(d => d.high), n).max;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        points.push({ date: d.date, rank: d.rank, value: hi[i] });
      });
      return points;
    },
  },
  {
    id: 'ichimoku',
    name: 'Ichimoku Clouds',
    category: ['Bands & Channels', 'Projection'],
    color: '#3b82f6',
    fields: ['length'],
    params: { length: 9 },
    info: 'The Ichimoku system: Tenkan (9) and Kijun (26) midpoint lines, Senkou spans A and B projected 26 bars forward (the cloud), and the Chikou lagging close plotted 26 bars back. Period scales the classic 9/26/52 proportionally.',
    lines: [
      { key: 'tenkan', color: '#3b82f6', label: 'Tenkan — conversion (9)' },
      { key: 'kijun', color: '#ef4444', label: 'Kijun — base (26)' },
      { key: 'spanA', color: '#22c55e', width: 1, label: 'Senkou A — cloud edge, +26' },
      { key: 'spanB', color: '#f97316', width: 1, label: 'Senkou B — cloud edge, +26' },
      { key: 'chikou', color: '#a855f7', width: 1, label: 'Chikou — close, -26' },
    ],
    legend: [
      { color: '#3b82f6', label: 'Tenkan — conversion' },
      { color: '#ef4444', label: 'Kijun — base' },
      { color: '#22c55e', label: 'Senkou A — cloud, +26' },
      { color: '#f97316', label: 'Senkou B — cloud, +26' },
      { color: '#a855f7', label: 'Chikou — lagging close' },
    ],
    compute: (series, { length = 9 } = {}) => {
      if (!series.length) return [];
      const n = Math.max(2, Math.round(length));
      const pK = Math.max(n + 1, Math.round(n * 26 / 9));
      const pB = Math.max(pK + 1, Math.round(n * 52 / 9));
      const shift = pK;
      const highs = series.map(d => d.high);
      const lows = series.map(d => d.low);
      const midOf = (p) => {
        const hi = rollingExtrema(highs, p).max;
        const lo = rollingExtrema(lows, p).min;
        return series.map((_, i) => (i >= p - 1 ? (hi[i] + lo[i]) / 2 : NaN));
      };
      const midN = midOf(n), midK = midOf(pK), midB = midOf(pB);
      // the cloud projects past the last bar: fabricate date/rank beyond
      // the series on the same fixed interval
      const lastIdx = series.length - 1;
      const lastT = +series[lastIdx].date;
      const lastRank = series[lastIdx].rank;
      const interval = series.length > 1 ? Math.abs(lastT - +series[lastIdx - 1].date) : 60000;
      const points = [];
      const push = (j, value, line) => {
        if (j < 0 || !isFinite(value)) return;
        if (j <= lastIdx) {
          points.push({ date: series[j].date, rank: series[j].rank, value, line });
        } else {
          const k = j - lastIdx;
          points.push({ date: new Date(lastT + interval * k), rank: lastRank + k, value, line });
        }
      };
      series.forEach((d, i) => {
        const tenkan = midN[i];
        const kijun = midK[i];
        push(i, tenkan, 'tenkan');
        push(i, kijun, 'kijun');
        if (isFinite(tenkan) && isFinite(kijun)) push(i + shift, (tenkan + kijun) / 2, 'spanA');
        push(i + shift, midB[i], 'spanB');
        push(i - shift, d.close, 'chikou');
      });
      return points;
    },
  },
  {
    id: 'keltner_channel',
    name: 'Keltner Channel',
    category: 'Bands & Channels',
    color: '#8b5cf6',
    fields: ['length', 'mult'],
    params: { length: 20, mult: 2 },
    info: 'An EMA midline with bands offset by a multiple of the ATR (ATR window = half the Period). Smoother than Bollinger since ATR reacts more gradually than standard deviation.',
    lines: [
      { key: 'upper', color: '#a78bda', label: 'Upper — mid + mult×ATR' },
      { key: 'mid', color: '#8b5cf6', label: 'Midline — EMA of close' },
      { key: 'lower', color: '#a78bda', label: 'Lower — mid − mult×ATR' },
    ],
    legend: [
      { color: '#8b5cf6', label: 'Midline — EMA of close' },
      { color: '#a78bda', label: 'Bands — midline ± mult×ATR' },
    ],
    compute: (series, { length = 20, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const mid = ema(series.map(d => d.close), n);
      const a = atr(series, Math.max(2, Math.round(n / 2)));
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i]) || !isFinite(a[i])) return;
        points.push({ date: d.date, rank: d.rank, value: mid[i], line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] + mult * a[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] - mult * a[i], line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'lowest_low',
    name: 'Lowest Low Value',
    category: ['Bands & Channels', 'Statistical'],
    color: '#ef4444',
    fields: ['color', 'length'],
    params: { length: 14 },
    info: 'The lowest low reached over the trailing period — a stepping support reference.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const lo = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        points.push({ date: d.date, rank: d.rank, value: lo[i] });
      });
      return points;
    },
  },
  {
    id: 'average_daily_range',
    name: 'Average Daily Range',
    category: ['Bands & Channels', 'Volatility'],
    color: '#f59e0b',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Simple moving average of each bar\'s high − low range over the trailing period. Rising ADR means ranges are widening; on intraday candles it reads as average bar range rather than daily.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const avg = sma(series.map(d => d.high - d.low), n);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(avg[i])) points.push({ date: d.date, rank: d.rank, value: avg[i] });
      });
      return points;
    },
  },
  {
    id: 'envelope',
    name: 'Envelope',
    category: 'Bands & Channels',
    color: '#FF6D00',
    fields: ['length', 'mult'],
    // Multiplier = TradingView's Percent input (bands at basis ± percent%).
    // The SMA/EMA basis toggle isn't ported — no boolean field; SMA default
    params: { length: 20, mult: 10 },
    info: 'A moving-average midline with bands offset a fixed percent above and below: upper = basis × (1 + p%), lower = basis × (1 − p%). Price tagging a band flags stretched moves relative to the average.',
    lines: [
      { key: 'basis', color: '#FF6D00', label: 'Basis — SMA of close' },
      { key: 'upper', color: '#2962FF', width: 1, label: 'Upper — basis × (1 + p%)' },
      { key: 'lower', color: '#2962FF', width: 1, label: 'Lower — basis × (1 − p%)' },
    ],
    legend: [
      { color: '#FF6D00', label: 'Basis — SMA of close' },
      { color: '#2962FF', label: 'Bands — basis ± percent' },
    ],
    compute: (series, { length = 20, mult = 10 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const k = mult / 100;
      const basis = sma(series.map(d => d.close), n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(basis[i])) return;
        points.push({ date: d.date, rank: d.rank, value: basis[i], line: 'basis' });
        points.push({ date: d.date, rank: d.rank, value: basis[i] * (1 + k), line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: basis[i] * (1 - k), line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands',
    category: 'Bollinger',
    color: '#0284c7',
    fields: ['length', 'mult'],
    params: { length: 20, mult: 2 },
    info: 'A simple moving average midline with bands offset by a multiple of the standard deviation of closes. Band width expands with volatility and squeezes when the market compresses.',
    lines: [
      { key: 'upper', color: '#5e8ca8', label: 'Upper — mid + mult×σ' },
      { key: 'mid', color: '#0284c7', label: 'Midline — SMA of close' },
      { key: 'lower', color: '#5e8ca8', label: 'Lower — mid − mult×σ' },
    ],
    legend: [
      { color: '#0284c7', label: 'Midline — SMA of close' },
      { color: '#5e8ca8', label: 'Bands — midline ± mult×σ' },
    ],
    compute: (series, { length = 20, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const closes = series.map(d => d.close);
      const mid = sma(closes, n);
      const sd = stdev(closes, n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i]) || !isFinite(sd[i])) return;
        points.push({ date: d.date, rank: d.rank, value: mid[i], line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] + mult * sd[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] - mult * sd[i], line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'donchian_channel',
    name: 'Donchian Channel',
    category: 'Bands & Channels',
    color: '#14b8a6',
    fields: ['length'],
    params: { length: 20 },
    info: 'Channel from the highest high and lowest low over the trailing period, with a midline halfway between — breakouts beyond the channel flag new highs/lows.',
    lines: [
      { key: 'upper', color: '#14b8a6', label: 'Upper — highest high' },
      { key: 'mid', color: '#6b8f8b', label: 'Midline' },
      { key: 'lower', color: '#14b8a6', label: 'Lower — lowest low' },
    ],
    legend: [
      { color: '#14b8a6', label: 'Channel — highest high / lowest low' },
      { color: '#6b8f8b', label: 'Midline' },
    ],
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const hi = rollingExtrema(series.map(d => d.high), n).max;
      const lo = rollingExtrema(series.map(d => d.low), n).min;
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        points.push({ date: d.date, rank: d.rank, value: hi[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: (hi[i] + lo[i]) / 2, line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: lo[i], line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'fractal_chaos_bands',
    name: 'Fractal Chaos Bands',
    category: ['Bands & Channels', 'Trend Following'],
    color: '#eab308',
    fields: ['length'],
    params: { length: 2 },
    info: 'Step bands that trail the most recent confirmed fractal high and fractal low (a bar whose high/low exceeds its neighbors on both sides). Period sets the fractal wing size — bars required on each side. Flat bands mean chaos/no structure; price walking a band means trend.',
    lines: [
      { key: 'upper', color: '#eab308', label: 'Upper — last fractal high' },
      { key: 'lower', color: '#e0653e', label: 'Lower — last fractal low' },
    ],
    legend: [
      { color: '#eab308', label: 'Upper — last fractal high' },
      { color: '#e0653e', label: 'Lower — last fractal low' },
    ],
    compute: (series, { length = 2 } = {}) => {
      const w = Math.max(1, Math.round(length));
      const { isHigh, isLow } = fractalFlags(series, w);
      const points = [];
      let upper = NaN, lower = NaN;
      series.forEach((d, i) => {
        // a fractal at c is confirmed once w bars exist on each side
        const c = i - w;
        if (c >= w) {
          if (isHigh[c]) upper = series[c].high;
          if (isLow[c]) lower = series[c].low;
        }
        if (isFinite(upper)) points.push({ date: d.date, rank: d.rank, value: upper, line: 'upper' });
        if (isFinite(lower)) points.push({ date: d.date, rank: d.rank, value: lower, line: 'lower' });
      });
      return points;
    },
  },
  {
    id: 'atr_bands',
    name: 'ATR Bands',
    category: ['Bands & Channels', 'Volatility'],
    color: '#0284c7',
    fields: ['length', 'mult'],
    params: { length: 14, mult: 2 },
    info: 'Volatility bands: an EMA midline with upper and lower bands offset by a multiple of the Average True Range. Period sets both the EMA and ATR windows; Multiplier sets the band width.',
    lines: [
      { key: 'upper', color: '#5e8ca8', label: 'Upper — mid + mult×ATR' },
      { key: 'mid', color: '#0284c7', label: 'Midline — EMA of close' },
      { key: 'lower', color: '#5e8ca8', label: 'Lower — mid − mult×ATR' },
    ],
    legend: [
      { color: '#0284c7', label: 'Midline — EMA of close' },
      { color: '#5e8ca8', label: 'Bands — midline ± mult×ATR' },
    ],
    compute: (series, { length = 14, mult = 2 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const mid = ema(series.map(d => d.close), n);
      const a = atr(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i]) || !isFinite(a[i])) return;
        points.push({ date: d.date, rank: d.rank, value: mid[i], line: 'mid' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] + mult * a[i], line: 'upper' });
        points.push({ date: d.date, rank: d.rank, value: mid[i] - mult * a[i], line: 'lower' });
      });
      return points;
    },
  },
];
