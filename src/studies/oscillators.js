// Oscillator studies — split out of studies.js; defs are verbatim.
import { sma, ema, linReg, rsi, rollingExtrema, aroonUpDown, fractalFlags, typicalPrices } from './math';

// up vs down closes (each vs the prior close) over the trailing window — the
// Psychological Line family; toValue maps (up, down, n) to the plotted value
// (return null to emit a gap). Rolling counts, O(n).
const psyPoints = (series, length, toValue) => {
  const n = Math.max(1, Math.round(length));
  const points = [];
  let up = 0, down = 0;
  for (let i = 1; i < series.length; i++) {
    const diff = series[i].close - series[i - 1].close;
    if (diff > 0) up++;
    else if (diff < 0) down++;
    const j = i - n; // close-pair leaving the window
    if (j >= 1) {
      const od = series[j].close - series[j - 1].close;
      if (od > 0) up--;
      else if (od < 0) down--;
    }
    if (i < n) continue;
    const v = toValue(up, down, n);
    if (v != null) points.push({ date: series[i].date, rank: series[i].rank, value: v });
  }
  return points;
};

export const oscillatorsStudies = [
  {
    id: 'aroon_oscillator',
    name: 'Aroon Oscillator',
    category: 'Oscillators',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 25, height: 70 },
    info: 'Aroon Up minus Aroon Down (-100 to +100): how recently the window made its high versus its low. Strong positive means fresh highs dominate; strong negative, fresh lows.',
    compute: (series, { length = 25 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const { up, down } = aroonUpDown(series, n);
      const points = [];
      series.forEach((d, i) => {
        if (i < n) return;
        points.push({ date: d.date, rank: d.rank, value: up[i] - down[i] });
      });
      return points;
    },
  },
  {
    id: 'center_of_gravity',
    name: 'Center Of Gravity',
    category: 'Oscillators',
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 10, height: 70 },
    info: "Ehlers' Center of Gravity: a weighted balance point of recent closes with essentially zero lag — turning points in the line lead price turns.",
    compute: (series, { length = 10 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const points = [];
      series.forEach((d, i) => {
        if (i < n - 1) return;
        let num = 0, den = 0;
        for (let k = 0; k < n; k++) {
          const p = series[i - k].close;
          num += (k + 1) * p;
          den += p;
        }
        if (den !== 0) points.push({ date: d.date, rank: d.rank, value: -num / den });
      });
      return points;
    },
  },
  {
    id: 'chande_forecast',
    name: 'Chande Forecast Oscillator',
    category: 'Oscillators',
    color: '#f59e0b',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Percent difference between the close and its linear-regression forecast: positive when price runs above the trend fit, negative below.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const fc = linReg(series.map(d => d.close), n, 'forecast');
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(fc[i]) || !d.close) return;
        points.push({ date: d.date, rank: d.rank, value: (100 * (d.close - fc[i])) / d.close });
      });
      return points;
    },
  },
  {
    id: 'chande_momentum',
    name: 'Chande Momentum Oscillator',
    category: 'Oscillators',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Net gains versus total movement over the period, scaled -100 to +100: like RSI but unsmoothed and centered on zero. Beyond ±50 reads overbought/oversold.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const points = [];
      series.forEach((d, i) => {
        if (i < n) return;
        let up = 0, down = 0;
        for (let k = i - n + 1; k <= i; k++) {
          const ch = series[k].close - series[k - 1].close;
          if (ch > 0) up += ch; else down -= ch;
        }
        if (up + down > 0) {
          const v = (100 * (up - down)) / (up + down);
          points.push({ date: d.date, rank: d.rank, value: Math.max(-100, Math.min(100, v)) });
        }
      });
      return points;
    },
  },
  {
    id: 'cci',
    name: 'Commodity Channel Index',
    category: 'Oscillators',
    color: '#a78bda',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'Typical price versus its average, scaled by mean deviation — ±100 mark the classic overbought/oversold thresholds.',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const tp = typicalPrices(series);
      const mid = sma(tp, n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(mid[i])) return;
        // mean deviation around the window's own mean: the |tp − mid[i]|
        // terms change with every bar's mid, so this can't roll — O(n·window)
        // stays (window is small; a two-heap/BIT scheme isn't worth it here)
        let md = 0;
        for (let k = i - n + 1; k <= i; k++) md += Math.abs(tp[k] - mid[i]);
        md /= n;
        if (md > 0) points.push({ date: d.date, rank: d.rank, value: (tp[i] - mid[i]) / (0.015 * md) });
      });
      return points;
    },
  },
  {
    id: 'disparity_index',
    name: 'Disparity Index',
    category: 'Oscillators',
    color: '#f472b6',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'Percent distance between the close and its EMA — how stretched price is from its own average; extremes tend to snap back.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const e = ema(series.map(d => d.close), n);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(e[i]) || !e[i]) return;
        points.push({ date: d.date, rank: d.rank, value: (100 * (d.close - e[i])) / e[i] });
      });
      return points;
    },
  },
  {
    id: 'fisher_transform',
    name: 'Ehler Fisher Transform',
    category: 'Oscillators',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: ['length'],
    params: { length: 10, height: 70 },
    info: "Ehlers' Fisher Transform: the bar midpoint's position in its recent range, transformed to make turning points sharp and near-Gaussian. Crosses of the trigger line (the transform delayed one bar) mark reversals.",
    lines: [
      { key: 'fisher', color: '#38bdf8', label: 'Fisher' },
      { key: 'trigger', color: '#f97316', width: 1, label: 'Trigger — prior value' },
    ],
    legend: [
      { color: '#38bdf8', label: 'Fisher' },
      { color: '#f97316', label: 'Trigger — prior value' },
    ],
    compute: (series, { length = 10 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const mids = series.map(d => (d.high + d.low) / 2);
      const { max: hiArr, min: loArr } = rollingExtrema(mids, n);
      const points = [];
      let v1 = 0, prevFisher = 0;
      series.forEach((d, i) => {
        if (i < n - 1) return;
        const hi = hiArr[i], lo = loArr[i];
        const mid = mids[i];
        const raw = hi === lo ? 0 : ((mid - lo) / (hi - lo) - 0.5) * 2;
        v1 = Math.max(-0.999, Math.min(0.999, 0.66 * raw + 0.34 * v1));
        const fisher = 0.5 * Math.log((1 + v1) / (1 - v1)) + 0.5 * prevFisher;
        points.push({ date: d.date, rank: d.rank, value: fisher, line: 'fisher' });
        points.push({ date: d.date, rank: d.rank, value: prevFisher, line: 'trigger' });
        prevFisher = fisher;
      });
      return points;
    },
  },
  {
    id: 'fractal_chaos_oscillator',
    name: 'Fractal Chaos Oscillator',
    category: 'Oscillators',
    color: '#eab308',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 2, height: 70 },
    info: 'Signals +1 on each newly confirmed fractal high and -1 on each fractal low (0 otherwise) — the raw structure pulses behind the Fractal Chaos Bands. Period sets the fractal wing size.',
    compute: (series, { length = 2 } = {}) => {
      const w = Math.max(1, Math.round(length));
      const { isHigh, isLow } = fractalFlags(series, w);
      const points = [];
      series.forEach((d, i) => {
        let value = 0;
        const c = i - w; // fractal confirmed once w bars exist on each side
        if (c >= w) {
          if (isHigh[c]) value = 1;
          else if (isLow[c]) value = -1;
        }
        points.push({ date: d.date, rank: d.rank, value });
      });
      return points;
    },
  },
  {
    id: 'psychological_line',
    name: 'Psychological Line (PSY)',
    category: 'Oscillators',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 50,
    fields: ['color', 'length'],
    params: { length: 12, height: 70 },
    info: 'Percentage of rising closes over the trailing period: PSY = up periods ÷ total × 100. Above 50 buyers dominate, below 50 sellers; readings past ~75 / under ~25 flag overbought/oversold sentiment.',
    compute: (series, { length = 12 } = {}) =>
      psyPoints(series, length, (up, _down, n) => (up / n) * 100),
  },
  {
    id: 'detrended_price',
    name: 'Detrended Price Oscillator',
    category: 'Oscillators',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'Price minus a displaced moving average — the longer trend subtracted out, leaving the shorter cycles that oscillate around zero.',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const shift = Math.floor(n / 2) + 1;
      const mid = sma(series.map(d => d.close), n);
      const points = [];
      series.forEach((d, i) => {
        const j = i - shift;
        if (j < 0 || !isFinite(mid[j])) return;
        points.push({ date: d.date, rank: d.rank, value: d.close - mid[j] });
      });
      return points;
    },
  },
  {
    id: 'connors_rsi',
    name: 'Connors RSI',
    category: 'Oscillators',
    color: '#2962FF',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 50,
    // TradingView's band furniture: gray 70/30 lines with a translucent
    // blue wash between them, 50 as the dashed midline (paneRef)
    paneLevels: [
      { value: 70, color: '#787B86' },
      { value: 30, color: '#787B86' },
    ],
    paneFill: { from: 30, to: 70, color: 'rgba(33, 150, 243, 0.1)' },
    fields: ['color'],
    // TradingView's three lengths at their canonical defaults (RSI 3,
    // up/down streak 2, ROC percent-rank 100) — the editor has one Period
    // field and changing any of them individually isn't standard practice
    params: { rsiLen: 3, streakLen: 2, rocLen: 100, height: 70 },
    info: 'Larry Connors\' composite momentum gauge: the average of RSI(close, 3), RSI of the up/down close streak (2), and the 100-bar percent rank of the 1-bar return. Reads like RSI but far twitchier — above ~90 stretched, below ~10 washed out.',
    compute: (series, { rsiLen = 3, streakLen = 2, rocLen = 100 } = {}) => {
      const closes = series.map(d => d.close);
      const r1 = rsi(closes, Math.max(2, Math.round(rsiLen)));
      // signed run of consecutive up/down closes; unchanged closes reset to 0
      const streak = [0];
      for (let i = 1; i < closes.length; i++) {
        const prev = streak[i - 1];
        if (closes[i] > closes[i - 1]) streak.push(prev > 0 ? prev + 1 : 1);
        else if (closes[i] < closes[i - 1]) streak.push(prev < 0 ? prev - 1 : -1);
        else streak.push(0);
      }
      const r2 = rsi(streak, Math.max(2, Math.round(streakLen)));
      const roc = closes.map((c, i) => (i > 0 && closes[i - 1] ? ((c - closes[i - 1]) / closes[i - 1]) * 100 : NaN));
      const n = Math.max(1, Math.round(rocLen));
      // percent rank: share of the previous n returns at or below today's.
      // Sorted sliding window + binary search instead of an n-scan per bar
      // (non-finite returns count as "not below", like the old scan).
      const upperBound = (arr, v) => { // first index with arr[m] > v
        let a = 0, b = arr.length;
        while (a < b) { const m = (a + b) >> 1; if (arr[m] <= v) a = m + 1; else b = m; }
        return a;
      };
      const counts = new Array(closes.length).fill(NaN);
      const win = [];
      for (let i = 1; i < closes.length; i++) {
        const add = roc[i - 1];
        if (isFinite(add)) win.splice(upperBound(win, add), 0, add);
        const dropIdx = i - 1 - n;
        if (dropIdx >= 0 && isFinite(roc[dropIdx])) {
          win.splice(upperBound(win, roc[dropIdx]) - 1, 1);
        }
        if (i > n && isFinite(roc[i])) counts[i] = upperBound(win, roc[i]);
      }
      const points = [];
      series.forEach((d, i) => {
        if (i <= n || !isFinite(r1[i]) || !isFinite(r2[i]) || !isFinite(roc[i])) return;
        points.push({ date: d.date, rank: d.rank, value: (r1[i] + r2[i] + (100 * counts[i]) / n) / 3 });
      });
      return points;
    },
  },
];
