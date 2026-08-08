// Aggregated series transforms. Each takes the app's quotes (rendered in array
// order) and returns bar-like items the chart pipeline already understands:
// { date, rank, open, high, low, close, direction }.
//
// ponytail: sizes (brick/box/range/reversal) are auto-derived from the closing
// price span; expose them as user settings when tuning matters.

const closeSpan = (quotes) => {
  let lo = Infinity, hi = -Infinity;
  quotes.forEach(q => {
    if (q.close < lo) lo = q.close;
    if (q.close > hi) hi = q.close;
  });
  return hi - lo;
};

// scaleBand collapses duplicate domain values, and several transforms emit
// multiple items from one source bar — nudge timestamps until unique
const finalize = (items) => {
  const seen = new Set();
  return items.map((it, i) => {
    let t = +it.date;
    while (seen.has(t)) t += 1;
    seen.add(t);
    return {
      high: Math.max(it.open, it.close),
      low: Math.min(it.open, it.close),
      direction: it.open > it.close, // true = down bar; flat bars count as up (green)
      ...it,
      date: new Date(t),
      rank: i,
    };
  });
};

const heikinAshi = (quotes) => {
  let prev = null;
  const items = quotes.map(q => {
    const close = (q.open + q.high + q.low + q.close) / 4;
    const open = prev ? (prev.open + prev.close) / 2 : (q.open + q.close) / 2;
    const bar = {
      date: q.date,
      open,
      close,
      high: Math.max(q.high, open, close),
      low: Math.min(q.low, open, close),
      volume: q.volume,
    };
    prev = bar;
    return bar;
  });
  return finalize(items);
};

const renko = (quotes, size) => {
  const items = [];
  let top = quotes[0].close;
  let bottom = quotes[0].close;
  // constituent-bar volume accrues until bricks emit, then splits across them
  let vol = 0;
  quotes.forEach(q => {
    const c = q.close;
    vol += q.volume || 0;
    const first = items.length;
    while (c >= top + size) {
      items.push({ date: q.date, open: top, close: top + size, volume: 0 });
      bottom = top;
      top += size;
    }
    while (c <= bottom - size) {
      items.push({ date: q.date, open: bottom, close: bottom - size, volume: 0 });
      top = bottom;
      bottom -= size;
    }
    const emitted = items.length - first;
    if (emitted) {
      const share = vol / emitted;
      for (let k = first; k < items.length; k++) items[k].volume = share;
      vol = 0;
    }
  });
  return finalize(items);
};

const lineBreak = (quotes, n = 3) => {
  const lines = [];
  let vol = 0; // constituent-bar volume since the last emitted line
  quotes.forEach((q, i) => {
    const c = q.close;
    vol += q.volume || 0;
    if (!lines.length) {
      if (i > 0 && c !== quotes[0].close) {
        lines.push({ date: q.date, open: quotes[0].close, close: c, volume: vol });
        vol = 0;
      }
      return;
    }
    const recent = lines.slice(-n);
    const hi = Math.max(...recent.map(l => Math.max(l.open, l.close)));
    const lo = Math.min(...recent.map(l => Math.min(l.open, l.close)));
    const last = lines[lines.length - 1];
    if (c > hi) {
      lines.push({ date: q.date, open: Math.max(last.open, last.close), close: c, volume: vol });
      vol = 0;
    } else if (c < lo) {
      lines.push({ date: q.date, open: Math.min(last.open, last.close), close: c, volume: vol });
      vol = 0;
    }
  });
  return finalize(lines);
};

const rangeBars = (quotes, range) => {
  const items = [];
  let cur = null;
  quotes.forEach(q => {
    if (!cur) {
      cur = { date: q.date, open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0 };
    } else {
      cur.high = Math.max(cur.high, q.high);
      cur.low = Math.min(cur.low, q.low);
      cur.close = q.close;
      cur.volume += q.volume || 0;
    }
    if (cur.high - cur.low >= range) {
      items.push(cur);
      cur = null;
    }
  });
  if (cur) items.push(cur);
  return finalize(items);
};

const kagi = (quotes, reversal) => {
  const segs = [];
  let dir = 0;
  let start = quotes[0].close;
  let extreme = quotes[0].close;
  let vol = 0; // constituent-bar volume since the last emitted segment
  quotes.forEach(q => {
    const c = q.close;
    vol += q.volume || 0;
    if (dir === 0) {
      if (Math.abs(c - start) >= reversal) {
        dir = Math.sign(c - start);
        extreme = c;
      }
      return;
    }
    if ((dir === 1 && c > extreme) || (dir === -1 && c < extreme)) {
      extreme = c;
    } else if (Math.abs(extreme - c) >= reversal) {
      segs.push({ date: q.date, open: start, close: extreme, volume: vol });
      vol = 0;
      start = extreme;
      dir = -dir;
      extreme = c;
    }
  });
  segs.push({ date: quotes[quotes.length - 1].date, open: start, close: extreme, volume: vol });

  // yang (thick) once the segment breaks the prior segment's high shoulder,
  // yin (thin) once it breaks the prior low; otherwise the style carries over
  let yang = true;
  const items = segs.map((s, k) => {
    if (k > 0) {
      const p = segs[k - 1];
      const pHigh = Math.max(p.open, p.close);
      const pLow = Math.min(p.open, p.close);
      if (s.close > pHigh) yang = true;
      else if (s.close < pLow) yang = false;
    }
    return { ...s, yang };
  });
  return finalize(items);
};

const pointFigure = (quotes, box, rev = 3) => {
  const cols = [];
  let type = null;
  let hi = Math.round(quotes[0].close / box);
  let lo = hi;
  let date = quotes[0].date;
  let vol = 0; // constituent-bar volume for the current column
  quotes.forEach(q => {
    const b = Math.round(q.close / box);
    vol += q.volume || 0;
    if (!type) {
      if (b > hi) { type = 'X'; hi = b; }
      else if (b < lo) { type = 'O'; lo = b; }
      return;
    }
    if (type === 'X') {
      if (b > hi) {
        hi = b;
      } else if (hi - b >= rev) {
        cols.push({ date, type, hi, lo, volume: vol });
        vol = 0;
        date = q.date;
        type = 'O';
        lo = b;
        hi = hi - 1;
      }
    } else {
      if (b < lo) {
        lo = b;
      } else if (b - lo >= rev) {
        cols.push({ date, type, hi, lo, volume: vol });
        vol = 0;
        date = q.date;
        type = 'X';
        hi = b;
        lo = lo + 1;
      }
    }
  });
  cols.push({ date, type: type || 'X', hi, lo, volume: vol });

  const items = cols.map(c => ({
    date: c.date,
    type: c.type,
    volume: c.volume,
    box,
    boxes: Array.from({ length: c.hi - c.lo + 1 }, (_, k) => (c.lo + k) * box),
    open: c.type === 'X' ? c.lo * box : c.hi * box,
    close: c.type === 'X' ? c.hi * box : c.lo * box,
    high: (c.hi + 1) * box,
    low: c.lo * box,
  }));
  return finalize(items);
};

// transforms whose brick/box/range size derives from the close span; a flat or
// too-short series gives size 0, which renko would spin on forever
const SIZED = ['renko', 'range_bars', 'kagi', 'point_figure'];

export const aggregateSeries = (quotes, lineType) => {
  // fewer than 2 bars: nothing to aggregate (and renko/kagi/pointFigure would
  // dereference quotes[0]). A zero/non-finite span means every close is equal —
  // no bricks/reversals exist, so returning the raw quotes is the least
  // surprising behavior (matches the default case for unknown lineTypes).
  if (quotes.length < 2) return quotes;
  const s = closeSpan(quotes);
  if (SIZED.includes(lineType) && !(s > 0 && isFinite(s))) return quotes;
  switch (lineType) {
    case 'heikin_ashi':
      return heikinAshi(quotes);
    case 'renko':
      return renko(quotes, s / 40);
    case 'line_break':
      return lineBreak(quotes);
    case 'range_bars':
      return rangeBars(quotes, s / 25);
    case 'kagi':
      return kagi(quotes, s / 30);
    case 'point_figure':
      return pointFigure(quotes, s / 50);
    default:
      return quotes;
  }
};
