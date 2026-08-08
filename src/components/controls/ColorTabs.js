import React from 'react';

// color-slice tabs for the calc popups: an ALL tab plus one swatch per
// color. Renders nothing when there is only one color to slice by.
const ColorTabs = ({ colors, active, onSelect }) => {
  if (colors.length < 2) return null;
  return (
    <div className="ofc-ruler-tabs">
      <button
        type="button"
        title="All colors"
        className={`ofc-ruler-tab ofc-ruler-tab-all${active === 'all' ? ' ofc-active' : ''}`}
        onClick={() => onSelect('all')}
      >
        ALL
      </button>
      {colors.map(c => (
        <button
          key={c}
          type="button"
          className={`ofc-ruler-tab${active === c ? ' ofc-active' : ''}`}
          style={{ background: c }}
          onClick={() => onSelect(c)}
        />
      ))}
    </div>
  );
};

export default ColorTabs;
