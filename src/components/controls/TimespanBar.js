import React from 'react';
import { useChartProvider } from '../ChartContext';

// timespan shortcuts: each sets the fetch timeframe plus a sensible default
// candle size (still overridable from the candle-size menu)
const SPANS = [
  ['1D', '1m'],
  ['2D', '1m'],
  ['1W', '5m'],
  ['1M', '10m'],
  ['3M', '15m'],
  ['6M', '30m'],
  ['YTD', '1h'],
  ['1Y', '1h'],
  ['5Y', '4h'],
];

const DEFAULT_SIZES = Object.fromEntries(SPANS);

const Component = () => {
  const { timeframe, setTimeframe, setCandleSize, config } = useChartProvider();
  // config.timeframes entries: '1M' strings, ['1M', '10m'] pairs, or
  // { timeframe: '1M', candleSize: '10m' } objects; entries without a candle
  // size fall back to the built-in default when known.
  // A restricted candle_sizes list also vetoes the auto-picked size — the
  // shortcut must not escape the host's allowed sizes
  const sizeAllowed = (cs) => !config.candle_sizes || config.candle_sizes.includes(cs);
  const spans = config.timeframes
    ? config.timeframes
        .map(t => {
          if (Array.isArray(t)) return t;
          if (t && typeof t === 'object') return [t.timeframe, t.candleSize || DEFAULT_SIZES[t.timeframe]];
          return [t, DEFAULT_SIZES[t]];
        })
        // drop malformed entries (e.g. an object missing `timeframe`): a
        // blank button that fetches timeframe undefined helps no one
        .filter(([tf]) => tf)
    : SPANS;

  return (
    <div className="ofc-timespan-bar">
      {spans.map(([tf, cs]) => (
        <button
          key={tf}
          className={`ofc-timespan-btn${timeframe === tf ? ' ofc-active' : ''}`}
          onClick={() => { setTimeframe(tf); if (cs && sizeAllowed(cs)) setCandleSize(cs); }}
        >
          {tf}
        </button>
      ))}
    </div>
  );
};

export default Component;
