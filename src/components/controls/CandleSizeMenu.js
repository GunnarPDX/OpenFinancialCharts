import React from 'react';
import { useChartProvider } from '../ChartContext';
import useDropdown from './useDropdown';

const SIZES = ['1m', '5m', '10m', '15m', '30m', '1h', '4h', '1d', '1w'];

// compact candle-size picker: current size as the button, sizes in a dropdown
const Component = () => {
  const { candleSize, setCandleSize, config } = useChartProvider();
  const { open, setOpen, ref } = useDropdown();
  const sizes = config.candle_sizes ?? SIZES;

  return (
    <div className="ofc-dropdown" ref={ref}>
      <button className="ofc-candle-size-btn" onClick={() => setOpen(o => !o)}>
        {candleSize.toUpperCase()}
      </button>
      {open && (
        <div className="ofc-dropdown-menu ofc-candle-size-menu">
          {sizes.map(sz => (
            <button
              key={sz}
              className={`ofc-dropdown-item${sz === candleSize ? ' ofc-active' : ''}`}
              onClick={() => { setCandleSize(sz); setOpen(false); }}
            >
              {sz.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Component;
