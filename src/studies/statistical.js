// Statistical studies — split out of studies.js; defs are verbatim.
import { benchmarkCloses, stdev, linReg, timeSeries, nearestPrime, trueRanges, rollingReturnStats } from './math';

export const statisticalStudies = [
  {
    id: 'correlation_coefficient',
    name: 'Correlation Coefficient',
    category: 'Statistical',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'Rolling Pearson correlation between the security\'s returns and the benchmark\'s (-1 to +1). (Benchmark is a built-in placeholder until a comparison symbol feed exists.)',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(5, Math.round(length));
      const stats = rollingReturnStats(series, benchmarkCloses(series), n);
      const points = [];
      for (let i = n; i < series.length; i++) {
        const st = stats[i];
        if (st && st.vs > 0 && st.vb > 0) {
          const r = st.cov / Math.sqrt(st.vs * st.vb);
          points.push({ date: series[i].date, rank: series[i].rank, value: Math.max(-1, Math.min(1, r)) });
        }
      }
      return points;
    },
  },
  {
    id: 'drawdown',
    name: 'Drawdown',
    category: ['Statistical', 'Volatility'],
    color: '#f43f5e',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'The underwater curve: percent decline from the highest close seen so far, 0 at fresh highs. Depth shows how far price fell from its peak, width how long it stayed down — the pain a buy-and-hold position actually sat through. Ulcer Index condenses this curve into a single number.',
    compute: (series) => {
      let peak = -Infinity;
      const points = [];
      series.forEach(d => {
        if (d.close > peak) peak = d.close;
        if (peak > 0) {
          points.push({ date: d.date, rank: d.rank, value: (100 * (d.close - peak)) / peak });
        }
      });
      return points;
    },
  },
  {
    id: 'historical_volatility',
    name: 'Historical Volatility',
    category: ['Statistical', 'Volatility'],
    color: '#f472b6',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length'],
    params: { length: 10, height: 70 },
    info: 'Annualized standard deviation of log returns over the period, in percent (√252 convention on daily bars; intraday/weekly/monthly bars annualize by their own bars-per-year) — the realized volatility of the series.',
    compute: (series, { length = 10 } = {}) => {
      const n = Math.max(2, Math.round(length));
      // annualize by the series' actual bar timeframe (median of the first
      // ~20 deltas — robust to a leading weekend gap): 252 trading days for
      // daily, 252 sessions of 6.5h for intraday, 52 weekly, 12 monthly
      const HOUR = 3600e3, DAY = 86400e3;
      const deltas = [];
      for (let i = 1; i < Math.min(series.length, 21); i++) {
        deltas.push(+series[i].date - +series[i - 1].date);
      }
      deltas.sort((a, b) => a - b);
      const spacing = deltas.length ? deltas[Math.floor(deltas.length / 2)] : DAY;
      const barsPerYear = !(spacing > 0) ? 252
        : spacing < 12 * HOUR ? (252 * 6.5 * HOUR) / spacing
          : spacing < 4 * DAY ? 252
            : spacing < 20 * DAY ? 52
              : 12;
      const logRet = series.map((d, i) =>
        i > 0 && series[i - 1].close > 0 && d.close > 0 ? Math.log(d.close / series[i - 1].close) : NaN);
      const sd = stdev(logRet.map(v => (isFinite(v) ? v : 0)), n);
      const points = [];
      series.forEach((d, i) => {
        if (i <= n || !isFinite(sd[i])) return;
        points.push({ date: d.date, rank: d.rank, value: sd[i] * Math.sqrt(barsPerYear) * 100 });
      });
      return points;
    },
  },
  {
    id: 'linreg_r2',
    name: 'Linear Reg R2',
    category: ['Statistical', 'Trend Strength'],
    color: '#a78bda',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length', 'source'],
    params: { length: 14, source: 'close', height: 70 },
    info: 'R² of the linear regression fit over the trailing period (0–1): how well a straight line explains recent price — high values mean a clean trend, low values chop.',
    compute: (series, { length = 14, source = 'close' } = {}) => {
      const n = Math.max(3, Math.round(length));
      const line = linReg(series.map(d => d[source]), n, 'r2');
      const points = [];
      line.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'linreg_slope',
    name: 'Linear Reg Slope',
    category: 'Statistical',
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length', 'source'],
    params: { length: 14, source: 'close', height: 70 },
    info: 'Slope of the linear regression over the trailing period — price change per bar of the fitted trend, positive in uptrends and negative in downtrends.',
    compute: (series, { length = 14, source = 'close' } = {}) => {
      const n = Math.max(2, Math.round(length));
      const line = linReg(series.map(d => d[source]), n, 'slope');
      const points = [];
      line.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'prime_number_oscillator',
    name: 'Prime Number Oscillator',
    category: ['Statistical', 'Oscillators'],
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color'],
    params: { height: 70 },
    info: 'The distance from the close to its nearest prime number — a curiosity indicator: some traders watch primes as natural support/resistance levels.',
    compute: (series) => series.map(d => ({
      date: d.date,
      rank: d.rank,
      value: d.close - nearestPrime(d.close),
    })),
  },
  {
    id: 'random_walk_index',
    name: 'Random Walk Index',
    category: 'Statistical',
    color: '#22c55e',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 1,
    fields: ['length'],
    params: { length: 14, height: 70 },
    info: 'How far price has traveled versus what a random walk would produce: RWI High and RWI Low take the best reading over lookbacks up to the period, each move scaled by average true range × √time. Readings above 1 mean the move is stronger than chance.',
    lines: [
      { key: 'high', color: '#22c55e', label: 'RWI High — trending up' },
      { key: 'low', color: '#ef4444', label: 'RWI Low — trending down' },
    ],
    legend: [
      { color: '#22c55e', label: 'RWI High — trending up' },
      { color: '#ef4444', label: 'RWI Low — trending down' },
    ],
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const tr = trueRanges(series);
      // prefix sum of TR so each lookback's average is O(1)
      const cum = [0];
      tr.forEach(v => cum.push(cum[cum.length - 1] + v));
      const points = [];
      series.forEach((d, i) => {
        if (i < n) return;
        let rwiH = 0, rwiL = 0;
        for (let k = 2; k <= n; k++) {
          const avgTR = (cum[i + 1] - cum[i - k + 1]) / k;
          if (avgTR > 0) {
            const denom = avgTR * Math.sqrt(k);
            rwiH = Math.max(rwiH, (d.high - series[i - k].low) / denom);
            rwiL = Math.max(rwiL, (series[i - k].high - d.low) / denom);
          }
        }
        points.push({ date: d.date, rank: d.rank, value: rwiH, line: 'high' });
        points.push({ date: d.date, rank: d.rank, value: rwiL, line: 'low' });
      });
      return points;
    },
  },
  {
    id: 'standard_deviation',
    name: 'Standard Deviation',
    category: 'Statistical',
    color: '#5eead4',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color', 'length', 'source'],
    params: { length: 20, source: 'close', height: 70 },
    info: 'Rolling standard deviation of the selected field over the trailing period — raw dispersion, the building block of Bollinger Bands.',
    compute: (series, { length = 20, source = 'close' } = {}) => {
      const n = Math.max(2, Math.round(length));
      const sd = stdev(series.map(d => d[source]), n);
      const points = [];
      sd.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'time_series_forecast',
    name: 'Time Series Forecast',
    category: ['Statistical', 'Projection'],
    color: '#f59e0b',
    fields: ['color', 'length', 'source'],
    params: { length: 14, source: 'close' },
    info: 'The linear-regression fit evaluated at each bar — the classic Time Series Forecast overlay, hugging price like a low-lag moving average.',
    compute: (series, { length = 14, source = 'close' } = {}) => {
      const n = Math.max(2, Math.round(length));
      const line = timeSeries(series.map(d => d[source]), n);
      const points = [];
      line.forEach((v, i) => {
        if (isFinite(v)) points.push({ date: series[i].date, rank: series[i].rank, value: v });
      });
      return points;
    },
  },
  {
    id: 'valuation_lines',
    name: 'Valuation Lines',
    category: 'Statistical',
    color: '#e5e7eb',
    visibleWindow: true,
    axisTags: true,
    fields: [],
    params: {},
    info: 'Horizontal valuation levels computed from the bars currently visible on screen: the average close plus bands at ±1 and ±2 standard deviations — where price is cheap or rich within the window you are looking at. The levels re-fit as you pan and zoom.',
    lines: [
      { key: 'p2', color: '#a78bda', width: 1, label: '+2σ' },
      { key: 'p1', color: '#5e8ca8', width: 1, label: '+1σ' },
      { key: 'avg', color: '#e5e7eb', label: 'Average close' },
      { key: 'm1', color: '#5e8ca8', width: 1, label: '-1σ' },
      { key: 'm2', color: '#a78bda', width: 1, label: '-2σ' },
    ],
    legend: [
      { color: '#e5e7eb', label: 'Average close' },
      { color: '#5e8ca8', label: '±1 standard deviation' },
      { color: '#a78bda', label: '±2 standard deviations' },
    ],
    compute: (series) => {
      if (!series.length) return [];
      const closes = series.map(d => d.close);
      const mean = closes.reduce((s, c) => s + c, 0) / closes.length;
      const sd = Math.sqrt(closes.reduce((s, c) => s + (c - mean) * (c - mean), 0) / closes.length);
      const levels = [
        ['p2', mean + 2 * sd], ['p1', mean + sd], ['avg', mean],
        ['m1', mean - sd], ['m2', mean - 2 * sd],
      ];
      const points = [];
      series.forEach(d => {
        levels.forEach(([line, value]) => points.push({ date: d.date, rank: d.rank, value, line }));
      });
      return points;
    },
  },
  {
    id: 'moon_phases',
    name: 'Moon Phases',
    category: 'Statistical',
    color: '#3b82f6',
    renderAs: 'icons',
    fields: [],
    params: {},
    info: 'Marks lunar events on the chart: a blue circle above the bar at each new moon, a white circle below at each full moon (Meeus astronomical approximation, accurate to the minute). A seasonality curiosity — trade it at your own risk.',
    compute: (series) => {
      if (!series.length) return [];
      const rad = (deg) => (deg * Math.PI) / 180;
      // Meeus lunation formula: JD of the new (integer k) or full (k + 0.5)
      // moon nearest lunation number k
      const moonEventJD = (k) => {
        const t = k / 1236.85, t2 = t * t, t3 = t2 * t;
        const aS = rad(359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3);
        const aM = rad(306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3);
        const f = rad(21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3);
        const dev = (0.1734 - 0.000393 * t) * Math.sin(aS)
          + 0.0021 * Math.sin(2 * aS)
          - 0.4068 * Math.sin(aM)
          + 0.0161 * Math.sin(2 * aM)
          - 0.0004 * Math.sin(3 * aM)
          + 0.0104 * Math.sin(2 * f)
          - 0.0051 * Math.sin(aS + aM)
          - 0.0074 * Math.sin(aS - aM)
          + 0.0004 * Math.sin(2 * f + aS)
          - 0.0004 * Math.sin(2 * f - aS)
          - 0.0006 * Math.sin(2 * f + aM)
          + 0.0010 * Math.sin(2 * f - aM)
          + 0.0005 * Math.sin(aS + 2 * aM);
        return 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
          + 0.00033 * Math.sin(rad(166.56) + rad(132.87) * t - rad(0.009173) * t2) + dev;
      };
      const jdToMs = (jd) => (jd - 2440587.5) * 86400e3;
      const kNear = (dt) => {
        const doy = Math.floor((dt - new Date(dt.getFullYear(), 0, 1)) / 86400e3) + 1;
        return Math.floor(((dt.getFullYear() - 1900) + doy / 365.25) * 12.3685);
      };
      // all new/full moons spanning the series, then pin each onto the first
      // bar at or after the event
      const first = series[0].date, last = series[series.length - 1].date;
      const events = [];
      for (let k = kNear(first) - 1; k <= kNear(last) + 1; k += 0.5) {
        const ms = jdToMs(moonEventJD(k));
        if (ms >= +first && ms <= +last + 40 * 86400e3) events.push({ ms, isNew: k % 1 === 0 });
      }
      const points = [];
      let bi = 0;
      events.forEach(ev => {
        while (bi < series.length && +series[bi].date < ev.ms) bi++;
        if (bi >= series.length) return;
        const d = series[bi];
        points.push({
          date: d.date, rank: d.rank,
          price: ev.isNew ? d.high : d.low,
          icon: ev.isNew ? 'moon_new' : 'moon_full',
        });
      });
      return points;
    },
  },
];
