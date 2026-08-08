// session/calendar helpers shared by the chart body's series, tick, and
// axis-marker derivations. NOTE: ChartContext.js has a similar tick filter
// that should eventually share these helpers.

import { minutesInNY } from '../../utils/quotes';

// calendar day on the market's clock — "previous close" must roll on the NY
// session day, not the viewer's local midnight
export const nyDayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const nyDay = (date) => nyDayFmt.format(date);

// intraday if the typical bar gap is under ~20h. Median over the first pairs,
// ignoring sub-ms nudges — aggregated types (renko, line break) emit several
// bars off one source bar with 1ms-offset dates, so a single pair lies
export const isIntradaySeries = (series) => {
  if (series.length < 2) return true;
  const gaps = [];
  for (let i = 1; i < Math.min(series.length, 12); i++) {
    const g = Math.abs(+series[i].date - +series[i - 1].date);
    if (g > 1) gaps.push(g);
  }
  if (!gaps.length) return true;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] < 20 * 3600e3;
};

// outside the regular session. Feeds that tag bars (UW market_time: 'r'
// regular, 'pr' pre, 'po' post) are authoritative; otherwise fall back to the
// 09:30–16:00 market-clock (America/New_York) heuristic (the 16:00 close bar
// counts as regular)
export const isExtendedBar = (d) => {
  if (d.marketTime != null) return d.marketTime !== 'r';
  const m = minutesInNY(d.date);
  return m < 9 * 60 + 30 || m > 16 * 60;
};

// which extended session a bar belongs to: 'pre' | 'post' | null (regular)
export const extendedSession = (d) => {
  if (d.marketTime != null) {
    if (d.marketTime === 'pr') return 'pre';
    if (d.marketTime === 'po') return 'post';
    return null;
  }
  const m = minutesInNY(d.date);
  if (m < 9 * 60 + 30) return 'pre';
  if (m > 16 * 60) return 'post';
  return null;
};
