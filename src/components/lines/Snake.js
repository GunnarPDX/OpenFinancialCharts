import React from 'react';
import { Area, LinePath } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { curveMonotoneX } from '@visx/curve';
import { barGeometry, keyFor } from './renderUtils';

// continuous HLC "snake": merged green zone (close→high) and red zone
// (close→low) blending into each other through a gradient at the middle,
// smooth solid border lines at the high/low, and dots at the closes
const Component = ({quotes, xScale, yScale, xGetter}) => {
  // per-instance gradient ids — fixed ids collide across chart instances
  const uid = React.useId();
  const { centerX: x } = barGeometry(xScale, xGetter);

  return (
    <>
      <LinearGradient id={`${uid}-snake-green`} from="var(--green)" to="var(--red)" fromOpacity={0.5} toOpacity={0.15} />
      <LinearGradient id={`${uid}-snake-red`} from="var(--green)" to="var(--red)" fromOpacity={0.15} toOpacity={0.5} />
      <Area
        data={quotes}
        curve={curveMonotoneX}
        x={x}
        y0={(d) => yScale(d.high)}
        y1={(d) => yScale(d.close)}
        fill={`url(#${uid}-snake-green)`}
      />
      <Area
        data={quotes}
        curve={curveMonotoneX}
        x={x}
        y0={(d) => yScale(d.close)}
        y1={(d) => yScale(d.low)}
        fill={`url(#${uid}-snake-red)`}
      />
      <LinePath
        data={quotes}
        curve={curveMonotoneX}
        x={x}
        y={(d) => yScale(d.high)}
        stroke="var(--green)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <LinePath
        data={quotes}
        curve={curveMonotoneX}
        x={x}
        y={(d) => yScale(d.low)}
        stroke="var(--red)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {quotes.map((b, i) => (
        <circle
          key={keyFor(b, i)}
          cx={x(b)}
          cy={yScale(b.close)}
          r={2}
          fill={b.overlayColor ?? 'var(--text)'}
        />
      ))}
    </>
  );
};

export default React.memo(Component);
