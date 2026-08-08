import React from 'react';
import BasicLine from './BasicLine';
import { AreaClosed } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { barGeometry } from './renderUtils';

const Component = (props) => {
  const {quotes, xScale, yScale, xGetter} = props;
  // per-instance gradient id — a fixed id collides across chart instances
  const uid = React.useId();
  const { centerX } = barGeometry(xScale, xGetter);

  return (
    <>
      <LinearGradient
        id={`${uid}-area-gradient`}
        from={'var(--area-gradient-color-1)'}
        to={'var(--area-gradient-color-2)'}
        fromOpacity={0.2}
        toOpacity={0}
      />
      <AreaClosed
        data={quotes}
        x={centerX}
        y={d => yScale(d.close)}
        yScale={yScale}
        strokeWidth={1}
        stroke="transparent"
        fill={`url(#${uid}-area-gradient)`}
      />
      <BasicLine {...props}/>
    </>
  )
}

export default React.memo(Component);
