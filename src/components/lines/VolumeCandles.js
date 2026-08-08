import React from 'react';
import { Bar } from '@visx/shape';
import { barGeometry, keyFor, MAX_BODY_WIDTH, redGreenByDirection } from './renderUtils';

// candles whose body width scales with volume relative to the visible window
const Component = ({quotes, xScale, yScale, xGetter}) => {
  let maxVol = 1;
  quotes.forEach(b => {
    if ((b.volume || 0) > maxVol) maxVol = b.volume;
  });
  const { bandwidth, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        // ponytail: sqrt scaling keeps low-volume bars visible; use linear if
        // you want raw proportionality
        const frac = Math.sqrt((b.volume || 0) / maxVol);
        const bodyWidth = Math.max(2, Math.min(bandwidth * frac, MAX_BODY_WIDTH));
        const cx = centerX(b);
        const color = b.overlayColor ?? redGreenByDirection(b);
        return (
          <g key={keyFor(b, i)}>
            <line
              x1={cx}
              x2={cx}
              y1={yScale(b.high)}
              y2={b.direction ? yScale(b.open) : yScale(b.close)}
              stroke={color}
              strokeWidth={1}
            />
            <line
              x1={cx}
              x2={cx}
              y1={b.direction ? yScale(b.close) : yScale(b.open)}
              y2={yScale(b.low)}
              stroke={color}
              strokeWidth={1}
            />
            <Bar
              data={b}
              width={bodyWidth}
              height={Math.max(
                b.direction
                  ? yScale(b.close) - yScale(b.open)
                  : yScale(b.open) - yScale(b.close),
                1
              )}
              fill={color}
              x={cx - bodyWidth / 2}
              y={b.direction ? yScale(b.open) : yScale(b.close)}
            />
          </g>
        );
      })}
    </>
  );
};

export default React.memo(Component);
