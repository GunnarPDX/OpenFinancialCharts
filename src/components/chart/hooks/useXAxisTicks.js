import React from 'react';

import { scaleLinear } from '@visx/scale';

import { isIntradaySeries, extendedSession } from '../sessionUtils';

// x-axis tick derivation: the bar-slot axis scale, major/minor tick ranks,
// their labels, the dense-grid tick list, and the session axis markers
const useXAxisTicks = ({ series, w0, w1, frac, step, parentWidth, maxIdx, fmtDay, fmtTime }) => {
  // x axis in bar-slot space: the candles are laid out per bar with time gaps
  // compressed, so a wall-clock time scale would drift off the bars (and land
  // on midnights across overnight gaps). Ticks are actual bars, labeled with
  // that bar's time, and slide with the fractional scroll.
  const xAxisScale = React.useMemo(() => scaleLinear({
      domain: [w0, w1],
      range: [(0.5 - frac) * step, (w1 - w0 + 0.5 - frac) * step],
  }), [w0, w1, frac, step]);

  const numXTicks = parentWidth > 520 ? 7 : 4;
  const { xTicksMajor, xTicksMinor } = React.useMemo(() => {
    let major = Math.max(1, Math.round((w1 - w0) / numXTicks));
    const minor = Math.max(1, Math.floor(major / 4));
    // major must be a multiple of minor — the loop below steps by minor, so a
    // non-multiple major only labels ranks divisible by both (lcm), which can
    // leave the axis with one or zero labels
    major = Math.max(minor, Math.round(major / minor) * minor);
    const majors = [];
    const minors = [];
    // anchor on multiples of the interval so ticks stay put while panning
    for (let r = Math.ceil(w0 / minor) * minor; r <= w1; r += minor) {
      (r % major === 0 ? majors : minors).push(r);
    }
    return { xTicksMajor: majors, xTicksMinor: minors };
  }, [w0, w1, numXTicks]);

  // intraday ticks show the time, switching to MM/DD on the first tick of a
  // new day; daily/weekly candles label every tick with the date
  const xMajorLabels = React.useMemo(() => {
    const m = new Map();
    const intraday = isIntradaySeries(series);
    // when the window spans more than one calendar day, prefix times with the date
    const days = new Set();
    xTicksMajor.forEach(r => {
      const d = series[Math.round(r)]?.date;
      if (d) days.add(fmtDay(d));
    });
    const multiDay = days.size > 1;
    xTicksMajor.forEach(r => {
      const d = series[Math.round(r)]?.date;
      if (!d) { m.set(r, ''); return; }
      if (!intraday) m.set(r, fmtDay(d));
      else m.set(r, multiDay ? `${fmtDay(d)} ${fmtTime(d)}` : fmtTime(d));
    });
    return m;
  }, [xTicksMajor, series, fmtDay, fmtTime]);

  // stable identity so the memoized axes component isn't re-rendered per frame
  const xTickLabel = React.useCallback((r) => {
    if (xMajorLabels.has(r)) return xMajorLabels.get(r);
    const d = series[Math.round(r)]?.date;
    return d ? fmtTime(d) : '';
  }, [xMajorLabels, series, fmtTime]);

  // dense grid: one vertical line per datapoint in the window, strided so a
  // max-zoom-out window doesn't render thousands of grid lines
  const xTicksEvery = React.useMemo(() => {
    const n = w1 - w0 + 1;
    const stride = Math.max(1, Math.ceil(n / 400));
    return Array.from({ length: Math.ceil(n / stride) }, (_, i) => w0 + i * stride);
  }, [w0, w1]);

  // session boundaries, marked on the x axis: calendar day starts, market
  // open (pre → regular) and market close (regular → post). Intraday only —
  // on daily/weekly candles every bar is a new day. Boundary detection walks
  // the whole series through Intl formatters, so it runs once per series and
  // panning only filters the precomputed list to the window.
  const allAxisMarkers = React.useMemo(() => {
    const intraday = series.length > 1 && isIntradaySeries(series);
    if (!intraday) return [];
    const out = [];
    for (let r = 1; r < series.length; r++) {
      const prev = series[r - 1];
      const cur = series[r];
      if (fmtDay(cur.date) !== fmtDay(prev.date)) {
        out.push({ r, label: 'new day', color: '#3b82f6' });
      }
      const ps = extendedSession(prev);
      const cs = extendedSession(cur);
      if (ps === 'pre' && cs === null) out.push({ r, label: 'mkt open', color: 'var(--green)' });
      else if (ps === null && cs === 'post') out.push({ r, label: 'mkt close', color: 'var(--red)' });
    }
    return out;
  }, [series, fmtDay]);
  const axisMarkers = React.useMemo(() => {
    const lo = Math.max(1, Math.ceil(w0));
    const hi = Math.min(maxIdx, w1);
    return allAxisMarkers.filter(m => m.r >= lo && m.r <= hi);
  }, [allAxisMarkers, w0, w1, maxIdx]);

  return { xAxisScale, xTicksMajor, xTicksMinor, xTickLabel, xTicksEvery, axisMarkers };
};

export default useXAxisTicks;
