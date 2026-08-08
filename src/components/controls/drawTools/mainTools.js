import React from 'react';
import { T } from './T';

export const MAIN_TOOLS = [
  {
    id: 'none',
    title: 'Select / Pan',
    icon: <T><path d="M6 3l12 9-6 1 3 6-3 1.5-3-6-4 4z" /></T>,
  },
  {
    id: 'level',
    title: 'Level',
    icon: (
      <T>
        <path d="M3 12h18" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'ruler',
    title: 'Ruler',
    icon: (
      <T>
        <g transform="rotate(-35 12 12)">
          <rect x="1" y="8.75" width="22" height="6.5" rx="1.2" />
          <path d="M5.5 8.75v3M9.5 8.75v3M13.5 8.75v3M17.5 8.75v3" />
        </g>
      </T>
    ),
  },
];
