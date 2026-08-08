import { capQuotes, MAX_QUOTES, normalizeQuotes, applyTicks, candleSizeToMs } from './quotes';

const mkBars = (n, start = Date.UTC(2026, 0, 5)) =>
  normalizeQuotes(Array.from({ length: n }, (_, i) => ({
    date: new Date(start + i * 60000),
    open: 10, high: 11, low: 9, close: 10.5, volume: 100,
  })));

describe('capQuotes', () => {
  test('no-op at or below the cap (same reference)', () => {
    const qs = mkBars(50);
    expect(capQuotes(qs, 50)).toBe(qs);
  });

  test('over the cap: trims oldest in a chunk and re-ranks from 0', () => {
    const qs = mkBars(MAX_QUOTES + 1);
    const capped = capQuotes(qs);
    expect(capped.length).toBe(MAX_QUOTES - 1000);
    // newest bars survive, oldest dropped
    expect(+capped[capped.length - 1].date).toBe(+qs[qs.length - 1].date);
    expect(+capped[0].date).toBe(+qs[qs.length - capped.length].date);
    // rank === index invariant restored
    capped.forEach((b, i) => expect(b.rank).toBe(i));
  });

  test('composes with applyTicks on the live path', () => {
    const interval = candleSizeToMs('1m');
    let qs = mkBars(30);
    const lastDate = +qs[qs.length - 1].date;
    // append one live candle, then cap to 20 → oldest dropped, ranks clean
    qs = capQuotes(applyTicks(qs, [[{ price: 12, time: new Date(lastDate + interval + 500), volume: 1 }, 1]], interval), 20);
    expect(qs.length).toBe(19);
    expect(qs[qs.length - 1].close).toBe(12);
    qs.forEach((b, i) => expect(b.rank).toBe(i));
  });
});
