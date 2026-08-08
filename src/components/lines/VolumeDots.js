import React from 'react';
import { Circle } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { barGeometry, keyFor, redGreenByDirection, solidStroke, strokeFor } from './renderUtils';

const Component = ({quotes, lineType, xScale, yScale, xGetter}) => {
  const colorFn = strokeFor(lineType, {
    volume_dots: redGreenByDirection,
  }, solidStroke('var(--dots-color)'));
  const { centerX } = barGeometry(xScale, xGetter);

  // a loop, not Math.min(...values): spreading a long history into a call
  // blows the engine's argument limit
  const [minVol, maxVol] = React.useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const b of quotes) {
      if (b.volume < min) min = b.volume;
      if (b.volume > max) max = b.volume;
    }
    return [min, max];
  }, [quotes]);

  const volScale = React.useMemo(() => scaleLinear({
    range: [1, 10],
    domain: [minVol, maxVol]
  }), [minVol, maxVol]);


  return (
    <>
      {quotes.map((b, i) => {
        const fill = b.overlayColor ?? colorFn(b);
        const cx = centerX(b);
        return (
        <React.Fragment key={keyFor(b, i)}>
          <Circle
            className="ofc-dot"
            cx={cx}
            cy={yScale(b.close)}
            r={volScale(b.volume)}
            fill={fill}
            opacity={0.4}
          />
          <Circle
            className="ofc-dot"
            cx={cx}
            cy={yScale(b.close)}
            r={1}
            fill={fill}
            opacity={1}
          />
        </React.Fragment>
      )})}
    </>
  )
}

export default React.memo(Component);
