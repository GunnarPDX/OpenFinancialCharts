import React from 'react';
import { barGeometry, keyFor, redGreenByDirection, solidStroke, strokeFor } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const strokeFn = strokeFor(lineType, {
    bars_solid: solidStroke('var(--text)'),
  }, redGreenByDirection);
  const { half, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        const edge = b.overlayColor ?? strokeFn(b);
        const xsc = centerX(b);

        return (
          <g key={keyFor(b, i)}>
            <line
              x1={xsc}
              x2={xsc}
              y1={yScale(b.high)}
              y2={yScale(b.low)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
            <line
              x1={xsc - half}
              x2={xsc}
              y1={yScale(b.open)}
              y2={yScale(b.open)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
            <line
              x1={xsc}
              x2={xsc + half}
              y1={yScale(b.close)}
              y2={yScale(b.close)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
          </g>
        );
      })}
    </>
  )
}

export default React.memo(Component);
