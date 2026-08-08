import React from 'react';
import { T } from './T';

// line-family tools live in a flyout bar next to the main one
export const LINE_TOOLS = [
  {
    id: 'line',
    title: 'Trend Line',
    icon: (
      <T>
        <path d="M5 19L19 5" />
        <circle cx="5" cy="19" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="19" cy="5" r="1.8" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'ray',
    title: 'Ray',
    icon: (
      <T>
        <circle cx="6" cy="18" r="1.8" fill="currentColor" stroke="none" />
        <path d="M6 18L19 5" />
        <path d="M14.5 4.5L19 5l-.5 4.5" />
      </T>
    ),
  },
  {
    id: 'extline',
    title: 'Extended Line',
    icon: (
      <T>
        <path d="M7 17L17 7" />
        <path d="M9.5 17.5L5 19l1.5-4.5M14.5 6.5L19 5l-1.5 4.5" />
      </T>
    ),
  },
  {
    // also present in MAIN_TOOLS — same tool, reachable from both places
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
    id: 'vline',
    title: 'Vertical Line',
    icon: (
      <T>
        <path d="M12 3v18" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'crossline',
    title: 'Crossline',
    icon: (
      <T>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'free',
    title: 'Freehand',
    icon: <T><path d="M3 16c3-6 5 3 8-4s5-1 10-6" /></T>,
  },
  {
    id: 'highlight',
    title: 'Highlighter',
    icon: (
      <T>
        <path d="M3 16c3-6 5 3 8-4s5-1 10-6" stroke="#facc15" strokeWidth="4" opacity="0.45" />
        <path d="M3 16c3-6 5 3 8-4s5-1 10-6" stroke="#facc15" strokeWidth="1.2" />
      </T>
    ),
  },
  {
    id: 'arrow',
    title: 'Arrow',
    icon: (
      <T>
        <path d="M5 19L19 5" />
        <path d="M12 5h7v7" />
      </T>
    ),
  },
  {
    id: 'arrow_up',
    title: 'Arrow Up',
    icon: <T><path d="M12 4l-6 8h3.5v8h5v-8H18z" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'arrow_down',
    title: 'Arrow Down',
    icon: <T><path d="M12 20l6-8h-3.5V4h-5v8H6z" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'poly',
    title: 'Poly-Line — click points, double-click to finish',
    icon: (
      <T>
        <path d="M3 18l6-8 5 4 7-10" />
        <circle cx="3" cy="18" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="14" cy="14" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="21" cy="4" r="1.6" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'arc',
    title: 'Arc — three clicks: start, end, curve',
    icon: <T><path d="M4 18C7 7 17 7 20 18" /></T>,
  },
  { divider: true },
  {
    id: 'pitchfork',
    title: 'Pitchfork',
    icon: (
      <T>
        <path d="M3 21l7-7" />
        <path d="M6 10l8 8" opacity="0.7" />
        <path d="M6 10l7-7M10 14l7-7M14 18l7-7" />
        <circle cx="3" cy="21" r="1.6" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'schiff',
    title: 'Schiff Pitchfork',
    icon: (
      <T>
        <path d="M3 21l7-7" />
        <path d="M6 10l8 8" opacity="0.7" />
        <path d="M6 10l7-7M10 14l7-7M14 18l7-7" />
        <text x="20" y="22" fontSize="9" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">S</text>
      </T>
    ),
  },
  {
    id: 'mschiff',
    title: 'Modified Schiff Pitchfork',
    icon: (
      <T>
        <path d="M3 21l7-7" />
        <path d="M6 10l8 8" opacity="0.7" />
        <path d="M6 10l7-7M10 14l7-7M14 18l7-7" />
        <text x="20" y="22" fontSize="9" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">M</text>
      </T>
    ),
  },
  {
    id: 'inside_fork',
    title: 'Inside Pitchfork',
    icon: (
      <T>
        <path d="M3 21l7-7" />
        <path d="M6 10l8 8" opacity="0.7" />
        <path d="M6 10l7-7M10 14l7-7M14 18l7-7" />
        <text x="20" y="22" fontSize="9" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">I</text>
      </T>
    ),
  },
  { divider: true },
  {
    id: 'channel',
    title: 'Parallel Channel',
    icon: (
      <T>
        <path d="M3 15L17 3" />
        <path d="M7 21L21 9" />
      </T>
    ),
  },
  {
    id: 'regtrend',
    title: 'Regression Trend — drag across a range',
    icon: (
      <T>
        <path d="M4 17L20 7" />
        <path d="M4 12L20 2M4 22l16-10" opacity="0.5" strokeDasharray="2.5,2.5" />
      </T>
    ),
  },
  {
    id: 'flattb',
    title: 'Flat Top/Bottom',
    icon: (
      <T>
        <path d="M3 17L21 6" />
        <path d="M3 21h18" />
      </T>
    ),
  },
  {
    id: 'disjoint',
    title: 'Disjoint Channel',
    icon: (
      <T>
        <path d="M3 13L21 4" />
        <path d="M3 17l18 4" />
      </T>
    ),
  },
];
