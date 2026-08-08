import React from 'react';

// labelled on/off switch row for dropdown menus
const ToggleRow = ({ label, checked, onChange }) => (
  <label className="ofc-dropdown-toggle">
    <span>{label}</span>
    <input
      className="ofc-switch" type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

export default ToggleRow;
