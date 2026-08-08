import React from 'react';

import { timeFormat } from 'd3-time-format';

import { aggregateSeries } from '../../../utils/aggregate';
import { nyDay, isExtendedBar } from '../sessionUtils';

const formatTime = timeFormat('%I:%M%p');

// the chart's bar sequence + timezone-aware label formatters + ticker chip data
const useSeries = ({ quotes, lineType, showExtendedHours, timezone }) => {
  // aggregated types (renko, kagi, …) resample the quotes into their own bar
  // sequence; the whole pipeline (window, zoom, brush) indexes that sequence.
  // hiding extended hours re-ranks, since everything assumes rank === index
  const series = React.useMemo(() => {
    const s = aggregateSeries(quotes, lineType);
    return showExtendedHours ? s : s.filter(d => !isExtendedBar(d)).map((d, i) => ({ ...d, rank: i }));
  }, [quotes, lineType, showExtendedHours]);

  // time labels honor the timezone setting; 'local' keeps d3's local formatter
  const fmtTime = React.useMemo(() => {
    if (!timezone || timezone === 'local') return formatTime;
    const f = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone,
    });
    return (d) => f.format(d).replace(' ', '');
  }, [timezone]);

  // timezone-aware MM/DD
  const fmtDay = React.useMemo(() => {
    if (!timezone || timezone === 'local') return timeFormat('%m/%d');
    const f = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', timeZone: timezone });
    return (d) => f.format(d);
  }, [timezone]);

  // ticker chip data: latest close and change vs the prior day's last close.
  // quotes change per tick batch (4x/sec live), so avoid O(n) Intl formatting
  // there: quotes are chronological (rank-stamped by normalizeQuotes), so the
  // newest bar is last and the prior session's close is found by walking back
  // only until the day key changes
  const tickerQuote = React.useMemo(() => {
    if (!quotes.length) return null;
    const newest = quotes[quotes.length - 1];
    const day = nyDay(newest.date);
    let prev = null;
    for (let i = quotes.length - 2; i >= 0; i--) {
      if (nyDay(quotes[i].date) !== day) { prev = quotes[i]; break; }
    }
    return { close: newest.close, prevClose: prev ? prev.close : null };
  }, [quotes]);

  return { series, fmtTime, fmtDay, tickerQuote };
};

export default useSeries;
