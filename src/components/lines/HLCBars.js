import React from 'react';
import { barGeometry, keyFor } from './renderUtils';

// per-bar HLC: translucent green block from close up to high (green dash at
// the high), translucent red block from close down to low (red dash at the
// low), and a bright dash at the close
const Component = ({quotes, xScale, yScale, xGetter}) => {
  const { bodyWidth: barWidth, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((b, i) => {
        const bx = centerX(b) - barWidth / 2;
        const yH = yScale(b.high);
        const yL = yScale(b.low);
        const yC = yScale(b.close);
        const up = b.overlayColor ?? 'var(--green)';
        const down = b.overlayColor ?? 'var(--red)';
        return (
          <g key={keyFor(b, i)}>
            <rect
              x={bx}
              y={yH}
              width={barWidth}
              height={Math.max(yC - yH, 0)}
              fill={up}
              opacity={0.3}
            />
            <rect
              x={bx}
              y={yC}
              width={barWidth}
              height={Math.max(yL - yC, 0)}
              fill={down}
              opacity={0.3}
            />
            <line x1={bx} x2={bx + barWidth} y1={yH} y2={yH} stroke={up} strokeWidth={1.5} />
            <line x1={bx} x2={bx + barWidth} y1={yL} y2={yL} stroke={down} strokeWidth={1.5} />
            <line x1={bx} x2={bx + barWidth} y1={yC} y2={yC} stroke="var(--text)" strokeWidth={2} />
          </g>
        );
      })}
    </>
  );
};

export default React.memo(Component);
