import React from 'react';
import { T } from './T';

export const FORECAST_TOOLS = [
  {
    id: 'long_pos',
    title: 'Long Position',
    icon: (
      <T>
        <rect x="3" y="4" width="18" height="8" stroke="#22c55e" />
        <rect x="3" y="12" width="18" height="6" stroke="#ef4444" opacity="0.7" />
        <path d="M7 9l3-3 2 2 4-4" stroke="#22c55e" />
      </T>
    ),
  },
  {
    id: 'short_pos',
    title: 'Short Position',
    icon: (
      <T>
        <rect x="3" y="6" width="18" height="6" stroke="#ef4444" opacity="0.7" />
        <rect x="3" y="12" width="18" height="8" stroke="#22c55e" />
        <path d="M7 15l3 3 2-2 4 4" stroke="#ef4444" />
      </T>
    ),
  },
  {
    id: 'forecast',
    title: 'Position Forecast',
    icon: (
      <T>
        <path d="M4 19c5-2 8-6 11-11" strokeDasharray="3,3" />
        <path d="M12 6h4v4" />
        <circle cx="4" cy="19" r="1.5" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'bars_pattern',
    title: 'Trend Projection — projects the selected range forward',
    icon: (
      <T>
        <path d="M5 5v14M9 8v8M5 8h4M5 11h4" />
        <path d="M15 4v14M19 7v9M15 7h4M15 12h4" opacity="0.45" strokeDasharray="2,2" />
      </T>
    ),
  },
  {
    id: 'bars_copy',
    title: 'Bars Pattern — two clicks select the range, third places the copy',
    icon: (
      <T>
        <path d="M5.5 4v3M5.5 13v3" stroke="#22c55e" />
        <path d="M10.5 6v3M10.5 15v2" stroke="#ef4444" />
        <rect x="4" y="7" width="3" height="6" stroke="#22c55e" />
        <rect x="9" y="9" width="3" height="6" stroke="#ef4444" />
        <path d="M16.5 3v3M16.5 12v2" stroke="#22c55e" opacity="0.55" />
        <path d="M21.5 5v3M21.5 14v2" stroke="#ef4444" opacity="0.55" />
        <rect x="15" y="6" width="3" height="6" stroke="#22c55e" strokeDasharray="2,2" opacity="0.55" />
        <rect x="20" y="8" width="3" height="6" stroke="#ef4444" strokeDasharray="2,2" opacity="0.55" />
      </T>
    ),
  },
  {
    id: 'ghost',
    title: 'Ghost Feed — click points, double-click or Enter to finish',
    icon: (
      <T>
        <path d="M6 20v-9a6 6 0 0112 0v9l-2-2-2 2-2-2-2 2-2-2z" />
        <circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'sector',
    title: 'Sector — three clicks',
    icon: <T><path d="M12 13V4a9 9 0 018.2 5.3L12 13z" /></T>,
  },
  { divider: true },
  {
    id: 'avwap_draw',
    title: 'Anchored VWAP',
    icon: (
      <T>
        <path d="M5 16c5 0 6-7 9-7s4 3 7 1" />
        <circle cx="5" cy="16" r="2.2" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'frvp',
    title: 'Fixed Range Volume Profile',
    icon: (
      <T>
        <path d="M4 3v18M20 3v18" strokeDasharray="3,3" />
        <path d="M4 7h9M4 11h13M4 15h7" strokeWidth="2.4" />
      </T>
    ),
  },
  { divider: true },
  {
    id: 'm_price',
    title: 'Price Range',
    icon: <T><path d="M12 4v16M9 7l3-3 3 3M9 17l3 3 3-3" /></T>,
  },
  {
    id: 'm_date',
    title: 'Date Range',
    icon: <T><path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" /></T>,
  },
  {
    id: 'm_both',
    title: 'Date & Price Range',
    icon: <T><rect x="4" y="5" width="16" height="14" opacity="0.4" /><path d="M6 17L18 7M8 8l10-1-1 10" /></T>,
  },
];
