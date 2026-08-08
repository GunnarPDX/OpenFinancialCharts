import React from 'react';
import { barGeometry, keyFor, redGreenBySegment, solidStroke, strokeFor } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter, dashed}) => {
  // segment coloring compares each bar's close to the previous bar's close
  const strokeFn = strokeFor(lineType, {
    line: redGreenBySegment,
    jointed_line: redGreenBySegment,
    area: solidStroke('var(--area-line-color)'),
  }, solidStroke('var(--text)'));

  // band scales need half-slot centering; the brush passes a linear scale
  const { centerX } = barGeometry(xScale, xGetter);
  return (
    <>
      {quotes.map((b, i) => {
        const prev = quotes[i - 1]
        if (!prev) return null;

        return (
          <g key={keyFor(b, i)}>
            <line
              x1={centerX(b)}
              x2={centerX(prev)}
              y1={yScale(b.close)}
              y2={yScale(prev.close)}
              stroke={b.overlayColor ?? strokeFn(b, prev)}
              strokeLinecap="round"
              strokeWidth={2}
              strokeDasharray={dashed ? '0.1,4' : undefined}
            />
          </g>
        )}
      )}
    </>
  )
}

export default React.memo(Component);
