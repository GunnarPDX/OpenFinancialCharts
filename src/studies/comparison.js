// Benchmark-comparison studies — split out of studies.js; defs are verbatim.
import { benchmarkCloses, rollingReturnStats } from './math';

export const comparisonStudies = [
  {
    id: 'beta',
    name: 'Beta',
    category: ['Comparison', 'Volatility'],
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 1,
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'Rolling beta versus the benchmark: covariance of the returns divided by the benchmark\'s return variance over the trailing period. Above 1 the security amplifies benchmark moves; below 1 it damps them. (Benchmark is a built-in placeholder until a comparison symbol feed exists.)',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(5, Math.round(length));
      const stats = rollingReturnStats(series, benchmarkCloses(series), n);
      const points = [];
      for (let i = n; i < series.length; i++) {
        const st = stats[i];
        if (st && st.vb > 0) {
          points.push({ date: series[i].date, rank: series[i].rank, value: st.cov / st.vb });
        }
      }
      return points;
    },
  },
  {
    id: 'performance_index',
    name: 'Performance Index',
    category: 'Comparison',
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 100,
    fields: ['color'],
    params: { height: 70 },
    info: 'Relative performance indexed to 100 at the start of the data: the security\'s cumulative return divided by the benchmark\'s. Above 100 it is outperforming, below 100 underperforming. (Benchmark is a built-in placeholder until a comparison symbol feed exists.)',
    compute: (series) => {
      if (!series.length) return [];
      const bench = benchmarkCloses(series);
      const s0 = series[0].close;
      const b0 = bench[0];
      return series.map((d, i) => ({
        date: d.date,
        rank: d.rank,
        value: ((d.close / s0) / (bench[i] / b0)) * 100,
      }));
    },
  },
  {
    id: 'price_relative',
    name: 'Price Relative',
    category: 'Comparison',
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'The raw price ratio, security close divided by benchmark close — rising means the security is gaining on the benchmark. (Benchmark is a built-in placeholder until a comparison symbol feed exists.)',
    compute: (series) => {
      const bench = benchmarkCloses(series);
      return series.map((d, i) => ({
        date: d.date,
        rank: d.rank,
        value: d.close / bench[i],
      }));
    },
  },
];
