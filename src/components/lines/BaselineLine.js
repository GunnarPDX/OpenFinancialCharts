import React from 'react';
import { Area, LinePath } from '@visx/shape';
import CloseSegments from './CloseSegments';
import { barGeometry } from './renderUtils';

// close line split at a horizontal baseline: green above, red below, with a
// soft wash between the line and the baseline on each side
const Component = ({quotes, xScale, yScale, xGetter, baselineY = 0, width = 0}) => {
  // per-instance clip ids: the main plot and the brush strip both render this
  // with different baselineY — fixed ids made one clip at the other's split
  const uid = React.useId();
  const { centerX: x } = barGeometry(xScale, xGetter);
  const y = (d) => yScale(d.close);
  const W = Math.max(width * 3, 3000);
  const hasOverlay = quotes.some(b => b.overlayColor);

  const half = (clipId, color) => (
    <g clipPath={`url(#${clipId})`}>
      <Area
        data={quotes}
        x={x}
        y0={() => baselineY}
        y1={y}
        fill={color}
        opacity={0.13}
      />
      {!hasOverlay && (
        <LinePath
          data={quotes}
          x={x}
          y={y}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </g>
  );

  return (
    <>
      <clipPath id={`${uid}-above`}>
        <rect x={-W} y={baselineY - 4000} width={2 * W} height={4000} />
      </clipPath>
      <clipPath id={`${uid}-below`}>
        <rect x={-W} y={baselineY} width={2 * W} height={4000} />
      </clipPath>
      {half(`${uid}-above`, 'var(--green)')}
      {half(`${uid}-below`, 'var(--red)')}
      {hasOverlay && (
        // a recolor study paints the line itself; the washes above keep
        // showing the baseline split underneath
        <CloseSegments
          quotes={quotes}
          x={x}
          y={y}
          colorFor={(b, next) => b.overlayColor
            ?? ((y(b) + y(next)) / 2 <= baselineY ? 'var(--green)' : 'var(--red)')}
        />
      )}
    </>
  );
};

export default React.memo(Component);
