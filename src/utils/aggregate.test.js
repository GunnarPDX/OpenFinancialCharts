import { aggregateSeries } from './aggregate';

// deterministic synthetic walk with enough range to produce bricks/columns
const makeQuotes = (n = 400) => {
  let price = 100;
  let seed = 42;
  const rand = () => {
    // mulberry32 — reproducible across runs
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, (_, i) => {
    const open = price;
    const close = price + (rand() - 0.48) * 3;
    price = close;
    return {
      date: new Date(i * 60e3),
      open,
      close,
      high: Math.max(open, close) + rand(),
      low: Math.min(open, close) - rand(),
      volume: Math.round(rand() * 1000),
      direction: open > close,
      rank: i,
    };
  });
};

// invariants every transform must hold: strictly increasing ranks, unique
// dates, coherent high/low, and (except heikin-ashi's recursion) volume
// carried through so scripts/studies don't silently see zero
test.each(['heikin_ashi', 'renko', 'line_break', 'range_bars', 'kagi', 'point_figure'])(
  '%s output is coherent',
  (t) => {
    const out = aggregateSeries(makeQuotes(), t);
    expect(out.length).toBeGreaterThan(1);
    expect(new Set(out.map(d => +d.date)).size).toBe(out.length);
    out.forEach((d, i) => {
      expect(d.rank).toBe(i);
      expect(d.high).toBeGreaterThanOrEqual(d.low);
      expect(d.high).toBeGreaterThanOrEqual(Math.max(d.open, d.close) - 1e-9);
    });
    const total = out.reduce((a, d) => a + (d.volume || 0), 0);
    expect(total).toBeGreaterThan(0);
  },
);
