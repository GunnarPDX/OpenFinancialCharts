import React from 'react';
import { SearchIcon } from "../icons";
import { useChartProvider } from '../ChartContext';

const Component = () => {
  const { symbol, setSymbol } = useChartProvider();
  const [value, setValue] = React.useState('');

  const submit = () => {
    const t = value.trim().toUpperCase();
    if (t) setSymbol(t);
    setValue('');
  };

  return (
    <div className="ofc-search-box">
      <SearchIcon/>
      <input
        className="ofc-search-input"
        type="text"
        autoComplete="off"
        placeholder={symbol || 'ticker…'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      >
      </input>
    </div>
  );
};

export default Component;
