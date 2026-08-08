// Core quote helpers shared by the chart and any data feed implementation.
//
// DataFeed interface (what you pass to <ChartProvider dataFeed={...}>):
//   {
//     name: string,
//     fetchOHLC({ ticker, candleSize, timeframe, endDate? }) => Promise<Bar[]>
//   }
//
// Bar (what fetchOHLC resolves to, oldest or newest first — order is fine):
//   { date: Date, open: number, high: number, low: number,
//     close: number, volume: number }
//
// candleSize / timeframe are feed-defined strings; the chart passes through
// whatever it was configured with (defaults below).

export const DEFAULT_CANDLE_SIZE = '1m';
export const DEFAULT_TIMEFRAME = '2D';

// minutes since midnight on the market's clock (America/New_York), for
// session checks — the viewer's local clock is wrong outside US Eastern
const nyClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false,
});
export const minutesInNY = (date) => {
  const parts = nyClock.formatToParts(date);
  const h = +parts.find(p => p.type === 'hour').value;
  const m = +parts.find(p => p.type === 'minute').value;
  return (h === 24 ? 0 : h) * 60 + m; // some engines report midnight as 24
};

// candle size string ('1m', '4h', '1d') -> bucket length in ms
const SIZE_UNIT_MS = { m: 60e3, h: 3600e3, d: 86400e3, w: 604800e3 };
export const candleSizeToMs = (size) => {
  const m = /^(\d+)([mhdw])$/.exec(size || '');
  return m ? +m[1] * SIZE_UNIT_MS[m[2]] : 60e3;
};

const DAY_MS = 86400e3;

// New-York wall-clock parts for day/week bucketing: daily and weekly feed bars
// are aligned to the ET calendar, not the UTC one
const nySessionClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
});
const NY_WEEKDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const nyDayInfo = (ms) => {
  const parts = nySessionClock.formatToParts(ms);
  const get = (t) => parts.find(p => p.type === t).value;
  const h = +get('hour');
  const intoDay = ((((h === 24 ? 0 : h) * 60) + +get('minute')) * 60 + +get('second')) * 1000
    + (ms % 1000);
  return { dayStart: ms - intoDay, weekday: NY_WEEKDAY[get('weekday')] };
};

// bucket start for a tick, matching the feed's bar alignment: intraday grids
// anchor to the last bar's timestamp (sessions start 9:30 ET, not on the UTC
// epoch grid); daily buckets follow the New-York calendar day, weekly the NY
// Monday-based week
const tickBucket = (timeMs, intervalMs, lastDateMs) => {
  if (intervalMs < DAY_MS) {
    return lastDateMs + Math.floor((timeMs - lastDateMs) / intervalMs) * intervalMs;
  }
  const { dayStart, weekday } = nyDayInfo(timeMs);
  if (intervalMs < 7 * DAY_MS || weekday === 0) return dayStart;
  // walk back to Monday, then re-derive midnight in case a DST change fell in
  // between (whole-day ms arithmetic would land an hour off)
  return nyDayInfo(dayStart - weekday * DAY_MS + DAY_MS / 2).dayStart;
};

// fold a batch of [tick, volumeDelta] pairs in one pass: copies the quote
// array once and mutates the working tail, instead of a full copy per tick.
// volumeDelta is the tick's addition to session volume (caller diffs the
// cumulative figure). no-op until the initial fetch has landed.
// out-of-order ticks (time before the newest applied tick, tracked per bar as
// lastTickTime) still widen high/low and add volume, but never rewrite close.
export const applyTicks = (quotes, batch, intervalMs) => {
  if (!quotes.length || !batch.length) return quotes;
  const out = [...quotes];
  batch.forEach(([{ price, time }, volumeDelta = 0]) => {
    const last = out[out.length - 1];
    const bucket = tickBucket(+time, intervalMs, +last.date);
    if (bucket <= +last.date) {
      const lastTickTime = last.lastTickTime ?? +last.date;
      const stale = +time < lastTickTime;
      out[out.length - 1] = {
        ...last,
        close: stale ? last.close : price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        volume: last.volume + volumeDelta,
        direction: stale ? last.direction : last.open > price,
        lastTickTime: Math.max(lastTickTime, +time),
      };
    } else {
      out.push({
        date: new Date(bucket),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volumeDelta,
        direction: false,
        rank: last.rank + 1,
        lastTickTime: +time,
      });
    }
  });
  return out;
};

// fold one live tick into the quote list: extend the current candle, or open
// the next one once the tick lands past the current interval. single-tick
// convenience over applyTicks so the bucketing logic lives in one place.
export const applyTick = (quotes, tick, intervalMs, volumeDelta = 0) =>
  applyTicks(quotes, [[tick, volumeDelta]], intervalMs);

// convert a feed's Bar[] into the chart's internal quote shape: chronological
// (oldest first), rank-stamped, with candle direction precomputed
// Long-running live sessions append a candle per interval forever; cap the
// quote list so a chart left open for weeks can't grow without bound. Trims
// happen in chunks (so the O(n) re-rank runs once per TRIM_CHUNK appends,
// not per candle) and drop the oldest bars. 20k bars ≈ two weeks of 1m
// live candles — far beyond any feed's initial payload.
export const MAX_QUOTES = 20000;
const TRIM_CHUNK = 1000;
export const capQuotes = (quotes, max = MAX_QUOTES) => {
  if (quotes.length <= max) return quotes;
  // trim by a chunk, but never below 95% of the cap (small caps in tests)
  const keep = Math.max(max - TRIM_CHUNK, Math.floor(max * 0.95));
  return quotes
    .slice(quotes.length - keep)
    .map((b, i) => ({ ...b, rank: i }));
};

export const normalizeQuotes = (bars) => [...bars]
  .filter(b => b.date instanceof Date && !Number.isNaN(+b.date)
    && isFinite(b.open) && isFinite(b.high) && isFinite(b.low) && isFinite(b.close))
  .sort((a, b) => +a.date - +b.date)
  .map((b, i) => ({
    ...b,
    volume: isFinite(b.volume) ? +b.volume : 0, // feeds may omit volume
    direction: b.open > b.close, // true = down bar; flat bars count as up (green)
    rank: i,
  }));
