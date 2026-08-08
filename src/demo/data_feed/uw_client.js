// Unusual Whales data-feed client. Implements the DataFeed interface from
// ./index.js — construct one with your API token and hand it to the chart:
//
//   import createUWClient from './data_feed/uw_client';
//   <AdvancedChartWrapper dataFeed={createUWClient({ token: '…' })}>
//
// Endpoint: GET /api/stock/{ticker}/ohlc/{candle_size}?timeframe={timeframe}
// candle sizes: 1m 5m 10m 15m 30m 1h 4h 1d 1w
// timeframes:   1D 2D 1W 1M 3M 6M YTD 1Y 5Y

const BASE_URL = 'https://api.unusualwhales.com/api';

export const UW_CANDLE_SIZES = ['1m', '5m', '10m', '15m', '30m', '1h', '4h', '1d', '1w'];
export const UW_TIMEFRAMES = ['1D', '2D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y'];

// end_date is a calendar day on the market's clock: format it in New York
// (en-CA gives YYYY-MM-DD) so an evening-ET timestamp doesn't page from the
// next UTC day
const nyDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
});

// token may be a string or a () => string getter (resolved per request, so
// tokens landing in localStorage after page load still work)
const createUWClient = ({ token, baseUrl = BASE_URL } = {}) => ({
  name: 'unusualwhales',

  // resolves to Bar[]: { date: Date, open, high, low, close, volume } — the
  // generic shape every feed returns (see ./index.js)
  // endDate (a Date) pages backwards: the API accepts a YYYY-MM-DD end_date
  // and returns the timeframe's span ending on that day
  fetchOHLC: async ({ ticker, candleSize = '1m', timeframe = '2D', endDate }) => {
    if (!ticker) throw new Error('fetchOHLC: ticker is required');
    const url = `${baseUrl}/stock/${encodeURIComponent(ticker)}/ohlc/${candleSize}`
      + `?timeframe=${encodeURIComponent(timeframe)}`
      + (endDate ? `&end_date=${nyDay.format(new Date(endDate))}` : '');
    const t = typeof token === 'function' ? token() : token;
    if (!t) console.warn('[uw_client] no API token configured');
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[uw_client] request failed:', res.status, res.statusText, errBody);
      throw new Error(`Unusual Whales OHLC request failed: ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    const rows = Array.isArray(body) ? body : body.data || [];
    return rows.map(r => ({
      date: new Date(r.start_time),
      open: +r.open,
      high: +r.high,
      low: +r.low,
      close: +r.close,
      volume: +(r.volume ?? r.total_volume ?? 0),
      marketTime: r.market_time,
    }));
  },
});

export default createUWClient;
