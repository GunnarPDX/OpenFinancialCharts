import React from 'react';
import { T } from './T';

export const FIB_TOOLS = [
  {
    id: 'fib_retracement',
    title: 'Fib Retracement',
    icon: <T><path d="M3 5h18M3 10h13M3 14h15M3 19h18" /></T>,
  },
  {
    id: 'fibext',
    title: 'Trend-Based Fib Extension — three clicks',
    icon: (
      <T>
        <path d="M2.5 20.5L9.5 8l4.5 7" opacity="0.6" />
        <circle cx="2.5" cy="20.5" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="8" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="14" cy="15" r="1.3" fill="currentColor" stroke="none" />
        <path d="M14 11h8M14 7h8M14 3h8" />
      </T>
    ),
  },
  {
    id: 'fib_channel',
    title: 'Fib Channel — three clicks',
    icon: <T><path d="M3 12L15 2M5 17L17 7M7 22L19 12" /></T>,
  },
  {
    id: 'fib_timezone',
    title: 'Fib Time Zone',
    icon: <T><path d="M4 3v18M8 3v18M13 3v18M20 3v18" /></T>,
  },
  {
    id: 'fib_fan_reg',
    title: 'Fib Fan',
    icon: <T><path d="M3 21L21 3M3 21L21 9M3 21L21 15" /><circle cx="3" cy="21" r="1.6" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'fib_fan',
    title: 'Fib Speed Resistance Fan',
    icon: <T><rect x="7" y="3" width="14" height="14" opacity="0.55" /><path d="M3 21L21 3M3 21L21 10M3 21L14 3" /></T>,
  },
  {
    id: 'fibtime3',
    title: 'Trend-Based Fib Time — three clicks',
    icon: <T><path d="M5 3v18M10 3v18M18 3v18" /><path d="M3 12h6" opacity="0.6" /></T>,
  },
  {
    id: 'fib_circles',
    title: 'Fib Circles',
    icon: <T><circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="8" /></T>,
  },
  {
    id: 'fib_spiral',
    title: 'Fib Spiral',
    icon: <T><path d="M12 12c2 0 3 1.5 3 3s-2 3.4-4.5 3.4c-3.4 0-6-2.6-6-6C4.5 8 8 4.5 12.5 4.5c5 0 8.5 4 8.5 8.5" /></T>,
  },
  {
    id: 'fib_arcs',
    title: 'Fib Speed Resistance Arcs',
    icon: <T><path d="M6 20a7 7 0 0113-3M4 20A11 11 0 0121 13" /><circle cx="4" cy="20" r="1.6" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'fib_wedge',
    title: 'Fib Wedge — three clicks',
    icon: <T><path d="M4 20L20 6M4 20L21 15" /><path d="M13 12a9 9 0 014 6" opacity="0.7" /></T>,
  },
  {
    id: 'pitchfan',
    title: 'Pitchfan — three clicks',
    icon: <T><path d="M3 21L19 4M3 21L21 9M3 21L21 14" /><circle cx="3" cy="21" r="1.6" fill="currentColor" stroke="none" /></T>,
  },
  { divider: true },
  {
    id: 'gann_box',
    title: 'Gann Box',
    icon: <T><rect x="4" y="6" width="16" height="12" /><path d="M4 12h16M12 6v12" opacity="0.6" /></T>,
  },
  {
    id: 'gann_square',
    title: 'Gann Square',
    icon: <T><rect x="4" y="6" width="16" height="12" /><path d="M4 18L20 6M4 18l16-6M4 18l10-12" opacity="0.6" /></T>,
  },
  {
    id: 'gann_fan',
    title: 'Gann Fan',
    icon: <T><path d="M3 21L21 3M3 21L21 11M3 21L13 3M3 21L21 17M3 21L7 3" /></T>,
  },
];
