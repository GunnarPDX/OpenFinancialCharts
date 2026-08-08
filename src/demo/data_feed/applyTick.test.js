import { applyTick, applyTicks, normalizeQuotes, candleSizeToMs } from './index';

const MIN = 60e3;
const DAY = 86400e3;
const candle = { date: new Date(0), open: 10, high: 11, low: 9, close: 10.5, volume: 100, direction: false, rank: 0 };

test('candleSizeToMs parses feed sizes', () => {
  expect(candleSizeToMs('1m')).toBe(MIN);
  expect(candleSizeToMs('4h')).toBe(4 * 3600e3);
  expect(candleSizeToMs('junk')).toBe(MIN);
});

test('tick inside the interval updates the current candle', () => {
  const out = applyTick([candle], { price: 12, time: new Date(30e3) }, MIN, 5);
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({ close: 12, high: 12, low: 9, volume: 105, direction: false });
});

test('tick past the interval opens the next candle', () => {
  const out = applyTick([candle], { price: 12, time: new Date(MIN + 1) }, MIN, 5);
  expect(out).toHaveLength(2);
  expect(out[1]).toMatchObject({ open: 12, high: 12, low: 12, close: 12, volume: 5, rank: 1 });
  expect(+out[1].date).toBe(MIN);
});

test('no-op before the initial fetch lands', () => {
  expect(applyTick([], { price: 12, time: new Date(0) }, MIN)).toEqual([]);
});

test('intraday buckets anchor to the last bar, not the UTC epoch grid', () => {
  // 4h bar starting 9:30 ET (13:30 UTC) — the epoch 4h grid would be 12:00/16:00 UTC
  const start = Date.UTC(2024, 0, 2, 13, 30);
  const bar = { ...candle, date: new Date(start) };
  const H4 = 4 * 3600e3;
  // 16:05 ET (21:05 UTC) is past 13:30+4h=17:30 UTC → new candle on the 17:30 grid
  const out = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 2, 21, 5)) }, H4, 5);
  expect(out).toHaveLength(2);
  expect(+out[1].date).toBe(start + H4);
  // 17:29 UTC still belongs to the 13:30 candle
  const out2 = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 2, 17, 29)) }, H4, 5);
  expect(out2).toHaveLength(1);
});

test('daily buckets roll on the New-York calendar day', () => {
  // daily bar dated NY midnight Tue Jan 2 2024 (05:00 UTC)
  const nyMidnight = Date.UTC(2024, 0, 2, 5, 0);
  const bar = { ...candle, date: new Date(nyMidnight) };
  // 20:30 ET the same day is 01:30 UTC Jan 3 — must NOT open a next-day candle
  const evening = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 3, 1, 30)) }, DAY, 5);
  expect(evening).toHaveLength(1);
  expect(evening[0].close).toBe(12);
  // 04:00 ET Jan 3 (09:00 UTC) is the next NY day → new candle at NY midnight Jan 3
  const next = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 3, 9, 0)) }, DAY, 5);
  expect(next).toHaveLength(2);
  expect(+next[1].date).toBe(Date.UTC(2024, 0, 3, 5, 0));
});

test('weekly buckets roll on the NY Monday, not the epoch Thursday', () => {
  const WEEK = 7 * DAY;
  // weekly bar dated Mon Jan 1 2024 NY midnight (05:00 UTC)
  const monday = Date.UTC(2024, 0, 1, 5, 0);
  const bar = { ...candle, date: new Date(monday) };
  // Thursday mid-week tick stays in the Monday candle (epoch grid rolls Thursdays)
  const thu = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 4, 15, 0)) }, WEEK, 5);
  expect(thu).toHaveLength(1);
  // the following Tuesday opens a candle dated the following NY Monday
  const nextWeek = applyTick([bar], { price: 12, time: new Date(Date.UTC(2024, 0, 9, 15, 0)) }, WEEK, 5);
  expect(nextWeek).toHaveLength(2);
  expect(+nextWeek[1].date).toBe(Date.UTC(2024, 0, 8, 5, 0));
});

test('stale (out-of-order) ticks widen high/low and add volume but keep close', () => {
  const t1 = applyTick([candle], { price: 12, time: new Date(40e3) }, MIN, 5);
  // a replayed tick from 10s — older than the last applied tick
  const t2 = applyTick(t1, { price: 8, time: new Date(10e3) }, MIN, 3);
  expect(t2[0]).toMatchObject({ close: 12, low: 8, high: 12, volume: 108 });
  // direction still reflects the fresh close, not the stale price
  expect(t2[0].direction).toBe(false);
});

test('applyTicks folds a batch in order', () => {
  const out = applyTicks([candle], [
    [{ price: 12, time: new Date(30e3) }, 5],
    [{ price: 13, time: new Date(MIN + 1) }, 2],
    [{ price: 11, time: new Date(MIN + 2e3) }, 1],
  ], MIN);
  expect(out).toHaveLength(2);
  expect(out[0].close).toBe(12);
  expect(out[1]).toMatchObject({ open: 13, close: 11, high: 13, low: 11, volume: 3 });
});

test('normalizeQuotes drops bars with non-finite OHLC and defaults volume', () => {
  const mk = (over) => ({
    date: new Date(0), open: 1, high: 2, low: 0.5, close: 1.5, volume: 10, ...over,
  });
  const out = normalizeQuotes([
    mk({}),
    mk({ date: new Date(MIN), high: NaN }),
    mk({ date: new Date(2 * MIN), open: undefined }),
    mk({ date: new Date(3 * MIN), volume: undefined }),
    mk({ date: new Date('bogus') }),
  ]);
  expect(out).toHaveLength(2);
  expect(out[1].volume).toBe(0);
  expect(out.map(b => b.rank)).toEqual([0, 1]);
});
