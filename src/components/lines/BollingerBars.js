import React from 'react';
import { Bar } from '@visx/shape';
import { barGeometry, keyFor, redGreenByDirection } from './renderUtils';

// John Bollinger's fixed-width bars: every candle component is drawn at the
// same width — a green/red body from open to close, with the wicks rendered
// as blue blocks from the body out to the high and low.
// blue-600, the same brightness tier as the emerald/rose bodies — a brighter
// blue antialiases "wider" than the darker bodies at thin bar widths
const WICK_COLOR = '#2563eb';

const Component = ({quotes, xScale, yScale, xGetter}) => {
  const { bodyWidth: w, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        const x = centerX(b) - w / 2;
        const bodyTop = yScale(b.direction ? b.open : b.close);
        const bodyBot = yScale(b.direction ? b.close : b.open);
        const color = b.overlayColor ?? redGreenByDirection(b);
        return (
          // crispEdges so the three stacked blocks rasterize to identical pixel
          // columns — antialiasing otherwise reads the brighter block as wider
          <g key={keyFor(b, i)} shapeRendering="crispEdges">
            <Bar x={x} y={yScale(b.high)} width={w}
              height={Math.max(bodyTop - yScale(b.high), 0)} fill={WICK_COLOR} />
            <Bar x={x} y={bodyBot} width={w}
              height={Math.max(yScale(b.low) - bodyBot, 0)} fill={WICK_COLOR} />
            <Bar x={x} y={bodyTop} width={w}
              height={Math.max(bodyBot - bodyTop, 1)} fill={color} />
          </g>
        );
      })}
    </>
  );
};

export default React.memo(Component);
