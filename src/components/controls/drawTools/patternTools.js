import React from 'react';
import { T } from './T';

export const PATTERN_TOOLS = [
  {
    id: 'xabcd',
    title: 'XABCD Pattern — five clicks',
    icon: (
      <T>
        <polygon points="3,18 7,5 12,13" fill="currentColor" opacity="0.25" stroke="none" />
        <polygon points="12,13 16,4 21,17" fill="currentColor" opacity="0.25" stroke="none" />
        <path d="M3 18L7 5l5 8 4-9 5 13" />
        <circle cx="3" cy="18" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="12" cy="13" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="21" cy="17" r="1.3" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'cypher',
    title: 'Cypher Pattern — five clicks',
    icon: (
      <T>
        <polygon points="3,14 8,4 12,10" fill="currentColor" opacity="0.25" stroke="none" />
        <polygon points="12,10 17,6 21,19" fill="currentColor" opacity="0.25" stroke="none" />
        <path d="M3 14L8 4l4 6 5-4 4 13" />
        <circle cx="3" cy="14" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="12" cy="10" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="21" cy="19" r="1.3" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'head_shoulders',
    title: 'Head & Shoulders — seven clicks',
    icon: <T><path d="M2 19l3-6 2 5 4-13 4 13 2-5 3 6" /><path d="M4 18h16" opacity="0.5" strokeDasharray="2,2" /></T>,
  },
  {
    id: 'abcd',
    title: 'ABCD Pattern — four clicks',
    icon: (
      <T>
        <polygon points="4,17 10,4 14,12" fill="currentColor" opacity="0.25" stroke="none" />
        <path d="M4 17L10 4l4 8 6-9" />
        <circle cx="4" cy="17" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="10" cy="4" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="20" cy="3" r="1.3" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'triangle_pattern',
    title: 'Triangle Pattern — four clicks',
    icon: (
      <T>
        <polygon points="3,5 21,10 21,13 3,19" fill="currentColor" opacity="0.22" stroke="none" />
        <path d="M3 12l6-6 5 10 5-8 2 4" opacity="0.5" strokeWidth="1" />
        <path d="M3 5l18 5M3 19l18-6" />
      </T>
    ),
  },
  {
    id: 'three_drives',
    title: 'Three Drives Pattern — six clicks',
    icon: <T><path d="M3 20l3-8 1 5 4-10 1 5 4-10 1 5 4-4" /></T>,
  },
  { divider: true },
  {
    id: 'ell_impulse',
    title: 'Elliott Impulse Wave (12345) — six clicks',
    icon: <T><path d="M2 21l4-9 2 4 5-12 2 5 6-7" /></T>,
  },
  {
    id: 'ell_correction',
    title: 'Elliott Correction Wave (ABC) — four clicks',
    icon: <T><path d="M3 5l7 11 4-6 7 9" /></T>,
  },
  {
    id: 'ell_triangle',
    title: 'Elliott Triangle Wave (ABCDE) — six clicks',
    icon: <T><path d="M2 4l5 14 4-11 4 8 3-6 4 4" /></T>,
  },
  {
    id: 'ell_double',
    title: 'Elliott Double Combo Wave (WXY) — four clicks',
    icon: <T><path d="M3 6l5 12 4-8 5 10" /><circle cx="21" cy="20" r="1.4" fill="currentColor" stroke="none" /></T>,
  },
  {
    id: 'ell_triple',
    title: 'Elliott Triple Combo Wave (WXYXZ) — six clicks',
    icon: <T><path d="M2 5l3 12 3-7 3 8 3-9 3 9 5-13" /></T>,
  },
  { divider: true },
  {
    id: 'cyclic',
    title: 'Cyclic Lines',
    icon: (
      <T>
        <path d="M4 4v16M12 4v16M20 4v16" />
        <path d="M6 12h4M14 12h4" opacity="0.5" />
      </T>
    ),
  },
  {
    id: 'timecycles',
    title: 'Time Cycles',
    icon: <T><path d="M2 17a5 5 0 0110 0M12 17a5 5 0 0110 0" /><path d="M2 17h20" opacity="0.4" strokeDasharray="2,2" /></T>,
  },
  {
    id: 'sine',
    title: 'Sine Line',
    icon: <T><path d="M2 12c2-8 4.5-8 6.5 0s4.5 8 6.5 0 4.5-8 6.5 0" /></T>,
  },
];
