// Proves the O(n) rolling rewrites in math.js match the old brute-force
// per-window scans (to floating-point accumulation tolerance), and pins the
// session-timezone behavior of the day/time-of-day keys.
import {
  sma, wma, stdev, linReg, rollingExtrema, rollingArgExtrema,
  setSessionTimezone, dayKeyOf, todKeyOf,
} from './math';

// deterministic seeded PRNG (mulberry32) — values must be stable across runs
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomWalk = (n, seed, { withNaN = false } = {}) => {
  const rnd = mulberry32(seed);
  const out = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * 4;
    out.push(withNaN && rnd() < 0.05 ? NaN : v);
  }
  return out;
};

// same-length arrays, elementwise equal within relative tolerance, with NaN
// positions matching exactly
const expectClose = (actual, expected, tol = 1e-8) => {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    if (Number.isNaN(expected[i])) {
      expect(Number.isNaN(actual[i])).toBe(true);
    } else {
      const scale = Math.max(1, Math.abs(expected[i]));
      expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(tol * scale);
    }
  }
};

// --- brute-force references (the pre-rewrite implementations) ---------------

const bruteSma = (vals, n) => vals.map((_, i) => {
  if (i < n - 1) return NaN;
  let s = 0;
  for (let k = i - n + 1; k <= i; k++) s += vals[k];
  return s / n;
});

const bruteWma = (vals, n) => vals.map((_, i) => {
  if (i < n - 1) return NaN;
  let s = 0;
  for (let k = 0; k < n; k++) s += vals[i - k] * (n - k);
  return s / (n * (n + 1) / 2);
});

const bruteStdev = (vals, n) => vals.map((_, i) => {
  if (i < n - 1) return NaN;
  let s = 0, s2 = 0;
  for (let k = i - n + 1; k <= i; k++) {
    s += vals[k];
    s2 += vals[k] * vals[k];
  }
  const m = s / n;
  return Math.sqrt(Math.max(s2 / n - m * m, 0)); // population, ÷ n
});

const bruteLinReg = (vals, n, pick) => vals.map((_, i) => {
  if (i < n - 1) return NaN;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let k = 0; k < n; k++) {
    const y = vals[i - n + 1 + k];
    sx += k; sy += y; sxy += k * y; sxx += k * k;
  }
  if (!isFinite(sy)) return NaN; // NaN in the window poisons every pick
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  if (pick === 'intercept') return intercept;
  if (pick === 'slope') return slope;
  if (pick === 'r2') {
    const mean = sy / n;
    let ssRes = 0, ssTot = 0;
    for (let k = 0; k < n; k++) {
      const y = vals[i - n + 1 + k];
      const fit = intercept + slope * k;
      ssRes += (y - fit) * (y - fit);
      ssTot += (y - mean) * (y - mean);
    }
    // the pre-rewrite code accidentally read a NaN-contaminated window as
    // r2 = 1 (NaN fails the ssTot > 0 test); the rewrite deliberately emits
    // a NaN gap there, consistent with the other picks
    if (Number.isNaN(ssTot)) return NaN;
    return ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;
  }
  return intercept + slope * (n - 1);
});

const bruteExtrema = (vals, n) => {
  const max = [], min = [];
  for (let i = 0; i < vals.length; i++) {
    let hi = NaN, lo = NaN;
    for (let k = Math.max(0, i - n + 1); k <= i; k++) {
      const v = vals[k];
      if (!isFinite(v)) continue;
      if (Number.isNaN(hi) || v > hi) hi = v;
      if (Number.isNaN(lo) || v < lo) lo = v;
    }
    max.push(hi); min.push(lo);
  }
  return { max, min };
};

// forward scan with >= / <= — latest tie wins, like the Aroon loops did
const bruteArgExtrema = (vals, n) => {
  const argMax = [], argMin = [];
  for (let i = 0; i < vals.length; i++) {
    let iHi = -1, iLo = -1;
    for (let k = Math.max(0, i - n + 1); k <= i; k++) {
      if (!isFinite(vals[k])) continue;
      if (iHi === -1 || vals[k] >= vals[iHi]) iHi = k;
      if (iLo === -1 || vals[k] <= vals[iLo]) iLo = k;
    }
    argMax.push(iHi); argMin.push(iLo);
  }
  return { argMax, argMin };
};

// ----------------------------------------------------------------------------

const WINDOWS = [1, 2, 3, 5, 14, 50];

describe('rolling rewrites match brute force', () => {
  const clean = randomWalk(500, 42);
  const gappy = randomWalk(500, 1337, { withNaN: true }); // script-style NaN gaps

  test.each(WINDOWS)('sma window %i', (n) => {
    expectClose(sma(clean, n), bruteSma(clean, n));
    expectClose(sma(gappy, n), bruteSma(gappy, n));
  });

  test.each(WINDOWS)('wma window %i', (n) => {
    expectClose(wma(clean, n), bruteWma(clean, n));
    expectClose(wma(gappy, n), bruteWma(gappy, n));
  });

  test.each([2, 3, 5, 14, 50])('stdev window %i (population)', (n) => {
    expectClose(stdev(clean, n), bruteStdev(clean, n));
    expectClose(stdev(gappy, n), bruteStdev(gappy, n));
  });

  test.each([2, 3, 5, 14, 50])('linReg window %i, all picks', (n) => {
    ['forecast', 'intercept', 'slope', 'r2'].forEach(pick => {
      expectClose(linReg(clean, n, pick), bruteLinReg(clean, n, pick), 1e-7);
      expectClose(linReg(gappy, n, pick), bruteLinReg(gappy, n, pick), 1e-7);
    });
  });

  test.each([1, 2, 5, 20])('rollingExtrema window %i', (n) => {
    ['max', 'min'].forEach(side => {
      expectClose(rollingExtrema(clean, n)[side], bruteExtrema(clean, n)[side], 0);
      expectClose(rollingExtrema(gappy, n)[side], bruteExtrema(gappy, n)[side], 0);
    });
  });

  test.each([1, 2, 5, 20, 26])('rollingArgExtrema window %i (latest tie wins)', (n) => {
    // integer-ish values force plenty of exact ties
    const ties = randomWalk(400, 7).map(v => (Number.isNaN(v) ? v : Math.round(v / 2)));
    [clean, gappy, ties].forEach(vals => {
      const fast = rollingArgExtrema(vals, n);
      const ref = bruteArgExtrema(vals, n);
      expect(fast.argMax).toEqual(ref.argMax);
      expect(fast.argMin).toEqual(ref.argMin);
    });
  });

  test('flat stretches: stdev exactly 0, extrema exact', () => {
    const flat = new Array(60).fill(50);
    expectClose(stdev(flat, 14), bruteStdev(flat, 14), 0);
    expectClose(rollingExtrema(flat, 14).max, bruteExtrema(flat, 14).max, 0);
  });

  test('cancellation guard: flat tail after noise reads exactly σ = 0 / r² = 1', () => {
    // rolling accumulators carry float residue out of the noisy stretch; the
    // relative clamp must still read the dead-flat tail as exactly flat
    const rnd = mulberry32(9);
    const vals = [];
    let v = 123456.7;
    for (let i = 0; i < 200; i++) { v += (rnd() - 0.5) * 26; vals.push(v); }
    for (let i = 0; i < 60; i++) vals.push(98765.4321);
    const sd = stdev(vals, 14);
    const r2 = linReg(vals, 14, 'r2');
    for (let i = 200 + 13; i < vals.length; i++) { // windows fully in the tail
      expect(sd[i]).toBe(0);
      expect(r2[i]).toBe(1);
    }
  });
});

describe('session timezone day/time-of-day keys', () => {
  afterEach(() => setSessionTimezone(null));

  const bar = (utcMs) => ({ date: new Date(utcMs) });

  test('a 00:30 UTC bar keys to the previous NY day when tz=America/New_York', () => {
    setSessionTimezone('America/New_York');
    // 2026-01-15 00:30 UTC == 2026-01-14 19:30 EST
    const d = bar(Date.UTC(2026, 0, 15, 0, 30));
    expect(dayKeyOf(d)).toBe('2026-1-14');
    expect(todKeyOf(d)).toBe('19:30');
  });

  test('todKeyOf tracks the session clock across DST', () => {
    setSessionTimezone('America/New_York');
    // 14:30 ET is 19:30 UTC in winter (EST) but 18:30 UTC in summer (EDT):
    // the session key must read 14:30 in both
    const winter = bar(Date.UTC(2026, 0, 15, 19, 30));
    const summer = bar(Date.UTC(2026, 6, 15, 18, 30));
    expect(todKeyOf(winter)).toBe('14:30');
    expect(todKeyOf(summer)).toBe('14:30');
    expect(dayKeyOf(winter)).toBe('2026-1-15');
    expect(dayKeyOf(summer)).toBe('2026-7-15');
  });

  test('null timezone falls back to the local clock', () => {
    setSessionTimezone(null);
    const d = bar(Date.UTC(2026, 0, 15, 0, 30));
    const dt = d.date;
    expect(dayKeyOf(d)).toBe(`${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
    expect(todKeyOf(d)).toBe(`${dt.getHours()}:${dt.getMinutes()}`);
  });
});
