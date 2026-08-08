import React from 'react';
import { T } from './T';

export const SHAPE_TOOLS = [
  {
    id: 'rect',
    title: 'Rectangle',
    icon: <T><rect x="4" y="6" width="16" height="12" /></T>,
  },
  {
    id: 'rrect',
    title: 'Rotated Rectangle',
    icon: <T><rect x="7" y="4" width="10" height="15" transform="rotate(32 12 12)" /></T>,
  },
  {
    id: 'ellipse',
    title: 'Oval',
    icon: <T><ellipse cx="12" cy="12" rx="8" ry="6" /></T>,
  },
  {
    id: 'circle',
    title: 'Circle',
    icon: <T><circle cx="12" cy="12" r="7.5" /></T>,
  },
  {
    id: 'rtriangle',
    title: 'Right-Angle Triangle',
    icon: <T><path d="M5 4v16h15z" /></T>,
  },
  {
    id: 'polygon',
    title: 'Polygon — click points, double-click to finish',
    icon: (
      <T>
        <path d="M12 3l8 6-3 10H7L4 9z" />
        <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="9" r="1.5" fill="currentColor" stroke="none" />
      </T>
    ),
  },
  {
    id: 'triangle',
    title: 'Triangle',
    icon: <T><path d="M12 5L20 19H4z" /></T>,
  },
];
