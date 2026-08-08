import React from 'react';
import { barGeometry, keyFor } from './renderUtils';

const Component = ({quotes, xScale, yScale, xGetter}) => {
  const { centerX: cx } = barGeometry(xScale, xGetter);

  return (
    <>
      {quotes.map((s, i) => {
        const prev = quotes[i - 1];
        const x = cx(s);
        const stroke = s.yang ? 'var(--green)' : 'var(--red)';
        const strokeWidth = s.yang ? 2.5 : 1.5;
        return (
          <g key={keyFor(s, i)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
            {prev && (
              <line x1={cx(prev)} x2={x} y1={yScale(s.open)} y2={yScale(s.open)} />
            )}
            <line x1={x} x2={x} y1={yScale(s.open)} y2={yScale(s.close)} />
          </g>
        );
      })}
    </>
  );
};

export default React.memo(Component);
