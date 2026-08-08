import React from 'react';
import { Bar} from '@visx/shape';
import {
  barGeometry,
  directionPair,
  hollowPair,
  keyFor,
  plainHollowPair,
  strokeFor,
  textPair,
} from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const strokeFn = strokeFor(lineType, {
    candles_hollow: hollowPair,
    candles_hollow_plain: plainHollowPair,
    candles_solid_plain: textPair,
  }, directionPair);
  const { bodyWidth, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        // chronologically previous bar — this data can be newest-first, so
        // pick the neighbor whose date is earlier
        const left = quotes[i - 1], right = quotes[i + 1];
        const prev = left && +left.date < +b.date ? left
          : right && +right.date < +b.date ? right : null;
        // a recolor overlay (YesNo Trend, PressureTrend) replaces the hue
        // but keeps the variant's hollow/filled decision
        const [baseEdge, baseFill] = strokeFn(b, prev);
        const edge = b.overlayColor ?? baseEdge;
        const fill = baseFill === 'transparent' ? 'transparent' : (b.overlayColor ?? baseFill);
        const cx = centerX(b);
        return (
          <g key={keyFor(b, i)}>
            <line
              x1={cx}
              x2={cx}
              y1={yScale(b.high)}
              y2={b.direction ? yScale(b.open) : yScale(b.close)}
              stroke={edge}
              strokeWidth={1}
            />
            <line
              x1={cx}
              x2={cx}
              y1={b.direction ? yScale(b.close) : yScale(b.open)}
              y2={yScale(b.low)}
              stroke={edge}
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
              fill={fill}
              stroke={fill === 'transparent' ? edge : 'none'}
              strokeWidth={fill === 'transparent' ? 1 : 0}
              x={cx - bodyWidth / 2}
              y={b.direction ? yScale(b.open) : yScale(b.close)}
            />
          </g>
        );
      })}
    </>
  )
}

export default React.memo(Component);
