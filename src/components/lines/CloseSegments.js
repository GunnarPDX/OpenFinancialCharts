import React from 'react';
import { keyFor } from './renderUtils';

// per-pair colored close line — used when a recolor study (YesNo Trend,
// PressureTrend) paints the bars and a continuous LinePath can't carry
// per-bar colors
const CloseSegments = ({quotes, x, y, colorFor, strokeWidth = 2}) => (
  <>
    {quotes.map((b, i) => {
      const next = quotes[i + 1];
      if (!next) return null;
      return (
        <path
          key={keyFor(b, i)}
          fill="none"
          stroke={colorFor(b, next)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          d={`M${x(b)},${y(b)} L${x(next)},${y(next)}`}
        />
      );
    })}
  </>
);

export default React.memo(CloseSegments);
