import React from 'react';

import { localPoint } from '@visx/event';

// drawings anchor to data coords (bar timestamp + price); px conversions
// between time, rank, and pixel space for the current window
const useTimeRankMap = ({ series, maxIdx, w0, frac, step, yScale }) => {
  const sortedTimes = React.useMemo(
    () => series.map(d => [+d.date, d.rank]).sort((a, b) => a[0] - b[0]),
    [series]
  );
  const rankForTime = (t) => {
    const a = sortedTimes;
    if (!a.length) return 0;
    if (t <= a[0][0]) return a[0][1];
    if (t >= a[a.length - 1][0]) return a[a.length - 1][1];
    let lo = 0, hi = a.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (a[m][0] < t) lo = m + 1; else hi = m;
    }
    // interpolate fractionally between neighbors so drawings aren't
    // quantized to bar slots (freehand especially)
    const [t1, r1] = a[lo];
    const [t0, r0] = a[lo - 1];
    const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    return r0 + f * (r1 - r0);
  };
  const pxForTime = (t) => (rankForTime(t) - w0 + 0.5 - frac) * step;
  const pxForRank = (r) => (r - w0 + 0.5 - frac) * step;
  const timeForRank = (rf) => {
    // series can be empty (e.g. only extended-hours bars, all filtered out)
    if (!series.length) return 0;
    const c = Math.max(0, Math.min(maxIdx, rf));
    const i0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(c)));
    const t0 = +series[i0].date;
    const t1 = series[i0 + 1] ? +series[i0 + 1].date : t0;
    return t0 + (t1 - t0) * (c - i0);
  };
  const pointToData = (event) => {
    const pt = localPoint(event);
    if (!pt || !series.length) return null;
    const rf = Math.max(0, Math.min(maxIdx, w0 + frac + pt.x / step - 0.5));
    const i0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(rf)));
    const t0 = +series[i0].date;
    const t1 = series[i0 + 1] ? +series[i0 + 1].date : t0;
    const t = t0 + (t1 - t0) * (rf - i0);
    return { x: pt.x, y: pt.y, t, p: yScale.invert(pt.y) };
  };

  return { rankForTime, pxForTime, pxForRank, timeForRank, pointToData };
};

export default useTimeRankMap;
