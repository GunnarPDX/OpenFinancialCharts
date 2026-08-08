import React from 'react';
import { barGeometry, keyFor, redGreenByDirection, solidStroke, strokeFor } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const strokeFn = strokeFor(lineType, {
    step_line: redGreenByDirection,
  }, solidStroke('var(--text)'));
  const { half, centerX } = barGeometry(xScale, xGetter);
  const offset = half + 1;

  return (
    <>
      {quotes.map((b, i) => {
        const edge = b.overlayColor ?? strokeFn(b);
        const cx = centerX(b);

        const next = quotes[i + 1]

        return (
          <g key={keyFor(b, i)}>
            <line
              x1={cx}
              x2={cx}
              y1={yScale(b.open)}
              y2={yScale(b.close)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
            <line
              x1={cx - offset}
              x2={cx}
              y1={yScale(b.open)}
              y2={yScale(b.open)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
            <line
              x1={cx}
              x2={cx + offset}
              y1={yScale(b.close)}
              y2={yScale(b.close)}
              stroke={edge}
              strokeLinecap="round"
              strokeWidth={1}
            />
            {next && (
              <line
                x1={cx + offset}
                x2={cx + offset}
                y1={yScale(b.close)}
                y2={yScale(next.open)}
                stroke={edge}
                strokeLinecap="round"
                strokeWidth={1}
              />
            )}
          </g>
        )}
      )}
    </>
  )
}

export default React.memo(Component);
