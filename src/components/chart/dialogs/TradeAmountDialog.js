import React from 'react';

// amount-entry dialog for buy/sell markers. The amount can be given as a
// quantity or a cash sum (cash converts via the marker's price), and the
// marker's price source is selectable: the bar's open/high/low/close, or a
// custom price. Default close; custom keeps a user-entered price in d.p.

export const PRICE_SOURCES = ['open', 'high', 'low', 'close'];

// the bar at or before time t — the same lookup the marker renderer uses
const barAt = (series, t) => {
  let best = null;
  for (const q of series || []) {
    if (+q.date <= t) best = q;
    else break;
  }
  return best || (series || [])[0] || null;
};

export const markerPrice = (d, bar) => {
  const src = d.priceSource || 'close';
  if (src === 'custom') return d.p;
  return bar ? bar[src] : d.p;
};

const Dialog = ({ tradeEdit, setTradeEdit, d, series, updateDrawing, removeDrawing }) => {
  const [src, setSrc] = React.useState(d.priceSource || 'close');
  const [customPx, setCustomPx] = React.useState(String(+d.p.toFixed(4)));
  const bar = barAt(series, d.t);
  const price = src === 'custom' ? parseFloat(customPx) : (bar ? bar[src] : d.p);
  const priceOk = Number.isFinite(price) && price > 0;
  const n = parseFloat(tradeEdit.value);
  const amountOk = Number.isFinite(n) && n > 0;
  const valid = amountOk && (tradeEdit.mode !== 'cash' || priceOk) && (src !== 'custom' || priceOk);
  const qty = !amountOk ? 0 : tradeEdit.mode === 'cash' ? (priceOk ? n / price : 0) : n;
  const fmt = (v) => String(Math.abs(v) >= 1 ? +v.toFixed(2) : +v.toFixed(4));
  const commit = () => {
    if (!valid) return;
    updateDrawing(tradeEdit.id, {
      qty,
      cash: tradeEdit.mode === 'cash' ? n : undefined,
      priceSource: src,
      ...(src === 'custom' ? { p: price } : {}),
    });
    setTradeEdit(null);
  };
  const cancel = () => {
    if (tradeEdit.isNew) removeDrawing(tradeEdit.id);
    setTradeEdit(null);
  };
  // switching the toggle converts the entered number via the marker's price,
  // so the amount stays the same trade either way it's expressed
  const setMode = (mode) => setTradeEdit(te => {
    if (te.mode === mode) return te;
    const v = parseFloat(te.value);
    const ok = Number.isFinite(v) && v > 0 && priceOk;
    return { ...te, mode, value: ok ? fmt(mode === 'cash' ? v * price : v / price) : te.value };
  });
  const keys = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') cancel();
  };
  return (
    <div className="ofc-study-editor ofc-draw-menu ofc-trade-dialog" style={{ left: tradeEdit.x, top: tradeEdit.y }}>
      <div className="ofc-study-editor-title">{d.type === 'buy_marker' ? 'Buy' : 'Sell'} Marker</div>
      <div className="ofc-amount-field">
        <div className="ofc-amount-seg">
          <button className={tradeEdit.mode === 'qty' ? 'ofc-active' : ''}
            onClick={() => setMode('qty')}>Quantity</button>
          <button className={tradeEdit.mode === 'cash' ? 'ofc-active' : ''}
            onClick={() => setMode('cash')}>Value</button>
        </div>
        <input
          type="number" min="0" step="any" autoFocus
          value={tradeEdit.value}
          onChange={(e) => setTradeEdit(te => ({ ...te, value: e.target.value }))}
          onFocus={(e) => e.target.select()}
          onKeyDown={keys}
        />
      </div>
      <div className="ofc-price-source-label">Price</div>
      <div className="ofc-price-seg">
        {PRICE_SOURCES.map(k => (
          <button key={k}
            className={src === k ? 'ofc-active' : ''}
            title={`Use the bar's ${k}`}
            onClick={() => setSrc(k)}>{k[0].toUpperCase() + k.slice(1)}</button>
        ))}
        <button className={src === 'custom' ? 'ofc-active' : ''}
          title="Enter a custom price"
          onClick={() => setSrc('custom')}>Custom</button>
      </div>
      {src === 'custom' && (
        <div className="ofc-amount-field">
          <input
            type="number" min="0" step="any"
            value={customPx}
            onChange={(e) => setCustomPx(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={keys}
          />
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-faint)', margin: '4px 0' }}>
        {!priceOk ? '@ —'
          : tradeEdit.mode === 'cash'
            ? `Qty ${amountOk ? fmt(qty) : '—'} @ ${price.toFixed(2)}`
            : `Value ${amountOk ? fmt(n * price) : '—'} @ ${price.toFixed(2)}`}
      </div>
      <div className="ofc-study-editor-actions">
        <button className="ofc-button" onClick={cancel}>Cancel</button>
        <button className="ofc-button" onClick={commit} disabled={!valid}>Ok</button>
      </div>
    </div>
  );
};

const TradeAmountDialog = (props) => {
  const { tradeEdit, drawings } = props;
  if (!tradeEdit) return null;
  const d = drawings.find(x => x.id === tradeEdit.id);
  if (!d || (d.type !== 'buy_marker' && d.type !== 'sell_marker')) return null;
  // keyed per marker so the source/custom-price state resets between edits
  return <Dialog key={tradeEdit.id} {...props} d={d} />;
};

export default TradeAmountDialog;
