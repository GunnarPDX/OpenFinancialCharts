// Demo/test data feed (Unusual Whales). NOT part of the published package —
// consumers of open-financial-charts implement their own feed against the DataFeed
// interface documented in ../../utils/quotes.js and the README.

import createUWClient from './uw_client';
import createUWPriceSocket from './websocket';
import { simulatorDataFeed, simulatorPriceSocket } from './simulatorFeed';

// core helpers live in utils/quotes; re-exported here for existing imports
export {
  DEFAULT_CANDLE_SIZE,
  DEFAULT_TIMEFRAME,
  candleSizeToMs,
  applyTick,
  applyTicks,
  normalizeQuotes,
} from '../../utils/quotes';

export { simulatorDataFeed, simulatorPriceSocket };

// Unusual Whales feed, token from the environment (REACT_APP_UW_TOKEN) or
// localStorage key 'ofc-uw-token'. Only used when a token is configured —
// without one the demo runs on the bundled ticker data simulator, so the
// public demo site needs no API access at all.
const uwToken = () => process.env.REACT_APP_UW_TOKEN
  || (typeof localStorage !== 'undefined' ? localStorage.getItem('ofc-uw-token') : null);

// ?sim forces the simulator even when a UW token is configured — handy for
// previewing exactly what tokenless public-demo visitors will see
const forceSim = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('sim');
const hasToken = !forceSim && typeof window !== 'undefined' && !!uwToken();

// the demo shows a "simulated data" watermark when nothing real backs it
export const usingSimulator = !hasToken;

export const defaultDataFeed = hasToken
  ? createUWClient({ token: uwToken })
  : simulatorDataFeed;

// live stream matching defaultDataFeed (UW requires the Advanced plan)
export const defaultPriceSocket = hasToken
  ? createUWPriceSocket({ token: uwToken })
  : simulatorPriceSocket;
