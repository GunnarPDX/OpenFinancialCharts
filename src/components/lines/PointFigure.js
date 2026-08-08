import React from 'react';
import { barGeometry, keyFor } from './renderUtils';

const Component = ({quotes, xScale, yScale, xGetter}) => {
  const { bandwidth, centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((col, i) => {
        const x = centerX(col);
        const stroke = col.type === 'X' ? 'var(--green)' : 'var(--red)';
        return (
          <g key={keyFor(col, i)} stroke={stroke} fill="none" strokeWidth={1.5}>
            {col.boxes.map(p => {
              const h = Math.abs(yScale(p) - yScale(p + col.box));
              const r = Math.max(1.5, Math.min(bandwidth / 2, h / 2, 8) - 1);
              const y = yScale(p + col.box / 2);
              return col.type === 'X' ? (
                <g key={p}>
                  <line x1={x - r} x2={x + r} y1={y + r} y2={y - r} />
                  <line x1={x - r} x2={x + r} y1={y - r} y2={y + r} />
                </g>
              ) : (
                <circle key={p} cx={x} cy={y} r={r} />
              );
            })}
          </g>
        );
      })}
    </>
  );
};

export default React.memo(Component);
