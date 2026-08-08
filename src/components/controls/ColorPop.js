import React from 'react';
import { useChartProvider } from '../ChartContext';

// preset grid shared by ColorPicker and the script editor's inline hex editor
// 10 columns (purple → pink → red → orange → yellow → yellow-green → green →
// teal → blue → grey), 4 rows from darkest down to lightest
export const PRESETS = [
  '#6d28d9', '#be185d', '#b91c1c', '#c2410c', '#b45309', '#4d7c0f', '#15803d', '#0f766e', '#1d4ed8', '#374151',
  '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#3b82f6', '#6b7280',
  '#a78bfa', '#f472b6', '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa', '#9ca3af',
  '#c4b5fd', '#f9a8d4', '#fca5a5', '#fdba74', '#fcd34d', '#bef264', '#86efac', '#5eead4', '#93c5fd', '#d1d5db',
];

// floating color popup: the PRESETS grid plus a "Custom…" escape hatch into
// the native color input. onPick(color) fires for every choice; picking a
// preset also calls onClose (the native input stays open so the user can
// keep scrubbing).
const ColorPop = ({ value, onPick, onClose, left, top, zIndex, palette }) => {
  const inputRef = React.useRef(null);
  const val = value || '';
  // explicit palette prop > config.draw_palette > built-in grid (the context
  // is absent only in isolated tests/storybooks, hence the optional chain)
  const ctx = useChartProvider();
  const colors = palette || ctx?.config?.draw_palette || PRESETS;

  return (
    <div
      className="ofc-color-pop"
      style={{ position: 'fixed', left, top, ...(zIndex != null ? { zIndex } : {}) }}
    >
      <div className="ofc-color-grid">
        {colors.map(c => (
          <button
            key={c}
            type="button"
            className={`ofc-color-cell${c.toLowerCase() === val.toLowerCase() ? ' ofc-active' : ''}`}
            style={{ background: c }}
            onClick={() => { onPick(c); if (onClose) onClose(); }}
          />
        ))}
      </div>
      <button
        type="button"
        className="ofc-button ofc-color-custom"
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        Custom…
      </button>
      <input
        ref={inputRef}
        type="color"
        value={val.length === 7 ? val : '#3b82f6'}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
};

export default ColorPop;
