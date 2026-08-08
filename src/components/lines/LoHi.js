import React from 'react';
import { Bar} from '@visx/shape';
import { barGeometry, directionPair, keyFor, strokeFor, textPair } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const strokeFn = strokeFor(lineType, {
    low_high_solid: textPair,
  }, directionPair);
  const { bandwidth } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        const [edge, fill] = b.overlayColor ? [b.overlayColor, b.overlayColor] : strokeFn(b);
        return (
          <g key={keyFor(b, i)}>
            <Bar
              data={b}
              width={bandwidth}
              height={yScale(b.low) - yScale(b.high)}
              fill={fill}
              stroke={edge}
              strokeWidth={1}
              x={xScale(xGetter(b))}
              y={yScale(b.high)}
            />
          </g>
        );
      })}
    </>
  )
}

export default React.memo(Component);
