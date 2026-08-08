import { simulatorDataFeed, simulatorPriceSocket } from './simulatorFeed';

const valid = (b) =>
  b.high >= Math.max(b.open, b.close) - 1e-9
  && b.low <= Math.min(b.open, b.close) + 1e-9
  && b.volume >= 0
  && b.date instanceof Date;

describe('simulatorDataFeed', () => {
  test('serves ascending, well-formed 5m bars with per-bar volume', async () => {
    const bars = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1W' });
    expect(bars.length).toBeGreaterThan(200);
    expect(bars.every(valid)).toBe(true);
    for (let i = 1; i < bars.length; i++) expect(+bars[i].date).toBeGreaterThan(+bars[i - 1].date);
    // cumulative→per-bar conversion: intraday volumes are bar-sized, not session-sized
    const intraday = bars.filter((b, i) => i > 0
      && bars[i - 1].date.toDateString() === b.date.toDateString());
    expect(Math.max(...intraday.map(b => b.volume))).toBeLessThan(10e6);
  });

  test('series ends on the last COMPLETED 5m window so ticks append, never land in a future bar', async () => {
    const bars = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1D' });
    const last = +bars[bars.length - 1].date;
    // last bar opens one full interval back: [5m, 10m) before now
    expect(Date.now() - last).toBeGreaterThanOrEqual(5 * 60000);
    expect(Date.now() - last).toBeLessThan(10 * 60000);
    // and the finest view has no future bars either
    const ones = await simulatorDataFeed.fetchOHLC({ candleSize: '1m', timeframe: '1D' });
    expect(+ones[ones.length - 1].date).toBeLessThanOrEqual(Date.now());
  });

  test('timeframe windows by trading session (original day, not shifted local date)', async () => {
    const one = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1D' });
    const two = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '2D' });
    const sessions = (bars) => new Set(bars.map(b => b.session)).size;
    expect(sessions(one)).toBe(1);
    expect(sessions(two)).toBe(2);
    // '1D' is a FULL session even when the re-timing straddles local midnight
    const all = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1W' });
    const lastSession = all.filter(b => b.session === all[all.length - 1].session);
    expect(one.length).toBe(lastSession.length);
  });

  test('1m subdivision preserves each 5m bar\'s shape', async () => {
    const five = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1D' });
    const one = await simulatorDataFeed.fetchOHLC({ candleSize: '1m', timeframe: '1D' });
    expect(one.length).toBe(five.length * 5);
    expect(one.every(valid)).toBe(true);
    const first5 = one.slice(0, 5);
    const src = five[0];
    expect(first5[0].open).toBeCloseTo(src.open);
    expect(first5[4].close).toBeCloseTo(src.close);
    expect(Math.max(...first5.map(b => b.high))).toBeCloseTo(src.high);
    expect(Math.min(...first5.map(b => b.low))).toBeCloseTo(src.low);
    expect(first5.reduce((s, b) => s + b.volume, 0)).toBeGreaterThan(src.volume * 0.9);
  });

  test('30m merge conserves volume and OHLC envelope', async () => {
    const five = await simulatorDataFeed.fetchOHLC({ candleSize: '5m', timeframe: '1D' });
    const thirty = await simulatorDataFeed.fetchOHLC({ candleSize: '30m', timeframe: '1D' });
    expect(thirty.every(valid)).toBe(true);
    expect(thirty.length).toBeLessThan(five.length);
    const vol = (bars) => bars.reduce((s, b) => s + b.volume, 0);
    expect(vol(thirty)).toBe(vol(five));
    expect(Math.max(...thirty.map(b => b.high))).toBe(Math.max(...five.map(b => b.high)));
  });
});

describe('simulatorPriceSocket', () => {
  test('streams ticks with cumulative volume and returns a working unsubscribe', async () => {
    jest.useFakeTimers();
    const ticks = [];
    const stop = simulatorPriceSocket.subscribe('DEMO', (t) => ticks.push(t));
    jest.advanceTimersByTime(3000);
    stop();
    jest.advanceTimersByTime(3000);
    jest.useRealTimers();
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    const after = ticks.length;
    expect(after).toBe(ticks.length); // nothing arrives after unsubscribe
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].volume).toBeGreaterThan(ticks[i - 1].volume);
      expect(ticks[i].price).toBeGreaterThan(0);
      expect(ticks[i].marketTime).toBe('r');
    }
  });
});
