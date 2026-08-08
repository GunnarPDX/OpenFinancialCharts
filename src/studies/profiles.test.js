import { forEachLevel } from './profileUtils';
import { profileStudies } from './profiles';

const byId = (id) => profileStudies.find(s => s.id === id);
const bar = (o) => ({ open: o.o, high: o.h, low: o.l, close: o.c, volume: o.v });

describe('forEachLevel', () => {
  test('spreads a bar across buckets proportional to overlap', () => {
    const hits = {};
    forEachLevel({ low: 0, high: 10 }, 0, 10, 2, (k, f) => { hits[k] = (hits[k] || 0) + f; });
    expect(hits[0]).toBeCloseTo(0.5);
    expect(hits[1]).toBeCloseTo(0.5);
  });

  test('fractions sum to 1 for a partially overlapping bar', () => {
    let total = 0;
    forEachLevel({ low: 2.5, high: 7.5 }, 0, 10, 4, (k, f) => { total += f; });
    expect(total).toBeCloseTo(1);
  });

  test('zero-range bar lands entirely in one bucket', () => {
    const hits = [];
    forEachLevel({ low: 5, high: 5 }, 0, 10, 10, (k, f) => hits.push([k, f]));
    expect(hits).toEqual([[5, 1]]);
  });
});

describe('heat_profile', () => {
  test('weights volume by impulse and colors by direction', () => {
    // fast up bar in the low bucket, slow chop in the high bucket
    const bars = [
      bar({ o: 1, c: 4, l: 1, h: 4, v: 100 }),   // big up move
      bar({ o: 8, c: 8.1, l: 7.5, h: 8.5, v: 100 }), // tiny body, same volume
    ];
    const out = byId('heat_profile').profile(bars, 2, 1, 8.5);
    expect(out[0].v).toBeGreaterThan(out[1].v);   // momentum-weighted, not raw volume
    expect(out[0].color).toBe('#22c55e');          // upside heat is green
  });

  test('flat heavy volume reads grey (absorption)', () => {
    const bars = [
      bar({ o: 5, c: 6, l: 4, h: 6, v: 100 }),
      bar({ o: 6, c: 5, l: 4, h: 6, v: 100 }),   // equal and opposite
    ];
    const out = byId('heat_profile').profile(bars, 1, 4, 6);
    expect(out[0].color).toBe('#94a3b8');
  });
});

describe('buy_sell_profile', () => {
  test('buyer-dominated levels side positive/green, seller-dominated negative/red', () => {
    const bars = [
      bar({ o: 1, c: 3, l: 1, h: 3, v: 100 }),   // closes at high → +delta, low bucket
      bar({ o: 9, c: 7, l: 7, h: 9, v: 100 }),   // closes at low → −delta, high bucket
    ];
    const out = byId('buy_sell_profile').profile(bars, 2, 1, 9);
    expect(out[0].side).toBe(1);
    expect(out[0].color).toBe('#22c55e');
    expect(out[1].side).toBe(-1);
    expect(out[1].color).toBe('#ef4444');
  });

  test('heavy two-way volume with no net winner becomes an absorption streak', () => {
    const bars = [
      bar({ o: 4, c: 6, l: 4, h: 6, v: 500 }),   // strong buy
      bar({ o: 6, c: 4, l: 4, h: 6, v: 500 }),   // equally strong sell
    ];
    const out = byId('buy_sell_profile').profile(bars, 1, 4, 6);
    expect(out[0].streak).toBe(true);
  });
});

describe('acceptance_profile', () => {
  test('slow busy levels get time bars, fast lonely levels get rejection streaks', () => {
    const bars = [
      // market camps in the 0–5 zone with small bars...
      ...Array.from({ length: 6 }, () => bar({ o: 2, c: 3, l: 2, h: 3, v: 10 })),
      // ...then one huge-range bar rips through the upper zone once
      bar({ o: 3, c: 14, l: 3, h: 14, v: 10 }),
    ];
    const out = byId('acceptance_profile').profile(bars, 4, 2, 14);
    expect(out[0].streak).toBeUndefined();       // accepted value: normal bar
    expect(out[0].v).toBeGreaterThan(0);
    expect(out[3].streak).toBe(true);            // vacuum zone: rejection streak
  });
});

describe('hot_zone_levels', () => {
  test('flags at most 3 separated levels at the hottest buckets', () => {
    // hot activity at three well-separated prices, quiet elsewhere
    const bars = [
      bar({ o: 1, c: 2, l: 1, h: 2, v: 900 }),
      bar({ o: 10, c: 11, l: 10, h: 11, v: 800 }),
      bar({ o: 19, c: 20, l: 19, h: 20, v: 700 }),
      bar({ o: 5, c: 5.1, l: 5, h: 5.2, v: 10 }),
    ];
    const out = byId('hot_zone_levels').profile(bars, 20, 1, 20);
    const levels = out.map((e, k) => (e?.level ? k : null)).filter(x => x !== null);
    expect(levels.length).toBeLessThanOrEqual(3);
    expect(levels.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < levels.length; i++) {
      expect(Math.abs(levels[i] - levels[i - 1])).toBeGreaterThan(2);
    }
  });
});
