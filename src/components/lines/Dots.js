import React from 'react';
import { Circle } from '@visx/shape';
import { barGeometry, keyFor, redGreenByDirection, solidStroke, strokeFor } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const colorFn = strokeFor(lineType, {
    dots: redGreenByDirection,
    jointed_line: redGreenByDirection,
  }, solidStroke('var(--dots-color)'));
  const { centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => (
        <Circle
          key={keyFor(b, i)}
          className="ofc-dot"
          cx={centerX(b)}
          cy={yScale(b.close)}
          r={2}
          fill={b.overlayColor ?? colorFn(b)}
        />
      ))}
    </>
  )
}

export default React.memo(Component);
