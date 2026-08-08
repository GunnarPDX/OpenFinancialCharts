// Volume studies — split out of studies.js; defs are verbatim.
import { sma, groupByDay, todKeyOf, typicalPrice, typicalPrices } from './math';
import { forEachLevel } from './profileUtils';

export const volumeStudies = [
  {
    id: 'volume_oscillator',
    name: 'Volume Oscillator',
    category: 'Volume',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 12, height: 70 },
    info: 'Percent spread between a fast and a slow volume average (Period and 2x Period): positive when volume is expanding versus its baseline, negative when drying up.',
    compute: (series, { length = 12 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const vols = series.map(d => d.volume || 0);
      const fast = sma(vols, n);
      const slow = sma(vols, n * 2);
      const points = [];
      series.forEach((d, i) => {
        if (!isFinite(fast[i]) || !isFinite(slow[i]) || !slow[i]) return;
        points.push({ date: d.date, rank: d.rank, value: (100 * (fast[i] - slow[i])) / slow[i] });
      });
      return points;
    },
  },
  {
    id: 'volume_roc',
    name: 'Volume Rate Of Change',
    category: 'Volume',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 12, height: 70 },
    info: 'Percent change of volume versus the volume Period bars ago — spikes flag sudden participation.',
    compute: (series, { length = 12 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const points = [];
      series.forEach((d, i) => {
        if (i < n || !series[i - n].volume) return;
        points.push({
          date: d.date,
          rank: d.rank,
          value: (100 * ((d.volume || 0) - series[i - n].volume)) / series[i - n].volume,
        });
      });
      return points;
    },
  },
  {
    id: 'vwap',
    name: 'VWAP',
    category: 'Volume',
    color: '#f59e0b',
    fields: ['color'],
    params: {},
    info: 'Session VWAP: cumulative volume-weighted typical price, resetting at each trading day - the institutional benchmark for intraday fills.',
    compute: (series) => {
      const { dayOrder, byDay } = groupByDay(series);
      const points = [];
      dayOrder.forEach(k => {
        let pv = 0, vol = 0;
        byDay.get(k).forEach(b => {
          const v = b.volume || 0;
          pv += typicalPrice(b) * v;
          vol += v;
          if (vol > 0) points.push({ date: b.date, rank: b.rank, value: pv / vol });
        });
      });
      return points;
    },
  },
  {
    id: 'volume_underlay',
    name: 'Volume Underlay',
    category: 'Volume',
    color: '#0284c7',
    renderAs: 'underlay',
    fields: [],
    params: {},
    info: 'Volume bars drawn in the bottom quarter of the price chart itself, behind the price action - the compact alternative to a separate volume pane.',
    // the chart renders this from the visible window directly
    compute: () => [],
  },
  {
    id: 'projected_aggregate_volume',
    name: 'Projected Aggregate Volume',
    category: ['Projection', 'Volume'],
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: [],
    params: { height: 70 },
    info: "The day's cumulative volume so far, plus a projection of where the day's total will land — the running total divided by the average fraction of daily volume usually traded by this time of day (built from prior days only). Needs at least two days of intraday history.",
    lines: [
      { key: 'cum', color: '#38bdf8', label: 'Cumulative volume today' },
      { key: 'proj', color: '#f59e0b', width: 1, label: 'Projected day total' },
    ],
    legend: [
      { color: '#38bdf8', label: 'Cumulative volume today' },
      { color: '#f59e0b', label: 'Projected day total' },
    ],
    compute: (series) => {
      const { dayOrder, byDay } = groupByDay(series);
      // per day: time-of-day -> fraction of that day's total traded so far
      const profiles = new Map();
      byDay.forEach((bars, k) => {
        const total = bars.reduce((s, b) => s + (b.volume || 0), 0);
        let cum = 0;
        const m = new Map();
        bars.forEach(b => {
          cum += b.volume || 0;
          m.set(todKeyOf(b), total > 0 ? cum / total : 0);
        });
        profiles.set(k, m);
      });
      const points = [];
      dayOrder.forEach((k, di) => {
        const priors = dayOrder.slice(0, di);
        let cum = 0;
        byDay.get(k).forEach(b => {
          cum += b.volume || 0;
          points.push({ date: b.date, rank: b.rank, value: cum, line: 'cum' });
          const fr = priors
            .map(pk => profiles.get(pk).get(todKeyOf(b)))
            .filter(f => isFinite(f) && f > 0.02);
          if (fr.length) {
            const avg = fr.reduce((s, f) => s + f, 0) / fr.length;
            points.push({ date: b.date, rank: b.rank, value: cum / avg, line: 'proj' });
          }
        });
      });
      return points;
    },
  },
  {
    id: 'projected_volume_at_time',
    name: 'Projected Volume At Time',
    category: ['Projection', 'Volume'],
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: [],
    params: { height: 70 },
    info: "Each bar's actual volume against the volume typically traded in that same time slot on prior days — spot at a glance whether the current interval runs hot or cold versus its usual pace. Needs at least two days of intraday history.",
    lines: [
      { key: 'actual', color: '#c084fc', label: 'Actual bar volume' },
      { key: 'proj', color: '#f59e0b', width: 1, label: 'Typical volume at this time' },
    ],
    legend: [
      { color: '#c084fc', label: 'Actual bar volume' },
      { color: '#f59e0b', label: 'Typical volume at this time' },
    ],
    compute: (series) => {
      const { dayOrder, byDay } = groupByDay(series);
      const points = [];
      const seen = new Map(); // time-of-day -> volumes from prior days
      dayOrder.forEach(k => {
        const bars = byDay.get(k);
        bars.forEach(b => {
          points.push({ date: b.date, rank: b.rank, value: b.volume || 0, line: 'actual' });
          const hist = seen.get(todKeyOf(b));
          if (hist && hist.length) {
            points.push({
              date: b.date,
              rank: b.rank,
              value: hist.reduce((s, v) => s + v, 0) / hist.length,
              line: 'proj',
            });
          }
        });
        bars.forEach(b => {
          const tk = todKeyOf(b);
          if (!seen.has(tk)) seen.set(tk, []);
          seen.get(tk).push(b.volume || 0);
        });
      });
      return points;
    },
  },
  {
    id: 'anchored_vwap',
    name: 'Anchored VWAP',
    category: ['Moving Averages', 'Volume'],
    color: '#a855f7',
    fields: ['color', 'anchor'],
    anchorMarker: true,
    params: { anchor: null },
    info: 'Volume-weighted average price accumulated from an anchor bar onward (typical price H+L+C over 3, weighted by volume). Click a bar on the chart to set the anchor — until then it runs from the start of the data. Right-click the line to recolor or re-anchor.',
    compute: (series, { anchor = null } = {}) => {
      // the feed guarantees chronological bars (see the aggregate.js
      // self-check), so accumulate in place
      const tp = typicalPrices(series);
      const points = [];
      let pv = 0;
      let vol = 0;
      series.forEach((d, i) => {
        if (anchor && +d.date < anchor) return;
        const v = d.volume || 0;
        pv += tp[i] * v;
        vol += v;
        if (vol > 0) points.push({ date: d.date, rank: d.rank, value: pv / vol });
      });
      return points;
    },
  },
  {
    id: 'volume_profile',
    name: 'Volume Profile',
    category: ['Volume', 'Support Resistance'],
    color: '#0284c7',
    renderAs: 'profile',
    fields: ['length'],
    params: { length: 24 },
    info: 'Horizontal volume-at-price bars anchored to the y axis: total traded volume within each price range, computed from the bars currently visible on screen. Period sets the number of price buckets; the brightest bar marks the point of control (most-traded price). Bars are translucent so the price action stays in focus.',
    // profiles are window-dependent: the chart calls profile() with the
    // visible bars at render time; compute() has nothing series-wide to add
    compute: () => [],
    profile: (visible, rows, lo, hi) => {
      const vol = new Array(rows).fill(0);
      visible.forEach(b => forEachLevel(b, lo, hi, rows, (k, f) => {
        vol[k] += (b.volume || 0) * f;
      }));
      return vol.map(v => (v > 0 ? { v } : null));
    },
  },
  {
    id: 'volume_display',
    name: 'Volume Chart',
    category: 'Volume',
    color: '#0284c7',
    renderAs: 'pane',
    fields: [],
    params: { height: 70 },
    info: 'Volume per bar as a sub-chart between the price plot and the x axis, sharing the time axis with its own volume scale. Drag its top edge to resize.',
    compute: (series) => series.map(d => ({ date: d.date, rank: d.rank, value: d.volume || 0 })),
  },
];
