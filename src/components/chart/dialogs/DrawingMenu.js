import React from 'react';

import ColorPicker from '../../controls/ColorPicker';

// quantity/value entry for buy/sell markers inside the context menu; edits
// apply to the drawing live, like the color picker above it
const TradeAmountField = ({ d, updateDrawing, onDone }) => {
  const [mode, setMode] = React.useState('qty');
  const [value, setValue] = React.useState(d.qty ?? '');
  const price = d.p;
  const fmt = (v) => String(Math.abs(v) >= 1 ? +v.toFixed(2) : +v.toFixed(4));
  const apply = (m, val) => {
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n <= 0) return;
    updateDrawing(d.id, {
      qty: m === 'cash' ? (price > 0 ? n / price : 0) : n,
      cash: m === 'cash' ? n : undefined,
    });
  };
  // switching converts the entered number via the marker's price, so the
  // amount stays the same trade either way it's expressed
  const switchMode = (m) => {
    if (m === mode) return;
    const n = parseFloat(value);
    const ok = Number.isFinite(n) && n > 0 && price > 0;
    setMode(m);
    if (ok) setValue(fmt(m === 'cash' ? n * price : n / price));
  };
  return (
    <div className="ofc-amount-field">
      <div className="ofc-amount-seg">
        <button className={mode === 'qty' ? 'ofc-active' : ''} onClick={() => switchMode('qty')}>Quantity</button>
        <button className={mode === 'cash' ? 'ofc-active' : ''} onClick={() => switchMode('cash')}>Value</button>
      </div>
      <input
        type="number" min="0" step="any" value={value}
        onChange={(e) => { setValue(e.target.value); apply(mode, e.target.value); }}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') onDone(); }}
      />
    </div>
  );
};

// right-click context menu for a drawing
const DrawingMenu = ({
  drawMenu, setDrawMenu, drawMenuRef, drawings, updateDrawing, removeDrawing,
  showFullTrades, setShowFullTrades,
}) => {
  if (!drawMenu) return null;
  const d = drawings.find(x => x.id === drawMenu.id);
  if (!d) return null;
  return (
    <div
      className="ofc-study-editor ofc-draw-menu"
      ref={drawMenuRef}
      style={{ left: drawMenu.x, top: drawMenu.y }}
    >
      <div className="ofc-study-editor-title">Drawing</div>
      <label>Color
        <ColorPicker drop="down" value={d.color || '#3b82f6'}
          onChange={(c) => updateDrawing(drawMenu.id, { color: c })} />
      </label>
      {(d.type === 'buy_marker' || d.type === 'sell_marker') && (
        <>
          <TradeAmountField key={d.id} d={d} updateDrawing={updateDrawing}
            onDone={() => setDrawMenu(null)} />
          {/* chart-wide setting: expands every buy/sell marker, not just this one */}
          <label>Show full
            <input className="ofc-switch" type="checkbox" style={{ width: 28 }}
              checked={showFullTrades} onChange={(e) => setShowFullTrades(e.target.checked)} />
          </label>
        </>
      )}
      <div className="ofc-study-editor-actions">
        <button
          className="ofc-button ofc-study-delete"
          onClick={() => { removeDrawing(drawMenu.id); setDrawMenu(null); }}
        >
          Delete
        </button>
        <button className="ofc-button" onClick={() => setDrawMenu(null)}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DrawingMenu;
