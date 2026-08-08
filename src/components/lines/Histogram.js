import React from 'react';
import { barGeometry, keyFor, redGreenByDirection, solidStroke, strokeFor } from './renderUtils';

// columns from the plot floor up to each bar's close
const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const colorFn = strokeFor(lineType, {
    histogram_solid: solidStroke('var(--area-line-color)'),
  }, redGreenByDirection);
  const { bandwidth } = barGeometry(xScale, xGetter);
  const base = Math.max(...yScale.range());

  return (
    <>
      {quotes.map((b, i) => {
        const y = yScale(b.close);
        return (
          <rect
            key={keyFor(b, i)}
            x={xScale(xGetter(b))}
            y={Math.min(y, base)}
            width={bandwidth}
            height={Math.max(base - y, 1)}
            fill={b.overlayColor ?? colorFn(b)}
            opacity={0.75}
            rx={Math.min(2, bandwidth / 2)}
          />
        );
      })}
    </>
  );
};

export default React.memo(Component);
