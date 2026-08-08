import React from 'react';
import { T } from './T';

export const TEXT_TOOLS = [
  {
    id: 'txt',
    title: 'Text',
    icon: <T><path d="M6 6V4h12v2M12 4v16M9 20h6" /></T>,
  },
  {
    id: 'note',
    title: 'Note',
    icon: <T><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 11h7M9 15h5" /></T>,
  },
  {
    id: 'price_note',
    title: 'Price Note — click the price, then place the label',
    icon: <T><rect x="3" y="5" width="11" height="6" /><path d="M14 8h7" strokeDasharray="2,2" /><path d="M6 16h12M6 19h8" opacity="0.6" /></T>,
  },
  {
    id: 'pin',
    title: 'Pin',
    icon: <T><path d="M12 21s-6-6.5-6-11a6 6 0 1112 0c0 4.5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></T>,
  },
  {
    id: 'tableD',
    title: 'Table',
    icon: <T><rect x="3" y="5" width="18" height="14" /><path d="M3 10h18M3 14.5h18M12 5v14" /></T>,
  },
  {
    id: 'callout',
    title: 'Point Note — click the anchor, then the box position',
    icon: <T><rect x="7" y="4" width="14" height="9" rx="2" /><path d="M11 13l-7 7" /><circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'comment',
    title: 'Comment',
    icon: <T><path d="M4 5h16v10H10l-4 4v-4H4z" /></T>,
  },
  {
    id: 'price_label',
    title: 'Price Label',
    icon: <T><path d="M4 9h12l4 3-4 3H4z" /><circle cx="7.5" cy="12" r="1.3" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'flag',
    title: 'Flag Mark',
    icon: <T><path d="M6 21V4M6 4h12l-3 3.5L18 11H6" /></T>,
  },
  {
    id: 'buy_marker',
    title: 'Buy Marker',
    icon: <T><path d="M4 4h16v11h-6l-2 3-2-3H4z" /><path d="M12 12V7M9.5 9L12 7l2.5 2" /></T>,
  },
  {
    id: 'sell_marker',
    title: 'Sell Marker',
    icon: <T><path d="M4 4h16v11h-6l-2 3-2-3H4z" /><path d="M12 7v5M9.5 10L12 12l2.5-2" /></T>,
  },
];
