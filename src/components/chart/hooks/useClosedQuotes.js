import React from 'react';

// Bar-close gate for the expensive consumers of the quote list.
//
// Live ticks re-touch only the last bar (applyTicks copies the array but
// keeps every other bar object), up to 4x/sec — and recomputing every study
// and script per tick batch was the chart's dominant allocation churn. This
// returns a reference that only advances when the data meaningfully changed:
//   - a candle closed / was appended (length change),
//   - the last bar's slot moved (candle roll without append),
//   - the dataset was replaced outright (new fetch: fresh head object).
// In-place last-bar updates keep the previous reference, so memos keyed on
// it skip tick batches entirely while the candles themselves tick live.
const useClosedQuotes = (quotes) => {
  const ref = React.useRef(quotes);
  const prev = ref.current;
  if (prev !== quotes && (
    !quotes.length
    || !prev.length
    || prev.length !== quotes.length
    || prev[0] !== quotes[0]
    || +prev[prev.length - 1].date !== +quotes[quotes.length - 1].date
  )) ref.current = quotes;
  return ref.current;
};

export default useClosedQuotes;
