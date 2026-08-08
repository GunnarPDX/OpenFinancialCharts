// Ticker data simulator for the public demo site: replays the bundled
// sample OHLCV series (re-timed to end near now) and continues it with a
// random-walk live price socket. No network, no tokens — everything the
// demo shows comes from this file and ../sample_data/ohlcvData.js.
//
// Like the rest of src/demo this is NOT part of the published package; it's
// a reference implementation of the DataFeed + PriceSocket interfaces.

import { StockOHCLV } from '../sample_data/ohlcvData';
import rng from '../rng';

const FIVE_MIN = 5 * 60000;
const DAY = 24 * 3600000;

// ---- base series ---------------------------------------------------------
// The sample is newest-first 5m bars with CUMULATIVE session volume; turn it
// into ascending bars with per-bar volume, then shift the whole series so
// its last bar is the most recent COMPLETED 5m window. Ending on a completed
// window matters: bar dates are open times, so ending at the current
// boundary would put subdivided 1m bars in the future and live ticks would
// fold into them instead of appending fresh candles. This way the socket
// picks up exactly where history stops and the demo looks like an open
// market at any hour (day-boundary detection for the volume conversion uses
// the ORIGINAL timestamps, so the shift can't split or merge sessions).
const buildBase = () => {
  const asc = [...StockOHCLV]
    .map(r => ({ ...r, t: new Date(r.date.replace(' ', 'T')).getTime() }))
    .sort((a, b) => a.t - b.t);
  const offset = (Math.floor(Date.now() / FIVE_MIN) - 1) * FIVE_MIN - asc[asc.length - 1].t;
  let prev = null;
  return asc.map(r => {
    const sameDay = prev && new Date(prev.t).toDateString() === new Date(r.t).toDateString();
    const volume = Math.max(0, sameDay ? r.volume - prev.volume : r.volume);
    prev = r;
    return {
      date: new Date(r.t + offset),
      open: r.open, high: r.high, low: r.low, close: r.close,
      volume,
      // re-timed bars land at arbitrary wall-clock times, so tag them as
      // regular session — otherwise hiding extended hours (which falls back
      // to a 09:30–16:00 NY heuristic) would filter out the entire series
      marketTime: 'r',
      // ORIGINAL trading day, for timeframe windows: shifted local dates can
      // straddle midnight, which would make '1D' a partial session
      session: r.date.slice(0, 10),
    };
  });
};
let baseBars = null;
const base = () => (baseBars || (baseBars = buildBase()));

// ---- resampling ----------------------------------------------------------
// the sample is 5m; split deterministically for 1m, merge for larger sizes
const subdivide = (bars) => {
  const out = [];
  bars.forEach((b, bi) => {
    const rand = rng(bi * 7919 + 17);
    const span = b.high - b.low;
    // one sub-bar carries the high, another the low, so extremes survive
    const hiAt = Math.floor(rand() * 5);
    let loAt = Math.floor(rand() * 5);
    if (loAt === hiAt) loAt = (loAt + 2) % 5;
    let prevClose = b.open;
    for (let i = 0; i < 5; i++) {
      const target = b.open + ((b.close - b.open) * (i + 1)) / 5;
      const close = i === 4
        ? b.close
        : Math.min(b.high, Math.max(b.low, target + (rand() - 0.5) * span * 0.15));
      const open = prevClose;
      out.push({
        date: new Date(+b.date + i * 60000),
        open,
        high: i === hiAt ? b.high : Math.max(open, close),
        low: i === loAt ? b.low : Math.min(open, close),
        close,
        volume: Math.round(b.volume / 5),
        marketTime: 'r',
        session: b.session,
      });
      prevClose = close;
    }
  });
  return out;
};

const merge = (bars, groupOf) => {
  const out = [];
  for (const b of bars) {
    const key = groupOf(b);
    const cur = out[out.length - 1];
    if (cur && cur.key === key) {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume;
    } else {
      out.push({ key, date: b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, marketTime: 'r', session: b.session });
    }
  }
  return out.map(({ key, ...bar }) => bar);
};

const resample = (bars, candleSize) => {
  switch (candleSize) {
    case '1m': return subdivide(bars);
    case '5m': return bars;
    case '10m': case '15m': case '30m': case '1h': case '4h': {
      const ms = { '10m': 10, '15m': 15, '30m': 30, '1h': 60, '4h': 240 }[candleSize] * 60000;
      return merge(bars, b => Math.floor(+b.date / ms));
    }
    case '1d': return merge(bars, b => new Date(b.date).toDateString());
    // epoch-week index (Thursday-anchored) is unique across year boundaries
    case '1w': return merge(bars, b => Math.floor((+b.date / DAY + 4) / 7));
    default: return bars;
  }
};

// trading-day-aware timeframe windows ('2D' = the last two SESSIONS with
// data, keyed by the sample's original trading day rather than the shifted
// local date, which can straddle midnight)
const lastDays = (bars, n) => {
  const days = [...new Set(bars.map(b => b.session))];
  const keep = new Set(days.slice(-n));
  return bars.filter(b => keep.has(b.session));
};

const TIMEFRAME_DAYS = { '1D': 1, '2D': 2, '1W': 5 };

export const simulatorDataFeed = {
  name: 'simulator',
  fetchOHLC: async ({ candleSize = '5m', timeframe = '2D' } = {}) => {
    const days = TIMEFRAME_DAYS[timeframe];
    const windowed = days ? lastDays(base(), days) : base();
    return resample(windowed, candleSize);
    // backwards pagination: the chart re-requests with endDate set; returning
    // the same bars marks the feed exhausted (see README)
  },
};

// ---- live ticks ----------------------------------------------------------
// continues the last sample close as a random walk with occasional bursts,
// tuned lively enough that the forming candle visibly moves even at the
// default 2-day zoom. A soft pull toward the last close keeps an unattended
// demo from wandering off over hours. Volume is cumulative-per-session as
// the chart expects, and ticks carry marketTime 'r' so extended-hours
// filtering never eats them.
export const simulatorPriceSocket = {
  name: 'simulator-stream',
  subscribe: (ticker, onTick) => {
    const bars = base();
    const anchor = bars[bars.length - 1].close;
    let price = anchor;
    let volume = 0;
    const rand = rng(Date.now() % 100000);
    const id = setInterval(() => {
      const burst = rand() < 0.05 ? 2.5 : 1;
      price = Math.max(1, price
        + (rand() - 0.5) * 0.16 * burst
        - (price - anchor) * 0.002);
      volume += Math.round(2000 + rand() * 12000);
      onTick({ price, time: new Date(), volume, marketTime: 'r' });
    }, 400);
    return () => clearInterval(id);
  },
};
