import React from 'react';
import { Area, LinePath } from '@visx/shape';
import CloseSegments from './CloseSegments';
import { barGeometry } from './renderUtils';

// high/low band with boundary lines, and the close as the main line
const Component = ({quotes, xScale, yScale, xGetter}) => {
  const { centerX: x } = barGeometry(xScale, xGetter);
  const hasOverlay = quotes.some(b => b.overlayColor);

  return (
    <>
      <Area
        data={quotes}
        x={x}
        y0={(d) => yScale(d.high)}
        y1={(d) => yScale(d.low)}
        fill="var(--area-line-color)"
        opacity={0.12}
      />
      <LinePath
        data={quotes}
        x={x}
        y={(d) => yScale(d.high)}
        stroke="var(--green)"
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <LinePath
        data={quotes}
        x={x}
        y={(d) => yScale(d.low)}
        stroke="var(--red)"
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      {hasOverlay ? (
        <CloseSegments
          quotes={quotes}
          x={x}
          y={(d) => yScale(d.close)}
          colorFor={(b) => b.overlayColor ?? 'var(--text)'}
        />
      ) : (
        <LinePath
          data={quotes}
          x={x}
          y={(d) => yScale(d.close)}
          stroke="var(--text)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </>
  );
};

export default React.memo(Component);
