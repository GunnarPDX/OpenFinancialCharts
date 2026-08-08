import React from 'react';

import { format } from 'd3-format';

const formatPrice = format('$,.2f');

// feed status: loading indicator / sample-data fallback notice
export const FeedStatus = React.memo(({ feedLoading, feedError }) => {
  if (!feedLoading && !feedError) return null;
  return (
    <text x={12} y={70} fontSize={9} fill={feedError ? 'var(--red)' : 'var(--text-faint)'} pointerEvents="none">
      {feedLoading ? 'loading data\u2026' : `feed error \u2014 ${feedError}`}
    </text>
  );
});

// script info panel: title/value rows declared by custom-script infopanel()
// calls, in a chip styled like (and stacked under) the ticker chip
export const ScriptInfoPanel = React.memo(({ scriptResults, top }) => {
  const rows = scriptResults.flatMap(({ res }) => res.panel || []);
  if (!rows.length) return null;
  const W = 182, PAD = 10, ROW = 15;
  const fmtValue = (r) => (typeof r.value === 'string' ? r.value
    : Number.isFinite(r.value) ? format(`,.${r.precision}f`)(r.value) : '—');
  return (
    <g pointerEvents="none" transform={`translate(10, ${top})`}>
      <rect
        width={W}
        height={rows.length * ROW + 11}
        rx={2}
        fill="var(--background-dark)"
        fillOpacity={0.65}
        stroke="var(--border)"
      />
      {rows.map((r, k) => (
        <g key={k}>
          <text x={PAD} y={14 + k * ROW} fontSize={9} fill="var(--text-faint)">{r.title}</text>
          <text
            x={W - PAD}
            y={14 + k * ROW}
            fontSize={9}
            fontWeight={600}
            textAnchor="end"
            fill={r.color || 'var(--text)'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtValue(r)}
          </text>
        </g>
      ))}
    </g>
  );
});

// ticker chip: symbol, latest close, and daily change
const TickerChip = React.memo(({ tickerQuote, symbol }) => {
  if (!tickerQuote) return null;
  // prevClose can legitimately be 0 (degenerate data): keep chg but
  // show no percentage rather than dividing by zero
  const chg = tickerQuote.prevClose != null ? tickerQuote.close - tickerQuote.prevClose : null;
  const pct = chg != null && tickerQuote.prevClose ? (100 * chg) / tickerQuote.prevClose : null;
  const chgColor = chg >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <g pointerEvents="none" transform="translate(10, 10)">
      <rect
        width={182}
        height={chg != null ? 46 : 30}
        rx={2}
        fill="var(--background-dark)"
        fillOpacity={0.65}
        stroke="var(--border)"
      />
      <text
        x={10}
        y={chg != null ? 32 : 22}
        fontSize={chg != null ? 26 : 16}
        fontWeight={700}
        fill="var(--text)"
      >
        {symbol || 'SPY'}
      </text>
      <text
        x={172}
        y={18}
        fontSize={12}
        fontWeight={600}
        textAnchor="end"
        fill="var(--text)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatPrice(tickerQuote.close)}
      </text>
      {chg != null && (
        <text
          x={172}
          y={34}
          fontSize={9}
          textAnchor="end"
          fill={chgColor}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}${pct != null ? `  (${chg >= 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}`}
        </text>
      )}
    </g>
  );
});

export default TickerChip;
