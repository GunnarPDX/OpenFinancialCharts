import React from 'react';
import Dropdown from './Dropdown';
import { FilterIcon } from '../icons';
import { useChartProvider, useDrawings } from '../ChartContext';
import useDropdown from './useDropdown';

// toggle drawings on/off per color, with per-color delete
const Component = () => {
  const { hiddenColors, toggleHiddenColor, removeDrawingsByColor } = useChartProvider();
  const drawings = useDrawings();
  const [confirmColor, setConfirmColor] = React.useState(null);
  const { open, setOpen, ref } = useDropdown(() => setConfirmColor(null));

  const colors = [...new Set(drawings.map(d => (d.color || 'multi')))];

  return (
    <Dropdown
      open={open} setOpen={setOpen} rootRef={ref}
      trigger={<FilterIcon/>}
      onToggle={() => setConfirmColor(null)}
    >
      <div className="ofc-dropdown-section-title">Drawings by color</div>
      {!colors.length && (
        <div className="ofc-dropdown-toggle" style={{ cursor: 'default' }}>
          <span style={{ color: 'var(--text-faint)' }}>No drawings yet</span>
        </div>
      )}
      {colors.map(c => {
        const count = drawings.filter(d => (d.color || 'multi') === c).length;
        const confirming = confirmColor === c;
        return (
          <label key={c} className="ofc-dropdown-toggle">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3, flex: 'none',
                background: c === 'multi'
                  ? 'linear-gradient(135deg, #ef4444 0%, #facc15 50%, #22c55e 100%)'
                  : c,
                border: '1px solid var(--border)',
              }} />
              {c === 'multi' ? `Multicolor (${count})` : `(${count})`}
              {!confirming && (
                <button
                  type="button"
                  className="ofc-color-trash"
                  title={`Delete all ${count}`}
                  onClick={(e) => { e.preventDefault(); setConfirmColor(c); }}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
                  </svg>
                </button>
              )}
            </span>
            {confirming ? (
              <span style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="ofc-button ofc-color-confirm-del"
                  onClick={(e) => { e.preventDefault(); removeDrawingsByColor(c); setConfirmColor(null); }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="ofc-button"
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={(e) => { e.preventDefault(); setConfirmColor(null); }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <input
                className="ofc-switch" type="checkbox"
                checked={!hiddenColors.includes(c)}
                onChange={() => toggleHiddenColor(c)}
              />
            )}
          </label>
        );
      })}
    </Dropdown>
  );
};

export default Component;
