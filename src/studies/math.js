// Shared indicator math for the built-in studies. Every helper takes plain
// number arrays (or the app's bar objects where OHLC is needed) and returns a
// same-length array, NaN during warmup.
//
// The core primitives (sma/wma/ema/wilders/rsi/atr) live in the portable
// theta-script package and are re-exported here, so scripts
// and studies keep sharing one implementation.
//
// The rolling helpers (stdev/linReg/cmoAlphaMA) are O(n): they slide an
// accumulator instead of rescanning the window per bar. Non-finite inputs
// (warmup NaNs from roc, nested smoothers, script series) poison a window the
// same way the old per-window scans did — the accumulators are rebuilt once
// the window is clean again, so outputs match the brute-force versions.

import { sma, wma, emaFrom, ema, wilders, rsi, trueRanges, atr } from 'theta-script/math';

export { sma, wma, emaFrom, ema, wilders, rsi, trueRanges, atr };

export const tma = (vals, n) =>
  sma(sma(vals, Math.ceil((n + 1) / 2)), Math.floor(n / 2) + 1);

export const dema = (vals, n) => {
  const e1 = ema(vals, n);
  const e2 = ema(e1, n);
  return vals.map((_, i) => 2 * e1[i] - e2[i]);
};

export const tema = (vals, n) => {
  const e1 = ema(vals, n);
  const e2 = ema(e1, n);
  const e3 = ema(e2, n);
  return vals.map((_, i) => 3 * e1[i] - 3 * e2[i] + e3[i]);
};

export const hull = (vals, n) => {
  const half = wma(vals, Math.max(1, Math.floor(n / 2)));
  const full = wma(vals, n);
  const diff = vals.map((_, i) => 2 * half[i] - full[i]);
  return wma(diff, Math.max(1, Math.round(Math.sqrt(n))));
};

// linear regression over the window: 'forecast' evaluates the fit at the
// window's end, 'intercept' at the start; 'slope' and 'r2' return fit stats.
// sx/sxx are window constants; sy/sxy (and syy for r2) roll with the window.
export const linReg = (vals, n, pick) => {
  const out = new Array(vals.length).fill(NaN);
  if (!(n >= 2) || vals.length < n) return out;
  const sx = (n * (n - 1)) / 2;
  const sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sxx - sx * sx;
  let sy = NaN, sxy = 0, syy = 0;
  let lastBad = -1;
  for (let i = 0; i < vals.length; i++) {
    if (!isFinite(vals[i])) lastBad = i;
    if (i < n - 1) continue;
    const start = i - n + 1;
    if (lastBad >= start) { sy = NaN; continue; }
    if (Number.isNaN(sy)) {
      sy = 0; sxy = 0; syy = 0;
      for (let k = 0; k < n; k++) {
        const y = vals[start + k];
        sy += y; sxy += k * y; syy += y * y;
      }
    } else {
      const dropped = vals[start - 1];
      // slide: each x shifts down one, the new bar enters at x = n - 1
      sxy += (n - 1) * vals[i] - (sy - dropped);
      sy += vals[i] - dropped;
      syy += vals[i] * vals[i] - dropped * dropped;
    }
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    if (pick === 'intercept') out[i] = intercept;
    else if (pick === 'slope') out[i] = slope;
    else if (pick === 'r2') {
      // closed forms of the residual / total sums of squares from the
      // rolled moments — no second pass over the window. Cancellation
      // guard: either sum under ~1e-12 of its magnitude scale (syy) is
      // float residue — a flat window / perfect fit reads as exactly 1
      const ssTot = syy - (sy * sy) / n;
      const ssRes = syy + n * intercept * intercept + 2 * intercept * slope * sx
        + slope * slope * sxx - 2 * (intercept * sy + slope * sxy);
      out[i] = ssTot > syy * 1e-12 && ssRes > syy * 1e-12
        ? Math.max(0, Math.min(1, 1 - ssRes / ssTot))
        : 1;
    } else out[i] = intercept + slope * (n - 1);
  }
  return out;
};

// window clamped to >= 2: a 1-bar regression is 0/0 and rendered nothing
export const timeSeries = (vals, n) => linReg(vals, Math.max(2, n), 'forecast');

// EMA whose alpha is scaled by the Chande momentum oscillator
export const cmoAlphaMA = (vals, n, cmoP) => {
  const k = 2 / (n + 1);
  const out = new Array(vals.length).fill(NaN);
  let prev = null;
  let up = 0, down = 0, moved = 0; // rolling sums/count of window diffs
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1];
    if (d > 0) { up += d; moved++; }
    else if (d < 0) { down -= d; moved++; }
    const j = i - cmoP; // diff leaving the window
    if (j >= 1) {
      const od = vals[j] - vals[j - 1];
      if (od > 0) { up -= od; moved--; }
      else if (od < 0) { down += od; moved--; }
    }
    if (i < cmoP) continue;
    // `moved` keeps a dead-flat window at exactly cmo = 0 despite any
    // floating-point residue left in the rolled sums
    const cmo = moved === 0 || up + down === 0 ? 0 : Math.abs((up - down) / (up + down));
    prev = prev == null ? vals[i] : k * cmo * vals[i] + (1 - k * cmo) * prev;
    out[i] = prev;
  }
  return out;
};

export const vidya = (vals, n) => cmoAlphaMA(vals, n, 9);
// ponytail: "Variable" (VMA) implemented as VIDYA with the CMO window tied to
// the period; swap in a volatility-index variant if fidelity matters
export const variable = (vals, n) => cmoAlphaMA(vals, n, Math.max(2, n));

// population standard deviation (÷ n) via rolling sum + sum of squares
export const stdev = (vals, n) => {
  const out = new Array(vals.length).fill(NaN);
  let s = NaN, s2 = 0;
  let lastBad = -1;
  for (let i = 0; i < vals.length; i++) {
    if (!isFinite(vals[i])) lastBad = i;
    if (i < n - 1) continue;
    const start = i - n + 1;
    if (lastBad >= start) { s = NaN; continue; }
    if (Number.isNaN(s)) {
      s = 0; s2 = 0;
      for (let k = start; k <= i; k++) {
        s += vals[k];
        s2 += vals[k] * vals[k];
      }
    } else {
      const dropped = vals[start - 1];
      s += vals[i] - dropped;
      s2 += vals[i] * vals[i] - dropped * dropped;
    }
    const m = s / n;
    // cancellation guard: rolling can leave tiny float residue in
    // s2/n − m² on a dead-flat window — clamp below ~1e-12 of the
    // magnitude scale (s2/n) to exactly 0 so flat windows read σ = 0
    const v = s2 / n - m * m;
    out[i] = v > (s2 / n) * 1e-12 ? Math.sqrt(v) : 0;
  }
  return out;
};

// percent rate of change vs p bars ago (NaN during warmup / zero base)
export const roc = (closes, p) => closes.map((c, i) =>
  (i >= p && closes[i - p] ? (100 * (c - closes[i - p])) / closes[i - p] : NaN));

// the canonical MACD pair: macd = EMA(fast) − EMA(slow), signal = EMA of macd
export const macdOf = (closes, fast, slow, signalLen) => {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const macd = closes.map((_, i) => f[i] - s[i]);
  return { macd, signal: ema(macd, signalLen) };
};

// TradingView's 4-color MACD/PPO histogram: teal shades above zero
// (rising/fading), pink/red below (recovering/falling)
export const macdHistColor = (hist, prevHist) => {
  const rising = isFinite(prevHist) && hist > prevHist;
  return hist >= 0
    ? (rising ? '#26a69a' : '#b2dfdb')
    : (rising ? '#ffcdd2' : '#ff5252');
};

// rolling max/min of the trailing n values (partial windows at the start,
// non-finite values skipped; NaN when the window holds no finite value).
// Monotonic-deque scan — O(n) total instead of a slice per bar.
export const rollingExtrema = (values, n) => {
  const max = new Array(values.length).fill(NaN);
  const min = new Array(values.length).fill(NaN);
  const maxQ = [], minQ = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isFinite(v)) {
      while (maxQ.length && values[maxQ[maxQ.length - 1]] <= v) maxQ.pop();
      maxQ.push(i);
      while (minQ.length && values[minQ[minQ.length - 1]] >= v) minQ.pop();
      minQ.push(i);
    }
    if (maxQ.length && maxQ[0] <= i - n) maxQ.shift();
    if (minQ.length && minQ[0] <= i - n) minQ.shift();
    if (maxQ.length) max[i] = values[maxQ[0]];
    if (minQ.length) min[i] = values[minQ[0]];
  }
  return { max, min };
};

// argmax/argmin variant of the deque: index of the max/min in the trailing n
// values, latest occurrence winning ties (matches a forward `>=` / `<=` scan);
// -1 while the window holds no finite value. Used by the Aroon family.
export const rollingArgExtrema = (values, n) => {
  const argMax = new Array(values.length).fill(-1);
  const argMin = new Array(values.length).fill(-1);
  const maxQ = [], minQ = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isFinite(v)) {
      while (maxQ.length && values[maxQ[maxQ.length - 1]] <= v) maxQ.pop();
      maxQ.push(i);
      while (minQ.length && values[minQ[minQ.length - 1]] >= v) minQ.pop();
      minQ.push(i);
    }
    if (maxQ.length && maxQ[0] <= i - n) maxQ.shift();
    if (minQ.length && minQ[0] <= i - n) minQ.shift();
    if (maxQ.length) argMax[i] = maxQ[0];
    if (minQ.length) argMin[i] = minQ[0];
  }
  return { argMax, argMin };
};

// Aroon Up / Down (0–100) over an (n+1)-bar window: how recently the window
// made its high / its low. NaN during warmup. Shared by the Aroon studies.
export const aroonUpDown = (series, n) => {
  const { argMax } = rollingArgExtrema(series.map(d => d.high), n + 1);
  const { argMin } = rollingArgExtrema(series.map(d => d.low), n + 1);
  const up = new Array(series.length).fill(NaN);
  const down = new Array(series.length).fill(NaN);
  for (let i = n; i < series.length; i++) {
    up[i] = (100 * (n - (i - argMax[i]))) / n;
    down[i] = (100 * (n - (i - argMin[i]))) / n;
  }
  return { up, down };
};

// Wilder's directional-movement pipeline, shared by ADX and ADX/DMS:
// smoothed +DI / -DI and the Wilder-smoothed DX (= ADX)
export const adxParts = (series, n) => {
  const tr = trueRanges(series);
  const plusDM = [0], minusDM = [0];
  for (let i = 1; i < series.length; i++) {
    const up = series[i].high - series[i - 1].high;
    const dn = series[i - 1].low - series[i].low;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
  }
  const sP = wilders(plusDM, n), sM = wilders(minusDM, n), sTR = wilders(tr, n);
  const pdi = [], mdi = [], dx = [];
  for (let i = 0; i < series.length; i++) {
    const p = sTR[i] > 0 ? (100 * sP[i]) / sTR[i] : 0;
    const m = sTR[i] > 0 ? (100 * sM[i]) / sTR[i] : 0;
    pdi.push(p);
    mdi.push(m);
    dx.push(p + m > 0 ? (100 * Math.abs(p - m)) / (p + m) : 0);
  }
  return { pdi, mdi, adx: wilders(dx, n) };
};

// fractal highs/lows with wing size w: flags at the fractal's own bar c,
// valid once w bars exist on each side (confirmed at bar c + w). Shared by
// the Fractal Chaos oscillator and bands.
export const fractalFlags = (series, w) => {
  const isHigh = new Array(series.length).fill(false);
  const isLow = new Array(series.length).fill(false);
  for (let c = w; c + w < series.length; c++) {
    let hi = true, lo = true;
    for (let k = 1; k <= w; k++) {
      if (series[c].high <= series[c - k].high || series[c].high <= series[c + k].high) hi = false;
      if (series[c].low >= series[c - k].low || series[c].low >= series[c + k].low) lo = false;
      if (!hi && !lo) break;
    }
    isHigh[c] = hi;
    isLow[c] = lo;
  }
  return { isHigh, isLow };
};

// typical price (H+L+C)/3 — the pivot/flow studies' shared price basis
export const typicalPrice = (d) => (d.high + d.low + d.close) / 3;
export const typicalPrices = (series) => series.map(typicalPrice);

// rolling %K of the close within the trailing n-bar high/low range (0–100,
// 50 when the range is flat; NaN during warmup), plus the range extremes.
// Shared by the ensemble signal systems.
export const stochasticK = (series, n) => {
  const hi = rollingExtrema(series.map(d => d.high), n).max;
  const lo = rollingExtrema(series.map(d => d.low), n).min;
  const k = series.map((d, i) => {
    if (!isFinite(hi[i]) || !isFinite(lo[i])) return NaN;
    return hi[i] === lo[i] ? 50 : ((d.close - lo[i]) / (hi[i] - lo[i])) * 100;
  });
  return { k, hi, lo };
};

// rolling covariance / variances of security vs benchmark returns: stats[i]
// covers the n returns ending at bar i-1 (null during warmup). Shared by the
// correlation and beta studies; sums rolled, moments in closed form.
export const rollingReturnStats = (series, bench, n) => {
  const len = series.length;
  const rs = [], rb = [];
  for (let i = 1; i < len; i++) {
    rs.push(series[i].close / series[i - 1].close - 1);
    rb.push(bench[i] / bench[i - 1] - 1);
  }
  const stats = new Array(len).fill(null);
  let srs = 0, srb = 0, srs2 = 0, srb2 = 0, srsrb = 0;
  for (let j = 0; j < rs.length; j++) {
    srs += rs[j]; srb += rb[j];
    srs2 += rs[j] * rs[j]; srb2 += rb[j] * rb[j];
    srsrb += rs[j] * rb[j];
    if (j >= n) {
      const o = j - n;
      srs -= rs[o]; srb -= rb[o];
      srs2 -= rs[o] * rs[o]; srb2 -= rb[o] * rb[o];
      srsrb -= rs[o] * rb[o];
    }
    if (j >= n - 1) {
      const ms = srs / n, mb = srb / n;
      // cancellation guard: a flat-return window can leave tiny float
      // residue in the rolled variances — clamp below ~1e-12 of the
      // magnitude scale to exactly 0 so consumers see a gap, not a spike
      const vs = srs2 - n * ms * ms;
      const vb = srb2 - n * mb * mb;
      // window of n returns ending at j belongs to series index j + 1
      stats[j + 1] = {
        cov: srsrb - n * ms * mb,
        vs: vs > srs2 * 1e-12 ? vs : 0,
        vb: vb > srb2 * 1e-12 ? vb : 0,
      };
    }
  }
  return stats;
};

// cumulative Accumulation/Distribution line
export const adLine = (series) => {
  let adl = 0;
  return series.map(d => {
    const range = d.high - d.low;
    const mfm = range > 0 ? ((d.close - d.low) - (d.high - d.close)) / range : 0;
    adl += mfm * (d.volume || 0);
    return adl;
  });
};

// ponytail: no comparison-symbol feed exists yet — synthesize a deterministic
// pseudo-benchmark (60% correlated with the series plus slow cycles), indexed
// to 100. Swap this for real benchmark closes when a second symbol arrives.
// Memoized per series array — several comparison studies share one call.
const benchmarkMemo = new WeakMap();
export const benchmarkCloses = (series) => {
  const hit = benchmarkMemo.get(series);
  if (hit) return hit;
  const out = [];
  let b = 100;
  for (let i = 0; i < series.length; i++) {
    out.push(b);
    if (i + 1 < series.length) {
      const r = series[i + 1].close / series[i].close - 1;
      const wiggle = Math.sin(i / 5) * 0.002 + Math.sin(i / 13) * 0.0015;
      b *= 1 + 0.6 * r + wiggle;
    }
  }
  benchmarkMemo.set(series, out);
  return out;
};

// --- prime helpers ----------------------------------------------------------

export const isPrime = (x) => {
  if (x < 2) return false;
  for (let f = 2; f * f <= x; f++) if (x % f === 0) return false;
  return true;
};

export const primeAbove = (v) => {
  let x = Math.max(2, Math.ceil(v));
  while (!isPrime(x)) x++;
  return x;
};

export const primeBelow = (v) => {
  let x = Math.floor(v);
  while (x >= 2 && !isPrime(x)) x--;
  return x >= 2 ? x : 2;
};

export const nearestPrime = (v) => {
  const up = primeAbove(v);
  const down = primeBelow(v);
  return Math.abs(v - down) <= Math.abs(up - v) ? down : up;
};

// --- session-day / time-of-day helpers for the session-bound studies -------

// The session studies (VWAP, pivot points, projected volume) key bars by day
// and by time-of-day. Keyed by the viewer's local clock they reset at the
// viewer's midnight, not the exchange session, and drift across DST — so the
// chart can pin a session timezone (IANA name, e.g. 'America/New_York');
// null falls back to the local clock.
let sessionTz = null;
const dtfCache = new Map(); // Intl.DateTimeFormat construction is expensive

const formatterFor = (tz) => {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric',
    });
    dtfCache.set(tz, f);
  }
  return f;
};

export const setSessionTimezone = (tz) => { sessionTz = tz || null; };

const dateParts = (date) => {
  if (!sessionTz) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }
  const parts = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
  formatterFor(sessionTz).formatToParts(date).forEach(p => {
    if (p.type in parts) parts[p.type] = +p.value;
  });
  return parts;
};

export const dayKeyOf = (d) => {
  const p = dateParts(d.date);
  return `${p.year}-${p.month}-${p.day}`;
};

export const todKeyOf = (d) => {
  const p = dateParts(d.date);
  return `${p.hour}:${p.minute}`;
};

// bars grouped by session day, in chronological order (the feed guarantees
// chronological bars with strictly increasing ranks — see the aggregate.js
// self-check — so no defensive sort)
export const groupByDay = (series) => {
  const dayOrder = [];
  const byDay = new Map();
  series.forEach(d => {
    const k = dayKeyOf(d);
    if (!byDay.has(k)) {
      byDay.set(k, []);
      dayOrder.push(k);
    }
    byDay.get(k).push(d);
  });
  return { dayOrder, byDay };
};
