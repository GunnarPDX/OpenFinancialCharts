import React from 'react';

export const MIN_WINDOW = 10;
// zoom-out cap: more bars than this on screen drags rendering performance
export const MAX_WINDOW = 2000;
export const FUTURE_PAD = 30; // empty slots the window may scroll past the last bar
const PAST_PAD = 30; // empty slots the window may scroll before the first bar
// extra points drawn past each edge, cut off by the chart-area clipPath so they
// slide out of view gradually instead of popping at the boundary
const EDGE_BUF = 2;

// the visible-window / pan / zoom state cluster for the zoomable chart:
// window indices + clamps, fractional scroll, drag/pinch handlers, the
// series-change reframing effect (with savedView restore), and the
// loadOlder trigger when scrolling into the empty past
const useZoomWindow = (series, savedView, loadOlder, { xMax }) => {
  const maxIdx = series.length - 1;

  // visible window as [startIndex, endIndex] into series; clamped below because
  // the first render after a series change still holds the old window
  const [[rawW0, rawW1], setWindow] = React.useState([savedView.w0 ?? 0, savedView.w1 ?? maxIdx]);
  const w1 = Math.min(rawW1, maxIdx + FUTURE_PAD);
  const w0 = Math.min(rawW0, w1);
  // fractional part of the window start, in index units — the chart group slides
  // by -frac * step so candles cross the clip edge gradually instead of per-slot
  const [frac, setFrac] = React.useState(savedView.frac ?? 0);

  // switching line type can change the series length — show the full new series
  // (skip the mount run so it doesn't clobber the restored view)
  const seriesMounted = React.useRef(false);
  const prevSeriesRef = React.useRef(null);
  // the persisted view is honored exactly once, on the first pass with data;
  // without this the "fresh data" reframe below clobbers it on every reload
  const viewRestoredRef = React.useRef(false);
  React.useEffect(() => {
    const prev = prevSeriesRef.current;
    prevSeriesRef.current = series;
    if (!seriesMounted.current) {
      seriesMounted.current = true;
      // the chart mounts only once feed data exists — frame it. (Skipping the
      // mount run predates the feed gate and left fresh loads at full range.)
      if (!series.length) return;
    }
    // older bars prepended (backwards pagination): the same bars are still on
    // screen, just at shifted ranks — move the window instead of reframing
    if (prev && prev.length && series.length > prev.length) {
      const shift = series.findIndex(b => +b.date === +prev[0].date);
      const sameTail = +series[series.length - 1].date === +prev[prev.length - 1].date;
      if (shift > 0 && sameTail) {
        setWindow(([a, b]) => [a + shift, b + shift]);
        return;
      }
    }
    // head trimmed (capQuotes on a week-scale live session): the oldest bars
    // were dropped, usually in the same update that appended a fresh candle.
    // The on-screen bars still exist at shifted ranks — slide the window left
    // by the trim (plus the tape-follow shift for any appended candles)
    // instead of reframing to full range
    // (trims always shrink the series — the length guard keeps whole-series
    // replacements like a symbol switch out of this branch)
    if (prev && prev.length && series.length && series.length < prev.length
        && +series[0].date !== +prev[0].date) {
      const k = prev.findIndex(b => +b.date === +series[0].date);
      if (k > 0) {
        const grew = series.length - (prev.length - k);
        setWindow(([a, b]) => {
          const w = b - a;
          const follow = b >= prev.length - 10 ? Math.max(0, grew) : 0;
          const nb = Math.max(w, b - k + follow);
          return [Math.max(0, nb - w), nb];
        });
        return;
      }
    }
    // live tick: same head, and either the last candle updated in place (same
    // length) or new candles appended at the tail — keep the user's window;
    // follow the tape (shift right with each new candle) while any of the 10
    // newest candles are on screen; scrolled further back than that, stay put
    if (prev && prev.length && +series[0].date === +prev[0].date) {
      const grew = series.length - prev.length;
      if (grew === 0 && +series[series.length - 1].date === +prev[prev.length - 1].date) return;
      if (grew > 0 && +series[prev.length - 1].date === +prev[prev.length - 1].date) {
        setWindow(([a, b]) => (b >= prev.length - 10 ? [a + grew, b + grew] : [a, b]));
        return;
      }
    }
    // first pass with data: keep the restored view if it still fits this series
    // (symbol/size/timeframe persist too, so it usually does)
    if (!viewRestoredRef.current) {
      viewRestoredRef.current = true;
      const { w0: s0, w1: s1 } = savedView;
      if (s0 != null && s1 != null && s1 - s0 >= MIN_WINDOW
          && s1 <= series.length - 1 + FUTURE_PAD && s0 < series.length) {
        return;
      }
    }
    // fresh data (page load fetch, candle-size switch, extended-hours toggle):
    // frame the 300 most recent bars of whatever is actually displayed
    const n = series.length;
    setWindow([Math.max(0, n - 300), Math.max(0, n - 1)]);
    setFrac(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  // scrolling into the empty buffer before the first bar requests the next
  // older chunk (no eager prefetch — only when the user actually reaches back)
  React.useEffect(() => {
    if (loadOlder && w0 + frac < 0) loadOlder();
  }, [w0, frac, loadOlder]);

  const visible = React.useMemo(() => series.slice(Math.max(0, w0), w1 + 1), [series, w0, w1]);

  // what actually gets rendered: the visible window plus buffered edge points
  const drawLo = Math.max(0, w0 - EDGE_BUF);
  const drawHi = Math.min(maxIdx, w1 + EDGE_BUF);
  const drawn = React.useMemo(() => series.slice(drawLo, drawHi + 1), [series, drawLo, drawHi]);

  const handleDrag = ({ shift, direction }) => {
    if (!direction || !shift) return;
    const delta = shift * (direction === 'right' ? -1 : 1);
    const w = w1 - w0;
    // keep at least one bar visible at either extreme while allowing up to
    // PAST_PAD / FUTURE_PAD empty slots beyond the data
    const minStart = Math.max(-PAST_PAD, 1 - w);
    const total = Math.max(minStart, Math.min(w0 + frac + delta, Math.min(maxIdx, maxIdx + FUTURE_PAD - w)));
    const n0 = Math.floor(total);
    setWindow([n0, n0 + w]);
    setFrac(total - n0);
  };

  const pinchFn = (direction, focusX) => {
    if (!direction) return;
    setWindow(([x0, x1]) => {
      const trim = 2 * Math.max(1, Math.round((x1 - x0) * 0.02));
      // anchor the zoom on the cursor: split the trim by its x position, so
      // the bar under the pointer stays put (keyboard zoom splits evenly)
      const f = focusX == null || !xMax ? 0.5 : Math.max(0, Math.min(1, focusX / xMax));
      const dl = Math.round(trim * f);
      const dr = trim - dl;
      let n0 = Math.max(0, direction === 'IN' ? x0 + dl : x0 - dl);
      let n1 = direction === 'IN' ? x1 - dr : Math.min(Math.max(maxIdx, x1), x1 + dr);
      // clamp to the size bounds instead of rejecting the step — a reject
      // walls off zooming entirely once a window sits near/past a bound
      const span = n1 - n0;
      const clamped = Math.max(MIN_WINDOW, Math.min(MAX_WINDOW, span));
      if (clamped !== span) {
        n0 = Math.max(0, Math.round(n0 + (span - clamped) * f));
        n1 = n0 + clamped;
      }
      return [n0, n1];
    });
  };
  const handlePinch = React.useRef(pinchFn);
  handlePinch.current = pinchFn;

  return { w0, w1, frac, setWindow, setFrac, handleDrag, handlePinch, maxIdx, visible, drawLo, drawHi, drawn };
};

export default useZoomWindow;
